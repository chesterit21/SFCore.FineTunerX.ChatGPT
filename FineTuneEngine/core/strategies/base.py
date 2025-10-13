from peft import LoraConfig, get_peft_model

class BaseStrategy:
    def __init__(self, model, config):
        self.model = model
        self.config = config

    def apply(self):
        """Override di subclass"""
        raise NotImplementedError("apply() must be implemented by subclass")
