from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class ItemSizeCreate(BaseModel):
    size_label: str
    unit_count: int = 1
    is_default: bool = False

class ItemSizeRead(BaseModel):
    id: int
    size_label: str
    unit_count: int
    is_default: bool
    class Config:
        orm_mode = True

class ItemCreate(BaseModel):
    name: str
    barcode: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    sizes: List[ItemSizeCreate] = []

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

class ItemRead(BaseModel):
    id: int
    name: str
    barcode: Optional[str]
    category: Optional[str]
    description: Optional[str]
    created_at: datetime
    sizes: List[ItemSizeRead] = []
    class Config:
        orm_mode = True


class StoreCreate(BaseModel):
    name: str
    website_url: Optional[str] = None
    notes: Optional[str] = None

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    website_url: Optional[str] = None
    notes: Optional[str] = None

class StoreRead(BaseModel):
    id: int
    name: str
    website_url: Optional[str]
    notes: Optional[str]
    created_at: datetime
    class Config:
        orm_mode = True


class StoreItemLinkCreate(BaseModel):
    item_id: int
    item_size_id: Optional[int] = None
    store_item_number: Optional[str] = None
    purchase_url: Optional[str] = None
    price: Optional[float] = None

class StoreItemLinkUpdate(BaseModel):
    store_item_number: Optional[str] = None
    purchase_url: Optional[str] = None
    price: Optional[float] = None

class StoreItemLinkRead(BaseModel):
    id: int
    store_id: int
    item_id: int
    item_size_id: Optional[int]
    store_item_number: Optional[str]
    purchase_url: Optional[str]
    price: Optional[float]
    item: Optional[ItemRead] = None
    item_size: Optional[ItemSizeRead] = None
    class Config:
        orm_mode = True


class StockBatchCreate(BaseModel):
    item_id: int
    item_size_id: int
    store_id: Optional[int] = None
    quantity_received: int
    expiration_date: Optional[date] = None
    notes: Optional[str] = None

class StockBatchRead(BaseModel):
    id: int
    item_id: int
    item_size_id: int
    store_id: Optional[int]
    quantity_received: int
    quantity_remaining: int
    expiration_date: Optional[date]
    received_at: datetime
    notes: Optional[str]
    class Config:
        orm_mode = True


class TransactionCreate(BaseModel):
    item_id: int
    item_size_id: int
    quantity: int
    performed_by: Optional[str] = None
    notes: Optional[str] = None

class ScanInCreate(BaseModel):
    item_id: int
    item_size_id: int
    quantity: int
    store_id: Optional[int] = None
    expiration_date: Optional[date] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None

class TransactionRead(BaseModel):
    id: int
    transaction_type: str
    item_id: int
    item_size_id: int
    stock_batch_id: Optional[int]
    mass_stock_session_id: Optional[int]
    quantity: int
    performed_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    item: Optional[ItemRead] = None
    item_size: Optional[ItemSizeRead] = None
    class Config:
        orm_mode = True


class MassStockItem(BaseModel):
    item_id: int
    item_size_id: int
    quantity: int
    expiration_date: Optional[date] = None

class MassStockSessionCreate(BaseModel):
    store_id: Optional[int] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None
    items: List[MassStockItem]

class MassStockSessionRead(BaseModel):
    id: int
    store_id: Optional[int]
    performed_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    class Config:
        orm_mode = True


class CurrentStockItem(BaseModel):
    item_id: int
    item_name: str
    item_size_id: int
    size_label: str
    total_remaining: int
    expiring_soon: bool
    batches: List[StockBatchRead]

class LowStockItem(BaseModel):
    item_id: int
    item_name: str
    item_size_id: int
    size_label: str
    total_remaining: int
