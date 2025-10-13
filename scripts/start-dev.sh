#!/usr/bin/env bash
set -e
# run python engine
( cd FineTuneEngine && uvicorn app:app --port 5195 ) &
PY_PID=$!
# run aspnet
( cd SFCore.FineTuner.Web && dotnet run --urls http://localhost:5194 )
kill $PY_PID || true
