
from pathlib import Path

from pydantic import SecretStr, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 5432
    DB_NAME: str = "serviceflow"
    DB_USER: str = "serviceflow"
    DB_PASSWORD: str
    # Set to "require" for hosted PostgreSQL that mandates TLS (e.g. Neon).
    # Empty keeps the local default (no SSL) for the Docker development stack.
    DB_SSLMODE: str = ""
    GMAIL_SMTP_USER: str
    GMAIL_SMTP_APP_PASSWORD: SecretStr
    FRONTEND_VERIFY_EMAIL_URL: str
    FRONTEND_RESET_PASSWORD_URL: str

    JWT_SECRET_KEY: str = "change-this-in-your-env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Comma-separated list of frontend origins allowed by CORS.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Cloudflare R2 (S3-compatible) storage for policy PDFs. When all four
    # values are set, policy files are stored in the bucket instead of the
    # local storage/policies directory. Empty = local disk (development).
    R2_ENDPOINT_URL: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @computed_field
    @property
    def DATABASE_URL(self) -> URL:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
            query={"sslmode": self.DB_SSLMODE} if self.DB_SSLMODE else {},
        )


settings = Settings()
