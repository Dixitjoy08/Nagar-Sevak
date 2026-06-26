import React, { useState } from "react";
import { Complaint, RoleType } from "../types";
import { db, OperationType, handleDatabaseError, doc, updateDoc, arrayUnion, arrayRemove } from "../db";
import { useLanguage } from "./LanguageContext";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Sparkles, 
  MapPin, 
  Users, 
  Bot, 
  Send, 
  RefreshCw, 
  ArrowRight, 
  Lock,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GrievanceTrackerProps {
  complaints: Complaint[];
  user: any;
  currentRole: RoleType;
  onOpenAuth: () => void;
}

// Helper for category-specific fallback images in case photo fails or is placeholder
const getCategoryFallbackImage = (c: Complaint): string => {
  const dept = (c.department || "").toLowerCase();
  const title = (c.title || "").toLowerCase();
  const desc = (c.description || "").toLowerCase();
  
  const isPothole = dept.includes("road") || dept.includes("pothole") || title.includes("pothole") || desc.includes("pothole");
  const isWater = dept.includes("water") || dept.includes("sewage") || dept.includes("pipe") || title.includes("water") || desc.includes("water") || title.includes("leak") || desc.includes("leak");
  const isGarbage = dept.includes("garbage") || dept.includes("sanitation") || dept.includes("waste") || title.includes("garbage") || desc.includes("garbage") || title.includes("trash") || desc.includes("trash");
  const isLight = dept.includes("light") || dept.includes("electricity") || title.includes("light") || desc.includes("light") || title.includes("wire") || desc.includes("wire");
  const isDrain = dept.includes("drain") || dept.includes("sewage") || title.includes("drain") || desc.includes("drain");
  
  if (isPothole) {
    return "https://images.unsplash.com/photo-1599740831244-4161b4df0d76?auto=format&fit=crop&w=600&q=80";
  }
  if (isWater) {
    return "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80";
  }
  if (isGarbage) {
    return "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80";
  }
  if (isLight) {
    return "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=600&q=80";
  }
  if (isDrain) {
    return "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80";
  }
  return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80";
};

export default function GrievanceTracker({ complaints, user, currentRole, onOpenAuth }: GrievanceTrackerProps) {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simulatingVerifyId, setSimulatingVerifyId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [bilingualLang, setBilingualLang] = useState<Record<string, "en" | "hi">>({});

  // 1. Filtering logic based on Search and All vs Mine
  const filteredComplaints = complaints.filter(c => {
    // Search filter
    const matchesSearch = 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.aiAnalysis?.keywords || []).some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));

    // Mine vs All filter
    const matchesFilter = filterMode === "all" || (user && c.reporterEmail === user.email);

    return matchesSearch && matchesFilter;
  });

  // Sort complaints: Newest first so that latest filings are on top
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Handle Verify Issue
  const handleVerifyIssue = async (e: React.MouseEvent, complaintId: string) => {
    e.stopPropagation(); // Avoid triggering card expand
    if (!user) {
      onOpenAuth();
      return;
    }

    setVerifyingId(complaintId);
    try {
      const response = await fetch(`/api/reports/${complaintId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid || user.email || "guest_user",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit verification request to backend API");
      }
    } catch (err) {
      console.warn("Failed backend verification API, falling back to direct database update:", err);
      // Fallback: Direct database write
      try {
        const email = user.email || "guest@nagarsevak.sandbox";
        const complaint = complaints.find(c => c.id === complaintId);
        if (complaint) {
          const docRef = doc(db, "complaints", complaintId);
          const list = complaint.verifiedBy || [];
          const hasVerified = list.includes(email);

          if (hasVerified) {
            await updateDoc(docRef, {
              verifiedBy: arrayRemove(email)
            });
          } else {
            await updateDoc(docRef, {
              verifiedBy: arrayUnion(email)
            });
          }
        }
      } catch (fErr) {
        console.error("Verification fallback direct database write failed:", fErr);
        try {
          handleDatabaseError(fErr, OperationType.UPDATE, `complaints/${complaintId}`);
        } catch (e) {
          console.warn("Permission handling complete:", e);
        }
      }
    } finally {
      setVerifyingId(null);
    }
  };

  // Handle Simulate 3 Verifications
  const handleSimulateVerifications = async (e: React.MouseEvent, complaintId: string) => {
    e.stopPropagation();
    setSimulatingVerifyId(complaintId);
    try {
      const resp = await fetch(`/api/reports/${complaintId}/simulate-verifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!resp.ok) {
        throw new Error("Failed to simulate verifications");
      }
    } catch (err) {
      console.error("Simulation of verifications failed:", err);
    } finally {
      setSimulatingVerifyId(null);
    }
  };

  // Handle Simulate Escalation
  const handleSimulateEscalation = async (e: React.MouseEvent, complaintId: string) => {
    e.stopPropagation();
    setSimulatingId(complaintId);
    try {
      const resp = await fetch("/api/simulate-escalation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reportId: complaintId })
      });
      if (!resp.ok) {
        throw new Error("Simulation endpoint returned non-ok status");
      }
      const data = await resp.json();
      console.log("Escalation sequence simulated:", data);
    } catch (err) {
      console.error("Escalation simulation failed:", err);
    } finally {
      setSimulatingId(null);
    }
  };

  // Helper to determine status classes and indicators
  const getStageMetadata = (complaint: Complaint) => {
    const status = (complaint.status as string).toLowerCase();

    // Map stages to: Completed, Current, Pending, Time, Description
    const stages = [
      {
        key: "filed",
        label: "Filed",
        description: "Grievance received and cataloged on the public ledger.",
        time: new Date(complaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date(complaint.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        isCompleted: true,
        isCurrent: status === "pending" || status === "filed"
      },
      {
        key: "acknowledged",
        label: "Acknowledged",
        description: "Officer verified details & assigned emergency dispatch.",
        time: status !== "pending" && status !== "filed" 
          ? new Date(new Date(complaint.createdAt).getTime() + 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date(complaint.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
          : "--:--",
        isCompleted: status !== "pending" && status !== "filed",
        isCurrent: status === "reviewed" || status === "acknowledged"
      },
      {
        key: "in_progress",
        label: "In Progress",
        description: "Technicians dispatched to locate and resolve root failure.",
        time: ["in_progress", "in progress", "resolved", "pending_verification", "escalated_l1", "escalated_l2", "escalated_l3"].includes(status)
          ? new Date(new Date(complaint.createdAt).getTime() + 110 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date(complaint.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
          : "--:--",
        isCompleted: ["in_progress", "in progress", "resolved", "pending_verification", "escalated_l1", "escalated_l2", "escalated_l3"].includes(status),
        isCurrent: status === "in_progress" || status === "in progress"
      },
      {
        key: "resolved",
        label: "Resolved",
        description: "Audit complete. Before/after imagery verified via Gemini.",
        time: status === "resolved"
          ? new Date(complaint.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date(complaint.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
          : "--:--",
        isCompleted: status === "resolved",
        isCurrent: status === "resolved" || status === "pending_verification"
      }
    ];

    // Determine if escalated
    const isEscalated = ["escalated_l1", "escalated_l2", "escalated_l3"].includes(status);
    
    const escalationStages = [
      {
        key: "l1",
        label: "Level 1: SLA Breach Notice",
        description: "48h SLA limit breached. Legal notice served to commissioner.",
        isCompleted: ["escalated_l1", "escalated_l2", "escalated_l3"].includes(status),
        isCurrent: status === "escalated_l1"
      },
      {
        key: "l2",
        label: "Level 2: Zonal Collective Mandate",
        description: "Zero response. Multiple local aggregate tickets compiled.",
        isCompleted: ["escalated_l2", "escalated_l3"].includes(status),
        isCurrent: status === "escalated_l2"
      },
      {
        key: "l3",
        label: "Level 3: Sovereign Judicial RTI",
        description: "Formal RTI transparency action initiated against officials.",
        isCompleted: status === "escalated_l3",
        isCurrent: status === "escalated_l3"
      }
    ];

    return { stages, isEscalated, escalationStages };
  };

  return (
    <div className="space-y-6">
      
      {/* 1. COMPACT SEARCH & MINE/ALL FILTER CONTROLS */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder={t("tracker.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0e27]/40 border border-white/5 focus:border-[#00d4aa]/50 focus:ring-1 focus:ring-[#00d4aa]/30 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none transition font-sans placeholder-zinc-500"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 pointer-events-none">
              <span className="text-[10px] font-mono text-zinc-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </div>
          </div>

          {/* Filter Toggle Buttons */}
          <div className="flex items-center space-x-2 bg-[#0a0e27]/60 border border-white/5 rounded-xl p-1">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === "all" 
                  ? "bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/25 font-bold" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t("tracker.allDemands")}</span>
            </button>
            <button
              onClick={() => setFilterMode("mine")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === "mine" 
                  ? "bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/25 font-bold" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{t("tracker.myFiled")}</span>
            </button>
          </div>

        </div>

        {filterMode === "mine" && !user && (
          <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center justify-between">
            <span>{language === "hi" ? "अपनी रिपोर्ट फ़िल्टर करने के लिए आपको साइन इन करना होगा।" : "You must be signed in to filter by your filed reports. Showing dummy sandbox profile."}</span>
            <button 
              onClick={onOpenAuth}
              className="text-xs font-bold underline cursor-pointer hover:text-white uppercase"
            >
              {language === "hi" ? "साइन इन करें" : "Sign In"}
            </button>
          </div>
        )}
      </div>

      {/* 2. LIVE ORDER TRACKER DECK CARD LIST */}
      <div className="space-y-4">
        {sortedComplaints.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center space-y-3">
            <Users className="w-10 h-10 text-zinc-600 stroke-[1.5]" />
            <h5 className="text-sm font-semibold text-zinc-300">{t("tracker.noActive")}</h5>
            <p className="text-xs text-zinc-500 max-w-sm">{t("tracker.noActiveDesc")}</p>
          </div>
        ) : (
          sortedComplaints.map((complaint) => {
            const isExpanded = expandedId === complaint.id;
            const { stages, isEscalated, escalationStages } = getStageMetadata(complaint);
            const verifiedList = complaint.verifiedBy || [];
            const verificationsCount = Math.max(verifiedList.length, complaint.community_verifications?.count || 0);
            const userEmail = user?.email || "guest@nagarsevak.sandbox";
            const isVerifiedByMe = verifiedList.includes(userEmail) || (complaint.community_verifications?.user_ids || []).includes(user?.uid || "");
            const lang = bilingualLang[complaint.id] || "en";

            return (
              <div 
                key={complaint.id}
                onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                className={`glass-card glass-card-hover rounded-2xl transition-all duration-300 border border-white/5 overflow-hidden cursor-pointer flex flex-col ${
                  isExpanded ? "ring-2 ring-[#00d4aa]/30 bg-[#0c1334]/80 shadow-2xl" : "shadow-md hover:border-white/10"
                }`}
              >
                {/* CARD BODY: METADATA & PROGRESS GRID */}
                <div className="p-5 sm:p-6 space-y-6">
                  
                  {/* Row 1: Badges, Title & Department */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-white/5 border border-white/5 text-zinc-300 rounded-md px-2.5 py-0.5 font-mono uppercase text-[9px] tracking-wider">
                          {complaint.department}
                        </span>
                        {isEscalated && (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-md px-2.5 py-0.5 font-mono uppercase text-[9px] font-bold tracking-widest animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />
                            <span>ESCALATED BRANCH LIVE</span>
                          </span>
                        )}
                        {!isEscalated && complaint.status === "Resolved" && (
                          <span className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-md px-2.5 py-0.5 font-mono uppercase text-[9px] font-bold tracking-wider">
                            RESOLVED
                          </span>
                        )}
                        {verificationsCount >= 3 && (
                          <span className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-md px-2.5 py-0.5 font-mono uppercase text-[9px] font-bold tracking-wider flex items-center gap-1 animate-pulse">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Community Verified ✓</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold font-display text-white tracking-tight leading-snug mt-1.5 hover:text-[#00d4aa] transition">
                        {complaint.title}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-1 max-w-2xl">{complaint.description}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">REPORT ID</span>
                      <span className="text-xs font-mono font-bold text-[#00d4aa] block">#{complaint.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Row 2: SWIGGY/ZOMATO DELIVERY STYLE ORDER TIMELINE */}
                  <div className="relative pt-4 pb-2 px-1">
                    
                    {/* Background line behind stage markers */}
                    <div className="absolute top-[28px] left-6 right-6 h-0.5 bg-white/5 z-0 hidden md:block" />

                    {/* Progress tracking markers grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">
                      {stages.map((stage, idx) => {
                        const IconComponent = stage.key === "resolved" ? CheckCircle2 : Clock;
                        return (
                          <div key={stage.key} className="flex md:flex-col items-start md:items-center text-left md:text-center gap-3.5 md:gap-2">
                            
                            {/* Circle Timeline Node */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border ${
                                stage.isCurrent 
                                  ? "bg-[#00d4aa] text-[#0a0e27] border-[#00d4aa] ring-4 ring-[#00d4aa]/30 shadow-[0_0_15px_rgba(0,212,170,0.5)] animate-pulse"
                                  : stage.isCompleted 
                                    ? "bg-[#00d4aa]/10 text-[#00d4aa] border-[#00d4aa]/50"
                                    : "bg-zinc-950 text-zinc-600 border-white/5"
                              }`}>
                                <IconComponent className={`w-4 h-4 ${stage.isCurrent ? "stroke-[2.5]" : ""}`} />
                              </div>
                              
                              {/* Connector line for mobile view */}
                              {idx < 3 && (
                                <div className="absolute top-8 left-4 w-0.5 h-8 bg-white/5 md:hidden z-0" />
                              )}
                            </div>

                            {/* Node Metadata Text */}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 justify-start md:justify-center">
                                <span className={`text-xs font-bold transition-colors ${
                                  stage.isCurrent ? "text-white" : stage.isCompleted ? "text-zinc-200" : "text-zinc-500"
                                }`}>
                                  {stage.label}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {stage.time}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 leading-relaxed md:max-w-[170px] hidden md:block">
                                {stage.description}
                              </p>
                              <p className="text-[10px] text-zinc-400 leading-relaxed md:hidden">
                                {stage.description}
                              </p>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* ESCALATION BRANCH OVERLAY FORK (Visible if Escalated) */}
                    {isEscalated && (
                      <div className="mt-8 md:mt-6 pt-5 border-t border-dashed border-red-500/20 bg-red-500/[0.01] rounded-xl p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                          <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
                            SLA SLA BREACH BRANCH TRIGGERED
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4 md:pl-0">
                          {escalationStages.map((eStage, idx) => (
                            <div key={eStage.key} className="flex items-start gap-2.5">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border text-[10px] font-mono ${
                                eStage.isCurrent 
                                  ? "bg-red-500 text-white border-red-500 ring-2 ring-red-500/20 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                  : eStage.isCompleted 
                                    ? "bg-red-500/10 text-red-400 border-red-500/40"
                                    : "bg-zinc-950 text-zinc-700 border-white/5"
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="space-y-0.5">
                                <h6 className={`text-[11px] font-bold ${
                                  eStage.isCurrent ? "text-red-400" : eStage.isCompleted ? "text-zinc-300" : "text-zinc-500"
                                }`}>
                                  {eStage.label}
                                </h6>
                                <p className="text-[10px] text-zinc-400 leading-relaxed max-w-[220px]">
                                  {eStage.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Row 3: COMMUNITY VERIFICATION BAR & EXPAND INDICATOR */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/5">
                    
                    {/* Verification Panel */}
                    <div className="flex items-center space-x-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                      <Users className="w-4 h-4 text-[#00d4aa]" />
                      <div>
                        <p className="text-[11px] font-medium text-white flex items-center gap-1.5">
                          <span>Community Verification Index:</span>
                          <span className="text-[#00d4aa] font-bold font-mono">
                            {verificationsCount} Residents
                          </span>
                        </p>
                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-mono">
                          Confirming active ward incident report
                        </p>
                      </div>

                      {/* Verify Button */}
                      <button
                        onClick={(e) => handleVerifyIssue(e, complaint.id)}
                        disabled={verifyingId === complaint.id}
                        className={`ml-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                          isVerifiedByMe 
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                            : "bg-[#00d4aa] text-[#0a0e27] hover:bg-[#00d4aa]/90"
                        }`}
                      >
                        {isVerifiedByMe ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                            <span>Verified By You</span>
                          </>
                        ) : (
                          <>
                            <span>Verify Issue</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Expand Trigger */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400 group-hover:text-white">
                      <span>{isExpanded ? "Minimize details" : "Expand tracking details"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>

                  </div>

                </div>

                {/* 3. EXPANDED STAGE INFO: FULL GRIEVANCE LETTER & HISTORIC TRACE */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25 }}
                      onClick={(e) => e.stopPropagation()} // Avoid close on inner clicks
                      className="border-t border-white/5 bg-[#080c21]/95"
                    >
                      <div className="p-5 sm:p-6 space-y-6">
                        
                        {/* Tab Columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Left Column: Full Incident Details */}
                          <div className="space-y-4 text-left">
                            <h5 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
                              Detailed Case Record
                            </h5>
                            
                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3.5">
                              <div>
                                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">REPORT DESCRIPTION</span>
                                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{complaint.description}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-1">
                                <div>
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">GEOGRAPHIC LOCALITY</span>
                                  <span className="text-xs text-zinc-200 font-semibold">{complaint.location}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">PRIORITY</span>
                                  <span className={`text-xs font-bold uppercase ${
                                    complaint.priority === "High" ? "text-red-400" : complaint.priority === "Medium" ? "text-amber-400" : "text-blue-400"
                                  }`}>{complaint.priority}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-1">
                                <div>
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">REPORTER IDENTITY</span>
                                  <span className="text-xs text-zinc-300 font-mono">{complaint.reporterName}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">LAST SYNCED</span>
                                  <span className="text-xs text-zinc-400 font-mono">{new Date(complaint.updatedAt).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Images proof block if they exist */}
                            {(complaint.image_url || complaint.after_image_url) && (
                              <div className="space-y-2">
                                <h6 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                                  Visual Evidence Logs
                                </h6>
                                <div className="grid grid-cols-2 gap-3">
                                  {complaint.image_url && (
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-mono text-zinc-500 uppercase">BEFORE PROOF</span>
                                      <img 
                                        src={complaint.image_url} 
                                        alt="Before" 
                                        className="w-full h-32 object-cover rounded-xl border border-white/5" 
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          const fallback = getCategoryFallbackImage(complaint);
                                          if (target.src !== fallback) {
                                            target.src = fallback;
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                  {complaint.after_image_url && (
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-mono text-[#00d4aa] uppercase font-bold">AFTER RESOLUTION</span>
                                      <img 
                                        src={complaint.after_image_url} 
                                        alt="After" 
                                        className="w-full h-32 object-cover rounded-xl border border-[#00d4aa]/30 shadow-md" 
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          const fallback = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80";
                                          if (target.src !== fallback) {
                                            target.src = fallback;
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Right Column: AI Bilingual Grievance Drafting Letter */}
                          <div className="space-y-4 text-left">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-mono font-bold uppercase tracking-widest text-[#00d4aa] flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                <span>Official Bilingual Advocate Petition</span>
                              </h5>

                              {/* Hindi/English selector tabs */}
                              <div className="flex bg-white/5 border border-white/5 rounded-lg p-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBilingualLang(prev => ({ ...prev, [complaint.id]: "en" }));
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                                    lang === "en" ? "bg-[#00d4aa]/20 text-[#00d4aa]" : "text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  English
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBilingualLang(prev => ({ ...prev, [complaint.id]: "hi" }));
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                                    lang === "hi" ? "bg-[#00d4aa]/20 text-[#00d4aa]" : "text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  हिंदी
                                </button>
                              </div>
                            </div>

                            {/* Letter viewbox */}
                            <div className="bg-[#0a0e27]/80 p-4 border border-white/5 rounded-xl font-mono text-xs text-zinc-300 leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text scrollbar-thin">
                              {lang === "en" 
                                ? (complaint.bilingual_grievance?.english || complaint.grievance_letter || "Official Indian governance format grievance petition is being compiled...") 
                                : (complaint.bilingual_grievance?.hindi || "अनिवार्य तकनीकी कारणों से हिंदी प्रतिलिपि प्रक्रियाधीन है...")}
                            </div>
                          </div>

                        </div>

                        {/* BOTTOM ACTION: ESCALATION CHRON TRACE & SANDBOX TRIGGER */}
                        <div className="pt-4 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                          
                          {/* Escalation Letters History with each letter! */}
                          <div className="bg-[#151d45]/20 border border-white/5 p-4 rounded-xl space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                              <h6 className="text-xs font-mono font-bold uppercase tracking-widest text-[#ff6b35] flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 animate-pulse" />
                                <span>Judiciary Escalation Log & Sovereign Letters</span>
                              </h6>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                Each escalation tier autonomously formats and targets senior jurisdictional authorities with specialized legal grievances.
                              </p>

                              {complaint.escalation_history && complaint.escalation_history.length > 0 ? (
                                <div className="space-y-3 pt-1">
                                  {complaint.escalation_history.map((log, idx) => (
                                    <div key={idx} className="bg-[#0a0e27]/60 p-3 border border-white/5 rounded-xl space-y-2">
                                      <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="font-extrabold text-red-400 uppercase tracking-wider">
                                          {log.level.toUpperCase()} LEVEL TRACE
                                        </span>
                                        <span className="text-zinc-500">
                                          {new Date(log.timestamp).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-200 leading-relaxed">{log.reason}</p>
                                      <div className="text-[10px] font-mono text-zinc-500">
                                        Authority: <span className="text-zinc-300 font-bold">{log.assignedOfficer}</span>
                                      </div>
                                      {log.remarks && (
                                        <div className="bg-[#050716] p-2.5 rounded-lg border border-white/5 text-[10px] leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap text-zinc-400 select-text">
                                          {log.remarks}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-8 text-center border border-dashed border-white/5 rounded-xl text-zinc-500 text-xs font-mono">
                                  No escalation traces logged yet. SLA is within safe guidelines.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Sandbox Fast-Forward Simulator */}
                          <div className="bg-orange-500/[0.02] border border-orange-500/20 p-4 rounded-xl flex flex-col justify-between">
                            <div className="space-y-3 text-left">
                              <h6 className="text-xs font-mono font-bold uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
                                <Bot className="w-4 h-4" />
                                <span>Sandbox Demo Controller</span>
                              </h6>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                Simulate chronological days passing. Bypass wait intervals instantly to stress-test our autonomous Gemini advocacy letters and watch the tracking branches fork visually in real-time.
                              </p>
                            </div>

                            <div className="pt-4 flex items-center justify-end">
                              <button
                                onClick={(e) => handleSimulateVerifications(e, complaint.id)}
                                disabled={simulatingVerifyId === complaint.id}
                                className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-2 cursor-pointer mr-2 animate-pulse"
                              >
                                {simulatingVerifyId === complaint.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Simulating...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Simulate 3 Verifications</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={(e) => handleSimulateEscalation(e, complaint.id)}
                                disabled={simulatingId === complaint.id}
                                className="bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-2 cursor-pointer"
                              >
                                {simulatingId === complaint.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Compiling Legal Letters...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Simulate SLA Escalation (L1 → L3)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
