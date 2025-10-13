import torch, os
from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    TrainingArguments, Trainer, DataCollatorForLanguageModeling
)
from datasets import load_dataset
from core.trainers.base import BaseTrainer
from core.strategies.lora import LoRAStrategy
from core.strategies.qlora import QLoRAStrategy


class AccelerateTrainer(BaseTrainer):
    def train(self):
        self.db.update_run_state(self.run_id, "Running")
        cfg = self.config

        model_id = cfg.get("base_model")
        strategy = cfg.get("strategy", "lora")
        dataset_path = cfg["dataset"]["path"]

        self.log(f"Loading base model: {model_id}")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        tokenizer.pad_token = tokenizer.eos_token

        dataset = load_dataset("json", data_files=dataset_path, split="train")

        def tokenize_fn(examples):
            return tokenizer(examples["text"], truncation=True, padding="max_length", max_length=512)
        dataset = dataset.map(tokenize_fn, batched=True)

        self.log(f"Applying strategy: {strategy}")
        model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="auto")

        if strategy.lower() == "lora":
            model = LoRAStrategy(model, cfg.get("lora", {})).apply()
        elif strategy.lower() == "qlora":
            model = QLoRAStrategy(model, {"base_model": model_id, **cfg.get("lora", {})}).apply()

        args = TrainingArguments(
            output_dir=os.path.join("checkpoints", self.run_id),
            per_device_train_batch_size=cfg["training"].get("per_device_train_batch_size", 2),
            learning_rate=cfg["training"].get("learning_rate", 2e-4),
            num_train_epochs=cfg["training"].get("epochs", 1),
            save_steps=50,
            logging_steps=10,
            bf16=True,
            report_to="none"
        )

        data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)
        trainer = Trainer(model=model, args=args, train_dataset=dataset, data_collator=data_collator)
        self.log("🚀 Starting training ...")
        trainer.train()
        trainer.save_model(os.path.join("models", f"{self.run_id}_adapter"))
        self.finalize()
