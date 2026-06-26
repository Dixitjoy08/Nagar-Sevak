import { exec } from "child_process";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export interface BilingualGrievance {
  english: string;
  hindi: string;
}

/**
 * Invokes the Python-based grievance draft agent or executes fallback template generator.
 */
export async function generateBilingualGrievance(
  title: string,
  description: string,
  category: string,
  jurisdiction: any
): Promise<BilingualGrievance> {
  const payload = {
    title,
    description,
    category,
    jurisdiction
  };

  return new Promise<BilingualGrievance>((resolve) => {
    const scriptPath = path.join(process.cwd(), "server", "agents", "grievance.py");
    // Escaping JSON payload for shell safety
    const payloadStr = JSON.stringify(payload);
    
    // Set up standard exec call. We pass the payload through stdin or safe arg
    const cmd = `python3 "${scriptPath}"`;
    const child = exec(cmd, (error, stdout, stderr) => {
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed && parsed.english && parsed.hindi) {
            console.log("Success generating bilingual grievance via Python agent.");
            resolve(parsed as BilingualGrievance);
            return;
          }
        } catch (parseError) {
          console.warn("Could not parse grievance.py JSON output. Falling back to TS template generator.", stdout);
        }
      } else {
        console.warn("Python grievance execution reported code/stderr errors. Executing fallback template:", stderr);
      }

      // TS native fallback
      resolve(generateFallbackBilingualLetterTS(title, description, category, jurisdiction));
    });

    // Write input payload specifically to stdin
    if (child.stdin) {
      child.stdin.write(payloadStr);
      child.stdin.end();
    }
  });
}

function generateFallbackBilingualLetterTS(
  title: string,
  description: string,
  category: string,
  jurisdiction: any
): BilingualGrievance {
  const bodyName = jurisdiction.body || jurisdiction.body_name || "Municipal Corporation";
  const wardName = jurisdiction.ward || "Local Ward";
  const deptName = jurisdiction.department || "Municipal Grievance Department";
  const officerName = jurisdiction.officer_name || "Ward Commissioner";
  const slaHours = jurisdiction.sla_hours || 48;
  const address = jurisdiction.address || jurisdiction.formatted_address || "Specified Location";
  const pincode = jurisdiction.pincode || "560001";
  const portalUrl = jurisdiction.complaint_portal_url || "https://nagarsevak.gov.in";

  const english = `### FORMAL CIVIL GRIEVANCE PETITION

**To,**
The Office of the ${officerName},
${deptName},
${bodyName},
${wardName},
India - ${pincode}.

**Subject:** Urgent Public Grievance regarding unresolved Live '${category}' - ${title}

**Reference:** Citizen Photo & GIS Evidence Uploaded (Portal: ${portalUrl})

**Date:** June 23, 2026

**Respected Madam/Sir,**

I am writing to draw your urgent attention to a hazardous and disruptive civic issue at the following location:
- **Exact Address/Landmark:** ${address}
- **Issue Category:** ${category.toUpperCase()}
- **Reporter's Description:** ${description}

We have captured and chemically timestamped photographic evidence confirming the severity of this issue. Under the official Citizen Charter and grievance rules of **${bodyName}**, the maximum Service Level Agreement (SLA) time committed for resolving this type of infrastructure grievance is **${slaHours} Hours**.

As a tax-paying citizen and concerned resident of ${wardName}, I formally request you to kindly deploy immediate service personnel to execute necessary repairs and bring this to an orderly resolution before the expiry of the **${slaHours}-hour** SLA window. Public safety and convenience are currently severely compromised.

Thank you. We look forward to your proactive response.

**Yours Sincerely,**
Registered Citizen, NagarSevak Platform.`;

  const hindi = `### आधिकारिक नागरिक शिकायत पत्र

**सेवा में,**
माननीय ${officerName} कार्यालय,
${deptName} प्रभाग,
${bodyName},
${wardName},
भारत - ${pincode}।

**विषय:** लंबित समस्या '${category}' - ${title} के संबंध में तत्काल कार्रवाई हेतु।

**संदर्भ:** संवर्धित नागरिक फोटो एवं जीआईएस (GIS) साक्ष्य (पोर्टल: ${portalUrl})।

**दिनांक:** २३ जून, २०२६

**आदरणीय महोदया/महोदय,**

मैं स्थानीय क्षेत्र में व्याप्त एक गंभीर नागरिक समस्या की ओर आपका त्वरित ध्यान आकर्षित करना चाहता हूँ। यह समस्या निम्नलिखित स्थान पर बनी हुई है:
- **सटीक स्थान/लैंडमार्क:** ${address}
- **शिकायत का प्रकार:** ${category.toUpperCase()}
- **शिकायत का विवरण:** ${description}

हमने इस समस्या की पुष्टि करने वाले सटीक फोटो साक्ष्य संकलित व अपलोड कर दिए हैं। **${bodyName}** के आधिकारिक नागरिक चार्टर और शिकायत निवारण नियमावली के तहत, इस विशिष्ट शिकायत के निवारण हेतु अधिकतम सेवा स्तर समझौता (SLA) अवधि **${slaHours} घंटे** स्वीकृत है।

अतः ${wardName} के एक सजग नागरिक के रूप में, मेरा आपसे विनम्र निवेदन है कि जनहित, जन सुरक्षा और सुगम यातायात को ध्यान में रखते हुए इस **${slaHours}-घंटे** की तय समय सीमा के भीतर तत्काल मरम्मत कार्य या उचित कार्रवाई सुनिश्चित करने के लिए संबंधित कर्मियों को निर्देशित करें।

सहयोग हेतु कोटिशः धन्यवाद।

**भवदीय/भवदीया,**
पंजीकृत नागरिक, नगरसेवक (NagarSevak) मंच।`;

  return { english, hindi };
}
