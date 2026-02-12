from fastapi import FastAPI
from detoxify import Detoxify
from pydantic import BaseModel

app = FastAPI()

# Load model once (important)
model = Detoxify('original')

class TextRequest(BaseModel):
    text: str

@app.post("/moderate")
async def moderate(request: TextRequest):
    text = request.text.strip()

    if not text:
        return {
            "flagged": False,
            "reason": "Empty text",
            "scores": {}
        }

    results = model.predict(text)

    toxicity_score = results["toxicity"]

    threshold = 0.7

    flagged = toxicity_score > threshold

    return {
        "flagged": flagged,
        "reason": "Toxic content detected" if flagged else None,
        "scores": results
    }
