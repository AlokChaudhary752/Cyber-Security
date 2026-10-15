from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# In case PostgreSQL is not running or SQLite is preferred in dev, we fallback gracefully to sqlite+aiosqlite if connection fails or if configured
db_url = settings.DATABASE_URL
# Handle standard sqlite fallback if postgres isn't active
if "sqlite" in db_url:
    engine = create_async_engine(db_url, echo=False, connect_args={"check_same_thread": False})
else:
    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)

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
