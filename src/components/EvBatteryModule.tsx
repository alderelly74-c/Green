import React, { useState, useMemo } from 'react';
import { Vehicle, EvBatterySession, BatterySwapRecord, Driver } from '../types';
import { 
  Zap, BatteryCharging, Battery, ShieldAlert, 
  MapPin, DollarSign, TrendingUp, TrendingDown, RefreshCw, Plus, Download, FileText,
  Search, Filter, History, Repeat, ArrowRightLeft, ShieldCheck, Clock,
  User, Truck, CheckCircle2, AlertTriangle, X, Eye, Layers, ChevronRight, FileSpreadsheet,
  Activity, Thermometer, BarChart2, Wrench, Compass, Navigation, Gauge, Sparkles, Scale, Calculator
} from 'lucide-react';
import { BatteryDegradationChart } from './BatteryDegradationChart';
import { EvChargingTemporalHeatmap } from './EvChargingTemporalHeatmap';
import { EvEnergyEfficiencyD3Chart } from './EvEnergyEfficiencyD3Chart';
import { EvEfficiencyComparisonD3Chart } from './EvEfficiencyComparisonD3Chart';
import { BatteryHealthWatchlistWidget } from './BatteryHealthWatchlistWidget';
import { EvSohHistogramD3Chart } from './EvSohHistogramD3Chart';
import { StationSwapDelayCard } from './StationSwapDelayCard';
import { EvRangeRoutePlanner } from './EvRangeRoutePlanner';
import { EvMonthlyEnergySummaryPanel } from './EvMonthlyEnergySummaryPanel';
import { EvMonthlyEnergyTrendChart } from './EvMonthlyEnergyTrendChart';
import { EvChargingCostPerKmBarChart } from './EvChargingCostPerKmBarChart';
import { EvRoiCalculator } from './EvRoiCalculator';
import { EvCircularSocGauge, getSocColorConfig } from './EvCircularSocGauge';
import { calculatePredictiveRange, getVehicleHistoricalWhPerKm, getVehicleNominalCapacityKwh } from '../lib/batteryRangePredictor';
import { generateBatteryReportPdf } from '../utils/pdfGenerator';
import { toast } from 'sonner';

interface EvBatteryModuleProps {
  vehicles: Vehicle[];
  evSessions?: EvBatterySession[];
  swapRecords?: BatterySwapRecord[];
  drivers?: Driver[];
  onOpenEvModal: () => void;
  onRecordBatterySwap?: (record: BatterySwapRecord) => void;
  onOpenWorkOrder?: (vehicle: Vehicle) => void;
}

export const EvBatteryModule: React.FC<EvBatteryModuleProps> = ({
  vehicles = [],
  evSessions = [],
  swapRecords = [],
  drivers = [],
  onOpenEvModal = () => {},
  onRecordBatterySwap,
  onOpenWorkOrder
}) => {
  const evVehicles = vehicles.filter(v => v.category === 'Electric');

  // Sub-Navigation Tab State
  const [activeSubTab, setActiveSubTab] = useState<'telemetry' | 'energy_trends' | 'monthly_energy' | 'cost_per_km_benchmark' | 'roi_calculator' | 'range_planner' | 'watchlist' | 'soh_histogram' | 'heatmap' | 'efficiency_leakage' | 'efficiency_comparison' | 'swap_history'>('telemetry');
  const [selectedPlannerVehicleId, setSelectedPlannerVehicleId] = useState<string>('');

  // SLA Duration Benchmark (10 Minutes Target)
  const SWAP_SLA_LIMIT_MINS = 10;

  // Local Swap Records State (sync with prop)
  const [swaps, setSwaps] = useState<BatterySwapRecord[]>(swapRecords);

  // Sync state if prop updates
  React.useEffect(() => {
    if (swapRecords && swapRecords.length > 0) {
      setSwaps(swapRecords);
    }
  }, [swapRecords]);

  // Search & Filter State for Swap History Log
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [delayFilter, setDelayFilter] = useState<'ALL' | 'DELAYED_ONLY'>('ALL');

  // Battery Lifecycle Traceability Modal State
  const [selectedBatteryForTrace, setSelectedBatteryForTrace] = useState<string | null>(null);

  // Hub Manager Delay Investigation Modal State
  const [selectedSwapForInvestigation, setSelectedSwapForInvestigation] = useState<BatterySwapRecord | null>(null);
  const [investigationCategory, setInvestigationCategory] = useState<string>('Cabinet Lock Ejection Mechanical Failure');
  const [investigationResolution, setInvestigationResolution] = useState<string>('');

  // New Battery Swap Modal State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState<boolean>(false);
  const [formVehicleId, setFormVehicleId] = useState<string>('');
  const [formDriverName, setFormDriverName] = useState<string>('');
  const [formStationName, setFormStationName] = useState<string>('Roam Hub Kilimani');
  const [formStationLocation, setFormStationLocation] = useState<string>('Argwings Kodhek Rd, Nairobi');
  const [formRemovedBattId, setFormRemovedBattId] = useState<string>('');
  const [formRemovedSoC, setFormRemovedSoC] = useState<number>(15);
  const [formRemovedSoh, setFormRemovedSoh] = useState<number>(95);
  const [formInstalledBattId, setFormInstalledBattId] = useState<string>('');
  const [formInstalledSoC, setFormInstalledSoC] = useState<number>(100);
  const [formInstalledSoh, setFormInstalledSoh] = useState<number>(98);
  const [formDurationMins, setFormDurationMins] = useState<number>(2.5);
  const [formCostKes, setFormCostKes] = useState<number>(350);
  const [formOperatorName, setFormOperatorName] = useState<string>('Station Operator #01');
  const [formNotes, setFormNotes] = useState<string>('');

  // Automated Notification Trigger State for >2% Single-Month SOH Drop
  const [isRapidDropBannerDismissed, setIsRapidDropBannerDismissed] = useState<boolean>(false);
  const [autoWorkOrdersTriggered, setAutoWorkOrdersTriggered] = useState<boolean>(false);
  const [hasNotifiedRapidDrop, setHasNotifiedRapidDrop] = useState<boolean>(false);

  // EV Fleet SoC Gauge & Status Check Filter State
  const [evSocFilter, setEvSocFilter] = useState<'ALL' | 'CRITICAL_RED' | 'MODERATE_AMBER' | 'OPTIMAL_GREEN'>('ALL');
  const [evSearchQuery, setEvSearchQuery] = useState<string>('');
  const [evSortBy, setEvSortBy] = useState<'DEFAULT' | 'SOC_ASC' | 'SOC_DESC' | 'SOH_ASC' | 'RANGE_ASC' | 'RANGE_DESC'>('DEFAULT');
  const [evViewMode, setEvViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Rapid Degradation Flagged Assets List (>2.0% single month drop)
  const rapidDegradationVehicles = useMemo(() => {
    return [
      {
        id: 'v-seed-KDK 302A',
        reg: 'KDK 302A',
        makeModel: 'Opibus Electric Bus',
        type: 'Commercial Truck',
        batteryId: 'BATT-OPI-9901',
        driverName: 'Kipchoge Keino',
        currentSoh: 78.2,
        singleMonthDrop: 2.6,
        dropPeriod: 'Jul 2026 ➔ Aug 2026',
        cause: 'High DC Fast Charge Frequency & Cell #3 Voltage Imbalance (165mV)',
        status: 'CRITICAL - Maintenance Check Triggered'
      },
      {
        id: 'v-seed-KCR 411B',
        reg: 'KCR 411B',
        makeModel: 'BYD T3 Express',
        type: 'Van',
        batteryId: 'BATT-BYD-8820',
        driverName: 'Ochieng Eric',
        currentSoh: 81.5,
        singleMonthDrop: 2.3,
        dropPeriod: 'Jul 2026 ➔ Aug 2026',
        cause: 'Thermal Stress under Heavy Payloads & Rapid Cell Capacity Fading',
        status: 'WARNING - Proactive Inspection Flagged'
      },
      {
        id: 'v-seed-KCX 901D',
        reg: 'KCX 901D',
        makeModel: 'BYD T3 Cargo Van',
        type: 'Van',
        batteryId: 'BATT-BYD-4410',
        driverName: 'Samuel Eto',
        currentSoh: 85.2,
        singleMonthDrop: 2.1,
        dropPeriod: 'Jul 2026 ➔ Aug 2026',
        cause: 'Deep Discharge Cycle Stress (>90% DoD) & BMS Calibration Drift',
        status: 'WARNING - Proactive Inspection Flagged'
      }
    ];
  }, []);

  // Automated Toast Notification Trigger on Mount / Telemetry Evaluation
  React.useEffect(() => {
    if (!hasNotifiedRapidDrop && rapidDegradationVehicles.length > 0) {
      toast.error(
        `⚡ AUTOMATED TRIGGER ALERT: ${rapidDegradationVehicles.length} vehicles detected with >2.0% monthly SoH drop! Proactive maintenance checks created.`,
        {
          duration: 8000,
          action: {
            label: 'View Watchlist',
            onClick: () => setActiveSubTab('watchlist')
          }
        }
      );
      setHasNotifiedRapidDrop(true);
    }
  }, [hasNotifiedRapidDrop, rapidDegradationVehicles]);

  const totalChargingSpent = evSessions.reduce((acc, s) => acc + s.costKes, 0);
  const totalKwhConsumed = evSessions.reduce((acc, s) => acc + s.energyKwhConsumed, 0);

  // Delayed Swap Metrics
  const delayedSwaps = swaps.filter(s => s.swapDurationMinutes > SWAP_SLA_LIMIT_MINS);
  const delayedSwapsCount = delayedSwaps.length;
  const maxDelaySwap = delayedSwaps.length > 0
    ? [...delayedSwaps].sort((a, b) => b.swapDurationMinutes - a.swapDurationMinutes)[0]
    : null;

  // Filter swap history
  const filteredSwaps = swaps.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      s.swapCode.toLowerCase().includes(q) ||
      s.vehicleReg.toLowerCase().includes(q) ||
      s.driverName.toLowerCase().includes(q) ||
      s.removedBatteryId.toLowerCase().includes(q) ||
      s.installedBatteryId.toLowerCase().includes(q) ||
      s.stationName.toLowerCase().includes(q) ||
      (s.delayReason && s.delayReason.toLowerCase().includes(q));

    const matchesStation = stationFilter === 'ALL' || s.stationName === stationFilter;
    const matchesDelay = delayFilter === 'ALL' || (delayFilter === 'DELAYED_ONLY' && s.swapDurationMinutes > SWAP_SLA_LIMIT_MINS);

    return matchesSearch && matchesStation && matchesDelay;
  });

  // Collect unique stations
  const availableStations = Array.from(new Set(swaps.map(s => s.stationName)));

  // Collect all unique battery IDs from swaps & vehicles
  const allTrackedBatteryIds = Array.from(new Set([
    ...swaps.map(s => s.removedBatteryId),
    ...swaps.map(s => s.installedBatteryId),
    ...evVehicles.map(v => v.batteryId || '').filter(Boolean)
  ]));

  // EV SoC Distribution Counts
  const evSocStats = useMemo(() => {
    let redCount = 0;
    let amberCount = 0;
    let greenCount = 0;

    evVehicles.forEach(v => {
      const soc = v.currentSoCPercent || 0;
      if (soc < 20) redCount++;
      else if (soc <= 50) amberCount++;
      else greenCount++;
    });

    return {
      total: evVehicles.length,
      redCount,
      amberCount,
      greenCount
    };
  }, [evVehicles]);

  // Filtered and Sorted EV Fleet for Battery Health & SoC Status
  const filteredAndSortedEvVehicles = useMemo(() => {
    return evVehicles
      .filter(v => {
        const soc = v.currentSoCPercent || 0;
        if (evSocFilter === 'CRITICAL_RED' && soc >= 20) return false;
        if (evSocFilter === 'MODERATE_AMBER' && (soc < 20 || soc > 50)) return false;
        if (evSocFilter === 'OPTIMAL_GREEN' && soc <= 50) return false;

        if (evSearchQuery.trim()) {
          const q = evSearchQuery.toLowerCase();
          const matchReg = v.registrationNumber.toLowerCase().includes(q);
          const matchMake = v.make.toLowerCase().includes(q);
          const matchModel = (v.model || '').toLowerCase().includes(q);
          const matchBatt = (v.batteryId || '').toLowerCase().includes(q);
          const matchDriver = (v.assignedDriverName || '').toLowerCase().includes(q);
          if (!matchReg && !matchMake && !matchModel && !matchBatt && !matchDriver) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const socA = a.currentSoCPercent || 0;
        const socB = b.currentSoCPercent || 0;
        const sohA = a.batteryHealthPercent || 100;
        const sohB = b.batteryHealthPercent || 100;

        if (evSortBy === 'SOC_ASC') return socA - socB;
        if (evSortBy === 'SOC_DESC') return socB - socA;
        if (evSortBy === 'SOH_ASC') return sohA - sohB;
        if (evSortBy === 'RANGE_ASC') {
          const capA = getVehicleNominalCapacityKwh(a);
          const capB = getVehicleNominalCapacityKwh(b);
          return (capA * (socA / 100)) - (capB * (socB / 100));
        }
        if (evSortBy === 'RANGE_DESC') {
          const capA = getVehicleNominalCapacityKwh(a);
          const capB = getVehicleNominalCapacityKwh(b);
          return (capB * (socB / 100)) - (capA * (socA / 100));
        }
        return a.registrationNumber.localeCompare(b.registrationNumber);
      });
  }, [evVehicles, evSocFilter, evSearchQuery, evSortBy]);

  // Auto-fill vehicle registration and driver when vehicle selection changes in modal
  const handleVehicleSelect = (vId: string) => {
    setFormVehicleId(vId);
    const selectedVeh = vehicles.find(v => v.id === vId);
    if (selectedVeh) {
      if (selectedVeh.assignedDriverName) {
        setFormDriverName(selectedVeh.assignedDriverName);
      }
      if (selectedVeh.batteryId) {
        setFormRemovedBattId(selectedVeh.batteryId);
      }
    }
  };

  // Submit new swap record
  const handleSaveNewSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehicleId || !formInstalledBattId) {
      toast.error('Please select a vehicle and specify the installed battery ID.');
      return;
    }

    const durationMins = Number(formDurationMins);
    const isOverSla = durationMins > SWAP_SLA_LIMIT_MINS;

    const veh = vehicles.find(v => v.id === formVehicleId);
    const newRecord: BatterySwapRecord = {
      id: `swap-${Date.now()}`,
      swapCode: `SWAP-2025-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) + ' EAT',
      vehicleId: formVehicleId,
      vehicleReg: veh ? veh.registrationNumber : 'Unknown Reg',
      driverName: formDriverName || veh?.assignedDriverName || 'Unassigned Driver',
      stationName: formStationName,
      stationLocation: formStationLocation,
      removedBatteryId: formRemovedBattId || `BATT-OLD-${Math.floor(1000 + Math.random() * 9000)}`,
      removedBatterySoC: Number(formRemovedSoC),
      removedBatterySoh: Number(formRemovedSoh),
      installedBatteryId: formInstalledBattId,
      installedBatterySoC: Number(formInstalledSoC),
      installedBatterySoh: Number(formInstalledSoh),
      swapDurationMinutes: durationMins,
      costKes: Number(formCostKes),
      operatorName: formOperatorName,
      notes: formNotes,
      isDelayed: isOverSla,
      delayReason: isOverSla ? (formNotes || 'Swap exceeded 10-minute SLA benchmark.') : undefined,
      delayResolved: false
    };

    setSwaps(prev => [newRecord, ...prev]);
    if (onRecordBatterySwap) {
      onRecordBatterySwap(newRecord);
    }

    setIsSwapModalOpen(false);

    if (isOverSla) {
      toast.warning(`DELAYED SWAP FLAG (>10m SLA): ${durationMins} mins duration at ${formStationName}`, {
        description: 'Hub manager alert generated to investigate potential hardware or staff delays.'
      });
    } else {
      toast.success(`Battery Swap ${newRecord.swapCode} recorded!`, {
        description: `Installed ${newRecord.installedBatteryId} on ${newRecord.vehicleReg}`
      });
    }

    // Reset optional fields
    setFormInstalledBattId('');
    setFormNotes('');
  };

  // Export CSV of Swap History
  const handleExportSwapCsv = () => {
    if (filteredSwaps.length === 0) {
      toast.error('No swap records available to export.');
      return;
    }

    let csv = 'Swap Code,Timestamp,Vehicle Reg,Driver Name,Station Name,Station Location,Removed Battery ID,Removed SoC %,Removed SOH %,Installed Battery ID,Installed SoC %,Installed SOH %,Duration (mins),Cost (KES),Operator,Notes\n';

    filteredSwaps.forEach(s => {
      csv += `"${s.swapCode}","${s.timestamp}","${s.vehicleReg}","${s.driverName}","${s.stationName}","${s.stationLocation}","${s.removedBatteryId}",${s.removedBatterySoC},${s.removedBatterySoh},"${s.installedBatteryId}",${s.installedBatterySoC},${s.installedBatterySoh},${s.swapDurationMinutes},${s.costKes},"${s.operatorName}","${s.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Battery_Swap_History_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredSwaps.length} battery swap history record(s) to CSV!`);
  };

  // Traceability Modal Events for a specific battery ID
  const traceHistoryForSelectedBattery = selectedBatteryForTrace
    ? swaps.filter(s => s.removedBatteryId === selectedBatteryForTrace || s.installedBatteryId === selectedBatteryForTrace)
    : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">EV Battery Telemetry & Swap Command</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time battery degradation monitoring, swapping sessions, and pack lifecycle traceability
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSwapModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2 rounded-lg text-xs transition shadow-lg shadow-emerald-950 cursor-pointer"
          >
            <Repeat className="w-4 h-4" />
            <span>Log Battery Swap</span>
          </button>

          <button
            onClick={() => {
              evVehicles.forEach(v => generateBatteryReportPdf(v, evSessions));
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold px-3.5 py-2 rounded-lg text-xs transition shadow cursor-pointer"
            title="Download PDF battery maintenance report for all EV assets"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>PDF Reports</span>
          </button>
        </div>
      </div>

      {/* Automated Rapid Degradation Notification Trigger Banner */}
      {!isRapidDropBannerDismissed && rapidDegradationVehicles.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 border-2 border-rose-500/60 rounded-xl p-5 shadow-2xl shadow-rose-950/40 relative overflow-hidden space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-rose-500/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/40 animate-pulse">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-rose-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-slate-950" />
                    AUTOMATED TRIGGER ACTIVE
                  </span>
                  <span className="bg-rose-950 text-rose-200 border border-rose-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    SLA Limit: &gt;2.0% Monthly Drop
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1">
                  Rapid SOH Degradation Alert: {rapidDegradationVehicles.length} Assets Flagged for Proactive Maintenance
                </h3>
              </div>
            </div>

            <button
              onClick={() => setIsRapidDropBannerDismissed(true)}
              className="text-slate-400 hover:text-white bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer self-end md:self-auto shrink-0"
            >
              Acknowledge & Dismiss
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Telemetry analysis detected EV assets experiencing accelerated battery capacity loss exceeding <strong>2.0% in a single month</strong> (baseline expectation is &lt;0.8%/month). Automated proactive maintenance alerts have been triggered to schedule immediate BMS cell rebalancing, fast-charging SLA review, and thermal telemetry checks before permanent pack damage occurs.
          </p>

          {/* Flagged Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {rapidDegradationVehicles.map((item, idx) => (
              <div key={idx} className="bg-slate-950/90 border border-rose-500/40 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-sm">{item.reg}</span>
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                    -{item.singleMonthDrop}% ({item.dropPeriod})
                  </span>
                </div>

                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Model:</span> <strong>{item.makeModel}</strong> • <span className="text-slate-400">Driver:</span> {item.driverName}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400">Current SOH: <strong className="text-amber-400">{item.currentSoh}%</strong></span>
                  <span className="text-slate-400">Batt ID: <strong className="text-emerald-400">{item.batteryId}</strong></span>
                </div>

                <p className="text-[10px] text-rose-300/90 italic line-clamp-2">
                  Root Cause: {item.cause}
                </p>
              </div>
            ))}
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-rose-500/30">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-200">
                {autoWorkOrdersTriggered ? (
                  <strong className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Proactive Work Orders Generated (#WO-2026-BAT-01, #WO-2026-BAT-02, #WO-2026-BAT-03)
                  </strong>
                ) : (
                  <span>3 Automated Proactive Maintenance Check Requests Pending Dispatch</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setAutoWorkOrdersTriggered(true);
                  toast.success(`⚡ Automated Work Orders Dispatched for ${rapidDegradationVehicles.map(v => v.reg).join(', ')}`, {
                    description: 'Scheduled for immediate cell balancing & thermal telemetry audit at Roam Central Hub.'
                  });
                }}
                disabled={autoWorkOrdersTriggered}
                className={`flex items-center gap-1.5 font-extrabold px-3.5 py-1.5 rounded-lg text-xs transition shadow cursor-pointer ${
                  autoWorkOrdersTriggered
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-950 font-black'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{autoWorkOrdersTriggered ? 'Work Orders Dispatched' : 'Trigger Proactive Work Orders'}</span>
              </button>

              <button
                onClick={() => setActiveSubTab('watchlist')}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inspect in Watchlist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Module Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('telemetry')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'telemetry'
              ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Telemetry & Fleet SoC</span>
        </button>

        <button
          onClick={() => setActiveSubTab('energy_trends')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'energy_trends'
              ? 'bg-slate-900 text-teal-300 border-t-2 border-teal-400 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-teal-400" />
          <span>6-Month Energy Trends</span>
          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            Recharts (kWh)
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('monthly_energy')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'monthly_energy'
              ? 'bg-slate-900 text-teal-300 border-t-2 border-teal-400 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-teal-400" />
          <span>Monthly Energy & Costs</span>
          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            Model Breakdown
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('cost_per_km_benchmark')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'cost_per_km_benchmark'
              ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4 text-emerald-400" />
          <span>Cost/KM vs Fuel Benchmark</span>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            KES/KM Bar Chart
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('roi_calculator')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'roi_calculator'
              ? 'bg-slate-900 text-teal-300 border-t-2 border-teal-400 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4 text-teal-400" />
          <span>EV ROI Calculator</span>
          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            Break-Even Engine
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('range_planner')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'range_planner'
              ? 'bg-slate-900 text-teal-300 border-t-2 border-teal-400 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4 text-teal-400" />
          <span>Estimated Range & Route Planner</span>
          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            AI Range Predictor
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('watchlist')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'watchlist'
              ? 'bg-slate-900 text-rose-400 border-t-2 border-rose-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Battery Watchlist</span>
          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold animate-pulse">
            SOH &lt; 90%
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('soh_histogram')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'soh_histogram'
              ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span>SOH Histogram (D3)</span>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
            Fleet Distribution
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('heatmap')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'heatmap'
              ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Charging Peak Heatmap (D3)</span>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
            24h Temporal
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('efficiency_leakage')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'efficiency_leakage'
              ? 'bg-slate-900 text-rose-400 border-t-2 border-rose-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Energy Efficiency & Power Leakage (D3)</span>
          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
            kWh/km Audit
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('efficiency_comparison')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'efficiency_comparison'
              ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Thermometer className="w-4 h-4 text-amber-400" />
          <span>EV Efficiency Comparison (D3)</span>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
            Temp & Distance
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('swap_history')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'swap_history'
              ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Battery Swap History Log</span>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {swaps.length}
          </span>
        </button>
      </div>

      {/* TAB 1: TELEMETRY & FLEET SOC */}
      {activeSubTab === 'telemetry' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Electric Fleet Assets</div>
              <div className="text-2xl font-black text-white mt-1">{evVehicles.length} EVs</div>
              <p className="text-[11px] text-emerald-400 mt-1">Roam Air, Spiro, BYD, Shuttle Vans</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Battery Health</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">97% SOH</div>
              <p className="text-[11px] text-slate-400 mt-1">Low degradation rate across fleet</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Energy Consumed</div>
              <div className="text-2xl font-black text-teal-400 mt-1">{totalKwhConsumed.toFixed(1)} kWh</div>
              <p className="text-[11px] text-slate-400 mt-1">Across swap & fast charge hubs</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Energy Expenditure</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">KES {totalChargingSpent.toLocaleString()}</div>
              <p className="text-[11px] text-emerald-400 mt-1">Cost / km: ~KES 2.4 (vs Petrol KES 8.5)</p>
            </div>
          </div>

          {/* 6-Month EV Monthly Energy Consumption Trend Chart (Recharts) */}
          <EvMonthlyEnergyTrendChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onSelectVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
              toast.info('Switched to Predictive Range Simulator for selected vehicle');
            }}
          />

          {/* Monthly Energy Consumption & Cost Summary Panel (Fleet & Model Breakdown) */}
          <EvMonthlyEnergySummaryPanel
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onSelectVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
              toast.info('Switched to Predictive Range Simulator for selected vehicle');
            }}
          />

          {/* Charging Costs per KM vs Fuel Price Benchmark Bar Chart */}
          <EvChargingCostPerKmBarChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
          />

          {/* EV ROI & Break-Even Calculator Component */}
          <EvRoiCalculator
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
          />

          {/* Battery Health Watchlist Dashboard Widget (SOH < 90%) */}
          <BatteryHealthWatchlistWidget
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onOpenWorkOrder={onOpenWorkOrder}
            onTraceBattery={(battId) => setSelectedBatteryForTrace(battId)}
          />

          {/* Average Station Swap Delay & Bottlenecks Dashboard Card */}
          <StationSwapDelayCard
            swaps={swaps}
            slaTargetMinutes={SWAP_SLA_LIMIT_MINS}
            onSelectStationFilter={(stationName) => {
              setStationFilter(stationName);
              setActiveSubTab('swap_history');
            }}
            onOpenInvestigationModal={(swap) => {
              setSelectedSwapForInvestigation(swap);
              setInvestigationCategory(swap.delayReason || 'Cabinet Lock Ejection Mechanical Failure');
              setInvestigationResolution(swap.delayResolutionNotes || '');
            }}
          />

          {/* D3 Fleet SOH Distribution Histogram Chart */}
          <EvSohHistogramD3Chart
            vehicles={vehicles}
            onOpenWorkOrder={onOpenWorkOrder}
            onTraceBattery={(battId) => setSelectedBatteryForTrace(battId)}
          />

          {/* 6-Month D3 Battery Health Degradation Projection Chart */}
          <BatteryDegradationChart vehicles={vehicles} evSessions={evSessions} />

          {/* D3 Temporal Heatmap for Charging Frequency & Peak Demand */}
          <EvChargingTemporalHeatmap 
            evSessions={evSessions}
            swapRecords={swaps}
            vehicles={vehicles}
          />

          {/* D3 Energy Efficiency & Power Leakage Chart */}
          <EvEnergyEfficiencyD3Chart
            evSessions={evSessions}
            swapRecords={swaps}
            vehicles={vehicles}
          />

          {/* EV Fleet Circular SoC Gauges & Battery Status Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
            {/* Header with Title and Quick Visual Status Check Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>EV Fleet Circular SoC Gauges & Telemetry</span>
                      <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {filteredAndSortedEvVehicles.length} of {evVehicles.length} Assets
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time State of Charge (SoC) quick visual status check with multi-tier battery health monitoring
                    </p>
                  </div>
                </div>
              </div>

              {/* Color Legend for SoC thresholds */}
              <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">SoC Tiers:</span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-300 font-mono font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Red &lt; 20% (Critical)
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Amber 20–50% (Moderate)
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Green &gt; 50% (Optimal)
                </span>
              </div>
            </div>

            {/* Interactive Filters, Search, Sort & View Mode Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              {/* Quick Filter Chips by SoC Tier */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setEvSocFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    evSocFilter === 'ALL'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <span>All EVs</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${evSocFilter === 'ALL' ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'}`}>
                    {evSocStats.total}
                  </span>
                </button>

                <button
                  onClick={() => setEvSocFilter('CRITICAL_RED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    evSocFilter === 'CRITICAL_RED'
                      ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20'
                      : 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>Critical (&lt; 20%)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-950 text-red-200 border border-red-800">
                    {evSocStats.redCount}
                  </span>
                </button>

                <button
                  onClick={() => setEvSocFilter('MODERATE_AMBER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    evSocFilter === 'MODERATE_AMBER'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Moderate (20–50%)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-950 text-amber-200 border border-amber-800">
                    {evSocStats.amberCount}
                  </span>
                </button>

                <button
                  onClick={() => setEvSocFilter('OPTIMAL_GREEN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    evSocFilter === 'OPTIMAL_GREEN'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Optimal (&gt; 50%)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-200 border border-emerald-800">
                    {evSocStats.greenCount}
                  </span>
                </button>
              </div>

              {/* Search, Sort & View Mode Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search reg, model, battery ID..."
                    value={evSearchQuery}
                    onChange={(e) => setEvSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-56"
                  />
                  {evSearchQuery && (
                    <button
                      onClick={() => setEvSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={evSortBy}
                  onChange={(e) => setEvSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="DEFAULT">Sort by: Default</option>
                  <option value="SOC_ASC">SoC: Lowest First (Urgent)</option>
                  <option value="SOC_DESC">SoC: Highest First</option>
                  <option value="SOH_ASC">Battery Health (SOH): Lowest</option>
                  <option value="RANGE_DESC">Est. Range: Highest First</option>
                  <option value="RANGE_ASC">Est. Range: Lowest First</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setEvViewMode('GRID')}
                    className={`p-1.5 rounded text-xs transition cursor-pointer ${
                      evViewMode === 'GRID' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Grid Cards with Large Circular Gauges"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEvViewMode('TABLE')}
                    className={`p-1.5 rounded text-xs transition cursor-pointer ${
                      evViewMode === 'TABLE' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Compact Table List with Mini Circular Gauges"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty Filter State */}
            {filteredAndSortedEvVehicles.length === 0 && (
              <div className="text-center py-12 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 p-6 space-y-3">
                <Gauge className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-bold text-slate-300">No Electric Vehicles Found</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No EV assets match your current SoC filter ({evSocFilter}) or search query ("{evSearchQuery}").
                </p>
                <button
                  onClick={() => {
                    setEvSocFilter('ALL');
                    setEvSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}

            {/* VIEW MODE 1: GRID CARDS (With Circular SOC Gauges) */}
            {evViewMode === 'GRID' && filteredAndSortedEvVehicles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredAndSortedEvVehicles.map(v => {
                  const vehNominal = getVehicleNominalCapacityKwh(v);
                  const vehWhKm = getVehicleHistoricalWhPerKm(v, evSessions);
                  const socVal = v.currentSoCPercent || 0;
                  const vehPrediction = calculatePredictiveRange({
                    batteryCapacityKwh: vehNominal,
                    sohPercent: v.batteryHealthPercent || 96,
                    socPercent: socVal,
                    temperatureC: 25,
                    historicalAvgWhPerKm: vehWhKm
                  });
                  const colorCfg = getSocColorConfig(socVal);

                  return (
                    <div 
                      key={v.id} 
                      className={`bg-slate-950/80 rounded-xl p-4 space-y-3.5 flex flex-col justify-between transition-all duration-200 border ${
                        colorCfg.category === 'RED' 
                          ? 'border-red-500/40 hover:border-red-500/70 shadow-lg shadow-red-950/20' 
                          : colorCfg.category === 'AMBER'
                          ? 'border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-950/20'
                          : 'border-slate-800 hover:border-emerald-500/40 shadow-lg'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Card Header: Reg & Make/Model Badge */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white text-base font-mono block">{v.registrationNumber}</span>
                            <span className="text-[11px] text-slate-400">{v.model || v.type}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {v.make}
                          </span>
                        </div>

                        {/* Centered Circular SOC Gauge Component */}
                        <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col items-center justify-center relative">
                          <EvCircularSocGauge
                            socPercent={socVal}
                            size="lg"
                            isCharging={v.status === 'Charging'}
                            batteryCapacityKwh={v.batteryCapacityKwh || vehNominal}
                            estimatedRangeKm={vehPrediction.estimatedRangeRemainingKm}
                            showStatusBadge={true}
                          />

                          {/* Charging Indicator if vehicle status is Charging */}
                          {v.status === 'Charging' && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              <Zap className="w-2.5 h-2.5 animate-bounce" />
                              <span>Charging</span>
                            </div>
                          )}
                        </div>

                        {/* Mounted Battery Traceability Badge */}
                        <div className="flex items-center justify-between text-[11px] bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400">Mounted Pack:</span>
                          <button
                            onClick={() => v.batteryId && setSelectedBatteryForTrace(v.batteryId)}
                            className="font-mono font-bold text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Click to trace battery lifecycle history"
                          >
                            <span>{v.batteryId || 'BATT-RM-8821'}</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>

                        {/* Predictive Range Remaining Banner */}
                        <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 p-2.5 rounded-lg border border-emerald-500/30 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-emerald-400" />
                              Est. Range:
                            </span>
                            <span className="text-sm font-mono font-black text-emerald-400">
                              {vehPrediction.estimatedRangeRemainingKm} km
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/80">
                            <span>Safe Buffer (10% res):</span>
                            <span className="font-mono text-teal-300 font-bold">{vehPrediction.safeBufferRangeKm} km</span>
                          </div>
                        </div>

                        {/* Battery SOH & Capacity Breakdown */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                          <div>
                            <span className="text-slate-400 block">Battery Health:</span>
                            <span className="font-bold text-emerald-400">{v.batteryHealthPercent || 96}% SOH</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Nominal Pack:</span>
                            <span className="font-bold text-slate-200">{v.batteryCapacityKwh || vehNominal} kWh</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-900">
                        <button
                          onClick={() => {
                            setSelectedPlannerVehicleId(v.id);
                            setActiveSubTab('range_planner');
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold py-1.5 px-3 rounded-lg transition shadow-sm cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Plan Route & Range Simulator</span>
                        </button>

                        <button
                          onClick={() => generateBatteryReportPdf(v, evSessions)}
                          className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-slate-400" />
                          <span>Download Report (PDF)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE 2: HIGH-DENSITY TABLE (With Mini Circular SOC Gauges) */}
            {evViewMode === 'TABLE' && filteredAndSortedEvVehicles.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                      <th className="p-3">Vehicle & Model</th>
                      <th className="p-3 text-center">Circular SoC Gauge</th>
                      <th className="p-3">SoC Tier</th>
                      <th className="p-3 text-right">Est. Range</th>
                      <th className="p-3">Battery Health (SOH)</th>
                      <th className="p-3">Mounted Pack ID</th>
                      <th className="p-3">Assigned Driver</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                    {filteredAndSortedEvVehicles.map(v => {
                      const vehNominal = getVehicleNominalCapacityKwh(v);
                      const vehWhKm = getVehicleHistoricalWhPerKm(v, evSessions);
                      const socVal = v.currentSoCPercent || 0;
                      const vehPrediction = calculatePredictiveRange({
                        batteryCapacityKwh: vehNominal,
                        sohPercent: v.batteryHealthPercent || 96,
                        socPercent: socVal,
                        temperatureC: 25,
                        historicalAvgWhPerKm: vehWhKm
                      });
                      const colorCfg = getSocColorConfig(socVal);

                      return (
                        <tr key={v.id} className="hover:bg-slate-800/50 transition">
                          {/* Vehicle & Model */}
                          <td className="p-3">
                            <div className="font-bold text-white font-mono text-sm">{v.registrationNumber}</div>
                            <div className="text-[11px] text-slate-400">{v.make} • {v.model || v.type}</div>
                          </td>

                          {/* Circular SoC Gauge Component (sm size) */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center">
                              <EvCircularSocGauge
                                socPercent={socVal}
                                size="sm"
                                isCharging={v.status === 'Charging'}
                                showLabel={false}
                              />
                            </div>
                          </td>

                          {/* SoC Tier Badge */}
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${colorCfg.badgeBg} ${colorCfg.badgeText} ${colorCfg.badgeBorder}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${colorCfg.category === 'RED' ? 'animate-ping' : ''}`} style={{ backgroundColor: colorCfg.strokeColor }} />
                              {colorCfg.statusText}
                            </span>
                          </td>

                          {/* Est Range */}
                          <td className="p-3 text-right">
                            <div className="font-mono font-black text-emerald-400 text-sm">
                              {vehPrediction.estimatedRangeRemainingKm} km
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Buffer: {vehPrediction.safeBufferRangeKm} km
                            </div>
                          </td>

                          {/* Battery Health SOH */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-white">{v.batteryHealthPercent || 96}%</span>
                              <span className="text-[10px] text-slate-400">({v.batteryCapacityKwh || vehNominal} kWh)</span>
                            </div>
                            <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-emerald-400"
                                style={{ width: `${v.batteryHealthPercent || 96}%` }}
                              />
                            </div>
                          </td>

                          {/* Mounted Pack ID with Trace link */}
                          <td className="p-3">
                            <button
                              onClick={() => v.batteryId && setSelectedBatteryForTrace(v.batteryId)}
                              className="font-mono text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                              title="Click to trace battery pack"
                            >
                              <span>{v.batteryId || 'BATT-RM-8821'}</span>
                              <Eye className="w-3 h-3 text-slate-400" />
                            </button>
                          </td>

                          {/* Assigned Driver */}
                          <td className="p-3 text-slate-300 text-xs">
                            {v.assignedDriverName || 'Unassigned'}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPlannerVehicleId(v.id);
                                  setActiveSubTab('range_planner');
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Plan Route & Range Simulator"
                              >
                                <Compass className="w-3 h-3 text-emerald-400" />
                                <span>Simulate</span>
                              </button>

                              <button
                                onClick={() => generateBatteryReportPdf(v, evSessions)}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                                title="Download Report PDF"
                              >
                                <Download className="w-3 h-3 text-slate-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: 6-MONTH EV ENERGY CONSUMPTION TRENDS (RECHARTS) */}
      {activeSubTab === 'energy_trends' && (
        <div className="space-y-6">
          <EvMonthlyEnergyTrendChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onSelectVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
              toast.info('Switched to Predictive Range Simulator for selected vehicle');
            }}
          />

          <EvMonthlyEnergySummaryPanel
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onSelectVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
              toast.info('Switched to Predictive Range Simulator for selected vehicle');
            }}
          />

          <EvChargingCostPerKmBarChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
          />
        </div>
      )}

      {/* TAB: MONTHLY ENERGY CONSUMPTION & COST BREAKDOWN */}
      {activeSubTab === 'monthly_energy' && (
        <div className="space-y-6">
          <EvMonthlyEnergyTrendChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onSelectVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
              toast.info('Switched to Predictive Range Simulator for selected vehicle');
            }}
          />

          <EvMonthlyEnergySummaryPanel
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onSelectVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
              toast.info('Switched to Predictive Range Simulator for selected vehicle');
            }}
          />

          <EvChargingCostPerKmBarChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
          />
        </div>
      )}

      {/* TAB: CHARGING COSTS PER KM VS FUEL BENCHMARK (BAR CHART) */}
      {activeSubTab === 'cost_per_km_benchmark' && (
        <div className="space-y-6">
          <EvChargingCostPerKmBarChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
          />

          <EvMonthlyEnergySummaryPanel
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onSelectVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
              toast.info('Switched to Predictive Range Simulator for selected vehicle');
            }}
          />
        </div>
      )}

      {/* TAB: EV ROI & BREAK-EVEN CALCULATOR */}
      {activeSubTab === 'roi_calculator' && (
        <div className="space-y-6">
          <EvRoiCalculator
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onNavigateToVehicle={(vehId) => {
              setSelectedPlannerVehicleId(vehId);
              setActiveSubTab('range_planner');
            }}
          />

          <EvChargingCostPerKmBarChart
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
          />
        </div>
      )}

      {/* TAB: PREDICTIVE RANGE & ROUTE DISPATCH PLANNER */}
      {activeSubTab === 'range_planner' && (
        <div className="space-y-6">
          <EvRangeRoutePlanner
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            drivers={drivers}
            selectedVehicleId={selectedPlannerVehicleId}
            onSelectVehicle={(vehId) => setSelectedPlannerVehicleId(vehId)}
            onOpenSwapModal={(vehId) => {
              if (vehId) {
                const targetVeh = vehicles.find(v => v.id === vehId);
                if (targetVeh) {
                  setFormVehicleId(targetVeh.id);
                  setFormDriverName(targetVeh.assignedDriverName || '');
                  setFormRemovedBattId(targetVeh.batteryId || '');
                  setFormRemovedSoC(targetVeh.currentSoCPercent || 15);
                  setFormRemovedSoh(targetVeh.batteryHealthPercent || 95);
                }
              }
              setIsSwapModalOpen(true);
            }}
          />
        </div>
      )}

      {/* TAB: BATTERY WATCHLIST (SOH < 90%) */}
      {activeSubTab === 'watchlist' && (
        <div className="space-y-6">
          <BatteryHealthWatchlistWidget
            vehicles={vehicles}
            evSessions={evSessions}
            swapRecords={swaps}
            onOpenWorkOrder={onOpenWorkOrder}
            onTraceBattery={(battId) => setSelectedBatteryForTrace(battId)}
          />
        </div>
      )}

      {/* TAB: SOH FLEET DISTRIBUTION HISTOGRAM (D3) */}
      {activeSubTab === 'soh_histogram' && (
        <div className="space-y-6">
          <EvSohHistogramD3Chart
            vehicles={vehicles}
            onOpenWorkOrder={onOpenWorkOrder}
            onTraceBattery={(battId) => setSelectedBatteryForTrace(battId)}
          />
        </div>
      )}

      {/* TAB 2: CHARGING PEAK DEMAND TEMPORAL HEATMAP */}
      {activeSubTab === 'heatmap' && (
        <div className="space-y-6">
          <EvChargingTemporalHeatmap 
            evSessions={evSessions}
            swapRecords={swaps}
            vehicles={vehicles}
          />
        </div>
      )}

      {/* TAB 3: ENERGY EFFICIENCY & POWER LEAKAGE (D3) */}
      {activeSubTab === 'efficiency_leakage' && (
        <div className="space-y-6">
          <EvEnergyEfficiencyD3Chart 
            evSessions={evSessions}
            swapRecords={swaps}
            vehicles={vehicles}
          />
        </div>
      )}

      {/* TAB 4: EV EFFICIENCY COMPARISON (D3) - TEMP VS DISTANCE */}
      {activeSubTab === 'efficiency_comparison' && (
        <div className="space-y-6">
          <EvEfficiencyComparisonD3Chart 
            evSessions={evSessions}
            swapRecords={swaps}
            vehicles={vehicles}
          />
        </div>
      )}

      {/* TAB 3: BATTERY SWAP HISTORY LOG */}
      {activeSubTab === 'swap_history' && (
        <div className="space-y-6">
          
          {/* Swap KPI Traceability Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Swaps Logged</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{swaps.length} Swaps</div>
              <p className="text-[11px] text-slate-400 mt-1">100% Traceability across stations</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unique Battery IDs</div>
              <div className="text-2xl font-black text-teal-300 mt-1">{allTrackedBatteryIds.length} Packs</div>
              <p className="text-[11px] text-slate-400 mt-1">Serial numbers tracked in inventory</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Swap Time</div>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {(swaps.reduce((acc, s) => acc + s.swapDurationMinutes, 0) / (swaps.length || 1)).toFixed(1)} Mins
              </div>
              <p className="text-[11px] text-emerald-400 mt-1">Target SLA: &le; 10.0 Mins</p>
            </div>

            <div className={`bg-slate-900 border rounded-xl p-4 shadow-lg ${
              delayedSwapsCount > 0 ? 'border-amber-500/50 bg-amber-950/20' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delayed Swaps (&gt;10m SLA)</div>
                {delayedSwapsCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> SLA Alert
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">{delayedSwapsCount} Sessions</div>
              <p className="text-[11px] text-amber-300/80 mt-1 truncate">
                {delayedSwapsCount > 0 
                  ? `Max delay: ${maxDelaySwap?.swapDurationMinutes}m at ${maxDelaySwap?.stationName}`
                  : 'Zero SLA breaches reported'}
              </p>
            </div>
          </div>

          {/* HUB MANAGER DELAY INVESTIGATION WARNING BANNER */}
          {delayedSwapsCount > 0 && (
            <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-lg border border-amber-500/40 text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-500/30 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      Hub Manager Investigation Required
                    </span>
                    <span className="text-xs text-amber-200/80 font-mono">
                      {delayedSwapsCount} session(s) exceeded 10-minute turnaround benchmark
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">
                    Automatic Hardware & Staff Delay Warning Triggered
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
                    Swap durations above 10 minutes indicate potential cabinet locking pin jams, station queue congestion, or operator handling delays. Hub managers should audit cabinet telemetry and operator logs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => setDelayFilter(delayFilter === 'DELAYED_ONLY' ? 'ALL' : 'DELAYED_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                    delayFilter === 'DELAYED_ONLY'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{delayFilter === 'DELAYED_ONLY' ? 'Showing Delayed Only' : 'Filter Delayed Swaps'}</span>
                </button>

                {maxDelaySwap && (
                  <button
                    onClick={() => {
                      setSelectedSwapForInvestigation(maxDelaySwap);
                      setInvestigationCategory(maxDelaySwap.delayReason || 'Cabinet Lock Ejection Mechanical Failure');
                      setInvestigationResolution(maxDelaySwap.delayResolutionNotes || '');
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Investigate Longest ({maxDelaySwap.swapDurationMinutes}m)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Average Station Swap Delay & Bottlenecks Dashboard Card */}
          <StationSwapDelayCard
            swaps={swaps}
            slaTargetMinutes={SWAP_SLA_LIMIT_MINS}
            onSelectStationFilter={(stationName) => {
              setStationFilter(stationName);
            }}
            onOpenInvestigationModal={(swap) => {
              setSelectedSwapForInvestigation(swap);
              setInvestigationCategory(swap.delayReason || 'Cabinet Lock Ejection Mechanical Failure');
              setInvestigationResolution(swap.delayResolutionNotes || '');
            }}
          />

          {/* Search, Filter & Action Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Battery ID, Vehicle Reg, Driver, Swap Code, or Delay Cause..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Station Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Stations ({swaps.length})</option>
                  {availableStations.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Delayed Swaps Only Toggle Button */}
              <button
                onClick={() => setDelayFilter(prev => prev === 'DELAYED_ONLY' ? 'ALL' : 'DELAYED_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  delayFilter === 'DELAYED_ONLY'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-amber-300'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${delayFilter === 'DELAYED_ONLY' ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>Delayed Swaps Only ({delayedSwapsCount})</span>
              </button>

            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportSwapCsv}
              disabled={filteredSwaps.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow cursor-pointer disabled:cursor-not-allowed"
              title="Download CSV report of battery swap logs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Battery Swap History Log Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-400" />
                  <span>Battery Swap Lifecycle Traceability Log</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Detailed exchange history tracking specific battery pack IDs swapped out vs installed in EV vehicles
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredSwaps.length} record(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Swap Code & Date</th>
                    <th className="px-4 py-3 font-semibold">Vehicle & Driver</th>
                    <th className="px-4 py-3 font-semibold">Station & Location</th>
                    <th className="px-4 py-3 font-semibold">Battery Pack Swap Exchange (Out ➔ In)</th>
                    <th className="px-4 py-3 font-semibold">Swap Duration</th>
                    <th className="px-4 py-3 font-semibold text-right">Fee (KES)</th>
                    <th className="px-4 py-3 font-semibold text-center">Lifecycle Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSwaps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 italic">
                        No battery swap records match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSwaps.map(s => {
                      const isOverSla = s.swapDurationMinutes > SWAP_SLA_LIMIT_MINS;
                      return (
                        <tr key={s.id} className={`hover:bg-slate-800/40 transition ${
                          isOverSla ? 'bg-amber-950/10' : ''
                        }`}>
                          
                          {/* Swap Code & Date */}
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                              <span>{s.swapCode}</span>
                              {isOverSla && (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] px-1.5 py-0.2 rounded font-sans font-bold">
                                  DELAYED
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.timestamp}</div>
                          </td>

                          {/* Vehicle & Driver */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{s.vehicleReg}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>{s.driverName}</span>
                            </div>
                          </td>

                          {/* Station & Location */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-200">{s.stationName}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{s.stationLocation}</span>
                            </div>
                          </td>

                          {/* Swapped Batteries Exchange Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              
                              {/* Removed Battery Box */}
                              <div className="bg-red-950/40 border border-red-500/30 p-1.5 rounded-md text-[11px]">
                                <div className="text-[9px] uppercase font-bold text-red-400">Swapped Out:</div>
                                <button
                                  onClick={() => setSelectedBatteryForTrace(s.removedBatteryId)}
                                  className="font-mono font-bold text-red-300 hover:underline flex items-center gap-1"
                                  title="Trace lifecycle for removed battery"
                                >
                                  <span>{s.removedBatteryId}</span>
                                </button>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  SoC: <strong className="text-red-400">{s.removedBatterySoC}%</strong> | SOH: {s.removedBatterySoh}%
                                </div>
                              </div>

                              <ArrowRightLeft className="w-4 h-4 text-emerald-400 shrink-0" />

                              {/* Installed Battery Box */}
                              <div className="bg-emerald-950/40 border border-emerald-500/30 p-1.5 rounded-md text-[11px]">
                                <div className="text-[9px] uppercase font-bold text-emerald-400">Swapped In:</div>
                                <button
                                  onClick={() => setSelectedBatteryForTrace(s.installedBatteryId)}
                                  className="font-mono font-bold text-emerald-300 hover:underline flex items-center gap-1"
                                  title="Trace lifecycle for installed battery"
                                >
                                  <span>{s.installedBatteryId}</span>
                                </button>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  SoC: <strong className="text-emerald-400">{s.installedBatterySoC}%</strong> | SOH: {s.installedBatterySoh}%
                                </div>
                              </div>

                            </div>
                          </td>

                          {/* Duration & SLA Flag */}
                          <td className="px-4 py-3 font-mono">
                            {isOverSla ? (
                              <div>
                                <div className="flex items-center gap-1 text-amber-300 font-bold bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded w-max">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>{s.swapDurationMinutes} mins</span>
                                </div>
                                <div className="text-[10px] text-amber-300 font-sans font-bold mt-1 flex items-center gap-1">
                                  <span>⚠️ Over 10m SLA</span>
                                  {s.delayResolved && (
                                    <span className="text-emerald-400 bg-emerald-500/20 px-1 rounded text-[9px]">Resolved</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">{s.operatorName}</div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-1 text-slate-300">
                                  <Clock className="w-3 h-3 text-emerald-400" />
                                  <span>{s.swapDurationMinutes} mins</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px] mt-0.5">{s.operatorName}</div>
                              </div>
                            )}
                          </td>

                          {/* Fee */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                            KES {s.costKes.toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isOverSla && (
                                <button
                                  onClick={() => {
                                    setSelectedSwapForInvestigation(s);
                                    setInvestigationCategory(s.delayReason || 'Cabinet Lock Ejection Mechanical Failure');
                                    setInvestigationResolution(s.delayResolutionNotes || '');
                                  }}
                                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                                  title="Investigate hardware or staff delay for this swap session"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Investigate Delay</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedBatteryForTrace(s.installedBatteryId)}
                                className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                                title="Open detailed battery lifecycle traceability card"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Trace</span>
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: BATTERY LIFECYCLE TRACEABILITY MODAL */}
      {selectedBatteryForTrace && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            
            <button
              onClick={() => setSelectedBatteryForTrace(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
                <BatteryCharging className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Battery Lifecycle Traceability</span>
                <h3 className="text-lg font-black text-white font-mono">{selectedBatteryForTrace}</h3>
              </div>
            </div>

            {/* Battery Profile & SOH Cards */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Rated Pack Capacity</span>
                <span className="font-bold text-white text-sm">3.2 kWh (Lithium LFP)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Health SOH</span>
                <span className="font-bold text-emerald-400 text-sm">97% State of Health</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Recorded Swaps</span>
                <span className="font-bold text-teal-300 text-sm">{traceHistoryForSelectedBattery.length} Cycles</span>
              </div>
            </div>

            {/* Swaps Timeline History */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Exchange & Swap Location History</span>
              </h4>

              {traceHistoryForSelectedBattery.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-950 rounded-xl border border-slate-800">
                  No swap transactions logged yet for battery serial {selectedBatteryForTrace}.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {traceHistoryForSelectedBattery.map(s => {
                    const isInstalled = s.installedBatteryId === selectedBatteryForTrace;
                    return (
                      <div key={s.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-400">{s.swapCode}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{s.timestamp}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <strong className="text-white">{s.stationName}</strong>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isInstalled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {isInstalled ? 'INSTALLED ON VEHICLE' : 'SWAPPED OUT FOR CHARGE'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>Vehicle: <strong className="text-slate-200">{s.vehicleReg}</strong></span>
                          <span>Driver: <strong className="text-slate-200">{s.driverName}</strong></span>
                          <span>Duration: <strong className="text-slate-200">{s.swapDurationMinutes}m</strong></span>
                        </div>
                        {s.notes && (
                          <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-900">
                            "{s.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedBatteryForTrace(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Close Traceability Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: LOG NEW BATTERY SWAP FORM MODAL */}
      {isSwapModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            
            <button
              onClick={() => setIsSwapModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
                <Repeat className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Log Vehicle Battery Swap</h3>
                <p className="text-xs text-slate-400">Record a battery pack swap exchange between station cabinet and EV asset</p>
              </div>
            </div>

            <form onSubmit={handleSaveNewSwap} className="space-y-4 text-xs">
              
              {/* Vehicle & Driver Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Select EV Asset *</label>
                  <select
                    required
                    value={formVehicleId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose EV Vehicle --</option>
                    {evVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Assigned Driver</label>
                  <input
                    type="text"
                    placeholder="e.g. Juma Omondi"
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Station Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Swap Station Name</label>
                  <select
                    value={formStationName}
                    onChange={(e) => {
                      setFormStationName(e.target.value);
                      if (e.target.value === 'Roam Hub Kilimani') setFormStationLocation('Argwings Kodhek Rd, Kilimani, Nairobi');
                      else if (e.target.value === 'Spiro Station Westlands') setFormStationLocation('Muthangari Drive, Westlands, Nairobi');
                      else if (e.target.value === 'ARC Ride Lavington') setFormStationLocation('James Gichuru Rd, Lavington, Nairobi');
                      else if (e.target.value === 'Ampersand Industrial Area Hub') setFormStationLocation('Enterprise Rd, Industrial Area, Nairobi');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Roam Hub Kilimani">Roam Hub Kilimani</option>
                    <option value="Spiro Station Westlands">Spiro Station Westlands</option>
                    <option value="ARC Ride Lavington">ARC Ride Lavington</option>
                    <option value="Ampersand Industrial Area Hub">Ampersand Industrial Area Hub</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Location Address</label>
                  <input
                    type="text"
                    value={formStationLocation}
                    onChange={(e) => setFormStationLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Removed Battery (Out) */}
              <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase text-red-400 block">🔴 Swapped Out Battery Pack (Depleted)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Removed Battery ID</label>
                    <input
                      type="text"
                      placeholder="e.g. BATT-RM-8821"
                      value={formRemovedBattId}
                      onChange={(e) => setFormRemovedBattId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Removed SoC %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formRemovedSoC}
                      onChange={(e) => setFormRemovedSoC(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Removed SOH %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formRemovedSoh}
                      onChange={(e) => setFormRemovedSoh(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Installed Battery (In) */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase text-emerald-400 block">🟢 Swapped In Battery Pack (Fresh)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Installed Battery ID *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. BATT-RM-9014"
                      value={formInstalledBattId}
                      onChange={(e) => setFormInstalledBattId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Installed SoC %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formInstalledSoC}
                      onChange={(e) => setFormInstalledSoC(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Installed SOH %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formInstalledSoh}
                      onChange={(e) => setFormInstalledSoh(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Duration & Fee */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1 flex items-center justify-between">
                    <span>Swap Time (mins)</span>
                    {formDurationMins > 10 && (
                      <span className="text-[10px] text-amber-400 font-bold">&gt;10m SLA</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formDurationMins}
                    onChange={(e) => setFormDurationMins(Number(e.target.value))}
                    className={`w-full bg-slate-950 border text-white rounded-lg p-2 focus:outline-none ${
                      formDurationMins > 10 ? 'border-amber-500 text-amber-300 font-bold' : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Fee (KES)</label>
                  <input
                    type="number"
                    value={formCostKes}
                    onChange={(e) => setFormCostKes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Operator</label>
                  <input
                    type="text"
                    value={formOperatorName}
                    onChange={(e) => setFormOperatorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {formDurationMins > 10 && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Duration exceeds 10m SLA benchmark. This record will automatically trigger a Hub Manager Investigation Alert.</span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Swap Operator Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Depleted pack placed in Cabinet 2 for slow charge balance."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2 rounded-lg text-xs transition shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  Save Swap Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HUB MANAGER DELAY INVESTIGATION MODAL */}
      {selectedSwapForInvestigation && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            
            <button
              onClick={() => setSelectedSwapForInvestigation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Hub Manager SLA Investigation</span>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Swap Delay Audit: {selectedSwapForInvestigation.swapCode}</span>
                </h3>
              </div>
            </div>

            {/* Session Overview Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Actual Duration</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{selectedSwapForInvestigation.swapDurationMinutes} Mins</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">SLA Target</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">10.0 Mins</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">SLA Overrun</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    +{(selectedSwapForInvestigation.swapDurationMinutes - 10).toFixed(1)} Mins
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Swap Station</span>
                  <span className="font-bold text-white text-xs truncate block">{selectedSwapForInvestigation.stationName}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Vehicle & Driver:</span>
                  <strong className="text-white">{selectedSwapForInvestigation.vehicleReg}</strong> ({selectedSwapForInvestigation.driverName})
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Station Operator:</span>
                  <strong className="text-white">{selectedSwapForInvestigation.operatorName}</strong>
                </div>
              </div>
            </div>

            {/* Investigation Form */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span>Root Cause Delay Category *</span>
                  <span className="text-[10px] text-slate-500">Hardware vs Staff / Operational</span>
                </label>
                <select
                  value={investigationCategory}
                  onChange={(e) => setInvestigationCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                >
                  <option value="Cabinet Lock Ejection Mechanical Failure">🔧 Cabinet Lock Ejection Mechanical Failure (Hardware)</option>
                  <option value="Staff Shift Handover & Station Queue">⏱️ Staff Shift Handover & Station Queue (Staff/Ops)</option>
                  <option value="BMS Connector Pin Corrosion Cleaning">⚡ BMS Connector Pin Corrosion / Cleaning (Hardware)</option>
                  <option value="RFID Reader / Terminal Network Latency">📶 RFID Reader / Terminal Network Latency (IT / System)</option>
                  <option value="M-Pesa Driver Payment Confirmation Hold">💳 M-Pesa Driver Payment Confirmation Hold (Financial)</option>
                  <option value="Other Manual Override Action">📝 Other Operational / Operator Override</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Hub Manager Investigation & Resolution Findings
                </label>
                <textarea
                  rows={3}
                  value={investigationResolution}
                  onChange={(e) => setInvestigationResolution(e.target.value)}
                  placeholder="Record findings from hardware inspection or staff interview. E.g., Inspected cabinet bay #2 locking solenoid, lubricated ejection pins, operator instructed on fast-clear override protocol."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Toggle Resolution Status */}
              <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-200 block">Mark Delay as Resolved</span>
                  <span className="text-[10px] text-slate-400">Clears alert flag from manager pending queue</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newResolvedStatus = !selectedSwapForInvestigation.delayResolved;
                    setSwaps(prev => prev.map(s => s.id === selectedSwapForInvestigation.id ? {
                      ...s,
                      delayResolved: newResolvedStatus,
                      delayReason: investigationCategory,
                      delayResolutionNotes: investigationResolution
                    } : s));
                    setSelectedSwapForInvestigation(prev => prev ? { ...prev, delayResolved: newResolvedStatus } : null);
                    toast.info(newResolvedStatus ? 'Delay flagged as Resolved' : 'Delay flagged as Pending Investigation');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                    selectedSwapForInvestigation.delayResolved
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {selectedSwapForInvestigation.delayResolved ? '✓ Resolved' : 'Mark Resolved'}
                </button>
              </div>

              {/* Submit & Close Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedSwapForInvestigation(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwaps(prev => prev.map(s => s.id === selectedSwapForInvestigation.id ? {
                      ...s,
                      isDelayed: true,
                      delayReason: investigationCategory,
                      delayResolutionNotes: investigationResolution,
                      delayResolved: true
                    } : s));
                    toast.success(`Investigation report logged for ${selectedSwapForInvestigation.swapCode}`, {
                      description: `Category: ${investigationCategory}`
                    });
                    setSelectedSwapForInvestigation(null);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2 rounded-lg text-xs transition shadow-lg shadow-amber-950 cursor-pointer"
                >
                  Save Investigation Report
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

