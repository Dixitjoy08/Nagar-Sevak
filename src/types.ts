export interface Comment {
  id: string;
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
  isOfficial: boolean;
}

export interface AIAnalysis {
  department: string;
  priority: "Low" | "Medium" | "High";
  reasoning: string;
  summary: string;
  keywords: string[];
  suggestedAction: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  department: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "Reviewed" | "In Progress" | "Resolved";
  reporterEmail: string;
  reporterName: string;
  upvotes: number;
  upvotedBy: string[]; // List of user emails who upvoted
  createdAt: string;
  updatedAt: string;
  location: string;
  comments: Comment[];
  aiAnalysis?: AIAnalysis;
  grievance_letter?: string;
  bilingual_grievance?: {
    english: string;
    hindi: string;
  };
  escalation_history?: EscalationLog[];
  similar_reports?: any[];
  image_url?: string;
  after_image_url?: string;
  verifiedBy?: string[];
  community_verifications?: CommunityVerifications;
}

export type RoleType = "citizen" | "officer";

export interface ChatHistoryMessage {
  role: "user" | "model";
  text: string;
}

// --- NEW DATA MODELS ---

export enum ReportCategory {
  POTHOLE = "pothole",
  WATER_LEAK = "water_leak",
  GARBAGE = "garbage",
  STREETLIGHT = "streetlight",
  DRAINAGE = "drainage",
  ENCROACHMENT = "encroachment"
}

export enum ReportStatus {
  FILED = "filed",
  ACKNOWLEDGED = "acknowledged",
  IN_PROGRESS = "in_progress",
  ESCALATED_L1 = "escalated_l1",
  ESCALATED_L2 = "escalated_l2",
  ESCALATED_L3 = "escalated_l3",
  PENDING_VERIFICATION = "pending_verification",
  RESOLVED = "resolved"
}

export interface ReportLocation {
  lat: number;
  lng: number;
  address: string;
  ward: string;
  zone: string;
}

export interface ReportJurisdiction {
  body: string;
  department: string;
  officer_name: string;
  contact: string;
  sla_hours: number;
  complaint_portal_url?: string;
}

export interface EscalationLog {
  level: "l1" | "l2" | "l3";
  timestamp: string;
  reason: string;
  assignedOfficer: string;
  remarks?: string;
}

export interface CommunityVerifications {
  count: number;
  user_ids: string[];
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: number; // 1-5
  status: ReportStatus;
  location: ReportLocation;
  jurisdiction: ReportJurisdiction;
  image_url?: string;
  after_image_url?: string;
  grievance_letter?: string;
  bilingual_grievance?: {
    english: string;
    hindi: string;
  };
  escalation_history: EscalationLog[];
  community_verifications: CommunityVerifications;
  similar_reports?: any[];
  created_by: string; // User UID
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  visual_description?: string;
  verification_score?: number;
  verification_reason?: string;
  last_rejected_verification?: {
    timestamp: string;
    confidence_score: number;
    analysis: string;
    after_image_url: string;
  };
}

export interface UserProfile {
  id: string; // Match Auth UID
  name: string;
  email: string;
  civic_score: number;
  badges: string[];
  reports_filed: number;
  reports_verified: number;
  ward: string;
  streak?: number;
  last_action_date?: string;
}

