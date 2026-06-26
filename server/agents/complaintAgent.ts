import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKeyVal = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: apiKeyVal,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export interface ComplaintAnalysis {
  department: string;
  priority: "Low" | "Medium" | "High";
  reasoning: string;
  summary: string;
  keywords: string[];
  suggestedAction: string;
}

export async function analyzeComplaint(title: string, description: string): Promise<ComplaintAnalysis> {
  if (!apiKeyVal) {
    console.warn("Neither GOOGLE_API_KEY nor GEMINI_API_KEY is configured. Falling back to simple heuristic analysis.");
    return getFallbackAnalysis(title, description);
  }

  try {
    const prompt = `Analyze the following municipal/city issue reported by a citizen.

Complaint Title: ${title}
Complaint Description: ${description}

Categorize the issue into one of these departments:
1. Roads & Traffic (potholes, traffic lights, broken sidewalks, street planning)
2. Water & Sewage (water leaks, clogged gutters, sewage drainage, water supply)
3. Sanitation & Waste Management (garbage piles, illegal dumping, public bins, recycling)
4. Electricity & Street Lights (broken streetlamps, hanging wires, power outages, electrical risks)
5. Public Parks & Ecology (overgrown lawns, broken park benches, fallen trees, environmental pollution)
6. Security & Licensing (unauthorized construction, illegal parking, public security, animal control)

Assign a Priority (Low, Medium, or High) based on public safety impact, urgency, and accessibility hurdles.
Extract 3-5 keywords or tags.
Summarize the core problem in 1 brief sentence.
State a recommended action for the department's team.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an AI Municipal Routing Expert for NagarSevak. Your job is to strictly analyze raw citizen complaints and output clear, valid classification details.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            department: {
              type: Type.STRING,
              description: "Must be exactly one of the six categories: 'Roads & Traffic', 'Water & Sewage', 'Sanitation & Waste Management', 'Electricity & Street Lights', 'Public Parks & Ecology', or 'Security & Licensing'."
            },
            priority: {
              type: Type.STRING,
              description: "Must be 'Low', 'Medium', or 'High'."
            },
            reasoning: {
              type: Type.STRING,
              description: "A professional 2-3 sentence explanation of the department selection and priority choice."
            },
            summary: {
              type: Type.STRING,
              description: "A 1-sentence brief summary of the exact complaint."
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of 3 to 5 relevant technical tags/keywords of the issue."
            },
            suggestedAction: {
              type: Type.STRING,
              description: "A technical action item indicating what the municipal field worker should inspect or resolve first."
            }
          },
          required: ["department", "priority", "reasoning", "summary", "keywords", "suggestedAction"]
        }
      }
    });

    const text = response.text || "";
    return JSON.parse(text) as ComplaintAnalysis;
  } catch (error) {
    console.error("Gemini API call failed in ComplaintAgent:", error);
    return getFallbackAnalysis(title, description);
  }
}

function getFallbackAnalysis(title: string, description: string): ComplaintAnalysis {
  const t = (title + " " + description).toLowerCase();

  let department = "Roads & Traffic";
  let priority: "Low" | "Medium" | "High" = "Medium";
  let keywords = ["citizen-report", "municipal-general"];
  let suggestedAction = "Dispatch field officer for on-site validation.";

  if (t.includes("pothole") || t.includes("road") || t.includes("sidewalk") || t.includes("traffic")) {
    department = "Roads & Traffic";
    keywords.push("road-repair", "highway");
    suggestedAction = "Mobilize road filling crew to inspect road damage.";
  } else if (t.includes("water") || t.includes("sewage") || t.includes("drain") || t.includes("pipe") || t.includes("clog")) {
    department = "Water & Sewage";
    keywords.push("leakage", "plumbing");
    suggestedAction = "Deploy plumbing unit to verify pressure and locate structural cracks/blockages.";
    priority = "High";
  } else if (t.includes("garbage") || t.includes("dump") || t.includes("waste") || t.includes("trash") || t.includes("bin")) {
    department = "Sanitation & Waste Management";
    keywords.push("cleansing", "rubbish");
    suggestedAction = "Reroute waste collection vehicle for priority cleanup.";
  } else if (t.includes("light") || t.includes("electricity") || t.includes("lamp") || t.includes("power") || t.includes("wire")) {
    department = "Electricity & Street Lights";
    keywords.push("lighting", "grid-repair");
    suggestedAction = "Contact electricity board technicians to fix faulty cables or replace bulbs.";
    priority = "High";
  } else if (t.includes("tree") || t.includes("park") || t.includes("garden") || t.includes("branch")) {
    department = "Public Parks & Ecology";
    keywords.push("horticulture", "cleancity");
    suggestedAction = "Dispatch landscaping and tree maintenance crew.";
  } else if (t.includes("dog") || t.includes("stray") || t.includes("licence") || t.includes("security") || t.includes("encroach") || t.includes("parking")) {
    department = "Security & Licensing";
    keywords.push("enforcement", "compliaee");
    suggestedAction = "Send enforcement units or ward inspectors to audit permissions.";
  }

  return {
    department,
    priority,
    reasoning: "Heuristic-based local classification based on keywords in issue description.",
    summary: title.substring(0, 80),
    keywords,
    suggestedAction
  };
}
