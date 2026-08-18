import React, { useState } from 'react';
import { FuelTransaction, Vehicle } from '../types';
import { 
  Fuel, AlertTriangle, ShieldCheck, Plus, TrendingUp, TrendingDown, 
  Zap, Gauge, ShieldAlert, CheckCircle2, Filter, Info, ChevronDown, 
  ChevronUp, ExternalLink, RefreshCw, Send, AlertCircle, MapPin, Route,
  Search, ArrowRight, Activity, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface FuelModuleProps {
  fuelLogs: FuelTransaction[];
  vehicles?: Vehicle[];
  onOpenFuelModal: () => void;
}

// Vehicle Historical Benchmark Averages (km/L)
const VEHICLE_HISTORICAL_BENCHMARKS: Record<string, number> = {
  'KCY 882P': 36.0, // TVS HLX 150 Fuel Motorcycle
  'KCB 910X': 12.5, // Toyota Fielder Petrol
  'KDD 402Y': 14.0, // Petrol Hatchback
  'KCM 110T': 34.0, // Bajaj Boxer 150 Fuel Motorcycle
};

// Planned Route Distances for Operational Shifts
const VEHICLE_PLANNED_ROUTES_KM: Record<string, { routeName: string; distanceKm: number }> = {
  'KCY 882P': { routeName: 'Mombasa Island to Kilifi Port Dispatch', distanceKm: 75.0 },
  'KCB 910X': { routeName: 'Kisumu to Kakamega Depot Express', distanceKm: 65.0 },
  'KCM 110T': { routeName: 'Westlands to Thika Superhighway Route', distanceKm: 55.0 },
};

// Helper to resolve vehicle historical average km/L
const getVehicleHistoricalAverage = (vehicleReg: string, logs: FuelTransaction[]): number => {
  if (VEHICLE_HISTORICAL_BENCHMARKS[vehicleReg]) {
    return VEHICLE_HISTORICAL_BENCHMARKS[vehicleReg];
  }

  // Calculate average from non-anomalous logs for this vehicle
  const vehicleLogs = logs.filter(l => l.vehicleReg === vehicleReg && l.calculatedKmPerLiter && l.calculatedKmPerLiter > 0);
  if (vehicleLogs.length > 0) {
    const sum = vehicleLogs.reduce((acc, l) => acc + (l.calculatedKmPerLiter || 0), 0);
    return Number((sum / vehicleLogs.length).toFixed(1));
  }

  return 25.0; // Default fallback
};

export const FuelModule: React.FC<FuelModuleProps> = ({
  fuelLogs = [],
  vehicles = [],
  onOpenFuelModal = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'CONSUMPTION_MATRIX' | 'TRANSACTION_LOGS'>('CONSUMPTION_MATRIX');
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW_FUEL' | 'DEVIATIONS' | 'FLAGGED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLowFuelBannerDismissed, setIsLowFuelBannerDismissed] = useState<boolean>(false);
  const [isEfficiencyBannerDismissed, setIsEfficiencyBannerDismissed] = useState<boolean>(false);
  const [selectedTxnForAudit, setSelectedTxnForAudit] = useState<FuelTransaction | null>(null);

  // 1. Process Fuel Transactions for Efficiency Anomalies (>20% deviation)
  const processedLogs = fuelLogs.map(log => {
    const historicalAvg = getVehicleHistoricalAverage(log.vehicleReg, fuelLogs);
    const recordedKmPerLiter = log.calculatedKmPerLiter || 0;
    
    // Calculate percentage deviation from vehicle historical average
    const diff = recordedKmPerLiter - historicalAvg;
    const percentDeviation = historicalAvg > 0 ? (diff / historicalAvg) * 100 : 0;
    const absDeviation = Math.abs(percentDeviation);
    const isDeviant = absDeviation > 20; // > 20% threshold constraint

    return {
      ...log,
      historicalAvg,
      percentDeviation: Number(percentDeviation.toFixed(1)),
      absDeviation: Number(absDeviation.toFixed(1)),
      isDeviant,
      deviationType: percentDeviation < 0 ? ('Drop' as const) : ('Spike' as const),
      severity: absDeviation > 35 ? ('Critical Anomaly' as const) : ('Moderate Variance' as const)
    };
  });

  const totalSpentKes = fuelLogs.reduce((acc, f) => acc + f.totalCostKes, 0);
  const totalLiters = fuelLogs.reduce((acc, f) => acc + f.liters, 0);
  const flaggedAnomalies = fuelLogs.filter(f => f.isFlaggedAnomaly);
  const deviantLogs = processedLogs.filter(p => p.isDeviant);

  // 2. Process Fuel Vehicles for Average Daily Consumption & Low Fuel Route Risk Analysis
  // Filter vehicles that are Fuel category (or synthesize from fuelLogs if no vehicles passed)
  const fuelVehiclesList = vehicles.length > 0 
    ? vehicles.filter(v => v.category === 'Fuel')
    : Array.from(new Set(fuelLogs.map(l => l.vehicleReg))).map((reg, idx) => ({
        id: `v-synth-${idx}`,
        registrationNumber: reg,
        make: reg.startsWith('KC') ? 'TVS' : 'Toyota',
        model: reg.startsWith('KC') ? 'HLX 150 Petrol' : 'Fielder Petrol',
        category: 'Fuel' as const,
        type: 'Fuel Motorcycle' as const,
        currentFuelLiters: reg === 'KCY 882P' ? 1.8 : (reg === 'KCM 110T' ? 1.1 : 12.5),
        fuelCapacityLiters: reg.startsWith('KC') ? 11.0 : 42.0,
        assignedDriverName: fuelLogs.find(l => l.vehicleReg === reg)?.driverName || 'Assigned Driver',
        city: 'Nairobi' as const,
        status: 'On Trip' as const,
        odometerKm: 52000
      }));

  const vehicleConsumptionAnalytics = fuelVehiclesList.map(vehicle => {
    const reg = vehicle.registrationNumber;
    const logsForVeh = fuelLogs.filter(l => l.vehicleReg === reg);
    
    // Total fuel pumped and spend from logs
    const totalPumpedLiters = logsForVeh.reduce((sum, l) => sum + l.liters, 0);
    const totalFuelSpendKes = logsForVeh.reduce((sum, l) => sum + l.totalCostKes, 0);
    
    // Active days count based on unique dates in logs or fallback default
    const uniqueDates = new Set(logsForVeh.map(l => l.timestamp.split(' ')[0]));
    const activeDaysSpan = Math.max(1, uniqueDates.size || 2);

    // Calculated Average Daily Consumption
    const avgDailyLiters = Number((totalPumpedLiters / activeDaysSpan).toFixed(1));
    const avgDailyCostKes = Math.round(totalFuelSpendKes / activeDaysSpan);

    // Efficiency and Range calculations
    const efficiencyKmL = getVehicleHistoricalAverage(reg, fuelLogs);
    const currentFuelLiters = vehicle.currentFuelLiters ?? 2.5;
    const fuelCapacityLiters = vehicle.fuelCapacityLiters ?? 12.0;
    const tankPercent = Math.min(100, Math.max(0, Math.round((currentFuelLiters / fuelCapacityLiters) * 100)));

    // Maximum Available Distance on remaining fuel
    const maxAvailableRangeKm = Number((currentFuelLiters * efficiencyKmL).toFixed(1));

    // Planned Route Information
    const plannedRoute = VEHICLE_PLANNED_ROUTES_KM[reg] || {
      routeName: 'Regional Operational Dispatch Route',
      distanceKm: 60.0
    };

    // Route Fuel Safety Margin (Range - Planned Route Distance)
    const rangeMarginKm = Number((maxAvailableRangeKm - plannedRoute.distanceKm).toFixed(1));
    
    // Low Fuel Warning condition:
    // Triggered if available range is less than planned route distance OR remaining tank is <= 20%
    const isLowFuelWarning = rangeMarginKm < 0 || tankPercent <= 20;
    const deficitKm = rangeMarginKm < 0 ? Math.abs(rangeMarginKm) : 0;

    return {
      vehicle,
      registrationNumber: reg,
      makeModel: `${vehicle.make} ${vehicle.model}`,
      assignedDriverName: vehicle.assignedDriverName || 'Fleet Operator',
      city: vehicle.city,
      status: vehicle.status,
      currentFuelLiters,
      fuelCapacityLiters,
      tankPercent,
      efficiencyKmL,
      logsCount: logsForVeh.length,
      totalPumpedLiters,
      totalFuelSpendKes,
      avgDailyLiters,
      avgDailyCostKes,
      avgDailyKmDriven: Number((avgDailyLiters * efficiencyKmL).toFixed(1)),
      maxAvailableRangeKm,
      plannedRoute,
      rangeMarginKm,
      isLowFuelWarning,
      deficitKm
    };
  });

  // Low Fuel Risk Warning Vehicles
  const lowFuelWarningVehicles = vehicleConsumptionAnalytics.filter(v => v.isLowFuelWarning);

  // Fleet Daily Totals
  const fleetTotalDailyLiters = vehicleConsumptionAnalytics.reduce((acc, v) => acc + v.avgDailyLiters, 0);
  const fleetTotalDailyCostKes = vehicleConsumptionAnalytics.reduce((acc, v) => acc + v.avgDailyCostKes, 0);

  // Filter Displayed Transactions
  const displayedLogs = processedLogs.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = p.vehicleReg.toLowerCase().includes(q) ||
        p.driverName.toLowerCase().includes(q) ||
        p.stationName.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (filterMode === 'DEVIATIONS') return p.isDeviant;
    if (filterMode === 'FLAGGED') return p.isFlaggedAnomaly;
    return true;
  });

  // Filter Displayed Consumption Vehicles
  const displayedConsumptionVehicles = vehicleConsumptionAnalytics.filter(v => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = v.registrationNumber.toLowerCase().includes(q) ||
        v.makeModel.toLowerCase().includes(q) ||
        v.assignedDriverName.toLowerCase().includes(q) ||
        v.plannedRoute.routeName.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (filterMode === 'LOW_FUEL') return v.isLowFuelWarning;
    return true;
  });

  const handleFlagForAudit = (txnId: string, vehicleReg: string) => {
    toast.success(`Fuel transaction #${txnId} (${vehicleReg}) flagged for telematics audit!`);
  };

  const handleDispatchEmergencyRefill = (vehicleReg: string, driverName: string) => {
    toast.success(`Emergency fuel voucher & refuel dispatch sent to ${driverName} (${vehicleReg})!`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Fuel Management & Telematics Route Audit</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor daily fuel consumption per vehicle, low fuel route stranding risks, km/L efficiency deviations, and station refill receipts
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lowFuelWarningVehicles.length > 0 && isLowFuelBannerDismissed && (
            <button
              onClick={() => setIsLowFuelBannerDismissed(false)}
              className="flex items-center gap-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 font-bold px-3 py-2 rounded-lg text-xs transition cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Show {lowFuelWarningVehicles.length} Low Fuel Risk(s)</span>
            </button>
          )}

          <button
            onClick={onOpenFuelModal}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-amber-950/60 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Fuel Fill-Up</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Expenditure */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Fuel Expenditure</div>
          <div className="text-2xl font-black text-amber-400 mt-1">KES {totalSpentKes.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400 mt-1">Across petrol & diesel fleet vehicles</p>
        </div>

        {/* Avg Fleet Daily Consumption */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Avg Daily Consumption</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {fleetTotalDailyLiters.toFixed(1)} L <span className="text-xs font-normal text-slate-400">/ day</span>
          </div>
          <p className="text-[11px] text-amber-400 font-mono mt-1">
            ~KES {fleetTotalDailyCostKes.toLocaleString()} / day fleet average
          </p>
        </div>

        {/* Fleet Km/L Efficiency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Fleet Efficiency</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">26.2 km/L</div>
          <p className="text-[11px] text-slate-400 mt-1">Weighted historical benchmark</p>
        </div>

        {/* Low Fuel Warning Indicator KPI */}
        <div className={`border rounded-xl p-4 shadow-lg transition ${
          lowFuelWarningVehicles.length > 0 ? 'bg-amber-950/40 border-amber-500/60' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Low Fuel Route Risk</span>
            <span className="text-[10px] text-amber-400 font-bold font-mono">Route Deficit</span>
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-2">
            <span>{lowFuelWarningVehicles.length} Vehicles</span>
            {lowFuelWarningVehicles.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30 animate-pulse">
                Action Req.
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-300 mt-1">
            Range insufficient for next planned route
          </p>
        </div>

      </div>

      {/* 1. LOW FUEL WARNING ROUTE STRANDING ALERT BANNER */}
      {lowFuelWarningVehicles.length > 0 && !isLowFuelBannerDismissed && (
        <div className="bg-slate-950 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl shadow-amber-950/40 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 animate-pulse" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                <AlertCircle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Low Fuel Warning • Route Range Deficit Detected
                  </h3>
                  <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                    {lowFuelWarningVehicles.length} Vehicle(s) At Risk of Stranding
                  </span>
                </div>
                <p className="text-xs text-amber-200 mt-0.5">
                  Telematics predicts these vehicles will run out of fuel before reaching the destination of their next planned route.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setActiveTab('CONSUMPTION_MATRIX');
                  setFilterMode('LOW_FUEL');
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>View Low Fuel Matrix</span>
              </button>

              <button
                onClick={() => setIsLowFuelBannerDismissed(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs transition border border-slate-800 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* At-Risk Vehicles Route Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowFuelWarningVehicles.map(veh => (
              <div 
                key={veh.registrationNumber}
                className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-3.5 space-y-3 transition hover:border-amber-400/80"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-xs bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-mono">
                      {veh.registrationNumber}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{veh.makeModel}</h4>
                      <p className="text-[10px] text-slate-400">Driver: {veh.assignedDriverName}</p>
                    </div>
                  </div>

                  <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase font-mono">
                    -{veh.deficitKm} km Deficit
                  </span>
                </div>

                {/* Progress Fuel Tank vs Planned Distance */}
                <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      <span>Current Fuel: {veh.currentFuelLiters} L ({veh.tankPercent}%)</span>
                    </span>
                    <span className="text-amber-400 font-mono font-bold">
                      Est. Range: {veh.maxAvailableRangeKm} km
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${veh.tankPercent}%` }} 
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Route className="w-3.5 h-3.5 text-sky-400" />
                      <span>Route: {veh.plannedRoute.routeName}</span>
                    </span>
                    <span className="text-sky-300 font-mono font-bold">
                      {veh.plannedRoute.distanceKm} km
                    </span>
                  </div>

                  <div className="bg-red-950/60 p-2 rounded text-[11px] text-red-200 border border-red-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      Vehicle will exhaust fuel ~{veh.maxAvailableRangeKm} km into journey — <strong>{veh.deficitKm} km short</strong> of destination!
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Efficiency: {veh.efficiencyKmL} km/L
                  </span>

                  <button
                    onClick={() => handleDispatchEmergencyRefill(veh.registrationNumber, veh.assignedDriverName)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded text-[11px] transition shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>Dispatch Emergency Refill</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. AUTOMATED EFFICIENCY DEVIATION ALERT BANNER */}
      {deviantLogs.length > 0 && !isEfficiencyBannerDismissed && (
        <div className="bg-slate-950 border-2 border-red-500/80 rounded-2xl p-5 shadow-2xl shadow-red-950/40 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-red-500/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Automated Efficiency Anomaly Alert
                  </h3>
                  <span className="bg-red-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                    {deviantLogs.length} Transaction(s) Flagged (&gt;20% Deviation)
                  </span>
                </div>
                <p className="text-xs text-red-200 mt-0.5">
                  Telematics system detected fuel efficiency variance exceeding the 20% tolerance threshold against historical vehicle baselines.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setActiveTab('TRANSACTION_LOGS');
                  setFilterMode('DEVIATIONS');
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Logs (&gt;20%)</span>
              </button>

              <button
                onClick={() => setIsEfficiencyBannerDismissed(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-xs transition border border-slate-800 cursor-pointer"
              >
                Dismiss Banner
              </button>
            </div>
          </div>

          {/* Deviant Transactions List */}
          <div className="space-y-3">
            {deviantLogs.map(dev => (
              <div 
                key={dev.id}
                className="bg-red-950/30 border border-red-500/40 rounded-xl p-3.5 space-y-2.5 transition hover:border-red-400/80"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-white text-xs bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-mono">
                      {dev.vehicleReg}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      Driver: <strong className="text-white">{dev.driverName}</strong>
                    </span>
                    <span className="text-xs text-slate-400">• {dev.stationName}</span>
                    <span className="text-xs text-slate-500">({dev.timestamp})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      dev.deviationType === 'Drop'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      {dev.deviationType === 'Drop' ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      <span>{dev.percentDeviation > 0 ? `+${dev.percentDeviation}%` : `${dev.percentDeviation}%`} {dev.deviationType}</span>
                    </span>

                    <span className="text-xs font-bold text-red-300 font-mono">
                      KES {dev.totalCostKes.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Recorded Fill-Up Efficiency</span>
                    <span className={`text-sm font-black font-mono mt-0.5 block ${dev.deviationType === 'Drop' ? 'text-red-400' : 'text-amber-400'}`}>
                      {dev.calculatedKmPerLiter} km/L
                    </span>
                    <span className="text-[10px] text-slate-500">From {dev.liters} L pumped ({dev.receiptNumber})</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle Historical Average</span>
                    <span className="text-sm font-black font-mono text-emerald-400 mt-0.5 block">
                      {dev.historicalAvg} km/L
                    </span>
                    <span className="text-[10px] text-slate-500">Historical fleet baseline benchmark</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Automated Telematics Diagnosis</span>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-snug">
                      {dev.deviationType === 'Drop' 
                        ? 'Severe efficiency drop (>20%). Fuel siphoning, tank leakage, or severe engine misfire detected by IoT sensors.'
                        : 'Unrealistic efficiency spike (>20%). Odometer discrepancy, fraudulent fuel receipt entry, or unreported extra mileage.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-red-300/80 italic font-mono">
                    Alert Code: ALT-FUEL-{dev.id.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFlagForAudit(dev.id, dev.vehicleReg)}
                      className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 font-bold rounded text-[11px] border border-red-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-red-400" />
                      <span>Flag for Telematics Audit</span>
                    </button>

                    <button
                      onClick={() => {
                        toast.info(`Dispatched automated fuel audit inquiry to ${dev.driverName}`);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-[11px] border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-amber-400" />
                      <span>Inquire Driver</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE MAIN CONTENT TABS & CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
        
        {/* Navigation & View Switcher Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          
          {/* Main Tab Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('CONSUMPTION_MATRIX');
                setFilterMode('ALL');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'CONSUMPTION_MATRIX'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>Daily Fuel Consumption & Range Risk Matrix</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('TRANSACTION_LOGS');
                setFilterMode('ALL');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'TRANSACTION_LOGS'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>Fuel Transaction Logbook ({fuelLogs.length})</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search vehicle, driver, station..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {activeTab === 'CONSUMPTION_MATRIX' ? (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filterMode === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Vehicles ({vehicleConsumptionAnalytics.length})
                </button>

                <button
                  onClick={() => setFilterMode('LOW_FUEL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                    filterMode === 'LOW_FUEL' 
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Low Fuel Risk ({lowFuelWarningVehicles.length})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filterMode === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({fuelLogs.length})
                </button>

                <button
                  onClick={() => setFilterMode('DEVIATIONS')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                    filterMode === 'DEVIATIONS' 
                      ? 'bg-red-950 text-red-300 border border-red-500/40' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Deviations ({deviantLogs.length})</span>
                </button>
              </div>
            )}

          </div>

        </div>

        {/* TAB 1: DAILY FUEL CONSUMPTION & LOW FUEL ROUTE RISK MATRIX */}
        {activeTab === 'CONSUMPTION_MATRIX' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Vehicle Daily Fuel Consumption & Low Fuel Warning Analysis</span>
                  <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono">
                    Real-time Telematics
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculates average daily fuel usage (L/day) and identifies low fuel vehicles projected to run out of fuel during their next route.
                </p>
              </div>
            </div>

            {/* Consumption & Fuel Warning Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Vehicle & Driver</th>
                    <th className="px-4 py-3 font-semibold">Avg Daily Fuel Usage</th>
                    <th className="px-4 py-3 font-semibold">Current Fuel Tank</th>
                    <th className="px-4 py-3 font-semibold">Efficiency</th>
                    <th className="px-4 py-3 font-semibold">Est. Range vs Next Route</th>
                    <th className="px-4 py-3 font-semibold">Route Fuel Margin</th>
                    <th className="px-4 py-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedConsumptionVehicles.map(veh => {
                    const isWarning = veh.isLowFuelWarning;

                    return (
                      <tr 
                        key={veh.registrationNumber}
                        className={`transition ${
                          isWarning 
                            ? 'bg-amber-950/20 hover:bg-amber-950/40 border-l-4 border-l-amber-500' 
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Vehicle & Driver */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-white text-xs font-mono">{veh.registrationNumber}</span>
                              <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-1.5 py-0.2 rounded">
                                {veh.city}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-300 font-medium mt-0.5">{veh.makeModel}</span>
                            <span className="text-[10px] text-slate-500">Driver: {veh.assignedDriverName}</span>
                          </div>
                        </td>

                        {/* Avg Daily Fuel Usage */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-black text-amber-400 font-mono text-sm">
                              {veh.avgDailyLiters} L <span className="text-[10px] font-normal text-slate-400">/ day</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ~KES {veh.avgDailyCostKes.toLocaleString()} / day
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Driven ~{veh.avgDailyKmDriven} km / day
                            </span>
                          </div>
                        </td>

                        {/* Current Fuel Tank Level */}
                        <td className="px-4 py-3">
                          <div className="space-y-1 w-32">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-mono font-bold text-white">{veh.currentFuelLiters} L</span>
                              <span className={`font-mono font-bold ${
                                veh.tankPercent <= 20 ? 'text-red-400' : (veh.tankPercent <= 40 ? 'text-amber-400' : 'text-emerald-400')
                              }`}>
                                {veh.tankPercent}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-950 h-2 rounded-full border border-slate-800 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  veh.tankPercent <= 20 ? 'bg-red-500' : (veh.tankPercent <= 40 ? 'bg-amber-500' : 'bg-emerald-500')
                                }`} 
                                style={{ width: `${veh.tankPercent}%` }} 
                              />
                            </div>

                            <span className="text-[10px] text-slate-500 block">
                              Cap: {veh.fuelCapacityLiters} L
                            </span>
                          </div>
                        </td>

                        {/* Historical Efficiency */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              {veh.efficiencyKmL} km/L
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Historical benchmark
                            </span>
                          </div>
                        </td>

                        {/* Est. Range vs Next Route */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Available Range:</span>
                              <span className="font-mono font-black text-white text-xs">{veh.maxAvailableRangeKm} km</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Next Route:</span>
                              <span className="font-mono font-bold text-sky-400 text-xs">{veh.plannedRoute.distanceKm} km</span>
                            </div>

                            <span className="text-[10px] text-slate-500 truncate max-w-[160px]" title={veh.plannedRoute.routeName}>
                              📍 {veh.plannedRoute.routeName}
                            </span>
                          </div>
                        </td>

                        {/* Route Fuel Margin & Low Fuel Warning Indicator */}
                        <td className="px-4 py-3">
                          {isWarning ? (
                            <div className="bg-red-950/60 border border-red-500/50 rounded-lg p-2 space-y-1">
                              <div className="flex items-center gap-1 text-red-400 font-extrabold text-[11px] uppercase tracking-wide">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Low Fuel Warning</span>
                              </div>
                              <p className="text-[10px] text-red-200 leading-tight">
                                <strong>-{veh.deficitKm} km deficit!</strong> Will run out of fuel before route end.
                              </p>
                            </div>
                          ) : (
                            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Safe Range Margin</span>
                              </div>
                              <p className="text-[10px] text-emerald-300 mt-0.5 font-mono">
                                +{veh.rangeMarginKm} km buffer remaining
                              </p>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              onOpenFuelModal();
                              toast.info(`Initiated fuel transaction for ${veh.registrationNumber}`);
                            }}
                            className={`px-3 py-1.5 font-black rounded-lg text-xs transition shadow-md flex items-center gap-1 mx-auto cursor-pointer ${
                              isWarning
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/50'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <Fuel className="w-3.5 h-3.5" />
                            <span>{isWarning ? 'Refill Now' : 'Record Fill'}</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {displayedConsumptionVehicles.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No vehicles matched the selected daily fuel consumption criteria.
              </div>
            )}

          </div>
        )}

        {/* TAB 2: FUEL TRANSACTION LOGBOOK */}
        {activeTab === 'TRANSACTION_LOGS' && (
          <div className="space-y-4">
            
            {/* Table Header Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Fuel Fill-Up Logbook & Station Receipts</h3>
                <p className="text-xs text-slate-400">
                  Audit station fill-ups against vehicle historical km/L baselines
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Driver</th>
                    <th className="px-4 py-3 font-semibold">Station Name</th>
                    <th className="px-4 py-3 font-semibold">Fuel Type</th>
                    <th className="px-4 py-3 font-semibold">Liters</th>
                    <th className="px-4 py-3 font-semibold">Calculated Km/L vs Benchmark</th>
                    <th className="px-4 py-3 font-semibold">Receipt No.</th>
                    <th className="px-4 py-3 font-semibold text-right">Cost (KES)</th>
                    <th className="px-4 py-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedLogs.map(f => {
                    const isDeviant = f.isDeviant;
                    const isDrop = f.percentDeviation < 0;

                    return (
                      <tr 
                        key={f.id} 
                        className={`transition ${
                          isDeviant 
                            ? 'bg-red-950/20 hover:bg-red-950/40 border-l-4 border-l-red-500' 
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{f.vehicleReg}</span>
                            {isDeviant && (
                              <span className="p-0.5 rounded bg-red-500/20 text-red-400" title=">20% Efficiency Deviation Flag">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-200">{f.driverName}</td>
                        <td className="px-4 py-3 text-slate-300">📍 {f.stationName}</td>
                        <td className="px-4 py-3 text-slate-400">{f.fuelType}</td>
                        <td className="px-4 py-3 text-slate-200 font-bold">{f.liters} L</td>

                        {/* Calculated Km/L vs Historical Average */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono font-bold text-xs ${
                                isDeviant ? (isDrop ? 'text-red-400' : 'text-amber-400') : 'text-emerald-400'
                              }`}>
                                {f.calculatedKmPerLiter || 'N/A'} km/L
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                isDeviant 
                                  ? (isDrop ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40')
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {f.percentDeviation > 0 ? `+${f.percentDeviation}%` : `${f.percentDeviation}%`}
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              Hist. Avg: {f.historicalAvg} km/L
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{f.receiptNumber}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">
                          KES {f.totalCostKes.toLocaleString()}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedTxnForAudit(f)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-[11px] border border-slate-700 transition cursor-pointer"
                          >
                            Audit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {displayedLogs.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No fuel transactions matched the selected filter criteria.
              </div>
            )}

          </div>
        )}

      </div>

      {/* TRANSACTION TELEMATICS AUDIT MODAL */}
      {selectedTxnForAudit && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Fuel Telematics Audit — #{selectedTxnForAudit.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTxnForAudit(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{selectedTxnForAudit.vehicleReg}</span>
                  <span className="text-slate-400">Driver: <strong className="text-white">{selectedTxnForAudit.driverName}</strong></span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Station: <strong className="text-slate-200">{selectedTxnForAudit.stationName}</strong> • {selectedTxnForAudit.timestamp}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Calculated Efficiency</span>
                  <span className="text-lg font-black font-mono text-amber-400 mt-0.5 block">
                    {selectedTxnForAudit.calculatedKmPerLiter} km/L
                  </span>
                  <span className="text-[10px] text-slate-500">{selectedTxnForAudit.liters} L @ KES {selectedTxnForAudit.pricePerLiterKes}/L</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Vehicle Historical Benchmark</span>
                  <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block">
                    {getVehicleHistoricalAverage(selectedTxnForAudit.vehicleReg, fuelLogs)} km/L
                  </span>
                  <span className="text-[10px] text-slate-500">Historical average</span>
                </div>
              </div>

              {selectedTxnForAudit.isDeviant && (
                <div className="bg-red-950/40 p-3 rounded-xl border border-red-500/40 space-y-1">
                  <span className="text-red-400 font-bold flex items-center gap-1 text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Efficiency Variance Threshold Exceeded (&gt;20%)</span>
                  </span>
                  <p className="text-red-200 text-[11px] leading-relaxed">
                    This fill-up recorded a <strong>{selectedTxnForAudit.percentDeviation}% variance</strong> compared to the historical vehicle baseline of {getVehicleHistoricalAverage(selectedTxnForAudit.vehicleReg, fuelLogs)} km/L.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTxnForAudit(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Close Audit
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
