import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "./LanguageContext";
import { 
  Sparkles, 
  MapPin, 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Camera, 
  Mic, 
  MicOff, 
  UploadCloud, 
  X, 
  FileText, 
  Phone, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  Copy,
  Locate,
  Check
} from "lucide-react";

interface ReportGrievanceProps {
  user: any;
  onSuccess: () => void;
  onOpenAuth: () => void;
}

// Map key from environment mapped in vite.config.ts
const GOOGLE_MAPS_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const isMapKeyValid = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== "YOUR_GOOGLE_MAPS_API_KEY";

export default function ReportGrievance({ user, onSuccess, onOpenAuth }: ReportGrievanceProps) {
  const { language, t } = useLanguage();
  // Coordinates default to Central BBMP coordinates (Bangalore)
  const [coordinates, setCoordinates] = useState({ lat: 12.9716, lng: 77.5946 });
  const [address, setAddress] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("garbage");
  const [severity, setSeverity] = useState(3);
  
  // Drag and Drop files
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // UI Loading States
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);
  const [activeLetterTab, setActiveLetterTab] = useState<"english" | "hindi">("english");
  const [copiedLetter, setCopiedLetter] = useState(false);

  // Geocoder Instance
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = language === "hi" ? "hi-IN" : "en-IN"; // English/Hindi dynamic voice input

        rec.onstart = () => setIsListening(true);
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setDescription((prev) => prev ? `${prev} ${transcript}` : transcript);
        };
        rec.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setIsListening(false);
        };
        rec.onend = () => setIsListening(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  // Update voice input language on-the-fly when global language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === "hi" ? "hi-IN" : "en-IN";
    }
  }, [language]);

  // Set Geocoder once window.google is loaded
  useEffect(() => {
    if (isMapKeyValid && typeof window !== "undefined" && (window as any).google) {
      setGeocoder(new (window as any).google.maps.Geocoder());
    }
  }, [GOOGLE_MAPS_KEY]);

  // Handle browser auto-geolocation on mount
  useEffect(() => {
    handleAutoDetectGPS(false); // Silent auto-detection on mount
  }, []);

  const handleAutoDetectGPS = (verbose = true) => {
    if (!navigator.geolocation) {
      if (verbose) alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords = { lat: latitude, lng: longitude };
        setCoordinates(newCoords);
        
        // Reverse geocode if geocoder is available
        if (geocoder) {
          geocoder.geocode({ location: newCoords }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              setAddress(results[0].formatted_address);
            }
          });
        } else {
          // Quick fetch fallback reverse geocoder
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(res => {
              if (!res.ok) throw new Error("HTTP error: " + res.status);
              return res.json();
            })
            .then(data => {
              if (data && data.display_name) {
                setAddress(data.display_name);
              }
            })
            .catch(err => console.error("OSM fallback geocoding error:", err));
        }
      },
      (error) => {
        console.warn("Geolocation access denied or timed out:", error);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Reverse geocode when dragging marker finishes
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      const newCoords = { lat: newLat, lng: newLng };
      setCoordinates(newCoords);

      if (geocoder) {
        geocoder.geocode({ location: newCoords }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            setAddress(results[0].formatted_address);
          }
        });
      } else {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`)
          .then(res => {
            if (!res.ok) throw new Error("HTTP error: " + res.status);
            return res.json();
          })
          .then(data => {
            if (data && data.display_name) {
              setAddress(data.display_name);
            }
          })
          .catch(err => console.error("OSM fallback geocoding error:", err));
      }
    }
  };

  // Drag and Drop files handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processAttachedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAttachedFile(e.target.files[0]);
    }
  };

  const processAttachedFile = (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Invalid file type. Please upload a photo or video.");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Auto describe image with AI
  const handleAutoDescribeImage = async () => {
    if (!photoFile) return;
    setAiAnalyzing(true);
    
    // Simulate typing effect in description input while loading
    let dots = "";
    const interval = setInterval(() => {
      dots = dots.length >= 3 ? "" : dots + ".";
      setDescription("SevakAI is scanning visual pixels and drafting your grievance" + dots);
    }, 400);

    try {
      const formData = new FormData();
      formData.append("image", photoFile);

      const response = await fetch("/api/gemini/describe-image", {
        method: "POST",
        body: formData
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error("AI visual scanner service was unavailable.");
      }

      const data = await response.json();
      setTitle(data.title || "");
      setDescription(data.description || "");
    } catch (err: any) {
      clearInterval(interval);
      console.error("AI Describe error:", err);
      setDescription("");
      alert("Failed to analyze image: " + (err.message || "Unknown error"));
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Native speech recorder toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Web Speech API is not supported or permission was denied in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Submit report to server
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!user) {
      setSubmitError("Grievance submission requires a verified resident identity. Click 'Authenticate' or use a Guest account.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setSubmitError("Please provide a concise title and a description first.");
      return;
    }

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("address", address.trim() || "BBMP Municipal Zone, Bangalore");
      formData.append("lat", coordinates.lat.toString());
      formData.append("lng", coordinates.lng.toString());
      formData.append("created_by", user.uid || "anonymous_citizen");
      formData.append("ward", "Ward 42");
      formData.append("zone", "Zone East");
      formData.append("category", category);
      formData.append("severity", severity.toString());

      if (photoFile) {
        // MUST use "image" to match server upload.single("image")
        formData.append("image", photoFile);
      }

      const response = await fetch("/api/reports", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Grievance server rejected the report submission.");
      }

      const result = await response.json();
      setSubmittedReport(result);
      setShowSuccessModal(true);

      // Reset form variables
      setTitle("");
      setDescription("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setSeverity(3);
    } catch (err: any) {
      console.error("Submission error:", err);
      setSubmitError(err.message || "Failed to submit report. Please check server logs.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCopyLetter = () => {
    if (!submittedReport) return;
    const letter = activeLetterTab === "english" 
      ? submittedReport.bilingual_grievance?.english || submittedReport.grievance_letter
      : submittedReport.bilingual_grievance?.hindi || "शिकायत पत्र अनुपलब्ध है।";
      
    navigator.clipboard.writeText(letter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  return (
    <div className="w-full relative">
      <div className="glass-card rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4aa]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 mb-8 gap-4">
          <div className="space-y-1">
            <h3 className="text-xl md:text-2xl font-bold font-display text-white uppercase tracking-wider flex items-center gap-2.5">
              <ClipboardList className="w-6 h-6 text-[#00d4aa]" />
              <span>Smart Grievance Portal</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Submit location-tracked hazard proof. SevakAI auto-classifies, maps, and drafts legal petitions instantly.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
            <span className="text-[10px] font-mono text-[#00d4aa] uppercase tracking-widest bg-[#00d4aa]/10 px-2.5 py-1 rounded-md border border-[#00d4aa]/20">
              SLA Tracked Grid
            </span>
          </div>
        </div>

        {/* Identity Warnings */}
        {!user && (
          <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Unverified Resident Session</h5>
              <p className="text-xs text-zinc-300">
                You must establish a resident identity before submitting a grievance. Please authenticate in the dashboard header.
              </p>
              <button 
                type="button" 
                onClick={onOpenAuth}
                className="mt-1 text-xs font-semibold text-[#00d4aa] hover:underline transition"
              >
                Sign in / Guest Entry &rarr;
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Proof Upload & Mapping */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Photo & Video Drag-and-Drop Area */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#00d4aa]" />
                  <span>1. Multi-Modal Evidence</span>
                </label>
                
                {!photoPreview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition relative overflow-hidden ${
                      isDragging 
                        ? "border-[#00d4aa] bg-[#00d4aa]/5" 
                        : "border-white/10 hover:border-white/20 bg-black/20"
                    }`}
                  >
                    <input 
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="file-upload"
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-white/5 rounded-full text-zinc-400 group-hover:text-white transition">
                        <UploadCloud className="w-8 h-8 text-[#00d4aa] animate-bounce" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-200">Drag & drop photo or video here</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Natively supports smartphone camera on mobile</p>
                      </div>
                      <span className="bg-white/5 px-3 py-1 rounded text-[10px] font-mono text-zinc-400 hover:text-white border border-white/5">
                        Browse Files
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 p-2">
                    {photoFile?.type.startsWith("video/") ? (
                      <video 
                        src={photoPreview} 
                        controls 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <img 
                        src={photoPreview} 
                        alt="Hazard evidence preview" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-4 right-4 p-1.5 bg-black/80 hover:bg-black rounded-full border border-white/10 text-zinc-400 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    {/* Ask AI to Describe Trigger */}
                    <div className="mt-2.5 p-2 bg-[#00d4aa]/5 rounded-lg border border-[#00d4aa]/15 flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[#00d4aa] flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-[#00d4aa] uppercase tracking-wider font-display">SevakAI Vision Audit</p>
                          <p className="text-[9px] text-zinc-400">Let Gemini analyze image & auto-fill title/desc</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={aiAnalyzing}
                        onClick={handleAutoDescribeImage}
                        className="bg-[#00d4aa] hover:bg-[#00d4aa]/90 disabled:opacity-40 text-black font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 uppercase transition tracking-wider font-mono cursor-pointer"
                      >
                        {aiAnalyzing ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Scanning...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>Describe</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Draggable Geolocation Map */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>2. Spatial Geolocation</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => handleAutoDetectGPS(true)}
                    className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold text-blue-400 transition cursor-pointer"
                  >
                    <Locate className="w-3 h-3 animate-pulse" />
                    <span>GPS Auto-Locate</span>
                  </button>
                </div>

                {/* Real Google Map Embed with Draggable Pin or Blueprint Fallback */}
                <div className="h-56 w-full rounded-xl overflow-hidden relative border border-white/5 bg-zinc-950/40 flex items-center justify-center">
                  {isMapKeyValid ? (
                    <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
                      <Map
                        defaultCenter={coordinates}
                        center={coordinates}
                        defaultZoom={16}
                        mapId="DEMO_MAP_ID"
                        disableDefaultUI={true}
                        zoomControl={true}
                        gestureHandling="cooperative"
                        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                        className="w-full h-full"
                      >
                        <AdvancedMarker
                          position={coordinates}
                          draggable={true}
                          onDragEnd={handleMarkerDragEnd}
                        >
                          <Pin background={'#ff6b35'} borderColor={'#ffffff'} glyphColor={'#ffffff'} />
                        </AdvancedMarker>
                      </Map>
                    </APIProvider>
                  ) : (
                    // Blueprint Blueprint Grid Mock Map
                    <div className="w-full h-full bg-[#090b1c] p-4 flex flex-col justify-between overflow-hidden relative">
                      {/* Blueprint grid lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                      
                      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center p-4">
                        <div className="p-3 bg-white/5 rounded-full text-[#ff6b35] border border-white/10 mb-2">
                          <MapPin className="w-5 h-5 animate-bounce" />
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-300">Spatial Tracker Activated</h4>
                        <p className="text-[10px] text-zinc-500 max-w-[220px] mt-1 leading-relaxed">
                          GPS: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                        </p>
                        <span className="mt-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] font-mono">
                          To activate Google Maps embed, add GOOGLE_MAPS_PLATFORM_KEY in Secrets
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase mb-1">{t("form.gpsLabel")}</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("form.gpsDetecting")}
                    className="w-full bg-black/40 border border-white/5 focus:border-[#00d4aa] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none transition font-sans"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Title, Voice Description & Parameters */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Complaint Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider font-mono">{t("form.titleLabel")}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("form.titlePlaceholder")}
                  className="w-full bg-[#09090b] border border-white/5 focus:border-[#00d4aa]/40 focus:ring-1 focus:ring-[#00d4aa]/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none transition font-sans"
                  required
                />
              </div>

              {/* Detailed Description with Native Speech Recognition */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                    {t("form.descLabel")}
                  </label>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-mono transition cursor-pointer ${
                      isListening 
                        ? "bg-rose-500/20 border-rose-500/30 text-rose-400 animate-pulse" 
                        : "bg-white/5 border-white/5 hover:border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>{t("form.listening")}</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-[#00d4aa]" />
                        <span>{t("form.voiceBtn")}</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="relative">
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("form.descPlaceholder")}
                    className="w-full bg-[#09090b] border border-white/5 focus:border-[#00d4aa]/40 focus:ring-1 focus:ring-[#00d4aa]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition resize-none font-sans leading-relaxed"
                    required
                  />
                  {isListening && (
                    <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded text-[10px] text-rose-300 font-mono animate-bounce">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                      <span>{language === "hi" ? "सुन रहा हूँ, कृपया बोलें..." : "SevakAI is listening, speak now..."}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Division Selector & Visual Severity Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider font-mono">
                    {t("form.categoryLabel")}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/5 focus:border-[#00d4aa] rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none transition cursor-pointer font-sans"
                  >
                    <option value="pothole">{language === "hi" ? "सड़क और गड्ढे" : "Roads & Potholes"}</option>
                    <option value="water_leak">{language === "hi" ? "पानी और पाइप लीक" : "Water & Pipe Leaks"}</option>
                    <option value="garbage">{language === "hi" ? "कचरा और स्वच्छता" : "Garbage & Sanitation"}</option>
                    <option value="streetlight">{language === "hi" ? "स्ट्रीटलाइट और बिजली" : "Streetlight & Electricity"}</option>
                    <option value="drainage">{language === "hi" ? "नाली और अवरुद्ध सीवेज" : "Drainage & Blocked Sewage"}</option>
                    <option value="encroachment">{language === "hi" ? "अवैध अतिक्रमण" : "Illegal Encroachments"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>{t("form.severityLabel")}</span>
                    <span className="text-[10px] text-[#ff6b35] font-mono font-bold">Lvl {severity} / 5</span>
                  </label>
                  <div className="flex items-center space-x-3 h-10">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSeverity(lvl)}
                        className={`flex-1 h-9 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                          severity === lvl 
                            ? "bg-[#ff6b35] border-[#ff6b35] text-black shadow-lg shadow-[#ff6b35]/20" 
                            : "bg-black/40 border-white/5 text-zinc-400 hover:border-white/10"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {submitError && (
            <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-400 flex items-start gap-2 animate-fade-in font-semibold">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submission Buttons */}
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-[10px] text-zinc-500 leading-relaxed font-mono uppercase">
              {language === "hi" 
                ? "इस शिकायत को दर्ज करके, आप इसे वास्तविक बीबीएमपी एसएलए ट्रैकिंग नीतियों से बांध रहे हैं।" 
                : "By filing this grievance, you are binding it to real BBMP SLA tracking policies."}
            </p>
            <button
              type="submit"
              disabled={submitLoading || !user}
              className="relative group bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-bold text-xs uppercase tracking-widest py-3.5 px-8 rounded-xl shadow-xl hover:shadow-[#00d4aa]/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 self-end"
            >
              {submitLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>{language === "hi" ? "शिकायत याचिकाएँ तैयार की जा रही हैं..." : "Generating Petitions..."}</span>
                </>
              ) : (
                <>
                  <span>{user ? t("form.submitVerified") : t("form.submitGuest")}</span>
                  <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* SUCCESS MODAL OVERLAY */}
      <AnimatePresence>
        {showSuccessModal && submittedReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-blue-950/20 to-black/20 p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/25 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{t("form.successHeader")}</span>
                      {submittedReport._is_duplicate_linked && (
                        <span className="bg-[#ff6b35]/20 text-[#ff6b35] text-[9px] font-mono px-2 py-0.5 rounded border border-[#ff6b35]/20 animate-pulse">
                          {t("form.duplicateMerged")}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {t("form.casePrefix")}{submittedReport.id} {t("form.slaRoute")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    onSuccess();
                  }}
                  className="text-zinc-500 hover:text-white transition p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-grow p-6 overflow-y-auto space-y-6">
                
                {submittedReport._is_duplicate_linked && (
                  <div className="bg-[#ff6b35]/5 border border-[#ff6b35]/15 p-4 rounded-xl flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-[#ff6b35] flex-shrink-0 mt-0.5" />
                    <div>
                      <h6 className="text-xs font-bold text-[#ff6b35] uppercase tracking-wider">{t("form.mergedCoPet")}</h6>
                      <p className="text-xs text-zinc-300 leading-relaxed mt-0.5">
                        {submittedReport._duplicate_message || t("form.mergedDesc")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left Section: Diagnostics & SLA Information */}
                  <div className="md:col-span-5 space-y-5">
                    <div className="bg-black/35 border border-white/5 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t("form.visualAudit")}</span>
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-zinc-500 block font-mono text-[9px] uppercase">{t("form.assignedCat")}</span>
                          <span className="text-zinc-200 font-semibold capitalize font-sans">{submittedReport.category?.replace("_", " ")}</span>
                        </div>

                        <div>
                          <span className="text-zinc-500 block font-mono text-[9px] uppercase">{t("form.severityGauge")}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-grow bg-white/5 h-2 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-[#ff6b35] h-full" 
                                style={{ width: `${(submittedReport.severity / 5) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-[#ff6b35]">Lvl {submittedReport.severity}/5</span>
                          </div>
                        </div>

                        {submittedReport.visual_description && (
                          <div>
                            <span className="text-zinc-500 block font-mono text-[9px] uppercase">{t("form.sceneAnalysis")}</span>
                            <p className="text-zinc-300 leading-relaxed italic mt-0.5">{submittedReport.visual_description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resolved Jurisdiction */}
                    <div className="bg-black/35 border border-white/5 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{t("form.resolvedJuris")}</span>
                      </h4>

                      <div className="space-y-3 text-xs leading-relaxed">
                        <div>
                          <span className="text-zinc-500 block font-mono text-[9px] uppercase">{t("form.assignedWard")}</span>
                          <span className="text-zinc-200 font-semibold">{submittedReport.location?.ward || "Ward 42"} ({submittedReport.location?.zone || "Zone East"})</span>
                        </div>

                        <div>
                          <span className="text-zinc-500 block font-mono text-[9px] uppercase">{t("form.responsibleBody")}</span>
                          <span className="text-zinc-200 font-semibold block">{submittedReport.jurisdiction?.body || "BBMP Municipal Corp"}</span>
                          <span className="text-emerald-400 font-semibold text-[10px]">{submittedReport.jurisdiction?.department}</span>
                        </div>

                        <div>
                          <span className="text-zinc-500 block font-mono text-[9px] uppercase">{t("form.officerEngineer")}</span>
                          <div className="flex items-center space-x-1 text-zinc-200 font-semibold">
                            <span>{submittedReport.jurisdiction?.officer_name || "Ward Executive Engineer"}</span>
                          </div>
                          <span className="text-zinc-400 flex items-center gap-1 text-[10px] mt-1 font-mono">
                            <Phone className="w-3 h-3 text-blue-400" />
                            <span>{submittedReport.jurisdiction?.contact || "+91-80-2213-4402"}</span>
                          </span>
                        </div>

                        <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <div>
                              <span className="text-[9px] font-mono text-zinc-500 block uppercase">{t("form.slaWindow")}</span>
                              <strong className="text-zinc-200 font-bold">{submittedReport.jurisdiction?.sla_hours || 48} Hours</strong>
                            </div>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-[#00d4aa] animate-ping" />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Section: Bilingual Generated Grievance Petition Letter */}
                  <div className="md:col-span-7 flex flex-col h-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                        <FileText className="w-4 h-4 text-[#00d4aa]" />
                        <span>{t("form.draftGriev")}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setActiveLetterTab("english")}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                            activeLetterTab === "english"
                              ? "bg-white/10 border-white/10 text-white"
                              : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          English
                        </button>
                        <button
                          onClick={() => setActiveLetterTab("hindi")}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                            activeLetterTab === "hindi"
                              ? "bg-white/10 border-white/10 text-white"
                              : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          हिंदी (Bilingual)
                        </button>
                      </div>
                    </div>

                    <div className="flex-grow bg-[#05070c] border border-white/5 rounded-xl p-5 overflow-y-auto max-h-[300px] text-xs leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap relative shadow-inner">
                      {activeLetterTab === "english" 
                        ? (submittedReport.bilingual_grievance?.english || submittedReport.grievance_letter)
                        : (submittedReport.bilingual_grievance?.hindi || "Bilingual representation compiling...")}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase leading-snug">
                        {t("form.syncPortal")}
                      </span>
                      <button
                        onClick={handleCopyLetter}
                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-xs font-mono font-bold px-4 py-2 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
                      >
                        {copiedLetter ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{t("form.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t("form.copyBtn")}</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                </div>

              </div>

              {/* Footer */}
              <div className="bg-[#05070c] p-4 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    onSuccess();
                  }}
                  className="bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-bold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl transition cursor-pointer"
                >
                  Proceed to Case Tracker
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
