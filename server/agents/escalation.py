import os
import sys
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

class EscalationDraft(BaseModel):
    english: str = Field(description="Formal municipal escalation letter/notice in English. Detailed Markdown format.")
    hindi: str = Field(description="Formal municipal escalation letter/notice in Hindi. Detailed Markdown format.")

def generate_local_fallback_escalation(report, level, neighbors=None):
    title = report.get("title", "Civic Issue")
    desc = report.get("description", "Not provided")
    category = report.get("category", "unassigned")
    
    jur = report.get("jurisdiction", {})
    body = jur.get("body", jur.get("body_name", "Municipal Corporation"))
    dept = jur.get("department", "Public Works")
    officer = jur.get("officer_name", "Ward Engineer")
    sla = jur.get("sla_hours", 48)
    
    loc = report.get("location", {})
    address = loc.get("address", "Local Area")
    ward = loc.get("ward", "Local Ward")
    
    if level == "l1":
        # Level 1 SLA Breach Follow-up
        eng = f"""### URGENT FORMAL NOTICE: SLA BREACH ESCALATION (LEVEL 1)

**TO,**
The Office of the Head Commissioner,
Grievance Redressal Cell, {body},
CC: {officer} ({dept}).

**SUBJECT:** Breach of Citizen Charter SLA for Category '{category}' - Complaint Ref #{report.get('id', 'N/A')}

**Respected Sir/Madam,**

This is an official Level 1 escalation regarding the civic grievance titled **"{title}"** filed on **{report.get('created_at', '2026-06-23')[:10]}** at location **{address}**.

Under the **{body}** Public Service Charter, grievances of this category must be effectively resolved within **{sla} hours**. This SLA window has expired without any administrative resolution or dynamic status update. 

This delay poses an immediate hazard and inconvenience to daily commuters and residents of **{ward}**. Please find this formal notice of service breach. We request immediate deployment of emergency ground personnel within the next 24 hours to avert further escalation.

**Enclosure:** Digital evidence log, timestamped photo.

**Sincerely,**
Citizen Advocacy Monitor, NagarSevak
"""
        hin = f"""### अत्यंत आवश्यक सूचना: सेवा स्तर समझौता (SLA) उल्लंघन स्तर १

**सेवा में,**
मुख्य आयुक्त कार्यालय,
शिकायत निवारण विभाग, {body},
सूचनार्थ: {officer} ({dept})।

**विषय:** नागरिक समस्या नियमावली का उल्लघंन - संदर्भ संख्या #{report.get('id', 'N/A')}

**आदरणीय महोदय / महोदया,**

यह नागरिक समस्या **"{title}"** (श्रेणी: {category}) के निवारण में हुई अत्यधिक देरी के संबंध में स्तर १ की आधिकारिक शिकायत है। यह समस्या **{address}** पर उपस्थित है।

**{body}** के सिटीजन चार्टर के नियमानुसार इस प्रकार की समस्याओं का निवारण अधिकतम **{sla} घंटों** में हो जाना अनिवार्य है। किंतु यह समय-सीमा निष्क्रियता के चलते समाप्त हो चुकी है, जो कि प्रशासनिक उदासीनता को दर्शाती है।

इससे क्षेत्र के नागरिकों और **{ward}** के रहवासियों को अत्यंत कठिनाइयों का सामना करना पड़ रहा है। त्वरित कार्रवाई सुनिश्चित करें।

**भवदीय,**
सजग नागरिक मंच, नगरसेवक (NagarSevak)।
"""
    elif level == "l2":
        # Level 2 Collective Grievance
        count = len(neighbors) if neighbors else 8
        details_txt = ""
        if neighbors:
            for n in neighbors[:5]:
                details_txt += f"- Ref #{n.get('id', 'N/A')}: {n.get('title')} at {n.get('location', {}).get('address', 'nearby')}\n"
        else:
            details_txt = f"- Multiple reporting occurrences in the immediate 500-meter block of {ward}.\n"

        eng = f"""### INDEPENDENT CITIZEN INQUEST: LEVEL 2 COLLECTIVE CIVIC ESCALATION

**TO,**
The Chief Executive Officer & Zonal Joint Commissioner,
{body}.

**SUBJECT:** Systemic Civic Neglect & Multi-Resident Collective Grievance ({category.upper()})

**Respected Authority,**

We are writing on behalf of the collective residents of **{ward}** to submit a Level 2 Escalation regarding structural failure to address persistent civic hazards.

Our local platform has aggregated and validated **{count} distinct reports** from residents concerning identical unresolved failures in the **{category}** category within a 500-meter radius of {address} over the last 30 days:

{details_txt}
This clustering of complaints indicates a systemic maintenance failure. Standard SLA-driven pathways have completely stalled. Under the Karnataka/local Municipal Act, we urge you to treat this as a collective class grievance, override standard delays, and initiate an fast-track community repair drive.

If action is not initiated within 48 hours, we will be forced to file a formal systemic audit petition.

**Yours Sincerely,**
NagarSevak Community Coalition (Representing {count}+ local residents)
"""
        hin = f"""### सामूहिक जन शिकायत: स्तर २ आधिकारिक नागरिक अवहेलना

**सेवा में,**
मुख्य कार्यकारी अधिकारी एवं जोनल आयुक्त कार्यालय,
{body}।

**विषय:** प्रशासनिक अनदेखी के विरुद्ध वार्ड {ward} के निवासियों की संयुक्त शिकायत

**महोदय,**

हम **{ward}** के जागरूक निवासियों की ओर से उपस्थित जनहित समस्याओं पर दीर्घकालिक निष्क्रियता के खिलाफ स्तर २ का शिकायती नोटिस प्रस्तुत कर रहे हैं।

हमारे मंच 'नगरसेवक' ने पिछले ३० दिनों में **{address}** के आसपास ५०० मीटर के दायरे में **{category}** से संबंधित **{count} पृथक शिकायतों** को संकलित व प्रमाणित किया है:

{details_txt}
ये तथ्य स्पष्ट करते हैं कि यह व्यक्तिगत त्रुटि नहीं बल्कि सामूहिक प्रशासनिक विफलता है। अतः तत्काल प्रभाव से इस क्षेत्र में सुधार कार्य आरंभ कराया जाए।

**भवदीय निवेदक,**
नगरसेवक जन गठबंधन (स्थानीय वार्ड निवासी समूह)
"""
    else:
        # Level 3 RTI Application Draft
        eng = f"""### FORMAL RIGHT TO INFORMATION (RTI) COMPLIANCE APPLICATION

**TO,**
The Public Information Officer (PIO) / Senior City Auditor,
{dept} Command Centre & Administration Wing,
{body}.

**SUBJECT:** Form 'A' Application under Section 6(1) of the Right to Information Act, 2005

**1. Name of Applicant:** NagarSevak Civic Transparency Collective
**2. Particulars of Information Required:**
Concerning unresolved {category} hazard Ref #{report.get('id', 'N/A')} at {address} (SLA Breach of over 96 hours):

- **Query A:** Provide certified copies of all file notes, electronic logs, and progress reports generated by the `{dept}` or assigned ward engineer `{officer}` in response to Citizen Grievance Ref #{report.get('id', 'N/A')} filed on {report.get('created_at', '2026-06-23')}.
- **Query B:** State the official reasons as per municipal records for violating the mandatory {sla}-hour resolve time committed in your Department's Service charter.
- **Query C:** Provide names, designations, and contact details of the official(s) responsible for inspecting this location and logging the resolution progress. Also state details of disciplinary actions or performance penalty rules applied for such delay.
- **Query D:** Provide the sanctioned budget allocated for maintenance and repairs in this ward for the current fiscal year and the total amount disbursed so far.

**3. Application Fee Details:**
Ten Rupees (Rs. 10/-) statutory fee attached via Electronic Portal Receipt / Digital Court Fee Stamp.

**Place:** Bangalore / Local Sandbox
"""
        hin = f"""### सूचना का अधिकार (RTI) आवेदन पत्र - धारा ६(१)

**सेवा में,**
लोक सूचना अधिकारी (PIO) / मुख्य नगर लेखा परीक्षक,
{dept} सचिवालय,
{body}।

**विषय:** सूचना का अधिकार अधिनियम, २००५ की धारा ६(१) के तहत विधिवत आवेदन

**१. आवेदक का नाम:** नगरसेवक नागरिक पारदर्शिता गठबंधन (NagarSevak Collective)
**२. मांगी गई जानकारी का विवरण:**
स्थान {address} पर लंबित जन-समस्या (संदर्भ संख्या #{report.get('id', 'N/A')}) के निवारण में हुए विलंब के संदर्भ में:

- **बिंदु अ:** {report.get('created_at', '2026-06-23')[:10]} को दर्ज शिकायत #{report.get('id', 'N/A')} पर संबंधित अभियंता `{officer}` द्वारा की गई समस्त विभागीय टिप्पणियों, प्रविष्टियों और कृत कार्रवाई की प्रमाणित प्रतियां उपलब्ध कराएं।
- **बिंदु ब:** नागरिक चार्टर में उल्लिखित **{sla} घंटे** की निर्धारित अवधि में काम पूरा न होने के क्या कारण हैं? उसका लिखित विवरण प्रदान करें।
- **बिंदु स:** इस क्षेत्र के निरीक्षण हेतु जिम्मेदार अधिकारियों व कर्मचारियों के नाम, पदनाम तथा उनके ऊपर लागू किये जाने वाले दंड/जुर्माने का विवरण प्रदान करें।

**३. आवेदन शुल्क भुगतान:**
आर.टी.आई. नियमावली के अनुसार आवश्यक १० रुपये का शुल्क ऑनलाइन रसीद संख्या द्वारा संलग्न किया जा चुका है।

**स्थान:** बेंगलुरु (स्थानीय नगर क्षेत्र)
"""

    return {
        "english": eng,
        "hindi": hin
    }

def main():
    input_data = {}
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
        except Exception:
            pass
            
    if not input_data:
        try:
            if not sys.stdin.isatty():
                stdin_text = sys.stdin.read().strip()
                if stdin_text:
                    input_data = json.loads(stdin_text)
        except Exception:
            pass

    if not input_data:
        input_data = {
            "level": "l1",
            "report": {
                "id": "test_99",
                "title": "Severe Cave-in on Road",
                "description": "Entire lane has subsided near the sewer line, causing risk of fatal accidents.",
                "category": "pothole",
                "created_at": "2026-06-21T10:00:00Z",
                "jurisdiction": {
                    "body_name": "Bruhat Bengaluru Mahanagara Palike",
                    "department": "Road Infrastructure Department",
                    "officer_name": "Asst Executive Engineer Koramangala",
                    "sla_hours": 24
                },
                "location": {
                    "address": "4th Cross Rd, Koramangala 1st Block, Bengaluru",
                    "ward": "Ward 151"
                }
            },
            "neighbors": []
        }

    level = input_data.get("level", "l1").lower()
    report = input_data.get("report", {})
    neighbors = input_data.get("neighbors", [])

    api_key_val = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key_val:
        fallback = generate_local_fallback_escalation(report, level, neighbors)
        print(json.dumps(fallback, indent=2))
        return

    try:
        client = genai.Client(api_key=api_key_val)
        
        # Build systemic prompt context
        jur = report.get("jurisdiction", {})
        body = jur.get("body", jur.get("body_name", "Municipal Corporation"))
        dept = jur.get("department", "Public Infrastructure Division")
        officer = jur.get("officer_name", "Nodal Engineer")
        sla = jur.get("sla_hours", 48)
        
        loc = report.get("location", {})
        address = loc.get("address", "Unspecified Road")
        ward = loc.get("ward", "Local Ward")

        if level == "l1":
            user_instruction = (
                f"Draft a Level 1 Escalation Notice for a breached Service Level Agreement (SLA).\n"
                f"- Original Complaint: '{report.get('title')}' - {report.get('description')}\n"
                f"- Category: {report.get('category')} at {address}\n"
                f"- Municipal Body and dept: {body}, {dept} (addressed to {officer})\n"
                f"- Committed charter SLA: {sla} hours. (Current elapsed is > {sla} hours).\n\n"
                f"Make the tone formally urgent and stern, pointing out administrative failure, danger is elevated, and insisting ground support is dispatched immediately."
            )
            system_instruction = "You are a professional city ombudsman representing residents in India. Draft professional high-impact escalation complaints."
        elif level == "l2":
            count = len(neighbors) if neighbors else 5
            neighbor_list_str = "\n".join([f"- Ticket #{n.get('id', 'N/A')}: {n.get('title')} at {n.get('location', {}).get('address', 'nearby area')}" for n in neighbors[:10]])
            user_instruction = (
                f"Draft a Level 2 Collective Resident Action Grievance.\n"
                f"- Local Main Hub: '{report.get('title')}' at {address}\n"
                f"- Category: {report.get('category')} (Ward: {ward})\n"
                f"- Multi-resident validated reports in immediate 500m area over last 30 days: {count} reports.\n"
                f"Cluster list:\n{neighbor_list_str if neighbor_list_str else '- Cumulative matching reports across the ward sector.'}\n\n"
                f"Tone is authoritative and representative. Leverage the statistics of multiple residents experiencing identical neglect (' {count} residents reported {report.get('category')}s in {ward} in the last 30 days') to plead for a fast-track community-level override and ward-wide sanitation/repair drive."
            )
            system_instruction = "You are a lead civic community organizer drafting class-grievance formal notices to senior municipal zone chiefs in India."
        else:
            user_instruction = (
                f"Draft a formal Right to Information (RTI) application under Section 6(1) of the RTI Act, 2005.\n"
                f"Details:\n"
                f"- Hazard: '{report.get('title')}' ({report.get('category')}) at {address}\n"
                f"- Delay: Systemic deadlock, SLA breached & neglected beyond 96 hours.\n"
                f"- Entity: PIO office, {dept}, {body}.\n\n"
                f"Write a standard, extremely formal legal RTI Form 'A' layout. Keep queries bulleted, demand copies of official file notes, inspect registers, list of daily workers assigned, budget funds allocated for road/civic repairs of the ward, and penalties applicable for administrative negligence. Must look like a real RTI draft."
            )
            system_instruction = "You are an expert civic transparency legal attorney and RTI activist drafting legal Form A applications in India."

        prompt_str = (
            f"Write both an English representation and an official Hindi translation/adaptation (using words like 'महोदय/महोदया', 'आवेदन', 'प्राधिकारी') of the letter.\n"
            f"Here details of your prompt instruction:\n{user_instruction}\n\n"
            f"Format both 'english' and 'hindi' drafts strictly inside a JSON object conforming exactly to the EscalationDraft schema. Ensure clean Markdown structure."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_str,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EscalationDraft,
                system_instruction=system_instruction,
            ),
        )

        content_text = response.text.strip() if response.text else "{}"
        parsed = json.loads(content_text)
        if "english" in parsed and "hindi" in parsed:
            print(json.dumps(parsed, indent=2))
        else:
            raise KeyError("Bilingual escalation structure missing 'english' or 'hindi' string keys.")

    except Exception as e:
        print(f"Exception calling Gemini in Python escalation: {e}", file=sys.stderr)
        fallback = generate_local_fallback_escalation(report, level, neighbors)
        print(json.dumps(fallback, indent=2))

if __name__ == "__main__":
    main()
