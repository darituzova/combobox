import paho.mqtt.publish as publish
import json

# Это в точности наш Контракт №1
payload = {
  "machine_id": 39,
  "telemetry": {
    "temperature": 78.61,
    "vibration": 28.65,
    "humidity": 79.96,
    "pressure": 3.73,
    "energy_consumption": 2.16
  }
}

print("Отправляю данные от станка №39...")

# Отправляем пакет в наш локальный брокер Mosquitto
publish.single(
    topic="factory/telemetry",
    payload=json.dumps(payload),
    hostname="127.0.0.1",
    port=1883
)

print("Пакет успешно отправлен!")
