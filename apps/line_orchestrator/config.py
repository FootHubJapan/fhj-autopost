import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    line_channel_secret: str
    line_channel_access_token: str
    github_token: str
    github_owner: str
    github_repo: str
    workflow_file: str
    github_ref: str
    workflow_ingestion_file: str
    workflow_learning_file: str
    state_path: str
    poll_interval_sec: int
    poll_timeout_sec: int
    changes_poll_enabled: bool
    changes_poll_interval_sec: int
    notify_on_no_changes: bool


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def load_settings() -> Settings:
    return Settings(
        line_channel_secret=os.environ.get("LINE_CHANNEL_SECRET", ""),
        line_channel_access_token=os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", ""),
        github_token=os.environ.get("GITHUB_TOKEN", ""),
        github_owner=os.environ.get("GITHUB_OWNER", ""),
        github_repo=os.environ.get("GITHUB_REPO", ""),
        workflow_file=os.environ.get("WORKFLOW_FILE", "schedule_mvp.yml"),
        github_ref=os.environ.get("GITHUB_REF", "main"),
        workflow_ingestion_file=os.environ.get(
            "WORKFLOW_INGESTION_FILE", "ingestion_mvp.yml"
        ),
        workflow_learning_file=os.environ.get(
            "WORKFLOW_LEARNING_FILE", "learning_mvp.yml"
        ),
        state_path=os.environ.get(
            "LINE_ORCHESTRATOR_STATE_PATH",
            os.path.join(os.path.dirname(__file__), "state", "jobs.json"),
        ),
        poll_interval_sec=int(os.environ.get("POLL_INTERVAL_SEC", "30")),
        poll_timeout_sec=int(os.environ.get("POLL_TIMEOUT_SEC", "600")),
        changes_poll_enabled=_bool(os.environ.get("CHANGES_POLL_ENABLED")),
        changes_poll_interval_sec=int(
            os.environ.get("CHANGES_POLL_INTERVAL_SEC", "3600")
        ),
        notify_on_no_changes=_bool(os.environ.get("NOTIFY_ON_NO_CHANGES"), False),
    )


def validate_settings(settings: Settings) -> list[str]:
    missing = []
    if not settings.line_channel_secret:
        missing.append("LINE_CHANNEL_SECRET")
    if not settings.line_channel_access_token:
        missing.append("LINE_CHANNEL_ACCESS_TOKEN")
    if not settings.github_token:
        missing.append("GITHUB_TOKEN")
    if not settings.github_owner:
        missing.append("GITHUB_OWNER")
    if not settings.github_repo:
        missing.append("GITHUB_REPO")
    return missing
