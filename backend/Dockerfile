FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
# libgl1 and libglib2.0-0 are required for opencv and some pdf tools
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    musl-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port
EXPOSE 8000

# Run migrations then start the application
CMD ["sh", "-c", "python migrate_deploy.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
