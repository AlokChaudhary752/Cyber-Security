from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Default to portable async sqlite or specified database
db_url = settings.DATABASE_URL
try:
    if "sqlite" in db_url:
        engine = create_async_engine(db_url, echo=False, connect_args={"check_same_thread": False})
    else:
        engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
except Exception:
    # Graceful fallback to sqlite if asyncpg driver is missing
    db_url = "sqlite+aiosqlite:///./threatlens.db"
    engine = create_async_engine(db_url, echo=False, connect_args={"check_same_thread": False})

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db():
    """Async database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
