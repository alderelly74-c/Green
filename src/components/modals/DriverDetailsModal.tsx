import React, { useState, useMemo } from 'react';
import { Driver, Vehicle, MpesaPayoutRequest, DriverShiftLog } from '../../types';
import { 
  X, User, Phone, ShieldCheck, Award, Wallet, 
  MapPin, Calendar, Clock, Star, AlertTriangle, 
  TrendingUp, Send, CheckCircle2, ArrowUpRight, Bike, ShieldAlert,
  FileText, Zap, Fuel, Activity, DollarSign, Coffee, Filter, MessageSquare,
  Users, ArrowLeftRight
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Cell, ReferenceLine 
} from 'recharts';
import { getDriverLicensingAlerts } from '../../utils/licensing';
import { RevenueVelocityGauge } from '../RevenueVelocityGauge';

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  assignedVehicle?: Vehicle | null;
  mpesaPayouts?: MpesaPayoutRequest[];
  onOpenMpesaModal?: (driver: Driver) => void;
  onOpenMessageModal?: (driver: Driver) => void;
  onUpdateDriverSafetyScore?: (driverId: string, score: number) => void;
  onOpenSafetyInsight?: (driver: Driver) => void;
  onOpenComparison?: (driver: Driver) => void;
}

export const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({
  isOpen,
  onClose,
  driver,
  assignedVehicle,
  mpesaPayouts = [],
  onOpenMpesaModal,
  onOpenMessageModal,
  onUpdateDriverSafetyScore,
  onOpenSafetyInsight,
  onOpenComparison
}) => {
  if (!isOpen || !driver) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'payouts' | 'safety' | 'shifts'>('overview');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'working' | 'rest'>('all');
  const licensingAlerts = getDriverLicensingAlerts(driver);

  // Generate 30-day shift logs for the last 30 days
  const shiftLogs: DriverShiftLog[] = useMemo(() => {
    const logs: DriverShiftLog[] = [];
    const baseDate = new Date(2026, 7, 9); // 2026-08-09
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 30; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);

      const dayOfWeek = dayNames[d.getDay()];
      const dayNum = d.getDate().toString().padStart(2, '0');
      const monthStr = monthNames[d.getMonth()];
      const yearStr = d.getFullYear();
      const formattedDate = `${dayNum} ${monthStr} ${yearStr}`;

      const isRestDay = (i > 0 && i % 6 === 0) || (d.getDay() === 0 && i !== 0);

      if (isRestDay) {
        logs.push({
          id: `shift-${driver.id}-${i}`,
          driverId: driver.id,
          date: formattedDate,
          dayOfWeek,
          startTime: '-',
          endTime: '-',
          totalHours: 0,
          shiftType: 'Custom',
          vehicleReg: assignedVehicle?.registrationNumber || driver.assignedVehicleReg || 'KMG 482E',
          tripsCompleted: 0,
          revenueKes: 0,
          status: 'Rest Day',
          overtimeHours: 0
        });
      } else if (i === 0 && (driver.status === 'On Trip' || driver.status === 'Online')) {
        logs.push({
          id: `shift-${driver.id}-0`,
          driverId: driver.id,
          date: `${formattedDate} (Today)`,
          dayOfWeek,
          startTime: '06:30 EAT',
          endTime: 'In Progress',
          totalHours: 7.5,
          shiftType: 'Full Day',
          vehicleReg: assignedVehicle?.registrationNumber || driver.assignedVehicleReg || 'KMG 482E',
          tripsCompleted: 7,
          revenueKes: 3850,
          status: 'In Progress',
          startOdometerKm: 14210,
          overtimeHours: 0
        });
      } else {
        const startHour = 6 + (i % 2);
        const startMin = (i * 15) % 60;
        const totalH = 9 + ((i * 7) % 4) + ((i % 3) * 0.5);
        const endHour = Math.floor(startHour + totalH);
        const endMin = (startMin + 30) % 60;

        const startStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} EAT`;
        const endStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')} EAT`;
        const overtime = Math.max(0, Math.round((totalH - 8.0) * 10) / 10);
        const tripsCount = 8 + ((i * 3) % 10);
        const dailyRevenue = tripsCount * (380 + ((i * 45) % 250));

        logs.push({
          id: `shift-${driver.id}-${i}`,
          driverId: driver.id,
          date: formattedDate,
          dayOfWeek,
          startTime: startStr,
          endTime: endStr,
          totalHours: Math.round(totalH * 10) / 10,
          shiftType: totalH >= 11 ? 'Full Day' : (i % 2 === 0 ? 'Morning' : 'Evening'),
          vehicleReg: assignedVehicle?.registrationNumber || driver.assignedVehicleReg || 'KMG 482E',
          tripsCompleted: tripsCount,
          revenueKes: dailyRevenue,
          status: 'Completed',
          startOdometerKm: 12000 + (30 - i) * 85,
          endOdometerKm: 12000 + (30 - i) * 85 + Math.round(totalH * 12),
          overtimeHours: overtime
        });
      }
    }
    return logs;
  }, [driver, assignedVehicle]);

  // Derived 30-day shift metrics
  const shiftMetrics = useMemo(() => {
    const activeShifts = shiftLogs.filter(s => s.status === 'Completed' || s.status === 'In Progress');
    const totalHours = activeShifts.reduce((sum, s) => sum + s.totalHours, 0);
    const totalOvertime = activeShifts.reduce((sum, s) => sum + (s.overtimeHours || 0), 0);
    const totalTrips = activeShifts.reduce((sum, s) => sum + s.tripsCompleted, 0);
    const totalRevenue = activeShifts.reduce((sum, s) => sum + s.revenueKes, 0);
    const avgHoursPerDay = activeShifts.length > 0 ? (totalHours / activeShifts.length).toFixed(1) : '0';

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      activeDays: activeShifts.length,
      restDays: shiftLogs.length - activeShifts.length,
      avgHoursPerDay,
      totalOvertime: Math.round(totalOvertime * 10) / 10,
      totalTrips,
      totalRevenue
    };
  }, [shiftLogs]);

  const filteredShiftLogs = useMemo(() => {
    if (shiftFilter === 'working') {
      return shiftLogs.filter(s => s.status === 'Completed' || s.status === 'In Progress');
    }
    if (shiftFilter === 'rest') {
      return shiftLogs.filter(s => s.status === 'Rest Day');
    }
    return shiftLogs;
  }, [shiftLogs, shiftFilter]);

  // Generate 6-month safety score trend data relative to current driver safety score
  const currentScore = driver.safetyScorePercent;
  const safetyTrendData = [
    { month: 'Mar', score: Math.min(100, Math.max(60, currentScore + 8)) },
    { month: 'Apr', score: Math.min(100, Math.max(60, currentScore + 4)) },
    { month: 'May', score: Math.min(100, Math.max(60, currentScore - 2)) },
    { month: 'Jun', score: Math.min(100, Math.max(60, currentScore + 3)) },
    { month: 'Jul', score: Math.min(100, Math.max(60, currentScore - 5)) },
    { month: 'Aug (Now)', score: currentScore }
  ];

  // Filter payouts for this driver
  const driverPayouts = mpesaPayouts.filter(p => p.driverId === driver.id);

  // Simulated trip history for this driver
  const mockTrips = [
    {
      id: `TRIP-${driver.id.toUpperCase()}-0821`,
      pickup: 'Westlands Commercial Hub',
      dropoff: 'Jomo Kenyatta Intl Airport (JKIA)',
      distanceKm: 22.4,
      durationMins: 38,
      fareKes: 1850,
      timestamp: 'Today, 14:15 EAT',
      status: 'Completed',
      rating: 5.0,
      customerName: 'Amina K.'
    },
    {
      id: `TRIP-${driver.id.toUpperCase()}-0820`,
      pickup: 'Kilimani Argwings Kodhek',
      dropoff: 'Upperhill Medical Centre',
      distanceKm: 6.8,
      durationMins: 16,
      fareKes: 620,
      timestamp: 'Today, 11:30 EAT',
      status: 'Completed',
      rating: 4.8,
      customerName: 'David N.'
    },
    {
      id: `TRIP-${driver.id.toUpperCase()}-0819`,
      pickup: 'Nairobi CBD City Hall',
      dropoff: 'Lavington Mall',
      distanceKm: 9.1,
      durationMins: 22,
      fareKes: 850,
      timestamp: 'Yesterday, 17:45 EAT',
      status: 'Completed',
      rating: 5.0,
      customerName: 'Sarah M.'
    },
    {
      id: `TRIP-${driver.id.toUpperCase()}-0818`,
      pickup: 'Gigiri UN Avenue',
      dropoff: 'Karen Shopping Centre',
      distanceKm: 28.3,
      durationMins: 45,
      fareKes: 2400,
      timestamp: '06 Aug 2025, 09:10 EAT',
      status: 'Completed',
      rating: 4.9,
      customerName: 'Peter O.'
    },
    {
      id: `TRIP-${driver.id.toUpperCase()}-0817`,
      pickup: 'Industrial Area Enterprise Rd',
      dropoff: 'South B Shopping Centre',
      distanceKm: 5.2,
      durationMins: 14,
      fareKes: 480,
      timestamp: '05 Aug 2025, 16:20 EAT',
      status: 'Cancelled',
      rating: null,
      customerName: 'James K.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 my-auto">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={driver.profilePhotoUrl} 
              alt={driver.fullName} 
              className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{driver.fullName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  driver.status === 'On Trip' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  driver.status === 'Online' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {driver.status}
                </span>
                {driver.safetyScorePercent < 80 && (
                  <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-full text-[10px] animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    CRITICAL SAFETY
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{driver.phone}</span> • <span>DL: {driver.drivingLicenseNumber}</span> • <span>City: {driver.city}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenComparison && (
              <button
                onClick={() => {
                  onClose();
                  onOpenComparison(driver);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold px-3 py-1.5 rounded-xl text-xs transition border border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`Compare ${driver.fullName} with another driver`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compare Performance</span>
              </button>
            )}

            {onOpenMessageModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMessageModal(driver);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-md shadow-indigo-950/50 flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`Message ${driver.fullName} (${driver.phone})`}
              >
                <MessageSquare className="w-4 h-4 text-indigo-200" />
                <span>Message Driver</span>
              </button>
            )}

            {onOpenMpesaModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMpesaModal(driver);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`Quick Pay KES ${driver.outstandingBalanceKes.toLocaleString()} to ${driver.fullName}`}
              >
                <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Quick Pay</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-6 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Driver Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'safety'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Safety Score Trends</span>
            {driver.safetyScorePercent < 80 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trips')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'trips'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Trip History ({driver.completedTrips})</span>
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'payouts'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>M-Pesa Payouts ({driverPayouts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'shifts'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Shift Log (30 Days)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Critical Warning Callout if score < 80% */}
              {driver.safetyScorePercent < 80 && (
                <div className="bg-red-500/15 border-2 border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-400">CRITICAL DRIVER SAFETY ALERT</h4>
                    <p className="text-xs text-red-200">
                      Driver safety score is currently <strong className="text-white">{driver.safetyScorePercent}%</strong> (below 80% safety compliance threshold).
                      The assigned vehicle <strong className="text-white">{driver.assignedVehicleReg || 'N/A'}</strong> has been flagged with 'Critical' status in the fleet registry.
                    </p>
                  </div>
                </div>
              )}

              {/* Licensing & PSV Badge Expiry Warning Banner inside Modal */}
              {licensingAlerts.hasWarning && (
                <div className="bg-amber-950/60 border-2 border-amber-500/60 rounded-xl p-4 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-300">NTSA LICENSING COMPLIANCE WARNING</h4>
                    <p className="text-xs text-amber-200">
                      This driver has active document expiration flags requiring immediate renewal:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {licensingAlerts.warningSummary.map((sum, i) => (
                        <span key={i} className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                          ⚠️ {sum}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* REAL-TIME SHIFT REVENUE VELOCITY D3 GAUGE BANNER */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1 text-center md:text-left flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Real-Time Revenue Velocity (Shift Target Pace)
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      D3 Telematics Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Tracks driver's real-time revenue accrual against their shift goal of <strong className="text-emerald-400 font-mono">KES 4,500</strong>.
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-4 text-[11px] font-mono text-slate-400 pt-1">
                    <div>Shift Progress: <span className="text-white font-bold">7.5 / 10 Hours</span></div>
                    <div>Completed Trips Today: <span className="text-emerald-400 font-bold">7 Trips</span></div>
                  </div>
                </div>

                <div className="shrink-0 bg-slate-900/80 px-5 py-2.5 rounded-xl border border-slate-800 flex items-center justify-center">
                  <RevenueVelocityGauge 
                    currentRevenueKes={Math.round(((driver.completedTrips * 310) % 3100) + 1750 + (driver.safetyScorePercent >= 90 ? 600 : 0))}
                    targetRevenueKes={4500}
                    size="lg"
                    showLabels={true}
                    driverName={driver.fullName}
                  />
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Rating Score</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xl font-black text-amber-400">{driver.rating} / 5.0</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Based on {driver.completedTrips} trips</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Safety Score</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ShieldCheck className={`w-4 h-4 ${driver.safetyScorePercent >= 80 ? 'text-emerald-400' : 'text-red-400'}`} />
                      <span className={`text-xl font-black ${driver.safetyScorePercent >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {driver.safetyScorePercent}%
                      </span>
                    </div>
                  </div>
                  {onOpenSafetyInsight && (
                    <button
                      onClick={() => onOpenSafetyInsight(driver)}
                      className="mt-2 w-full py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold rounded text-[10px] border border-indigo-500/40 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-3 h-3 text-indigo-400" />
                      <span>Telematics Insight</span>
                    </button>
                  )}
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Gross Earnings</span>
                  <div className="text-xl font-black text-slate-100 mt-1">
                    KES {driver.grossEarningsKes.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Commission: KES {driver.companyCommissionKes.toLocaleString()}</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Payout Balance</span>
                    <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                      KES {driver.outstandingBalanceKes.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">M-Pesa B2C Ready</span>
                  </div>
                  {onOpenMpesaModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenMpesaModal(driver);
                      }}
                      className="mt-2.5 w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
                      title={`Quick Pay KES ${driver.outstandingBalanceKes.toLocaleString()} to ${driver.fullName}`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                      <span>Quick Pay M-Pesa</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Driver & Vehicle Efficiency Analytics Card */}
              {assignedVehicle ? (
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 rounded-xl border border-slate-800 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white">
                          Vehicle Telemetry & Revenue Yield Analytics
                        </h4>
                        <p className="text-xs text-slate-400">
                          Assigned asset <strong className="text-emerald-400 font-mono">{assignedVehicle.registrationNumber}</strong> ({assignedVehicle.make} {assignedVehicle.model})
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {assignedVehicle.category} Telemetry
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Revenue per Kilometer Card */}
                    <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span>Revenue Per Kilometer</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                          Yield Rate
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white font-mono">
                          KES {((assignedVehicle.totalRevenueGeneratedKes || driver.grossEarningsKes) / Math.max(1, assignedVehicle.odometerKm)).toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400">/ km</span>
                      </div>

                      <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                        <div className="flex justify-between">
                          <span>Total Vehicle Revenue:</span>
                          <strong className="text-slate-200">KES {(assignedVehicle.totalRevenueGeneratedKes || driver.grossEarningsKes).toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Odometer Distance:</span>
                          <strong className="text-slate-200">{assignedVehicle.odometerKm.toLocaleString()} km</strong>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-medium">
                          <span>Driver Gross Revenue Rate:</span>
                          <strong>KES {(driver.grossEarningsKes / Math.max(1, driver.completedTrips * 12.5)).toFixed(2)} / km avg</strong>
                        </div>
                      </div>
                    </div>

                    {/* Battery / Fuel Consumption Efficiency Card */}
                    <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                          {assignedVehicle.category === 'Electric' ? (
                            <Zap className="w-4 h-4 text-teal-400" />
                          ) : (
                            <Fuel className="w-4 h-4 text-amber-400" />
                          )}
                          <span>
                            {assignedVehicle.category === 'Electric' ? 'Battery & Energy Efficiency' : 'Fuel Consumption Efficiency'}
                          </span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          assignedVehicle.category === 'Electric'
                            ? 'bg-teal-950 text-teal-300 border-teal-500/30'
                            : 'bg-amber-950 text-amber-300 border-amber-500/30'
                        }`}>
                          {assignedVehicle.category === 'Electric' ? '⚡ EV Energy' : '⛽ ICE Fuel'}
                        </span>
                      </div>

                      {assignedVehicle.category === 'Electric' ? (
                        <>
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-teal-300 font-mono">
                                {(3.2 + (driver.safetyScorePercent / 100) * 0.8).toFixed(1)} kWh
                              </span>
                              <span className="text-xs text-slate-400">/ 100 km</span>
                            </div>
                            <span className="text-xs text-emerald-400 font-bold font-mono">
                              ({(100 / (3.2 + (driver.safetyScorePercent / 100) * 0.8)).toFixed(1)} km/kWh)
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                            <div className="flex justify-between">
                              <span>Charging Cost Per Km:</span>
                              <strong className="text-teal-300 font-mono">
                                KES {(assignedVehicle.totalChargingSpentKes / Math.max(1, assignedVehicle.odometerKm)).toFixed(2)} / km
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Battery State of Charge (SoC):</span>
                              <strong className="text-slate-200">{assignedVehicle.currentSoCPercent ?? 85}%</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Battery Health Index:</span>
                              <strong className="text-emerald-400">{assignedVehicle.batteryHealthPercent ?? 96}% (Optimal)</strong>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-amber-300 font-mono">
                                {(28 + (driver.safetyScorePercent / 100) * 7).toFixed(1)} km
                              </span>
                              <span className="text-xs text-slate-400">/ Liter</span>
                            </div>
                            <span className="text-xs text-amber-400 font-bold font-mono">
                              ({(100 / (28 + (driver.safetyScorePercent / 100) * 7)).toFixed(1)} L/100km)
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                            <div className="flex justify-between">
                              <span>Fuel Cost Per Km:</span>
                              <strong className="text-amber-300 font-mono">
                                KES {(assignedVehicle.totalFuelSpentKes / Math.max(1, assignedVehicle.odometerKm)).toFixed(2)} / km
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Fuel Level:</span>
                              <strong className="text-slate-200">{assignedVehicle.currentFuelLiters ?? 8} L / {assignedVehicle.fuelCapacityLiters ?? 12} L</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Engine Thermal Efficiency:</span>
                              <strong className="text-amber-400">{driver.safetyScorePercent >= 85 ? '92% High' : '82% Moderate'}</strong>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center text-slate-500 text-xs italic">
                  Assign a vehicle to this driver to compute real-time Revenue per Kilometer and Energy/Fuel Efficiency calculations.
                </div>
              )}

              {/* Driver Details & Assigned Vehicle Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Personal & Licensing Info */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                    Licensing & Employment Info
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 block">National ID</span>
                      <span className="font-mono text-slate-200 font-semibold">{driver.nationalId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">DL Number</span>
                      <span className="font-mono text-slate-200 font-semibold">{driver.drivingLicenseNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">DL Expiry</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-300 font-medium">{driver.licenseExpiry}</span>
                        {licensingAlerts.dlExpired ? (
                          <span className="text-[10px] font-bold text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-500/40">
                            🚨 Expired
                          </span>
                        ) : licensingAlerts.dlExpiringSoon ? (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40">
                            ⚠️ {licensingAlerts.dlDays}d left
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold">✅ Valid</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block">PSV Badge No & Expiry</span>
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-200 font-semibold block">{driver.psvBadgeNumber || 'N/A'}</span>
                        {driver.psvExpiry && (
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                            <span className="text-slate-400">{driver.psvExpiry}</span>
                            {licensingAlerts.psvExpired ? (
                              <span className="text-[10px] font-bold text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-500/40">
                                🚨 Expired
                              </span>
                            ) : licensingAlerts.psvExpiringSoon ? (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40">
                                ⚠️ {licensingAlerts.psvDays}d left
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-semibold">✅ Valid</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Employment Type</span>
                      <span className="text-slate-200 font-semibold">{driver.employmentType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date Joined</span>
                      <span className="text-slate-300 font-medium">{driver.dateJoined}</span>
                    </div>
                  </div>
                </div>

                {/* Assigned Vehicle Details */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>Assigned Vehicle Assignment</span>
                    <Bike className="w-4 h-4 text-emerald-400" />
                  </h4>
                  {assignedVehicle ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Registration:</span>
                        <span className="font-black text-emerald-400 text-sm">{assignedVehicle.registrationNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Make & Model:</span>
                        <span className="text-slate-200 font-semibold">{assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.year})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Type & Fuel Category:</span>
                        <span className="text-slate-300">{assignedVehicle.category} • {assignedVehicle.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Odometer:</span>
                        <span className="text-slate-200 font-mono font-bold">{assignedVehicle.odometerKm.toLocaleString()} km</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-500 text-xs italic">
                      No vehicle currently assigned to this driver.
                    </div>
                  )}
                </div>

              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {onOpenMessageModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMessageModal(driver);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Mobile Message to {driver.fullName} ({driver.phone})</span>
                  </button>
                )}

                {onOpenMpesaModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMpesaModal(driver);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send M-Pesa B2C Payout (KES {driver.outstandingBalanceKes.toLocaleString()})</span>
                  </button>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SAFETY SCORE TRENDS BAR CHART */}
          {activeTab === 'safety' && (
            <div className="space-y-6">
              
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Monthly Safety Score Trend Analysis
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        driver.safetyScorePercent >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        Current: {driver.safetyScorePercent}%
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tracking telematics behavior, speed infractions, harsh braking, and route safety over 6 months
                    </p>
                  </div>

                  {/* Safety Score Quick Controls & Telematics Insight */}
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenSafetyInsight && (
                      <button
                        onClick={() => onOpenSafetyInsight(driver)}
                        className="bg-red-500 hover:bg-red-400 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Safety Insight Breakdown</span>
                      </button>
                    )}
                    {onUpdateDriverSafetyScore && (
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 shrink-0">
                        <span className="text-[11px] text-slate-400 font-medium">Adjust:</span>
                        <button
                          onClick={() => onUpdateDriverSafetyScore(driver.id, 75)}
                          className={`text-xs px-2.5 py-1 rounded font-bold transition ${
                            driver.safetyScorePercent < 80 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          Set 75% (Critical)
                        </button>
                        <button
                          onClick={() => onUpdateDriverSafetyScore(driver.id, 90)}
                          className={`text-xs px-2.5 py-1 rounded font-bold transition ${
                            driver.safetyScorePercent >= 80 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          Set 90% (Good)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recharts Bar Chart */}
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safetyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[40, 100]} 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value: any) => [`${value}% Safety Score`, 'Score']}
                      />
                      <ReferenceLine y={80} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Safety Threshold 80%', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {safetyTrendData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.score >= 80 ? '#10b981' : '#ef4444'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend & Guidance */}
                <div className="flex flex-wrap items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400 gap-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                      <span>Compliant (≥80%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-red-500 inline-block"></span>
                      <span>Critical (&lt;80%)</span>
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono">
                    Telematics Sample Rate: 10Hz GPS + Accelerometer Data
                  </span>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: DETAILED TRIP HISTORY */}
          {activeTab === 'trips' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Recent Commercial Trip Dispatch Logs
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-mono">
                    {mockTrips.length} Recent Trips Shown
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {mockTrips.map((trip) => (
                  <div 
                    key={trip.id}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400 text-xs">{trip.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          trip.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trip.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">{trip.timestamp}</span>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{trip.pickup}</span>
                        <span className="text-slate-500">➔</span>
                        <span>{trip.dropoff}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-4">
                        <span>Passenger / Client: <strong className="text-slate-200">{trip.customerName}</strong></span>
                        <span>Distance: <strong className="text-slate-200">{trip.distanceKm} km</strong></span>
                        <span>Duration: <strong className="text-slate-200">{trip.durationMins} mins</strong></span>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-slate-800/80 pt-2 md:pt-0 shrink-0">
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        KES {trip.fareKes.toLocaleString()}
                      </span>
                      {trip.rating ? (
                        <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{trip.rating}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No Rating</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RECENT PAYOUTS */}
          {activeTab === 'payouts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  M-Pesa B2C Payout Records for {driver.fullName}
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {driverPayouts.length} Payouts
                  </span>
                </h3>

                {onOpenMpesaModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMpesaModal(driver);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Initiate Payout</span>
                  </button>
                )}
              </div>

              {driverPayouts.length === 0 ? (
                <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center space-y-3">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No M-Pesa payout transactions recorded yet for this driver.
                  </p>
                  {onOpenMpesaModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenMpesaModal(driver);
                      }}
                      className="bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs hover:bg-emerald-500 transition"
                    >
                      Trigger First M-Pesa B2C Payout
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Transaction Ref</th>
                        <th className="px-4 py-3 font-semibold">Phone Number</th>
                        <th className="px-4 py-3 font-semibold">Reason</th>
                        <th className="px-4 py-3 font-semibold">M-Pesa Receipt</th>
                        <th className="px-4 py-3 font-semibold">Timestamp</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount (KES)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {driverPayouts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-900/40 transition">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">{p.transactionRef}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{p.phoneNumber}</td>
                          <td className="px-4 py-3 text-slate-400">{p.payoutReason}</td>
                          <td className="px-4 py-3 font-mono text-slate-200 text-[11px]">{p.mpesaReceiptNo || 'SFG882910K'}</td>
                          <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{p.timestamp}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                            KES {p.amountKes.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HISTORICAL SHIFT LOG (LAST 30 DAYS) */}
          {activeTab === 'shifts' && (
            <div className="space-y-6">
              
              {/* Header & KPI Summary Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Total Hours Worked</span>
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-white font-mono">{shiftMetrics.totalHours} hrs</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      30 Days
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Overtime: <strong className="text-amber-400">{shiftMetrics.totalOvertime} hrs</strong> (&gt;8h/day)
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Average Daily Shift</span>
                  </span>
                  <div className="text-xl font-black text-blue-400 font-mono mt-1">
                    {shiftMetrics.avgHoursPerDay} hrs / day
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Standard target: 8.0 hrs
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>Active Shift Days</span>
                  </span>
                  <div className="text-xl font-black text-slate-100 font-mono mt-1">
                    {shiftMetrics.activeDays} <span className="text-xs text-slate-500 font-normal">/ 30 Days</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Rest / Off Days: <strong className="text-slate-300">{shiftMetrics.restDays} days</strong>
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>30-Day Revenue & Rides</span>
                  </span>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                    KES {shiftMetrics.totalRevenue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Total Rides: <strong className="text-slate-300">{shiftMetrics.totalTrips} completed</strong>
                  </span>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Shift Timestamps & Hours Log (Past 30 Days)
                  </h4>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
                  <button
                    onClick={() => setShiftFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      shiftFilter === 'all' 
                        ? 'bg-emerald-500 text-slate-950 shadow-md' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    All (30 Days)
                  </button>
                  <button
                    onClick={() => setShiftFilter('working')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      shiftFilter === 'working' 
                        ? 'bg-emerald-500 text-slate-950 shadow-md' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    Active Shifts ({shiftMetrics.activeDays})
                  </button>
                  <button
                    onClick={() => setShiftFilter('rest')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      shiftFilter === 'rest' 
                        ? 'bg-emerald-500 text-slate-950 shadow-md' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    Rest Days ({shiftMetrics.restDays})
                  </button>
                </div>
              </div>

              {/* Table / List View of 30-Day Shift Logs */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-bold">Date & Day</th>
                        <th className="px-4 py-3 font-bold">Start Time</th>
                        <th className="px-4 py-3 font-bold">End Time</th>
                        <th className="px-4 py-3 font-bold text-center">Total Hours</th>
                        <th className="px-4 py-3 font-bold">Shift Type</th>
                        <th className="px-4 py-3 font-bold">Vehicle</th>
                        <th className="px-4 py-3 font-bold text-right">Trips & Revenue</th>
                        <th className="px-4 py-3 font-bold text-center">Shift Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredShiftLogs.map(s => {
                        const isOvertime = s.totalHours > 8.0;
                        return (
                          <tr key={s.id} className="hover:bg-slate-900/50 transition">
                            {/* Date & Day */}
                            <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-slate-900 text-slate-300 font-black text-[10px] flex items-center justify-center border border-slate-800 shrink-0">
                                  {s.dayOfWeek}
                                </span>
                                <span>{s.date}</span>
                              </div>
                            </td>

                            {/* Start Time */}
                            <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                              {s.status === 'Rest Day' ? (
                                <span className="text-slate-600">-</span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>{s.startTime}</span>
                                </span>
                              )}
                            </td>

                            {/* End Time */}
                            <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                              {s.status === 'Rest Day' ? (
                                <span className="text-slate-600">-</span>
                              ) : s.status === 'In Progress' ? (
                                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                  <span>In Progress</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{s.endTime}</span>
                                </span>
                              )}
                            </td>

                            {/* Total Hours Worked */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {s.status === 'Rest Day' ? (
                                <span className="text-slate-600 font-mono text-xs">0.0 hrs</span>
                              ) : (
                                <div className="inline-flex flex-col items-center">
                                  <span className={`font-mono font-black text-xs px-2 py-0.5 rounded border ${
                                    isOvertime 
                                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' 
                                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                  }`}>
                                    {s.totalHours.toFixed(1)} hrs
                                  </span>
                                  {isOvertime && (
                                    <span className="text-[9px] font-bold text-amber-400 mt-0.5">
                                      +{s.overtimeHours}h OT
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Shift Type */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {s.status === 'Rest Day' ? (
                                <span className="text-slate-500 text-[11px]">Rest / Off</span>
                              ) : (
                                <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-800">
                                  {s.shiftType}
                                </span>
                              )}
                            </td>

                            {/* Vehicle */}
                            <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                              {s.status === 'Rest Day' ? (
                                <span className="text-slate-600">-</span>
                              ) : (
                                <span className="bg-slate-900/80 text-emerald-400 px-2 py-0.5 rounded border border-slate-800 font-bold">
                                  {s.vehicleReg}
                                </span>
                              )}
                            </td>

                            {/* Trips & Revenue */}
                            <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                              {s.status === 'Rest Day' ? (
                                <span className="text-slate-600 text-xs">KES 0</span>
                              ) : (
                                <div>
                                  <span className="font-bold text-emerald-400 text-xs block">
                                    KES {s.revenueKes.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {s.tripsCompleted} trips
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Shift Status */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {s.status === 'Completed' && (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Completed</span>
                                </span>
                              )}
                              {s.status === 'In Progress' && (
                                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                                  <span>On Shift</span>
                                </span>
                              )}
                              {s.status === 'Rest Day' && (
                                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <Coffee className="w-3 h-3 text-slate-500" />
                                  <span>Rest Day</span>
                                </span>
                              )}
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

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            GreenShift Operations ID: <span className="font-mono text-slate-300">{driver.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenMpesaModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMpesaModal(driver);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer"
                title={`Quick Pay KES ${driver.outstandingBalanceKes.toLocaleString()} to ${driver.fullName}`}
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>Quick Pay (KES {driver.outstandingBalanceKes.toLocaleString()})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition"
            >
              Close Profile
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
