import React, { useState, useMemo } from 'react';
import { Driver, MpesaPayoutRequest } from '../types';
import { 
  Wallet, Calendar, TrendingUp, AlertTriangle, CheckCircle2, 
  Send, Download, Zap, Trophy, ShieldCheck, Users, 
  DollarSign, ArrowUpRight, Clock, RefreshCw, ChevronRight,
  Info, Sparkles, Building2, Smartphone
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid, Cell, ReferenceLine 
} from 'recharts';
import { toast } from 'sonner';

interface DriverPayoutForecastWidgetProps {
  drivers?: Driver[];
  mpesaPayouts?: MpesaPayoutRequest[];
  onSendMpesaPayout?: (driverId: string, amountKes: number, reason: string) => void;
}

export interface DayForecastPoint {
  dayIndex: number;
  dateStr: string;
  dayName: string;
  isWeekend: boolean;
  basePayoutsKes: number;
  tierBonusPayoutsKes: number;
  estimatedB2cFeesKes: number;
  totalRequiredKes: number;
  payoutCount: number;
  tier1QualifiersCount: number;
  tier2QualifiersCount: number;
  tier3QualifiersCount: number;
}

export interface PredictedDriverPayout {
  driverId: string;
  driverName: string;
  phone: string;
  tierName: 'Tier 1 (Starter)' | 'Tier 2 (Pro)' | 'Tier 3 (Champion)' | 'Standard';
  safetyScorePercent: number;
  completedTrips: number;
  dailyProjectedFareKes: number;
  predictedBonusKes: number;
  estimatedB2cFeeKes: number;
  totalMpesaAmountKes: number;
  payoutDayName: string;
  payoutDateStr: string;
  mpesaStatus: 'Scheduled' | 'Float Allocated' | 'Disbursed';
}

export const DriverPayoutForecastWidget: React.FC<DriverPayoutForecastWidgetProps> = ({
  drivers = [],
  mpesaPayouts = [],
  onSendMpesaPayout
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0); // 0 = Day 1 (Today), 6 = Day 7
  const [currentMpesaFloatKes, setCurrentMpesaFloatKes] = useState<number>(2500000); // 2.5M KES M-Pesa float balance
  const [weekendSurgeMultiplier, setWeekendSurgeMultiplier] = useState<number>(1.2); // +20% trip surge on Fri/Sat/Sun

  // Generate 7-Day Forecast Data based on Driver Performance Tiers
  const forecastResults = useMemo(() => {
    const today = new Date('2026-08-12'); // Current mock date: Aug 12, 2026
    const days: DayForecastPoint[] = [];
    const allPredictedDriverPayouts: PredictedDriverPayout[] = [];

    const activeDrivers = drivers.length > 0 ? drivers : [
      { id: 'd1', fullName: 'Juma Omondi', phone: '+254 722 104 889', completedTrips: 125, safetyScorePercent: 98, totalEarningsKes: 120000 },
      { id: 'd2', fullName: 'Mary Wanjiku', phone: '+254 733 902 114', completedTrips: 88, safetyScorePercent: 95, totalEarningsKes: 95000 },
      { id: 'd3', fullName: 'David Kamau', phone: '+254 710 448 901', completedTrips: 142, safetyScorePercent: 92, totalEarningsKes: 140000 },
      { id: 'd4', fullName: 'Hassan Ali', phone: '+254 721 556 702', completedTrips: 52, safetyScorePercent: 88, totalEarningsKes: 52000 },
      { id: 'd5', fullName: 'Grace Mutua', phone: '+254 705 112 334', completedTrips: 110, safetyScorePercent: 96, totalEarningsKes: 115000 }
    ] as any[];

    // 7 Days Loop
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6; // Fri, Sat, Sun
      const dayMultiplier = isWeekend ? weekendSurgeMultiplier : 1.0;

      let basePayoutsKes = 0;
      let tierBonusPayoutsKes = 0;
      let totalB2cFees = 0;
      let payoutCount = 0;

      let t1Count = 0;
      let t2Count = 0;
      let t3Count = 0;

      // Calculate predicted payouts per driver for this day
      activeDrivers.forEach((driver, idx) => {
        // Hash / deterministic assignment of driver payouts across the week
        const driverHash = (driver.fullName.charCodeAt(0) + idx + i) % 7;
        
        // Check if driver receives payout on this day
        if (driverHash === i || (isWeekend && (idx % 2 === 0))) {
          payoutCount++;
          
          const trips = driver.completedTrips || 60;
          const avgDailyFare = Math.round((trips * 850 / 7) * dayMultiplier);

          // Tier Determination
          let tierName: PredictedDriverPayout['tierName'] = 'Standard';
          let bonusKes = 0;

          if (trips >= 140) {
            tierName = 'Tier 3 (Champion)';
            bonusKes = 12000;
            t3Count++;
          } else if (trips >= 90) {
            tierName = 'Tier 2 (Pro)';
            bonusKes = 6000;
            t2Count++;
          } else if (trips >= 45) {
            tierName = 'Tier 1 (Starter)';
            bonusKes = 2500;
            t1Count++;
          }

          // Safaricom B2C Fee (approx 35 KES per payout above KES 5000)
          const b2cFee = 35;

          const totalPayout = avgDailyFare + bonusKes;

          basePayoutsKes += avgDailyFare;
          tierBonusPayoutsKes += bonusKes;
          totalB2cFees += b2cFee;

          allPredictedDriverPayouts.push({
            driverId: driver.id,
            driverName: driver.fullName,
            phone: driver.phone,
            tierName,
            safetyScorePercent: driver.safetyScorePercent || 92,
            completedTrips: trips,
            dailyProjectedFareKes: avgDailyFare,
            predictedBonusKes: bonusKes,
            estimatedB2cFeeKes: b2cFee,
            totalMpesaAmountKes: totalPayout,
            payoutDayName: dayName,
            payoutDateStr: dateStr,
            mpesaStatus: i === 0 ? 'Float Allocated' : 'Scheduled'
          });
        }
      });

      const totalRequiredKes = basePayoutsKes + tierBonusPayoutsKes + totalB2cFees;

      days.push({
        dayIndex: i,
        dateStr,
        dayName,
        isWeekend,
        basePayoutsKes,
        tierBonusPayoutsKes,
        estimatedB2cFeesKes: totalB2cFees,
        totalRequiredKes,
        payoutCount,
        tier1QualifiersCount: t1Count,
        tier2QualifiersCount: t2Count,
        tier3QualifiersCount: t3Count
      });
    }

    const total7DayRequiredKes = days.reduce((sum, d) => sum + d.totalRequiredKes, 0);
    const total7DayBonusesKes = days.reduce((sum, d) => sum + d.tierBonusPayoutsKes, 0);
    const total7DayB2cFeesKes = days.reduce((sum, d) => sum + d.estimatedB2cFeesKes, 0);
    const totalDisbursementsCount = days.reduce((sum, d) => sum + d.payoutCount, 0);

    const floatBufferDeficitKes = total7DayRequiredKes - currentMpesaFloatKes;
    const isFloatSufficient = currentMpesaFloatKes >= total7DayRequiredKes;

    return {
      days,
      allPredictedDriverPayouts,
      total7DayRequiredKes,
      total7DayBonusesKes,
      total7DayB2cFeesKes,
      totalDisbursementsCount,
      floatBufferDeficitKes,
      isFloatSufficient
    };
  }, [drivers, currentMpesaFloatKes, weekendSurgeMultiplier]);

  // Filtered driver list for selected day
  const selectedDayPoint = forecastResults.days[selectedDayIndex] || forecastResults.days[0];
  const selectedDayDrivers = useMemo(() => {
    return forecastResults.allPredictedDriverPayouts.filter(
      p => p.payoutDateStr === selectedDayPoint.dateStr
    );
  }, [forecastResults.allPredictedDriverPayouts, selectedDayPoint]);

  // Handle Bulk Disburse Simulation
  const handleBulkDisburseMock = () => {
    toast.success(`M-Pesa B2C Batch Disburse Triggered`, {
      description: `Disbursing KES ${selectedDayPoint.totalRequiredKes.toLocaleString()} to ${selectedDayDrivers.length} drivers for ${selectedDayPoint.dayName}.`
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Payout Date', 'Driver Name', 'Phone', 'Performance Tier', 'Completed Trips', 
      'Base Fare Payout (KES)', 'Tier Bonus (KES)', 'M-Pesa B2C Fee (KES)', 'Total M-Pesa Disburse (KES)', 'Status'
    ];

    const rows = forecastResults.allPredictedDriverPayouts.map(p => [
      p.payoutDateStr,
      `"${p.driverName}"`,
      p.phone,
      `"${p.tierName}"`,
      p.completedTrips,
      p.dailyProjectedFareKes,
      p.predictedBonusKes,
      p.estimatedB2cFeeKes,
      p.totalMpesaAmountKes,
      p.mpesaStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `7Day_Driver_Payout_Mpesa_Forecast_2026.csv`;
    link.click();

    toast.success('7-Day M-Pesa Payout Forecast Exported');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      
      {/* HEADER & FLOAT HEALTH STATUS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                7-Day Driver M-Pesa Payout Forecast
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Tier Performance Predictive Engine</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Predicts outgoing M-Pesa B2C liquidity requirements based on driver trip completion tiers and daily payout velocity
            </p>
          </div>
        </div>

        {/* ACTION CONTROLS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Forecast CSV</span>
          </button>

          <button
            onClick={handleBulkDisburseMock}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Batch Disburse M-Pesa ({selectedDayPoint.dayName})</span>
          </button>
        </div>
      </div>

      {/* 7-DAY SUMMARY KPI BANNER & FLOAT HEALTH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total 7-Day Required Float */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>7-Day Required M-Pesa Float</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-white font-mono">
            KES {forecastResults.total7DayRequiredKes.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400">
            For {forecastResults.totalDisbursementsCount} scheduled driver disbursements
          </p>
        </div>

        {/* Current Available M-Pesa Float */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Current M-Pesa Float Balance</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-black text-indigo-300 font-mono">
            KES {currentMpesaFloatKes.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {forecastResults.isFloatSufficient ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sufficient 7-day float buffer
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Refill KES {Math.abs(forecastResults.floatBufferDeficitKes).toLocaleString()} recommended
              </span>
            )}
          </div>
        </div>

        {/* Tier Performance Bonuses Included */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>7-Day Tier Bonus Outlay</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-400 font-mono">
            KES {forecastResults.total7DayBonusesKes.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400">
            Performance tier rewards for Tiers 1-3
          </p>
        </div>

        {/* Est. B2C Safaricom Fees */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Estimated B2C Tariff Fees</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-black text-slate-300 font-mono">
            KES {forecastResults.total7DayB2cFeesKes.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400">
            ~35 KES per Safaricom B2C disbursement
          </p>
        </div>

      </div>

      {/* BAR CHART: DAILY OUTGOING M-PESA REQUIREMENTS */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Predicted Daily Outgoing M-Pesa Disburse (Next 7 Days)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">Weekend Surge Factor:</span>
            <select
              value={weekendSurgeMultiplier}
              onChange={(e) => setWeekendSurgeMultiplier(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white font-mono text-xs rounded px-2 py-1 focus:border-indigo-500"
            >
              <option value={1.0}>Standard (1.0x)</option>
              <option value={1.2}>Moderate Surge (+20%)</option>
              <option value={1.35}>Peak Surge (+35%)</option>
            </select>
          </div>
        </div>

        {/* RECHARTS BAR CHART */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecastResults.days} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="dayName" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="k" formatter={(v) => Math.round(Number(v) / 1000)} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                formatter={(val: any, name: any) => [`KES ${Number(val).toLocaleString()}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
              <Bar dataKey="basePayoutsKes" stackId="a" fill="#10b981" name="Base Driver Earnings (KES)" />
              <Bar dataKey="tierBonusPayoutsKes" stackId="a" fill="#f59e0b" name="Tier Bonus Outlay (KES)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 7-DAY PILL TABS SELECTOR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-800">
          {forecastResults.days.map((dPoint) => {
            const isSelected = selectedDayIndex === dPoint.dayIndex;
            return (
              <button
                key={dPoint.dayIndex}
                onClick={() => setSelectedDayIndex(dPoint.dayIndex)}
                className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50' 
                    : 'bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">{dPoint.dayName}</span>
                  {dPoint.isWeekend && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">Surge</span>
                  )}
                </div>
                <div className="font-mono font-black text-xs text-emerald-400 mt-1">
                  KES {Math.round(dPoint.totalRequiredKes / 1000)}k
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {dPoint.payoutCount} payouts
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED DAY DRIVER PAYOUT BREAKDOWN TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Scheduled M-Pesa Disburse Details: {selectedDayPoint.dayName} ({selectedDayPoint.dateStr})
            </h3>
          </div>
          <div className="text-[11px] font-mono font-bold text-slate-300">
            Total Day Requirement: <span className="text-emerald-400">KES {selectedDayPoint.totalRequiredKes.toLocaleString()}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Driver</th>
                <th className="px-3 py-2.5">M-Pesa Phone</th>
                <th className="px-3 py-2.5">Current Tier</th>
                <th className="px-3 py-2.5">Base Fare Payout</th>
                <th className="px-3 py-2.5">Tier Bonus</th>
                <th className="px-3 py-2.5">B2C Fee</th>
                <th className="px-3 py-2.5">Total Disburse</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono text-[11px]">
              {selectedDayDrivers.length > 0 ? (
                selectedDayDrivers.map((pd) => (
                  <tr key={pd.driverId} className="hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2 font-sans font-bold text-slate-100">
                      {pd.driverName}
                    </td>

                    <td className="px-3 py-2 text-slate-300">
                      {pd.phone}
                    </td>

                    <td className="px-3 py-2 font-sans text-[10px]">
                      {pd.tierName !== 'Standard' ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                          {pd.tierName}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold">Standard</span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-slate-300">
                      KES {pd.dailyProjectedFareKes.toLocaleString()}
                    </td>

                    <td className="px-3 py-2 text-amber-400 font-bold">
                      {pd.predictedBonusKes > 0 ? `+KES ${pd.predictedBonusKes.toLocaleString()}` : '-'}
                    </td>

                    <td className="px-3 py-2 text-slate-500">
                      KES {pd.estimatedB2cFeeKes}
                    </td>

                    <td className="px-3 py-2 font-extrabold text-emerald-400">
                      KES {pd.totalMpesaAmountKes.toLocaleString()}
                    </td>

                    <td className="px-3 py-2 font-sans text-[10px]">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{pd.mpesaStatus}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500 font-sans">
                    No scheduled disbursements for this date. Select another day from the 7-day calendar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
