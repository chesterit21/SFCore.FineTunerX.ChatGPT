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

# 🧩 Cara instal yang konsisten (copy ke README juga)

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

