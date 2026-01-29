import os
import sqlite3
from datetime import datetime


class MemoryStore:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.db_path = os.path.join(base_dir, "state", "memory.sqlite")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memories (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  topic TEXT,
                  score REAL,
                  feedback TEXT,
                  created_at TEXT
                )
                """
            )

    def save(self, topic, score, feedback):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO memories (topic, score, feedback, created_at) VALUES (?, ?, ?, ?)",
                (topic, score, feedback, datetime.utcnow().isoformat() + "Z"),
            )

    def load_recent(self, limit=3):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT topic, score, feedback, created_at FROM memories ORDER BY id DESC LIMIT ?",
                (limit,),
            )
            return [
                {
                    "topic": row[0],
                    "score": row[1],
                    "feedback": row[2],
                    "created_at": row[3],
                }
                for row in cursor.fetchall()
            ]
