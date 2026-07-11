from abc import abstractmethod
from typing import Protocol

from domain.entities import TelemetryDM


class TelemetrySaver(Protocol):
    "Интерфейс для сохранения телеметрии в бд"

    @abstractmethod
    async def save(self, telemetry: TelemetryDM) -> None: ...


class DBSession(Protocol):
    "Интерфейс для управления транзакциями бд"

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def flush(self) -> None: ...
