import json
import time
from datetime import datetime, timezone
from typing import Any

import requests


class GitHubClient:
    def __init__(self, token: str, owner: str, repo: str, api_url: str = "https://api.github.com"):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.api_url = api_url.rstrip("/")

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
        }

    def dispatch_workflow(self, workflow_file: str, ref: str, inputs: dict[str, str]) -> None:
        url = f"{self.api_url}/repos/{self.owner}/{self.repo}/actions/workflows/{workflow_file}/dispatches"
        payload = {"ref": ref, "inputs": inputs}
        resp = requests.post(url, headers=self._headers(), json=payload, timeout=20)
        if resp.status_code not in {200, 201, 204}:
            raise RuntimeError(f"workflow dispatch failed: {resp.status_code} {resp.text}")

    def list_workflow_runs(self, workflow_file: str, event: str | None = None) -> list[dict[str, Any]]:
        params = {"per_page": 10}
        if event:
            params["event"] = event
        url = f"{self.api_url}/repos/{self.owner}/{self.repo}/actions/workflows/{workflow_file}/runs"
        resp = requests.get(url, headers=self._headers(), params=params, timeout=20)
        if resp.status_code != 200:
            raise RuntimeError(f"list workflow runs failed: {resp.status_code} {resp.text}")
        return resp.json().get("workflow_runs", [])

    def wait_for_run(self, workflow_file: str, started_after: datetime, timeout_sec: int = 30) -> dict[str, Any]:
        deadline = time.time() + timeout_sec
        while time.time() < deadline:
            runs = self.list_workflow_runs(workflow_file, event="workflow_dispatch")
            for run in runs:
                created_at = datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
                if created_at >= started_after:
                    return run
            time.sleep(2)
        raise RuntimeError("run_id could not be resolved")

    def get_run(self, run_id: int) -> dict[str, Any]:
        url = f"{self.api_url}/repos/{self.owner}/{self.repo}/actions/runs/{run_id}"
        resp = requests.get(url, headers=self._headers(), timeout=20)
        if resp.status_code != 200:
            raise RuntimeError(f"get run failed: {resp.status_code} {resp.text}")
        return resp.json()

    def list_artifacts(self, run_id: int) -> list[dict[str, Any]]:
        url = f"{self.api_url}/repos/{self.owner}/{self.repo}/actions/runs/{run_id}/artifacts"
        resp = requests.get(url, headers=self._headers(), timeout=20)
        if resp.status_code != 200:
            raise RuntimeError(f"list artifacts failed: {resp.status_code} {resp.text}")
        return resp.json().get("artifacts", [])

    def download_artifact(self, artifact_url: str) -> bytes:
        resp = requests.get(artifact_url, headers=self._headers(), timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"download artifact failed: {resp.status_code} {resp.text}")
        return resp.content

    def latest_schedule_run(self, workflow_file: str) -> dict[str, Any] | None:
        runs = self.list_workflow_runs(workflow_file)
        return runs[0] if runs else None

    def dispatch_and_resolve_run(self, workflow_file: str, ref: str, inputs: dict[str, str]) -> dict[str, Any]:
        started_after = datetime.now(timezone.utc)
        self.dispatch_workflow(workflow_file, ref, inputs)
        return self.wait_for_run(workflow_file, started_after)
