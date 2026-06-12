from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, date, timedelta
from database import get_db
from models import Transaction, Item, ItemSize, StockBatch

router = APIRouter()


@router.get("/reports/usage")
def usage_report(days: int = 30, item_id: int = None, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(Transaction).filter(
        Transaction.transaction_type == "scan_out",
        Transaction.created_at >= since,
    )
    if item_id:
        q = q.filter(Transaction.item_id == item_id)
    txs = q.all()

    daily: dict = {}
    for tx in txs:
        d = tx.created_at.date().isoformat()
        key = (d, tx.item_id)
        if key not in daily:
            item = db.query(Item).filter(Item.id == tx.item_id).first()
            daily[key] = {"date": d, "item_id": tx.item_id, "item_name": item.name if item else "Unknown", "quantity_used": 0}
        daily[key]["quantity_used"] += tx.quantity

    return sorted(daily.values(), key=lambda x: (x["date"], x["item_name"]))


@router.get("/reports/throw-out")
def throw_out_report(days: int = 30, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    txs = db.query(Transaction).filter(
        Transaction.transaction_type == "throw_out",
        Transaction.created_at >= since,
    ).order_by(Transaction.created_at.desc()).all()

    result = []
    for tx in txs:
        item = db.query(Item).filter(Item.id == tx.item_id).first()
        size = db.query(ItemSize).filter(ItemSize.id == tx.item_size_id).first()
        result.append({
            "id": tx.id,
            "item_name": item.name if item else "Unknown",
            "size_label": size.size_label if size else "Unknown",
            "quantity": tx.quantity,
            "performed_by": tx.performed_by,
            "notes": tx.notes,
            "date": tx.created_at.isoformat(),
        })
    return result


@router.get("/reports/expiring")
def expiring_report(days: int = 14, db: Session = Depends(get_db)):
    cutoff = date.today() + timedelta(days=days)
    batches = db.query(StockBatch).filter(
        StockBatch.expiration_date != None,
        StockBatch.expiration_date <= cutoff,
        StockBatch.quantity_remaining > 0,
    ).order_by(StockBatch.expiration_date.asc()).all()

    result = []
    for b in batches:
        item = db.query(Item).filter(Item.id == b.item_id).first()
        size = db.query(ItemSize).filter(ItemSize.id == b.item_size_id).first()
        result.append({
            "batch_id": b.id,
            "item_name": item.name if item else "Unknown",
            "size_label": size.size_label if size else "Unknown",
            "quantity_remaining": b.quantity_remaining,
            "expiration_date": b.expiration_date.isoformat(),
            "days_until_expiry": (b.expiration_date - date.today()).days,
        })
    return result


@router.get("/reports/top-used")
def top_used(days: int = 30, n: int = 10, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(Transaction.item_id, func.sum(Transaction.quantity).label("total"))
        .filter(Transaction.transaction_type == "scan_out", Transaction.created_at >= since)
        .group_by(Transaction.item_id)
        .order_by(func.sum(Transaction.quantity).desc())
        .limit(n)
        .all()
    )
    result = []
    for row in rows:
        item = db.query(Item).filter(Item.id == row.item_id).first()
        result.append({"item_id": row.item_id, "item_name": item.name if item else "Unknown", "total_used": row.total})
    return result
