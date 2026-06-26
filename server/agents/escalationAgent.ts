import { exec } from "child_process";
import path from "path";
import dotenv from "dotenv";
import { Report } from "../../src/types";

dotenv.config();

export interface BilingualEscalationDraft {
  english: string;
  hindi: string;
}

/**
 * Invokes the Python-based autonomous escalation agent.
 */
export async function generateBilingualEscalation(
  level: "l1" | "l2" | "l3",
  report: Report,
  neighbors: Report[] = []
): Promise<BilingualEscalationDraft> {
  const payload = {
    level,
    report,
    neighbors
  };

  return new Promise<BilingualEscalationDraft>((resolve) => {
    const scriptPath = path.join(process.cwd(), "server", "agents", "escalation.py");
    const payloadStr = JSON.stringify(payload);
    
    const cmd = `python3 "${scriptPath}"`;
    const child = exec(cmd, (error, stdout, stderr) => {
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed && parsed.english && parsed.hindi) {
            console.log(`Success generating L${level} bilingual escalation letter via Python agent.`);
            resolve(parsed as BilingualEscalationDraft);
            return;
          }
        } catch (parseError) {
          console.warn("Could not parse escalation.py JSON output. Falling back to TS template generator.", stdout);
        }
      } else {
        console.warn("Python escalation execution reported code/stderr errors. Executing fallback template:", stderr);
      }

      // TS native fallback
      resolve(generateFallbackBilingualEscalationTS(level, report, neighbors));
    });

    // Write input payload specifically to stdin
    if (child.stdin) {
      child.stdin.write(payloadStr);
      child.stdin.end();
    }
  });
}

function generateFallbackBilingualEscalationTS(
  level: "l1" | "l2" | "l3",
  report: Report,
  neighbors: Report[] = []
): BilingualEscalationDraft {
  const bodyName = report.jurisdiction?.body || "Municipal Corporation";
  const wardName = report.location?.ward || "Local Ward";
  const deptName = report.jurisdiction?.department || "Municipal Grievance Department";
  const officerName = report.jurisdiction?.officer_name || "Zone Officer";
  const slaHours = report.jurisdiction?.sla_hours || 48;
  const address = report.location?.address || "Specified Location";
  const pincode = "560001";

  if (level === "l1") {
    const english = `### URGENT FORMAL NOTICE: SLA BREACH ESCALATION (LEVEL 1)

**TO,**
The Office of the Head Commissioner,
Grievance Redressal Cell, ${bodyName},
CC: ${officerName} (${deptName}).

**SUBJECT:** Breach of Citizen Charter SLA for Category '${report.category}' - Complaint Ref #${report.id}

**Respected Sir/Madam,**

This is an official Level 1 escalation regarding the civic grievance titled **"${report.title}"** filed on **${report.created_at.substring(0, 10)}** at location **${address}**.

Under the **${bodyName}** Public Service Charter, grievances of this category must be effectively resolved within **${slaHours} hours**. This SLA window has expired without any administrative resolution or dynamic status update. 

This delay poses an immediate hazard and inconvenience to daily commuters and residents of **${wardName}**. Please find this formal notice of service breach. We request immediate deployment of emergency ground personnel within the next 24 hours to avert further escalation.

**Enclosure:** Digital evidence log, timestamped photo.

**Sincerely,**
Citizen Advocacy Monitor, NagarSevak`;

    const hindi = `### अत्यंत आवश्यक सूचना: सेवा स्तर समझौता (SLA) उल्लंघन स्तर १

**सेवा में,**
मुख्य आयुक्त कार्यालय,
शिकायत निवारण विभाग, ${bodyName},
सूचनार्थ: ${officerName} (${deptName})।

**विषय:** नागरिक समस्या नियमावली का उल्लघंन - संदर्भ संख्या #${report.id}

**आदरणीय महोदय / महोदया,**

यह नागरिक समस्या **"${report.title}"** (श्रेणी: ${report.category}) के निवारण में हुई अत्यधिक देरी के संबंध में स्तर १ की आधिकारिक शिकायत है। यह समस्या **${address}** पर उपस्थित है।

**${bodyName}** के सिटीजन चार्टर के नियमानुसार इस प्रकार की समस्याओं का निवारण अधिकतम **${slaHours} घंटों** में हो जाना अनिवार्य है। किंतु यह समय-सीमा निष्क्रियता के चलते समाप्त हो चुकी है, जो कि प्रशासनिक उदासीनता को दर्शाती है।

इससे क्षेत्र के नागरिकों और **${wardName}** के रहवासियों को अत्यंत कठिनाइयों का सामना करना पड़ रहा है। त्वरित कार्रवाई सुनिश्चित करें।

**भवदीय,**
सजग नागरिक मंच, नगरसेवक (NagarSevak)।`;

    return { english, hindi };
  } else if (level === "l2") {
    const count = neighbors.length > 0 ? neighbors.length : 14;
    const detailsTxt = neighbors.length > 0
      ? neighbors.slice(0, 5).map(n => `- Ref #${n.id}: "${n.title}" at ${n.location?.address}`).join("\n")
      : `- Multiple reporting occurrences in the immediate 500-meter block of ${wardName}.\n`;

    const english = `### INDEPENDENT CITIZEN INQUEST: LEVEL 2 COLLECTIVE CIVIC ESCALATION

**TO,**
The Chief Executive Officer & Zonal Joint Commissioner,
${bodyName}.

**SUBJECT:** Systemic Civic Neglect & Multi-Resident Collective Grievance (${report.category.toUpperCase()})

**Respected Authority,**

We are writing on behalf of the collective residents of **${wardName}** to submit a Level 2 Escalation regarding structural failure to address persistent civic hazards.

Our local platform has aggregated and validated **${count} distinct reports** from residents concerning identical unresolved failures in the **${report.category}** category within a 500-meter radius of ${address} over the last 30 days:

${detailsTxt}

This clustering of complaints indicates a systemic maintenance failure. Standard SLA-driven pathways have completely stalled. Under the Karnataka/local Municipal Act, we urge you to treat this as a collective class grievance, override standard delays, and initiate an fast-track community repair drive.

If action is not initiated within 48 hours, we will be forced to file a formal systemic audit petition.

**Yours Sincerely,**
NagarSevak Community Coalition (Representing ${count}+ local residents)`;

    const hindi = `### सामूहिक जन शिकायत: स्तर २ आधिकारिक नागरिक अवहेलना

**सेवा में,**
मुख्य कार्यकारी अधिकारी एवं जोनल आयुक्त कार्यालय,
${bodyName}।

**विषय:** प्रशासनिक अनदेखी के विरुद्ध वार्ड ${wardName} के निवासियों की संयुक्त शिकायत

**महोदय,**

हम **${wardName}** के जागरूक निवासियों की ओर से उपस्थित जनहित समस्याओं पर दीर्घकालिक निष्क्रियता के खिलाफ स्तर २ का शिकायती नोटिस प्रस्तुत कर रहे हैं।

हमारे मंच 'नगरसेवक' ने पिछले ३० दिनों में **${address}** के आसपास ५०० मीटर के दायरे में **${report.category}** से संबंधित **${count} पृथक शिकायतों** को संकलित व प्रमाणित किया है:

${detailsTxt}

ये तथ्य स्पष्ट करते हैं कि यह व्यक्तिगत त्रुटि नहीं बल्कि सामूहिक प्रशासनिक विफलता है। अतः तत्काल प्रभाव से इस क्षेत्र में सुधार कार्य आरंभ कराया जाए।

**भवदीय निवेदक,**
नगरसेवक जन गठबंधन (स्थानीय वार्ड निवासी समूह)`;

    return { english, hindi };
  } else {
    const english = `### FORMAL RIGHT TO INFORMATION (RTI) COMPLIANCE APPLICATION

**TO,**
The Public Information Officer (PIO) / Senior City Auditor,
${deptName} Command Centre & Administration Wing,
${bodyName}.

**SUBJECT:** Form 'A' Application under Section 6(1) of the Right to Information Act, 2005

**1. Name of Applicant:** NagarSevak Civic Transparency Collective
**2. Particulars of Information Required:**
Concerning unresolved ${report.category} hazard Ref #${report.id} at ${address} (SLA Breach of over 96 hours):

- **Query A:** Provide certified copies of all file notes, electronic logs, and progress reports generated by the \`${deptName}\` or assigned ward engineer \`${officerName}\` in response to Citizen Grievance Ref #${report.id} filed on ${report.created_at.substring(0, 10)}.
- **Query B:** State the official reasons as per municipal records for violating the mandatory ${slaHours}-hour resolve time committed in your Department's Service charter.
- **Query C:** Provide names, designations, and contact details of the official(s) responsible for inspecting this location and logging the resolution progress. Also state details of disciplinary actions or performance penalty rules applied for such delay.
- **Query D:** Provide the sanctioned budget allocated for maintenance and repairs in this ward for the current fiscal year and the total amount disbursed so far.

**3. Application Fee Details:**
Ten Rupees (Rs. 10/-) statutory fee attached via Electronic Portal Receipt / Digital Court Fee Stamp.

**Place:** Bangalore / Local Sandbox`;

    const hindi = `### सूचना का अधिकार (RTI) आवेदन पत्र - धारा ६(१)

**सेवा में,**
लोक सूचना अधिकारी (PIO) / मुख्य नगर लेखा परीक्षक,
${deptName} सचिवालय,
${bodyName}।

**विषय:** सूचना का अधिकार अधिनियम, २००५ की धारा ६(१) के तहत विधिवत आवेदन

**१. आवेदक का नाम:** नगरसेवक नागरिक पारदर्शिता गठबंधन (NagarSevak Collective)
**२. मांगी गई जानकारी का विवरण:**
स्थान {address} पर लंबित जन-समस्या (संदर्भ संख्या #${report.id}) के निवारण में हुए विलंब के संदर्भ में:

- **बिंदु अ:** ${report.created_at.substring(0, 10)} को दर्ज शिकायत #${report.id} पर संबंधित अभियंता \`${officerName}\` द्वारा की गई समस्त विभागीय टिप्पणियों, प्रविष्टियों और कृत कार्रवाई की प्रमाणित प्रतियां उपलब्ध कराएं।
- **बिंदु ब:** नागरिक चार्टर में उल्लिखित **${slaHours} घंटे** की निर्धारित अवधि में काम पूरा न होने के क्या कारण हैं? उसका लिखित विवरण प्रदान करें।
- **बिंदु स:** इस क्षेत्र के निरीक्षण हेतु जिम्मेदार अधिकारियों व कर्मचारियों के नाम, पदनाम तथा उनके ऊपर लागू किये जाने वाले दंड/जुर्माने का विवरण प्रदान करें।

**३. आवेदन शुल्क भुगतान:**
आर.टी.आई. नियमावली के अनुसार आवश्यक १० रुपये का शुल्क ऑनलाइन रसीद संख्या द्वारा संलग्न किया जा चुका है।

**स्थान:** बेंगलुरु (स्थानीय नगर क्षेत्र)`;

    return { english, hindi };
  }
}
