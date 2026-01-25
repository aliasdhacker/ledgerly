# DriftMoney OCR Pipeline

Extracts financial data from PDF/image documents and converts to DriftMoney format.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Document   │────▶│  Surya OCR   │────▶│  Ollama LLM  │────▶ DriftMoney DSL
│  (PDF/Image) │     │   :8001      │     │   :11434     │
└──────────────┘     └──────────────┘     └──────────────┘
                              │                   │
                              └───────┬───────────┘
                                      │
                              ┌───────▼───────┐
                              │  Pipeline API │
                              │     :8000     │
                              └───────────────┘
```

## Quick Start

### 1. Start the services

```bash
cd ocr-pipeline
docker-compose up -d
```

### 2. Pull the LLM model (first time only)

```bash
docker exec -it driftmoney-ollama ollama pull llama3.1:8b
```

### 3. Check health

```bash
curl http://localhost:8000/health
```

### 4. Parse a document

```bash
# Auto-detect document type
curl -X POST http://localhost:8000/parse \
  -F "file=@bank_statement.pdf"

# Specify document type
curl -X POST http://localhost:8000/parse \
  -F "file=@statement.pdf" \
  -F "document_type=credit_card"

# Include raw OCR text in response
curl -X POST http://localhost:8000/parse \
  -F "file=@bill.pdf" \
  -F "document_type=bill" \
  -F "include_raw_text=true"
```

### 5. OCR only (no LLM parsing)

```bash
curl -X POST http://localhost:8000/ocr-only \
  -F "file=@document.pdf"
```

## Supported Document Types

| Type | Endpoint Value | Output |
|------|---------------|--------|
| Bank Statement | `bank_statement` | `Transaction[]` |
| Credit Card Statement | `credit_card` | `Transaction[]` + `Debt` |
| Utility/Service Bill | `bill` | `Bill` |
| Loan Statement | `loan` | `Debt` |
| Auto-detect | `auto` | (detected) |

## Response Format

```json
{
  "success": true,
  "document_type": "bank_statement",
  "transactions": [
    {
      "id": "uuid",
      "description": "AMAZON PURCHASE",
      "amount": 52.99,
      "type": "expense",
      "date": "2024-01-15",
      "category": "Shopping"
    }
  ],
  "bills": [],
  "debts": [],
  "raw_text": null
}
```

## Configuration

Environment variables (set in docker-compose.yml):

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://ollama:11434` | Ollama API URL |
| `SURYA_URL` | `http://surya-ocr:8001` | Surya OCR API URL |
| `LLM_MODEL` | `llama3.1:8b` | Model for parsing |

## GPU Support (Future)

When moving to dedicated GPU rig:

1. Install NVIDIA Container Toolkit
2. Uncomment GPU sections in `docker-compose.yml`
3. Consider larger models: `llama3.1:70b`, `qwen2.5:72b`

## Development

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f surya-ocr
docker-compose logs -f ollama
```

### Rebuild after changes

```bash
docker-compose build
docker-compose up -d
```

### Stop services

```bash
docker-compose down
```

## Customizing Prompts

Edit files in `api-service/prompts/`:

- `bank_statement.txt` - Bank statement parsing
- `credit_card.txt` - Credit card statement parsing  
- `bill.txt` - Utility bill parsing
- `loan.txt` - Loan statement parsing

Rebuild API service after changes:

```bash
docker-compose build api
docker-compose up -d api
```
