import { GoogleGenAI } from "@google/genai";
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

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function chatWithMunicipalAgent(history: ChatMessage[], newMessage: string): Promise<string> {
  if (!apiKeyVal) {
    return "Hello! I am SevakAI, your NagarSevak Virtual Assistant. (Note: Gemini API Key is missing, running in demo responder mode). How can I assist you in reporting or tracing issues in your neighborhood today?";
  }

  try {
    const formattedContents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    formattedContents.push({
      role: "user",
      parts: [{ text: newMessage }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `You are SevakAI, the highly helpful, knowledgeable, and empathetic Virtual Civic Assistant of the NagarSevak platform. 
NagarSevak is a citizen-to-municipality coordination platform where users report, discuss, and track local civic grievances (like potholes, sewage leaks, out-of-order streetlights, abandoned garbage).

Your role is to:
1. Explain how to use the platform: Users can report issues, upload locations, upvote other reports to signal severe community impact, and read live municipal updates.
2. Counsel on typical municipal division structures: Support topics related to Roads & Traffic, Water & Sewage, Sanitation & Waste Management, Electricity & Street Lights, Public Parks, and local zoning/security.
3. Offer actionable citizens-advice on how to deal with immediate civic hazards (e.g., if there's a live wire hanging, advise keeping distance and calling emergency fire grids immediately beside filing a ticket).
4. Frame explanations politely, respectfully, and with a tone of municipal pride and civic care. Keep replies concise, structurally clean, and action-oriented. Never break character. Always write in standard clear formatting.`
      }
    });

    return response.text || "I apologize, I didn't get that properly. Can you please elaborate on your civic issue?";
  } catch (error) {
    console.error("Gemini API call failed in chatWithMunicipalAgent:", error);
    return "Error: I am facing connection difficulties right now. However, you can report any civic issue directly via the 'Report Grievance' panel, and we will queue it for automated processing.";
  }
}
