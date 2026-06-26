import React from "react";
import { User, LogOut, Milestone, Shield, RefreshCw } from "lucide-react";
import { auth, signOut } from "../db";
import { RoleType } from "../types";

interface NavbarProps {
  user: any;
  currentRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  onOpenAuth: () => void;
}

export default function Navbar({ user, currentRole, onRoleChange, onOpenAuth }: NavbarProps) {
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Failed logging out", err);
    }
  };

  return (
    <header className="w-full glass-card border-b border-white/5 shadow-2xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-[#00d4aa] to-[#151d45] border border-white/10 rounded-xl shadow-lg">
              <Milestone className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-wide text-white flex items-center gap-1.5">
                Nagar<span className="text-[#00d4aa]">Sevak</span>
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                MUNICIPAL INTELLIGENCE SUITE
              </p>
            </div>
          </div>

          {/* Center Role Controller & Authentication Section */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 md:justify-end">
            
            {/* Simulation Controller */}
            <div className="flex items-center bg-[#070b1e]/60 border border-white/5 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => onRoleChange("citizen")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                  currentRole === "citizen"
                    ? "bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/25 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Citizen Hub
              </button>
              
              <button
                onClick={() => onRoleChange("officer")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer ${
                  currentRole === "officer"
                    ? "bg-[#ff6b35]/10 text-[#ff6b35] border border-[#ff6b35]/25 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Simulate municipal authority dashboard"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Officer panel</span>
              </button>
            </div>

            {/* Authenticated Controls */}
            {user ? (
              <div className="flex items-center space-x-3 bg-white/5 px-3 py-1.5 border border-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#0a0e27] border border-white/10 flex items-center justify-center text-[#00d4aa] font-bold text-sm">
                  {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : "CI"}
                </div>
                
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {user.displayName || "Resident"}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                    {user.email || "Guest User"}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-white/5 text-zinc-400 hover:text-rose-400 rounded-lg transition"
                  title="Sign Out Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-2 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-[#0a0e27] font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl shadow-lg active:scale-[0.98] transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Initialize Identity</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
