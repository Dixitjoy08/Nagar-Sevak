import React, { useState, useEffect } from "react";
import { 
  auth, 
  db, 
  OperationType, 
  handleFirestoreError,
  onAuthStateChanged, 
  signOut,
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc 
} from "./firebase";
import Navbar from "./components/Navbar";
import { useLanguage } from "./components/LanguageContext";
import StatsDashboard from "./components/StatsDashboard";
import ReportGrievance from "./components/ReportGrievance";
import GrievanceFeed from "./components/GrievanceFeed";
import GrievanceTracker from "./components/GrievanceTracker";
import SevakAssistant from "./components/SevakAssistant";
import LiveMap from "./components/LiveMap";
import Leaderboard from "./components/Leaderboard";
import AuthModal from "./components/AuthModal";
import { Complaint, RoleType } from "./types";
import { 
  Home, 
  Camera, 
  Map, 
  ClipboardList, 
  Trophy, 
  Bot, 
  Shield, 
  Users, 
  Sparkles, 
  Milestone,
  LogOut,
  User,
  Activity,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleType>("citizen");
  
  // Tab states: dashboard, report, map, tracker, leaderboard, assistant
  const [activeTab, setActiveTab] = useState<"dashboard" | "report" | "map" | "tracker" | "leaderboard" | "assistant">("dashboard");
  
  // Realtime complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Authenticate session listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Realtime Firestore listener
  useEffect(() => {
    setDbLoading(true);
    const q = query(collection(db, "complaints"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Complaint[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          location: data.location || "",
          department: data.department || "Roads & Traffic",
          priority: data.priority || "Medium",
          status: data.status || "Pending",
          reporterEmail: data.reporterEmail || "",
          reporterName: data.reporterName || "Anonymous",
          upvotes: data.upvotes || 0,
          upvotedBy: data.upvotedBy || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          comments: data.comments || [],
          aiAnalysis: data.aiAnalysis,
          grievance_letter: data.grievance_letter,
          bilingual_grievance: data.bilingual_grievance,
          similar_reports: data.similar_reports || [],
          image_url: data.image_url || "",
          after_image_url: data.after_image_url || "",
          escalation_history: data.escalation_history || [],
          verifiedBy: data.verifiedBy || [],
          community_verifications: data.community_verifications || { count: 0, user_ids: [] }
        } as Complaint);
      });
      setComplaints(list);
      setDbLoading(false);
    }, (error) => {
      console.error("Firestore loading failure:", error);
      setDbLoading(false);
      
      // If db is not yet initialized or rules block us, we load backup complaints
      if (complaints.length === 0) {
        setComplaints(getBackupInMemoryComplaints());
      }

      try {
        handleFirestoreError(error, OperationType.GET, "complaints");
      } catch (e) {
        console.warn("Permission wrapper processed:", e);
      }
    });

    return () => unsubscribe();
  }, []);

  // Seed database helper
  useEffect(() => {
    const seedDatabaseIfEmpty = async () => {
      if (!dbLoading && complaints.length === 0 && user) {
        console.log("Empty Firestore complaints collection. Seeding initial interactive reports...");
        const dbRef = collection(db, "complaints");
        const seedData = getBackupInMemoryComplaints().map(c => {
          const { id, ...rest } = c;
          return rest;
        });

        for (const report of seedData) {
          try {
            await addDoc(dbRef, report);
          } catch (err) {
            console.error("Failed seeding database entry:", err);
            try {
              handleFirestoreError(err, OperationType.CREATE, "complaints");
            } catch (e) {
              console.warn("Seeding permission check wrapper processed:", e);
            }
          }
        }
      }
    };

    seedDatabaseIfEmpty();
  }, [dbLoading, complaints.length, user]);

  const handleCentralUpvote = async (complaintId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const email = user.email || "guest@nagarsevak.sandbox";
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    try {
      const docRef = doc(db, "complaints", complaintId);
      const list = complaint.upvotedBy || [];
      const hasUpvoted = list.includes(email);

      let updatedList = [];
      let updatedVotes = complaint.upvotes || 0;

      if (hasUpvoted) {
        updatedList = list.filter(e => e !== email);
        updatedVotes = Math.max(0, updatedVotes - 1);
      } else {
        updatedList = [...list, email];
        updatedVotes += 1;
      }

      await updateDoc(docRef, {
        upvotes: updatedVotes,
        upvotedBy: updatedList
      });
    } catch (err) {
      console.error("Central map upvote failed:", err);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "report", label: "Report Issue", icon: Camera },
    { id: "map", label: "Live Map", icon: Map },
    { id: "tracker", label: "Tracker", icon: ClipboardList },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "assistant", label: "AI Assistant", icon: Bot },
  ] as const;

  return (
    <div id="nagarsevak-app" className="min-h-screen bg-[#0a0e27] text-zinc-100 font-sans flex flex-col md:flex-row justify-start relative">
      
      {/* 1. FIXED DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-white/5 bg-[#0b102b]/90 backdrop-blur-xl z-30 justify-between py-6 px-4">
        <div className="space-y-7">
          
          {/* Logo & Headline */}
          <div className="flex items-center space-x-3 px-2">
            <div className="p-2.5 bg-gradient-to-br from-[#00d4aa] to-[#151d45] border border-white/10 rounded-xl shadow-lg">
              <Milestone className="w-5.5 h-5.5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-wide text-white flex items-center gap-1">
                Nagar<span className="text-[#00d4aa]">Sevak</span>
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-400">
                {t("sidebar.municipalSuite")}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? "bg-[#00d4aa]/10 text-[#00d4aa] border-l-2 border-[#00d4aa]" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#00d4aa]" : "text-zinc-400 group-hover:text-white"}`} />
                  <span>{t(`nav.${item.id}`)}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & quick role controller at sidebar bottom */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2.5">
            {/* Simulation toggle */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{t("sidebar.viewMode")}</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[9px] ${
                currentRole === "officer" ? "bg-[#ff6b35]/15 text-[#ff6b35]" : "bg-[#00d4aa]/15 text-[#00d4aa]"
              }`}>
                {currentRole === "officer" ? t("sidebar.officer") : t("sidebar.citizen")}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setCurrentRole("citizen")}
                className={`py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  currentRole === "citizen"
                    ? "bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/20"
                    : "bg-black/20 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t("sidebar.citizen")}
              </button>
              <button
                onClick={() => setCurrentRole("officer")}
                className={`py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  currentRole === "officer"
                    ? "bg-[#ff6b35]/15 text-[#ff6b35] border border-[#ff6b35]/20"
                    : "bg-black/20 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t("sidebar.officer")}
              </button>
            </div>
          </div>

          {user ? (
            <div className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="w-8 h-8 rounded-full bg-[#0a0e27] border border-white/10 flex items-center justify-center text-[#00d4aa] font-bold text-xs flex-shrink-0">
                  {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : "CI"}
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-semibold text-white truncate max-w-[110px]">{user.displayName || "Resident"}</p>
                  <p className="text-[10px] font-mono text-zinc-400 truncate max-w-[110px]">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-1 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                title={t("sidebar.signOut")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full flex items-center justify-center space-x-2 bg-[#00d4aa] hover:bg-[#00d4aa]/95 text-[#0a0e27] font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>{t("sidebar.signIn")}</span>
            </button>
          )}
        </div>
      </aside>

      {/* 2. MOBILE TOP NAV (Header fallback on mobile viewports) */}
      <div className="md:hidden w-full glass-card border-b border-white/5 px-4 py-3 flex items-center justify-between z-30 sticky top-0 bg-[#0a0e27]/90 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <Milestone className="w-5 h-5 text-[#00d4aa]" />
          <span className="font-bold font-display text-white tracking-wide text-sm">NagarSevak</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick toggle role */}
          <button
            onClick={() => setCurrentRole(currentRole === "citizen" ? "officer" : "citizen")}
            className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider font-mono border transition ${
              currentRole === "officer" 
                ? "bg-[#ff6b35]/15 border-[#ff6b35]/30 text-[#ff6b35]" 
                : "bg-[#00d4aa]/15 border-[#00d4aa]/30 text-[#00d4aa]"
            }`}
          >
            {currentRole === "officer" ? t("sidebar.officer") : t("sidebar.citizen")}
          </button>

          {user ? (
            <button 
              onClick={() => signOut(auth)}
              className="p-1 text-zinc-400 hover:text-rose-400 transition"
              title={t("sidebar.signOut")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="p-1.5 bg-[#00d4aa] text-[#0a0e27] rounded-lg text-xs font-bold uppercase"
            >
              <User className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER AREA (Right Side) */}
      <main className="flex-grow md:pl-64 flex flex-col min-h-screen">
        
        {/* Persistent Top Bar with Language Toggle (EN | हिं) */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 bg-[#0a0e27]/40 border-b border-white/5 flex justify-between items-center z-15">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs">
            <span className="font-mono text-[10px] tracking-widest text-[#00d4aa]">NAGARSEVAK SYSTEM ACTIVE</span>
          </div>
          <div className="flex items-center space-x-3">
            {/* Language toggle: EN | हिं */}
            <div id="language-toggle" className="bg-white/5 border border-white/10 p-0.5 rounded-lg flex items-center shadow-lg">
              <button
                id="lang-en-btn"
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition duration-200 cursor-pointer ${
                  language === "en"
                    ? "bg-[#00d4aa] text-[#0a0e27]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                id="lang-hi-btn"
                onClick={() => setLanguage("hi")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition duration-200 cursor-pointer ${
                  language === "hi"
                    ? "bg-[#00d4aa] text-[#0a0e27]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                हिं
              </button>
            </div>
          </div>
        </div>

        {/* Officer Board Warning Overlay banner */}
        {currentRole === "officer" && (
          <div className="w-full bg-[#ff6b35]/10 border-b border-[#ff6b35]/25 text-[#ff6b35] text-center py-2.5 px-4 font-mono font-semibold text-xs flex items-center justify-center space-x-2 z-20">
            <Shield className="w-4 h-4 text-[#ff6b35]" />
            <span>{t("sidebar.officerCommandBoard")}</span>
          </div>
        )}

        {/* Main Content Workspace */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-8">
          
          {/* Stunning greeting bento banner (only on dashboard view for elegant spacing) */}
          {activeTab === "dashboard" && (
            <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border border-white/5">
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#00d4aa]/5 rounded-full blur-[120px] pointer-events-none" />
              
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-white uppercase">
                  {t("hero.title")}
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {t("hero.desc")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setActiveTab("report")}
                  className="flex items-center justify-center space-x-2 bg-[#00d4aa] text-[#0a0e27] font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl shadow-lg hover:bg-[#00d4aa]/90 active:scale-[0.98] transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t("hero.btn.report")}</span>
                </button>
                <button
                  onClick={() => setActiveTab("assistant")}
                  className="flex items-center justify-center space-x-2 bg-white/5 border border-white/5 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl hover:bg-white/10 active:scale-[0.98] transition cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>{t("hero.btn.assistant")}</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE PORT TRANSITIONS DECK */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full"
            >
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  <StatsDashboard complaints={complaints} />
                  
                  {/* Embedded platform info deck */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card rounded-xl p-5 border border-white/5">
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="w-4 h-4 text-[#00d4aa]" />
                        <h4 className="text-sm font-bold font-display uppercase tracking-wider text-white">{t("banner.duplicateIsolation")}</h4>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {t("banner.duplicateDesc")}
                      </p>
                    </div>

                    <div className="glass-card rounded-xl p-5 border border-white/5">
                      <div className="flex items-center space-x-2 mb-3">
                        <Activity className="w-4 h-4 text-[#ff6b35]" />
                        <h4 className="text-sm font-bold font-display uppercase tracking-wider text-white">{t("banner.escalateTriggers")}</h4>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {t("banner.escalateDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "report" && (
                <div className="max-w-4xl mx-auto">
                  <ReportGrievance 
                    user={user} 
                    onSuccess={() => {
                      setActiveTab("tracker");
                    }}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                </div>
              )}

              {activeTab === "map" && (
                <div className="w-full">
                  <LiveMap 
                    complaints={complaints} 
                    user={user} 
                    onUpvote={handleCentralUpvote} 
                  />
                </div>
              )}

              {activeTab === "tracker" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-2">
                    <div>
                      <h3 className="text-lg font-bold font-display text-white uppercase tracking-wider flex items-center gap-2">
                        <span>{t("tracker.header")}</span>
                        {dbLoading && <div className="w-2 h-2 bg-[#00d4aa] rounded-full animate-ping" />}
                      </h3>
                      <p className="text-xs text-zinc-400">{t("tracker.desc")}</p>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#00d4aa] flex items-center gap-1.5 bg-[#00d4aa]/5 border border-[#00d4aa]/15 px-2 py-0.5 rounded">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" />
                      <span>{t("tracker.sync")}</span>
                    </span>
                  </div>
                  
                  <GrievanceTracker 
                    complaints={complaints} 
                    user={user} 
                    currentRole={currentRole} 
                    onOpenAuth={() => setIsAuthOpen(true)} 
                  />
                </div>
              )}

              {activeTab === "leaderboard" && (
                <div className="max-w-4xl mx-auto">
                  <Leaderboard user={user} />
                </div>
              )}

              {activeTab === "assistant" && (
                <div className="max-w-3xl mx-auto">
                  <SevakAssistant user={user} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

        </div>

        {/* 4. FOOTER */}
        <footer className="w-full bg-[#080c21]/80 border-t border-white/5 py-5 text-center text-[10px] text-zinc-500 font-mono mt-auto select-none pb-24 md:pb-5">
          <p>© 2026 NAGARSEVAK SYSTEM. All civic files processed via Google Gemini 3.5 routing pipeline.</p>
          <p className="mt-0.5 text-zinc-600">Sandboxed Node.js Environment • Persistent Firestore Database</p>
        </footer>
      </main>

      {/* 5. FIXED MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-card border-t border-white/5 bg-[#0a0e27]/95 backdrop-blur-xl z-30 flex justify-around items-center px-1 py-1 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive ? "text-[#00d4aa] scale-105" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[8.5px] font-medium tracking-tight font-sans truncate max-w-full">
                {t("nav." + item.id)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Auth onboarding Dialog */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />

    </div>
  );
}

// Backup mock dataset for immediate visualization and initialization support
function getBackupInMemoryComplaints(): Complaint[] {
  return [
    {
      id: "seeded_report_1",
      title: "Broken streetlight causing deep dark corridor on Corner of Ward 4",
      description: "The streetlamp near gate 4 of Royal Garden Apartment was shattered by high wind gusts last Tuesday. The entire corner is completely dark now, making it hazardous for women and senior citizens walking past. Several residents have tripped on the curbs.",
      department: "Electricity & Street Lights",
      priority: "High",
      status: "In Progress",
      reporterEmail: "rajeev.sharma@domain.com",
      reporterName: "Rajeev Sharma",
      upvotes: 14,
      upvotedBy: ["guest@nagarsevak.sandbox"],
      createdAt: "2026-06-20T10:48:00.000Z",
      updatedAt: "2026-06-22T14:30:00.000Z",
      location: "Gate 4, Royal Garden Apts, Ward 4",
      comments: [
        {
          id: "seeded_com_1",
          authorName: "Karan Johar",
          authorEmail: "karan@domain.com",
          text: "Agreed. It gets incredibly risky after 8 PM here. Hope light poles are changed soon.",
          createdAt: "2026-06-21T11:20:00.000Z",
          isOfficial: false
        },
        {
          id: "seeded_com_2",
          authorName: "Officer Ward 4 Grid",
          authorEmail: "officer.ward4@nagar.com",
          text: "Official update: Technicians have cataloged the broken fuse relay. Procurement of LED bulb socket completed, replacement team dispatched for installation.",
          createdAt: "2026-06-22T14:30:00.000Z",
          isOfficial: true
        }
      ],
      aiAnalysis: {
        department: "Electricity & Street Lights",
        priority: "High",
        reasoning: "A fully out-of-order street light at a busy residential entrance creates deep security concerns, increasing burglary and physical injury risk at night.",
        summary: "Broken streetlight has plunged the corner of Ward 4 into deep darkness.",
        keywords: ["broken-streetlamp", "nighttime-safety", "residential-grid"],
        suggestedAction: "Depute grid technicians with an elevator ladder to replace the light housing assembly immediately."
      }
    },
    {
      id: "seeded_report_2",
      title: "Illegal waste dumping piling near public nursery playground",
      description: "Construction materials and rotting commercial hotel waste have been illegally dumped at the edge of the Nursery. It is emitting an offensive stench and attracting large swarms of files and stray rodent herds. Unsafe for kids.",
      department: "Sanitation & Waste Management",
      priority: "Medium",
      status: "Reviewed",
      reporterEmail: "ananya.rodriguez@domain.com",
      reporterName: "Ananya Rodriguez",
      upvotes: 8,
      upvotedBy: [],
      createdAt: "2026-06-21T08:15:00.000Z",
      updatedAt: "2026-06-22T09:00:00.000Z",
      location: "Main Gate, Ward 9 Children's Park",
      comments: [],
      aiAnalysis: {
        department: "Sanitation & Waste Management",
        priority: "Medium",
        reasoning: "Rotting commercial organic waste near active childrens' playgrounds represents severe hygiene hazards but is not an instant structural threat.",
        summary: "Heavy garbage piled near a children's nursery playground.",
        keywords: ["solid-waste", "illegal-dumping", "hygiene-audit"],
        suggestedAction: "Task a heavy waste-loader truck and sanitizing spray sweepers to clean up and treat the playground borders."
      }
    },
    {
      id: "seeded_report_3",
      title: "Major water pipeline rupture flooding Main Market road",
      description: "A large underground water pipe split open early this morning near the central vegetable market. Hundreds of gallons of clean tap supply are flooding onto Roadway, causing major traffic logs and muddy slush.",
      department: "Water & Sewage",
      priority: "High",
      status: "Pending",
      reporterEmail: "mahesh.m@domain.com",
      reporterName: "Mahesh Murthy",
      upvotes: 5,
      upvotedBy: [],
      createdAt: "2026-06-23T04:10:00.000Z",
      updatedAt: "2026-06-23T04:10:00.000Z",
      location: "Opposite Fruit Stall 15, Central Market, Ward 12",
      comments: [],
      aiAnalysis: {
        department: "Water & Sewage",
        priority: "High",
        reasoning: "Flooding of core municipal commercial lanes leads to swift traffic deadlocks, massive water wastage, and local basement dampness issues.",
        summary: "Underground clean water pipeline rupture is flooding Main Market road.",
        keywords: ["pipeline-rupture", "water-spill", "ward-12-floods"],
        suggestedAction: "Shut down primary municipal water valves for Section 12, then excavate around the fruit stall to weld clamp repairs."
      }
    }
  ];
}
