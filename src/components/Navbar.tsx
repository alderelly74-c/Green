import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, MapPin, Bell, Shield, Search, User, 
  ChevronDown, RefreshCw, AlertTriangle, LogIn, LogOut, CloudCheck,
  Wifi, WifiOff, HardDrive, ShieldAlert, FileText, Sun, Moon, Contrast
} from 'lucide-react';
import { CityRegion, UserRole, VehicleDocument, Vehicle, Driver } from '../types';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from '../lib/firebase';
import { NotificationCenterDropdown } from './NotificationCenterDropdown';
import { DocumentPreviewModal } from './modals/DocumentPreviewModal';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  selectedCity: CityRegion | 'All Cities';
  onCityChange: (city: CityRegion | 'All Cities') => void;
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenAiAssistant: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  alertCount: number;
  isOnline?: boolean;
  lastSyncedAt?: string;
  onForceSyncCache?: () => void;
  documents?: VehicleDocument[];
  vehicles?: Vehicle[];
  drivers?: Driver[];
  onNavigateTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedCity,
  onCityChange,
  selectedRole,
  onRoleChange,
  onOpenAiAssistant,
  searchQuery,
  onSearchChange,
  alertCount,
  isOnline = true,
  lastSyncedAt,
  onForceSyncCache,
  documents = [],
  vehicles = [],
  drivers = [],
  onNavigateTab = (_tab: string) => {}
}) => {
  const { theme, isHighContrast, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<VehicleDocument | null>(null);

  // Compute total insurance policies & NTSA licenses expiring within next 7 days
  const expiring7DayCount = useMemo(() => {
    let count = 0;
    const seen = new Set<string>();

    documents.forEach(d => {
      const typeLower = d.documentType.toLowerCase();
      if ((typeLower.includes('insurance') || typeLower.includes('ntsa') || typeLower.includes('license') || typeLower.includes('psv') || typeLower.includes('logbook')) && d.daysUntilExpiry <= 7) {
        count++;
        seen.add(d.documentNumber);
      }
    });

    vehicles.forEach(v => {
      if (v.insuranceExpiry && !seen.has(v.insurancePolicyNumber)) {
        const days = Math.ceil((new Date(v.insuranceExpiry).getTime() - new Date('2026-08-13T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 7) {
          count++;
          seen.add(v.insurancePolicyNumber);
        }
      }
      if (v.ntsaInspectionExpiry) {
        const docNum = `NTSA-INS-${v.registrationNumber.replace(/\s+/g, '')}`;
        if (!seen.has(docNum)) {
          const days = Math.ceil((new Date(v.ntsaInspectionExpiry).getTime() - new Date('2026-08-13T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24));
          if (days <= 7) {
            count++;
            seen.add(docNum);
          }
        }
      }
    });

    drivers.forEach(d => {
      if (d.licenseExpiry && !seen.has(d.drivingLicenseNumber)) {
        const days = Math.ceil((new Date(d.licenseExpiry).getTime() - new Date('2026-08-13T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 7) {
          count++;
          seen.add(d.drivingLicenseNumber);
        }
      }
      if (d.psvExpiry && d.psvBadgeNumber && !seen.has(d.psvBadgeNumber)) {
        const days = Math.ceil((new Date(d.psvExpiry).getTime() - new Date('2026-08-13T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 7) {
          count++;
          seen.add(d.psvBadgeNumber);
        }
      }
    });

    return count;
  }, [documents, vehicles, drivers]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' EAT');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Sign in error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  };

  const roles: UserRole[] = [
    'Super Admin',
    'Fleet Manager',
    'Finance Manager',
    'Operations Manager',
    'Maintenance Manager',
    'HR / Admin',
    'Accountant'
  ];

  const cities: (CityRegion | 'All Cities')[] = ['All Cities', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu'];

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & City Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold tracking-tight text-base text-slate-900">GREENSHIFT</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1">
                COMMAND
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Kenyan Ride-Hailing Fleet OS</p>
          </div>
        </div>

        {/* Global Search & City Picker */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle reg (e.g. KMG 482E), driver, phone..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
            />
          </div>

          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer appearance-none pr-8"
            >
              {cities.map(c => (
                <option key={c} value={c}>{c === 'All Cities' ? '🇰🇪 All Kenya' : `📍 ${c}`}</option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Right Tools & Firebase User Profile */}
        <div className="flex items-center gap-3">
          {/* Offline / Local Cache Status Badge */}
          <div 
            onClick={onForceSyncCache}
            title={isOnline ? `Local storage cache active. Click to re-sync. Last saved: ${lastSyncedAt || 'Just now'}` : 'Offline mode active. All dashboards running on local cached fleet data.'}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition ${
              !isOnline 
                ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-bold">Offline (Cached)</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden xl:inline text-[11px] text-slate-600">Local Cache:</span>
                <span className="text-[11px] text-emerald-700 font-mono font-bold">Saved</span>
              </>
            )}
          </div>

          {/* AI Fleet Assistant Quick Launch */}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>GreenShift AI</span>
          </button>

          {/* Global Theme Toggle: Light Mode vs High-Contrast Night Ops */}
          <div className="relative">
            <button
              id="global-theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={isHighContrast ? "Switch to standard Light Mode" : "Switch to High-Contrast Night Operations Mode"}
              title={
                isHighContrast
                  ? "Night Operations Active: High-contrast dark mode enabled for low-light command visibility and glare reduction. Click to switch to Light Mode."
                  : "Day Operations: Light mode active. Click to switch to High-Contrast Night Ops mode for night shifts."
              }
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none group ${
                isHighContrast
                  ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/60 shadow-xs shadow-amber-950/40 ring-1 ring-amber-400/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:text-slate-900'
              }`}
            >
              {isHighContrast ? (
                <>
                  <div className="relative flex items-center justify-center">
                    <Moon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 transition-transform group-hover:-rotate-12" />
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="hidden md:inline font-bold tracking-tight">Night Ops</span>
                  <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                    Hi-Vis
                  </span>
                </>
              ) : (
                <>
                  <div className="relative flex items-center justify-center">
                    <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 transition-transform group-hover:rotate-45" />
                  </div>
                  <span className="hidden md:inline font-semibold text-slate-700">Light</span>
                  <span className="hidden xl:inline text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-200 text-slate-600 font-medium">
                    Day
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Notification Center Alert Bell */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              title="7-Day Compliance Alerts: Insurance Policies & NTSA Licenses"
              className={`p-2 rounded-lg transition relative border cursor-pointer ${
                isNotificationOpen 
                  ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              {expiring7DayCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {expiring7DayCount}
                </span>
              ) : alertCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center">
                  {alertCount}
                </span>
              ) : null}
            </button>

            {/* Notification Center Dropdown */}
            <NotificationCenterDropdown
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              documents={documents}
              vehicles={vehicles}
              drivers={drivers}
              onSelectDocument={(doc) => {
                setSelectedDocForPreview(doc);
              }}
              onNavigateToVault={() => {
                onNavigateTab('documents');
              }}
            />
          </div>

          {/* Role Switcher */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <select
              value={selectedRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              {roles.map(r => (
                <option key={r} value={r} className="bg-white text-slate-800">{r}</option>
              ))}
            </select>
          </div>

          {/* Google Auth & Firestore Profile Badge */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full border border-emerald-500" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {user.displayName ? user.displayName.charAt(0) : 'U'}
                </div>
              )}
              <div className="hidden xl:block text-left">
                <div className="text-[11px] font-bold text-slate-800 leading-none truncate max-w-[100px]">{user.displayName || 'Fleet User'}</div>
                <div className="text-[9px] text-emerald-600 font-medium">Firestore Synced</div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="text-slate-400 hover:text-rose-600 p-0.5 ml-1 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-2xs border border-slate-700"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}

          {/* Nairobi Time Clock */}
          <div className="hidden xl:block text-right border-l border-slate-200 pl-3">
            <div className="text-[10px] text-slate-500 font-mono">Nairobi Time</div>
            <div className="text-xs font-bold text-slate-800 font-mono tracking-tight">{currentTime}</div>
          </div>
        </div>

      </div>

      {/* Interactive Direct Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!selectedDocForPreview}
        onClose={() => setSelectedDocForPreview(null)}
        document={selectedDocForPreview}
        onNavigateToVault={() => {
          setSelectedDocForPreview(null);
          onNavigateTab('documents');
        }}
      />
    </header>
  );
};

