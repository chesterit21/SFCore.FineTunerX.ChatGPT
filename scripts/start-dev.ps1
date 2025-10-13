Start-Process powershell -ArgumentList "-NoExit","-Command","cd FineTuneEngine; uvicorn app:app --port 5195"
cd SFCore.FineTuner.Web
dotnet run --urls http://localhost:5194
