from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter

# Заглушка
class ProcessAlertInteractorStub:
    async def __call__(self, dto: any) -> None:
        print(f"ПОЛУЧЕН АЛАРМ: {dto}")

from controllers.schemas import IncomingAlertSchema
from application.dto import AlertDTO

http_router = APIRouter()

@http_router.post("/api/v1/alerts")
@inject
async def receive_alert(
    data: IncomingAlertSchema,
    interactor: FromDishka[ProcessAlertInteractorStub]
):
    dto = AlertDTO(**data.model_dump())

    await interactor(dto)

    return {"status": "alert_received"}
