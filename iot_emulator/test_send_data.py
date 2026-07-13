import serial
import json
import time
import requests

# Настройки COM-порта
SERIAL_PORT = 'COM5'  # Ваш порт (парный с симулятором)
BAUDRATE = 9600
TIMEOUT = 1

# Настройки сервера
SERVER_URL = 'https://webhook.site/8ed4244f-0e2b-4a15-8571-e3a496851c6a'
INTERVAL = 5  # Интервал отправки в секундах

def read_modbus_data(ser):
    """
    Читает 4 регистра из Modbus-симулятора.
    Возвращает список из 4 значений или None при ошибке.
    """
    try:
        # Запрос: SlaveID=1, Function=3, Start Address=0, Quantity=4
        request = bytes([0x01, 0x03, 0x00, 0x00, 0x00, 0x04, 0x44, 0x09])
        ser.write(request)
        time.sleep(0.1)
        
        # Читаем ответ (13 байт)
        response = ser.read(13)
        
        if len(response) == 13:
            raw_data = []
            for i in range(4):
                high_byte = response[3 + i * 2]
                low_byte = response[4 + i * 2]
                value = (high_byte << 8) | low_byte
                raw_data.append(value)
            return raw_data
        else:
            print(f"Предупреждение: Получено {len(response)} байт, ожидается 13")
            return None
            
    except Exception as e:
        print(f"Ошибка чтения Modbus: {e}")
        return None

def send_to_webhook(data, counter):
    """
    Отправляет данные на webhook.site
    """
    print(f"\n--- Отправка #{counter} ---")
    print(f"Отправляемый JSON:\n{json.dumps(data, ensure_ascii=False, indent=2)}")
    
    try:
        response = requests.post(
            SERVER_URL,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Статус ответа: {response.status_code}")
        print(f"Ответ сервера: {response.text[:200]}")
        
        if response.status_code == 200 or response.status_code == 204:
            print("-> Данные успешно отправлены на webhook.site!")
            return True
        else:
            print(f"-> Сервер вернул неожиданный статус: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("-> Ошибка: Не удалось подключиться к серверу.")
        return False
    except requests.exceptions.Timeout:
        print("-> Ошибка: Время ожидания ответа истекло.")
        return False
    except Exception as e:
        print(f"-> Непредвиденная ошибка при отправке: {e}")
        return False

def main():
    print("=" * 50)
    print("Отправка данных из Modbus-симулятора на Webhook.site")
    print(f"Порт: {SERIAL_PORT}")
    print(f"URL: {SERVER_URL}")
    print(f"Интервал: {INTERVAL} секунд")
    print("Нажмите Ctrl+C для остановки")
    print("=" * 50)
    
    # Подключение к COM-порту
    try:
        ser = serial.Serial(
            port=SERIAL_PORT,
            baudrate=BAUDRATE,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=TIMEOUT
        )
        print(f"Успешно подключено к {SERIAL_PORT}")
    except Exception as e:
        print(f"Ошибка подключения к порту: {e}")
        print("Убедитесь, что симулятор (mod_RSim.exe) запущен и использует COM6.")
        return
    
    counter = 0
    success_count = 0
    fail_count = 0
    
    try:
        while True:
            counter += 1
            
            # 1. Читаем данные из симулятора
            raw_data = read_modbus_data(ser)
            
            if raw_data and len(raw_data) == 4:
                # 2. Преобразуем в JSON
                json_payload = {
                    "machine_id": 39,
                    "telemetry": {
                        "temperature": raw_data[0] / 10.0,
                        "vibration": raw_data[1] / 10.0,
                        "humidity": raw_data[2] / 10.0,
                        "pressure": raw_data[3] / 10.0,
                        "energy_consumption": 2.16
                    }
                }
                
                # 3. Отправляем на webhook
                is_success = send_to_webhook(json_payload, counter)
                
                if is_success:
                    success_count += 1
                else:
                    fail_count += 1
            else:
                print("Нет данных от симулятора. Проверьте, что он активен.")
                fail_count += 1
            
            # 4. Статистика
            print(f"Статистика: успешно {success_count}, ошибок {fail_count}, всего {counter}")
            
            # 5. Пауза перед следующим циклом
            time.sleep(INTERVAL)
            
    except KeyboardInterrupt:
        print("\n" + "=" * 50)
        print("Остановка клиента пользователем.")
        print(f"Итог: успешно {success_count}, ошибок {fail_count}, всего {counter}")
        print("=" * 50)
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Соединение с портом закрыто.")

if __name__ == "__main__":
    main()