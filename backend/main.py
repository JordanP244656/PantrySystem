from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from database import engine, Base, SessionLocal
from routers import items, stores, transactions, reports, upc
from routers.email_router import router as email_router, run_weekly_report

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
app.include_router(upc.router, prefix="/api", tags=["upc"])
app.include_router(email_router, prefix="/api", tags=["email"])

scheduler = BackgroundScheduler()
scheduler.add_job(lambda: run_weekly_report(SessionLocal), "cron", day_of_week="mon", hour=8, minute=0)
scheduler.start()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("shutdown")
def shutdown():
    scheduler.shutdown()
