# SFCore.FineTunerX.ChatGPT
A cross-language open-source fine-tuning platform that bridges .NET engineering with Python AI ecosystems — empowering developers to train, distill, and manage LLMs locally with full lifecycle and dataset standards.


# ✅ `FineTuneEngine/requirements.txt` (disarankan)

```txt
# --- API & utils ---
fastapi>=0.111
uvicorn[standard]>=0.30
pydantic>=2.7
psutil>=5.9
pandas>=2.2
safetensors>=0.4
huggingface_hub>=0.24

# --- Training stack (HF) ---
transformers>=4.43
datasets>=2.20
peft>=0.11
accelerate>=0.33

# --- 4-bit quant (for QLoRA) ---
# NOTE: bitsandbytes GPU build (Linux/macOS). Windows native belum resmi.
bitsandbytes>=0.43 ; platform_system != "Windows"
```

> Catatan penting:
>
> * **PyTorch (`torch`) sengaja tidak ditaruh di requirements** karena beda-beda per GPU/CUDA. User install sendiri sesuai hardware (instruksi di bawah).
> * Kalau user **Windows** dan butuh QLoRA, `bitsandbytes` sering bermasalah. Bisa skip QLoRA (pakai LoRA) atau pakai alternatif (nanti kita sediakan opsi lain).

---

# 🧩 Cara instal yang konsisten

## 1) Buat venv & install requirements

```bash
cd FineTuneEngine
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 2) Install PyTorch sesuai hardware

### GPU (CUDA)

Pilih versi sesuai CUDA kamu dari situs PyTorch. Contoh CUDA 12.1:

```bash
pip install --index-url https://download.pytorch.org/whl/cu121 torch torchvision torchaudio
```

### CPU-only

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Apple Silicon (MPS)

```bash
pip install torch torchvision torchaudio
# (macOS akan otomatis MPS kalau tersedia)
```

> Setelah itu jalanin:
>
> ```bash
> python app.py
> ```
>
> lalu buka `http://localhost:5195/docs`.

---

# 💡 Opsi & catatan platform

* **Linux/NVIDIA (direkomendasikan):** QLoRA via `bitsandbytes` berjalan normal.
* **Windows:** `bitsandbytes` sering tidak tersedia resmi → untuk QLoRA, sarankan WSL2 + CUDA, atau sementara **pakai LoRA** dulu.
* **Tanpa GPU:** tetap bisa training **LoRA** kecil di CPU (pelan), QLoRA sebaiknya di-skip.

---

# 🧪 Quick import test (cek env user)

Tambahkan di README buat self-check:

```bash
python -c "import torch, transformers, datasets, peft; print('OK:', torch.__version__)"
```

## DeepSpeed Notes (READ ME FIRST)

> **Why this matters**
> Recent security change in `transformers` blocks loading legacy `.bin` weights unless **PyTorch ≥ 2.6.0** (CVE-2025-32434). If you run DeepSpeed (or any flow that calls `torch.load`), you may hit:
>
> ```
> ValueError: ... upgrade torch to at least v2.6 ...
> ```

### ✅ Quick Fixes

* **Preferred:** use models with **`.safetensors`** (safe & fast).
* **Or:** upgrade PyTorch to **≥ 2.6.0**.

### Install PyTorch (pick one)

**CUDA (e.g., 12.1):**

```bash
pip install -U torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu129
```

**CPU-only:**

```bash
pip install -U torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

**Verify:**

```bash
python -c "import torch; print(torch.__version__)"
# must be 2.6.0+
```

### Recommended Model Format

* Prefer **safetensors** weights (most official repos provide them).
* If your local model folder only has `pytorch_model.bin`, convert/save as safetensors once:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
model_id = "facebook/opt-350m"  # example
tok = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
tok.save_pretrained("models/opt-350m")
model = AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True)
model.save_pretrained("models/opt-350m", safe_serialization=True)  # writes *.safetensors
```

### Minimal DeepSpeed Config Example

```json
{
  "run_name": "demo_ds_opt350m",
  "base_model": "facebook/opt-350m",
  "backend": "deepspeed",
  "strategy": "lora",
  "dataset": { "path": "data/sample.jsonl" },
  "training": { "epochs": 1, "per_device_train_batch_size": 1 },
  "deepspeed": { "zero_stage": 2 }
}
```

### Trainer Settings Hints

* Use `dtype` (not `torch_dtype`) to avoid deprecation:

```python
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True
)
```

### Small Models for Testing (300–700MB)

* `facebook/opt-350m` (very stable)
* `microsoft/phi-1_5`
* `TinyLlama/TinyLlama-1.1B-Chat-v1.0` (~700MB)
* `Qwen/Qwen2-0.5B` (set `trust_remote_code=True`)

### Environment Self-check

```bash
python -c "import torch, transformers, tokenizers; \
print('torch', torch.__version__, ' | transformers', transformers.__version__, ' | tokenizers', tokenizers.__version__)"
```
