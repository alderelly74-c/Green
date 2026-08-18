import React, { useState } from 'react';
import { Driver, Vehicle, CityRegion, ShiftType, MpesaPayoutRequest, DriverCheckInRecord } from '../types';
import { 
  Users, Phone, ShieldCheck, Award, Wallet, 
  Bike, Star, AlertCircle, Clock, Send, Eye, TrendingUp,
  Trophy, Medal, BarChart3, CheckCircle2, AlertTriangle, Zap,
  FileText, ShieldAlert, Calendar, UserCheck, MapPin,
  GraduationCap, CheckSquare, Sparkles, Filter, BookOpen, Check, Crown, Calculator, Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Cell, Legend, ReferenceLine 
} from 'recharts';
import { toast } from 'sonner';
import { DriverDetailsModal } from './modals/DriverDetailsModal';
import { DriverCheckInModal } from './modals/DriverCheckInModal';
import { SafetyInsightModal } from './modals/SafetyInsightModal';
import { DriverPerformanceComparisonModal } from './modals/DriverPerformanceComparisonModal';
import { WhatIfEarningsSimulator } from './WhatIfEarningsSimulator';
import { DriverPayoutForecastWidget } from './DriverPayoutForecastWidget';
import { RevenueVelocityGauge } from './RevenueVelocityGauge';
import { DriverFatigueHeatmap } from './DriverFatigueHeatmap';
import { getDriverLicensingAlerts } from '../utils/licensing';

interface DriversModuleProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  mpesaPayouts?: MpesaPayoutRequest[];
  selectedCity: CityRegion | 'All Cities';
  onUpdateDriverStatus: (driverId: string, status: any) => void;
  onUpdateDriverSafetyScore?: (driverId: string, score: number) => void;
  onOpenMpesaModalForDriver: (driver: Driver) => void;
  onNavigateToMessages?: (driver?: Driver) => void;
}

export const DriversModule: React.FC<DriversModuleProps> = ({
  drivers = [],
  vehicles = [],
  mpesaPayouts = [],
  selectedCity = 'All Cities',
  onUpdateDriverStatus = (_driverId?: any, _status?: any) => {},
  onUpdateDriverSafetyScore = (_driverId?: any, _score?: any) => {},
  onOpenMpesaModalForDriver = (_driver?: any) => {},
  onNavigateToMessages
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'leaderboard' | 'safety' | 'simulator' | 'payoutForecast' | 'fatigueHeatmap'>('payoutForecast');
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'efficiency' | 'safety' | 'completion' | 'trips' | 'earnings'>('efficiency');
  const [showExpiringOnly, setShowExpiringOnly] = useState<boolean>(false);
  const [safetyFilter, setSafetyFilter] = useState<'ALL' | 'TOP_PERFORMERS' | 'NEEDS_TRAINING' | 'COMPLIANT'>('ALL');
  
  // Safety Training Enrollment State
  const [enrolledTraining, setEnrolledTraining] = useState<Record<string, { module: string; status: 'Enrolled' | 'In Progress' | 'Completed'; date: string }>>({});
  const [selectedTrainingModules, setSelectedTrainingModules] = useState<Record<string, string>>({});

  const [selectedDriverForDetails, setSelectedDriverForDetails] = useState<Driver | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  const [selectedDriverForInsight, setSelectedDriverForInsight] = useState<Driver | null>(null);
  const [isSafetyInsightModalOpen, setIsSafetyInsightModalOpen] = useState<boolean>(false);

  // Real-Time Safety Coaching Dispatch State
  const [coachingSentDrivers, setCoachingSentDrivers] = useState<Record<string, string>>({});

  const handleSendUrgentCoaching = (driver: Driver, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setCoachingSentDrivers(prev => ({ ...prev, [driver.id]: timestamp }));

    toast.error(`🚨 Urgent Safety Coaching Dispatched!`, {
      description: `Sent to ${driver.fullName} (${driver.phone}) via Rider App & SMS. Current Safety Score: ${driver.safetyScorePercent}%. Defensive driving & speed warning module pushed.`,
      duration: 5000,
    });

    if (onNavigateToMessages) {
      setTimeout(() => {
        onNavigateToMessages(driver);
      }, 1000);
    }
  };

  const handleSendBulkUrgentCoaching = () => {
    const lowSafetyDrivers = filteredDrivers.filter(d => d.safetyScorePercent < 80);
    if (lowSafetyDrivers.length === 0) {
      toast.success('All drivers meet or exceed the 80% safety score benchmark!');
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedSentMap: Record<string, string> = { ...coachingSentDrivers };

    lowSafetyDrivers.forEach(d => {
      updatedSentMap[d.id] = timestamp;
    });
    setCoachingSentDrivers(updatedSentMap);

    toast.error(`🚨 Bulk Urgent Safety Coaching Sent!`, {
      description: `Urgent coaching & speed warnings pushed to ${lowSafetyDrivers.length} driver(s) operating below the 80% threshold.`,
      duration: 6000,
    });
  };

  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [selectedDriverForCheckIn, setSelectedDriverForCheckIn] = useState<Driver | null>(null);
  const [checkInsList, setCheckInsList] = useState<DriverCheckInRecord[]>([]);

  // Driver Performance Comparison Modal State
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
  const [comparisonDriverAId, setComparisonDriverAId] = useState<string | undefined>(undefined);
  const [comparisonDriverBId, setComparisonDriverBId] = useState<string | undefined>(undefined);

  const handleOpenComparison = (driverAId?: string, driverBId?: string) => {
    if (driverAId) setComparisonDriverAId(driverAId);
    if (driverBId) setComparisonDriverBId(driverBId);
    setIsComparisonModalOpen(true);
  };

  const handleOpenDetails = (driver: Driver) => {
    setSelectedDriverForDetails(driver);
    setIsDetailsModalOpen(true);
  };

  const handleOpenSafetyInsight = (driver: Driver) => {
    setSelectedDriverForInsight(driver);
    setIsSafetyInsightModalOpen(true);
  };

  const handleOpenCheckIn = (driver?: Driver) => {
    setSelectedDriverForCheckIn(driver || null);
    setIsCheckInModalOpen(true);
  };

  const handleCheckInSubmit = (record: DriverCheckInRecord) => {
    setCheckInsList(prev => [record, ...prev]);
    if (onUpdateDriverStatus) {
      onUpdateDriverStatus(record.driverId, record.shiftStatus === 'On Duty' ? 'Active' : record.shiftStatus === 'Off Duty' ? 'Off Duty' : 'Active');
    }
  };

  // Calculate efficiency index, completion rate, and licensing alerts for drivers
  const driversWithMetrics = drivers.map(d => {
    const completionRate = Math.min(100, Math.round((d.completedTrips / Math.max(1, d.totalTrips)) * 100));
    const efficiencyIndex = Math.round(((completionRate * 0.5) + (d.safetyScorePercent * 0.5)) * 10) / 10;
    const licensingAlerts = getDriverLicensingAlerts(d);
    return {
      ...d,
      completionRate,
      efficiencyIndex,
      licensingAlerts
    };
  });

  const filteredDrivers = driversWithMetrics.filter(d => {
    if (selectedCity !== 'All Cities' && d.city !== selectedCity) return false;
    if (showExpiringOnly && !d.licensingAlerts.hasWarning) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.nationalId.includes(q) ||
        (d.assignedVehicleReg && d.assignedVehicleReg.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Count drivers with expiring licenses/badges across current city selection
  const cityFilteredDrivers = driversWithMetrics.filter(d => selectedCity === 'All Cities' || d.city === selectedCity);
  const expiringDriversList = cityFilteredDrivers.filter(d => d.licensingAlerts.hasWarning);
  const expiringDriversCount = expiringDriversList.length;
  const expiredDriversCount = cityFilteredDrivers.filter(d => d.licensingAlerts.dlExpired || d.licensingAlerts.psvExpired).length;
  const expiring30DaysCount = cityFilteredDrivers.filter(d => d.licensingAlerts.dlExpiringSoon || d.licensingAlerts.psvExpiringSoon).length;

  // Sorted leaderboard array
  const sortedLeaderboard = [...filteredDrivers].sort((a, b) => {
    if (leaderboardSortBy === 'efficiency') return b.efficiencyIndex - a.efficiencyIndex;
    if (leaderboardSortBy === 'safety') return b.safetyScorePercent - a.safetyScorePercent;
    if (leaderboardSortBy === 'completion') return b.completionRate - a.completionRate;
    if (leaderboardSortBy === 'trips') return b.completedTrips - a.completedTrips;
    if (leaderboardSortBy === 'earnings') return b.grossEarningsKes - a.grossEarningsKes;
    return b.efficiencyIndex - a.efficiencyIndex;
  });

  // Fleet Summary Analytics
  const avgSafetyScore = filteredDrivers.length > 0 
    ? Math.round(filteredDrivers.reduce((sum, d) => sum + d.safetyScorePercent, 0) / filteredDrivers.length) 
    : 0;

  const avgCompletionRate = filteredDrivers.length > 0 
    ? Math.round(filteredDrivers.reduce((sum, d) => sum + d.completionRate, 0) / filteredDrivers.length) 
    : 0;

  const topDriver = sortedLeaderboard.length > 0 ? sortedLeaderboard[0] : null;
  const criticalDriversCount = filteredDrivers.filter(d => d.safetyScorePercent < 80).length;

  // Chart data for top 5 drivers
  const chartData = sortedLeaderboard.slice(0, 5).map(d => ({
    name: d.fullName.split(' ')[0],
    'Efficiency Index': d.efficiencyIndex,
    'Safety Score (%)': d.safetyScorePercent,
    'Completion Rate (%)': d.completionRate
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header, Search & View Switcher Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Rider & Driver Operations Command</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Managing {drivers.length} registered commercial drivers across Kenyan operating cities
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {expiringDriversCount > 0 && (
            <button
              onClick={() => setShowExpiringOnly(!showExpiringOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md border ${
                showExpiringOnly
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
              }`}
              title="Toggle filter for drivers with licenses/PSV badges expiring within 30 days"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>
                {showExpiringOnly ? 'Show All' : `License Warnings (${expiringDriversCount})`}
              </span>
            </button>
          )}

          <button
            onClick={() => handleOpenCheckIn()}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs transition shadow-md flex items-center justify-center gap-1.5 shrink-0"
            title="Log start-of-day driver location, shift status, and pre-trip compliance"
          >
            <UserCheck className="w-4 h-4 text-slate-950" />
            <span>Driver Daily Check-in</span>
          </button>

          <button
            onClick={() => handleOpenComparison()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition border border-slate-700 shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            title="Compare two drivers side-by-side on safety scores, trip volume, and net earnings"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Compare Drivers</span>
          </button>

          {onNavigateToMessages && (
            <button
              onClick={onNavigateToMessages}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>Dispatch App Message</span>
            </button>
          )}

          {/* View Toggle Buttons */}
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center shrink-0 gap-1 overflow-x-auto">
            <button
              onClick={() => setViewMode('fatigueHeatmap')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'fatigueHeatmap'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Fatigue Heatmap</span>
            </button>
            <button
              onClick={() => setViewMode('payoutForecast')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'payoutForecast'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-4 h-4 text-slate-950" />
              <span>7-Day Payout Forecast</span>
            </button>
            <button
              onClick={() => setViewMode('safety')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'safety'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Driver Safety View</span>
            </button>
            <button
              onClick={() => setViewMode('simulator')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'simulator'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>'What-If' Earnings Simulator</span>
            </button>
            <button
              onClick={() => setViewMode('leaderboard')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'leaderboard'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>
          </div>

          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search driver name, phone, reg..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* REAL-TIME SAFETY ALERT TRIGGER BANNER FOR LOW SAFETY SCORES (<80%) */}
      {(() => {
        const lowSafetyDrivers = filteredDrivers.filter(d => d.safetyScorePercent < 80);
        if (lowSafetyDrivers.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-500/80 rounded-xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-red-500/30 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/20 border-2 border-red-500/60 rounded-xl text-red-400 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🚨 Real-Time Safety Alert Trigger</span>
                      <span className="bg-red-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        {lowSafetyDrivers.length} Driver{lowSafetyDrivers.length > 1 ? 's' : ''} Below 80% Threshold
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Telemetry detected high-risk driving events (harsh braking, overspeeding, or fatigue). Instant safety coaching intervention required.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <button
                  onClick={handleSendBulkUrgentCoaching}
                  className="bg-red-600 hover:bg-red-500 text-white font-black px-3.5 py-1.5 rounded-lg text-xs transition shadow-lg flex items-center gap-1.5 border border-red-400/50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Coaching to All ({lowSafetyDrivers.length})</span>
                </button>
                <button
                  onClick={() => setViewMode('safety')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs transition border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Safety View</span>
                </button>
              </div>
            </div>

            {/* Flagged Drivers Quick Trigger Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {lowSafetyDrivers.map(driver => {
                const sentTime = coachingSentDrivers[driver.id];
                return (
                  <div 
                    key={driver.id} 
                    className="bg-slate-950/80 border border-red-500/50 hover:border-red-400 rounded-lg p-3 flex items-center justify-between gap-2 shadow-md transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={driver.profilePhotoUrl} 
                        alt={driver.fullName} 
                        className="w-10 h-10 rounded-lg object-cover border-2 border-red-500 shrink-0" 
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">{driver.fullName}</h4>
                          <span className="text-[10px] font-mono font-black text-red-400 bg-red-950 border border-red-500/40 px-1 rounded">
                            {driver.safetyScorePercent}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          Reg: <span className="text-emerald-400 font-mono">{driver.assignedVehicleReg || 'Unassigned'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleSendUrgentCoaching(driver, e)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow-sm cursor-pointer ${
                        sentTime 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' 
                          : 'bg-red-600 hover:bg-red-500 text-white border border-red-400/50 font-black'
                      }`}
                      title="Dispatch immediate urgent safety coaching message"
                    >
                      {sentTime ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Sent ({sentTime})</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Urgent Safety Coaching</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* VIEW 0: DEDICATED DRIVER SAFETY & TRAINING COMMAND VIEW */}
      {viewMode === 'safety' && (
        <div className="space-y-6">
          
          {/* Safety View Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Driver Telemetry & Safety Operations Command</h3>
                  <span className="bg-emerald-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                    80% Safety Target Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparative analysis of safety scores across all riders, identifying top champions and scheduling targeted remedial training.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toast.success('Safety Telemetry synced with IoT vehicle sensors across all active routes.');
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition border border-slate-700 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Sync Telemetry Data</span>
              </button>
            </div>
          </div>

          {/* Safety KPI Metric Cards */}
          {(() => {
            const champions = filteredDrivers.filter(d => d.safetyScorePercent >= 90);
            const needsTraining = filteredDrivers.filter(d => d.safetyScorePercent < 80);
            const enrolledCount = Object.keys(enrolledTraining).length;

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <span className="text-xs text-slate-400 font-medium block">Fleet Avg Safety Score</span>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck className={`w-5 h-5 ${avgSafetyScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span className={`text-2xl font-black ${avgSafetyScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {avgSafetyScore}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Target threshold: &ge;80%</span>
                </div>

                <div 
                  onClick={() => setSafetyFilter('TOP_PERFORMERS')}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg cursor-pointer hover:border-emerald-500/50 transition group"
                >
                  <span className="text-xs text-slate-400 font-medium block flex items-center justify-between">
                    <span>Safety Champions (&ge;90%)</span>
                    <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                  </span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {champions.length} Drivers
                  </div>
                  <span className="text-[10px] text-emerald-300 mt-1 block font-mono">🏆 Gold Safety Badges</span>
                </div>

                <div 
                  onClick={() => setSafetyFilter('NEEDS_TRAINING')}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg cursor-pointer hover:border-red-500/50 transition group"
                >
                  <span className="text-xs text-slate-400 font-medium block flex items-center justify-between">
                    <span>Needs Training (&lt;80%)</span>
                    <AlertTriangle className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
                  </span>
                  <div className="text-2xl font-black text-red-400 mt-1">
                    {needsTraining.length} Drivers
                  </div>
                  <span className="text-[10px] text-red-300 mt-1 block font-mono">⚠️ Telemetry Flagged</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <span className="text-xs text-slate-400 font-medium block">Active Training Courses</span>
                  <div className="flex items-center gap-2 mt-1">
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                    <span className="text-2xl font-black text-indigo-300">
                      {enrolledCount} Enrolled
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Remedial safety modules</span>
                </div>

              </div>
            );
          })()}

          {/* Filter Pills for Safety View */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
            <div className="flex flex-wrap items-center gap-2 font-bold text-slate-300">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>Safety Filter:</span>
              
              <div className="flex flex-wrap items-center gap-1.5 ml-2">
                <button
                  onClick={() => setSafetyFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    safetyFilter === 'ALL' ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Drivers ({filteredDrivers.length})
                </button>
                <button
                  onClick={() => setSafetyFilter('TOP_PERFORMERS')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    safetyFilter === 'TOP_PERFORMERS' ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🏆 Top Performers &ge;90% ({filteredDrivers.filter(d => d.safetyScorePercent >= 90).length})
                </button>
                <button
                  onClick={() => setSafetyFilter('NEEDS_TRAINING')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    safetyFilter === 'NEEDS_TRAINING' ? 'bg-red-500 text-white font-black shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚠️ Needs Training &lt;80% ({filteredDrivers.filter(d => d.safetyScorePercent < 80).length})
                </button>
                <button
                  onClick={() => setSafetyFilter('COMPLIANT')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    safetyFilter === 'COMPLIANT' ? 'bg-blue-500 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ✅ Compliant 80-89% ({filteredDrivers.filter(d => d.safetyScorePercent >= 80 && d.safetyScorePercent < 90).length})
                </button>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Showing {filteredDrivers.filter(d => {
                if (safetyFilter === 'TOP_PERFORMERS') return d.safetyScorePercent >= 90;
                if (safetyFilter === 'NEEDS_TRAINING') return d.safetyScorePercent < 80;
                if (safetyFilter === 'COMPLIANT') return d.safetyScorePercent >= 80 && d.safetyScorePercent < 90;
                return true;
              }).length} of {drivers.length} Drivers
            </span>
          </div>

          {/* MAIN COMPARATIVE BAR CHART OF SAFETY SCORES */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Comparative Safety Score Bar Chart Across All Drivers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Green: Champions (&ge;90%) | Blue: Compliant (80-89%) | Red: Needs Safety Training (&lt;80%)
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span className="text-slate-300 text-[11px]">Top Champion (&ge;90%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-slate-300 text-[11px]">Compliant (80-89%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span className="text-slate-300 text-[11px]">Needs Training (&lt;80%)</span>
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart Container */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={filteredDrivers
                    .filter(d => {
                      if (safetyFilter === 'TOP_PERFORMERS') return d.safetyScorePercent >= 90;
                      if (safetyFilter === 'NEEDS_TRAINING') return d.safetyScorePercent < 80;
                      if (safetyFilter === 'COMPLIANT') return d.safetyScorePercent >= 80 && d.safetyScorePercent < 90;
                      return true;
                    })
                    .map(d => ({
                      id: d.id,
                      name: d.fullName.split(' ')[0] + ' ' + (d.fullName.split(' ')[1]?.[0] || ''),
                      fullName: d.fullName,
                      safetyScore: d.safetyScorePercent,
                      rating: d.rating,
                      trips: d.completedTrips,
                      reg: d.assignedVehicleReg || 'Unassigned',
                      phone: d.phone
                    }))
                  } 
                  margin={{ top: 20, right: 20, left: -15, bottom: 25 }}
                >
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-48">
                            <p className="font-bold text-white text-sm">{data.fullName}</p>
                            <p className="text-slate-400">Assigned Reg: <span className="text-emerald-400 font-mono font-bold">{data.reg}</span></p>
                            <p className="text-slate-300 flex items-center justify-between">
                              <span>Safety Score:</span>
                              <strong className={`text-sm font-mono ${data.safetyScore >= 90 ? 'text-emerald-400' : data.safetyScore >= 80 ? 'text-blue-400' : 'text-red-400'}`}>
                                {data.safetyScore}%
                              </strong>
                            </p>
                            <p className="text-slate-400 text-[11px]">Rating: ⭐ {data.rating} • {data.trips} completed trips</p>
                            <div className="pt-1 border-t border-slate-800">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                data.safetyScore >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                data.safetyScore >= 80 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {data.safetyScore >= 90 ? '🏆 Safety Champion' : data.safetyScore >= 80 ? '✅ Compliant Rider' : '⚠️ Needs Safety Training'}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={80} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4" 
                    label={{ value: "80% Target", fill: "#f59e0b", fontSize: 11, position: "top" }} 
                  />
                  <Bar dataKey="safetyScore" radius={[6, 6, 0, 0]}>
                    {filteredDrivers
                      .filter(d => {
                        if (safetyFilter === 'TOP_PERFORMERS') return d.safetyScorePercent >= 90;
                        if (safetyFilter === 'NEEDS_TRAINING') return d.safetyScorePercent < 80;
                        if (safetyFilter === 'COMPLIANT') return d.safetyScorePercent >= 80 && d.safetyScorePercent < 90;
                        return true;
                      })
                      .map((entry) => (
                        <Cell 
                          key={`cell-${entry.id}`} 
                          fill={
                            entry.safetyScorePercent >= 90 ? '#10b981' : 
                            entry.safetyScorePercent >= 80 ? '#3b82f6' : 
                            '#ef4444'
                          } 
                        />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TWO COLUMN GRID: TOP PERFORMERS SHOWCASE VS DRIVERS NEEDING TRAINING */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* SECTION 1: TOP PERFORMERS SHOWCASE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Top Safety Champions (&ge;90%)</h3>
                    <p className="text-xs text-slate-400">Recognizing fleet drivers with exceptional safety records</p>
                  </div>
                </div>

                <span className="bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-500/30">
                  {filteredDrivers.filter(d => d.safetyScorePercent >= 90).length} Champions
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredDrivers.filter(d => d.safetyScorePercent >= 90).map(driver => (
                  <div 
                    key={driver.id}
                    className="p-3.5 bg-gradient-to-r from-emerald-950/30 via-slate-950 to-slate-950 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl transition shadow-md flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={driver.profilePhotoUrl} 
                          alt={driver.fullName} 
                          className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shadow-sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{driver.fullName}</h4>
                            <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                              Gold Badge
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{driver.city} • Vehicle: <span className="font-mono text-emerald-400">{driver.assignedVehicleReg || 'N/A'}</span></p>
                          <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{driver.rating} rating</span>
                            <span className="text-slate-500">• {driver.completedTrips} trips</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-semibold">Safety Score</span>
                        <span className="text-xl font-black text-emerald-400 font-mono">{driver.safetyScorePercent}%</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>0 Overspeed Events</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Smooth Eco-Braking</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(driver)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition border border-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>View Profile</span>
                        </button>

                        <button
                          onClick={() => handleOpenSafetyInsight(driver)}
                          className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold rounded-lg text-xs transition border border-indigo-500/40 flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Safety Insight</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          toast.success(`Safety Excellence Commendation & KES 1,500 Bonus awarded to ${driver.fullName}!`);
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Award Safety Bonus</span>
                      </button>
                    </div>
                  </div>
                ))}

                {filteredDrivers.filter(d => d.safetyScorePercent >= 90).length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No drivers currently matching the &ge;90% Safety Champion threshold.
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: DRIVERS NEEDING SAFETY TRAINING & COACHING */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Drivers Needing Safety Training (&lt;80%)</h3>
                    <p className="text-xs text-slate-400">Targeted coaching and remedial course enrollments</p>
                  </div>
                </div>

                <span className="bg-red-500/20 text-red-400 font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-red-500/30">
                  {filteredDrivers.filter(d => d.safetyScorePercent < 80).length} Flagged
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredDrivers.filter(d => d.safetyScorePercent < 80).map(driver => {
                  const enrollment = enrolledTraining[driver.id];
                  const selectedModule = selectedTrainingModules[driver.id] || (
                    driver.safetyScorePercent < 70 ? 'Defensive Driving & Speed Control 101' :
                    driver.safetyScorePercent < 75 ? 'Smooth Braking & EV Regeneration Mastery' :
                    'NTSA Road Rules & Pre-Trip Compliance Audit'
                  );

                  return (
                    <div 
                      key={driver.id}
                      className="p-3.5 bg-gradient-to-r from-red-950/20 via-slate-950 to-slate-950 border border-red-500/40 hover:border-red-500 rounded-xl transition shadow-md flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={driver.profilePhotoUrl} 
                            alt={driver.fullName} 
                            className="w-12 h-12 rounded-xl object-cover border-2 border-red-400 shadow-sm"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{driver.fullName}</h4>
                              <span className="bg-red-500/20 text-red-400 text-[9px] font-bold border border-red-500/40 uppercase px-1.5 py-0.5 rounded">
                                Needs Training
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{driver.phone} • Reg: <span className="font-mono text-emerald-400">{driver.assignedVehicleReg || 'Unassigned'}</span></p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-semibold">Safety Score</span>
                          <span className="text-xl font-black text-red-400 font-mono">{driver.safetyScorePercent}%</span>
                        </div>
                      </div>

                      {/* Incident Flag */}
                      <div className="bg-red-950/30 p-2.5 rounded-lg border border-red-500/30 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-red-300 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span>Telemetry Violation Summary:</span>
                          </div>
                          <button
                            onClick={() => handleOpenSafetyInsight(driver)}
                            className="text-[10px] font-bold bg-red-500 hover:bg-red-400 text-white px-2.5 py-1 rounded shadow-sm transition flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Safety Insight & Telematics Links</span>
                          </button>
                        </div>
                        <p className="text-slate-300 text-[11px] pl-5">
                          {driver.safetyScorePercent < 70 ? 'Multiple excessive speeding incidents (>75 km/h) & harsh cornering recorded.' :
                           driver.safetyScorePercent < 75 ? 'Frequent abrupt braking triggers and late-night shift fatigue warnings.' :
                           'Minor speed compliance warnings and missing helmet check-in verification.'}
                        </p>
                      </div>

                      {/* Training Module Selector */}
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-300 block flex items-center justify-between">
                          <span>Recommend Remedial Training Course:</span>
                          {enrollment && (
                            <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              {enrollment.status} ({enrollment.date})
                            </span>
                          )}
                        </label>

                        <select
                          value={selectedModule}
                          onChange={(e) => setSelectedTrainingModules(prev => ({ ...prev, [driver.id]: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        >
                          <option value="Defensive Driving & Speed Control 101">Defensive Driving & Speed Control 101</option>
                          <option value="Smooth Braking & EV Regeneration Mastery">Smooth Braking & EV Regeneration Mastery</option>
                          <option value="Night Shift Fatigue & Rider Alertness Workshop">Night Shift Fatigue & Rider Alertness Workshop</option>
                          <option value="NTSA Road Rules & Pre-Trip Compliance Audit">NTSA Road Rules & Pre-Trip Compliance Audit</option>
                        </select>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-400 text-[10px]">Adjust Score:</span>
                          <button
                            onClick={() => {
                              onUpdateDriverSafetyScore(driver.id, 82);
                              toast.success(`Updated ${driver.fullName}'s safety score to 82%!`);
                            }}
                            className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold rounded text-[10px] border border-emerald-500/30 transition cursor-pointer"
                            title="Upgrade score after passing training"
                          >
                            Set 82% (Pass)
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleSendUrgentCoaching(driver, e)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer ${
                              coachingSentDrivers[driver.id]
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                : 'bg-red-600 hover:bg-red-500 text-white border border-red-400/50'
                            }`}
                            title="Send immediate one-click urgent safety coaching message"
                          >
                            {coachingSentDrivers[driver.id] ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Coaching Sent ({coachingSentDrivers[driver.id]})</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 text-white" />
                                <span>Urgent Safety Coaching</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEnrolledTraining(prev => ({
                                ...prev,
                                [driver.id]: {
                                  module: selectedModule,
                                  status: 'Enrolled',
                                  date: 'Today'
                                }
                              }));
                              toast.success(`Assigned "${selectedModule}" training course to ${driver.fullName}! Notification dispatched.`);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{enrollment ? 'Re-enroll Course' : 'Assign Safety Course'}</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {filteredDrivers.filter(d => d.safetyScorePercent < 80).length === 0 && (
                  <div className="text-center py-8 text-emerald-400 text-xs font-bold space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p>All drivers currently exceed the 80% minimum safety threshold!</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEW 0: D3 TEMPORAL DRIVER FATIGUE & TRIP COMPLETION HEATMAP */}
      {viewMode === 'fatigueHeatmap' && (
        <DriverFatigueHeatmap drivers={drivers} />
      )}

      {/* VIEW 1: 7-DAY DRIVER PAYOUT FORECAST WIDGET */}
      {viewMode === 'payoutForecast' && (
        <DriverPayoutForecastWidget drivers={drivers} mpesaPayouts={mpesaPayouts} />
      )}

      {/* VIEW 1: WHAT-IF DRIVER EARNINGS & COMMISSION SIMULATOR */}
      {viewMode === 'simulator' && (
        <WhatIfEarningsSimulator drivers={drivers} vehicles={vehicles} />
      )}

      {/* VIEW 2: EFFICIENCY LEADERBOARD DASHBOARD */}
      {viewMode === 'leaderboard' && (
        <div className="space-y-6">

          {/* LICENSING & PSV BADGE EXPIRY WARNING BANNER */}
          {expiringDriversCount > 0 && (
            <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                      NTSA Licensing & PSV Badge Expiry Warning System
                    </h3>
                    <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px]">
                      {expiringDriversCount} Flagged
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {expiredDriversCount > 0 && <span className="text-red-400 font-bold">🚨 {expiredDriversCount} Expired Badge/License</span>}
                    {expiring30DaysCount > 0 && <span className="text-amber-300 font-semibold">⚠️ {expiring30DaysCount} Expiring within 30 Days</span>}
                    <span className="text-slate-400">(Driving Licenses & PSV Badges require immediate compliance renewal)</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                <button
                  onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                    showExpiringOnly
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showExpiringOnly ? 'Show All Drivers' : `Filter Flagged Drivers (${expiringDriversCount})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Fleet Performance KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium block">Fleet Avg Safety Score</span>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className={`w-5 h-5 ${avgSafetyScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className={`text-2xl font-black ${avgSafetyScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {avgSafetyScore}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Benchmark target: ≥80%</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium block">Fleet Avg Completion Rate</span>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-black text-blue-400">
                  {avgCompletionRate}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Trip dispatch reliability</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium block">Fleet Champion #1</span>
              <div className="flex items-center gap-2 mt-1">
                <Trophy className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-black text-white truncate">
                  {topDriver ? topDriver.fullName : 'N/A'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                {topDriver ? `Index: ${topDriver.efficiencyIndex} / 100` : ''}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium block">Critical Safety Flags</span>
              <div className="flex items-center gap-2 mt-1">
                <AlertTriangle className={`w-5 h-5 ${criticalDriversCount > 0 ? 'text-red-400 animate-bounce' : 'text-slate-500'}`} />
                <span className={`text-2xl font-black ${criticalDriversCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  {criticalDriversCount} Flagged
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Drivers below 80% threshold</span>
            </div>

          </div>

          {/* Top 3 Podium Highlights */}
          {sortedLeaderboard.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* #2 Silver Rank */}
              {sortedLeaderboard[1] && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-4 order-2 md:order-1">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-400/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="bg-slate-800 text-slate-300 font-black px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 border border-slate-700">
                      <Medal className="w-3.5 h-3.5 text-slate-300" />
                      RANK #2 SILVER
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Index: {sortedLeaderboard[1].efficiencyIndex}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img 
                      src={sortedLeaderboard[1].profilePhotoUrl} 
                      alt={sortedLeaderboard[1].fullName} 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-400"
                    />
                    <div>
                      <h3 className="font-bold text-white text-base">{sortedLeaderboard[1].fullName}</h3>
                      <p className="text-xs text-slate-400">{sortedLeaderboard[1].city} • {sortedLeaderboard[1].assignedVehicleReg || 'No Vehicle'}</p>
                      <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="font-bold">{sortedLeaderboard[1].rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Safety Score</span>
                      <span className="font-bold text-emerald-400">{sortedLeaderboard[1].safetyScorePercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Completion Rate</span>
                      <span className="font-bold text-blue-400">{sortedLeaderboard[1].completionRate}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDetails(sortedLeaderboard[1])}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded-lg text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-300" />
                    <span>View Driver Analytics</span>
                  </button>
                </div>
              )}

              {/* #1 Gold Rank (Center) */}
              {sortedLeaderboard[0] && (
                <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4 order-1 md:order-2 ring-1 ring-amber-500/30">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-md">
                      <Trophy className="w-4 h-4 fill-slate-950" />
                      RANK #1 FLEET CHAMPION
                    </span>
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/80 border border-amber-500/50 px-2.5 py-1 rounded-lg shadow-inner">
                      Index: {sortedLeaderboard[0].efficiencyIndex}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img 
                      src={sortedLeaderboard[0].profilePhotoUrl} 
                      alt={sortedLeaderboard[0].fullName} 
                      className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400 shadow-lg"
                    />
                    <div>
                      <h3 className="font-black text-white text-lg">{sortedLeaderboard[0].fullName}</h3>
                      <p className="text-xs text-amber-200/80 font-medium">{sortedLeaderboard[0].city} • {sortedLeaderboard[0].assignedVehicleReg || 'No Vehicle'}</p>
                      <div className="flex items-center gap-1 text-xs text-amber-400 mt-1 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{sortedLeaderboard[0].rating} / 5.0</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3 rounded-lg border border-amber-500/30">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Safety Score</span>
                      <span className="font-black text-emerald-400 text-sm">{sortedLeaderboard[0].safetyScorePercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Completion Rate</span>
                      <span className="font-black text-blue-400 text-sm">{sortedLeaderboard[0].completionRate}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDetails(sortedLeaderboard[0])}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-lg text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Champion Breakdown</span>
                  </button>
                </div>
              )}

              {/* #3 Bronze Rank */}
              {sortedLeaderboard[2] && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-4 order-3">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-700/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-900/50 text-amber-300 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 border border-amber-700/50">
                      <Medal className="w-3.5 h-3.5 text-amber-400" />
                      RANK #3 BRONZE
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Index: {sortedLeaderboard[2].efficiencyIndex}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img 
                      src={sortedLeaderboard[2].profilePhotoUrl} 
                      alt={sortedLeaderboard[2].fullName} 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-amber-700"
                    />
                    <div>
                      <h3 className="font-bold text-white text-base">{sortedLeaderboard[2].fullName}</h3>
                      <p className="text-xs text-slate-400">{sortedLeaderboard[2].city} • {sortedLeaderboard[2].assignedVehicleReg || 'No Vehicle'}</p>
                      <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="font-bold">{sortedLeaderboard[2].rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Safety Score</span>
                      <span className="font-bold text-emerald-400">{sortedLeaderboard[2].safetyScorePercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Completion Rate</span>
                      <span className="font-bold text-blue-400">{sortedLeaderboard[2].completionRate}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDetails(sortedLeaderboard[2])}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded-lg text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-300" />
                    <span>View Driver Analytics</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Comparative Performance Visualizer (Chart) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Comparative Top Performer Benchmark
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparing Combined Efficiency Index, Safety Score, and Trip Completion Rate
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis domain={[50, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Efficiency Index" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Safety Score (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completion Rate (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            
            {/* Table Sorting Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Driver Efficiency & Safety Comparative Rankings
                <span className="bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded text-[10px]">
                  {sortedLeaderboard.length} Drivers
                </span>
              </h3>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Sort Leaderboard By:</span>
                <select
                  value={leaderboardSortBy}
                  onChange={(e: any) => setLeaderboardSortBy(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="efficiency">🏆 Combined Efficiency Index</option>
                  <option value="safety">🛡️ Driver Safety Score (%)</option>
                  <option value="completion">✅ Trip Completion Rate (%)</option>
                  <option value="trips">🚕 Total Completed Trips</option>
                  <option value="earnings">💰 Gross Earnings (KES)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Rank</th>
                    <th className="px-4 py-3 font-semibold">Driver Name</th>
                    <th className="px-4 py-3 font-semibold">City / Vehicle</th>
                    <th className="px-4 py-3 font-semibold">License & PSV Status</th>
                    <th className="px-4 py-3 font-semibold">Efficiency Index</th>
                    <th className="px-4 py-3 font-semibold text-center">Revenue Velocity</th>
                    <th className="px-4 py-3 font-semibold">Safety Score</th>
                    <th className="px-4 py-3 font-semibold">Completion Rate</th>
                    <th className="px-4 py-3 font-semibold">Trips & Rating</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sortedLeaderboard.map((d, index) => {
                    const isCritical = d.safetyScorePercent < 80;
                    const dailyTargetKes = 4500;
                    const dailyCurrentKes = Math.round(((d.completedTrips * 310) % 3100) + 1750 + (d.safetyScorePercent >= 90 ? 600 : 0));
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition">
                        
                        {/* Rank Badge */}
                        <td className="px-4 py-3 font-mono font-black">
                          {index === 0 ? (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit shadow-sm">
                              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>#1 Champion</span>
                            </span>
                          ) : index === 1 ? (
                            <span className="bg-slate-300/20 text-slate-200 border border-slate-300/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                              <Medal className="w-3.5 h-3.5 text-slate-300" />
                              <span>#2 Runner-Up</span>
                            </span>
                          ) : index === 2 ? (
                            <span className="bg-amber-700/20 text-amber-300 border border-amber-700/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                              <Medal className="w-3.5 h-3.5 text-amber-400" />
                              <span>#3 Bronze</span>
                            </span>
                          ) : index < 5 ? (
                            <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit text-[11px]">
                              <Award className="w-3 h-3 text-emerald-400" />
                              <span>#{index + 1} Top 5</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold pl-2">#{index + 1}</span>
                          )}
                        </td>

                        {/* Driver Profile */}
                        <td className="px-4 py-3 font-bold text-white flex items-center gap-2.5">
                          <img 
                            src={d.profilePhotoUrl} 
                            alt={d.fullName} 
                            className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                          />
                          <div>
                            <span className="block font-bold text-slate-100 flex items-center gap-1.5">
                              {d.fullName}
                              {d.safetyScorePercent >= 90 && (
                                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" title="Safety Champion" />
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">{d.phone}</span>
                          </div>
                        </td>

                        {/* City / Vehicle */}
                        <td className="px-4 py-3 text-slate-300">
                          <div>{d.city}</div>
                          <div className="text-[10px] text-emerald-400 font-mono">{d.assignedVehicleReg || 'Unassigned'}</div>
                        </td>

                        {/* Licensing & PSV Status Warning Badge */}
                        <td className="px-4 py-3">
                          {d.licensingAlerts.hasWarning ? (
                            <div className="space-y-1">
                              {d.licensingAlerts.warningSummary.map((sum, i) => (
                                <span 
                                  key={i} 
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    sum.includes('Expired')
                                      ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  <ShieldAlert className="w-3 h-3 shrink-0" />
                                  <span>{sum}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Valid & Compliant</span>
                            </span>
                          )}
                        </td>

                        {/* Combined Efficiency Index Bar */}
                        <td className="px-4 py-3 font-mono font-bold">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-sm font-black flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              {d.efficiencyIndex}
                            </span>
                            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${Math.min(100, d.efficiencyIndex)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Revenue Velocity D3 Gauge */}
                        <td className="px-4 py-2 text-center">
                          <RevenueVelocityGauge 
                            currentRevenueKes={dailyCurrentKes}
                            targetRevenueKes={dailyTargetKes}
                            size="sm"
                            showLabels={true}
                            driverName={d.fullName}
                          />
                        </td>

                        {/* Safety Score */}
                        <td className="px-4 py-3">
                          <span className={`font-mono font-bold px-2.5 py-1 rounded inline-flex items-center gap-1 ${
                            isCritical ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{d.safetyScorePercent}%</span>
                            {isCritical && <span className="text-[9px] font-black uppercase">CRITICAL</span>}
                          </span>
                        </td>

                        {/* Completion Rate */}
                        <td className="px-4 py-3 font-mono font-semibold text-blue-400">
                          {d.completionRate}%
                          <span className="text-[10px] text-slate-500 block font-normal">({d.completedTrips}/{d.totalTrips})</span>
                        </td>

                        {/* Total Trips & Rating */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{d.rating}</span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>{d.completedTrips} total trips</span>
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenCheckIn(d)}
                              className="bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 font-bold px-2 py-1 rounded text-xs transition border border-emerald-500/30 flex items-center gap-1"
                              title="Log daily check-in for this driver"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Check-in</span>
                            </button>
                            <button
                              onClick={() => handleOpenComparison(d.id)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold px-2 py-1 rounded text-xs transition border border-slate-700 flex items-center gap-1"
                              title={`Compare ${d.fullName} performance side-by-side`}
                            >
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Compare</span>
                            </button>
                            <button
                              onClick={() => handleOpenDetails(d)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold px-2 py-1 rounded text-xs transition border border-slate-700"
                            >
                              Analytics
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: STANDARD DRIVER CARDS DIRECTORY GRID */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((d) => (
            <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              
              {/* Driver Profile Header */}
              <div className="flex items-start gap-3">
                <img 
                  src={d.profilePhotoUrl} 
                  alt={d.fullName} 
                  className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500/30"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base truncate">{d.fullName}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.status === 'On Trip' ? 'bg-emerald-500/20 text-emerald-400' :
                      d.status === 'Online' ? 'bg-blue-500/20 text-blue-400' :
                      d.status === 'Active' ? 'bg-teal-500/20 text-teal-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>{d.phone}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    ID: {d.nationalId} • DL: {d.drivingLicenseNumber}
                  </div>
                </div>
              </div>

              {/* REAL-TIME REVENUE VELOCITY D3 GAUGE */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/90 flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Daily Revenue Velocity</span>
                  </span>
                  <div className="text-xs font-bold text-white">
                    Target: <span className="font-mono text-emerald-400">KES 4,500</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    Current Shift Pace (Real-Time D3)
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <RevenueVelocityGauge 
                    currentRevenueKes={Math.round(((d.completedTrips * 310) % 3100) + 1750 + (d.safetyScorePercent >= 90 ? 600 : 0))}
                    targetRevenueKes={4500}
                    size="md"
                    showLabels={true}
                    driverName={d.fullName}
                  />
                </div>
              </div>

              {/* Performance Stats: Rating, Safety, Completed Trips */}
              <div className={`p-2.5 rounded-lg border text-xs space-y-2 ${
                d.safetyScorePercent < 80 ? 'bg-red-950/40 border-red-500/50' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rating</span>
                    <span className="font-bold text-amber-400 flex items-center justify-center gap-0.5 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{d.rating}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Safety Score</span>
                    <span className={`font-bold mt-0.5 block ${
                      d.safetyScorePercent < 80 ? 'text-red-400 font-mono animate-pulse' : 'text-emerald-400'
                    }`}>
                      {d.safetyScorePercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Trips</span>
                    <span className="font-bold text-slate-200 mt-0.5 block">{d.completedTrips}</span>
                  </div>
                </div>

                {/* Safety Score Adjustment Bar */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Driver Safety Score:</span>
                    <span className={`font-bold ${d.safetyScorePercent < 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {d.safetyScorePercent < 80 ? '⚠️ Critical (<80%)' : '✅ Good (≥80%)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={d.safetyScorePercent}
                      onChange={(e) => onUpdateDriverSafetyScore(d.id, parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => onUpdateDriverSafetyScore(d.id, 75)}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition ${
                          d.safetyScorePercent < 80 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Set to 75% (Triggers Critical Status on Vehicle)"
                      >
                        75%
                      </button>
                      <button
                        onClick={() => onUpdateDriverSafetyScore(d.id, 92)}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition ${
                          d.safetyScorePercent >= 80 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Set to 92% (Normal Safety)"
                      >
                        92%
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Vehicle & Shift */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Vehicle:</span>
                  <span className="font-bold text-emerald-400">{d.assignedVehicleReg || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Shift:</span>
                  <span className="font-semibold text-slate-200">⏰ {d.currentShift || 'Day Shift'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contract Type:</span>
                  <span className="font-semibold text-slate-300">{d.employmentType}</span>
                </div>
              </div>

              {/* NTSA Licensing & PSV Badge Status Box */}
              <div className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                d.licensingAlerts.hasWarning
                  ? d.licensingAlerts.dlExpired || d.licensingAlerts.psvExpired
                    ? 'bg-red-950/40 border-red-500/50 text-red-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}>
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span className="flex items-center gap-1">
                    <FileText className={`w-3.5 h-3.5 ${d.licensingAlerts.hasWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span>NTSA Compliance Status</span>
                  </span>
                  {d.licensingAlerts.hasWarning ? (
                    <span className="text-[10px] font-black text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                      ⚠️ WARNING ({d.licensingAlerts.warningSummary.length})
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-400">
                      ✅ COMPLIANT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block">DL Expiry: {d.licenseExpiry}</span>
                    <span className={`font-mono font-bold ${
                      d.licensingAlerts.dlExpired ? 'text-red-400 font-black' : d.licensingAlerts.dlExpiringSoon ? 'text-amber-300 font-black' : 'text-slate-300'
                    }`}>
                      {d.licensingAlerts.dlDays !== null
                        ? d.licensingAlerts.dlDays < 0
                          ? `DL Expired (${Math.abs(d.licensingAlerts.dlDays)}d ago)`
                          : `DL: ${d.licensingAlerts.dlDays}d left`
                        : 'DL: N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">PSV Expiry: {d.psvExpiry || 'N/A'}</span>
                    <span className={`font-mono font-bold ${
                      d.licensingAlerts.psvExpired ? 'text-red-400 font-black' : d.licensingAlerts.psvExpiringSoon ? 'text-amber-300 font-black' : 'text-slate-300'
                    }`}>
                      {d.licensingAlerts.psvDays !== null
                        ? d.licensingAlerts.psvDays < 0
                          ? `PSV Expired (${Math.abs(d.licensingAlerts.psvDays)}d ago)`
                          : `PSV: ${d.licensingAlerts.psvDays}d left`
                        : 'PSV: N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings & M-Pesa Payout Action */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gross Earnings:</span>
                  <span className="font-bold text-slate-200">KES {d.grossEarningsKes.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Outstanding Balance:</span>
                  <span className="font-bold text-emerald-400 font-mono">KES {d.outstandingBalanceKes.toLocaleString()}</span>
                </div>

                {d.safetyScorePercent < 80 && (
                  <button
                    onClick={(e) => handleSendUrgentCoaching(d, e)}
                    className={`w-full py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md border cursor-pointer ${
                      coachingSentDrivers[d.id]
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                        : 'bg-red-600 hover:bg-red-500 text-white border-red-400/50'
                    }`}
                  >
                    {coachingSentDrivers[d.id] ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Urgent Coaching Dispatched ({coachingSentDrivers[d.id]})</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-white" />
                        <span>Send Urgent Safety Coaching</span>
                      </>
                    )}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => handleOpenSafetyInsight(d)}
                    className="flex items-center justify-center gap-1 bg-red-950/90 hover:bg-red-900 text-red-300 font-bold py-2 rounded-lg text-[11px] transition border border-red-500/40 cursor-pointer"
                    title="View safety telematics breakdown"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    <span>Safety Insight</span>
                  </button>

                  <button
                    onClick={() => handleOpenComparison(d.id)}
                    className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-[11px] transition border border-slate-700 shadow-xs cursor-pointer"
                    title={`Compare ${d.fullName} performance with another driver`}
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Compare</span>
                  </button>

                  <button
                    onClick={() => handleOpenDetails(d)}
                    className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-[11px] transition border border-slate-700 shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Analytics</span>
                  </button>

                  <button
                    onClick={() => handleOpenCheckIn(d)}
                    className="flex items-center justify-center gap-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold py-2 rounded-lg text-[11px] transition border border-emerald-500/30 cursor-pointer"
                    title="Log daily check-in for driver"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Check-in</span>
                  </button>
                </div>

                <button
                  onClick={() => onOpenMpesaModalForDriver(d)}
                  className="w-full flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 rounded-lg text-[11px] transition shadow-md shadow-emerald-950 cursor-pointer"
                  title={`Quick Pay KES ${d.outstandingBalanceKes.toLocaleString()} to ${d.fullName}`}
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                  <span>Quick Pay</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Driver Daily Check-in Modal */}
      <DriverCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        drivers={drivers}
        vehicles={vehicles}
        preselectedDriver={selectedDriverForCheckIn}
        onCheckInSubmit={handleCheckInSubmit}
        existingCheckIns={checkInsList}
      />

      {/* Interactive Driver Profile, Trip History & Safety Score Modal */}
      <DriverDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        driver={selectedDriverForDetails}
        assignedVehicle={vehicles.find(v => v.id === selectedDriverForDetails?.assignedVehicleId || v.registrationNumber === selectedDriverForDetails?.assignedVehicleReg)}
        mpesaPayouts={mpesaPayouts}
        onOpenMpesaModal={onOpenMpesaModalForDriver}
        onOpenMessageModal={(driver) => {
          if (onNavigateToMessages) {
            onNavigateToMessages(driver);
          }
        }}
        onUpdateDriverSafetyScore={onUpdateDriverSafetyScore}
        onOpenSafetyInsight={handleOpenSafetyInsight}
        onOpenComparison={(driver) => handleOpenComparison(driver.id)}
      />

      {/* Safety Insight & Telematics Violation Breakdown Modal */}
      <SafetyInsightModal
        isOpen={isSafetyInsightModalOpen}
        onClose={() => setIsSafetyInsightModalOpen(false)}
        driver={selectedDriverForInsight}
        vehicle={vehicles.find(v => v.id === selectedDriverForInsight?.assignedVehicleId || v.registrationNumber === selectedDriverForInsight?.assignedVehicleReg)}
        onAssignTraining={(driverId, moduleName) => {
          setEnrolledTraining(prev => ({
            ...prev,
            [driverId]: {
              module: moduleName,
              status: 'Enrolled',
              date: 'Today'
            }
          }));
        }}
        onNavigateToMessages={onNavigateToMessages}
        onUpdateDriverSafetyScore={onUpdateDriverSafetyScore}
      />

      {/* Driver Performance Comparison Modal */}
      <DriverPerformanceComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        drivers={drivers}
        vehicles={vehicles}
        initialDriverAId={comparisonDriverAId}
        initialDriverBId={comparisonDriverBId}
        onOpenMpesaModal={onOpenMpesaModalForDriver}
        onOpenMessageModal={(driver) => {
          setIsComparisonModalOpen(false);
          if (onNavigateToMessages) {
            onNavigateToMessages(driver);
          }
        }}
        onUpdateDriverSafetyScore={onUpdateDriverSafetyScore}
        onSendCoaching={handleSendUrgentCoaching}
      />

    </div>
  );
};

