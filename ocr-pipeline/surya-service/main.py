"""
DocTR OCR Microservice for DriftMoney
Extracts text from PDF and image files
"""

import os
import uuid
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from doctr.io import DocumentFile
from doctr.models import ocr_predictor

app = FastAPI(title="DriftMoney OCR Service", version="1.0.0")

# Global model cache
model = None


def get_model():
    """Lazy load model on first request"""
    global model
    if model is None:
        print("Loading DocTR OCR model...")
        model = ocr_predictor(det_arch='db_resnet50', reco_arch='crnn_vgg16_bn', pretrained=True)
        print("Model loaded successfully")
    return model


def extract_text_from_result(result) -> str:
    """Extract text from DocTR result"""
    text_lines = []
    for page in result.pages:
        for block in page.blocks:
            for line in block.lines:
                line_text = " ".join([word.value for word in line.words])
                text_lines.append(line_text)
    return "\n".join(text_lines)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "doctr-ocr"}


@app.post("/ocr")
async def ocr_extract(file: UploadFile = File(...)):
    """
    Extract text from uploaded PDF or image file
    
    Supported formats: PDF, PNG, JPG, JPEG, TIFF, BMP
    """
    # Validate file type
    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {allowed_extensions}"
        )
    
    # Save uploaded file temporarily
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{file_ext}")
    
    try:
        # Write uploaded file
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Load document
        if file_ext == ".pdf":
            doc = DocumentFile.from_pdf(temp_path)
        else:
            doc = DocumentFile.from_images(temp_path)
        
        # Run OCR
        predictor = get_model()
        result = predictor(doc)
        
        # Extract text
        extracted_text = extract_text_from_result(result)
        
        return JSONResponse({
            "success": True,
            "filename": file.filename,
            "text": extracted_text,
            "char_count": len(extracted_text),
            "line_count": len(extracted_text.split("\n"))
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
    
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


@app.post("/ocr/batch")
async def ocr_batch(files: list[UploadFile] = File(...)):
    """
    Extract text from multiple files
    """
    results = []
    
    for file in files:
        try:
            # Reset file position
            await file.seek(0)
            result = await ocr_extract(file)
            results.append(result.body)
        except HTTPException as e:
            results.append({
                "success": False,
                "filename": file.filename,
                "error": e.detail
            })
    
    return JSONResponse({"results": results})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
