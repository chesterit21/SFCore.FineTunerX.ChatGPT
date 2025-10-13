import torch, psutil, platform, shutil, subprocess

def get_hardware_info():
    info = {
        "system": platform.system(),
        "release": platform.release(),
        "python_version": platform.python_version(),
        "cuda_available": torch.cuda.is_available(),
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "num_gpus": torch.cuda.device_count(),
        "cpu": platform.processor(),
        "ram_gb": round(psutil.virtual_memory().total / (1024 ** 3), 2),
        "disk_free_gb": round(shutil.disk_usage("/").free / (1024 ** 3), 2)
    }
    if info["cuda_available"]:
        info["gpu_list"] = [{
            "index": i,
            "name": torch.cuda.get_device_name(i),
            "vram_gb": round(torch.cuda.get_device_properties(i).total_memory / (1024**3), 2)
        } for i in range(info["num_gpus"])]
    return info
