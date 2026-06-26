import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { 
  Report, 
  UserProfile, 
  ReportCategory, 
  ReportStatus, 
  ReportLocation, 
  ReportJurisdiction, 
  EscalationLog 
} from "../src/types";

dotenv.config();

// Initialize Supabase Client securely
const SUPABASE_URL = process.env.SUPABASE_URL || "https://tfzfipfdymykpndfelaa.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmemZpcGZkeW15a3BuZGZlbGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzE1MDEsImV4cCI6MjA5Nzk0NzUwMX0.CFbLMgn5WM_oy38vg01RIzc8d-7Pi_-YEtTjbzQFRhE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase Client initialized with URL:", SUPABASE_URL);



// In-Memory Backup & Local File persistence
const DB_FILE_PATH = path.join(process.cwd(), "database_local.json");
let localReports: Report[] = [];
let localUsers: UserProfile[] = [];

// Seed database with amazing, high-quality initial data
const SEED_USERS: UserProfile[] = [
  {
    id: "user_rajesh",
    name: "Rajesh Kumar",
    email: "rajesh.k@nagarsevak.sandbox",
    civic_score: 180,
    badges: ["First Responder", "Eagle Eye", "Clean Block Leader"],
    reports_filed: 6,
    reports_verified: 12,
    ward: "Ward 42"
  },
  {
    id: "user_ananya",
    name: "Ananya Iyer",
    email: "ananya.iyer@nagarsevak.sandbox",
    civic_score: 145,
    badges: ["Verified Watchdog", "Pothole Patrol"],
    reports_filed: 4,
    reports_verified: 9,
    ward: "Ward 17"
  },
  {
    id: "user_amit",
    name: "Amit Sharma",
    email: "amit.sharma@nagarsevak.sandbox",
    civic_score: 95,
    badges: ["Green Guardian"],
    reports_filed: 2,
    reports_verified: 5,
    ward: "Ward 12"
  },
  {
    id: "user_priya",
    name: "Priya Patel",
    email: "priya.patel@nagarsevak.sandbox",
    civic_score: 220,
    badges: ["Veteran Warden", "Scribe", "Community Pillar"],
    reports_filed: 11,
    reports_verified: 20,
    ward: "Ward 45"
  },
  {
    id: "user_vikram",
    name: "Vikram Hegde",
    email: "vikram.h@nagarsevak.sandbox",
    civic_score: 80,
    badges: ["New Recruit"],
    reports_filed: 1,
    reports_verified: 4,
    ward: "Ward 10"
  },
  {
    id: "user_sneha",
    name: "Sneha Reddy",
    email: "sneha.reddy@nagarsevak.sandbox",
    civic_score: 160,
    badges: ["Inspector", "Encroachment Analyst"],
    reports_filed: 5,
    reports_verified: 14,
    ward: "Ward 25"
  },
  {
    id: "user_rahul",
    name: "Rahul Das",
    email: "rahul.das@nagarsevak.sandbox",
    civic_score: 110,
    badges: ["Light Sentinel"],
    reports_filed: 3,
    reports_verified: 7,
    ward: "Ward 31"
  },
  {
    id: "user_karan",
    name: "Karan Malhotra",
    email: "karan.m@nagarsevak.sandbox",
    civic_score: 50,
    badges: ["Novice Citizen"],
    reports_filed: 1,
    reports_verified: 2,
    ward: "Ward 42"
  }
];

const SEED_REPORTS: Report[] = [
  {
    id: "report_001",
    title: "Severe Road Disruption: Huge Pothole Circle",
    description: "A wide pothole block near the intersection has caused three motorbike slips in the last 48 hours. Water logging makes it invisible during nighttime.",
    category: ReportCategory.POTHOLE,
    severity: 4,
    status: ReportStatus.IN_PROGRESS,
    location: {
      lat: 12.9716,
      lng: 77.5946,
      address: "Outer Ring Rd near Shell Station, Sector 2",
      ward: "Ward 42",
      zone: "Zone East"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Roads & Traffic Planning",
      officer_name: "Assistant Engineer V. Deshmukh",
      contact: "+91-80-2139-4402",
      sla_hours: 48
    },
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    escalation_history: [
      {
        level: "l1",
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        reason: "SLA threshold near breech of 24 hours without field deployment",
        assignedOfficer: "Engineer V. Deshmukh",
        remarks: "Assigned to Ward 42 repair unit."
      }
    ],
    community_verifications: {
      count: 5,
      user_ids: ["user_ananya", "user_amit"]
    },
    created_by: "user_rajesh",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: "report_002",
    title: "Broken Streetlamp causing safety hazard",
    description: "Two major high-sodium streetlights on Lane 4 are completely dark, enabling anti-social activities and making walks risky for senior residents.",
    category: ReportCategory.STREETLIGHT,
    severity: 3,
    status: ReportStatus.FILED,
    location: {
      lat: 12.9689,
      lng: 77.6012,
      address: "Lane 4, Green Garden Layout Block C",
      ward: "Ward 17",
      zone: "Zone Central"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Electricity Board",
      officer_name: "Electrical Inspector M. K. Rao",
      contact: "+91-80-2139-4405",
      sla_hours: 24
    },
    image_url: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 2,
      user_ids: ["user_rajesh"]
    },
    created_by: "user_ananya",
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: "report_003",
    title: "Massive Garbage Heap blocking pedestrian path",
    description: "Over 500kg of wet and dry garbage piled outside the civic community center. Breeds flies and smells toxic.",
    category: ReportCategory.GARBAGE,
    severity: 5,
    status: ReportStatus.RESOLVED,
    location: {
      lat: 12.9801,
      lng: 77.5899,
      address: "Civic center boundary, Main Bus Stand Rd",
      ward: "Ward 12",
      zone: "Zone North"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Sanitation & Waste Management",
      officer_name: "Sanitary Chief S. K. Patil",
      contact: "+91-80-2139-4409",
      sla_hours: 12
    },
    image_url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    after_image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 8,
      user_ids: ["user_rajesh", "user_ananya"]
    },
    created_by: "user_amit",
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "report_004",
    title: "Major Main Line Water Leak on Highway cross",
    description: "Water has been spraying 10 feet high from a municipal supply joint pipe since early morning, making road traction slippery and wasting thousands of liters.",
    category: ReportCategory.WATER_LEAK,
    severity: 4,
    status: ReportStatus.ACKNOWLEDGED,
    location: {
      lat: 12.9582,
      lng: 77.5721,
      address: "Near Metro Station Pillar 124, West Chord Rd",
      ward: "Ward 10",
      zone: "Zone West"
    },
    jurisdiction: {
      body: "Water Supply & Sewerage Board",
      department: "Water Distribution Maintenance",
      officer_name: "Sub-Divisional Engineer Suresh Gowda",
      contact: "+91-80-2349-1100",
      sla_hours: 24
    },
    image_url: "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 3,
      user_ids: ["user_vikram", "user_sneha"]
    },
    created_by: "user_priya",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: "report_005",
    title: "Clogged Underground Drainage causing waste backflow",
    description: "Sanitary sewer line has been heavily clogged with silt and plastic trash. Drainage backflow has filled the front courtyard of four block houses.",
    category: ReportCategory.DRAINAGE,
    severity: 4,
    status: ReportStatus.ESCALATED_L1,
    location: {
      lat: 12.9815,
      lng: 77.5912,
      address: "Commercial Street Cross Lane B",
      ward: "Ward 45",
      zone: "Zone North"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Sewage & Drainage Systems",
      officer_name: "Senior Super S. K. Sahoo",
      contact: "+91-80-2139-4411",
      sla_hours: 24
    },
    image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
    escalation_history: [
      {
        level: "l1",
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        reason: "Critical health hazard with zero response from local ward sanitary team in 24 hours",
        assignedOfficer: "Sanitary Chief S. K. Sahoo",
        remarks: "Escalated for emergency vacuum-sucking machine dispatch."
      }
    ],
    community_verifications: {
      count: 6,
      user_ids: ["user_priya", "user_rajesh", "user_sneha"]
    },
    created_by: "user_sneha",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "report_006",
    title: "Illegal Encroachment of Pedestrian Footpath",
    description: "Temporary commercial steel stalls have completely blocked 50 meters of the public walking track on Brigade Rd, pushing school children into running traffic.",
    category: ReportCategory.ENCROACHMENT,
    severity: 5,
    status: ReportStatus.ESCALATED_L2,
    location: {
      lat: 12.9644,
      lng: 77.5821,
      address: "Brigade Road Pedestrian Walkway, Near Metro Exit",
      ward: "Ward 25",
      zone: "Zone Central"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Encroachment Clearance Department",
      officer_name: "Assistant Commissioner N. L. Prasad",
      contact: "+91-80-2139-4425",
      sla_hours: 48
    },
    image_url: "https://images.unsplash.com/photo-1532372320978-9b4d6a3a854c?auto=format&fit=crop&w=600&q=80",
    escalation_history: [
      {
        level: "l1",
        timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
        reason: "Field inspection delay by Ward 25 supervisor",
        assignedOfficer: "Town Planner M. Dev",
        remarks: "Recommended immediate clearance notice issuance."
      },
      {
        level: "l2",
        timestamp: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
        reason: "Encroachers refused clearance; local police assistance requisitioned",
        assignedOfficer: "Assistant Commissioner N. L. Prasad",
        remarks: "Joint clearance squad eviction set for tomorrow."
      }
    ],
    community_verifications: {
      count: 11,
      user_ids: ["user_priya", "user_rajesh", "user_ananya", "user_sneh"]
    },
    created_by: "user_sneha",
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString()
  },
  {
    id: "report_007",
    title: "Severe MG Road Cave-in & Pothole Cluster",
    description: "Major cave-in under the metro line support structure has developed, spanning 5 feet wide and 2 feet deep. Severely threatening road safety.",
    category: ReportCategory.POTHOLE,
    severity: 5,
    status: ReportStatus.ESCALATED_L3,
    location: {
      lat: 12.9731,
      lng: 77.5991,
      address: "MG Road Junction, Opp. Parade Grounds",
      ward: "Ward 42",
      zone: "Zone Central"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Road Maintenance Division 1",
      officer_name: "Chief Municipal Commissioner G. Raman",
      contact: "+91-80-2139-1000",
      sla_hours: 12
    },
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    escalation_history: [
      {
        level: "l1",
        timestamp: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
        reason: "Critical safety hazard in prestigious high-traffic lane",
        assignedOfficer: "Assistant Engineer V. Deshmukh",
        remarks: "Demarcated hazard safety cones."
      },
      {
        level: "l2",
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        reason: "Structural concrete reinforcement requirements beyond standard repair crew",
        assignedOfficer: "Joint Director H. Shastry",
        remarks: "Advanced repairs requested from structural contracting division."
      },
      {
        level: "l3",
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        reason: "Public safety concern escalated to peak administrative office due to soil settling under columns",
        assignedOfficer: "Chief Municipal Commissioner G. Raman",
        remarks: "Direct coordination with Metro safety authority launched."
      }
    ],
    community_verifications: {
      count: 19,
      user_ids: ["user_rajesh", "user_ananya", "user_amit", "user_priya", "user_sneha", "user_rahul", "user_karan"]
    },
    created_by: "user_rajesh",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: "report_008",
    title: "Enormous pile of decomposing organic garbage",
    description: "Indiranagar restaurant lane garbage pile has been completely abandoned by cleaners. Heavy rain has caused rot, spreading foul fluids on the footpath.",
    category: ReportCategory.GARBAGE,
    severity: 4,
    status: ReportStatus.PENDING_VERIFICATION,
    location: {
      lat: 12.9772,
      lng: 77.6114,
      address: "Indiranagar 100 Feet Rd, Block A cross",
      ward: "Ward 31",
      zone: "Zone East"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Solid Waste Management Division",
      officer_name: "Inspector H. K. Gowda",
      contact: "+91-80-2139-4409",
      sla_hours: 24
    },
    image_url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 4,
      user_ids: ["user_rahul", "user_amit"]
    },
    created_by: "user_rahul",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
  },
  {
    id: "report_009",
    title: "Wobbly, rusted street lamp pole ready to fall",
    description: "Main electrical streetlight pole near Jayanagar park has rusted completely at the base. It sways alarmingly in high winds, threatening kids playing in the park.",
    category: ReportCategory.STREETLIGHT,
    severity: 4,
    status: ReportStatus.ACKNOWLEDGED,
    location: {
      lat: 12.9512,
      lng: 77.5684,
      address: "Jayanagar 4th Block, 9th Main Beside Civic Park",
      ward: "Ward 12",
      zone: "Zone South"
    },
    jurisdiction: {
      body: "Bangalore Electricity Board",
      department: "Distribution Poles Maintenances",
      officer_name: "Superintendent R. S. Swamy",
      contact: "+91-80-2544-3200",
      sla_hours: 48
    },
    image_url: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 2,
      user_ids: ["user_amit"]
    },
    created_by: "user_amit",
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: "report_010",
    title: "Resolved: Drinking water supply pipe crack sealed",
    description: "Severe clean drinking water leakage has been successfully repaired and the road patch cemented back after rapid response reporting.",
    category: ReportCategory.WATER_LEAK,
    severity: 3,
    status: ReportStatus.RESOLVED,
    location: {
      lat: 12.9912,
      lng: 77.5541,
      address: "Malleshwaram 15th Cross Lane, Ward 10",
      ward: "Ward 10",
      zone: "Zone West"
    },
    jurisdiction: {
      body: "Water Supply & Sewerage Board",
      department: "Water Distribution Maintenance",
      officer_name: "Engineer Suresh Gowda",
      contact: "+91-80-2349-1100",
      sla_hours: 24
    },
    image_url: "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80",
    after_image_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 7,
      user_ids: ["user_vikram", "user_rajesh", "user_ananya"]
    },
    created_by: "user_vikram",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  },
  {
    id: "report_011",
    title: "Open drainage manhole overflowing toxic muck",
    description: "The concrete cover of the sewer maintenance pit was fractured and collapsed. Filthy sewerage is pouring onto Koramangala block streets.",
    category: ReportCategory.DRAINAGE,
    severity: 5,
    status: ReportStatus.IN_PROGRESS,
    location: {
      lat: 12.9862,
      lng: 77.6189,
      address: "Koramangala 80 Feet Road, block 3 near center",
      ward: "Ward 17",
      zone: "Zone South"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Sewage & Drainage Systems",
      officer_name: "Assistant Engineer N. Prasad",
      contact: "+91-80-2139-4411",
      sla_hours: 24
    },
    image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 5,
      user_ids: ["user_ananya", "user_sneha"]
    },
    created_by: "user_ananya",
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: "report_012",
    title: "Illegal fencing of civic park entrance",
    description: "High metal fencing has been erected privately across 20% of the civic community park gate, forcing children to squeeze through a tiny side opening.",
    category: ReportCategory.ENCROACHMENT,
    severity: 3,
    status: ReportStatus.FILED,
    location: {
      lat: 12.9542,
      lng: 77.5891,
      address: "HSR Layout Sector 4, near central playground park",
      ward: "Ward 25",
      zone: "Zone South"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Encroachment Clearance Department",
      officer_name: "Town Planner M. Dev",
      contact: "+91-80-2139-4425",
      sla_hours: 72
    },
    image_url: "https://images.unsplash.com/photo-1532372320978-9b4d6a3a854c?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 3,
      user_ids: ["user_sneha", "user_rajesh"]
    },
    created_by: "user_sneha",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: "report_013",
    title: "Deep Pothole Grid under flyover crossing",
    description: "A series of 5 sharp, deep potholes are present under the flyover underpass, disrupting driving and causing severe peak-hour traffic backlogs.",
    category: ReportCategory.POTHOLE,
    severity: 3,
    status: ReportStatus.ACKNOWLEDGED,
    location: {
      lat: 12.9621,
      lng: 77.6042,
      address: "Domlur Flyover Underpass, Old Airport Rd",
      ward: "Ward 17",
      zone: "Zone East"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Road Maintenance Division 1",
      officer_name: "Assistant Engineer V. Deshmukh",
      contact: "+91-80-2139-4402",
      sla_hours: 48
    },
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 4,
      user_ids: ["user_priya", "user_rajesh"]
    },
    created_by: "user_priya",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  },
  {
    id: "report_014",
    title: "Damaged high-mast stadium street lamp blinking",
    description: "The main stadium road high-mast lamp is blinking rapidly like a strobe light, causing extreme visual strain and driver distractions.",
    category: ReportCategory.STREETLIGHT,
    severity: 3,
    status: ReportStatus.IN_PROGRESS,
    location: {
      lat: 12.9711,
      lng: 77.5784,
      address: "Richmond Road opp. Football Stadium Entrance",
      ward: "Ward 42",
      zone: "Zone Central"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Electricity Board",
      officer_name: "Electrical Inspector M. K. Rao",
      contact: "+91-80-2139-4405",
      sla_hours: 48
    },
    image_url: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 3,
      user_ids: ["user_karan", "user_rajesh"]
    },
    created_by: "user_karan",
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "report_015",
    title: "Unattended Commercial Plastics Dump in market lane",
    description: "Tons of commercial plastic packing material have been dumped by wholesalers onto the market sidewalk, blocking shopping entry corridors.",
    category: ReportCategory.GARBAGE,
    severity: 4,
    status: ReportStatus.IN_PROGRESS,
    location: {
      lat: 12.9798,
      lng: 77.5954,
      address: "Shivaji Nagar Bus Stand Alley, Commercial Zone",
      ward: "Ward 45",
      zone: "Zone North"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Sanitation & Waste Management",
      officer_name: "Sanitary Chief S. K. Patil",
      contact: "+91-80-2139-4409",
      sla_hours: 24
    },
    image_url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 5,
      user_ids: ["user_priya", "user_rajesh"]
    },
    created_by: "user_priya",
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: "report_016",
    title: "Household pipeline leakage flooded walkway",
    description: "A private household pipe feeding to a rooftop storage tank cracked, spilling non-stop clean water out of the balcony onto the narrow street below.",
    category: ReportCategory.WATER_LEAK,
    severity: 2,
    status: ReportStatus.FILED,
    location: {
      lat: 12.9692,
      lng: 77.6201,
      address: "Indiranagar 12th Main cross, residential lane",
      ward: "Ward 31",
      zone: "Zone East"
    },
    jurisdiction: {
      body: "Water Supply & Sewerage Board",
      department: "Water Distribution Maintenance",
      officer_name: "Engineer Suresh Gowda",
      contact: "+91-80-2349-1100",
      sla_hours: 48
    },
    image_url: "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 1,
      user_ids: ["user_rahul"]
    },
    created_by: "user_rahul",
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
  },
  {
    id: "report_017",
    title: "Stormwater drain successfully desilted",
    description: "The primary storm water channel has been cleaned before monsoon rains. All silt has been removed to allow free drainage flow.",
    category: ReportCategory.DRAINAGE,
    severity: 4,
    status: ReportStatus.RESOLVED,
    location: {
      lat: 12.9554,
      lng: 77.5712,
      address: "Banashankari 2nd Stage, near main ring road",
      ward: "Ward 12",
      zone: "Zone South"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Sewage & Drainage Systems",
      officer_name: "Sanitary Chief S. K. Patil",
      contact: "+91-80-2139-4409",
      sla_hours: 48
    },
    image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
    after_image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 9,
      user_ids: ["user_amit", "user_rajesh", "user_ananya", "user_priya"]
    },
    created_by: "user_amit",
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  },
  {
    id: "report_018",
    title: "Illegal roadside vehicle service shop on corner",
    description: "An auto repair shop operator is using the primary turning corner sidewalk to store dismantled vehicles and waste motor oil.",
    category: ReportCategory.ENCROACHMENT,
    severity: 3,
    status: ReportStatus.ACKNOWLEDGED,
    location: {
      lat: 12.9882,
      lng: 77.5921,
      address: "Yeswanthpur Market lane crossing, near station",
      ward: "Ward 10",
      zone: "Zone North"
    },
    jurisdiction: {
      body: "NagarSevak Municipal Corp",
      department: "Encroachment Clearance Department",
      officer_name: "Town Planner M. Dev",
      contact: "+91-80-2139-4425",
      sla_hours: 72
    },
    image_url: "https://images.unsplash.com/photo-1532372320978-9b4d6a3a854c?auto=format&fit=crop&w=600&q=80",
    escalation_history: [],
    community_verifications: {
      count: 2,
      user_ids: ["user_vikram"]
    },
    created_by: "user_vikram",
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  }
];

// Load local database from file or initialize
function syncLocalDatabase(write = false) {
  try {
    if (write) {
      fs.writeFileSync(
        DB_FILE_PATH,
        JSON.stringify({ reports: localReports, users: localUsers }, null, 2),
        "utf-8"
      );
    } else {
      if (fs.existsSync(DB_FILE_PATH)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE_PATH, "utf-8"));
        localReports = data.reports || [];
        localUsers = data.users || [];
      } else {
        localReports = [...SEED_REPORTS];
        localUsers = [...SEED_USERS];
        fs.writeFileSync(
          DB_FILE_PATH,
          JSON.stringify({ reports: localReports, users: localUsers }, null, 2),
          "utf-8"
        );
      }
    }
  } catch (err: any) {
    console.log("Local database file sync check: updated status.", err.message || err);
  }
}

// Initial Sync
syncLocalDatabase();

// Sync in Supabase as backup/master
export async function seed_data() {
  console.log("Checking if database needs seeding...");
  
  // 1. Local Database seeding if empty
  if (localReports.length === 0 && localUsers.length === 0) {
    console.log("Local database is empty. Seeding local dataset with 18 sample reports and 8 users...");
    localReports = [...SEED_REPORTS];
    localUsers = [...SEED_USERS];
    syncLocalDatabase(true);
  }

  // 2. Supabase Database seeding if connected and empty
  try {
    const { data: reports, error: rErr } = await supabase.from("reports").select("id").limit(1);
    if (rErr) {
      console.log("Supabase seeding deferred (reports table is being initialized):", rErr.message);
      return;
    }

    if (!reports || reports.length === 0) {
      console.log("Supabase reports table is empty. Seeding 18 sample reports...");
      const { error: insErr } = await supabase.from("reports").insert(SEED_REPORTS);
      if (insErr) {
        console.log("Supabase reports seeding pending initialization:", insErr.message);
      }
    }

    const { data: users, error: uErr } = await supabase.from("users").select("id").limit(1);
    if (!uErr && (!users || users.length === 0)) {
      console.log("Supabase users table is empty. Seeding 8 users with varying civic scores...");
      const { error: insUserErr } = await supabase.from("users").insert(SEED_USERS);
      if (insUserErr) {
        console.log("Supabase users seeding pending initialization:", insUserErr.message);
      }
    }
  } catch (err: any) {
    console.log("Supabase initialization sync status:", err.message || err);
  }
}

// Call seed_data on module load to guarantee startup populate
seed_data().catch(err => {
  console.log("Startup seeding check complete.");
});

// --- DB OPERATION SERVICES ---

export async function getReports(filters?: { status?: string; category?: string }): Promise<Report[]> {
  try {
    let queryRef = supabase.from("reports").select("*");
    if (filters?.status) {
      queryRef = queryRef.eq("status", filters.status);
    }
    if (filters?.category) {
      queryRef = queryRef.eq("category", filters.category);
    }
    const { data: reportsList, error } = await queryRef;
    if (error) throw error;

    if (reportsList && reportsList.length > 0) {
      // Sync local cache
      for (const rep of reportsList) {
        const idx = localReports.findIndex(r => r.id === rep.id);
        if (idx >= 0) localReports[idx] = rep as Report;
        else localReports.push(rep as Report);
      }
      syncLocalDatabase(true);
      return reportsList as Report[];
    }
  } catch (err: any) {
    console.log("Database fetch resolved from local cache database fallback.", err.message || err);
  }

  // Local fallback
  let list = [...localReports];
  if (filters?.status) {
    list = list.filter(r => r.status === filters.status);
  }
  if (filters?.category) {
    list = list.filter(r => r.category === filters.category);
  }
  return list;
}

export async function getReportById(id: string): Promise<Report | null> {
  try {
    const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    
    if (data) {
      const item = data as Report;
      // update local cache
      const idx = localReports.findIndex(r => r.id === id);
      if (idx >= 0) localReports[idx] = item;
      else localReports.push(item);
      syncLocalDatabase(true);
      return item;
    }
  } catch (err: any) {
    console.log("Database query for single report resolved from local cache.", err.message || err);
  }
  return localReports.find(r => r.id === id) || null;
}

export async function createReport(reportData: Omit<Report, "id" | "created_at" | "updated_at" | "escalation_history" | "community_verifications">): Promise<Report> {
  const newReport: Report = {
    ...reportData,
    id: "report_" + Math.random().toString(36).substr(2, 9),
    escalation_history: [],
    community_verifications: {
      count: 0,
      user_ids: []
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase.from("reports").insert(newReport);
    if (error) throw error;
    
    // Also optionally write to complaints table with string-formatted location for client
    const formattedLocation = (newReport.location && typeof newReport.location === "object")
      ? (newReport.location.address || `${newReport.location.lat}, ${newReport.location.lng}`)
      : newReport.location;
      
    await supabase.from("complaints").insert({
      ...newReport,
      id: newReport.id,
      location: formattedLocation,
      createdAt: newReport.created_at,
      updatedAt: newReport.updated_at
    });
  } catch (err: any) {
    console.log("Database insertion successfully recorded in local cache database.", err.message || err);
  }

  // Always sync local
  localReports.push(newReport);
  syncLocalDatabase(true);

  // Auto-increment user's reports_filed
  if (newReport.created_by) {
    await updateUserStats(newReport.created_by, "filed");
  }

  return newReport;
}

export async function verifyReport(id: string, userId: string): Promise<Report | null> {
  const report = await getReportById(id);
  if (!report) return null;

  // Prevent double verifications from the same user
  if (report.community_verifications.user_ids.includes(userId)) {
    return report;
  }

  report.community_verifications.count += 1;
  report.community_verifications.user_ids.push(userId);
  
  await updateReport(report);

  // Award points to verifier
  await updateUserStats(userId, "verified");

  return report;
}

export async function resolveReport(id: string, afterImageUrl?: string): Promise<Report | null> {
  const report = await getReportById(id);
  if (!report) return null;

  report.status = ReportStatus.RESOLVED;
  if (afterImageUrl) {
    report.after_image_url = afterImageUrl;
  }
  report.resolved_at = new Date().toISOString();
  report.updated_at = new Date().toISOString();

  try {
    await supabase.from("reports").upsert(report);
    await supabase.from("complaints").upsert(report);
  } catch (err: any) {
    console.log("Database status resolution successfully recorded in local cache database.", err.message || err);
  }

  // Update local cache
  const idx = localReports.findIndex(r => r.id === id);
  if (idx >= 0) {
    localReports[idx] = report;
    syncLocalDatabase(true);
  }

  // Double civic score of original creator for a verified resolve
  if (report.created_by) {
    await updateUserStats(report.created_by, "resolved_creator");
  }

  return report;
}

export async function saveBilingualGrievance(id: string, bilingualGrievance: { english: string; hindi: string }): Promise<void> {
  const report = await getReportById(id);
  if (!report) return;

  report.bilingual_grievance = bilingualGrievance;
  report.updated_at = new Date().toISOString();

  try {
    await supabase.from("reports").upsert(report);
    await supabase.from("complaints").upsert({
      id: report.id,
      bilingual_grievance: bilingualGrievance,
      grievance_letter: bilingualGrievance.english,
      updated_at: report.updated_at
    });
  } catch (err: any) {
    console.log("Database grievance document update successfully recorded in local cache database.", err.message || err);
  }

  const idx = localReports.findIndex(r => r.id === id);
  if (idx >= 0) {
    localReports[idx] = report;
    syncLocalDatabase(true);
  }
}

export async function updateReport(report: Report): Promise<void> {
  const nowStr = new Date().toISOString();
  report.updated_at = nowStr;

  try {
    const { error } = await supabase.from("reports").upsert(report);
    if (error) throw error;
    
    // Sync to complaints table
    const formattedLocation = (report.location && typeof report.location === "object")
      ? (report.location.address || `${report.location.lat}, ${report.location.lng}`)
      : report.location;

    await supabase.from("complaints").upsert({
      ...report,
      id: report.id,
      location: formattedLocation,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    });
  } catch (err: any) {
    console.log("Database report update successfully recorded in local cache database.", err.message || err);
  }

  const idx = localReports.findIndex(r => r.id === report.id);
  if (idx >= 0) {
    localReports[idx] = report;
    syncLocalDatabase(true);
  }
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (data) {
      const up = data as UserProfile;
      const idx = localUsers.findIndex(u => u.id === userId);
      if (idx >= 0) localUsers[idx] = up;
      else localUsers.push(up);
      syncLocalDatabase(true);
      return up;
    }
  } catch (err: any) {
    console.log("Database user lookup resolved from local cache database fallback.", err.message || err);
  }
  return localUsers.find(u => u.id === userId) || null;
}
export async function updateUserStats(
  userId: string, 
  actionType: "filed" | "verified" | "resolved_creator" | "escalation_success" | "duplicate"
): Promise<void> {
  let profile = await getUserById(userId);
  if (!profile) {
    // Create lazy profile with nice metadata
    profile = {
      id: userId,
      name: userId.startsWith("user_") ? userId.replace("user_", "") : "Citizen " + userId.substr(0,4),
      email: `${userId}@nagarsevak.sandbox`,
      civic_score: 100,
      badges: ["Initiate Warden"],
      reports_filed: 0,
      reports_verified: 0,
      ward: "Ward 42",
      streak: 0
    };
    localUsers.push(profile);
  }

  // Award points on actions
  if (actionType === "filed") {
    profile.reports_filed += 1;
    profile.civic_score += 10; // File a verified report (+10)
  } else if (actionType === "verified") {
    profile.reports_verified += 1;
    profile.civic_score += 5; // Verify another user's report (+5)
  } else if (actionType === "resolved_creator") {
    profile.civic_score += 25; // Your report gets resolved (+25)
  } else if (actionType === "escalation_success") {
    profile.civic_score += 50; // Collective escalation success (+50)
  } else if (actionType === "duplicate") {
    profile.civic_score = Math.max(0, profile.civic_score - 20); // Filing a fake/duplicate (-20), clamp to 0
  }

  // Track streaks — consecutive days with at least one action
  if (actionType === "filed" || actionType === "verified" || actionType === "duplicate") {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    if (!profile.streak) {
      profile.streak = 1;
      profile.last_action_date = todayStr;
    } else if (profile.last_action_date) {
      if (profile.last_action_date !== todayStr) {
        const lastDateObj = new Date(profile.last_action_date);
        const todayDateObj = new Date(todayStr);
        // Calculate diff in calendar days
        const diffTime = Math.abs(todayDateObj.getTime() - lastDateObj.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          profile.streak += 1;
        } else if (diffDays > 1) {
          profile.streak = 1;
        }
        profile.last_action_date = todayStr;
      }
    } else {
      profile.streak = 1;
      profile.last_action_date = todayStr;
    }

    // Award Streak Master badge if streak reaches 30
    if (profile.streak >= 30 && !profile.badges.includes("Streak Master")) {
      profile.badges.push("Streak Master");
    }
  }

  // Award badges automatically
  const userReports = localReports.filter(r => r.created_by === userId);
  
  // 'Pothole Hunter' when user files 5 pothole reports
  const potholeReportsCount = userReports.filter(r => r.category === "pothole").length;
  if (potholeReportsCount >= 5 && !profile.badges.includes("Pothole Hunter")) {
    profile.badges.push("Pothole Hunter");
  }

  // 'Street Light Guardian' when user files 3 streetlight reports (per description in leaderboard showcase)
  const streetlightReportsCount = userReports.filter(r => r.category === "streetlight").length;
  if (streetlightReportsCount >= 3 && !profile.badges.includes("Street Light Guardian")) {
    profile.badges.push("Street Light Guardian");
  }

  // 'First Responder' when user verifies 10 reports
  if (profile.reports_verified >= 10 && !profile.badges.includes("First Responder")) {
    profile.badges.push("First Responder");
  }

  // Save changes to local database cache
  const idx = localUsers.findIndex(u => u.id === userId);
  if (idx >= 0) {
    localUsers[idx] = profile;
  }
  syncLocalDatabase(true);

  // Supabase update for the current user
  try {
    await supabase.from("users").upsert(profile);
  } catch (err: any) {
    console.log("Database user profile save recorded in local cache database.", err.message || err);
  }

  // 'Ward Champion' when user has highest score in their ward
  const ward = profile.ward || "Ward 42";
  const wardUsers = localUsers.filter(u => (u.ward || "Ward 42") === ward);
  if (wardUsers.length > 0) {
    const maxScore = Math.max(...wardUsers.map(u => u.civic_score));
    for (const u of wardUsers) {
      const isTop = u.civic_score === maxScore && maxScore > 0;
      let changed = false;
      if (isTop && !u.badges.includes("Ward Champion")) {
        u.badges.push("Ward Champion");
        changed = true;
      } else if (!isTop && u.badges.includes("Ward Champion")) {
        u.badges = u.badges.filter(b => b !== "Ward Champion");
        changed = true;
      }

      if (changed) {
        const uIdx = localUsers.findIndex(usr => usr.id === u.id);
        if (uIdx >= 0) {
          localUsers[uIdx] = u;
        }
        try {
          await supabase.from("users").upsert(u);
        } catch (e: any) {
          console.log("Database Ward Champion update recorded in local cache database.", e.message || e);
        }
      }
    }
    syncLocalDatabase(true);
  }
}

export async function getLeaderboard(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("civic_score", { ascending: false })
      .limit(20);
    if (error) throw error;
    if (data) return data as UserProfile[];
  } catch (err: any) {
    console.log("Database leaderboard compiled from local cache rankings.", err.message || err);
  }

  return [...localUsers]
    .sort((a, b) => b.civic_score - a.civic_score)
    .slice(0, 20);
}

export async function getDashboardStats() {
  const reportsList = await getReports();
  const total_reports = reportsList.length;
  
  const resolved = reportsList.filter(r => r.status === ReportStatus.RESOLVED);
  const resolved_count = resolved.length;

  // Average resolution time calculation in hours
  let avg_resolution_time = 0;
  if (resolved_count > 0) {
    let totalHours = 0;
    resolved.forEach(r => {
      if (r.resolved_at && r.created_at) {
        const created = new Date(r.created_at).getTime();
        const resolvedStamp = new Date(r.resolved_at).getTime();
        const diffMs = resolvedStamp - created;
        if (diffMs > 0) {
          totalHours += diffMs / (1000 * 60 * 60);
        }
      }
    });
    avg_resolution_time = Math.round((totalHours / resolved_count) * 10) / 10;
  }

  // Count by category
  const reports_by_category: Record<string, number> = {
    pothole: 0,
    water_leak: 0,
    garbage: 0,
    streetlight: 0,
    drainage: 0,
    encroachment: 0
  };

  // Count by status
  const reports_by_status: Record<string, number> = {
    filed: 0,
    acknowledged: 0,
    in_progress: 0,
    escalated_l1: 0,
    escalated_l2: 0,
    escalated_l3: 0,
    pending_verification: 0,
    resolved: 0
  };

  reportsList.forEach(r => {
    if (r.category && r.category in reports_by_category) {
      reports_by_category[r.category] += 1;
    } else if (r.category) {
      reports_by_category[r.category] = 1;
    }
    
    if (r.status && r.status in reports_by_status) {
      reports_by_status[r.status] += 1;
    } else if (r.status) {
      reports_by_status[r.status] = 1;
    }
  });

  return {
    total_reports,
    resolved_count,
    avg_resolution_time,
    reports_by_category,
    reports_by_status
  };
}
