import time, random
from core.trainers.base import BaseTrainer


class MockTrainer(BaseTrainer):
    def train(self):
        total_steps = 10
        self.db.update_run_state(self.run_id, "Running")

        self.log(f"Starting mock training loop for run {self.run_id}")
        for step in range(1, total_steps + 1):
            loss = round(random.uniform(0.5, 2.0), 4)
            lr = round(random.uniform(1e-5, 5e-4), 6)
            metrics = {"step": step, "loss": loss, "lr": lr}

            self.db.append_metric(self.run_id, step, metrics)
            self.save_checkpoint(step, metrics)
            self.log(f"Step {step}/{total_steps} | loss={loss} | lr={lr}")

            time.sleep(1)  # simulasi waktu training

        self.finalize()
