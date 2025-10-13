from fastapi import APIRouter
from core.storage.sqlite_storage import SQLiteStorage
from core.trainers.mock_trainer import MockTrainer
from core.trainers.accelerate_trainer import AccelerateTrainer
import threading
from core.trainers.deepspeed_trainer import DeepSpeedTrainer

router = APIRouter()
db = SQLiteStorage()


@router.post("/start")
def start_run(cfg: dict):
    run_id = db.create_run(cfg)
    mode = cfg.get("backend", "mock")

    if mode == "accelerate":
        trainer = AccelerateTrainer(run_id, cfg)
    elif mode == "deepspeed":
        trainer = DeepSpeedTrainer(run_id, cfg)       
    else:
        trainer = MockTrainer(run_id, cfg)

    thread = threading.Thread(target=trainer.train, daemon=True)
    thread.start()
    return {"run_id": run_id, "backend": mode, "message": "Training started"}

@router.get("/")
def list_runs():
    """List semua run yang tersimpan"""
    if hasattr(db, "list_runs"):
        return db.list_runs()
    return []
