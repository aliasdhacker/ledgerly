"""
DriftMoney OCR Pipeline API
Orchestrates OCR extraction and LLM parsing to DriftMoney DSL
"""

import os
import json
import uuid
import re
from enum import Enum
from typing import Optional
from datetime import datetime
from pathlib import Path

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="DriftMoney OCR Pipeline API",
    version="1.0.0",
    description="Extract financial data from documents and convert to DriftMoney format"
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
SURYA_URL = os.getenv("SURYA_URL", "http://localhost:8001")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.1:8b")
PROMPTS_DIR = Path(__file__).parent / "prompts"


class DocumentType(str, Enum):
    BANK_STATEMENT = "bank_statement"
    CREDIT_CARD = "credit_card"
    BILL = "bill"
    LOAN = "loan"
    AUTO = "auto"  # Auto-detect


class Transaction(BaseModel):
    id: str
    description: str
    amount: float
    type: str  # income, expense, credit, bill_paid
    date: str
    category: Optional[str] = None


class Bill(BaseModel):
    id: str
    name: str
    amount: float
    dueDay: int
    isPaid: bool = False
    billMonth: str
    syncStatus: str = "dirty"


class Debt(BaseModel):
    id: str
    company: str
    balance: float
    lastUpdated: str
    notes: Optional[str] = None
    syncStatus: str = "dirty"
    isRecurring: bool = True
    paymentDueDay: Optional[int] = None
    paymentFrequency: Optional[str] = "monthly"
    minimumPayment: Optional[float] = None


class ParseResult(BaseModel):
    success: bool
    document_type: str
    transactions: list[Transaction] = []
    bills: list[Bill] = []
    debts: list[Debt] = []
    raw_text: Optional[str] = None
    error: Optional[str] = None


def load_prompt(doc_type: DocumentType) -> str:
    """Load prompt template for document type"""
    prompt_file = PROMPTS_DIR / f"{doc_type.value}.txt"
    if prompt_file.exists():
        return prompt_file.read_text()
    raise ValueError(f"No prompt template for document type: {doc_type}")


def generate_uuid() -> str:
    """Generate UUID matching DriftMoney format"""
    return str(uuid.uuid4())


def get_current_month() -> str:
    """Get current month in YYYY-MM format"""
    return datetime.now().strftime("%Y-%m")


async def call_surya_ocr(file_content: bytes, filename: str) -> str:
    """Call Surya OCR service to extract text"""
    async with httpx.AsyncClient(timeout=120.0) as client:
        files = {"file": (filename, file_content)}
        response = await client.post(f"{SURYA_URL}/ocr", files=files)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"OCR service error: {response.text}"
            )
        
        result = response.json()
        return result.get("text", "")


async def call_ollama(prompt: str) -> str:
    """Call Ollama LLM for parsing using streaming to avoid timeout"""
    async with httpx.AsyncClient(timeout=httpx.Timeout(600.0, connect=30.0)) as client:
        payload = {
            "model": LLM_MODEL,
            "prompt": prompt,
            "stream": True,  # Use streaming to keep connection alive
            "options": {
                "temperature": 0.1,  # Low temp for consistent parsing
                "num_predict": 4096,
            }
        }

        full_response = ""
        async with client.stream(
            "POST",
            f"{OLLAMA_URL}/api/generate",
            json=payload
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                raise HTTPException(
                    status_code=502,
                    detail=f"LLM service error: {error_text.decode()}"
                )

            async for line in response.aiter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        full_response += chunk.get("response", "")
                        if chunk.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue

        return full_response


def extract_json_from_response(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks"""
    # Try to find JSON in code blocks
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if json_match:
        text = json_match.group(1)
    
    # Try to parse as JSON
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # Try to find JSON object/array in text
        for pattern in [r"\{[\s\S]*\}", r"\[[\s\S]*\]"]:
            match = re.search(pattern, text)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    continue
        
        raise ValueError(f"Could not extract valid JSON from response")


def truncate_text_for_context(text: str, max_chars: int = 10000) -> str:
    """
    Truncate text to fit within LLM context window.
    Preserves beginning (header info) and prioritizes transaction data.
    """
    if len(text) <= max_chars:
        return text

    # For bank statements, try to keep header and recent transactions
    lines = text.split('\n')
    result_lines = []
    char_count = 0

    for line in lines:
        if char_count + len(line) + 1 > max_chars:
            result_lines.append("\n[... document truncated for context limit ...]")
            break
        result_lines.append(line)
        char_count += len(line) + 1

    return '\n'.join(result_lines)


def detect_document_type(text: str) -> DocumentType:
    """Auto-detect document type from OCR text"""
    text_lower = text.lower()
    
    # Credit card indicators
    if any(term in text_lower for term in [
        "credit card", "card ending", "minimum payment due",
        "credit limit", "available credit", "apr"
    ]):
        return DocumentType.CREDIT_CARD
    
    # Loan indicators
    if any(term in text_lower for term in [
        "loan", "principal balance", "payoff amount",
        "mortgage", "interest rate", "escrow"
    ]):
        return DocumentType.LOAN
    
    # Bill indicators (utility, service)
    if any(term in text_lower for term in [
        "electric", "gas bill", "water bill", "internet",
        "phone bill", "service period", "meter reading",
        "usage", "kwh"
    ]):
        return DocumentType.BILL
    
    # Default to bank statement
    return DocumentType.BANK_STATEMENT


def convert_to_driftmoney_format(
    parsed_data: dict,
    doc_type: DocumentType
) -> ParseResult:
    """Convert parsed LLM output to DriftMoney DSL"""
    result = ParseResult(
        success=True,
        document_type=doc_type.value,
        transactions=[],
        bills=[],
        debts=[]
    )
    
    try:
        if doc_type == DocumentType.BANK_STATEMENT:
            # Convert transactions
            for tx in parsed_data.get("transactions", []):
                result.transactions.append(Transaction(
                    id=generate_uuid(),
                    description=tx.get("description", "Unknown"),
                    amount=float(tx.get("amount", 0)),
                    type=tx.get("type", "expense"),
                    date=tx.get("date", datetime.now().strftime("%Y-%m-%d")),
                    category=tx.get("category")
                ))
        
        elif doc_type == DocumentType.CREDIT_CARD:
            # Convert transactions
            for tx in parsed_data.get("transactions", []):
                result.transactions.append(Transaction(
                    id=generate_uuid(),
                    description=tx.get("description", "Unknown"),
                    amount=float(tx.get("amount", 0)),
                    type=tx.get("type", "expense"),
                    date=tx.get("date", datetime.now().strftime("%Y-%m-%d")),
                    category=tx.get("category")
                ))
            
            # Convert debt info
            debt_info = parsed_data.get("debt", {})
            if debt_info:
                result.debts.append(Debt(
                    id=generate_uuid(),
                    company=debt_info.get("company", "Credit Card"),
                    balance=float(debt_info.get("balance", 0)),
                    lastUpdated=datetime.now().strftime("%Y-%m-%d"),
                    isRecurring=True,
                    paymentDueDay=debt_info.get("paymentDueDay"),
                    paymentFrequency="monthly",
                    minimumPayment=debt_info.get("minimumPayment")
                ))
        
        elif doc_type == DocumentType.BILL:
            bill_info = parsed_data.get("bill", {})
            if bill_info:
                result.bills.append(Bill(
                    id=generate_uuid(),
                    name=bill_info.get("name", "Bill"),
                    amount=float(bill_info.get("amount", 0)),
                    dueDay=int(bill_info.get("dueDay", 1)),
                    isPaid=False,
                    billMonth=bill_info.get("billMonth", get_current_month())
                ))
        
        elif doc_type == DocumentType.LOAN:
            debt_info = parsed_data.get("debt", {})
            if debt_info:
                result.debts.append(Debt(
                    id=generate_uuid(),
                    company=debt_info.get("company", "Loan"),
                    balance=float(debt_info.get("balance", 0)),
                    lastUpdated=datetime.now().strftime("%Y-%m-%d"),
                    isRecurring=True,
                    paymentDueDay=debt_info.get("paymentDueDay"),
                    paymentFrequency=debt_info.get("paymentFrequency", "monthly"),
                    minimumPayment=debt_info.get("minimumPayment")
                ))
        
    except Exception as e:
        result.success = False
        result.error = f"Conversion error: {str(e)}"
    
    return result


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check dependent services
    services = {"api": "healthy"}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{SURYA_URL}/health")
            services["surya"] = "healthy" if r.status_code == 200 else "unhealthy"
    except:
        services["surya"] = "unreachable"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            services["ollama"] = "healthy" if r.status_code == 200 else "unhealthy"
    except:
        services["ollama"] = "unreachable"
    
    return services


@app.get("/models")
async def list_models():
    """List available LLM models"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Cannot reach Ollama: {str(e)}")


@app.post("/parse", response_model=ParseResult)
async def parse_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(default=DocumentType.AUTO),
    include_raw_text: bool = Form(default=False)
):
    """
    Parse a financial document and convert to DriftMoney format
    
    - **file**: PDF or image of financial document
    - **document_type**: Type of document (auto-detect if not specified)
    - **include_raw_text**: Include OCR text in response
    """
    # Read file
    content = await file.read()
    
    # Step 1: OCR extraction
    try:
        ocr_text = await call_surya_ocr(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR failed: {str(e)}")
    
    if not ocr_text.strip():
        raise HTTPException(status_code=400, detail="No text extracted from document")
    
    # Step 2: Detect document type if auto
    if document_type == DocumentType.AUTO:
        document_type = detect_document_type(ocr_text)
    
    # Step 3: Load prompt and call LLM
    try:
        prompt_template = load_prompt(document_type)
        # Truncate long documents to fit context window (prompt ~1000 chars, leave room for output)
        truncated_text = truncate_text_for_context(ocr_text, max_chars=10000)
        full_prompt = f"{prompt_template}\n\n{truncated_text}"

        print(f"[DEBUG] OCR text: {len(ocr_text)} chars, truncated to: {len(truncated_text)} chars")
        print(f"[DEBUG] Calling Ollama with {len(full_prompt)} chars...")
        llm_response = await call_ollama(full_prompt)
        print(f"[DEBUG] Got LLM response: {len(llm_response)} chars")
        print(f"[DEBUG] Response preview: {llm_response[:500]}")

        parsed_data = extract_json_from_response(llm_response)
        print(f"[DEBUG] Parsed JSON keys: {list(parsed_data.keys()) if isinstance(parsed_data, dict) else 'array'}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM parsing failed: {str(e)}")
    
    # Step 4: Convert to DriftMoney format
    result = convert_to_driftmoney_format(parsed_data, document_type)
    
    if include_raw_text:
        result.raw_text = ocr_text
    
    return result


@app.post("/ocr-only")
async def ocr_only(file: UploadFile = File(...)):
    """
    Extract text only (no LLM parsing)
    Useful for debugging or manual review
    """
    content = await file.read()
    
    try:
        ocr_text = await call_surya_ocr(content, file.filename)
        detected_type = detect_document_type(ocr_text)
        
        return {
            "success": True,
            "filename": file.filename,
            "detected_type": detected_type.value,
            "text": ocr_text,
            "char_count": len(ocr_text),
            "line_count": len(ocr_text.split("\n"))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
