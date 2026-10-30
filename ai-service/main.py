from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="DevCollective AI Service")

print("Loading BGE-M3...")
model = SentenceTransformer("BAAI/bge-m3")
print("BGE-M3 loaded successfully!")


class EmbedRequest(BaseModel):
    text: str


@app.get("/")
def root():
    return {
        "message": "DevCollective AI Service is running"
    }


@app.post("/embed")
def create_embedding(request: EmbedRequest):
    embedding = model.encode(request.text)

    return {
        "text": request.text,
        "embedding": embedding.tolist(),
        "dimensions": len(embedding)
    }
