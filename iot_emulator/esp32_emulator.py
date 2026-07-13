import serial
import json
import time
# import requests

# Настройка порта (симулятор на COM6)
SERIAL_PORT = 'COM5'
BAUDRATE = 9600
TIMEOUT = 1
    
def read_modbus_data(ser):
    """
    Отправляет Modbus-запрос на чтение 4 регистров (начиная с адреса 1)
    и возвращает список из 4 значений.
    """
    try:
        # Запрос: SlaveID=1, Function=3, Start Address=0, Quantity=4
        request = bytes([0x01, 0x03, 0x00, 0x00, 0x00, 0x04, 0x44, 0x09])
        ser.write(request)
        time.sleep(0.1)

        # Ответ должен содержать 13 байт
        response = ser.read(13)

        if len(response) == 13:
            raw_data = []
            # Извлекаем 4 регистра (каждый по 2 байта, начиная с 3-го байта ответа)
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
        print(f"Ошибка чтения из порта: {e}")
        return None

def main():
    print("Эмулятор ESP32 для чтения Modbus RTU")
    print(f"Попытка подключения к порту {SERIAL_PORT}...")

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

    print("Нажмите Ctrl+C для остановки.")
    print("---")

    try:
        while True:
            data = read_modbus_data(ser)

            if data and len(data) == 4:
                # Преобразование данных (деление на 10)
                temperature = data[0] / 10.0
                vibration = data[1] / 10.0
                humidity = data[2] / 10.0
                pressure = data[3] / 10.0

                # Формирование JSON согласно контракту
                json_payload = {
                    "machine_id": 39,
                    "telemetry": {
                        "temperature": temperature,
                        "vibration": vibration,
                        "humidity": humidity,
                        "pressure": pressure,
                        "energy_consumption": 2.16
                    }
                }

                json_string = json.dumps(json_payload, ensure_ascii=False)
                print(f"JSON: {json_string}")
                print(f"  Температура: {temperature:.2f} C, Вибрация: {vibration:.2f} %, Влажность: {humidity:.2f} %, Давление: {pressure:.2f} бар")
            else:
                print("Нет данных от симулятора. Проверьте, что он активен.")

            time.sleep(5)

    except KeyboardInterrupt:
        print("Остановка эмулятора пользователем.")
    except Exception as e:
        print(f"Непредвиденная ошибка в основном цикле: {e}")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Соединение с портом закрыто.")

if __name__ == "__main__":
    main()