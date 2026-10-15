from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from threatlens_pipeline import ThreatLensPipeline
from logger import log_event

app = FastAPI(title="ThreatLens AI Security API")
pipeline = ThreatLensPipeline()

class RequestData(BaseModel):
    identifier: str
    rule_name: str = "brute_force"
    features: List[float]

@app.get("/")
def read_root():
    return {"message": "ThreatLens AI Security API is running. Use /analyze endpoint."}

@app.post("/analyze")
async def analyze_traffic(data: RequestData):
    try:
        # Process request through the 3-layer pipeline
        result = pipeline.process_request(data.identifier, data.rule_name, data.features)
        
        # Extract count if available (from Layer 1)
        count = result.get("count", None)
        
        # LOG the event
        log_event(
            identifier=data.identifier,
            status=result["status"],
            layer=result["layer"],
            reason=result["reason"],
            count=count
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run on localhost:8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
