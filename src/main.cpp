#include <Arduino.h>
#include <ModbusMaster.h>   // Подключаем библиотеку ModbusMaster
#include <ArduinoJson.h>

#define SLAVE_ID 1          // ID вашего Modbus-устройства

// Создаем объект для работы с Modbus
ModbusMaster node;

void setup() {
  Serial.begin(9600);
  
  // Инициализируем Modbus на Serial2 (пины 16 = RX, 17 = TX)
  Serial2.begin(9600, SERIAL_8N1, 16, 17);
  
  // Передаем объекту node номер ведомого (Slave ID) и поток (Serial2)
  node.begin(SLAVE_ID, Serial2);
  
  // Если у вас RS485, раскомментируйте строку ниже и укажите пин управления
  // node.preTransmission(RS485PreTransmit); 
  // node.postTransmission(RS485PostTransmit);
  
  Serial.println("ESP32 Modbus Master готов к работе!");
}

void loop() {
  uint8_t result;
  uint16_t raw_data[4] = {0};

  // Пытаемся прочитать 4 Holding Register, начиная с адреса 1
  result = node.readHoldingRegisters(1, 4);

  // Если чтение прошло успешно
  if (result == node.ku8MBSuccess) {
    // Забираем полученные данные из буфера ответа
    for (int i = 0; i < 4; i++) {
      raw_data[i] = node.getResponseBuffer(i);
    }

    // Преобразуем данные (предполагаем, что они приходят с одним знаком после запятой)
    float temp = raw_data[0] / 10.0;
    float vib = raw_data[1] / 10.0;
    float hum = raw_data[2] / 10.0;
    float press = raw_data[3] / 10.0;

    // Формируем JSON
    JsonDocument doc;
    doc["machine_id"] = 39;
    doc["telemetry"]["temperature"] = temp;
    doc["telemetry"]["vibration"] = vib;
    doc["telemetry"]["humidity"] = hum;
    doc["telemetry"]["pressure"] = press;
    doc["telemetry"]["energy_consumption"] = 2.16;

    Serial.print("JSON для Бэкенда: ");
    serializeJson(doc, Serial);
    Serial.println();
    
  } else {
    // Если произошла ошибка, выводим её код
    Serial.print("Ошибка чтения Modbus. Код ошибки: 0x");
    Serial.println(result, HEX);
  }

  delay(2000); // Пауза 2 секунды
}

// Если вы используете RS485, раскомментируйте эти функции и укажите свой пин
// void RS485PreTransmit() {
//   digitalWrite(RS485_PIN, HIGH); // Включаем передачу
// }
// void RS485PostTransmit() {
//   digitalWrite(RS485_PIN, LOW); // Выключаем передачу
// }