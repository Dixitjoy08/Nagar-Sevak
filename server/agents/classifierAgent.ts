import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";
import { ReportCategory } from "../../src/types";

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

export interface VisualClassificationResult {
  category: ReportCategory;
  severity: number;
  description: string;
}

/**
 * Classifies an uploaded citizen-reported photo using the fast and robust gemini-3.5-flash model.
 * @param imagePath The local absolute file system path of the uploaded image file.
 * @param mimeType The file MIME type (e.g., image/jpeg or image/png).
 * @returns An object containing the category, severity, and visual description, or null upon failure or missing credentials.
 */
export async function classifyImageWithGemini(imagePath: string, mimeType: string): Promise<VisualClassificationResult | null> {
  if (!apiKeyVal) {
    console.warn("Neither GOOGLE_API_KEY nor GEMINI_API_KEY is configured. Skipping visual classifier API request.");
    return null;
  }

  try {
    if (!fs.existsSync(imagePath)) {
      console.warn(`Uploaded file not found physically to execute visual audit: ${imagePath}`);
      return null;
    }

    // Read file payload and convert to Base64
    const fileBuffer = fs.readFileSync(imagePath);
    if (fileBuffer.length < 100) {
      console.warn(`Uploaded file at ${imagePath} is too small (${fileBuffer.length} bytes) to be a valid photo. Skipping vision classifier API request.`);
      return null;
    }
    const base64Data = fileBuffer.toString("base64");

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: base64Data
      }
    };

    const textPart = {
      text: `You are an expert AI Municipal Auditor. Carefully inspect the provided photo of a citizen complaint. 
Assess the photo and output your findings:
1. Classify the core issue into one of exactly six categories: 'pothole', 'water_leak', 'garbage', 'streetlight', 'drainage', or 'encroachment'.
2. Rate its visual severity on a scale of 1 to 5 (where 1 is minor/annoyance, and 5 is extreme public hazard/danger/structural disaster).
3. Generate a professional and accurate one-line description of exactly what is visually observed in the photo.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: "You are a professional city auditor analyzing photos of infrastructural damage or municipal citizen complaints. Report your findings in strict JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: 'pothole', 'water_leak', 'garbage', 'streetlight', 'drainage', or 'encroachment'."
            },
            severity: {
              type: Type.INTEGER,
              description: "Integer value from 1 to 5."
            },
            description: {
              type: Type.STRING,
              description: "A professional and clean single-sentence description of the visual scene."
            }
          },
          required: ["category", "severity", "description"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    // Normalize category
    let normalizedCategory = ReportCategory.GARBAGE;
    const catLower = String(result.category).toLowerCase().trim().replace("-", "_").replace(" ", "_");
    if (Object.values(ReportCategory).includes(catLower as ReportCategory)) {
      normalizedCategory = catLower as ReportCategory;
    } else {
      // Direct substring match as fallback
      for (const cat of Object.values(ReportCategory)) {
        if (catLower.includes(cat)) {
          normalizedCategory = cat;
          break;
        }
      }
    }

    // Normalize severity
    let normalizedSeverity = Number(result.severity) || 3;
    normalizedSeverity = Math.max(1, Math.min(5, normalizedSeverity));

    return {
      category: normalizedCategory,
      severity: normalizedSeverity,
      description: result.description || "Infrastructural issue reported."
    };

  } catch (error) {
    console.error("Gemini API visual classification failed:", error);
    return null;
  }
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  duplicate_report_id: string | null;
  confidence_score: number;
  analysis: string;
}

export async function detectDuplicateReportWithGemini(
  imagePath: string | undefined,
  mimeType: string | undefined,
  newDesc: string,
  nearbyReports: any[]
): Promise<DuplicateCheckResult> {
  if (!apiKeyVal) {
    console.warn("Neither GOOGLE_API_KEY nor GEMINI_API_KEY is configured. Skipping Gemini duplicate detection.");
    return {
      is_duplicate: false,
      duplicate_report_id: null,
      confidence_score: 0,
      analysis: "No API key configured for duplicate detection comparison."
    };
  }

  if (nearbyReports.length === 0) {
    return {
      is_duplicate: false,
      duplicate_report_id: null,
      confidence_score: 0,
      analysis: "No nearby reports to compare."
    };
  }

  try {
    let imagePart: any = null;
    if (imagePath && fs.existsSync(imagePath)) {
      const fileBuffer = fs.readFileSync(imagePath);
      if (fileBuffer.length >= 100) {
        const base64Data = fileBuffer.toString("base64");
        imagePart = {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: base64Data
          }
        };
      } else {
        console.warn(`Duplicate detector: file at ${imagePath} is too small (${fileBuffer.length} bytes) to be a valid photo. Performing text-only duplicate analysis.`);
      }
    }

    const reportsContext = nearbyReports.map(r => 
      `- ID: ${r.id}\n  Title: ${r.title}\n  Description: ${r.description}\n  Visual Description: ${r.visual_description || 'N/A'}`
    ).join("\n\n");

    const textPart = {
      text: `You are an expert municipal auditor in charge of duplicate detection. 
A citizen has reported a new issue. Here are its details:
New Description: ${newDesc}

Here is a list of nearby unresolved reports of the SAME category:
${reportsContext}

Your task is to analyze the provided photo of the new report and compare it with the descriptions and visual properties of the nearby existing reports. Determine if this new report represents the EXACT SAME physical issue/incident (e.g., the same pothole, same pile of garbage, same broken streetlight) or if it is a separate, distinct issue.
If it is a duplicate, identify which report ID it matches.`
    };

    const parts = imagePart ? [imagePart, textPart] : [textPart];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: "You are an expert AI municipal duplicate detector. Compare visual evidence and text descriptions to flag duplicates accurately. Return your findings in strict JSON format matching the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_duplicate: {
              type: Type.BOOLEAN,
              description: "True if the new report is a duplicate of one of the nearby existing reports, False otherwise."
            },
            duplicate_report_id: {
              type: Type.STRING,
              nullable: true,
              description: "The ID of the existing report that this is a duplicate of. Must be one of the IDs provided in the nearby reports list, or null if is_duplicate is False."
            },
            confidence_score: {
              type: Type.INTEGER,
              description: "Confidence score of duplicate detection from 0 to 100."
            },
            analysis: {
              type: Type.STRING,
              description: "A short explanation of why this is or isn't a duplicate, comparing the descriptions and visual characteristics."
            }
          },
          required: ["is_duplicate", "confidence_score", "analysis"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    return {
      is_duplicate: !!result.is_duplicate,
      duplicate_report_id: result.duplicate_report_id || null,
      confidence_score: Number(result.confidence_score) || 0,
      analysis: result.analysis || "Analysis parsed successfully."
    };
  } catch (error) {
    console.error("Gemini API duplicate detection failed:", error);
    return {
      is_duplicate: false,
      duplicate_report_id: null,
      confidence_score: 0,
      analysis: `Duplicate check error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
