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
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    serving_weight_g: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NutritionEstimateRequest(BaseModel):
    ingredients: List[str]
    servings: Optional[int] = 1


class NutritionEstimate(BaseModel):
    calories: int
    protein_g: float
    serving_weight_g: int


class ImportUrlRequest(BaseModel):
    url: str

class ImportTextRequest(BaseModel):
    text: str


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str
