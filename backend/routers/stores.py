from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Store, StoreItemLink, Item, ItemSize
from schemas import StoreCreate, StoreRead, StoreUpdate, StoreItemLinkCreate, StoreItemLinkRead, StoreItemLinkUpdate

router = APIRouter()


@router.get("/stores", response_model=List[StoreRead])
def list_stores(db: Session = Depends(get_db)):
    return db.query(Store).order_by(Store.name).all()


@router.post("/stores", response_model=StoreRead)
def create_store(data: StoreCreate, db: Session = Depends(get_db)):
    existing = db.query(Store).filter(Store.name == data.name).first()
    if existing:
        raise HTTPException(400, "Store with this name already exists")
    store = Store(**data.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.get("/stores/{store_id}", response_model=StoreRead)
def get_store(store_id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")
    return store


@router.put("/stores/{store_id}", response_model=StoreRead)
def update_store(store_id: int, data: StoreUpdate, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(store, field, value)
    db.commit()
    db.refresh(store)
    return store


@router.delete("/stores/{store_id}")
def delete_store(store_id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")
    db.delete(store)
    db.commit()
    return {"ok": True}


@router.get("/stores/{store_id}/items", response_model=List[StoreItemLinkRead])
def get_store_items(store_id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")
    return db.query(StoreItemLink).filter(StoreItemLink.store_id == store_id).all()


@router.post("/stores/{store_id}/items", response_model=StoreItemLinkRead)
def add_store_item_link(store_id: int, data: StoreItemLinkCreate, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")
    item = db.query(Item).filter(Item.id == data.item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    link = StoreItemLink(store_id=store_id, **data.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.put("/stores/{store_id}/items/{link_id}", response_model=StoreItemLinkRead)
def update_store_item_link(store_id: int, link_id: int, data: StoreItemLinkUpdate, db: Session = Depends(get_db)):
    link = db.query(StoreItemLink).filter(StoreItemLink.id == link_id, StoreItemLink.store_id == store_id).first()
    if not link:
        raise HTTPException(404, "Link not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(link, field, value)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/stores/{store_id}/items/{link_id}")
def delete_store_item_link(store_id: int, link_id: int, db: Session = Depends(get_db)):
    link = db.query(StoreItemLink).filter(StoreItemLink.id == link_id, StoreItemLink.store_id == store_id).first()
    if not link:
        raise HTTPException(404, "Link not found")
    db.delete(link)
    db.commit()
    return {"ok": True}
