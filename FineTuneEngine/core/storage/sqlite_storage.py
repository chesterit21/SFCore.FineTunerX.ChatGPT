import sqlite3, json, uuid, datetime
from typing import Dict, List, Optional

class SQLiteStorage:
    def __init__(self, path="storage/ai_tuner.db"):
        self.path = path
        self._init_db()

    def _init_db(self):
        con = sqlite3.connect(self.path)
        cur = con.cursor()
        cur.executescript("""
        CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY,
            run_name TEXT,
            base_model TEXT,
            state TEXT,
            config_json TEXT,
            device_used TEXT,
            hardware_json TEXT,
            created_at TEXT,
            updated_at TEXT
        );
        """)
        con.commit()
        con.close()

    def create_run(self, cfg: Dict) -> str:
        run_id = str(uuid.uuid4())
        now = datetime.datetime.now().isoformat()
        con = sqlite3.connect(self.path)
        con.execute(
            "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (run_id, cfg.get("run_name"), cfg.get("base_model"), "Created",
             json.dumps(cfg), None, None, now, now)
        )
        con.commit()
        con.close()
        return run_id
# Tambahkan di bawah fungsi create_run

    def update_run_state(self, run_id: str, state: str, extra=None):
        con = sqlite3.connect(self.path)
        cur = con.cursor()
        cur.execute(
            "UPDATE runs SET state=?, updated_at=? WHERE id=?",
            (state, datetime.datetime.now().isoformat(), run_id)
        )
        con.commit()
        con.close()

    def append_metric(self, run_id: str, step: int, metrics: Dict):
        con = sqlite3.connect(self.path)
        con.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            run_id TEXT,
            step INTEGER,
            loss REAL,
            lr REAL,
            created_at TEXT
        );
        """)
        con.execute(
            "INSERT INTO metrics VALUES (?, ?, ?, ?, ?)",
            (run_id, step, metrics.get("loss"), metrics.get("lr"), datetime.datetime.now().isoformat())
        )
        con.commit()
        con.close()

    def register_checkpoint(self, run_id: str, step: int, path: str, meta=None):
        con = sqlite3.connect(self.path)
        con.execute("""
        CREATE TABLE IF NOT EXISTS checkpoints (
            run_id TEXT,
            step INTEGER,
            path TEXT,
            metrics_json TEXT,
            created_at TEXT
        );
        """)
        con.execute(
            "INSERT INTO checkpoints VALUES (?, ?, ?, ?, ?)",
            (run_id, step, path, json.dumps(meta or {}), datetime.datetime.now().isoformat())
        )
        con.commit()
        con.close()
