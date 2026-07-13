FROM python:3.11-slim-bookworm

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --default-timeout=1000 --retries=10 --no-cache-dir -r requirements.txt

COPY . .

CMD sh -c "python init_db.py && uvicorn main:app --host 0.0.0.0 --port 8000"
