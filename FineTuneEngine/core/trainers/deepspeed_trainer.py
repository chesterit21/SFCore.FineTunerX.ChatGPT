import os, torch, json
from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    Trainer, TrainingArguments, DataCollatorForLanguageModeling
)
from datasets import load_dataset
from core.trainers.base import BaseTrainer
from core.strategies.lora import LoRAStrategy
from core.strategies.qlora import QLoRAStrategy


class DeepSpeedTrainer(BaseTrainer):
    def train(self):
        self.db.update_run_state(self.run_id, "Running")
        cfg = self.config
        model_id = cfg.get("base_model")
        dataset_path = cfg["dataset"]["path"]
        strategy = cfg.get("strategy", "lora")
        zero_stage = cfg.get("deepspeed", {}).get("zero_stage", 2)

        self.log(f"Loading tokenizer for {model_id}")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        tokenizer.pad_token = tokenizer.eos_token

        # dataset
        if not os.path.exists(dataset_path):
            self.log(f"❌ Dataset not found: {dataset_path}")
            self.db.update_run_state(self.run_id, "Error: Missing dataset")
            return

        dataset = load_dataset("json", data_files=dataset_path, split="train")

        def tokenize_fn(examples):
            return tokenizer(examples["text"], truncation=True, padding="max_length", max_length=512)
        dataset = dataset.map(tokenize_fn, batched=True)

        # model + LoRA strategy
        self.log(f"Loading model with DeepSpeed (ZeRO-{zero_stage}) ...")
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )

        if strategy.lower() == "lora":
            model = LoRAStrategy(model, cfg.get("lora", {})).apply()
        elif strategy.lower() == "qlora":
            model = QLoRAStrategy(model, {"base_model": model_id, **cfg.get("lora", {})}).apply()

        # deepspeed config
        ds_config = {
            "zero_optimization": {
                "stage": zero_stage,
                "offload_param": {"device": "none"},
                "offload_optimizer": {"device": "none"},
                "overlap_comm": True,
                "contiguous_gradients": True,
                "reduce_bucket_size": 2e8,
                "stage3_prefetch_bucket_size": 5e7,
                "stage3_param_persistence_threshold": 1e6
            },
            "fp16": {"enabled": False},
            "bf16": {"enabled": True},
            "train_micro_batch_size_per_gpu": cfg["training"].get("per_device_train_batch_size", 1),
            "gradient_accumulation_steps": 1,
            "steps_per_print": 50,
            "wall_clock_breakdown": False
        }

        os.makedirs("configs", exist_ok=True)
        ds_path = os.path.join("configs", f"deepspeed_{self.run_id}.json")
        with open(ds_path, "w") as f:
            json.dump(ds_config, f, indent=2)

        # training args
        args = TrainingArguments(
            output_dir=os.path.join("checkpoints", self.run_id),
            per_device_train_batch_size=cfg["training"].get("per_device_train_batch_size", 1),
            learning_rate=cfg["training"].get("learning_rate", 2e-4),
            num_train_epochs=cfg["training"].get("epochs", 1),
            logging_steps=10,
            save_steps=100,
            deepspeed=ds_path,
            bf16=True,
            report_to="none"
        )

        data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)
        trainer = Trainer(model=model, args=args, train_dataset=dataset, data_collator=data_collator)
        self.log(f"🚀 Starting DeepSpeed training (ZeRO-{zero_stage}) ...")
        trainer.train()
        trainer.save_model(os.path.join("models", f"{self.run_id}_adapter"))
        self.finalize()
