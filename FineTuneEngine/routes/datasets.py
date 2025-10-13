from fastapi import APIRouter, UploadFile, File, Form
from typing import List
import os, json

router = APIRouter()

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATASET_DIR, exist_ok=True)

@router.get("/")
def list_datasets():
    """List semua dataset yang ada di folder data"""
    datasets = []
    for f in os.listdir(DATASET_DIR):
        if f.endswith(".jsonl") or f.endswith(".csv"):
            path = os.path.join(DATASET_DIR, f)
            size_mb = round(os.path.getsize(path) / (1024**2), 2)
            datasets.append({
                "name": f,
                "size_mb": size_mb,
                "path": path
            })
    return {"datasets": datasets}


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload dataset baru ke folder data"""
    filename = file.filename
    file_path = os.path.join(DATASET_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    return {"message": f"Dataset '{filename}' uploaded successfully.", "path": file_path}


@router.get("/inspect")
def inspect_dataset(filename: str):
    """Cek isi 5 baris pertama dataset"""
    file_path = os.path.join(DATASET_DIR, filename)
    if not os.path.exists(file_path):
        return {"error": f"File {filename} not found."}

    if filename.endswith(".jsonl"):
        lines = []
        with open(file_path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= 5:
                    break
                try:
                    lines.append(json.loads(line))
                except:
                    lines.append({"raw": line.strip()})
        return {"sample": lines, "type": "jsonl"}

    elif filename.endswith(".csv"):
        import pandas as pd
        df = pd.read_csv(file_path, nrows=5)
        return {"sample": df.to_dict(orient="records"), "type": "csv"}

    return {"error": "Unsupported file format."}
