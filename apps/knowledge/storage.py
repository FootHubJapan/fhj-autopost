import os


def base_dir() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pipeline", "data"))


def db_path() -> str:
    return os.path.join(base_dir(), "state", "knowledge", "index.sqlite3")


def ensure_dir() -> None:
    os.makedirs(os.path.dirname(db_path()), exist_ok=True)
