import os
import sys
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

class GrievanceDraft(BaseModel):
    english: str = Field(description="Formal civic grievance letter in English. Clean Markdown format.")
    hindi: str = Field(description="Formal civic grievance letter in Hindi. Clean Markdown format.")

def generate_local_fallback_bilingual_letter(report_title, report_desc, category, jurisdiction_data):
    # Retrieve details
    body_name = jurisdiction_data.get("body_name", "Municipal Corporation")
    ward = jurisdiction_data.get("ward", "Local Ward")
    dept = jurisdiction_data.get("department", "SWM Department")
    officer = jurisdiction_data.get("officer_name", "Ward Officer")
    sla = jurisdiction_data.get("sla_hours", 48)
    address = jurisdiction_data.get("formatted_address", "Local Street Address")
    pincode = jurisdiction_data.get("pincode", "")
    portal = jurisdiction_data.get("complaint_portal_url", "")

    eng_letter = f"""### FORMAL CIVIL GRIEVANCE PETITION

**To,**
The Office of the {officer},
{dept},
{body_name},
{ward},
India - {pincode}.

**Subject:** Urgent Public Grievance regarding unresolved '{category}' - {report_title}

**Reference:** Citizen Photo & GIS Evidence Uploaded (Portal: {portal if portal else 'NagarSevak'})

**Date:** June 23, 2026

**Respected Madam/Sir,**

I am writing to draw your urgent attention to a hazardous and disruptive civic issue at the following location:
- **Exact Address/Landmark:** {address}
- **Issue Type:** {category.upper()}
- **Reporter's Description:** {report_desc}

We have captured and chemically timestamped photographic evidence confirming the severity of this issue. Under the official Citizen Charter and grievance rules of **{body_name}**, the maximum Service Level Agreement (SLA) time committed for resolving this type of infrastructure grievance is **{sla} Hours**.

As a tax-paying citizen and concerned resident of {ward}, I formally request you to kindly deploy immediate service personnel to execute necessary repairs and bring this to an orderly resolution before the expiry of the **{sla}-hour** SLA window. Public safety and convenience are currently severely compromised.

Thank you. We look forward to your proactive response.

**Yours Sincerely,**
Registered Citizen, NagarSevak Platform.
"""

    hin_letter = f"""### आधिकारिक नागरिक शिकायत पत्र

**सेवा में,**
माननीय {officer} कार्यालय,
{dept} प्रभाग,
{body_name},
{ward},
भारत - {pincode}।

**विषय:** लंबित समस्या '{category}' - {report_title} के संबंध में तत्काल कार्रवाई हेतु।

**संदर्भ:** संवर्धित नागरिक फोटो एवं जीआईएस (GIS) साक्ष्य (पोर्टल: {portal if portal else 'नगरसेवक'})।

**दिनांक:** २३ जून, २०२६

**आदरणीय महोदया/महोदय,**

मैं स्थानीय क्षेत्र में व्याप्त एक गंभीर नागरिक समस्या की ओर आपका त्वरित ध्यान आकर्षित करना चाहता हूँ। यह समस्या निम्नलिखित स्थान पर बनी हुई है:
- **सटीक स्थान/लैंडमार्क:** {address}
- **शिकायत का प्रकार:** {category.upper()}
- **शिकायत का विवरण:** {report_desc}

हमने इस समस्या की पुष्टि करने वाले सटीक फोटो साक्ष्य संकलित व अपलोड कर दिए हैं। **{body_name}** के आधिकारिक नागरिक चार्टर और शिकायत निवारण नियमावली के तहत, इस विशिष्ट शिकायत के निवारण हेतु अधिकतम सेवा स्तर समझौता (SLA) अवधि **{sla} घंटे** स्वीकृत है।

अतः {ward} के एक सजग नागरिक के रूप में, मेरा आपसे विनम्र निवेदन है कि जनहित, जन सुरक्षा और सुगम यातायात को ध्यान में रखते हुए इस **{sla}-घंटे** की तय समय सीमा के भीतर तत्काल मरम्मत कार्य या उचित कार्रवाई सुनिश्चित करने के लिए संबंधित कर्मियों को निर्देशित करें।

सहयोग हेतु कोटिशः धन्यवाद।

**भवदीय/भवदीया,**
पंजीकृत नागरिक, नगरसेवक (NagarSevak) मंच।
"""
    return {
        "english": eng_letter,
        "hindi": hin_letter
    }

def main():
    # Attempt to read JSON data from stdin or CLI arguments
    input_data = {}
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
        except Exception:
            pass
            
    if not input_data:
        # Check stdin
        try:
            if not sys.stdin.isatty():
                stdin_text = sys.stdin.read().strip()
                if stdin_text:
                    input_data = json.loads(stdin_text)
        except Exception:
            pass

    # If no valid input loaded, use reasonable diagnostic test structure
    if not input_data:
        input_data = {
            "title": "Severe Water Logging & Road Damage",
            "description": "The main road is completely flooded with overflow drainage water since last 2 days, causing huge traffic blockages and absolute hazard for senior citizens.",
            "category": "drainage",
            "jurisdiction": {
                "body_name": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
                "ward": "Ward 151 (Koramangala)",
                "department": "Sewage & Drainage Department",
                "officer_name": "Ward Junior Sanitary Engineer",
                "sla_hours": 36,
                "complaint_portal_url": "https://sahaya.bbmp.gov.in",
                "formatted_address": "80 Feet Rd near Koramangala Police Station, Koramangala 4th Block, Bengaluru, Karnataka 560034",
                "pincode": "560034"
            }
        }

    report_title = input_data.get("title", "Infrastructure Issue")
    report_desc = input_data.get("description", "Not provided")
    category = input_data.get("category", "pothole")
    jurisdiction_data = input_data.get("jurisdiction", {})

    api_key_val = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key_val:
        # Fallback to high-quality template-based bilingual generation
        fallback = generate_local_fallback_bilingual_letter(report_title, report_desc, category, jurisdiction_data)
        print(json.dumps(fallback, indent=2))
        return

    try:
        client = genai.Client(api_key=api_key_val)
        
        prompt = (
            f"You are an expert AI Municipal grievance advocate. Analyze the following details regarding a citizen-reported complaint:\n"
            f"- Title: {report_title}\n"
            f"- Description: {report_desc}\n"
            f"- Category: {category}\n"
            f"- Municipal Body to address: {jurisdiction_data.get('body_name', 'Municipal Corporation')}\n"
            f"- Ward/Locality: {jurisdiction_data.get('ward', 'Local Ward')}\n"
            f"- Handling Department: {jurisdiction_data.get('department', 'Grievance Wing')}\n"
            f"- Designated Officer: {jurisdiction_data.get('officer_name', 'Assigned Officer')}\n"
            f"- Civic SLA limit: {jurisdiction_data.get('sla_hours', 48)} hours\n"
            f"- Formatted Address: {jurisdiction_data.get('formatted_address', 'Unspecified area')}\n"
            f"- Pincode: {jurisdiction_data.get('pincode', 'N/A')}\n"
            f"- Reference Portal (if any): {jurisdiction_data.get('complaint_portal_url', 'NagarSevak portal')}\n\n"
            f"Draft two formal community/grievance action letters to the municipal officer:\n"
            f"1) English Version: Follow a pristine legal citizen petition style, detailing the complaint, geographic specifics, referencing official photo/GIS data submitted, invoking the statutory citizen charter SLA response timeline, and requesting action.\n"
            f"2) Hindi Version (स्थानीय शिकायत पत्र): Translate and adapt the letter's gravitas and structure into formal Hindi government petition format (using words like 'महोदय/महोदया', 'निवेदन', 'सजग नागरिक', etc.).\n\n"
            f"Format both strings meticulously as standard Markdown, with bold titles/headers, clear line spaces, and bullet points. Output the response in JSON with 'english' and 'hindi' string keys strictly matching the requested schema."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GrievanceDraft,
                system_instruction="You are a professional city auditor drafting formal bilingual legal-administrative civic petitions for citizens of India.",
            ),
        )

        content_text = response.text.strip() if response.text else "{}"
        # Validate JSON format
        parsed = json.loads(content_text)
        if "english" in parsed and "hindi" in parsed:
            print(json.dumps(parsed, indent=2))
        else:
            raise KeyError("Bilingual keys missing from structured output model response.")

    except Exception as e:
        # Prevent any operational failure with clean local generation
        print(f"Exception while talking to Gemini in python grievance.py: {e}", file=sys.stderr)
        fallback = generate_local_fallback_bilingual_letter(report_title, report_desc, category, jurisdiction_data)
        print(json.dumps(fallback, indent=2))

if __name__ == "__main__":
    main()
