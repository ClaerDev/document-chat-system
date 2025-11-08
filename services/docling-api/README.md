# Docling Document Processing Service

FastAPI microservice that wraps IBM's Docling library for advanced document processing.

## Features

- **Advanced PDF Processing**: Layout analysis, table extraction, formula recognition
- **Multi-Format Support**: PDF, DOCX, PPTX, XLSX, HTML, images
- **OCR Capabilities**: Scanned document text extraction
- **Structure Preservation**: Maintains document hierarchy and formatting
- **Multiple Export Formats**: Markdown, JSON, HTML

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py

# Service will be available at http://localhost:8001
```

### Docker Deployment

```bash
# Build the image
docker build -t docling-api .

# Run the container
docker run -p 8001:8001 docling-api

# Service will be available at http://localhost:8001
```

### Railway Deployment (Free Tier)

1. Create new project on Railway.app
2. Connect this repository
3. Set root directory to `services/docling-api`
4. Deploy (Railway auto-detects Dockerfile)

## API Endpoints

### POST /process

Process an uploaded document file.

**Request:**
```bash
curl -X POST "http://localhost:8001/process" \
  -F "file=@document.pdf" \
  -F "export_format=markdown" \
  -F "ocr_enabled=true" \
  -F "extract_tables=true"
```

**Response:**
```json
{
  "success": true,
  "content": "# Document Title\n\nDocument content in markdown...",
  "metadata": {
    "filename": "document.pdf",
    "num_pages": 5,
    "size_bytes": 102400
  },
  "sections": [...],
  "tables": [...],
  "processing_time_ms": 1234
}
```

### POST /process-url

Process a document from a URL.

**Request:**
```bash
curl -X POST "http://localhost:8001/process-url" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://arxiv.org/pdf/2408.09869", "export_format": "markdown"}'
```

### GET /health

Health check endpoint.

```bash
curl http://localhost:8001/health
```

## Environment Variables

- `PORT` - Server port (default: 8001)
- `HOST` - Server host (default: 0.0.0.0)
- `ALLOWED_ORIGINS` - CORS allowed origins (default: http://localhost:3000,http://localhost:3001)

## Integration with Next.js

See `/src/lib/file-processing/processors/docling-processor.ts` for TypeScript client implementation.

## Supported Document Formats

- **PDF** (`.pdf`) - Advanced layout understanding
- **Microsoft Office** (`.docx`, `.pptx`, `.xlsx`)
- **HTML** (`.html`, `.htm`)
- **Images** (`.png`, `.jpg`, `.tiff`) - with OCR
- **Audio** (`.wav`, `.mp3`) - transcription
- **Web Video Text Tracks** (`.vtt`)

## Performance

- Typical processing time: 1-5 seconds for standard PDFs
- Memory usage: ~500MB - 2GB depending on document complexity
- Concurrent requests: Recommended max 5 simultaneous processes

## License

MIT License - Part of Document Chat System
