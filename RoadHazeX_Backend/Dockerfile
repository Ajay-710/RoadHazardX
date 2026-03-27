# Step 9: Docker Update
FROM python:3.9-slim

# Install system dependencies for CLIP and OpenCV
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model and labels
COPY roadhazex_model_v2.joblib .
COPY label_map_v2.joblib .

# Copy application code
COPY app.py .

# Expose the default Hugging Face port
EXPOSE 7860

# Run the application
CMD ["python", "app.py"]
