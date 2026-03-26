from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from .database import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    title_lt = Column(String(255), nullable=False)
    description_lt = Column(Text, nullable=False)
    ingredients = Column(ARRAY(Text), nullable=False)
    ingredients_lt = Column(ARRAY(Text), nullable=False)
    steps = Column(ARRAY(Text), nullable=False)
    steps_lt = Column(ARRAY(Text), nullable=False)
    photo = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
