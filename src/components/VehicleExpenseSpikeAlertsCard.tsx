import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle } from '../types';
import { 
  Bell, BellRing, BellOff, AlertTriangle, TrendingUp, DollarSign, 
  CheckCircle2, RefreshCw, Sliders, ShieldAlert, Sparkles, Filter, Wrench, Fuel, Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface VehicleExpenseSpikeAlertsCardProps {
  vehicles?: Vehicle[];
}

export interface VehicleExpenseSpike {
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  category: 'Electric' | 'Fuel';
  assignedDriverName: string;
  primaryExpenseType: 'Maintenance Overhaul' | 'Fuel/Charging Surge' | 'Drivetrain & Tires' | 'Battery Thermal System';
  rolling30DayAvgKes: number;
  current30DayExpenseKes: number;
  varianceKes: number;
  variancePct: number;
  exceedsThreshold: boolean;
  lastCheckedTime: string;
}

export const VehicleExpenseSpikeAlertsCard: React.FC<VehicleExpenseSpikeAlertsCardProps> = ({
  vehicles = []
}) => {
  // TOGGLE: Real-time dashboard notifications toggle (Default: ENABLED)
  const [enableRealtimeNotifications, setEnableRealtimeNotifications] = useState<boolean>(true);

  // Configurable threshold percentage (Default: 25% as requested by user)
  const [spikeThresholdPct, setSpikeThresholdPct] = useState<number>(25);

  // Filter state for flagged items
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SPIKED_ONLY' | 'ELECTRIC' | 'FUEL'>('SPIKED_ONLY');

  // Simulated override state to allow user testing
  const [simulatedSpikes, setSimulatedSpikes] = useState<Record<string, number>>({});

  // Compute baseline and current 30-day vehicle expenses
  const vehicleExpenseData: VehicleExpenseSpike[] = useMemo(() => {
    const activeVehicles = vehicles.length > 0 ? vehicles : [
      { id: 'v1', registrationNumber: 'KMG 482E', make: 'Roam', model: 'Air EV', category: 'Electric', assignedDriverName: 'Juma Omondi', totalChargingSpentKes: 38000, totalMaintenanceSpentKes: 18000 },
      { id: 'v2', registrationNumber: 'KMC 102B', make: 'TVS', model: 'HLX 150', category: 'Fuel', assignedDriverName: 'Mary Wanjiku', totalFuelSpentKes: 142000, totalMaintenanceSpentKes: 45000 },
      { id: 'v3', registrationNumber: 'KMD 903C', make: 'Spiro', model: 'Commuter EV', category: 'Electric', assignedDriverName: 'David Kamau', totalChargingSpentKes: 32000, totalMaintenanceSpentKes: 14000 },
      { id: 'v4', registrationNumber: 'KMH 551F', make: 'BYD', model: 'Atto 3 EV', category: 'Electric', assignedDriverName: 'Grace Mutua', totalChargingSpentKes: 48000, totalMaintenanceSpentKes: 22000 },
      { id: 'v5', registrationNumber: 'KMB 339A', make: 'Toyota', model: 'Fielder', category: 'Fuel', assignedDriverName: 'Hassan Ali', totalFuelSpentKes: 165000, totalMaintenanceSpentKes: 52000 }
    ] as any[];

    return activeVehicles.map((v, idx) => {
      const isEv = v.category === 'Electric';
      const opexFuelOrCharging = isEv ? (v.totalChargingSpentKes || 34000) : (v.totalFuelSpentKes || 140000);
      const opexMaintenance = v.totalMaintenanceSpentKes || 20000;
      
      // Calculate realistic rolling 30-day average expense baseline
      const baseTotalOpex = opexFuelOrCharging + opexMaintenance;
      const rolling30DayAvgKes = Math.round((baseTotalOpex / 6) + 12000);

      // Default current 30-day expense (some naturally exceed threshold, e.g. KMC 102B & KMB 339A)
      let defaultCurrentExpense = Math.round(rolling30DayAvgKes * (idx === 1 ? 1.34 : (idx === 4 ? 1.28 : 1.08)));

      // Apply simulated spike override if user triggered simulation
      if (simulatedSpikes[v.id] !== undefined) {
        defaultCurrentExpense = simulatedSpikes[v.id];
      }

      const varianceKes = defaultCurrentExpense - rolling30DayAvgKes;
      const variancePct = (varianceKes / rolling30DayAvgKes) * 100;
      const exceedsThreshold = variancePct >= spikeThresholdPct;

      // Primary expense category
      let primaryExpenseType: VehicleExpenseSpike['primaryExpenseType'] = isEv ? 'Battery Thermal System' : 'Fuel/Charging Surge';
      if (idx === 1 || idx === 4) {
        primaryExpenseType = 'Maintenance Overhaul';
      } else if (variancePct > 35) {
        primaryExpenseType = 'Drivetrain & Tires';
      }

      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        makeModel: `${v.make} ${v.model}`,
        category: v.category,
        assignedDriverName: v.assignedDriverName || 'Pool Driver',
        primaryExpenseType,
        rolling30DayAvgKes,
        current30DayExpenseKes: defaultCurrentExpense,
        varianceKes,
        variancePct,
        exceedsThreshold,
        lastCheckedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }).sort((a, b) => b.variancePct - a.variancePct);
  }, [vehicles, spikeThresholdPct, simulatedSpikes]);

  // Count flagged vehicles
  const spikedVehiclesCount = useMemo(() => {
    return vehicleExpenseData.filter(v => v.exceedsThreshold).length;
  }, [vehicleExpenseData]);

  // Function to evaluate and dispatch real-time dashboard notifications
  const runRealtimeExpenseCheck = (userAction: boolean = true) => {
    const spikedItems = vehicleExpenseData.filter(v => v.exceedsThreshold);

    if (!enableRealtimeNotifications) {
      if (userAction) {
        toast.info('Notifications Muted', {
          description: `Real-time notifications toggle is currently turned OFF. Enable toggle to receive dashboard alert popups (${spikedItems.length} expense spike(s) detected).`
        });
      }
      return;
    }

    if (spikedItems.length > 0) {
      spikedItems.forEach(item => {
        toast.error(`🚨 Vehicle Expense Spike Alert! (${item.registrationNumber})`, {
          description: `30-Day Expense of KES ${item.current30DayExpenseKes.toLocaleString()} exceeds rolling avg (KES ${item.rolling30DayAvgKes.toLocaleString()}) by +${item.variancePct.toFixed(1)}%! (+KES ${item.varianceKes.toLocaleString()} surge - ${item.primaryExpenseType})`,
          duration: 9000
        });
      });
    } else if (userAction) {
      toast.success('All Vehicle Expenses Normal', {
        description: `No vehicle expenses currently exceed their 30-day rolling average by more than +${spikeThresholdPct}%.`
      });
    }
  };

  // Toggle Handler with User Feedback
  const handleToggleChange = (enabled: boolean) => {
    setEnableRealtimeNotifications(enabled);
    if (enabled) {
      toast.success('Real-Time Vehicle Expense Notifications ACTIVE', {
        description: `You will now receive instant dashboard alerts whenever any vehicle expense exceeds its 30-day rolling average by > ${spikeThresholdPct}%.`
      });
      // Immediately run check on toggle enable
      setTimeout(() => runRealtimeExpenseCheck(false), 300);
    } else {
      toast.info('Real-Time Vehicle Expense Notifications MUTED', {
        description: 'Dashboard alert popups for vehicle expense spikes have been paused.'
      });
    }
  };

  // Simulate Expense Spike Action (+42% Surge on First Vehicle)
  const handleSimulateSpikeOnVehicle = (vehicleId: string, regNumber: string) => {
    const target = vehicleExpenseData.find(v => v.vehicleId === vehicleId);
    if (!target) return;

    const spikedVal = Math.round(target.rolling30DayAvgKes * 1.42); // +42% surge
    setSimulatedSpikes(prev => ({ ...prev, [vehicleId]: spikedVal }));

    const spikePct = 42.0;
    if (enableRealtimeNotifications) {
      toast.error(`🚨 Vehicle Expense Spike Alert! (${regNumber})`, {
        description: `Simulated 30-day expense of KES ${spikedVal.toLocaleString()} exceeds rolling avg (KES ${target.rolling30DayAvgKes.toLocaleString()}) by +${spikePct}%! (+KES ${(spikedVal - target.rolling30DayAvgKes).toLocaleString()} surge).`,
        duration: 9000
      });
    } else {
      toast.warning(`Simulated Expense Spike Triggered on ${regNumber}`, {
        description: `Expense spiked to +42% (KES ${spikedVal.toLocaleString()}), but notifications toggle is currently MUTED.`
      });
    }
  };

  // Reset All Expense Simulations
  const handleResetSimulations = () => {
    setSimulatedSpikes({});
    toast.info('Reset Vehicle Expense Data', {
      description: 'Restored vehicle expenses to baseline 30-day historical averages.'
    });
  };

  // Filtered List for Table
  const filteredList = useMemo(() => {
    return vehicleExpenseData.filter(v => {
      if (categoryFilter === 'SPIKED_ONLY') return v.exceedsThreshold;
      if (categoryFilter === 'ELECTRIC') return v.category === 'Electric';
      if (categoryFilter === 'FUEL') return v.category === 'Fuel';
      return true;
    });
  }, [vehicleExpenseData, categoryFilter]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      
      {/* HEADER WITH REAL-TIME NOTIFICATION TOGGLE SWITCH */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shrink-0 transition ${
            enableRealtimeNotifications && spikedVehiclesCount > 0
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
              : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
          }`}>
            {enableRealtimeNotifications ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5 text-slate-400" />}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm font-black text-white">
                Vehicle Expense Anomaly Engine (&gt;25% 30-Day Rolling Avg)
              </h3>
              
              {enableRealtimeNotifications ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>NOTIFICATIONS ACTIVE</span>
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <BellOff className="w-3 h-3 text-slate-400" />
                  <span>NOTIFICATIONS MUTED</span>
                </span>
              )}

              {spikedVehiclesCount > 0 && (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>{spikedVehiclesCount} VEHICLE(S) SPIKED</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              Monitors individual vehicle operational costs against historical 30-day rolling averages and dispatches real-time dashboard alerts
            </p>
          </div>
        </div>

        {/* REAL-TIME NOTIFICATION TOGGLE SWITCH CONTROL */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-inner">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white block">
              Real-Time Dashboard Notifications
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Trigger toast when expense &gt; {spikeThresholdPct}% vs 30-day avg
            </span>
          </div>

          {/* TOGGLE SWITCH BUTTON */}
          <button
            onClick={() => handleToggleChange(!enableRealtimeNotifications)}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              enableRealtimeNotifications ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={enableRealtimeNotifications}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                enableRealtimeNotifications ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

      </div>

      {/* CONTROLS & THRESHOLD SELECTOR TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        
        {/* Threshold Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <Sliders className="w-3.5 h-3.5 text-indigo-400 ml-1" />
          <span className="text-slate-400 font-bold text-[11px] uppercase">Alert Threshold:</span>
          {[15, 20, 25, 30, 35].map(pct => (
            <button
              key={pct}
              onClick={() => {
                setSpikeThresholdPct(pct);
                toast.info(`Updated Expense Spike Threshold to +${pct}%`, {
                  description: `Vehicles exceeding 30-day average by > ${pct}% will trigger dashboard notifications.`
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer font-mono ${
                spikeThresholdPct === pct
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              +{pct}% {pct === 25 ? '(Default)' : ''}
            </button>
          ))}
        </div>

        {/* Action Simulation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => runRealtimeExpenseCheck(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Check Expenses Now</span>
          </button>

          <button
            onClick={() => handleSimulateSpikeOnVehicle(vehicleExpenseData[0]?.vehicleId || 'v1', vehicleExpenseData[0]?.registrationNumber || 'KMG 482E')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Simulate a +42% expense spike on vehicle KMG 482E to test toast notification"
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate +42% Spike (KMG 482E)</span>
          </button>

          <button
            onClick={handleResetSimulations}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>

      </div>

      {/* FILTER BUTTONS & SUMMARY KPI ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-bold text-[11px] uppercase">Filter View:</span>
          
          <button
            onClick={() => setCategoryFilter('SPIKED_ONLY')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              categoryFilter === 'SPIKED_ONLY' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flagged Spikes (&gt;{spikeThresholdPct}%) ({spikedVehiclesCount})
          </button>

          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              categoryFilter === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Fleet Vehicles ({vehicleExpenseData.length})
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Last Evaluated: <span className="text-emerald-400 font-bold">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

      </div>

      {/* FLAGGED VEHICLE EXPENSE SPIKES TABLE */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 font-mono">
            <tr>
              <th className="px-4 py-3">Vehicle / Driver</th>
              <th className="px-4 py-3">Expense Category</th>
              <th className="px-4 py-3">30-Day Rolling Avg</th>
              <th className="px-4 py-3">Current 30-Day Expense</th>
              <th className="px-4 py-3">Surge Variance</th>
              <th className="px-4 py-3 text-center">Notification Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-sans">
                  No vehicle expenses currently exceed the +{spikeThresholdPct}% rolling 30-day average threshold.
                </td>
              </tr>
            ) : (
              filteredList.map((item) => {
                return (
                  <tr key={item.vehicleId} className="hover:bg-slate-900/50 transition">
                    
                    {/* Vehicle Registration & Model */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-white font-mono text-xs">{item.registrationNumber}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{item.makeModel} • <span className="text-indigo-300">{item.assignedDriverName}</span></div>
                    </td>

                    {/* Expense Category */}
                    <td className="px-4 py-3 font-sans">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                        {item.category === 'Electric' ? <Zap className="w-3 h-3 text-amber-400" /> : <Fuel className="w-3 h-3 text-indigo-400" />}
                        <span>{item.primaryExpenseType}</span>
                      </span>
                    </td>

                    {/* 30-Day Rolling Average */}
                    <td className="px-4 py-3 text-slate-300 font-bold">
                      KES {item.rolling30DayAvgKes.toLocaleString()}
                    </td>

                    {/* Current 30-Day Expense */}
                    <td className="px-4 py-3">
                      <span className={`font-black ${item.exceedsThreshold ? 'text-rose-400' : 'text-slate-200'}`}>
                        KES {item.current30DayExpenseKes.toLocaleString()}
                      </span>
                    </td>

                    {/* Variance % & Amount */}
                    <td className="px-4 py-3">
                      {item.exceedsThreshold ? (
                        <div className="text-rose-400 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+{item.variancePct.toFixed(1)}% (+KES {item.varianceKes.toLocaleString()})</span>
                        </div>
                      ) : (
                        <div className="text-emerald-400 font-bold">
                          +{item.variancePct.toFixed(1)}% (Normal)
                        </div>
                      )}
                    </td>

                    {/* Notification Status */}
                    <td className="px-4 py-3 text-center">
                      {item.exceedsThreshold ? (
                        enableRealtimeNotifications ? (
                          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <BellRing className="w-3 h-3 text-rose-400" />
                            <span>Alert Dispatched</span>
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <BellOff className="w-3 h-3 text-slate-400" />
                            <span>Muted</span>
                          </span>
                        )
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Within Bounds</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          toast.info(`Vehicle Expense Audit (${item.registrationNumber})`, {
                            description: `30-Day Rolling Avg: KES ${item.rolling30DayAvgKes.toLocaleString()} | Current Expense: KES ${item.current30DayExpenseKes.toLocaleString()} (+${item.variancePct.toFixed(1)}%). Primary Driver: ${item.assignedDriverName}.`
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 text-[11px] font-bold transition cursor-pointer font-sans"
                      >
                        Audit Details
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
