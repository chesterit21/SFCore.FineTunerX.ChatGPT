from fastapi import APIRouter, Query
from typing import Optional
import os, subprocess

router = APIRouter()

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

@router.get("/")
def list_models():
    """List semua model lokal yang ada di folder models"""
    models = []
    for d in os.listdir(MODELS_DIR):
        path = os.path.join(MODELS_DIR, d)
        if os.path.isdir(path):
            size_gb = 0
            for root, _, files in os.walk(path):
                for f in files:
                    size_gb += os.path.getsize(os.path.join(root, f))
            size_gb = round(size_gb / (1024**3), 2)
            models.append({"name": d, "size_gb": size_gb, "path": path})
    return {"models": models}


@router.post("/download")
def download_model(repo_id: str = Query(..., description="HuggingFace repo_id, e.g. 'meta-llama/Llama-2-7b-hf'")):
    """Download base model dari Hugging Face pakai `huggingface-cli`"""
    try:
        cmd = [
            "huggingface-cli",
            "download",
            repo_id,
            "--local-dir",
            os.path.join(MODELS_DIR, repo_id.replace("/", "_"))
        ]
        subprocess.run(cmd, check=True)
        return {"message": f"Model {repo_id} downloaded successfully."}
    except Exception as ex:
        return {"error": str(ex)}


@router.get("/inspect")
def inspect_model(model_name: str):
    """Cek isi folder model tertentu"""
    path = os.path.join(MODELS_DIR, model_name)
    if not os.path.exists(path):
        return {"error": "Model not found."}
    contents = os.listdir(path)
    return {"model": model_name, "files": contents}
