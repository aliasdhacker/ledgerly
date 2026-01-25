# DriftMoney Project Status - January 25, 2026

## Current State: STABLE ✓

The application is in a good working state before OCR pipeline refactoring.

---

## Completed Components

### 1. DriftMoney App (React Native/Expo)
- **Location**: `/Users/carra/Projects/Driftmoney`
- **Status**: Fully functional
- **Features**:
  - Bills tracking with monthly rollover
  - Transaction ledger (income/expense/credit)
  - Debt tracking with recurring payments
  - Running balance calculation
  - Cloud sync ready (Supabase)
  - Local SQLite storage

### 2. App Icon & Branding
- **Location**: `/Users/carra/Projects/Driftmoney/assets/images/`
- **Files**: icon.png, adaptive-icon.png, splash.png, favicon.png
- **Design**: Minimal wave concept (option 6A)

### 3. OCR Pipeline (In Progress)
- **Location**: `/Users/carra/Projects/Driftmoney/ocr-pipeline/`
- **Status**: Infrastructure built, debugging Docker/DocTR setup
- **Architecture**:
  ```
  Document → DocTR OCR (:8001) → Ollama LLM (:11434) → DriftMoney DSL
                                        ↓
                              Pipeline API (:8000)
  ```

---

## Key Files

### Types/DSL
```
src/types/index.ts          # Transaction, Bill, Debt, DebtTransaction interfaces
src/services/DatabaseService.ts  # SQLite operations
```

### OCR Pipeline
```
ocr-pipeline/
├── docker-compose.yml      # 3 services: ollama, surya-ocr, api
├── surya-service/
│   ├── Dockerfile
│   ├── requirements.txt    # DocTR-based (switched from Surya)
│   └── main.py
├── api-service/
│   ├── main.py             # Orchestration
│   └── prompts/            # LLM prompts for each doc type
└── README.md
```

---

## Infrastructure

### Local Development (Mac Studio)
- Docker running OCR containers
- Expo dev server for app

### Ubuntu Server
- Ollama running natively (not Docker)
- Monitor: `ollama ps`, `journalctl -u ollama -f`

---

## Known Issues at Pause Point

1. **DocTR container** - Needs rebuild after switching from Surya
   ```bash
   cd ocr-pipeline
   docker-compose down
   docker-compose build --no-cache surya-ocr
   docker-compose up -d
   ```

2. **Ollama model** - May need to pull if not present
   ```bash
   ollama pull llama3.1:8b
   ```

---

## Resume Commands

### Start OCR Pipeline
```bash
cd /Users/carra/Projects/Driftmoney/ocr-pipeline
docker-compose up -d
curl http://localhost:8000/health
```

### Test OCR
```bash
curl -X POST http://localhost:8000/parse -F "file=@test-data/EStatement-2026-01-14-55875.pdf"
```

### Start App
```bash
cd /Users/carra/Projects/Driftmoney
npx expo start
```

---

## Git Recommendation

Before refactoring:
```bash
git add -A
git commit -m "Stable checkpoint: App complete, OCR pipeline infrastructure ready"
git tag v0.1.0-stable
git push origin main --tags
```

---

## Session History
Full development session documented in: `OCR_PIPELINE_SESSION.md`
