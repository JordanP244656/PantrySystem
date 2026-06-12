from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import items, stores, transactions, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pantry System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router, prefix="/api", tags=["items"])
app.include_router(stores.router, prefix="/api", tags=["stores"])
app.include_router(transactions.router, prefix="/api", tags=["transactions"])
app.include_router(reports.router, prefix="/api", tags=["reports"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
