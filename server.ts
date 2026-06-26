import express from "express";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { analyzeComplaint } from "./server/agents/complaintAgent";
import { chatWithMunicipalAgent } from "./server/agents/chatAgent";
import { classifyImageWithGemini, detectDuplicateReportWithGemini } from "./server/agents/classifierAgent";
import { getJurisdictionDetails } from "./server/agents/jurisdictionAgent";
import { generateBilingualGrievance } from "./server/agents/grievanceAgent";
import { generateBilingualEscalation } from "./server/agents/escalationAgent";
import { verifyResolutionWithGemini } from "./server/agents/verifierAgent";
import { 
  getReports, 
  getReportById, 
  createReport, 
  verifyReport, 
  resolveReport, 
  getDashboardStats, 
  getLeaderboard, 
  updateUserStats,
  saveBilingualGrievance,
  updateReport
} from "./server/dbHelper";
import { ReportCategory, ReportStatus } from "./src/types";

dotenv.config();

// Create local uploads storage folder
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Category mapping helper
function mapCategory(title: string, description: string, department: string): ReportCategory {
  const text = (title + " " + description).toLowerCase();
  if (text.includes("pothole") || text.includes("road")) return ReportCategory.POTHOLE;
  if (text.includes("water") || text.includes("leak") || text.includes("pipe")) return ReportCategory.WATER_LEAK;
  if (text.includes("garbage") || text.includes("dump") || text.includes("waste") || text.includes("trash")) return ReportCategory.GARBAGE;
  if (text.includes("streetlight") || text.includes("light") || text.includes("lamp")) return ReportCategory.STREETLIGHT;
  if (text.includes("drain") || text.includes("sewage") || text.includes("clog")) return ReportCategory.DRAINAGE;
  if (text.includes("encroach") || text.includes("illegal") || text.includes("license")) return ReportCategory.ENCROACHMENT;
  
  const dept = department.toLowerCase();
  if (dept.includes("road") || dept.includes("traffic")) return ReportCategory.POTHOLE;
  if (dept.includes("water")) return ReportCategory.WATER_LEAK;
  if (dept.includes("sanitation") || dept.includes("waste")) return ReportCategory.GARBAGE;
  if (dept.includes("electric") || dept.includes("light")) return ReportCategory.STREETLIGHT;
  if (dept.includes("sewage") || dept.includes("drain")) return ReportCategory.DRAINAGE;
  if (dept.includes("security") || dept.includes("license") || dept.includes("encroach")) return ReportCategory.ENCROACHMENT;
  
  return ReportCategory.GARBAGE;
}

// Severity mapper
function getSeverity(priority: "Low" | "Medium" | "High", text: string): number {
  const t = text.toLowerCase();
  let base = 3;
  if (priority === "Low") base = 1;
  if (priority === "Medium") base = 3;
  if (priority === "High") base = 5;

  if (t.includes("urgent") || t.includes("critical") || t.includes("danger") || t.includes("hazard")) {
    base = Math.min(5, base + 1);
  }
  return base;
}

// Letter generator
function generateGrievanceLetter(title: string, description: string, category: string, ward: string): string {
  return `To,
The Ward Officer, Ward ${ward},
NagarSevak Municipal Corporation.

Subject: Formal Grievance Letter regarding ${title}

Respected Sir/Madam,

This is to officially register an issue of concern regarding the category of ${category.toUpperCase()} located at ${ward}.

Details of the concern:
${description}

Requesting your office to inspect and initiate corrective measures under our municipal guidelines at the earliest convenience.

Sincerely,
Concerned Citizen of NagarSevak`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve static uploaded assets
  app.use("/uploads", express.static(uploadDir));

  // --- API ROUTE ENDPOINTS ---

  // GET / — Root route index serving
  app.get("/", (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      const distPath = path.join(process.cwd(), "dist");
      res.sendFile(path.join(distPath, "index.html"));
    } else {
      next(); // Vite dev mode middleware handles index.html serving
    }
  });

  // POST /api/reports — create a new report with image, title, description, lat, lng
  app.post("/api/reports", upload.single("image"), async (req, res) => {
    try {
      const { title, description, lat, lng, address, ward, zone, category, severity, created_by } = req.body;

      if (!title || !description) {
        res.status(400).json({ error: "Missing required report title and description" });
        return;
      }

      // Analyze using AI agent to classify and fetch departments
      const aiAnalysis = await analyzeComplaint(title, description);

      // Extract coordinates
      const latitude = parseFloat(lat) || 12.9716;
      const longitude = parseFloat(lng) || 77.5946;

      let finalCategory = category as ReportCategory;
      let finalSeverity = severity ? parseInt(severity, 10) : undefined;
      let visualDesc: string | undefined = undefined;

      // Run visual classification if a photo is uploaded
      if (req.file) {
        try {
          console.log(`Analyzing uploaded image at: ${req.file.path} with Gemini vision model...`);
          const visualResult = await classifyImageWithGemini(req.file.path, req.file.mimetype);
          if (visualResult) {
            console.log("Vision model classification success details:", visualResult);
            if (!finalCategory) {
              finalCategory = visualResult.category;
            }
            if (finalSeverity === undefined) {
              finalSeverity = visualResult.severity;
            }
            visualDesc = visualResult.description;
          }
        } catch (visionErr) {
          console.error("Non-blocking vision classification failure:", visionErr);
        }
      }

      // Fallbacks if not set by explicit input or vision model
      if (!finalCategory) {
        finalCategory = mapCategory(title, description, aiAnalysis.department);
      }
      if (finalSeverity === undefined) {
        finalSeverity = getSeverity(aiAnalysis.priority, title + " " + description);
      }

      // Check for duplicate reports of same category within 200m
      const allReports = await getReports();
      const nearbyUnresolved = allReports.filter(r => {
        if (r.category !== finalCategory) return false;
        if ((r.status as string) === 'resolved' || (r.status as string) === 'closed') return false;
        if (!r.location) return false;
        const dist = calculateDistanceMeters(latitude, longitude, r.location.lat, r.location.lng);
        return dist <= 200;
      });

      if (nearbyUnresolved.length > 0) {
        try {
          console.log(`Running duplicate detection for new report with ${nearbyUnresolved.length} nearby reports...`);
          const dupResult = await detectDuplicateReportWithGemini(
            req.file?.path,
            req.file?.mimetype,
            description || title,
            nearbyUnresolved
          );

          if (dupResult.is_duplicate && dupResult.duplicate_report_id) {
            console.log(`Duplicate detected! Linking with existing report: ${dupResult.duplicate_report_id}`);
            const existingReport = nearbyUnresolved.find(r => r.id === dupResult.duplicate_report_id);
            if (existingReport) {
              if (!existingReport.similar_reports) {
                existingReport.similar_reports = [];
              }
              const dupInfo = {
                id: "dup_" + Math.random().toString(36).substr(2, 9),
                title: title,
                description: description,
                image_url: req.file ? `/uploads/${req.file.filename}` : undefined,
                created_by: created_by || "anonymous_citizen",
                created_at: new Date().toISOString(),
                analysis: dupResult.analysis
              };
              existingReport.similar_reports.push(dupInfo);
              existingReport.updated_at = new Date().toISOString();
              
              // Increment verification count
              existingReport.community_verifications.count += 1;
              if (created_by && !existingReport.community_verifications.user_ids.includes(created_by)) {
                existingReport.community_verifications.user_ids.push(created_by);
              }
              
              await updateReport(existingReport);
              
              if (created_by) {
                await updateUserStats(created_by, "duplicate");
              }
              
              res.status(200).json({
                ...existingReport,
                _is_duplicate_linked: true,
                _duplicate_message: `Identified as a duplicate of report #${existingReport.id} and successfully merged. ${dupResult.analysis}`
              });
              return;
            }
          }
        } catch (dupErr) {
          console.error("Non-blocking duplicate detection error:", dupErr);
        }
      }

      // Resolve live jurisdiction details via Google Search Grounding & Reverse Geocoding
      console.log(`Resolving jurisdiction details for coordinates (${latitude}, ${longitude}) with category: ${finalCategory}`);
      const jurDetails = await getJurisdictionDetails(latitude, longitude, finalCategory, title, description);
      console.log("Resolved jurisdiction details:", jurDetails);

      const resolvedAddress = address || jurDetails.formatted_address;
      const finalWard = ward || jurDetails.ward || "Ward 42";
      const finalZone = zone || (jurDetails.city ? `${jurDetails.city} ${jurDetails.locality ? jurDetails.locality.split(" ")[0] : "Zone"}` : "Zone East");

      // File path for uploaded image
      const image_url = req.file ? `/uploads/${req.file.filename}` : "https://images.unsplash.com/photo-1599740831244-4161b4df0d76?auto=format&fit=crop&w=600&q=80";

      // Generate bilingual grievance letter using Gemini 2.5 on-the-fly when report is filed
      let bilingualGrievance = undefined;
      try {
        console.log(`Generating formal bilingual grievance letters for category: ${finalCategory}...`);
        bilingualGrievance = await generateBilingualGrievance(title, description, finalCategory, {
          body_name: jurDetails.body_name || "NagarSevak Municipal Corp",
          ward: finalWard,
          department: jurDetails.department || aiAnalysis.department,
          officer_name: jurDetails.officer_name || ("Ward Engineer " + (aiAnalysis.keywords[0]?.toUpperCase() || "Officer")),
          sla_hours: jurDetails.sla_hours || (aiAnalysis.priority === "High" ? 24 : aiAnalysis.priority === "Medium" ? 48 : 72),
          formatted_address: resolvedAddress,
          pincode: jurDetails.pincode || "560001",
          complaint_portal_url: jurDetails.complaint_portal_url
        });
      } catch (gErr) {
        console.error("Non-blocking grievance draft failure:", gErr);
      }

      // Build structured model properties
      const createdReport = await createReport({
        title,
        description,
        category: finalCategory,
        severity: finalSeverity,
        status: ReportStatus.FILED,
        location: {
          lat: latitude,
          lng: longitude,
          address: resolvedAddress,
          ward: finalWard,
          zone: finalZone
        },
        jurisdiction: {
          body: jurDetails.body_name || "NagarSevak Municipal Corp",
          department: jurDetails.department || aiAnalysis.department,
          officer_name: jurDetails.officer_name || ("Ward Engineer " + (aiAnalysis.keywords[0]?.toUpperCase() || "Officer")),
          contact: `+91-${jurDetails.pincode ? `80-${jurDetails.pincode.slice(2, 6)}` : "80-2139"}-4402`,
          sla_hours: jurDetails.sla_hours || (aiAnalysis.priority === "High" ? 24 : aiAnalysis.priority === "Medium" ? 48 : 72),
          complaint_portal_url: jurDetails.complaint_portal_url
        },
        image_url,
        grievance_letter: bilingualGrievance?.english || generateGrievanceLetter(title, description, finalCategory, finalWard),
        bilingual_grievance: bilingualGrievance,
        created_by: created_by || "anonymous_citizen",
        visual_description: visualDesc
      });

      res.status(201).json(createdReport);
    } catch (err: any) {
      console.error("Error creating report:", err);
      res.status(500).json({ error: err.message || "Failed to create report" });
    }
  });

  // GET /api/reports — list all reports, optionally filter by status or category
  app.get("/api/reports", async (req, res) => {
    try {
      const { status, category } = req.query;
      const list = await getReports({
        status: status ? String(status) : undefined,
        category: category ? String(category) : undefined
      });
      res.json(list);
    } catch (err: any) {
      console.error("Error listing reports:", err);
      res.status(500).json({ error: err.message || "Failed to query reports list" });
    }
  });

  // GET /api/reports/:id — get single report with full details
  app.get("/api/reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const report = await getReportById(id);
      if (!report) {
        res.status(404).json({ error: `Report with ID ${id} not found` });
        return;
      }
      res.json(report);
    } catch (err: any) {
      console.error("Error loading single report details:", err);
      res.status(500).json({ error: err.message || "Failed to load individual report" });
    }
  });

  // GET /api/reports/:id/grievance — get high-quality drafted bilingual grievance for advocacy purposes
  app.get("/api/reports/:id/grievance", async (req, res) => {
    try {
      const { id } = req.params;
      const report = await getReportById(id);
      if (!report) {
        res.status(404).json({ error: `Grievance report with ID ${id} not found` });
        return;
      }

      // Generate on-the-fly if not already persisted (useful for retro-active and demo support)
      if (!report.bilingual_grievance) {
        console.log(`Grievance not saved for report ID: ${id}. Generating on-the-fly...`);
        try {
          const bGrievance = await generateBilingualGrievance(
            report.title,
            report.description,
            report.category,
            {
              body_name: report.jurisdiction?.body || "NagarSevak Municipal Corp",
              ward: report.location?.ward || "Local Ward",
              department: report.jurisdiction?.department || "Civic works",
              officer_name: report.jurisdiction?.officer_name || "Zone Officer",
              sla_hours: report.jurisdiction?.sla_hours || 48,
              formatted_address: report.location?.address || "Specified Address",
              pincode: "560001",
              complaint_portal_url: report.jurisdiction?.complaint_portal_url
            }
          );
          report.bilingual_grievance = bGrievance;
          // Persist the newly generated grievance
          await saveBilingualGrievance(id, bGrievance);
        } catch (gErr) {
          console.error("Failed on-the-fly bilingual grievance generation:", gErr);
        }
      }

      res.json({
        id: report.id,
        title: report.title,
        bilingual_grievance: report.bilingual_grievance || {
          english: report.grievance_letter || "English representation not generated yet.",
          hindi: "यह पत्र अभी तक उपलब्ध नहीं है।"
        }
      });
    } catch (err: any) {
      console.error("Error generating/retrieving bilingual grievance:", err);
      res.status(500).json({ error: err.message || "Failed to retrieve grievance letters" });
    }
  });

  // POST /api/reports/:id/verify — community verify a report (increment verification count)
  app.post("/api/reports/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ error: "Missing active reporter/verifier userId parameter" });
        return;
      }
      const updated = await verifyReport(id, userId);
      if (!updated) {
        res.status(404).json({ error: `Report with ID ${id} not found` });
        return;
      }
      res.json(updated);
    } catch (err: any) {
      console.error("Error verifying report:", err);
      res.status(500).json({ error: err.message || "Failed to register verification vote" });
    }
  });

  // POST /api/reports/:id/update — general update for reports (upvotes, comments, status, etc)
  app.post("/api/reports/:id/update", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const report = await getReportById(id);
      if (!report) {
        res.status(404).json({ error: "Report not found" });
        return;
      }
      
      // Merge changes
      const updatedReport = {
        ...report,
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      await updateReport(updatedReport);
      res.json({ success: true, report: updatedReport });
    } catch (err: any) {
      console.error("Error in general report update API:", err);
      res.status(500).json({ error: err.message || "Failed to update report" });
    }
  });

  // Distance calculator helper for Level 2 escalations
  function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dPhi = (lat2 - lat1) * Math.PI / 180;
    const dLambda = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // POST /api/reports/:id/check-sla — check and trigger next escalation tier if SLA breached
  app.post("/api/reports/:id/check-sla", async (req, res) => {
    try {
      const { id } = req.params;
      const report = await getReportById(id);
      if (!report) {
        res.status(404).json({ error: `Grievance report with ID ${id} not found` });
        return;
      }

      // 1. If resolved, do not escalate
      const currentStatus = String(report.status || "").toLowerCase();
      if (currentStatus === "resolved") {
        res.json({ status: "skipped", reason: "Grievance is already resolved.", report });
        return;
      }

      // 2. Calculate SLA deadline
      const createdAtDate = new Date(report.created_at);
      let slaHours = report.jurisdiction?.sla_hours || 48;
      
      // Community verified reports get priority: SLA time window is halved!
      const isCommunityVerified = report.community_verifications && report.community_verifications.count >= 3;
      if (isCommunityVerified) {
        slaHours = Math.max(1, Math.round(slaHours / 2));
      }
      
      const slaDeadline = new Date(createdAtDate.getTime() + slaHours * 60 * 60 * 1000);
      const now = new Date();
      const isSlaBreached = now > slaDeadline;

      if (!isSlaBreached) {
        res.json({ status: "skipped", reason: `SLA is not breached. ${isCommunityVerified ? 'Priority active (SLA hours halved).' : ''} Deadline: ${slaDeadline.toISOString()}`, report });
        return;
      }

      // Determine current escalation level from history logs
      const history = report.escalation_history || [];
      const hasL1 = history.some(log => log.level === "l1");
      const hasL2 = history.some(log => log.level === "l2");
      const hasL3 = history.some(log => log.level === "l3");

      let updated = false;

      // Tier 1: Level 1 Escalation (SLA breached)
      if (!hasL1) {
        console.log(`Triggering L1 Escalation for report: ${report.id}`);
        const draft = await generateBilingualEscalation("l1", report);
        
        report.status = "escalated_l1" as any; // Change to escalated_l1
        report.bilingual_grievance = draft;
        report.grievance_letter = draft.english;
        if (!report.escalation_history) report.escalation_history = [];
        report.escalation_history.push({
          level: "l1",
          timestamp: new Date().toISOString(),
          reason: `Service Level Agreement (SLA) window of ${slaHours} hours expired with zero service resolution.${isCommunityVerified ? ' [Community Verified Priority Escalation]' : ''}`,
          assignedOfficer: report.jurisdiction?.officer_name || "Assigned Officer Reference",
          remarks: draft.english
        });
        updated = true;
      } 
      // Tier 2: Level 2 Escalation (24h after L1, still no action)
      else if (hasL1 && !hasL2) {
        const l1Log = history.find(l => l.level === "l1")!;
        const l1Time = new Date(l1Log.timestamp);
        
        // Priority verified reports get L2 escalation in 12 hours instead of 24
        const l2IntervalHours = isCommunityVerified ? 12 : 24;
        const l2TriggerTime = new Date(l1Time.getTime() + l2IntervalHours * 60 * 60 * 1000);

        if (now > l2TriggerTime) {
          console.log(`Triggering L2 Escalation for report: ${report.id}`);
          // Find neighboring reports (within 500m radius of same category)
          const allReports = await getReports();
          const neighbors = allReports.filter(r => {
            if (r.id === report.id || r.category !== report.category) return false;
            if (!r.location || !report.location) return false;
            const dist = calculateDistanceMeters(
              report.location.lat, 
              report.location.lng, 
              r.location.lat, 
              r.location.lng
            );
            return dist <= 500;
          });

          const draft = await generateBilingualEscalation("l2", report, neighbors);
          report.status = "escalated_l2" as any; // Change to escalated_l2
          report.bilingual_grievance = draft;
          report.grievance_letter = draft.english;
          report.escalation_history.push({
            level: "l2",
            timestamp: new Date().toISOString(),
            reason: `No action taken within ${l2IntervalHours} hours of Level 1 Escalation. Systemic clustering identified (${neighbors.length} matching reports nearby).${isCommunityVerified ? ' [Community Verified Priority Escalation]' : ''}`,
            assignedOfficer: "Zonal Joint Commissioner",
            remarks: draft.english
          });
          updated = true;
          if (report.created_by) {
            await updateUserStats(report.created_by, "escalation_success");
          }
        }
      } 
      // Tier 3: Level 3 Escalation (48h after L2)
      else if (hasL2 && !hasL3) {
        const l2Log = history.find(l => l.level === "l2")!;
        const l2Time = new Date(l2Log.timestamp);
        
        // Priority verified reports get L3 escalation in 24 hours instead of 48
        const l3IntervalHours = isCommunityVerified ? 24 : 48;
        const l3TriggerTime = new Date(l2Time.getTime() + l3IntervalHours * 60 * 60 * 1000);

        if (now > l3TriggerTime) {
          console.log(`Triggering L3 Escalation for report: ${report.id}`);
          const draft = await generateBilingualEscalation("l3", report);
          report.status = "escalated_l3" as any; // Change to escalated_l3
          report.bilingual_grievance = draft;
          report.grievance_letter = draft.english;
          report.escalation_history.push({
            level: "l3",
            timestamp: new Date().toISOString(),
            reason: `Persistent neglect ${l3IntervalHours} hours beyond Level 2 collective escalation. Filing formal RTI Application Form A to Public Information Officer.${isCommunityVerified ? ' [Community Verified Priority Escalation]' : ''}`,
            assignedOfficer: "Public Information Officer (PIO)",
            remarks: draft.english
          });
          updated = true;
        }
      }

      if (updated) {
        await updateReport(report);
        res.json({ status: "escalated", report });
      } else {
        res.json({ status: "no_tier_change", reason: "At latest level or waiting duration threshold.", report });
      }
    } catch (err: any) {
      console.error("Error executing SLA Escalation check:", err);
      res.status(500).json({ error: err.message || "Failed to process SLA check" });
    }
  });

  // POST /api/simulate-escalation — demo endpoint that fast-forwards through all three escalation tiers
  app.post("/api/simulate-escalation", async (req, res) => {
    try {
      const { reportId } = req.body;
      if (!reportId) {
        res.status(400).json({ error: "Missing reportId parameter in simulation body" });
        return;
      }

      const report = await getReportById(reportId);
      if (!report) {
        res.status(404).json({ error: `Grievance report with ID ${reportId} not found` });
        return;
      }

      console.log(`Simulating fast-forward escalation for report: ${report.id}`);

      // Reset logs for clean demo run
      report.escalation_history = [];

      // Create sequence of timestamps backdated to show passage of time
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // 1. Generate L1
      console.log("- Simulating Level 1 Escalation...");
      const l1Draft = await generateBilingualEscalation("l1", report);
      report.escalation_history.push({
        level: "l1",
        timestamp: fourDaysAgo.toISOString(),
        reason: `Service Level Agreement (SLA) limits of ${report.jurisdiction?.sla_hours || 48} hours exceeded. Ward officer reported persistent inactivity.`,
        assignedOfficer: report.jurisdiction?.officer_name || "Assigned Duty Officer",
        remarks: l1Draft.english
      });

      // 2. Generate L2
      console.log("- Simulating Level 2 Escalation...");
      const mockNeighbors = [
        { id: "mock_nb_1", title: `Blocked drain on road`, location: { address: "120m away" } },
        { id: "mock_nb_2", title: `Water stagnation hazard`, location: { address: "240m away" } },
        { id: "mock_nb_3", title: `Sewer overflowing near shop`, location: { address: "410m away" } }
      ] as any[];
      
      const l2Draft = await generateBilingualEscalation("l2", report, mockNeighbors);
      report.escalation_history.push({
        level: "l2",
        timestamp: twoDaysAgo.toISOString(),
        reason: `Zero responsiveness 24 hours after Level 1 notice. Neighborhood aggregation identified 14 reports highlighting systemic failure in immediate block.`,
        assignedOfficer: "Zonal Joint Commissioner",
        remarks: l2Draft.english
      });
      if (report.created_by) {
        await updateUserStats(report.created_by, "escalation_success");
      }

      // 3. Generate L3
      console.log("- Simulating Level 3 Escalation...");
      const l3Draft = await generateBilingualEscalation("l3", report);
      report.escalation_history.push({
        level: "l3",
        timestamp: now.toISOString(),
        reason: "Continued administrative apathy 48 hours after Level 2 petition. Filing formal application under Section 6(1) of RTI Act 2005 for transparency audit.",
        assignedOfficer: "Public Information Officer (PIO)",
        remarks: l3Draft.english
      });

      // Update report status & main grievance letters
      report.status = "escalated_l3" as any;
      report.bilingual_grievance = l3Draft;
      report.grievance_letter = l2Draft.english; // Keep L2 draft content in plain text log
      report.updated_at = now.toISOString();

      await updateReport(report);

      console.log(`Simulation complete for: ${report.id}. Current Status: ${report.status}`);
      res.json({
        message: "Simulation finished successfully. Full escalation chain registered.",
        report
      });
    } catch (err: any) {
      console.error("Failed to run escalation fast-forward simulation:", err);
      res.status(500).json({ error: err.message || "Failed to execute simulation" });
    }
  });

  // POST /api/reports/:id/simulate-verifications — simulate 3 community verifications at once
  app.post("/api/reports/:id/simulate-verifications", async (req, res) => {
    try {
      const { id } = req.params;
      const report = await getReportById(id);
      if (!report) {
        res.status(404).json({ error: `Report with ID ${id} not found` });
        return;
      }

      // Add 3 mock verifiers
      const mockUsers = ["user_sim_1", "user_sim_2", "user_sim_3"];
      if (!report.community_verifications) {
        report.community_verifications = { count: 0, user_ids: [] };
      }
      
      for (const u of mockUsers) {
        if (!report.community_verifications.user_ids.includes(u)) {
          report.community_verifications.count += 1;
          report.community_verifications.user_ids.push(u);
        }
      }

      await updateReport(report);
      res.json(report);
    } catch (err: any) {
      console.error("Failed to run verifications simulation:", err);
      res.status(500).json({ error: err.message || "Failed to simulate verifications" });
    }
  });

  // POST /api/reports/:id/resolve — mark resolved, accept an 'after' image
  app.post("/api/reports/:id/resolve", upload.single("after_image"), async (req, res) => {
    try {
      const { id } = req.params;
      const image_path = req.file ? `/uploads/${req.file.filename}` : "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80";
      
      const report = await getReportById(id);
      if (!report) {
        res.status(404).json({ error: `Report with ID ${id} not found` });
        return;
      }

      const before_image = report.image_url || "https://images.unsplash.com/photo-1599740831244-4161b4df0d76?auto=format&fit=crop&w=600&q=80";
      const after_image = image_path;

      console.log(`Auditing resolution photo for report ${id}. Before: ${before_image}, After: ${after_image}`);
      const verification = await verifyResolutionWithGemini(before_image, after_image); 
      console.log(`Resolution verifier outcome: fixed=${verification.is_fixed}, score=${verification.confidence_score}%`);

      const now = new Date().toISOString();
      report.updated_at = now;

      if (verification.confidence_score > 70) {
        // Auto-approve
        report.status = ReportStatus.RESOLVED;
        report.after_image_url = image_path;
        report.resolved_at = now;
        report.verification_score = verification.confidence_score;
        report.verification_reason = verification.analysis;
        
        // Save database record
        await updateReport(report);
        
        // Double civic score of original creator for a verified resolve
        if (report.created_by) {
          await updateUserStats(report.created_by, "resolved_creator");
        }
        
        res.json({
          status: "approved",
          message: "Resolution verified and auto-approved.",
          confidence_score: verification.confidence_score,
          analysis: verification.analysis,
          report
        });
      } else if (verification.confidence_score >= 30) {
        // Flag for manual review
        report.status = ReportStatus.PENDING_VERIFICATION;
        report.after_image_url = image_path;
        report.verification_score = verification.confidence_score;
        report.verification_reason = verification.analysis;
        
        await updateReport(report);
        
        res.json({
          status: "flagged",
          message: "Resolution flagged for manual officer audit.",
          confidence_score: verification.confidence_score,
          analysis: verification.analysis,
          report
        });
      } else {
        // Reject (< 30%)
        report.last_rejected_verification = {
          timestamp: now,
          confidence_score: verification.confidence_score,
          analysis: verification.analysis,
          after_image_url: image_path
        };
        
        await updateReport(report);
        
        res.status(400).json({
          status: "rejected",
          error: "Verification rejected: The uploaded 'after' image does not appear to show a resolved issue.",
          confidence_score: verification.confidence_score,
          analysis: verification.analysis,
          report
        });
      }
    } catch (err: any) {
      console.error("Error resolving report:", err);
      res.status(500).json({ error: err.message || "Failed to mark issue as resolved" });
    }
  });

  // GET /api/dashboard/stats — return total reports, resolved count, average resolution time, reports by category, reports by status
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (err: any) {
      console.error("Error loading stats metrics:", err);
      res.status(500).json({ error: err.message || "Failed to compile dashboard metrics stats" });
    }
  });

  // GET /api/leaderboard — return top 20 users by civic_score
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await getLeaderboard();
      res.json(leaderboard);
    } catch (err: any) {
      console.error("Error loading civic leaderboard:", err);
      res.status(500).json({ error: err.message || "Failed to generate civic leaderboard rankings" });
    }
  });

  // Legacy analysis & chat endpoints
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title || !description) {
        res.status(400).json({ error: "Missing required fields: title and description" });
        return;
      }
      const analysis = await analyzeComplaint(title, description);
      res.json(analysis);
    } catch (err: any) {
      console.error("Error in analyze endpoint:", err);
      res.status(500).json({ error: err.message || "Failed to analyze complaint" });
    }
  });

  // POST /api/gemini/describe-image — analyze uploaded photo/video to generate title and description
  app.post("/api/gemini/describe-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Missing uploaded image file" });
        return;
      }

      const apiKeyVal = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKeyVal) {
        res.status(500).json({ error: "Gemini API credentials not configured." });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: apiKeyVal,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Data = fileBuffer.toString("base64");

      const imagePart = {
        inlineData: {
          mimeType: req.file.mimetype || "image/jpeg",
          data: base64Data
        }
      };

      const prompt = `Inspect this municipal complaint photo. Generate a professional complaint filing on behalf of a resident:
1. "title": A concise, descriptive, and actionable title (e.g., "Severe street flooding due to clogged storm drain", "Piles of uncollected residential garbage on pedestrian sidewalk"). Keep it simple and direct.
2. "description": A thorough, formal description explaining what the issue is, the potential safety or health hazards it causes to the public, and why it needs immediate municipal intervention. Keep it realistic, respectful, and detailed (2-3 sentences).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          systemInstruction: "You are a professional city ombudsman and civic advocate. Generate standard, respectful public work complaints in strict JSON format based on visual evidence.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "description"]
          }
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);

      res.json({
        title: result.title || "Civic Complaint",
        description: result.description || "Infrastructural issue reported via photo evidence."
      });
    } catch (err: any) {
      console.error("Error in describe-image endpoint:", err);
      res.status(500).json({ error: err.message || "Failed to generate description from image" });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { history, message } = req.body;
      if (!message) {
        res.status(400).json({ error: "Missing required chat message" });
        return;
      }
      const responseText = await chatWithMunicipalAgent(history || [], message);
      res.json({ response: responseText });
    } catch (err: any) {
      console.error("Error in chat endpoint:", err);
      res.status(500).json({ error: err.message || "Failed to complete chat task" });
    }
  });

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NagarSevak web server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server startup error:", err);
});

