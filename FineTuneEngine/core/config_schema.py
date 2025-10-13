from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class DatasetConfig(BaseModel):
    type: str = "jsonl"
    path: str
    format_standard: str = "INSTRUCTION_CHAT"
    input_columns: Dict[str, Optional[str]] = {}
    shuffle: bool = True

class TrainingConfig(BaseModel):
    backend: str = "accelerate"
    strategy: str = "qlora"
    epochs: int = 1
    per_device_train_batch_size: int = 2
    learning_rate: float = 2e-4
    gradient_accumulation_steps: int = 8
    lr_scheduler_type: str = "cosine"
    fp16: bool = False
    bf16: bool = True

class ComputeConfig(BaseModel):
    device: str = "auto"
    gpu_index: int = 0

class FineTuneConfig(BaseModel):
    run_name: str
    base_model: str
    dataset: DatasetConfig
    training: TrainingConfig
    compute: ComputeConfig = Field(default_factory=ComputeConfig)
    notes: Optional[str] = None
    tags: List[str] = []
