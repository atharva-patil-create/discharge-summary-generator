from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union, Dict
import json
import logging
import hashlib
import google.generativeai as genai
import os
from dotenv import load_dotenv
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Medical Record Extractor API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Define the data models
class DailySummary(BaseModel):
    admission_date: str
    discharge_date: str
    patient_name: str
    age: str
    sex: str
    diagnosis: str
    chief_complaints: str
    history_of_present_illness: str
    past_medical_history: Union[str, List[str]]
    surgical_history: Union[str, List[str]]
    hospital_course: str
    investigations: Union[str, List[str]]
    procedures: Union[str, List[str]]
    treatment_given: List[str]
    discharge_medications: List[str]
    discharge_condition: str
    follow_up_instructions: str
    advice_on_discharge: str
    doctor: List[str]

class DischargeSummary(BaseModel):
    discharge_summary: List[DailySummary]

class MedicalTextRequest(BaseModel):
    medical_text: str

class MedicalTextResponse(BaseModel):
    success: bool
    data: Optional[DischargeSummary] = None
    error: Optional[str] = None
    raw_llama_output: Optional[str] = None  # Keep the same field name for compatibility

# Initialize Gemini API
try:
    # Get API key from environment variable
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    
    genai.configure(api_key=api_key)
    
    # Initialize the model
    model = genai.GenerativeModel('gemini-1.5-flash')  # You can also use 'gemini-1.5-pro' for better quality
    
    logger.info("Gemini API initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Gemini API: {e}")
    model = None

@app.get("/")
async def root():
    return {"message": "Medical Record Extractor API with Gemini", "status": "running"}

@app.get("/health")
async def health_check():
    gemini_status = "connected" if model else "disconnected"
    return {
        "status": "healthy",
        "gemini": gemini_status
    }

@app.post("/extract", response_model=MedicalTextResponse)
async def extract_medical_data(request: MedicalTextRequest):
    logger.info("Received extraction request")
    
    if not model:
        logger.error("Gemini API is not available")
        raise HTTPException(status_code=503, detail="Gemini API service is not available")
    
    if not request.medical_text.strip():
        logger.error("Empty medical text provided")
        raise HTTPException(status_code=400, detail="Medical text cannot be empty")
    
    logger.info(f"Processing medical text of length: {len(request.medical_text)}")
    
    try:
        # Create the extraction prompt
        prompt = f"""
You are a medical expert. Extract and format the following clinical notes into the structured format given below. Use the format exactly as specified.

Instructions:
- DO NOT add any stars in the output like * or ** or *** or ****
- Leave only one blank line between each field
- Format all dates as YYYY-MM-DD
- Extract all available information
- Include all medications, investigations, procedures, and doctors mentioned
- Do not use parentheses in any part of the output
- Use bullet points only for lists (e.g., medications, doctors)
- Format field names in medical green color using HTML-like tags: <span style="color: #2E7D32">Field Name</span>
- Format the main header as: <h2 style="color: #2E7D32; font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Discharge Summary</h2>

Output Format:

<h2 style="color: #2E7D32; font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; text-align: center;">Discharge Summary</h2>

1. <span style="color: #2E7D32">Admission Date</span>: YYYY-MM-DD

2. <span style="color: #2E7D32">Discharge Date</span>: YYYY-MM-DD

3. <span style="color: #2E7D32">Patient Name</span>: Full Name or leave blank

4. <span style="color: #2E7D32">Age</span>: Age in years

5. <span style="color: #2E7D32">Sex</span>: Male/Female

6. <span style="color: #2E7D32">Diagnosis</span>: Diagnosis details

7. <span style="color: #2E7D32">Chief Complaints</span>: Chief complaints on admission

8. <span style="color: #2E7D32">History of Present Illness</span>: Narrative of illness before admission

9. <span style="color: #2E7D32">Past Medical History</span>: Any relevant medical history

10. <span style="color: #2E7D32">Surgical History</span>: Past surgeries if mentioned

11. <span style="color: #2E7D32">Hospital Course</span>: Summary of course during hospital stay

12. <span style="color: #2E7D32">Investigations</span>: Key tests and findings

13. <span style="color: #2E7D32">Procedures</span>: Any procedures done

14. <span style="color: #2E7D32">Treatment Given</span>:
- Medication1
- Medication2
- ...

15. <span style="color: #2E7D32">Discharge Medications</span>:
- Medication1
- Medication2
- ...

16. <span style="color: #2E7D32">Discharge Condition</span>: Condition at discharge

17. <span style="color: #2E7D32">Follow-up Instructions</span>: Follow-up advice

18. <span style="color: #2E7D32">Advice on Discharge</span>: Diet, lifestyle, or other advice

19. <span style="color: #2E7D32">Doctor</span>:
- Doctor1
- Doctor2
- ...

Now, process the following clinical notes accordingly and please follow the instructions strictly:
{request.medical_text}
"""

        logger.info("Sending request to Gemini API...")
        
        # Set safety settings as a dictionary
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        }

        # Generate content with Gemini
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,  # Lower temperature for more consistent output
                top_p=0.8,
                top_k=40,
                max_output_tokens=2048,
            ),
            safety_settings=safety_settings
        )
        
        raw_content = response.text
        logger.info(f"Received response from Gemini: {len(raw_content)} characters")
        
        # Return the raw output directly
        return MedicalTextResponse(
            success=True,
            data=None,
            error=None,
            raw_llama_output=raw_content
        )
            
    except Exception as e:
        logger.error(f"Gemini API request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process medical text: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)