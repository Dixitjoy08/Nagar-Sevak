import React, { useState } from "react";
import { 
  auth,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  updateProfile
} from "../firebase";
import { User, LogIn, UserPlus, Milestone, HelpCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("Please provide a name.");
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      // Give anonymous guest a pleasant default display name
      await updateProfile(userCredential.user, {
        displayName: `Citizen_${Math.floor(1000 + Math.random() * 9000)}`
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Failed to coordinate guest session. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        id="auth-modal-card" 
        className="w-full max-w-md bg-[#121214] border border-[#27272a] rounded-xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 rounded-full" />

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-xl text-blue-400 font-bold">
            <Milestone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold font-display italic text-blue-100">NagarSevak Gateway</h3>
            <p className="text-xs text-zinc-400">Join your local municipal grid</p>
          </div>
        </div>

        <form onSubmit={handleAuthentication} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider font-mono animate-fade-in">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Rajeesh Kumar"
                className="w-full bg-[#09090b] border border-[#27272a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider font-mono">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex. you@domain.com"
              className="w-full bg-[#09090b] border border-[#27272a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider font-mono">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-[#09090b] border border-[#27272a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/20 border border-rose-950/45 rounded-xl text-xs text-rose-300 leading-relaxed font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-blue-900/10 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? "Processing..." : isSignUp ? "Create Secure Account" : "Access Platform"}</span>
          </button>
        </form>

        <div className="relative flex py-3 items-center">
          <div className="flex-grow border-t border-[#27272a]"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono">Or</span>
          <div className="flex-grow border-t border-[#27272a]"></div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-[#09090b] hover:bg-[#161618] border border-[#27272a] text-zinc-300 text-sm py-2.5 px-4 rounded-xl hover:text-white transition cursor-pointer"
          >
            <User className="w-4 h-4 text-blue-400" />
            <span>Enter as Guest Citizen (Instant)</span>
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              {isSignUp ? "Already have a civic account? Sign In" : "New resident? Request access account"}
            </button>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition text-xs font-bold px-2 py-1 rounded bg-[#09090b] border border-[#27272a]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
