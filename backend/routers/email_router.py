from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
import os
from database import get_db
from models import Item, Transaction, StockBatch
from email_service import load_settings, save_settings, send_email, build_weekly_report_email
from datetime import datetime, timedelta

router = APIRouter()


from typing import List

class EmailSettings(BaseModel):
    enabled: bool = False
    to_emails: List[str] = []
    from_email: str = "pantryupdates@playsbot.cc"
    resend_api_key: Optional[str] = None


@router.get("/email/settings")
def get_email_settings():
    s = load_settings()
    to_emails = s.get("to_emails", [])
    if not to_emails and s.get("to_email"):
        to_emails = [s["to_email"]]
    api_key = s.get("resend_api_key") or os.environ.get("RESEND_API_KEY", "")
    return {
        "enabled": s.get("enabled", False),
        "to_emails": to_emails,
        "from_email": s.get("from_email", "pantryupdates@playsbot.cc"),
        "api_key_set": bool(api_key),
    }


@router.post("/email/settings")
def update_email_settings(data: EmailSettings):
    s = load_settings()
    settings = {
        **s,
        "enabled": data.enabled,
        "to_emails": data.to_emails,
        "from_email": data.from_email,
    }
    if data.resend_api_key:
        settings["resend_api_key"] = data.resend_api_key
    save_settings(settings)
    return {"ok": True}


@router.post("/email/test")
def test_email():
    ok, msg = send_email("PantrySystem — Test Email", "<h2>It works! 🎉</h2><p>Your PantrySystem email is configured correctly.</p>")
    return {"ok": ok, "message": msg}


@router.post("/email/send-weekly")
def send_weekly_now(db: Session = Depends(get_db)):
    low_stock = _get_low_stock(db)
    unused = _get_unused(db)
    subject, body = build_weekly_report_email(low_stock, unused)
    ok, msg = send_email(subject, body)
    return {"ok": ok, "message": msg}


def _get_low_stock(db: Session, threshold: int = 5):
    rows = (
        db.query(StockBatch.item_id, func.sum(StockBatch.quantity_remaining).label("total"))
        .group_by(StockBatch.item_id)
        .having(func.sum(StockBatch.quantity_remaining) < threshold)
        .all()
    )
    result = []
    for row in rows:
        item = db.query(Item).filter(Item.id == row.item_id).first()
        result.append({"item_name": item.name if item else "Unknown", "total_remaining": row.total})
    return result


def _get_unused(db: Session, days: int = 14):
    cutoff = datetime.utcnow() - timedelta(days=days)
    all_items = db.query(Item).all()
    result = []
    for item in all_items:
        last_tx = (
            db.query(Transaction)
            .filter(Transaction.item_id == item.id, Transaction.transaction_type == "scan_out")
            .order_by(Transaction.created_at.desc())
            .first()
        )
        if last_tx is None or last_tx.created_at < cutoff:
            days_since = (datetime.utcnow() - last_tx.created_at).days if last_tx else 999
            result.append({"item_name": item.name, "days_since": days_since})
    return result


def run_weekly_report(db_session_factory):
    from sqlalchemy.orm import Session
    db = db_session_factory()
    try:
        low_stock = _get_low_stock(db)
        unused = _get_unused(db)
        subject, body = build_weekly_report_email(low_stock, unused)
        send_email(subject, body)
    finally:
        db.close()
