from sentence_transformers import SentenceTransformer

print("Loading BGE-M3...")

model = SentenceTransformer("BAAI/bge-m3")

print("BGE-M3 loaded successfully!")

texts = [
    "I want to learn React and become a frontend developer.",
    "I want to learn backend development with Node.js."
]

embeddings = model.encode(texts)

print("Embedding shape:", embeddings.shape)
print("First embedding:", embeddings[0])
