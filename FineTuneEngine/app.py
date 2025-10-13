import sys, os
sys.path.append(os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import runs
from routes import datasets
from routes import models
from routes import system


app = FastAPI(
    title="SFCore FineTuner Engine",
    description="Python backend engine for SFCore.FineTunerX.ChatGPT",
    version="0.1.0",
)

# CORS agar bisa diakses dari ASP.NET MVC
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# include route modules
app.include_router(runs.router, prefix="/runs", tags=["Runs"])
app.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
app.include_router(models.router, prefix="/models", tags=["Models"])
app.include_router(system.router, prefix="/system", tags=["System"])

@app.get("/")
def root():
    return {"status": "running", "engine": "FineTuner", "version": "0.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5195)
