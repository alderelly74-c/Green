import React, { useMemo } from 'react';
import { BatterySwapRecord } from '../types';
import { 
  Clock, AlertTriangle, ShieldCheck, Filter, ArrowRight,
  ShieldAlert, CheckCircle2, ChevronRight, Zap, RefreshCw
} from 'lucide-react';

interface StationSwapDelayCardProps {
  swaps: BatterySwapRecord[];
  slaTargetMinutes?: number; // default 10 mins
  onSelectStationFilter?: (stationName: string) => void;
  onOpenInvestigationModal?: (swap: BatterySwapRecord) => void;
}

export interface StationBottleneckStats {
  stationName: string;
  stationLocation: string;
  totalSwaps: number;
  avgDurationMinutes: number;
  avgDelayMinutes: number; // mins over SLA
  delayedCount: number;
  delayPercent: number;
  maxDurationMinutes: number;
  bottleneckLevel: 'CRITICAL' | 'MODERATE' | 'OPTIMAL';
  primaryCause: string;
  sampleDelayedSwap?: BatterySwapRecord;
}

export const StationSwapDelayCard: React.FC<StationSwapDelayCardProps> = ({
  swaps = [],
  slaTargetMinutes = 10,
  onSelectStationFilter,
  onOpenInvestigationModal
}) => {
  // Compute per-station bottleneck statistics
  const stationStats = useMemo<StationBottleneckStats[]>(() => {
    if (!swaps || swaps.length === 0) return [];

    // Group swaps by station name
    const grouped = new Map<string, BatterySwapRecord[]>();
    swaps.forEach(s => {
      const key = s.stationName || 'Unassigned Station';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(s);
    });

    const result: StationBottleneckStats[] = [];

    grouped.forEach((stationSwaps, stationName) => {
      const totalSwaps = stationSwaps.length;
      const totalDuration = stationSwaps.reduce((acc, s) => acc + s.swapDurationMinutes, 0);
      const avgDurationMinutes = Math.round((totalDuration / totalSwaps) * 10) / 10;

      // Delayed swaps (exceeding SLA)
      const delayedSwaps = stationSwaps.filter(s => s.swapDurationMinutes > slaTargetMinutes);
      const delayedCount = delayedSwaps.length;
      const delayPercent = Math.round((delayedCount / totalSwaps) * 100);

      // Average delay for delayed swaps, or average excess over SLA
      const totalDelayOverSla = stationSwaps.reduce((acc, s) => {
        return acc + Math.max(0, s.swapDurationMinutes - slaTargetMinutes);
      }, 0);
      const avgDelayMinutes = Math.round((totalDelayOverSla / totalSwaps) * 10) / 10;

      const maxDurationMinutes = Math.max(...stationSwaps.map(s => s.swapDurationMinutes));
      const sampleDelayedSwap = delayedSwaps.sort((a, b) => b.swapDurationMinutes - a.swapDurationMinutes)[0];

      // Primary cause inference
      let primaryCause = 'Normal station operations';
      if (delayedSwaps.some(s => s.delayReason)) {
        const reasons = delayedSwaps.map(s => s.delayReason).filter(Boolean);
        primaryCause = reasons[0] || 'Hardware ejection delay';
      } else if (avgDurationMinutes > 10) {
        primaryCause = 'High queue congestion & manual payment validation';
      } else if (avgDurationMinutes > 7) {
        primaryCause = 'Peak hour shift changeover & manual battery logging';
      }

      // Determine bottleneck level
      let bottleneckLevel: 'CRITICAL' | 'MODERATE' | 'OPTIMAL' = 'OPTIMAL';
      if (avgDurationMinutes > slaTargetMinutes || delayPercent >= 25) {
        bottleneckLevel = 'CRITICAL';
      } else if (avgDurationMinutes > 7 || delayPercent >= 10) {
        bottleneckLevel = 'MODERATE';
      }

      const location = stationSwaps[0]?.stationLocation || 'Nairobi Metro';

      result.push({
        stationName,
        stationLocation: location,
        totalSwaps,
        avgDurationMinutes,
        avgDelayMinutes,
        delayedCount,
        delayPercent,
        maxDurationMinutes,
        bottleneckLevel,
        primaryCause,
        sampleDelayedSwap
      });
    });

    // Sort by worst bottleneck first (highest avg duration & delay)
    return result.sort((a, b) => b.avgDurationMinutes - a.avgDurationMinutes);
  }, [swaps, slaTargetMinutes]);

  // Overall Fleet-wide metrics
  const totalSwapsCount = swaps.length;
  const overallAvgDuration = totalSwapsCount > 0
    ? (swaps.reduce((acc, s) => acc + s.swapDurationMinutes, 0) / totalSwapsCount).toFixed(1)
    : '0.0';
  const totalDelayedSwaps = swaps.filter(s => s.swapDurationMinutes > slaTargetMinutes).length;
  const overallSlaCompliance = totalSwapsCount > 0
    ? Math.round(((totalSwapsCount - totalDelayedSwaps) / totalSwapsCount) * 100)
    : 100;

  const worstStation = stationStats.length > 0 ? stationStats[0] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Station Swap Delay & Operational Bottlenecks
              </h3>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                SLA Target: {slaTargetMinutes}m
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates average swap delays per station to isolate hardware ejection failures, peak-hour queues, and staff bottlenecks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Active Stations: <strong className="text-white">{stationStats.length}</strong>
          </span>
        </div>
      </div>

      {/* Fleet-Wide Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Fleet Avg Swap Time */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Fleet Avg Swap Time</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{overallAvgDuration} min</span>
            <span className={`text-[11px] font-bold ${Number(overallAvgDuration) <= slaTargetMinutes ? 'text-emerald-400' : 'text-rose-400'}`}>
              vs {slaTargetMinutes}m target
            </span>
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            Across {totalSwapsCount} total logged swap sessions
          </p>
        </div>

        {/* KPI 2: Worst Bottleneck Station */}
        <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Primary Bottleneck Hub
          </span>
          <div className="text-sm font-black text-white truncate">
            {worstStation ? worstStation.stationName : 'None'}
          </div>
          <p className="text-[11px] text-rose-300 font-mono font-bold">
            {worstStation ? `${worstStation.avgDurationMinutes} min avg duration (+${worstStation.avgDelayMinutes}m SLA delay)` : 'All stations on target'}
          </p>
        </div>

        {/* KPI 3: Total Delayed Swaps */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">SLA Exceeded Swaps (&gt;10m)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{totalDelayedSwaps}</span>
            <span className="text-[11px] font-bold text-slate-400">
              ({totalSwapsCount > 0 ? Math.round((totalDelayedSwaps / totalSwapsCount) * 100) : 0}% of fleet)
            </span>
          </div>
          <p className="text-[10px] text-amber-300/80 truncate">
            Requires hub manager investigation
          </p>
        </div>

        {/* KPI 4: SLA Compliance */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Hub SLA Compliance Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{overallSlaCompliance}%</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            Swaps completed within &lt;10 mins
          </p>
        </div>
      </div>

      {/* Station Bottlenecks Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Station Performance & Delay Breakdown</span>
          <span className="text-[10px] text-slate-500 font-normal">Sorted by longest average swap time</span>
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {stationStats.map((st) => {
            const isCritical = st.bottleneckLevel === 'CRITICAL';
            const isModerate = st.bottleneckLevel === 'MODERATE';
            
            // Progress width (clamped up to 100% for 20 mins max)
            const progressPercent = Math.min(100, Math.round((st.avgDurationMinutes / 15) * 100));

            return (
              <div 
                key={st.stationName}
                className={`bg-slate-950/90 border rounded-xl p-4 transition-all hover:border-slate-700 space-y-3 ${
                  isCritical 
                    ? 'border-rose-500/50 shadow-md shadow-rose-950/20' 
                    : isModerate
                    ? 'border-amber-500/40'
                    : 'border-slate-800'
                }`}
              >
                {/* Station Row Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-black text-white">{st.stationName}</h5>
                      
                      {/* Bottleneck Badge */}
                      {isCritical ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>CRITICAL BOTTLENECK</span>
                        </span>
                      ) : isModerate ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>MODERATE DELAY</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>OPTIMAL SLA</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{st.stationLocation}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {onSelectStationFilter && (
                      <button
                        onClick={() => onSelectStationFilter(st.stationName)}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Filter className="w-3 h-3 text-cyan-400" />
                        <span>Filter Swaps</span>
                      </button>
                    )}

                    {st.sampleDelayedSwap && onOpenInvestigationModal && (
                      <button
                        onClick={() => onOpenInvestigationModal(st.sampleDelayedSwap!)}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Investigate ({st.sampleDelayedSwap.swapCode})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Avg Swap Time</span>
                    <span className={`text-base font-black font-mono ${st.avgDurationMinutes > slaTargetMinutes ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {st.avgDurationMinutes} mins
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Avg Delay vs Target</span>
                    <span className={`text-base font-black font-mono ${st.avgDelayMinutes > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {st.avgDelayMinutes > 0 ? `+${st.avgDelayMinutes} mins` : 'On Target (0m)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Delayed Swaps</span>
                    <span className="text-base font-black text-white font-mono">
                      {st.delayedCount} <span className="text-xs text-slate-400 font-normal">({st.delayPercent}%)</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Max Recorded Swap</span>
                    <span className="text-base font-black text-rose-300 font-mono">
                      {st.maxDurationMinutes} mins
                    </span>
                  </div>
                </div>

                {/* SLA Benchmark Progress Visual Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>SLA Visual Gauge (10m Benchmark)</span>
                    <span className="font-mono text-slate-300">
                      {st.avgDurationMinutes}m / 10m Target
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 relative">
                    {/* SLA Marker Line at 66% (10m out of 15m scale) */}
                    <div className="absolute top-0 bottom-0 left-[66%] w-0.5 bg-cyan-400 z-10" title="10-minute SLA Target Limit" />
                    
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isCritical ? 'bg-rose-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Delay Root Cause Callout */}
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="text-slate-400">Primary Bottleneck Cause:</span>
                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                    {st.primaryCause}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
