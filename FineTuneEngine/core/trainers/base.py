import os, time, json, datetime
from typing import Dict, Any
from core.storage.sqlite_storage import SQLiteStorage


class BaseTrainer:
    def __init__(self, run_id: str, config: Dict[str, Any]):
        self.run_id = run_id
        self.config = config
        self.db = SQLiteStorage()
        self.log_dir = os.path.join("logs", run_id)
        os.makedirs(self.log_dir, exist_ok=True)

    def log(self, message: str):
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {message}"
        print(line)
        with open(os.path.join(self.log_dir, "train.log"), "a") as f:
            f.write(line + "\n")

    def save_checkpoint(self, step: int, metrics: Dict[str, Any]):
        ckpt_dir = os.path.join("checkpoints", self.run_id)
        os.makedirs(ckpt_dir, exist_ok=True)
        ckpt_file = os.path.join(ckpt_dir, f"step_{step}.json")
        with open(ckpt_file, "w") as f:
            json.dump(metrics, f, indent=2)
        self.db.register_checkpoint(self.run_id, step, ckpt_file, metrics)
        self.log(f"Checkpoint saved at step {step}")

    def train(self):
        """Override in subclass"""
        raise NotImplementedError("train() must be implemented by subclass")

    def finalize(self):
        self.db.update_run_state(self.run_id, "Completed")
        self.log("Training finished successfully.")
