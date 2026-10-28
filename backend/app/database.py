import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("caselink.database")

db_url = settings.DATABASE_URL
db_type = "sqlite"

if db_url.startswith("postgresql") or db_url.startswith("postgres"):
    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        # Test connection
        with engine.connect() as conn:
            pass
        db_type = "postgres"
        logger.info("Connected successfully to PostgreSQL database.")
    except Exception as e:
        logger.warning(f"PostgreSQL unreachable ({e}). Falling back automatically to local SQLite database.")
        db_url = "sqlite:///./caselink.db"
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
        db_type = "sqlite"
else:
    engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
    db_type = "sqlite" if "sqlite" in db_url else "other"

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_type():
    return db_type
