from peft import LoraConfig, get_peft_model
from core.strategies.base import BaseStrategy

class LoRAStrategy(BaseStrategy):
    def apply(self):
        lora_cfg = LoraConfig(
            r=self.config.get("r", 8),
            lora_alpha=self.config.get("lora_alpha", 32),
            lora_dropout=self.config.get("lora_dropout", 0.05),
            bias="none",
            task_type="CAUSAL_LM"
        )
        return get_peft_model(self.model, lora_cfg)
