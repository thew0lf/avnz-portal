from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel


class OrderListItem(BaseModel):
    id: str
    order_number: Optional[str] = None
    state: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    email: Optional[str] = None
    customer_id: Optional[str] = None
    created_at: Optional[str] = None


class CustomerListItem(BaseModel):
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None


class TransactionListItem(BaseModel):
    id: str
    order_id: Optional[str] = None
    state: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    processor: Optional[str] = None
    response_code: Optional[str] = None
    created_at: Optional[str] = None


class Address(BaseModel):
    id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    kind: Optional[str] = None


class OrderItem(BaseModel):
    id: str
    product_id: Optional[str] = None
    sku: Optional[str] = None
    name: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None


class OrderDetail(BaseModel):
    order: dict
    items: List[OrderItem]
    transactions: List[TransactionListItem]
    tracking: List[dict]
    billingAddress: Optional[Address] = None
    shippingAddress: Optional[Address] = None
    customer: Optional[CustomerListItem] = None

