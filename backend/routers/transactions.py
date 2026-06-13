from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
from database import get_db
from models import Item, ItemSize, StockBatch, Transaction, MassStockSession
from email_service import send_email, build_stock_summary_email
from schemas import (
    TransactionCreate, TransactionRead, ScanInCreate,
    MassStockSessionCreate, MassStockSessionRead,
    CurrentStockItem, StockBatchRead, LowStockItem
)

router = APIRouter()


def _deduct_stock(db: Session, item_id: int, item_size_id: int, quantity: int, tx_type: str, performed_by: str, notes: str):
    batches = (
        db.query(StockBatch)
        .filter(StockBatch.item_id == item_id, StockBatch.item_size_id == item_size_id, StockBatch.quantity_remaining > 0)
        .order_by(StockBatch.received_at.asc())
        .all()
    )
    total = sum(b.quantity_remaining for b in batches)
    if total < quantity:
        raise HTTPException(400, f"Not enough stock. Available: {total}")

    remaining = quantity
    txs = []
    for batch in batches:
        if remaining <= 0:
            break
        take = min(batch.quantity_remaining, remaining)
        batch.quantity_remaining -= take
        remaining -= take
        tx = Transaction(
            transaction_type=tx_type,
            item_id=item_id,
            item_size_id=item_size_id,
            stock_batch_id=batch.id,
            quantity=take,
            performed_by=performed_by,
            notes=notes,
        )
        db.add(tx)
        txs.append(tx)
    db.commit()
    for tx in txs:
        db.refresh(tx)
    return txs


@router.post("/transactions/scan-out", response_model=List[TransactionRead])
def scan_out(data: TransactionCreate, db: Session = Depends(get_db)):
    return _deduct_stock(db, data.item_id, data.item_size_id, data.quantity, "scan_out", data.performed_by, data.notes)


@router.post("/transactions/throw-out", response_model=List[TransactionRead])
def throw_out(data: TransactionCreate, db: Session = Depends(get_db)):
    return _deduct_stock(db, data.item_id, data.item_size_id, data.quantity, "throw_out", data.performed_by, data.notes)


@router.post("/transactions/scan-in", response_model=TransactionRead)
def scan_in(data: ScanInCreate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == data.item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    batch = StockBatch(
        item_id=data.item_id,
        item_size_id=data.item_size_id,
        store_id=data.store_id,
        quantity_received=data.quantity,
        quantity_remaining=data.quantity,
        expiration_date=data.expiration_date,
        notes=data.notes,
    )
    db.add(batch)
    db.flush()
    tx = Transaction(
        transaction_type="scan_in",
        item_id=data.item_id,
        item_size_id=data.item_size_id,
        stock_batch_id=batch.id,
        quantity=data.quantity,
        performed_by=data.performed_by,
        notes=data.notes,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.post("/transactions/mass-stock", response_model=MassStockSessionRead)
def mass_stock(data: MassStockSessionCreate, db: Session = Depends(get_db)):
    session = MassStockSession(store_id=data.store_id, performed_by=data.performed_by, notes=data.notes)
    db.add(session)
    db.flush()
    for entry in data.items:
        batch = StockBatch(
            item_id=entry.item_id,
            item_size_id=entry.item_size_id,
            store_id=data.store_id,
            quantity_received=entry.quantity,
            quantity_remaining=entry.quantity,
            expiration_date=entry.expiration_date,
        )
        db.add(batch)
        db.flush()
        tx = Transaction(
            transaction_type="scan_in",
            item_id=entry.item_id,
            item_size_id=entry.item_size_id,
            stock_batch_id=batch.id,
            mass_stock_session_id=session.id,
            quantity=entry.quantity,
            performed_by=data.performed_by,
        )
        db.add(tx)
    db.commit()
    db.refresh(session)
    # Email summary if 10+ items
    if len(data.items) >= 10:
        store_name = data.notes.replace("Store: ", "") if data.notes and data.notes.startswith("Store: ") else "Unknown Store"
        email_items = []
        for entry in data.items:
            item = db.query(Item).filter(Item.id == entry.item_id).first()
            email_items.append({"name": item.name if item else f"Item #{entry.item_id}", "qty": entry.quantity})
        subject, body = build_stock_summary_email(store_name, email_items)
        send_email(subject, body)
    return session


@router.get("/transactions", response_model=List[TransactionRead])
def list_transactions(
    item_id: Optional[int] = None,
    type: Optional[str] = None,
    limit: int = Query(50, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Transaction)
    if item_id:
        q = q.filter(Transaction.item_id == item_id)
    if type:
        q = q.filter(Transaction.transaction_type == type)
    return q.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/transactions/current-stock")
def current_stock(db: Session = Depends(get_db)):
    batches = db.query(StockBatch).filter(StockBatch.quantity_remaining > 0).all()
    grouped: dict = {}
    for b in batches:
        key = (b.item_id, b.item_size_id)
        if key not in grouped:
            grouped[key] = {"batches": [], "total": 0}
        grouped[key]["batches"].append(b)
        grouped[key]["total"] += b.quantity_remaining

    soon = date.today() + timedelta(days=30)
    result = []
    for (item_id, size_id), data in grouped.items():
        item = db.query(Item).filter(Item.id == item_id).first()
        size = db.query(ItemSize).filter(ItemSize.id == size_id).first()
        expiring = any(b.expiration_date and b.expiration_date <= soon for b in data["batches"])
        result.append({
            "item_id": item_id,
            "item_name": item.name if item else "Unknown",
            "item_size_id": size_id,
            "size_label": size.size_label if size else "Unknown",
            "total_remaining": data["total"],
            "expiring_soon": expiring,
            "batches": [
                {
                    "id": b.id, "item_id": b.item_id, "item_size_id": b.item_size_id,
                    "store_id": b.store_id, "quantity_received": b.quantity_received,
                    "quantity_remaining": b.quantity_remaining,
                    "expiration_date": b.expiration_date.isoformat() if b.expiration_date else None,
                    "received_at": b.received_at.isoformat(), "notes": b.notes,
                }
                for b in sorted(data["batches"], key=lambda x: x.received_at)
            ],
        })
    return sorted(result, key=lambda x: x["item_name"])


@router.get("/transactions/low-stock")
def low_stock(threshold: int = 5, db: Session = Depends(get_db)):
    from sqlalchemy import func
    rows = (
        db.query(StockBatch.item_id, StockBatch.item_size_id, func.sum(StockBatch.quantity_remaining).label("total"))
        .group_by(StockBatch.item_id, StockBatch.item_size_id)
        .having(func.sum(StockBatch.quantity_remaining) < threshold)
        .all()
    )
    result = []
    for row in rows:
        item = db.query(Item).filter(Item.id == row.item_id).first()
        size = db.query(ItemSize).filter(ItemSize.id == row.item_size_id).first()
        result.append({
            "item_id": row.item_id,
            "item_name": item.name if item else "Unknown",
            "item_size_id": row.item_size_id,
            "size_label": size.size_label if size else "Unknown",
            "total_remaining": row.total,
        })
    return result
