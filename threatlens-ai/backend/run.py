import os
import sys
import uvicorn

if __name__ == "__main__":
    # Ensure current directory is in sys.path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    print("======================================================")
    print(" Starting ThreatLens AI - Cybersecurity Core Backend  ")
    print(" Swagger OpenAPI: http://localhost:8000/docs          ")
    print(" Redoc:          http://localhost:8000/redoc         ")
    print("======================================================")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
