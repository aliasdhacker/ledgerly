# DriftMoney OCR Pipeline - Development Session

## Session Overview
Setting up a local OCR pipeline to extract financial data from PDF documents and convert to DriftMoney's DSL format.

---

## Prompt 1: Initial Request

**User:**
> Setting up local LLM for OCR of financial statements and translation to domain-specific language (DSL).

**Response:**
Recommended stack:
- **OCR**: Surya or DocTR (purpose-built for documents, superior to LLM vision)
- **LLM**: Ollama + Llama 3.1 8B or Mistral 7B (easy local setup)
- **Orchestration**: Python or LangChain
- **Rationale**: LLM vision models slow/expensive for OCR; dedicated OCR tools better

Two-phase deployment:
1. Phase 1: Docker containers (CPU-based, immediate deployment)
2. Phase 2: Migrate to dedicated GPU rig later

---

## Prompt 2: Architecture Design

**Architecture:**
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

**Services:**
| Service | Port | Purpose |
|---------|------|---------|
| `surya-ocr` | 8001 | OCR extraction |
| `ollama` | 11434 | LLM inference |
| `driftmoney-ocr-api` | 8000 | Orchestration + DSL output |

---

## Prompt 3: DSL Definition Request

**User:**
> this is for the drift money project, scan the code for DSL DUH

**Response:**
Scanned `/Users/carra/Projects/Driftmoney/src/types/index.ts` and `/Users/carra/Projects/Driftmoney/src/services/DatabaseService.ts`

**Target DSL (from codebase):**
```typescript
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'bill_paid' | 'expense' | 'credit';
  date: string;        // YYYY-MM-DD
  category?: string;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;      // 1-31
  isPaid: boolean;
  billMonth: string;   // YYYY-MM
}

interface Debt {
  id: string;
  company: string;
  balance: number;
  lastUpdated: string; // YYYY-MM-DD
  notes?: string;
  isRecurring?: boolean;
  paymentDueDay?: number;
  paymentFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  minimumPayment?: number;
}
```

**Supported Document Types:**
| Document | Output Type |
|----------|-------------|
| Bank statement | `Transaction[]` |
| Credit card statement | `Transaction[]` + `Debt` |
| Utility bill | `Bill` |
| Loan statement | `Debt` |

---

## Prompt 4: Generate Code

**User:**
> Lets get goin

**Files Created:**

### Project Structure
```
ocr-pipeline/
├── docker-compose.yml
├── README.md
├── uploads/
├── surya-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
└── api-service/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py
    └── prompts/
        ├── bank_statement.txt
        ├── credit_card.txt
        ├── bill.txt
        └── loan.txt
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: driftmoney-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

  surya-ocr:
    build:
      context: ./surya-service
      dockerfile: Dockerfile
    container_name: driftmoney-surya
    ports:
      - "8001:8001"
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  api:
    build:
      context: ./api-service
      dockerfile: Dockerfile
    container_name: driftmoney-ocr-api
    ports:
      - "8000:8000"
    volumes:
      - ./uploads:/app/uploads
    environment:
      - OLLAMA_URL=http://ollama:11434
      - SURYA_URL=http://surya-ocr:8001
      - LLM_MODEL=llama3.1:8b
    depends_on:
      - ollama
      - surya-ocr
    restart: unless-stopped

volumes:
  ollama_data:
```

---

## Prompt 5: Build Error - Package Not Found

**Error:**
```
E: Package 'libgl1-mesa-glx' has no installation candidate
```

**Fix:**
Changed Dockerfile from:
```dockerfile
RUN apt-get install -y libgl1-mesa-glx libxrender-dev
```
To:
```dockerfile
RUN apt-get install -y libgl1 libxrender1
```

---

## Prompt 6: Surya Module Import Error

**Error:**
```
ModuleNotFoundError: No module named 'surya.model.detection.model'
```

**Diagnosis:** Surya OCR API changed in recent versions.

**Fix:** Switched from Surya to DocTR (more stable API):

### requirements.txt
```
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.6
python-doctr[torch]==0.9.0
pdf2image==1.16.3
Pillow==10.2.0
```

### main.py (DocTR version)
```python
from doctr.io import DocumentFile
from doctr.models import ocr_predictor

model = None

def get_model():
    global model
    if model is None:
        model = ocr_predictor(det_arch='db_resnet50', reco_arch='crnn_vgg16_bn', pretrained=True)
    return model

def extract_text_from_result(result) -> str:
    text_lines = []
    for page in result.pages:
        for block in page.blocks:
            for line in block.lines:
                line_text = " ".join([word.value for word in line.words])
                text_lines.append(line_text)
    return "\n".join(text_lines)
```

---

## Usage Commands

### Start Services
```bash
cd ocr-pipeline
docker-compose up -d
```

### Pull LLM Model (first time)
```bash
docker exec -it driftmoney-ollama ollama pull llama3.1:8b
```

### Check Health
```bash
curl http://localhost:8000/health
```

### Parse Document
```bash
curl -X POST http://localhost:8000/parse -F "file=@statement.pdf"
```

### View Logs
```bash
docker-compose logs -f surya-ocr
```

### Rebuild After Changes
```bash
docker-compose down
docker-compose build --no-cache surya-ocr
docker-compose up -d
```

---

## LLM Prompts Created

### bank_statement.txt
Extracts transactions with: description, amount, type (income/expense/credit), date, category

### credit_card.txt
Extracts transactions + debt info: company, balance, minimumPayment, paymentDueDay

### bill.txt
Extracts bill info: name, amount, dueDay, billMonth

### loan.txt
Extracts debt info: company, balance, minimumPayment, paymentDueDay, paymentFrequency

---

## Session 2: GPU Server Setup & Testing

### Problem: Docker OOM on Mac
Ollama kept getting killed due to Docker Desktop memory limits.

### Solution: Remote GPU Server
Set up dedicated Ubuntu 22.04 server with NVIDIA RTX 3080.

**Server Details:**
- OS: Ubuntu 22.04 LTS Server
- GPU: NVIDIA RTX 3080 (10GB VRAM)
- Driver: nvidia-driver-590-open
- IP: 192.168.98.108
- Ollama: http://192.168.98.108:11434

### Updated Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                         Mac (Local)                          │
│  ┌──────────────┐     ┌──────────────┐                      │
│  │   Document   │────▶│  DocTR OCR   │──────┐               │
│  │  (PDF/Image) │     │   :8001      │      │               │
│  └──────────────┘     └──────────────┘      │               │
│                                              ▼               │
│                              ┌───────────────────┐           │
│                              │  Pipeline API     │           │
│                              │     :8000         │           │
│                              └─────────┬─────────┘           │
└────────────────────────────────────────┼─────────────────────┘
                                         │ HTTP
                                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    GPU Server (192.168.98.108)                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Ollama + llama3.1:8b                                    │ │
│  │  :11434                                                  │ │
│  │  RTX 3080 GPU (~50-80 tokens/sec)                       │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Configuration Files

**.env** (Mac - ocr-pipeline/)
```
OLLAMA_URL=http://192.168.98.108:11434
LLM_MODEL=llama3.1:8b
```

**docker-compose.yml** - Updated to use remote Ollama (local Ollama commented out)

### Test Results
Successfully parsed bank statement in ~10 seconds (vs 10+ min on CPU):
- 19 transactions extracted
- Proper categorization (Food, Transfer, Shopping, etc.)
- Income/expense detection working

### Scripts Created
- `scripts/create-ubuntu-usb.sh` - Create bootable Ubuntu USB
- `scripts/setup-ollama-server.sh` - Configure GPU server with Ollama

---

## Current Status (2026-01-24)

**Working:**
- ✅ DocTR OCR (local Docker)
- ✅ Ollama LLM (remote GPU server)
- ✅ Pipeline API (local Docker)
- ✅ Bank statement parsing

**Pending:**
- ⏳ Fine-tune prompts (some transactions truncated)
- ⏳ Integrate with DriftMoney app

---

## Next Steps
1. ~~Rebuild surya-ocr with DocTR~~ ✅
2. ~~Test with sample bank statement~~ ✅
3. Fine-tune prompts based on actual OCR output
4. Add integration endpoint for DriftMoney app
