from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    barcode = Column(String, unique=True, nullable=True, index=True)
    category = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sizes = relationship("ItemSize", back_populates="item", cascade="all, delete-orphan")
    store_links = relationship("StoreItemLink", back_populates="item", cascade="all, delete-orphan")
    stock_batches = relationship("StockBatch", back_populates="item")
    transactions = relationship("Transaction", back_populates="item")


class ItemSize(Base):
    __tablename__ = "item_sizes"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    size_label = Column(String, nullable=False)
    unit_count = Column(Integer, default=1)
    is_default = Column(Boolean, default=False)

    item = relationship("Item", back_populates="sizes")
    store_links = relationship("StoreItemLink", back_populates="item_size")
    stock_batches = relationship("StockBatch", back_populates="item_size")
    transactions = relationship("Transaction", back_populates="item_size")


class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    website_url = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    item_links = relationship("StoreItemLink", back_populates="store", cascade="all, delete-orphan")
    stock_batches = relationship("StockBatch", back_populates="store")
    mass_stock_sessions = relationship("MassStockSession", back_populates="store")


class StoreItemLink(Base):
    __tablename__ = "store_item_links"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item_size_id = Column(Integer, ForeignKey("item_sizes.id"), nullable=True)
    store_item_number = Column(String, nullable=True)
    purchase_url = Column(String, nullable=True)
    price = Column(Float, nullable=True)

    __table_args__ = (UniqueConstraint("store_id", "item_id", "item_size_id"),)

    store = relationship("Store", back_populates="item_links")
    item = relationship("Item", back_populates="store_links")
    item_size = relationship("ItemSize", back_populates="store_links")


class StockBatch(Base):
    __tablename__ = "stock_batches"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item_size_id = Column(Integer, ForeignKey("item_sizes.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    quantity_received = Column(Integer, nullable=False)
    quantity_remaining = Column(Integer, nullable=False)
    expiration_date = Column(Date, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    item = relationship("Item", back_populates="stock_batches")
    item_size = relationship("ItemSize", back_populates="stock_batches")
    store = relationship("Store", back_populates="stock_batches")
    transactions = relationship("Transaction", back_populates="stock_batch")


class MassStockSession(Base):
    __tablename__ = "mass_stock_sessions"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    performed_by = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="mass_stock_sessions")
    transactions = relationship("Transaction", back_populates="mass_stock_session")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String, nullable=False)  # scan_in, scan_out, throw_out
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item_size_id = Column(Integer, ForeignKey("item_sizes.id"), nullable=False)
    stock_batch_id = Column(Integer, ForeignKey("stock_batches.id"), nullable=True)
    mass_stock_session_id = Column(Integer, ForeignKey("mass_stock_sessions.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    performed_by = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("Item", back_populates="transactions")
    item_size = relationship("ItemSize", back_populates="transactions")
    stock_batch = relationship("StockBatch", back_populates="transactions")
    mass_stock_session = relationship("MassStockSession", back_populates="transactions")
