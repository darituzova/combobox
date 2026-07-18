import random
from locust import HttpUser, task, between


class IoTDeviceUser(HttpUser):
    # Имитируем задержку между отправкой пакетов от одного датчика.
    # По плану датчик шлет данные регулярно, сделаем паузу от 1 до 3 секунд.
    wait_time = between(1, 3)

    @task
    def send_telemetry_packet(self):
        """Имитация отправки пакета телеметрии от ESP32 по Контракту №1"""

        # Генерируем валидную структуру по контракту
        payload = {
            "machine_id": random.randint(1, 50),  # Ограничение контракта: 1-50
            "telemetry": {
                "temperature": round(random.uniform(20.0, 40.0), 2),
                "vibration": round(random.uniform(0.5, 3.5), 2),
                "humidity": round(random.uniform(40.0, 80.0), 2),
                "pressure": round(random.uniform(98.0, 105.0), 2),
                "energy_consumption": round(random.uniform(1.0, 10.0), 2)
            }
        }

        headers = {'Content-Type': 'application/json'}

        # POST-запрос на endpoint бэкенда
        self.client.post("/api/v1/telemetry", json=payload, headers=headers)