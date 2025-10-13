# SFCore FineTuner Engine Architecture

This engine implements a modular fine-tuning workflow:

1. **FastAPI Layer** — exposes REST routes to control training, datasets, models, and hardware.
2. **Core Layer** — holds the logic for lifecycle management, checkpointing, hardware detection, and storage.
3. **Trainer Layer** — contains backend-agnostic training loops (Accelerate, DeepSpeed).
4. **Strategy Layer** — implements parameter-efficient methods (LoRA, QLoRA, Hybrid).
5. **Storage Layer** — uses local SQLite (ai_tuner.db) for lifecycle and history tracking.
