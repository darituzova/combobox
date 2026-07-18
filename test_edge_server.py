import time
import random
import requests

# IP-адрес и порт сервера бэкендера (заменить!!!)
SERVER_URL = "http://127.0.0.1:8000/api/v1/telemetry"


def generate_valid_data():
    """Генерирует валидный пакет по Контракту №1"""
    return {
        "machine_id": random.randint(1, 50),
        "telemetry": {
            "temperature": round(random.uniform(20.0, 40.0), 2),
            "vibration": round(random.uniform(0.5, 3.5), 2),
            "humidity": round(random.uniform(40.0, 80.0), 2),
            "pressure": round(random.uniform(98.0, 105.0), 2),
            "energy_consumption": round(random.uniform(1.0, 10.0), 2)
        }
    }


def send_packet(payload, description="Валидный пакет"):
    """Отправляет данные на сервер и выводит результат"""
    print(f"\n[отправка] {description}...")
    print(f"данные: {payload}")
    try:
        response = requests.post(SERVER_URL, json=payload, timeout=5)
        print(f"[Ответ сервера] Код: {response.status_code}")
        print(f"Тело ответа: {response.text}")
        return response.status_code
    except requests.exceptions.RequestException as e:
        print(f"[Ошибка]: {e}")
        return None


def run_stress_test(cycles=5, delay=2):
    """Режим имитации нормальной работы датчика"""
    print(f"Старт эмуляции датчика ({cycles} пакетов с интервалом {delay}с) ")
    for i in range(cycles):
        print(f"\nИтерация {i + 1}/{cycles}")
        data = generate_valid_data()
        send_packet(data, "Нормальная телеметрия")
        time.sleep(delay)


def run_validation_tests():
    """Тесты на прочность (Валидация контракта сервером)"""
    print("\n Проверка защищенности сервера (Тесты валидации) ")

    # ТЕСТ 1: Неверный machine_id
    bad_id_data = generate_valid_data()
    bad_id_data["machine_id"] = 99
    send_packet(bad_id_data, "Тест 1: machine_id вне диапазона (должен быть 400/422 Bad Request)")

    # ТЕСТ 2: Передача строки вместо float
    bad_type_data = generate_valid_data()
    bad_type_data["telemetry"]["temperature"] = "Двадцать пять"
    send_packet(bad_type_data, "Тест 2: Строка вместо дробного числа (должен быть 400/422)")

    # ТЕСТ 3: Попытка заслать timestamp (Проверка твоего архитектурного правила!)
    bad_timestamp_data = generate_valid_data()
    bad_timestamp_data["timestamp"] = "2026-07-15T12:00:00Z"
    send_packet(bad_timestamp_data,
                "Тест 3: Датчик шлет timestamp (Сервер должен либо проигнорировать, либо выдать ошибку)")


if __name__ == "__main__":
    # URL!
    print("Выберите режим тестирования:")
    print("1 - Запустить нормальную отправку данных (цикл)")
    print("2 - Запустить проверку валидации (тесты на ошибки)")

    choice = input("Введите номер режима (1 или 2): ")
    if choice == "1":
        run_stress_test(cycles=5, delay=2)
    elif choice == "2":
        run_validation_tests()
    else:
        print("Неверный выбор.")