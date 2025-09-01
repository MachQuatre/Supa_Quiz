FROM python:3.11-slim

WORKDIR /app

# Dépendances système minimalistes (certs, build base)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates gcc \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code
COPY . .

# Expose port Flask
EXPOSE 5001

# Par défaut, on lance le microservice
CMD ["python", "app.py"]
