from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MyAreaReport API"
    app_env: str = "development"
    app_version: str = "0.1.0"
    log_level: str = "INFO"

    redis_url: str = "redis://localhost:6379/0"

    sentry_dsn: str | None = None
    sentry_environment: str = "development"
    sentry_release: str = "myareareport-api@0.1.0"
    sentry_traces_sample_rate: float = 0.0
    sentry_profiles_sample_rate: float = 0.0
    sentry_enable_logs: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
