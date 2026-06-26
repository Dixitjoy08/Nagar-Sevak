import React, { useState } from "react";
import { Complaint, Comment, RoleType } from "../types";
import { db, OperationType, handleFirestoreError, doc, updateDoc } from "../db";
import { 
  Flame, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Cpu,
  Users,
  Camera
} from "lucide-react";

interface GrievanceFeedProps {
  complaints: Complaint[];
  user: any;
  currentRole: RoleType;
  onOpenAuth: () => void;
}

const DEPARTMENTS = [
  "All",
  "Roads & Traffic",
  "Water & Sewage",
  "Sanitation & Waste Management",
  "Electricity & Street Lights",
  "Public Parks & Ecology",
  "Security & Licensing"
];

const STATUS_OPTIONS = ["All", "Pending", "Reviewed", "In Progress", "Resolved"];
const PRIORITY_OPTIONS = ["All", "High", "Medium", "Low"];

export default function GrievanceFeed({ complaints, user, currentRole, onOpenAuth }: GrievanceFeedProps) {
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [sortBy, setSortBy] = useState<"votes" | "date">("votes");

  // Expanded card state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New comment state
  const [commentText, setCommentText] = useState("");
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [grievanceLang, setGrievanceLang] = useState<Record<string, 'en' | 'hi'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<Record<string, { text: string; type: 'success' | 'info' | 'error' }>>({});
  
  // Vision verification states
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    id: string;
    status: "approved" | "flagged" | "rejected";
    message: string;
    confidence_score: number;
    analysis: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifierError, setVerifierError] = useState<string | null>(null);

  // Render Status styling helper
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Resolved":
      case "resolved":
        return "bg-emerald-950/80 text-emerald-400 border-emerald-900";
      case "In Progress":
      case "in_progress":
        return "bg-[#1c1917] text-[#fb923c] border-[#7c2d12]/60 animate-pulse";
      case "Reviewed":
      case "acknowledged":
        return "bg-blue-950/40 text-blue-400 border-blue-900/40";
      case "escalated_l1":
      case "ESCALATED_L1":
        return "bg-yellow-950/50 text-yellow-400 border-yellow-800/40";
      case "escalated_l2":
      case "ESCALATED_L2":
        return "bg-orange-950/50 text-orange-400 border-orange-850/40 font-extrabold animate-pulse";
      case "escalated_l3":
      case "ESCALATED_L3":
        return "bg-red-950/70 text-red-400 border-red-800/40 font-black uppercase shadow-lg shadow-red-950/10";
      case "pending_verification":
      case "PENDING_VERIFICATION":
        return "bg-amber-950/40 text-amber-500 border-amber-900/40 animate-pulse";
      default:
        return "bg-[#09090b] text-[#71717a] border-[#27272a]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Resolved":
      case "resolved":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "In Progress":
      case "in_progress":
        return <Clock className="w-3.5 h-3.5 text-[#fb923c] animate-pulse" />;
      case "Reviewed":
      case "acknowledged":
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />;
      case "escalated_l1":
      case "ESCALATED_L1":
      case "escalated_l2":
      case "ESCALATED_L2":
      case "escalated_l3":
      case "ESCALATED_L3":
        return <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />;
      case "pending_verification":
      case "PENDING_VERIFICATION":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-red-400 border-red-950/50 bg-red-950/20";
      case "Medium":
        return "text-amber-400 border-amber-950/50 bg-amber-950/20";
      default:
        return "text-blue-400 border-blue-950/50 bg-blue-950/20";
    }
  };

  // Upvote complaint handler
  const handleUpvote = async (complaintId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      onOpenAuth();
      return;
    }

    const email = user.email || `guest@nagarsevak.sandbox`;
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    try {
      const docRef = doc(db, "complaints", complaintId);
      const list = complaint.upvotedBy || [];
      const hasUpvoted = list.includes(email);

      let updatedList = [];
      let updatedVotes = complaint.upvotes || 0;

      if (hasUpvoted) {
        // User is removing their upvote
        updatedList = list.filter(e => e !== email);
        updatedVotes = Math.max(0, updatedVotes - 1);
      } else {
        // Adding upvote
        updatedList = [...list, email];
        updatedVotes += 1;
      }

      await updateDoc(docRef, {
        upvotes: updatedVotes,
        upvotedBy: updatedList
      });
    } catch (err) {
      console.error("Upvote adjustment failed:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `complaints/${complaintId}`);
      } catch (e) {
        console.warn("Upvoting write check wrapper processed:", e);
      }
    }
  };

  // Change complaint status (Official role only)
  const handleStatusChange = async (complaintId: string, event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value;
    try {
      const docRef = doc(db, "complaints", complaintId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Status modify failed:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `complaints/${complaintId}`);
      } catch (e) {
        console.warn("Status modify check wrapper processed:", e);
      }
    }
  };

  // Trigger fast-forward escalation simulator sequence (Sandbox Demo Tool)
  const handleSimulateEscalation = async (complaintId: string) => {
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
      console.log("Escalation sequence simulated successfully:", data);
    } catch (err) {
      console.error("Escalation simulation failed:", err);
    } finally {
      setSimulatingId(null);
    }
  };

  // Trigger real-time SLA breach validation check (Single tier step-forward escalation)
  const handleCheckSla = async (complaintId: string) => {
    setSimulatingId(complaintId);
    try {
      const resp = await fetch(`/api/reports/${complaintId}/check-sla`, {
        method: "POST"
      });
      if (!resp.ok) {
        throw new Error("Check SLA endpoint returned non-ok status");
      }
      const data = await resp.json();
      console.log("SLA valuation audited:", data);
      if (data.status === "skipped") {
        setAuditStatus(prev => ({
          ...prev,
          [complaintId]: {
            text: `SLA check performed: ${data.reason}`,
            type: "info"
          }
        }));
      } else if (data.status === "no_tier_change") {
        const lastLvl = data.report?.escalation_history?.[data.report.escalation_history.length - 1]?.level?.toUpperCase() || "N/A";
        setAuditStatus(prev => ({
          ...prev,
          [complaintId]: {
            text: `SLA has breached! Wait-time window is active for next levels. Last logged escalation level: ${lastLvl}`,
            type: "info"
          }
        }));
      } else {
        setAuditStatus(prev => ({
          ...prev,
          [complaintId]: {
            text: `SLA BREACH CONFIRMED! Escalation status upgraded: ${data.report?.status?.toUpperCase()}`,
            type: "success"
          }
        }));
      }
    } catch (err) {
      console.error("SLA breach valuation failed:", err);
      setAuditStatus(prev => ({
        ...prev,
        [complaintId]: {
          text: "Error occurred validating SLA deadlines.",
          type: "error"
        }
      }));
    } finally {
      setSimulatingId(null);
    }
  };

  // Submit and verify resolution using Gemini Vision
  const handleResolveWithPhoto = async (complaintId: string) => {
    if (!afterImageFile) return;
    setIsVerifying(true);
    setVerifierError(null);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append("after_image", afterImageFile);

      const resp = await fetch(`/api/reports/${complaintId}/resolve`, {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        throw new Error(text || "Visual verification server returned an invalid non-JSON response.");
      }

      if (!resp.ok) {
        setVerificationResult({
          id: complaintId,
          status: "rejected",
          message: data.error || "The image was rejected by municipal vision audit.",
          confidence_score: data.confidence_score || 0,
          analysis: data.analysis || "The uploaded resolution photo does not correspond to a fixed issue."
        });
      } else {
        setVerificationResult({
          id: complaintId,
          status: data.status,
          message: data.message,
          confidence_score: data.confidence_score,
          analysis: data.analysis
        });
        setAfterImageFile(null); // Clear selected file upon success
      }
    } catch (err: any) {
      console.error("Resolve error:", err);
      setVerifierError(err.message || "Failed to reach visual verification server.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit comment details
  const handleAddComment = async (complaintId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    setCommentingId(complaintId);

    try {
      const timestamp = new Date().toISOString();
      const newComment: Comment = {
        id: `com_${Math.random().toString(36).substring(2, 9)}`,
        authorName: user.displayName || "Resident Guest",
        authorEmail: user.email || "guest@nagarsevak.sandbox",
        text: commentText.trim(),
        createdAt: timestamp,
        isOfficial: currentRole === "officer"
      };

      const docRef = doc(db, "complaints", complaintId);
      const existingComments = complaint.comments || [];

      await updateDoc(docRef, {
        comments: [...existingComments, newComment],
        updatedAt: timestamp
      });

      setCommentText("");
    } catch (err) {
      console.error("Failed storing comment:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `complaints/${complaintId}`);
      } catch (e) {
        console.warn("Comments store check wrapper processed:", e);
      }
    } finally {
      setCommentingId(null);
    }
  };

  // Filtering list algorithms
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.aiAnalysis?.keywords || []).some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDept = selectedDept === "All" || c.department === selectedDept;
    const matchesStatus = selectedStatus === "All" || c.status === selectedStatus;
    const matchesPriority = selectedPriority === "All" || c.priority === selectedPriority;

    return matchesSearch && matchesDept && matchesStatus && matchesPriority;
  });

  // Sorting
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    if (sortBy === "votes") {
      const votesDiff = (b.upvotes || 0) - (a.upvotes || 0);
      if (votesDiff !== 0) return votesDiff;
    }
    // Fallback or explicit date sorting
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      
      {/* Filtering and Query Engine Panel */}
      <div className="glass-card rounded-xl p-4 sm:p-5 shadow-lg space-y-4 border border-white/5">
        
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search Query */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search reports by title, description, or AI keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0e27]/40 border border-white/5 focus:border-[#00d4aa]/50 focus:ring-1 focus:ring-[#00d4aa]/30 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition"
            />
          </div>

          {/* Sort Controller */}
          <div className="flex items-center space-x-2 bg-[#0a0e27]/40 border border-white/5 rounded-xl p-1">
            <button
              onClick={() => setSortBy("votes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                sortBy === "votes" 
                  ? "bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/25 font-bold" 
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              UPVOTES (CRITICAL)
            </button>
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                sortBy === "date" 
                  ? "bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/25 font-bold" 
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              NEWEST FIRST
            </button>
          </div>

        </div>

        {/* Filters Select Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5">
          
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 font-mono">Division</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-[#0a0e27]/80 border border-white/5 text-[#fafafa] rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#00d4aa]/50 focus:outline-none cursor-pointer"
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept} className="bg-[#0b102b] text-white">{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 font-mono">Audit Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#0a0e27]/80 border border-white/5 text-[#fafafa] rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#00d4aa]/50 focus:outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map(st => (
                <option key={st} value={st} className="bg-[#0b102b] text-white">{st === 'All' ? 'All Statuses' : st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 font-mono">Severity Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-[#0a0e27]/80 border border-white/5 text-[#fafafa] rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#00d4aa]/50 focus:outline-none cursor-pointer"
            >
              {PRIORITY_OPTIONS.map(pr => (
                <option key={pr} value={pr} className="bg-[#0b102b] text-white">{pr === 'All' ? 'All Priorities' : `${pr} Priority`}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Grid Results count */}
      <p className="text-xs text-[#71717a] font-mono pl-1">
        Found {sortedComplaints.length} tickets matching configuration parameters.
      </p>

      {/* Grievance reports list cards */}
      <div className="space-y-4">
        {sortedComplaints.map(complaint => {
          const isExpanded = expandedId === complaint.id;
          const userEmail = user?.email || `guest@nagarsevak.sandbox`;
          const hasUpvoted = (complaint.upvotedBy || []).includes(userEmail);

          return (
            <div 
              key={complaint.id}
              className={`glass-card glass-card-hover rounded-xl transition shadow-xl overflow-hidden ${
                isExpanded ? 'border-[#00d4aa]/30 ring-1 ring-[#00d4aa]/15 bg-[#00d4aa]/5' : 'border-white/5'
              }`}
            >
              
              {/* Card Header Primary (Always visible) */}
              <div 
                onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
              >
                
                <div className="space-y-2.5 flex-1">
                  
                  {/* Category badgess row */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className="bg-white/5 border border-white/5 text-zinc-300 roundedpx-2.5 py-0.5 font-mono uppercase px-2 py-0.5">
                      {complaint.department}
                    </span>
                    
                    <span className={`border rounded px-2 py-0.5 font-mono uppercase ${getPriorityStyle(complaint.priority)}`}>
                      {complaint.priority} Priority
                    </span>

                    {complaint.aiAnalysis && (
                      <span className="bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20 rounded px-2 py-0.5 flex items-center space-x-1 font-sans">
                        <Sparkles className="w-3 h-3 text-[#00d4aa]" />
                        <span className="text-[10px] font-mono tracking-widest">AI ROUTE</span>
                      </span>
                    )}
                  </div>

                  {/* Complaint Title */}
                  <h4 className="text-base font-bold font-display text-white group-hover:text-[#00d4aa] transition leading-snug">
                    {complaint.title}
                  </h4>

                  {/* Meta: Reporter display and timestamp */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-[#71717a] font-medium">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#71717a]" />
                      <span className="text-zinc-300">{complaint.location}</span>
                    </span>
                    
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-[#71717a]" />
                      <span>{new Date(complaint.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                    </span>
                    
                    <span className="flex items-center space-x-1.5 font-mono text-[10px]">
                      <span>Reporter: {complaint.reporterName}</span>
                    </span>
                  </div>

                </div>

                {/* Right Control Actions (Status & Upvote Indicator) */}
                <div className="flex items-center space-x-4 self-end sm:self-auto border-t sm:border-t-0 border-[#27272a]/50 pt-3 sm:pt-0 justify-between sm:justify-start">
                  
                  {/* Status Indicator */}
                  <div className="flex items-center space-x-2">
                    <span className={`border text-[11px] font-semibold tracking-wider uppercase rounded-xl px-3 py-1 flex items-center space-x-2 ${getStatusBadgeStyles(complaint.status)}`}>
                      {getStatusIcon(complaint.status)}
                      <span>{complaint.status}</span>
                    </span>
                  </div>

                  {/* Upvote Button Module */}
                  <button
                    onClick={(e) => handleUpvote(complaint.id, e)}
                    className={`flex items-center space-x-2 border rounded-xl px-3.5 py-1.5 transition text-xs font-bold cursor-pointer ${
                      hasUpvoted 
                        ? 'bg-blue-950/60 border-blue-800 text-blue-400 shadow-md shadow-blue-950/20' 
                        : 'bg-[#09090b] border border-[#27272a] text-[#71717a] hover:text-blue-400 hover:border-blue-900'
                    }`}
                    title={hasUpvoted ? "Remove critical weight upvote" : "Mark as high civic importance"}
                  >
                    <Flame className={`w-4 h-4 ${hasUpvoted ? 'fill-blue-500 stroke-blue-500' : ''}`} />
                    <span>{complaint.upvotes || 0}</span>
                  </button>

                  {/* Accordion pointer */}
                  <div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#71717a]" /> : <ChevronDown className="w-4 h-4 text-[#71717a]" />}
                  </div>

                </div>

              </div>

              {/* Accordion Extended Context panel (Visible when expanded) */}
              {isExpanded && (
                <div className="border-t border-[#27272a] bg-[#0d0d0f] p-5 sm:p-6 space-y-6">
                  
                  {/* Section 1: Detailed Description */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest font-mono">Detailed Citizen Report</h5>
                    <p className="text-sm font-medium text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {complaint.description}
                    </p>
                  </div>

                  {/* Section 1.5: Multi-Resident Collective Reports */}
                  {complaint.similar_reports && complaint.similar_reports.length > 0 && (
                    <div className="bg-[#00d4aa]/5 border border-[#00d4aa]/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center space-x-2 text-[#00d4aa] font-bold text-xs uppercase tracking-wider">
                        <Users className="w-4 h-4 text-[#00d4aa]" />
                        <span>{complaint.similar_reports.length + 1} Residents Reported This Same Issue</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Gemini duplicate detection has identified and consolidated multiple distinct citizen complaints about this exact physical incident into a single active ticket to prioritize resources.
                      </p>
                      
                      <div className="space-y-3 border-l border-[#00d4aa]/30 pl-3.5">
                        {complaint.similar_reports.map((dup: any, idx: number) => (
                          <div key={idx} className="text-xs space-y-1 bg-[#121214]/40 p-2.5 rounded-lg border border-[#27272a]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-teal-400">Resident Report #{idx + 1}</span>
                              <span className="text-[10px] text-[#71717a] font-mono">
                                {new Date(dup.created_at || new Date()).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-zinc-300 italic">"{dup.description || dup.title}"</p>
                            {dup.image_url && (
                              <div className="mt-1.5 pt-1.5 border-t border-[#27272a]/40">
                                <a 
                                  href={dup.image_url} 
                                  target="_blank" 
                                  referrerPolicy="no-referrer"
                                  rel="noopener noreferrer" 
                                  className="text-[10px] text-[#00d4aa] hover:underline flex items-center gap-1"
                                >
                                  <Camera className="w-3 h-3" /> View Consolidated Photo Evidence
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 2: AI Diagnosis details (If it exists) */}
                  {complaint.aiAnalysis && (
                    <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 space-y-3">
                      <div className="flex items-center space-x-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>SevakAI Internal Diagnostics</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                        <div>
                          <strong className="text-[#71717a] block mb-0.5 font-sans">Core summary:</strong>
                          <p className="text-[#fafafa] italic">"{complaint.aiAnalysis.summary}"</p>
                        </div>
                        <div>
                          <strong className="text-[#71717a] block mb-0.5 font-sans">Official Route Justification:</strong>
                          <p className="text-zinc-300">{complaint.aiAnalysis.reasoning}</p>
                        </div>
                      </div>

                      <div className="text-xs pt-1.5 border-t border-[#27272a]">
                        <strong className="text-blue-400 font-bold block mb-1">Recommended Municipal Action:</strong>
                        <p className="text-zinc-300 font-mono text-[10.5px] bg-[#09090b] px-2.5 py-1.5 border border-[#27272a] rounded-md">
                          {complaint.aiAnalysis.suggestedAction}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Section 2.5: Official Bilingual Grievance Petition */}
                  <div className="bg-[#121214]/60 border border-[#27272a] rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
                        <FileText className="w-4 h-4" />
                        <span>Bilingual Grievance Petition Draft</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Tab selector */}
                        <div className="flex border border-[#27272a] rounded-lg p-0.5 bg-[#09090b]">
                          <button
                            onClick={() => setGrievanceLang(prev => ({ ...prev, [complaint.id]: 'en' }))}
                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md transition ${
                              (grievanceLang[complaint.id] || 'en') === 'en'
                                ? 'bg-blue-900/40 text-blue-400 border border-blue-900/50'
                                : 'text-[#71717a] hover:text-[#e4e4e7]'
                            }`}
                          >
                            English
                          </button>
                          <button
                            onClick={() => setGrievanceLang(prev => ({ ...prev, [complaint.id]: 'hi' }))}
                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md transition ${
                              grievanceLang[complaint.id] === 'hi'
                                ? 'bg-blue-900/40 text-blue-400 border border-blue-900/50'
                                : 'text-[#71717a] hover:text-[#e4e4e7]'
                            }`}
                          >
                            हिन्दी (Hindi)
                          </button>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={() => {
                            const txt = (grievanceLang[complaint.id] || 'en') === 'en'
                              ? (complaint.bilingual_grievance?.english || complaint.grievance_letter || "")
                              : (complaint.bilingual_grievance?.hindi || "यह पत्र अभी तक उपलब्ध नहीं है।");
                            navigator.clipboard.writeText(txt);
                            setCopiedId(complaint.id);
                            setTimeout(() => setCopiedId(null), 1800);
                          }}
                          className={`border rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase transition ${
                            copiedId === complaint.id
                              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                              : 'bg-[#09090b] hover:bg-[#121214] border border-[#27272a] text-[#71717a] hover:text-white'
                          }`}
                        >
                          {copiedId === complaint.id ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs bg-[#09090b] p-4 border border-[#27272a] rounded-xl relative overflow-hidden font-sans">
                      <div className="max-h-[220px] overflow-y-auto whitespace-pre-wrap text-[#b4b4b8] text-xs leading-relaxed pr-2 font-mono scrollbar-thin">
                        {(grievanceLang[complaint.id] || 'en') === 'en' 
                          ? (complaint.bilingual_grievance?.english || complaint.grievance_letter || "Official Indian government format grievance letter is being drafted...") 
                          : (complaint.bilingual_grievance?.hindi || complaint.bilingual_grievance?.hindi || "अपरिहार्य कारणों से हिंदी पत्र अनुपलब्ध है या निर्मित किया जा रहा है...")
                        }
                      </div>
                    </div>
                  </div>

                  {/* Section 2.75: Autonomous SLA Escalation History Audit */}
                  {complaint.escalation_history && complaint.escalation_history.length > 0 && (
                    <div className="bg-[#121214]/60 border border-orange-900/40 rounded-xl p-4 space-y-3.5">
                      <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-orange-400 animate-pulse" />
                        <span>Autonomous SLA Escalation History Audit</span>
                      </div>
                      <p className="text-[11px] text-[#71717a] leading-relaxed">
                        To bypass bureaucratic stagnation, the autonomous advocacy engine automatically elevates unresolved reports of high severity.
                      </p>

                      <div className="relative border-l border-[#27272a] ml-2 pl-4 space-y-4 my-3 font-sans">
                        {complaint.escalation_history.map((log: any, idx: number) => (
                          <div key={idx} className="relative group text-xs">
                            {/* Pin Node indicator */}
                            <span className="absolute -left-[21px] mt-1.5 w-2 h-2 rounded-full bg-orange-500 ring-4 ring-orange-950/40" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 test-xs">
                              <span className="font-bold text-orange-400 uppercase tracking-widest text-[10.5px]">
                                {log.level?.toUpperCase() === "L1" ? "⚠️ LEVEL 1: SLA BREACH COMPLAINT" : 
                                 log.level?.toUpperCase() === "L2" ? "👥 LEVEL 2: MULTI-RESIDENT COLLECTIVE GRIEVANCE" : 
                                 "🏛️ LEVEL 3: CIVIL TRANSPARENCY RTI COMPLIANCE APPLICATION"}
                              </span>
                              <span className="text-[10px] text-[#71717a] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>

                            <p className="text-[#e4e4e7] my-1.5 font-sans leading-relaxed text-xs">{log.reason}</p>
                            
                            <div className="text-[10.5px] text-[#71717a] pb-2 font-mono">
                              Assigned Officer Entity: <span className="text-[#b4b4b8] font-bold">{log.assignedOfficer}</span>
                            </div>

                            {log.remarks && (
                              <div className="mt-1 bg-[#09090b] p-3 rounded-lg border border-[#27272a] font-mono text-[10.5px] max-h-[160px] overflow-y-auto whitespace-pre-wrap text-[#a1a1aa] leading-relaxed select-text scrollbar-thin">
                                {log.remarks}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 2.85: Interactive Escalation Sandbox Panel */}
                  <div className="border border-orange-500/20 bg-gradient-to-r from-orange-950/15 via-stone-900/10 to-[#121214] p-4 rounded-xl space-y-3">
                    <div className="flex items-center space-x-2 text-orange-400 font-extrabold text-xs uppercase tracking-wider">
                      <Cpu className="w-4 h-4 text-orange-400" />
                      <span>Juror Demo Sandbox: Legal Escalation Controller</span>
                    </div>
                    <p className="text-xs text-[#a1a1aa] leading-relaxed">
                      Ordinarily, the platform executes chron-jobs periodically. For visual demonstration and review, use these simulation trigger controls to audit or fast-forward the escalation levels in seconds.
                    </p>

                    {auditStatus[complaint.id] && (
                      <div className={`p-3 rounded-lg text-xs font-mono select-text border leading-relaxed transition-all ${
                        auditStatus[complaint.id].type === 'success' 
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                          : auditStatus[complaint.id].type === 'error'
                            ? 'bg-red-950/40 text-red-500 border-red-900/50'
                            : 'bg-blue-950/40 text-blue-400 border-blue-900/50'
                      }`}>
                        {auditStatus[complaint.id].text}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => handleCheckSla(complaint.id)}
                        disabled={simulatingId === complaint.id}
                        className="bg-[#09090b] hover:bg-[#121214] border border-[#27272a] text-[#e4e4e7] px-3.5 py-2 rounded-xl text-xs transition font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 hover:text-orange-400 hover:border-orange-950"
                      >
                        <span>Audit SLA Breach Timer</span>
                      </button>

                      <button
                        onClick={() => handleSimulateEscalation(complaint.id)}
                        disabled={simulatingId === complaint.id}
                        className="bg-orange-950/30 hover:bg-orange-900/40 border border-orange-900/50 text-orange-400 px-4 py-2 rounded-xl text-xs transition font-extrabold uppercase tracking-wider cursor-pointer flex items-center space-x-2 hover:border-orange-700 hover:text-orange-300 animate-pulse"
                      >
                        {simulatingId === complaint.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                            <span>Simulating Gemini Attorney...</span>
                          </>
                        ) : (
                          <>
                            <span>Fast-Forward Escalation Loop (Tiers 1-3)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Section 3: Official State Controller (Only for authorized officers) */}
                  {currentRole === "officer" && (
                    <div className="border border-amber-900/35 bg-[#121214] p-4 rounded-xl space-y-4">
                      {/* Sub-section 3.1: Standard dropdown */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Authority Audit Control Panel (Simulated Officer Tools)</span>
                        </div>
                        <p className="text-xs text-[#71717a]">
                          As a Municipal Officer, analyze the citizen's ticket report and update its workflow status to dispatch public teams.
                        </p>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-zinc-300 font-bold">Grievance Audit Status:</span>
                          <select
                            value={complaint.status}
                            onChange={(e) => handleStatusChange(complaint.id, e)}
                            className="bg-[#09090b] border border-[#27272a] text-amber-400 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none cursor-pointer font-bold"
                          >
                            <option value="Pending">Pending Audit</option>
                            <option value="Reviewed">Reviewed & Approved</option>
                            <option value="In Progress">Crew Dispatch (In Progress)</option>
                            <option value="pending_verification">Pending Verification</option>
                            <option value="Resolved">Filing Resolved (Closed)</option>
                          </select>
                        </div>
                      </div>

                      {/* Sub-section 3.2: Visual verification results if present */}
                      {(complaint as any).verification_score !== undefined && (
                        <div className="border border-emerald-950 bg-emerald-950/10 p-4 rounded-xl space-y-2">
                          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" />
                            <span>Gemini Vision AI resolution report</span>
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-black text-emerald-400">{(complaint as any).verification_score}%</span>
                            <span className="text-xs text-emerald-500 font-medium">Confidence Score</span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {(complaint as any).verification_reason}
                          </p>
                          
                          {(complaint as any).after_image_url && (
                            <div className="mt-3">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-[#71717a] block mb-1.5 font-bold">Audited After Photo Evidence:</span>
                              <img 
                                src={(complaint as any).after_image_url} 
                                alt="Resolution evidence" 
                                className="rounded-lg max-h-48 object-cover border border-emerald-900/45" 
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-section 3.3: Rejection notices if present */}
                      {(complaint as any).last_rejected_verification && (
                        <div className="border border-red-950 bg-red-950/15 p-4 rounded-xl space-y-1.5">
                          <div className="flex items-center space-x-2 text-red-500 font-bold text-xs uppercase tracking-wider">
                            <AlertCircle className="w-4 h-4" />
                            <span>Gemini vision audit: Resolution photo rejected</span>
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-sm font-bold text-red-400">Confidence: {(complaint as any).last_rejected_verification.confidence_score}% (Required &gt; 30%)</span>
                          </div>
                          <p className="text-xs text-zinc-400">
                            {(complaint as any).last_rejected_verification.analysis}
                          </p>
                          {String((complaint as any).last_rejected_verification.after_image_url).length > 2 && (
                            <div className="mt-2 text-[10px] text-zinc-500">
                              Rejected image attempt: {(complaint as any).last_rejected_verification.after_image_url}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-section 3.4: File upload to mark resolve and audit */}
                      <div className="border border-indigo-950 bg-indigo-950/10 p-4 rounded-xl space-y-4">
                        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                          <Sparkles className="w-4.5 h-4.5" />
                          <span>Mark Resolved with Photo Audit</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Mark this civic issue resolved by uploading an aftermath verification photograph. Gemini Vision will compare the before and after states.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setAfterImageFile(e.target.files[0]);
                              }
                            }}
                            className="block w-full text-xs text-slate-500
                              file:mr-4 file:py-1.5 file:px-3
                              file:rounded-xl file:border-0
                              file:text-xs file:font-semibold
                              file:bg-indigo-950/50 file:text-indigo-400
                              hover:file:bg-indigo-900/50 cursor-pointer text-zinc-400 bg-[#09090b] border border-[#27272a] rounded-xl p-1"
                          />
                          <button
                            type="button"
                            disabled={!afterImageFile || isVerifying}
                            onClick={() => handleResolveWithPhoto(complaint.id)}
                            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition ${
                              afterImageFile && !isVerifying
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                                : "bg-[#1c1c1f] text-zinc-500 border border-[#27272a]/50 cursor-not-allowed"
                            }`}
                          >
                            {isVerifying ? "Verifying..." : "Settle Grievance"}
                          </button>
                        </div>

                        {verificationResult && verificationResult.id === complaint.id && (
                          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 mt-3 ${
                            verificationResult.status === "approved"
                              ? "bg-emerald-950/20 border-emerald-950 text-emerald-300"
                              : verificationResult.status === "flagged"
                              ? "bg-yellow-950/20 border-yellow-950 text-yellow-300"
                              : "bg-red-950/20 border-red-950 text-red-300"
                          }`}>
                            <div className="font-bold flex items-center space-x-1.5 uppercase text-[10px]">
                              {verificationResult.status === "approved" && <span className="text-emerald-400">● AUTO-APPROVED ({verificationResult.confidence_score}%)</span>}
                              {verificationResult.status === "flagged" && <span className="text-yellow-400">● FLAGGED FOR REVIEW ({verificationResult.confidence_score}%)</span>}
                              {verificationResult.status === "rejected" && <span className="text-red-400">● REJECTED CIVIL RECONSTRUCTION ({verificationResult.confidence_score}%)</span>}
                            </div>
                            <div>{verificationResult.message}</div>
                            <div className="text-[11px] opacity-85 italic">"{verificationResult.analysis}"</div>
                          </div>
                        )}
                        
                        {verifierError && (
                          <div className="p-3 bg-red-950/10 border border-red-900/30 text-red-400 text-xs rounded-xl mt-3">
                            {verifierError}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Comments Dialogue and Status Updates */}
                  <div className="space-y-4 pt-4 border-t border-[#27272a]">
                    
                    <div className="flex items-center space-x-1.5">
                      <MessageSquare className="w-4 h-4 text-[#71717a]" />
                      <h5 className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest font-mono font-mono">Platform discussion thread ({complaint.comments?.length || 0})</h5>
                    </div>

                    {/* Comments Render List */}
                    {complaint.comments && complaint.comments.length > 0 ? (
                      <div className="space-y-3">
                        {complaint.comments.map(comment => (
                          <div 
                            key={comment.id}
                            className={`p-3 rounded-xl border ${
                              comment.isOfficial 
                                ? 'bg-amber-950/25 border-amber-900/40 text-amber-200' 
                                : 'bg-[#121214] border border-[#27272a] text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[#71717a] mb-1 font-mono">
                              <span className="flex items-center gap-1.5">
                                <span className={comment.isOfficial ? "text-amber-400 font-bold font-sans" : "text-stone-300 font-sans"}>{comment.authorName}</span>
                                {comment.isOfficial && (
                                  <span className="bg-amber-950 text-amber-400 border border-amber-900 px-1.5 py-0.2 rounded font-sans uppercase text-[8px] tracking-wider">OFFICIAL REPLAY</span>
                                )}
                              </span>
                              <span>{new Date(comment.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed font-sans">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#71717a] font-mono italic">No logs or comments filed on this ticket yet.</p>
                    )}

                    {/* New Comments Writing Box */}
                    <form onSubmit={(e) => handleAddComment(complaint.id, e)} className="flex items-start space-x-3 gap-2">
                      <input 
                        type="text"
                        placeholder={currentRole === "officer" ? "Write an official resolution comment..." : "Contribute residents feedback... (Login or Guest)"}
                        value={commentingId === complaint.id ? "" : commentText}
                        onChange={(e) => {
                          setCommentingId(null);
                          setCommentText(e.target.value);
                        }}
                        className="flex-1 bg-[#121214] border border-[#27272a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                        required
                      />
                      <button
                        type="submit"
                        disabled={commentingId === complaint.id}
                        className="bg-[#121214] hover:bg-[#1c1c1f] border border-[#27272a] hover:border-blue-500/50 text-xs px-4 py-2 rounded-xl text-zinc-300 hover:text-white transition font-bold uppercase tracking-wider flex-shrink-0 cursor-pointer"
                      >
                        {commentingId === complaint.id ? 'Saving...' : 'Send'}
                      </button>
                    </form>

                  </div>

                </div>
              )}

            </div>
          );
        })}

        {sortedComplaints.length === 0 && (
          <div className="py-12 text-center border border-dashed border-[#27272a] rounded-xl bg-[#121214]/40">
            <p className="text-sm font-semibold text-[#71717a] mb-1">No reported issues found</p>
            <p className="text-xs text-[#71717a]">Consider adjusting filter conditions or write the first complaint!</p>
          </div>
        )}
      </div>

    </div>
  );
}
