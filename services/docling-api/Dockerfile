# Docling Document Processing Service - Docker Image
# Optimized for production deployment with minimal image size

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required by Docling
# - poppler-utils: PDF rendering
# - tesseract-ocr: OCR capabilities
# - libmagic1: File type detection
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY entrypoint.sh .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Expose port (Railway will override with $PORT env var)
EXPOSE 8001

# Health check (uses $PORT if set, defaults to 8001)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, requests; port=os.getenv('PORT', '8001'); requests.get(f'http://localhost:{port}/health')"

# Run the application via entrypoint script (ensures no --reload flag)
ENTRYPOINT ["/app/entrypoint.sh"]
