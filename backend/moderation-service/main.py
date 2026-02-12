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

    try:
        results = model.predict(text)
        # Convert numpy values to float for JSON serialization
        results = {k: float(v) for k, v in results.items()}
        toxicity_score = results.get("toxicity", 0.0)
    except Exception as e:
        return {
            "flagged": False,
            "reason": f"Error processing text: {str(e)}",
            "scores": {}
        }

    threshold = 0.7
    flagged = toxicity_score > threshold

    return {
        "flagged": flagged,
        "reason": "Toxic content detected" if flagged else None,
        "scores": results
    }
