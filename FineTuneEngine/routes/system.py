from fastapi import APIRouter
from core.hardware import get_hardware_info

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "component": "FineTuneEngine"}

@router.get("/hardware")
def hardware():
    return get_hardware_info()
