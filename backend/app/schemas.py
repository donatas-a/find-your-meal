from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RecipeOut(BaseModel):
    id: int
    title: str
    title_lt: str
    description_lt: str
    ingredients: List[str]
    ingredients_lt: List[str]
    steps: List[str]
    steps_lt: List[str]
    photo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportUrlRequest(BaseModel):
    url: str


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str
