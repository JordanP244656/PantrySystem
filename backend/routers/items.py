from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import Item, ItemSize, StockBatch
from schemas import ItemCreate, ItemRead, ItemUpdate, ItemSizeCreate, ItemSizeRead

router = APIRouter()


@router.get("/items", response_model=List[ItemRead])
def list_items(q: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Item)
    if q:
        query = query.filter(
            Item.name.ilike(f"%{q}%") | Item.barcode.ilike(f"%{q}%")
        )
    return query.order_by(Item.name).all()


@router.post("/items", response_model=ItemRead)
def create_item(data: ItemCreate, db: Session = Depends(get_db)):
    existing = db.query(Item).filter(Item.name == data.name).first()
    if existing:
        raise HTTPException(400, "Item with this name already exists")
    item = Item(name=data.name, barcode=data.barcode, category=data.category, description=data.description)
    db.add(item)
    db.flush()
    for s in data.sizes:
        size = ItemSize(item_id=item.id, size_label=s.size_label, unit_count=s.unit_count, is_default=s.is_default)
        db.add(size)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=ItemRead)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@router.put("/items/{item_id}", response_model=ItemRead)
def update_item(item_id: int, data: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for field, value in data.dict(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.post("/items/{item_id}/sizes", response_model=ItemSizeRead)
def add_size(item_id: int, data: ItemSizeCreate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    size = ItemSize(item_id=item_id, size_label=data.size_label, unit_count=data.unit_count, is_default=data.is_default)
    db.add(size)
    db.commit()
    db.refresh(size)
    return size


@router.put("/items/{item_id}/sizes/{size_id}", response_model=ItemSizeRead)
def update_size(item_id: int, size_id: int, data: ItemSizeCreate, db: Session = Depends(get_db)):
    size = db.query(ItemSize).filter(ItemSize.id == size_id, ItemSize.item_id == item_id).first()
    if not size:
        raise HTTPException(404, "Size not found")
    size.size_label = data.size_label
    size.unit_count = data.unit_count
    size.is_default = data.is_default
    db.commit()
    db.refresh(size)
    return size


@router.delete("/items/{item_id}/sizes/{size_id}")
def delete_size(item_id: int, size_id: int, db: Session = Depends(get_db)):
    size = db.query(ItemSize).filter(ItemSize.id == size_id, ItemSize.item_id == item_id).first()
    if not size:
        raise HTTPException(404, "Size not found")
    db.delete(size)
    db.commit()
    return {"ok": True}
