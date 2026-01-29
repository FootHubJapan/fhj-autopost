import json
import os
from datetime import datetime


class Paths:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    facts_dir = os.path.join(data_dir, "facts")
    sources_dir = os.path.join(data_dir, "sources")
    contents_dir = os.path.join(data_dir, "contents")
    state_dir = os.path.join(data_dir, "state")
    runs_dir = os.path.join(state_dir, "runs")
    changes_dir = os.path.join(state_dir, "changes")
    metrics_dir = os.path.join(state_dir, "metrics")
    learning_dir = os.path.join(state_dir, "learning")

    @classmethod
    def ensure(cls):
        for path in [
            cls.facts_dir,
            cls.sources_dir,
            cls.contents_dir,
            cls.state_dir,
            cls.runs_dir,
            cls.changes_dir,
            cls.metrics_dir,
            cls.learning_dir,
        ]:
            os.makedirs(path, exist_ok=True)

    @classmethod
    def facts_path(cls, topic):
        return os.path.join(cls.facts_dir, f"{topic}.json")

    @classmethod
    def sources_path(cls, topic):
        return os.path.join(cls.sources_dir, f"{topic}.json")

    @classmethod
    def content_path(cls, topic, channel):
        return os.path.join(cls.contents_dir, f"{topic}_{channel}.txt")

    @classmethod
    def content_meta_path(cls, topic, channel):
        return os.path.join(cls.contents_dir, f"{topic}_{channel}.meta.json")

    @classmethod
    def memory_path(cls):
        return os.path.join(cls.state_dir, "memory.json")

    @classmethod
    def run_id(cls):
        return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    @classmethod
    def last_success_path(cls):
        return os.path.join(cls.state_dir, "last_success.json")

    @classmethod
    def run_path(cls, run_id):
        return os.path.join(cls.runs_dir, f"{run_id}.json")

    @classmethod
    def changes_path(cls, date):
        return os.path.join(cls.changes_dir, f"{date}.json")

    @classmethod
    def metrics_path(cls, run_id):
        return os.path.join(cls.metrics_dir, f"{run_id}.json")

    @classmethod
    def learning_path(cls):
        return os.path.join(cls.learning_dir, "learning.json")

    @staticmethod
    def write_json(path, payload):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    @staticmethod
    def read_json(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def write_text(path, payload):
        with open(path, "w", encoding="utf-8") as f:
            f.write(payload)

    @staticmethod
    def read_text(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()


class MemoryStore:
    def __init__(self, path):
        self.path = path
        self._ensure()

    def _ensure(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        if not os.path.exists(self.path):
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(
                    {"posts": [], "templates": [], "posted_hashes": [], "publish_results": []},
                    f,
                    ensure_ascii=False,
                    indent=2,
                )

    def load(self):
        with open(self.path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_post(self, entry):
        data = self.load()
        data["posts"].append(entry)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def recent_posts(self, limit=3):
        data = self.load()
        return data.get("posts", [])[-limit:]

    def has_posted_hash(self, content_hash):
        data = self.load()
        return content_hash in data.get("posted_hashes", [])

    def record_publish(self, result):
        data = self.load()
        data.setdefault("posted_hashes", []).append(result["hash"])
        data.setdefault("publish_results", []).append(result)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def read_optional_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_run(run_path, payload):
    with open(run_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def write_last_success(path, payload):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def write_changes(path, payload):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def record_metric(run_id, payload):
    Paths.ensure()
    path = Paths.metrics_path(run_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return path


def read_learning():
    path = Paths.learning_path()
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
