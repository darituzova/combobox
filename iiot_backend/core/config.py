from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    user: str
    password: str
    host: str
    port: int
    name: str

    model_config = SettingsConfigDict(env_prefix="DB_", env_file=".env", extra="ignore")

    @property
    def url(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


class MQTTSettings(BaseSettings):
    host: str
    port: int

    model_config = SettingsConfigDict(
        env_prefix="MQTT_", env_file=".env", extra="ignore"
    )


class AppConfig(BaseSettings):
    db: DatabaseSettings = DatabaseSettings()
    mqtt: MQTTSettings = MQTTSettings()


config = AppConfig()
