from peft import LoraConfig, get_peft_model
from transformers import BitsAndBytesConfig
from core.strategies.base import BaseStrategy

class QLoRAStrategy(BaseStrategy):
    def apply(self):
        from transformers import AutoModelForCausalLM
        bnb_cfg = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype="float16"
        )
        model = AutoModelForCausalLM.from_pretrained(
            self.config["base_model"],
            quantization_config=bnb_cfg,
            device_map="auto"
        )
        lora_cfg = LoraConfig(
            r=self.config.get("r", 8),
            lora_alpha=self.config.get("lora_alpha", 32),
            lora_dropout=self.config.get("lora_dropout", 0.05),
            bias="none",
            task_type="CAUSAL_LM"
        )
        return get_peft_model(model, lora_cfg)
