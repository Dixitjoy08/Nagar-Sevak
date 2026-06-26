import React, { useState, useEffect, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "./LanguageContext";
import { 
  MapPin, 
  Flame, 
  Layers, 
  AlertCircle, 
  HelpCircle, 
  Sparkles, 
  X, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Eye, 
  Info,
  TrendingUp,
  SlidersHorizontal,
  Compass,
  AlertTriangle
} from "lucide-react";
import { Complaint } from "../types";

interface LiveMapProps {
  complaints: Complaint[];
  user: any;
  onUpvote: (id: string, e: React.MouseEvent) => void;
}

// Map key from environment mapping in vite.config.ts
const GOOGLE_MAPS_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const isMapKeyValid = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== "YOUR_GOOGLE_MAPS_API_KEY";

// Coordinates default center: Bangalore (Central BBMP office)
const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// Helper to extract clean status strings and map them to standard colors
const getStatusDetails = (status: string, t: (k: string) => string) => {
  const s = (status || "").toLowerCase().replace(/_/g, " ");
  if (s.includes("resolved")) {
    return { label: t("map.resolved"), color: "#10b981", bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" };
  }
  if (s.includes("escalated")) {
    let level = t("map.escalated");
    if (s.includes("l1")) level = `${t("map.escalated")} (L1)`;
    else if (s.includes("l2")) level = `${t("map.escalated")} (L2)`;
    else if (s.includes("l3")) level = `${t("map.escalated")} (L3)`;
    return { label: level, color: "#ef4444", bg: "bg-rose-500/10 border-rose-500/20 text-rose-400" };
  }
  if (s.includes("in progress") || s.includes("in_progress") || s.includes("acknowledged")) {
    return { label: t("map.inProgress"), color: "#f97316", bg: "bg-orange-500/10 border-orange-500/20 text-orange-400" };
  }
  if (s.includes("pending verification") || s.includes("pending_verification") || s.includes("verification")) {
    return { label: t("map.verification"), color: "#3b82f6", bg: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
  }
  // Default/Filed
  return { label: t("map.filed"), color: "#eab308", bg: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
};

// Helper to normalize and map categories
const getMappedCategory = (c: any): string => {
  if (c.category) return c.category.toLowerCase();
  const dept = (c.department || "").toLowerCase();
  if (dept.includes("road") || dept.includes("pothole")) return "pothole";
  if (dept.includes("water") || dept.includes("sewage") || dept.includes("pipe")) return "water_leak";
  if (dept.includes("garbage") || dept.includes("sanitation") || dept.includes("waste")) return "garbage";
  if (dept.includes("light") || dept.includes("electricity")) return "streetlight";
  if (dept.includes("drain") || dept.includes("sewage")) return "drainage";
  if (dept.includes("encroach")) return "encroachment";
  return "other";
};

// Helper for category-specific fallback images in case photo fails or is placeholder
const getCategoryFallbackImage = (c: any): string => {
  const cat = getMappedCategory(c);
  if (cat === "pothole") {
    return "https://images.unsplash.com/photo-1599740831244-4161b4df0d76?auto=format&fit=crop&w=600&q=80";
  }
  if (cat === "water_leak") {
    return "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80";
  }
  if (cat === "garbage") {
    return "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80";
  }
  if (cat === "streetlight") {
    return "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=600&q=80";
  }
  if (cat === "drainage") {
    return "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80";
  }
  return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80";
};

// Helper for UI label formatting
const getCategoryLabel = (c: any, t: (k: string) => string) => {
  if (c.category) {
    const key = c.category.toLowerCase();
    if (key === "pothole") return t("map.potholes");
    if (key === "water_leak") return t("map.waterLeaks");
    if (key === "garbage") return t("map.garbage");
    if (key === "streetlight") return t("map.streetlights");
    if (key === "drainage") return t("form.assignedCat");
    return c.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
  return c.department || t("form.sceneAnalysis");
};

// Helper for Severity weight
const getSeverity = (c: any): number => {
  if (typeof c.severity === "number") return c.severity;
  if (c.priority === "High") return 5;
  if (c.priority === "Medium") return 3;
  return 1;
};

// Relative time since filing helper
const getTimeSince = (dateStr: string) => {
  if (!dateStr) return "Recently";
  try {
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recently";
  }
};

const getFilingTime = (c: any) => {
  return getTimeSince(c.created_at || c.createdAt);
};

const getVerificationCount = (c: any): number => {
  if (c.community_verifications && typeof c.community_verifications.count === "number") {
    return c.community_verifications.count;
  }
  if (Array.isArray(c.verifiedBy)) {
    return c.verifiedBy.length;
  }
  return 0;
};

// Google Map custom styles for a premium blueprint look
const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#070a16" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#070a16" }, { weight: 2 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4d5b7c" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#00d4aa" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4d5b7c" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0b1222" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0a0f1d" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#718096" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#030712" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#313c54" }],
  },
];

// Custom Google Maps Heatmap Layer utilizing Google Maps Visualization Library
interface HeatmapLayerProps {
  points: { lat: number; lng: number }[];
}

function CustomHeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const [heatmap, setHeatmap] = useState<any>(null);

  useEffect(() => {
    if (!map || typeof window === "undefined" || !(window as any).google || !(window as any).google.maps || !(window as any).google.maps.visualization) return;

    const googleRef = (window as any).google;
    const data = points.map(
      (p) => new googleRef.maps.LatLng(p.lat, p.lng)
    );

    const layer = new googleRef.maps.visualization.HeatmapLayer({
      data: data,
      map: map,
      radius: 40,
      opacity: 0.85,
      gradient: [
        "rgba(0, 212, 170, 0)",
        "rgba(0, 212, 170, 0.4)",
        "rgba(249, 115, 22, 0.7)",
        "rgba(239, 68, 68, 0.95)"
      ]
    });

    setHeatmap(layer);

    return () => {
      if (layer) {
        layer.setMap(null);
      }
    };
  }, [map, points]);

  useEffect(() => {
    if (!heatmap || typeof window === "undefined" || !(window as any).google) return;
    const googleRef = (window as any).google;
    const data = points.map(
      (p) => new googleRef.maps.LatLng(p.lat, p.lng)
    );
    heatmap.setData(data);
  }, [heatmap, points]);

  return null;
}

export default function LiveMap({ complaints, user, onUpvote }: LiveMapProps) {
  const { t } = useLanguage();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [enableHeatmap, setEnableHeatmap] = useState<boolean>(false);

  // Parse coords for complaints safely
  const complaintsWithCoords = useMemo(() => {
    return complaints.map((c, index) => {
      let lat = BANGALORE_CENTER.lat;
      let lng = BANGALORE_CENTER.lng;

      // Check if location is object with coordinates
      if (c.location && typeof c.location === "object") {
        const locObj = c.location as any;
        if (typeof locObj.lat === "number" && typeof locObj.lng === "number") {
          lat = locObj.lat;
          lng = locObj.lng;
        }
      } else {
        // Fallback preset deterministic coordinates based on seeded data
        const PRESET_COORDINATES: Record<string, { lat: number; lng: number }> = {
          "seeded_report_1": { lat: 12.9815, lng: 77.6046 }, // East Bangalore
          "seeded_report_2": { lat: 12.9616, lng: 77.5846 }, // South West Bangalore
          "seeded_report_3": { lat: 12.9716, lng: 77.5946 }, // Central Market Area
        };
        if (PRESET_COORDINATES[c.id]) {
          lat = PRESET_COORDINATES[c.id].lat;
          lng = PRESET_COORDINATES[c.id].lng;
        } else {
          // Determinstic jitter to distribute general unmapped tickets around center
          const seed = c.title.length + index;
          const offsetLat = Math.sin(seed * 1.7) * 0.015;
          const offsetLng = Math.cos(seed * 1.3) * 0.015;
          lat = BANGALORE_CENTER.lat + offsetLat;
          lng = BANGALORE_CENTER.lng + offsetLng;
        }
      }

      return {
        ...c,
        coords: { lat, lng }
      };
    });
  }, [complaints]);

  // Filter complaints list
  const filteredComplaints = useMemo(() => {
    return complaintsWithCoords.filter((c) => {
      if (activeFilter === "All") return true;
      const mapped = getMappedCategory(c);
      if (activeFilter === "Potholes") return mapped === "pothole";
      if (activeFilter === "Water Leaks") return mapped === "water_leak";
      if (activeFilter === "Garbage") return mapped === "garbage";
      if (activeFilter === "Streetlights") return mapped === "streetlight";
      return true;
    });
  }, [complaintsWithCoords, activeFilter]);

  // Extract points specifically for the heatmap
  const heatmapPoints = useMemo(() => {
    return filteredComplaints.map((c) => c.coords);
  }, [filteredComplaints]);

  // Auto select first complaint for preview if none selected
  useEffect(() => {
    if (filteredComplaints.length > 0 && !selectedComplaint) {
      // Find one that matches filter if possible
      setSelectedComplaint(filteredComplaints[0]);
    } else if (selectedComplaint) {
      // Verify currently selected is still in filtered set, else pick first
      const stillVisible = filteredComplaints.some(c => c.id === selectedComplaint.id);
      if (!stillVisible && filteredComplaints.length > 0) {
        setSelectedComplaint(filteredComplaints[0]);
      }
    }
  }, [filteredComplaints, selectedComplaint]);

  const mapOptions = useMemo(() => ({
    styles: MAP_STYLES,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: "cooperative" as const,
  }), []);

  return (
    <div className="w-full space-y-5">
      
      {/* 1. Header Filter Bar & Pothole Prophet Heatmap Toggle */}
      <div className="glass-card rounded-2xl p-4 md:p-5 border border-white/5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Side: Filter Buttons */}
        <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-4 flex-grow">
          <div className="flex items-center gap-2 text-zinc-400">
            <SlidersHorizontal className="w-4 h-4 text-[#00d4aa]" />
            <span className="text-xs font-semibold font-mono uppercase tracking-wider">{t("map.filters")}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "All", label: t("map.all") },
              { id: "Potholes", label: t("map.potholes") },
              { id: "Water Leaks", label: t("map.waterLeaks") },
              { id: "Garbage", label: t("map.garbage") },
              { id: "Streetlights", label: t("map.streetlights") }
            ].map((btn) => {
              const isActive = activeFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setActiveFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium tracking-wide transition cursor-pointer ${
                    isActive
                      ? "bg-[#00d4aa] border-[#00d4aa] text-black font-bold shadow-lg shadow-[#00d4aa]/15"
                      : "bg-black/30 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Pothole Prophet Heatmap Mode Switch */}
        <div className="flex items-center gap-3 bg-[#0a0f1d] border border-white/5 px-4 py-2.5 rounded-2xl self-start lg:self-center">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-[#ff6b35]/15 rounded-lg border border-[#ff6b35]/25">
              <Sparkles className="w-4 h-4 text-[#ff6b35] animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white uppercase tracking-wider font-display flex items-center gap-1">
                <span>{t("map.prophet")}</span>
                <span className="bg-[#ff6b35]/20 text-[#ff6b35] text-[7px] font-mono px-1 py-0.5 rounded uppercase tracking-widest font-bold">AI</span>
              </p>
              <p className="text-[9px] text-zinc-500 leading-none">{t("map.prophetDesc")}</p>
            </div>
          </div>
          
          <button
            onClick={() => setEnableHeatmap(!enableHeatmap)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enableHeatmap ? "bg-[#ff6b35]" : "bg-white/15"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enableHeatmap ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

      </div>

      {/* 2. Main Map Container View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Map Canvas Frame */}
        <div className="lg:col-span-8 bg-[#040610] border border-white/5 rounded-2xl p-2 shadow-2xl relative overflow-hidden min-h-[500px] h-[600px] flex flex-col justify-between">
          
          {/* Status color-coding legend overlay */}
          <div className="absolute top-4 left-4 z-10 bg-black/85 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-xl space-y-2 max-w-[190px] pointer-events-none md:pointer-events-auto">
            <h5 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[#00d4aa]" />
              <span>{t("map.legend")}</span>
            </h5>
            <div className="grid grid-cols-1 gap-1.5 text-[10px] font-mono text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#10b981" }} />
                <span>{t("map.resolved")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#eab308" }} />
                <span>{t("map.filed")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f97316" }} />
                <span>{t("map.inProgress")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                <span>{t("map.escalated")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                <span>{t("map.verification")}</span>
              </div>
            </div>
          </div>

          {/* Map Area */}
          <div className="w-full h-full relative z-0 rounded-xl overflow-hidden">
            {isMapKeyValid ? (
              <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly" libraries={["visualization"]}>
                <Map
                  defaultCenter={BANGALORE_CENTER}
                  defaultZoom={12}
                  mapId="DEMO_MAP_ID"
                  options={mapOptions}
                  className="w-full h-full"
                >
                  {/* Heatmap Prophet Overlay layer */}
                  {enableHeatmap && (
                    <CustomHeatmapLayer points={heatmapPoints} />
                  )}

                  {/* Individual markers */}
                  {filteredComplaints.map((c) => {
                    const status = getStatusDetails(c.status, t);
                    const isSelected = selectedComplaint?.id === c.id;

                    return (
                      <AdvancedMarker
                        key={c.id}
                        position={c.coords}
                        onClick={() => setSelectedComplaint(c)}
                      >
                        <Pin 
                          background={status.color} 
                          borderColor={isSelected ? "#ffffff" : status.color} 
                          glyphColor={isSelected ? "#000000" : "#ffffff"}
                          scale={isSelected ? 1.25 : 1.0}
                        />
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            ) : (
              /* Simulated high-quality interactable blueprint map vector with Heatmap support */
              <div className="w-full h-full bg-[#05070e] relative flex items-center justify-center overflow-hidden">
                {/* Blueprint grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:25px_25px]" />
                
                {/* Visual Radial Hotspots rendering when heatmap Prophet is active */}
                {enableHeatmap && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {/* Glowing heatmap zones centered on the reactive marker positions */}
                    {filteredComplaints.map((c, i) => {
                      const xPercent = 30 + (Math.sin(i * 1.5) * 20) + 20;
                      const yPercent = 35 + (Math.cos(i * 1.8) * 20) + 15;
                      return (
                        <div 
                          key={`heat-${c.id}`}
                          className="absolute rounded-full blur-3xl opacity-40 mix-blend-screen animate-pulse"
                          style={{
                            left: `${xPercent}%`,
                            top: `${yPercent}%`,
                            width: "150px",
                            height: "150px",
                            background: "radial-gradient(circle, rgba(239,68,68,0.7) 0%, rgba(249,115,22,0.4) 40%, rgba(0,212,170,0) 70%)"
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* District lines mock vector */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 z-0" viewBox="0 0 1000 600">
                  <path d="M 100 100 Q 300 150 500 120 T 900 150 L 800 500 Q 500 400 200 480 Z" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="5 5" />
                  <path d="M 300 150 Q 400 350 500 400" fill="none" stroke="rgba(0,212,170,0.15)" strokeWidth="1" />
                  <text x="180" y="210" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="var(--font-mono)" fontWeight="bold">WARD 4 (RESIDENTIAL)</text>
                  <text x="650" y="240" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="var(--font-mono)" fontWeight="bold">WARD 9 (NURSERY)</text>
                  <text x="440" y="320" fill="rgba(255,255,255,0.25)" fontSize="11" fontFamily="var(--font-mono)" fontWeight="bold">WARD CENTRAL (BBMP)</text>
                  <text x="510" y="480" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="var(--font-mono)" fontWeight="bold">WARD 12 (MARKET)</text>
                </svg>

                {/* Simulated markers */}
                <div className="absolute inset-0 z-10">
                  {filteredComplaints.map((c, i) => {
                    // Position them deterministically on the simulated grid
                    const xPercent = 30 + (Math.sin(i * 1.5) * 20) + 20;
                    const yPercent = 35 + (Math.cos(i * 1.8) * 20) + 15;
                    const status = getStatusDetails(c.status, t);
                    const isSelected = selectedComplaint?.id === c.id;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedComplaint(c)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                        style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                      >
                        {/* Hover/Selected beacon halo */}
                        <span 
                          className="absolute inset-0 rounded-full scale-[2.5] blur-md transition duration-300 opacity-20 group-hover:opacity-40"
                          style={{ backgroundColor: status.color }}
                        />
                        
                        {/* Pin Dot */}
                        <div 
                          className={`relative rounded-full border flex items-center justify-center transition-all duration-300 ${
                            isSelected ? "scale-125 shadow-lg shadow-white/10" : "scale-100"
                          }`}
                          style={{ 
                            backgroundColor: status.color, 
                            borderColor: isSelected ? "#ffffff" : "transparent",
                            width: isSelected ? "18px" : "14px",
                            height: isSelected ? "18px" : "14px"
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-black/50" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Floating GPS center warning label */}
                <div className="absolute bottom-4 right-4 bg-[#0a0e27]/90 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-zinc-400 font-mono z-20 max-w-[260px] leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-300 block mb-0.5">{t("map.mockActive")}</span>
                    {t("map.mockDesc")}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Selected Complaint Detailed Popup Card */}
        <div className="lg:col-span-4 space-y-4">
          <AnimatePresence mode="wait">
            {selectedComplaint ? (
              <motion.div
                key={selectedComplaint.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="glass-card rounded-2xl p-5 border border-white/5 shadow-2xl space-y-5 relative flex flex-col justify-between h-full min-h-[500px]"
              >
                
                <div className="space-y-4">
                  
                  {/* Photo evidence preview/thumbnail */}
                  <div className="relative h-44 rounded-xl overflow-hidden border border-white/5 bg-black/40 flex items-center justify-center font-sans">
                    {selectedComplaint.image_url ? (
                      <img
                        src={selectedComplaint.image_url}
                        alt={selectedComplaint.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = getCategoryFallbackImage(selectedComplaint);
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                    ) : (
                      <img
                        src={getCategoryFallbackImage(selectedComplaint)}
                        alt={selectedComplaint.title}
                        className="w-full h-full object-cover opacity-70 filter brightness-90"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    {/* Float status & severity badges over the thumbnail */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-mono font-bold uppercase tracking-widest ${getStatusDetails(selectedComplaint.status, t).bg}`}>
                        {getStatusDetails(selectedComplaint.status, t).label}
                      </span>
                      
                      <span className="bg-black/80 backdrop-blur-md text-[#ff6b35] border border-[#ff6b35]/20 font-mono text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#ff6b35]" />
                        <span>{t("map.impact")} {getSeverity(selectedComplaint)} / 5</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-2">
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest font-bold">
                      {getCategoryLabel(selectedComplaint, t)}
                    </span>
                    
                    <h4 className="text-base font-bold font-display text-white leading-snug">
                      {selectedComplaint.title}
                    </h4>
                    
                    <p className="text-xs text-zinc-300 leading-relaxed max-h-[140px] overflow-y-auto scrollbar-thin">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {/* Diagnostic details section */}
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-2.5 text-xs">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#ff6b35]" />
                        <span>{t("map.location")}</span>
                      </span>
                      <span className="font-semibold text-zinc-200 truncate max-w-[150px]">
                        {typeof selectedComplaint.location === "object" 
                          ? (selectedComplaint.location as any).address || "Bangalore" 
                          : selectedComplaint.location}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t("map.filingAge")}</span>
                      </span>
                      <span className="font-mono text-zinc-300 font-medium">
                        {getFilingTime(selectedComplaint)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t("map.verifications")}</span>
                      </span>
                      <span className="font-mono text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/25">
                        {getVerificationCount(selectedComplaint)} {t("map.approved")}
                      </span>
                    </div>

                  </div>

                </div>

                {/* Support/Upvote button action */}
                <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                  <button
                    onClick={(e) => onUpvote(selectedComplaint.id, e)}
                    className="w-full flex items-center justify-center space-x-2 bg-white/5 border border-white/5 hover:border-[#00d4aa]/30 hover:bg-[#00d4aa]/5 rounded-xl py-3 transition text-xs font-bold text-zinc-300 hover:text-white cursor-pointer active:scale-[0.98]"
                  >
                    <Flame className="w-4 h-4 text-[#ff6b35] animate-bounce" />
                    <span>{t("map.supportAction")} ({selectedComplaint.upvotes || 0})</span>
                  </button>
                </div>

              </motion.div>
            ) : (
              <div className="glass-card rounded-2xl p-8 border border-white/5 text-center min-h-[500px] flex flex-col justify-center items-center space-y-4">
                <div className="p-4 bg-white/5 rounded-full text-zinc-500 border border-white/5">
                  <MapPin className="w-7 h-7 text-zinc-400 animate-pulse" />
                </div>
                <h5 className="text-sm font-semibold font-display text-zinc-300">{t("map.noSignal")}</h5>
                <p className="text-xs text-zinc-500 max-w-[210px] leading-relaxed">
                  {t("map.noSignalDesc")}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
