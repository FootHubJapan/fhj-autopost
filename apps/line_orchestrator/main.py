import base64
import hashlib
import hmac
import json
import os
import sys
import threading
import time
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request

from .config import load_settings, validate_settings
from .github_client import GitHubClient
from .line_client import LineClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from learning.engine import update_learning  # noqa: E402
from learning.storage import load_learning, update_metric  # noqa: E402
app = FastAPI()
settings = load_settings()
missing_env = validate_settings(settings)


def load_jobs() -> list[dict[str, Any]]:
    os.makedirs(os.path.dirname(settings.state_path), exist_ok=True)
    if not os.path.exists(settings.state_path):
        with open(settings.state_path, "w", encoding="utf-8") as f:
            json.dump({"jobs": []}, f, ensure_ascii=False, indent=2)
    with open(settings.state_path, "r", encoding="utf-8") as f:
        return json.load(f).get("jobs", [])


def save_jobs(jobs: list[dict[str, Any]]) -> None:
    payload = {"jobs": jobs[-50:]}
    with open(settings.state_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def add_job(entry: dict[str, Any]) -> None:
    jobs = load_jobs()
    jobs.append(entry)
    save_jobs(jobs)


def update_job(run_id: int, updates: dict[str, Any]) -> None:
    jobs = load_jobs()
    for job in jobs:
        if job.get("run_id") == run_id:
            job.update(updates)
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            break
    save_jobs(jobs)


def verify_signature(body: bytes, signature: str) -> bool:
    mac = hmac.new(
        settings.line_channel_secret.encode("utf-8"), body, hashlib.sha256
    ).digest()
    expected = base64.b64encode(mac).decode("utf-8")
    return hmac.compare_digest(expected, signature)


def parse_command(text: str) -> dict[str, Any] | None:
    normalized = " ".join(text.strip().split())
    lower = normalized.lower()
    if lower == "help":
        return {"action": "help"}
    if lower == "status":
        return {"action": "status"}
    if lower == "learn_status":
        return {"action": "learn_status"}

    tokens = normalized.split()
    if len(tokens) == 5 and tokens[:3] == ["run", "schedule", "today"]:
        region = tokens[3]
        if not tokens[4].startswith("format="):
            return None
        format_value = tokens[4].split("=", 1)[1]
        if region not in {"JP", "EU", "US"}:
            return None
        if format_value not in {"1", "2", "3"}:
            return None
        return {
            "action": "run",
            "mode": "full",
            "region": region,
            "format": format_value,
        }

    if len(tokens) == 4 and tokens[:3] == ["run", "schedule", "changes"]:
        region = tokens[3]
        if region not in {"JP", "EU", "US"}:
            return None
        return {
            "action": "run",
            "mode": "changes",
            "region": region,
            "format": "1",
        }
    if len(tokens) == 2 and tokens[:2] == ["run", "ingest"]:
        return {"action": "run_ingest"}
    if len(tokens) == 2 and tokens[:2] == ["run", "learn"]:
        return {"action": "run_learn"}
    if tokens and tokens[0] == "score" and len(tokens) >= 2:
        run_id = tokens[1]
        outcome = {}
        for part in tokens[2:]:
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            if key in {"likes", "reposts", "replies", "impressions"}:
                try:
                    outcome[key] = int(value)
                except ValueError:
                    continue
        return {"action": "score", "run_id": run_id, "outcome": outcome}
    return None


def help_text() -> str:
    return (
        "利用可能なコマンド:\n"
        "- run schedule today JP format=1\n"
        "- run schedule changes JP\n"
        "- run ingest\n"
        "- run learn\n"
        "- learn_status\n"
        "- score <run_id> likes=.. reposts=.. replies=..\n"
        "- status\n"
        "- help"
    )


def latest_job_status() -> str:
    jobs = load_jobs()
    if not jobs:
        return "直近の実行はありません。"
    job = jobs[-1]
    status = job.get("status", "unknown")
    return (
        f"run_id={job.get('run_id')} status={status} "
        f"mode={job.get('mode')} region={job.get('region')}"
    )


def learning_status() -> str:
    payload = load_learning() or {}
    best = payload.get("best_format_by_timewindow", {})
    if not best:
        return "learningデータがまだありません。"
    lines = ["直近の勝ちパターン:"]
    for window, info in best.items():
        lines.append(f"- {window}: format={info.get('format')} score={info.get('score')}")
    return "\n".join(lines)


def download_job_summary(client: GitHubClient, run_id: int, artifact_name: str) -> str | None:
    artifacts = client.list_artifacts(run_id)
    for artifact in artifacts:
        if artifact.get("name") == artifact_name:
            content = client.download_artifact(artifact["archive_download_url"])
            with zipfile.ZipFile(BytesIO(content)) as zf:
                for name in zf.namelist():
                    if name.endswith("job_summary.txt"):
                        return zf.read(name).decode("utf-8")
    return None


def poll_run_and_notify(
    run_id: int,
    user_id: str,
    line_client: LineClient,
    client: GitHubClient,
    artifact_name: str,
) -> None:
    start = time.time()
    status = "queued"
    conclusion = None
    while time.time() - start < settings.poll_timeout_sec:
        run = client.get_run(run_id)
        status = run.get("status", "queued")
        conclusion = run.get("conclusion")
        update_job(run_id, {"status": status, "conclusion": conclusion})
        if status == "completed":
            break
        time.sleep(settings.poll_interval_sec)

    summary = (
        download_job_summary(client, run_id, artifact_name)
        or "job_summary.txt が見つかりませんでした。"
    )
    message = (
        f"実行完了: run_id={run_id}\n"
        f"status={status} conclusion={conclusion}\n\n"
        f"{summary.strip()}"
    )
    if user_id:
        line_client.push_message(user_id, message)


def schedule_changes_poller() -> None:
    if not settings.changes_poll_enabled:
        return
    client = GitHubClient(
        settings.github_token, settings.github_owner, settings.github_repo
    )
    line_client = LineClient(settings.line_channel_access_token)
    user_id = os.environ.get("LINE_NOTIFY_USER_ID")
    if not user_id:
        return
    while True:
        try:
            latest = client.latest_schedule_run(settings.workflow_file)
            if latest and latest.get("status") == "completed":
                run_id = latest.get("id")
                jobs = load_jobs()
                if any(job.get("run_id") == run_id for job in jobs):
                    time.sleep(settings.changes_poll_interval_sec)
                    continue
                summary = download_job_summary(client, run_id, "schedule-mvp-output")
                if summary:
                    if "差分なし" in summary and not settings.notify_on_no_changes:
                        add_job(
                            {
                                "run_id": run_id,
                                "status": latest.get("status"),
                                "conclusion": latest.get("conclusion"),
                                "mode": "changes",
                                "region": "JP",
                                "notified": False,
                            }
                        )
                    else:
                        add_job(
                            {
                                "run_id": run_id,
                                "status": latest.get("status"),
                                "conclusion": latest.get("conclusion"),
                                "mode": "changes",
                                "region": "JP",
                                "notified": True,
                            }
                        )
                        line_client.push_message(
                            user_id, f"changes速報\n{summary.strip()}"
                        )
        except Exception:
            pass
        time.sleep(settings.changes_poll_interval_sec)


@app.on_event("startup")
async def startup_event() -> None:
    if missing_env:
        return
    if settings.changes_poll_enabled:
        thread = threading.Thread(target=schedule_changes_poller, daemon=True)
        thread.start()


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    status = "ok" if not missing_env else "missing_env"
    return {"status": status}


@app.get("/status")
async def status() -> dict[str, str]:
    return {"message": latest_job_status()}


@app.post("/callback")
async def callback(request: Request, background_tasks: BackgroundTasks) -> dict[str, str]:
    if missing_env:
        raise HTTPException(status_code=500, detail="missing required env")

    body = await request.body()
    signature = request.headers.get("X-Line-Signature", "")
    if not verify_signature(body, signature):
        raise HTTPException(status_code=400, detail="invalid signature")

    payload = json.loads(body.decode("utf-8"))
    events = payload.get("events", [])
    client = GitHubClient(
        settings.github_token, settings.github_owner, settings.github_repo
    )
    line_client = LineClient(settings.line_channel_access_token)

    for event in events:
        if event.get("type") != "message":
            continue
        message = event.get("message", {})
        if message.get("type") != "text":
            continue
        text = message.get("text", "")
        command = parse_command(text)
        reply_token = event.get("replyToken")
        user_id = event.get("source", {}).get("userId")

        if not command:
            line_client.reply_message(reply_token, "コマンド形式が不正です。help を参照してください。")
            continue

        if command["action"] == "help":
            line_client.reply_message(reply_token, help_text())
            continue

        if command["action"] == "status":
            line_client.reply_message(reply_token, latest_job_status())
            continue
        if command["action"] == "learn_status":
            line_client.reply_message(reply_token, learning_status())
            continue

        if command["action"] == "run":
            inputs = {
                "region": command["region"],
                "mode": command["mode"],
                "format": command["format"],
            }
            run = client.dispatch_and_resolve_run(
                settings.workflow_file, settings.github_ref, inputs
            )
            run_id = run["id"]
            add_job(
                {
                    "run_id": run_id,
                    "status": run.get("status"),
                    "mode": command["mode"],
                    "region": command["region"],
                    "user_id": user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            line_client.reply_message(
                reply_token, f"実行開始: run_id={run_id}"
            )
            background_tasks.add_task(
                poll_run_and_notify,
                run_id,
                user_id,
                line_client,
                client,
                "schedule-mvp-output",
            )
            continue
        if command["action"] == "run_ingest":
            run = client.dispatch_and_resolve_run(
                settings.workflow_ingestion_file,
                settings.github_ref,
                {},
            )
            run_id = run["id"]
            add_job(
                {
                    "run_id": run_id,
                    "status": run.get("status"),
                    "mode": "ingest",
                    "region": "JP",
                    "user_id": user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            line_client.reply_message(reply_token, f"収集開始: run_id={run_id}")
            background_tasks.add_task(
                poll_run_and_notify,
                run_id,
                user_id,
                line_client,
                client,
                "ingestion-output",
            )
            continue
        if command["action"] == "run_learn":
            run = client.dispatch_and_resolve_run(
                settings.workflow_learning_file,
                settings.github_ref,
                {},
            )
            run_id = run["id"]
            add_job(
                {
                    "run_id": run_id,
                    "status": run.get("status"),
                    "mode": "learn",
                    "region": "JP",
                    "user_id": user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            line_client.reply_message(reply_token, f"学習開始: run_id={run_id}")
            background_tasks.add_task(
                poll_run_and_notify,
                run_id,
                user_id,
                line_client,
                client,
                "learning-output",
            )
            continue
        if command["action"] == "score":
            outcome = command.get("outcome", {})
            update_metric(
                command["run_id"],
                {
                    "created_at": datetime.now(timezone.utc).isoformat() + "Z",
                    "outcome": {
                        "likes": outcome.get("likes"),
                        "reposts": outcome.get("reposts"),
                        "replies": outcome.get("replies"),
                        "impressions": outcome.get("impressions"),
                    }
                },
            )
            update_learning()
            line_client.reply_message(reply_token, "スコアを保存して学習を更新しました。")
            continue

    return {"status": "ok"}
