import os
import json
from google import genai
from google.genai import types
from PIL import Image
from pydantic import BaseModel, Field

# Define schema for the classification result using Pydantic
class ClassificationResult(BaseModel):
    category: str = Field(
        description="Must be exactly one of: pothole, water_leak, garbage, streetlight, drainage, encroachment"
    )
    severity: int = Field(
        description="Rate severity from 1-5 based on visual analysis (1 = low impact, 5 = critical hazard)"
    )
    description: str = Field(
        description="Generate a clean, professional, objective one-line description of what is visible in the photo."
    )

def classify_and_analyze_photo(image_path: str) -> dict:
    """
    Main visual classifier runner using Gemini Model in python google-genai SDK.
    """
    api_key_val = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key_val:
        # Fallback dictionary if no key is configured
        print("GOOGLE_API_KEY / GEMINI_API_KEY environment variable is not set. Using local classifier fallback.")
        return {
            "category": "garbage",
            "severity": 3,
            "description": "Unidentified public infrastructure issue (Fallback description- please select API key)."
        }

    try:
        # Instantiate SDK client with correct credentials
        client = genai.Client(api_key=api_key_val)
        
        # Load the image using PIL
        img = Image.open(image_path)
        
        prompt = (
            "You are an expert AI Municipal Auditor. Carefully inspect the provided photo of a citizen complaint. "
            "Perform two visual assessments and generate an objective description: "
            "1. Classify the core issue into one of exactly the six categories: pothole, water_leak, garbage, streetlight, drainage, encroachment. "
            "2. Rate severity on a scale of 1 to 5. Consider how dangerous, disruptive, or urgent the issue is for public safety. "
            "3. Describe what you see in the photo in a concise description of one sentence."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[img, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ClassificationResult,
                system_instruction="You are a professional city auditor analyzing visual photos of infrastructural damage or citizen complaints.",
            ),
        )
        
        content_text = response.text.strip() if response.text else "{}"
        return json.loads(content_text)

    except Exception as e:
        print(f"Exception during Python visual classification: {e}")
        # Return elegant fallback to prevent crashes
        return {
            "category": "garbage",
            "severity": 3,
            "description": f"Audited issue with visual backup failure. Details: {str(e)}"
        }

class DuplicateDetectionResult(BaseModel):
    is_duplicate: bool = Field(
        description="True if the new report is a duplicate of one of the nearby existing reports, False otherwise."
    )
    duplicate_report_id: str | None = Field(
        description="The ID of the existing report that this is a duplicate of. Must be one of the IDs provided in the nearby reports list, or null if is_duplicate is False."
    )
    confidence_score: int = Field(
        description="Confidence score of duplicate detection from 0 to 100."
    )
    analysis: str = Field(
        description="A short explanation of why this is or isn't a duplicate, comparing the descriptions and visual characteristics."
    )

def check_duplicate_report(image_path: str, new_desc: str, nearby_reports: list) -> dict:
    """
    Checks if a new report is a duplicate of any existing nearby reports of the same category.
    """
    api_key_val = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key_val or not nearby_reports:
        return {
            "is_duplicate": False,
            "duplicate_report_id": None,
            "confidence_score": 0,
            "analysis": "No API key or no nearby reports for comparison."
        }

    try:
        client = genai.Client(api_key=api_key_val)
        img = Image.open(image_path) if image_path and os.path.exists(image_path) else None

        # Build the reports description context for the prompt
        reports_context = []
        for r in nearby_reports:
            reports_context.append(
                f"- ID: {r.get('id')}\n"
                f"  Title: {r.get('title')}\n"
                f"  Description: {r.get('description')}\n"
                f"  Visual Description: {r.get('visual_description', 'N/A')}"
            )
        reports_str = "\n\n".join(reports_context)

        prompt = (
            f"You are an expert municipal auditor in charge of duplicate detection. "
            f"A citizen has reported a new issue. Here is its details:\n"
            f"New Description: {new_desc}\n\n"
            f"Here is a list of nearby unresolved reports of the SAME category:\n"
            f"{reports_str}\n\n"
            f"Your task is to analyze the provided photo of the new report and compare it with the descriptions "
            f"and visual properties of the nearby existing reports. Determine if this new report represents "
            f"the EXACT SAME physical issue/incident (e.g. the same pothole, same pile of garbage, same broken streetlight) "
            f"or if it is a separate, distinct issue. "
            f"If it is a duplicate, identify which report ID it matches."
        )

        contents = [prompt]
        if img:
            contents.insert(0, img)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DuplicateDetectionResult,
                system_instruction="You are an expert AI municipal duplicate detector. Compare visual evidence and text descriptions to flag duplicates accurately.",
            ),
        )

        content_text = response.text.strip() if response.text else "{}"
        return json.loads(content_text)

    except Exception as e:
        print(f"Exception during duplicate detection: {e}")
        return {
            "is_duplicate": False,
            "duplicate_report_id": None,
            "confidence_score": 0,
            "analysis": f"Error running duplicate check: {str(e)}"
        }

if __name__ == "__main__":
    # Multi-purpose CLI command usage support
    import sys
    if len(sys.argv) > 1:
        img_arg = sys.argv[1]
        res = classify_and_analyze_photo(img_arg)
        print(json.dumps(res, indent=2))
    else:
        print(json.dumps({
            "error": "Please provide path to an image file as first argument."
        }))
