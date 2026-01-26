# DriftMoney OCR Pipeline

Extracts financial data from PDF/image documents using Surya OCR + Ollama LLM.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              Docker Network                 │
   HTTPS            │                                             │
────────────────────┤►  Caddy (:80/:443)                          │
                    │      │                                      │
                    │      ├──► api.domain.com ──► API (:8000)    │
                    │      │                         │            │
                    │      └──► ollama.domain.com ──►│            │
                    │                                │            │
                    │                    ┌───────────┴──────┐     │
                    │                    ▼                  ▼     │
                    │              Surya OCR          Ollama      │
                    │               (:8001)           (:11434)    │
                    └─────────────────────────────────────────────┘
```

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env

# Generate password hash
docker run --rm -it caddy:2 caddy hash-password
# Paste output into .env as API_PASSWORD_HASH
```

### 2. Set your domains in `.env`

```
API_DOMAIN=api.yourdomain.com
OLLAMA_DOMAIN=ollama.yourdomain.com
API_USER=apiuser
API_PASSWORD_HASH=$2a$14$...
```

### 3. Point DNS to server

Create A records for both domains → your server IP

### 4. Start services

```bash
docker-compose up -d
```

### 5. Pull LLM model

```bash
docker exec -it driftmoney-ollama ollama pull llama3.1:8b
```

### 6. Test

```bash
# Health check
curl -u apiuser:yourpassword https://api.yourdomain.com/health

# Parse a document
curl -u apiuser:yourpassword \
  -X POST https://api.yourdomain.com/parse \
  -F "file=@bank_statement.pdf"
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/parse` | POST | Parse document (auto-detect type) |
| `/ocr-only` | POST | OCR without LLM parsing |

### Parse Options

```bash
curl -u user:pass -X POST https://api.yourdomain.com/parse \
  -F "file=@statement.pdf" \
  -F "document_type=credit_card" \
  -F "include_raw_text=true"
```

**Document types:** `bank_statement`, `credit_card`, `bill`, `loan`, `auto`

## Response Format

```json
{
  "success": true,
  "document_type": "bank_statement",
  "transactions": [...],
  "bills": [],
  "debts": []
}
```

## Development

```bash
# Logs
docker-compose logs -f

# Rebuild after code changes
docker-compose build api
docker-compose up -d api

# Stop
docker-compose down
```

## Customizing Prompts

Edit `api-service/prompts/*.txt`, then rebuild:

```bash
docker-compose build api && docker-compose up -d api
```

## Firewall

```bash
sudo ufw allow 80
sudo ufw allow 443
```
