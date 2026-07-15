from fastapi import APIRouter, HTTPException
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

from controllers.schemas import LoginRequest, RegisterRequest, TokenResponse, ResetPasswordRequest

# Инициализируем роутер
auth_router = APIRouter(prefix="/api/v1/auth", tags=["Аутентификация"])

# Настройки безопасности
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "super_secret_enterprise_key_for_iiot" # В реальном проекте выносится в .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

def create_access_token(data: dict):
    """Генерация JWT токена"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@auth_router.post("/register", summary="1.2 Регистрация нового пользователя", status_code=201)
@inject
async def register(data: RegisterRequest, session: FromDishka[AsyncSession]):
    # 1. Проверяем совпадение паролей
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Пароли не совпадают")

    # 2. Проверяем, не занят ли email
    query_check = text("SELECT id FROM users WHERE email = :email")
    res = await session.execute(query_check, {"email": data.email})
    if res.scalar() is not None:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    # 3. Хешируем пароль и сохраняем в БД
    hashed_pwd = pwd_context.hash(data.password)

    query_insert = text("""
        INSERT INTO users (name, email, password_hash, role)
        VALUES (:name, :email, :password_hash, 'engineer')
        RETURNING id, name, email, created_at
    """)

    result = await session.execute(query_insert, {
        "name": data.name,
        "email": data.email,
        "password_hash": hashed_pwd
    })
    await session.commit()

    new_user = result.mappings().first()

    return {
        "id": new_user["id"],
        "name": new_user["name"],
        "email": new_user["email"],
        "created_at": new_user["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if new_user["created_at"] else None
    }


@auth_router.post("/login", summary="1.1 Вход в систему", response_model=TokenResponse)
@inject
async def login(data: LoginRequest, session: FromDishka[AsyncSession]):
    # 1. Ищем пользователя в БД
    query = text("SELECT id, name, email, password_hash, role FROM users WHERE email = :email")
    result = await session.execute(query, {"email": data.email})
    user = result.mappings().first()

    # 2. Проверяем существование пользователя и правильность пароля
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")

    token_data = {"sub": user["email"], "user_id": user["id"], "role": user["role"]}
    access_token = create_access_token(token_data)

    return {
        "token": access_token,
        "refresh_token": access_token, # Для MVP используем один токен
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }


@auth_router.post("/reset-password", summary="1.3 Восстановление пароля")
async def reset_password(data: ResetPasswordRequest):
    return {"message": "Ссылка для сброса пароля отправлена на ваш email"}
