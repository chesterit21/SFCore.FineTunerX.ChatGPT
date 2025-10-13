from fastapi import FastAPI

app = FastAPI(title="SFCore FineTuner Engine")

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5195)
