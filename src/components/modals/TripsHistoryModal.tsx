import React, { useState, useMemo } from 'react';
import { Trip } from '../../types';
import { 
  X, Route, Search, Filter, Archive, CheckCircle2, Clock, 
  Sparkles, AlertCircle, RefreshCw, Smartphone, CreditCard, 
  MapPin, ArrowRight, Star, Navigation, DollarSign, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface TripsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  onArchiveTrips: (tripIds: string[]) => void;
  onRestoreTrip?: (tripId: string) => void;
}

export const TripsHistoryModal: React.FC<TripsHistoryModalProps> = ({
  isOpen,
  onClose,
  trips = [],
  onArchiveTrips,
  onRestoreTrip
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Completed' | 'In Progress' | 'Cancelled' | 'Archived'>('ALL');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  if (!isOpen) return null;

  // 90 days threshold calculation relative to reference date (2026-08-13)
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const CURRENT_REF_DATE = new Date('2026-08-13T00:00:00Z').getTime();

  // Helper to test if a trip is older than 90 days
  const isTripOlderThan90Days = (trip: Trip): boolean => {
    if (!trip.startTime) return false;
    // Parse trip date from startTime string (e.g. "2026-04-12 10:15 EAT" or "Today")
    if (trip.startTime.includes('Today') || trip.startTime.includes('2026-08')) {
      return false;
    }
    const match = trip.startTime.match(/(\d{4}-\d{2}-\d{2})/);
    if (match && match[1]) {
      const tripTime = new Date(match[1]).getTime();
      return (CURRENT_REF_DATE - tripTime) > NINETY_DAYS_MS;
    }
    return false;
  };

  // Identify completed trips older than 90 days eligible for cleanup/archive
  const eligibleForCleanup = useMemo(() => {
    return trips.filter(t => t.tripStatus === 'Completed' && !t.isArchived && isTripOlderThan90Days(t));
  }, [trips]);

  // Total active (non-archived) vs archived
  const activeTripsCount = trips.filter(t => !t.isArchived).length;
  const archivedTripsCount = trips.filter(t => t.isArchived).length;

  // Filtered trips list
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Archive filter check
      if (showArchivedOnly && !t.isArchived) return false;
      if (!showArchivedOnly && statusFilter !== 'Archived' && t.isArchived) return false;

      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        t.tripCode.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.vehicleReg.toLowerCase().includes(q) ||
        t.pickupLocationName.toLowerCase().includes(q) ||
        t.destinationLocationName.toLowerCase().includes(q);

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'Completed') matchesStatus = t.tripStatus === 'Completed' && !t.isArchived;
      else if (statusFilter === 'In Progress') matchesStatus = t.tripStatus === 'In Progress' && !t.isArchived;
      else if (statusFilter === 'Cancelled') matchesStatus = t.tripStatus === 'Cancelled' && !t.isArchived;
      else if (statusFilter === 'Archived') matchesStatus = !!t.isArchived;

      return matchesSearch && matchesStatus;
    });
  }, [trips, searchQuery, statusFilter, showArchivedOnly]);

  // Execute Cleanup / Archive Action
  const handleCleanupOldTrips = () => {
    if (eligibleForCleanup.length === 0) {
      toast.info('No completed trips older than 90 days found in active database.', {
        description: 'Your trip history is already optimized for maximum dashboard performance.'
      });
      return;
    }

    setIsCleaningUp(true);

    setTimeout(() => {
      const idsToArchive = eligibleForCleanup.map(t => t.id);
      onArchiveTrips(idsToArchive);
      setIsCleaningUp(false);

      toast.success(
        `🧹 Cleanup Complete: ${eligibleForCleanup.length} completed trips older than 90 days moved to archive!`,
        {
          description: `Freed memory & optimized dashboard rendering. Archived trips remain accessible in the Archive Vault.`,
          duration: 6000
        }
      );
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
              <Route className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Full Trips History & Performance Vault</h3>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                  {trips.length} Total Records
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive dispatch ride history, fare reconciliation, and automatic database archiving
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Performance Optimization Banner with Cleanup Button */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/40 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Dashboard Performance Optimizer</span>
                {eligibleForCleanup.length > 0 ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {eligibleForCleanup.length} Trips Eligible for Archiving (&gt;90 days old)
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Database Fully Optimized
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Moving completed trips older than 90 days to archived state prevents browser re-render lag and keeps active dashboards fast.
              </p>
            </div>
          </div>

          {/* CLEANUP BUTTON */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={handleCleanupOldTrips}
              disabled={isCleaningUp || eligibleForCleanup.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition shadow-lg cursor-pointer ${
                eligibleForCleanup.length > 0
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-950/50'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {isCleaningUp ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Archive className="w-4 h-4 text-indigo-200" />
              )}
              <span>
                {isCleaningUp 
                  ? 'Archiving Old Trips...' 
                  : `Cleanup Old Trips (${eligibleForCleanup.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by trip code, driver, vehicle reg, pickup, destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-emerald-400" /> Status:
            </span>

            {(['ALL', 'Completed', 'In Progress', 'Cancelled', 'Archived'] as const).map(st => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  if (st === 'Archived') setShowArchivedOnly(true);
                  else setShowArchivedOnly(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                  (st === 'Archived' && showArchivedOnly) || (statusFilter === st && !showArchivedOnly)
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st === 'Archived' ? `Vault (${archivedTripsCount})` : st}
              </button>
            ))}
          </div>
        </div>

        {/* Trips List Table / Cards */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {filteredTrips.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Route className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">No trips matched your search or status filter.</p>
              <p className="text-xs text-slate-500">Try adjusting your search criteria or switching status tabs.</p>
            </div>
          ) : (
            filteredTrips.map(trip => (
              <div
                key={trip.id}
                className={`border rounded-xl p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  trip.isArchived 
                    ? 'bg-slate-950/50 border-indigo-900/40 text-slate-400' 
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                {/* Left: Code, Driver, Vehicle */}
                <div className="flex items-center gap-3 shrink-0 min-w-[200px]">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono text-xs font-bold">
                    {trip.tripCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{trip.driverName}</span>
                      {trip.isArchived && (
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                        {trip.vehicleReg}
                      </span>
                      <span>•</span>
                      <span>{trip.vehicleType}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Route & Distance */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300 truncate">
                    <span className="text-slate-400 truncate max-w-[150px] sm:max-w-[200px]">{trip.pickupLocationName}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="text-white font-semibold truncate max-w-[150px] sm:max-w-[200px]">{trip.destinationLocationName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>{trip.distanceKm} km</span>
                    <span>•</span>
                    <span>{trip.durationMinutes} mins</span>
                    <span>•</span>
                    <span>Started: {trip.startTime}</span>
                  </div>
                </div>

                {/* Right: Fare & Status */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="text-sm font-black text-emerald-400 font-mono block">
                      KES {trip.fareKes.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Comm: KES {trip.companyRevenueKes.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      trip.tripStatus === 'Completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : trip.tripStatus === 'In Progress'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {trip.tripStatus}
                    </span>

                    {trip.isArchived && onRestoreTrip && (
                      <button
                        onClick={() => {
                          onRestoreTrip(trip.id);
                          toast.success(`Restored trip ${trip.tripCode} to active list.`);
                        }}
                        className="text-[10px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Trips: <strong className="text-white">{activeTripsCount}</strong></span>
            <span>•</span>
            <span>Archived Trips: <strong className="text-indigo-400">{archivedTripsCount}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition cursor-pointer self-end sm:self-auto"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
};
