# models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, func
from database import Base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    searches = relationship("SearchTerm", back_populates="user")
    triggers = relationship("PriceTriggerDB", back_populates="user")


class SearchTerm(Base):
    __tablename__ = "search_terms"
    id = Column(Integer, primary_key=True, index=True)
    term = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="searches")

class PriceTriggerDB(Base):
    __tablename__ = "price_triggers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    zip_code = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="triggers")
