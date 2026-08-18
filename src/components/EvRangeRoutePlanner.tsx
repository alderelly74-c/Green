import React, { useState, useMemo } from 'react';
import { Vehicle, EvBatterySession, Driver, BatterySwapRecord } from '../types';
import { 
  calculatePredictiveRange, 
  getVehicleHistoricalWhPerKm, 
  getVehicleNominalCapacityKwh,
  PredictiveRangeResult,
  TerrainType,
  PayloadType,
  DrivingModeType,
  HvacModeType
} from '../lib/batteryRangePredictor';
import { 
  Zap, BatteryCharging, Battery, Thermometer, Navigation, 
  MapPin, Gauge, ShieldAlert, CheckCircle2, AlertTriangle, 
  Compass, ArrowRight, RefreshCw, Sliders, Info, Sparkles,
  Layers, ChevronRight, Wind, Sun, Flame, Clock, Car, PhoneCall
} from 'lucide-react';
import { toast } from 'sonner';

interface EvRangeRoutePlannerProps {
  vehicles: Vehicle[];
  evSessions?: EvBatterySession[];
  swapRecords?: BatterySwapRecord[];
  drivers?: Driver[];
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  onOpenSwapModal?: (vehicleId?: string) => void;
}

export const EvRangeRoutePlanner: React.FC<EvRangeRoutePlannerProps> = ({
  vehicles = [],
  evSessions = [],
  swapRecords = [],
  drivers = [],
  selectedVehicleId,
  onSelectVehicle,
  onOpenSwapModal
}) => {
  const evVehicles = useMemo(() => vehicles.filter(v => v.category === 'Electric'), [vehicles]);

  // Selected vehicle for detailed simulation
  const [activeVehicleId, setActiveVehicleId] = useState<string>(
    selectedVehicleId || (evVehicles.length > 0 ? evVehicles[0].id : '')
  );

  const activeVehicle = useMemo(() => {
    return evVehicles.find(v => v.id === activeVehicleId) || evVehicles[0] || null;
  }, [evVehicles, activeVehicleId]);

  // Simulation parameters
  const [temperatureC, setTemperatureC] = useState<number>(25);
  const [customSoc, setCustomSoc] = useState<number | null>(null);
  const [customSoh, setCustomSoh] = useState<number | null>(null);
  const [terrain, setTerrain] = useState<TerrainType>('Flat Urban');
  const [payload, setPayload] = useState<PayloadType>('Standard Delivery Load');
  const [drivingMode, setDrivingMode] = useState<DrivingModeType>('Standard Normal');
  const [hvac, setHvac] = useState<HvacModeType>('Off');

  // Custom Trip Simulation Route
  const [plannedRouteKm, setPlannedRouteKm] = useState<number>(25);
  const [routeDestinationName, setRouteDestinationName] = useState<string>('Westlands ➔ Karen Express (25 km)');

  // Preset destination routes in Nairobi
  const ROUTE_PRESETS = [
    { label: 'CBD to Westlands Delivery', km: 8, terrain: 'Flat Urban' as TerrainType },
    { label: 'Kilimani to Karen Cross-Town', km: 18, terrain: 'Hilly / Elevation' as TerrainType },
    { label: 'CBD to Jomo Kenyatta Airport (JKIA)', km: 22, terrain: 'Highway High Speed' as TerrainType },
    { label: 'CBD to Ruiru via Thika Superhighway', km: 32, terrain: 'Highway High Speed' as TerrainType },
    { label: 'Full Shift Multi-Drop Courier Loop', km: 45, terrain: 'Dense Traffic Stop-and-Go' as TerrainType }
  ];

  // Temperature Presets for East Africa
  const TEMP_PRESETS = [
    { label: 'Nairobi Morning Chilly', temp: 17, icon: Wind },
    { label: 'Optimal Midday', temp: 23, icon: Sun },
    { label: 'Kisumu / Rift Heat', temp: 31, icon: Sun },
    { label: 'Mombasa Coast Peak', temp: 37, icon: Flame }
  ];

  // Sync state if external selection changes
  React.useEffect(() => {
    if (selectedVehicleId && selectedVehicleId !== activeVehicleId) {
      setActiveVehicleId(selectedVehicleId);
      setCustomSoc(null);
      setCustomSoh(null);
    }
  }, [selectedVehicleId]);

  // Current working values
  const currentSoc = customSoc !== null 
    ? customSoc 
    : (activeVehicle?.currentSoCPercent ?? 80);

  const currentSoh = customSoh !== null 
    ? customSoh 
    : (activeVehicle?.batteryHealthPercent ?? 96);

  const nominalCapacityKwh = activeVehicle 
    ? getVehicleNominalCapacityKwh(activeVehicle)
    : 3.24;

  const historicalWhPerKm = activeVehicle 
    ? getVehicleHistoricalWhPerKm(activeVehicle, evSessions)
    : 48;

  // Run calculation
  const prediction: PredictiveRangeResult = useMemo(() => {
    return calculatePredictiveRange({
      batteryCapacityKwh: nominalCapacityKwh,
      sohPercent: currentSoh,
      socPercent: currentSoc,
      temperatureC,
      historicalAvgWhPerKm: historicalWhPerKm,
      terrain,
      payload,
      drivingMode,
      hvac
    });
  }, [nominalCapacityKwh, currentSoh, currentSoc, temperatureC, historicalWhPerKm, terrain, payload, drivingMode, hvac]);

  // Route feasibility calculation
  const routeEnergyNeededKwh = (plannedRouteKm * prediction.effectiveWhPerKm) / 1000;
  const isRouteFeasible = prediction.estimatedRangeRemainingKm >= plannedRouteKm;
  const isRouteSafeWithBuffer = prediction.safeBufferRangeKm >= plannedRouteKm;
  const remainingMarginKm = Math.round((prediction.estimatedRangeRemainingKm - plannedRouteKm) * 10) / 10;
  const arrivalSocPercent = prediction.totalCurrentCapacityKwh > 0
    ? Math.max(0, Math.round(((prediction.usableEnergyKwh - routeEnergyNeededKwh) / prediction.totalCurrentCapacityKwh) * 100))
    : 0;

  // Driver assigned to active vehicle
  const assignedDriver = activeVehicle?.assignedDriverName 
    ? drivers.find(d => d.fullName === activeVehicle.assignedDriverName) 
    : null;

  // Handle station reservation
  const handleReserveSwap = (stationName: string) => {
    toast.success(`Battery Swap Slot Reserved at ${stationName}!`, {
      description: `Dispatched booking for ${activeVehicle?.registrationNumber || 'Vehicle'}. Fast-lane turnaround confirmed.`
    });
    if (onOpenSwapModal && activeVehicle) {
      onOpenSwapModal(activeVehicle.id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Compass className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Predictive Range & Route Dispatch Planner</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    AI Electrochemical Model
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculates real-time drivable distance using battery SoH degradation, ambient temperature, elevation profiles, and historical consumption telemetry
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setCustomSoc(null);
                setCustomSoh(null);
                setTemperatureC(24);
                setTerrain('Flat Urban');
                setPayload('Standard Delivery Load');
                setDrivingMode('Standard Normal');
                setHvac('Off');
                toast.info('Reset simulator to real vehicle telemetry telemetry baseline.');
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Telemetry</span>
            </button>

            {onOpenSwapModal && (
              <button
                onClick={() => onOpenSwapModal(activeVehicle?.id)}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs transition shadow-lg shadow-emerald-950 cursor-pointer"
              >
                <BatteryCharging className="w-4 h-4" />
                <span>Log Battery Swap</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Left = Vehicle & Conditions Control, Right = Range Outcome & Route Feasibility */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Vehicle Selection & Input Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card 1: Vehicle Asset Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-400" />
                Select EV Asset
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                {evVehicles.length} EVs Registered
              </span>
            </div>

            {/* Vehicle dropdown select */}
            <select
              value={activeVehicleId}
              onChange={(e) => {
                setActiveVehicleId(e.target.value);
                setCustomSoc(null);
                setCustomSoh(null);
                if (onSelectVehicle) onSelectVehicle(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {evVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.make} {v.model} ({v.type})
                </option>
              ))}
            </select>

            {/* Vehicle Quick Specs Badge */}
            {activeVehicle && (
              <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Driver:</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    {activeVehicle.assignedDriverName || 'Field Pool Asset'}
                    {assignedDriver?.phone && (
                      <span className="text-[10px] text-slate-400 font-mono">({assignedDriver.phone})</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Nominal Pack:</span>
                    <span className="font-bold text-emerald-300 font-mono">{nominalCapacityKwh} kWh</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Historical Avg:</span>
                    <span className="font-bold text-amber-300 font-mono">{historicalWhPerKm} Wh/km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current SOH:</span>
                    <span className="font-bold text-emerald-400 font-mono">{activeVehicle.batteryHealthPercent || 96}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mounted Battery:</span>
                    <span className="font-mono text-slate-200">{activeVehicle.batteryId || 'BATT-RM-8821'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Environmental & Route Profile Conditions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Dynamic Route & Ambient Parameters
            </h4>

            {/* Parameter 1: Temperature Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5 font-semibold">
                  <Thermometer className="w-4 h-4 text-amber-400" />
                  Ambient & Battery Temp:
                </span>
                <span className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                  temperatureC >= 32 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  temperatureC < 19 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {temperatureC}°C ({Math.round((temperatureC * 9/5) + 32)}°F)
                </span>
              </div>

              <input
                type="range"
                min={14}
                max={42}
                step={1}
                value={temperatureC}
                onChange={(e) => setTemperatureC(Number(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />

              {/* Temperature Quick Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {TEMP_PRESETS.map((p, idx) => {
                  const Icon = p.icon;
                  const isActive = temperatureC === p.temp;
                  return (
                    <button
                      key={idx}
                      onClick={() => setTemperatureC(p.temp)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex flex-col items-center gap-0.5 border cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        <span>{p.temp}°C</span>
                      </div>
                      <span className="text-[9px] font-normal text-slate-400 truncate max-w-full">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parameter 2: State of Charge (SoC) & Health (SoH) Override */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">State of Charge:</span>
                  <span className="font-mono font-bold text-emerald-400">{currentSoc}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={1}
                  value={currentSoc}
                  onChange={(e) => setCustomSoc(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">Battery SoH:</span>
                  <span className="font-mono font-bold text-teal-400">{currentSoh}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={1}
                  value={currentSoh}
                  onChange={(e) => setCustomSoh(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>

            {/* Parameter 3: Terrain & Elevation Profile */}
            <div className="space-y-1.5 pt-3 border-t border-slate-800">
              <label className="text-xs text-slate-300 font-semibold block">Route Elevation & Terrain:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Flat Urban', 'Hilly / Elevation', 'Highway High Speed', 'Dense Traffic Stop-and-Go'] as TerrainType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTerrain(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border text-left cursor-pointer ${
                      terrain === t
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter 4: Driving Mode / Regen & Payload */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 font-semibold block">Driving Mode:</label>
                <select
                  value={drivingMode}
                  onChange={(e) => setDrivingMode(e.target.value as DrivingModeType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Eco (Max Regen)">Eco (Max Regen -9% Wh)</option>
                  <option value="Standard Normal">Standard Normal</option>
                  <option value="Sport / Fast Throttle">Sport / Fast Throttle (+20% Wh)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 font-semibold block">Payload Weight:</label>
                <select
                  value={payload}
                  onChange={(e) => setPayload(e.target.value as PayloadType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Unladen / Solo Rider">Unladen / Solo Rider (-6% Wh)</option>
                  <option value="Standard Delivery Load">Standard Delivery (1.0x)</option>
                  <option value="Heavy Cargo / Pillion">Heavy Cargo (+18% Wh)</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Predictive Range Outcome & Route Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Giant Estimated Range Metric Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Gauge className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Predictive Drivable Range</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-semibold">{activeVehicle?.registrationNumber || 'Asset'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      prediction.urgencyLevel === 'optimal' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      prediction.urgencyLevel === 'moderate' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      prediction.urgencyLevel === 'warning' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' :
                      'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                    }`}>
                      {prediction.statusMessage}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400">Usable Energy:</span>
                <div className="text-sm font-black text-emerald-400 font-mono">
                  {prediction.usableEnergyKwh} kWh <span className="text-slate-500 font-normal">/ {prediction.totalCurrentCapacityKwh} kWh</span>
                </div>
              </div>
            </div>

            {/* Large Range Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              
              {/* Primary Estimated Range */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Estimated Range (to 0% SoC)</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight font-mono">
                    {prediction.estimatedRangeRemainingKm}
                  </span>
                  <span className="text-lg font-bold text-slate-300">km</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Confidence Interval: <strong>±3% (~{(prediction.estimatedRangeRemainingKm * 0.03).toFixed(1)} km)</strong>
                </div>
              </div>

              {/* Safe Buffer Range */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Safe Buffer Range (to 10% Reserve)</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                </span>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-teal-300 tracking-tight font-mono">
                    {prediction.safeBufferRangeKm}
                  </span>
                  <span className="text-lg font-bold text-slate-300">km</span>
                </div>
                <div className="text-[11px] text-teal-400/90">
                  Guaranteed safe radius before battery protection cutoff
                </div>
              </div>

            </div>

            {/* Factor Degradation & Temperature Breakdown Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 relative z-10 text-xs font-mono">
              
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-400 block font-sans">Effective Wh/km:</span>
                <span className="font-bold text-amber-300">{prediction.effectiveWhPerKm} Wh/km</span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">
                  Baseline: {historicalWhPerKm} Wh
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-400 block font-sans">Temp Penalty:</span>
                <span className={`font-bold ${prediction.temperaturePenaltyFactor > 1.05 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {prediction.temperaturePenaltyFactor}x {prediction.temperatureImpactRangeDeltaKm !== 0 ? `(${prediction.temperatureImpactRangeDeltaKm > 0 ? '+' : ''}${prediction.temperatureImpactRangeDeltaKm} km)` : '(0 km)'}
                </span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">
                  {temperatureC}°C operating temp
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-400 block font-sans">SOH Wear Loss:</span>
                <span className="font-bold text-rose-300">-{prediction.sohLostRangeKm} km</span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">
                  vs 100% Factory Pack
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-400 block font-sans">Ideal Max Range:</span>
                <span className="font-bold text-slate-200">{prediction.idealConditionRangeKm} km</span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">
                  100% SOH & 100% SoC
                </span>
              </div>

            </div>

            {/* Action Guidance Callout */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 relative z-10">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white block">Driver Dispatch Recommendation:</span>
                {prediction.actionGuidance}
              </div>
            </div>

          </div>

          {/* Card 2: Interactive Route Destination Feasibility Checker */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-400" />
                Route Feasibility & Destination Simulation
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Energy Draw: <strong>{routeEnergyNeededKwh.toFixed(2)} kWh</strong>
              </span>
            </div>

            {/* Planned Route Distance Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Planned Delivery Distance:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{plannedRouteKm} km</span>
              </div>

              <input
                type="range"
                min={3}
                max={75}
                step={1}
                value={plannedRouteKm}
                onChange={(e) => setPlannedRouteKm(Number(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />

              {/* Route Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ROUTE_PRESETS.map((rp, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPlannedRouteKm(rp.km);
                      setRouteDestinationName(rp.label);
                      setTerrain(rp.terrain);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                      plannedRouteKm === rp.km
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {rp.label} ({rp.km} km)
                  </button>
                ))}
              </div>
            </div>

            {/* Route Feasibility Verdict Result */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
              isRouteSafeWithBuffer 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                : isRouteFeasible 
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : 'bg-rose-950/30 border-rose-500/50 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                {isRouteSafeWithBuffer ? (
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : isRouteFeasible ? (
                  <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <div className="font-bold text-sm text-white">
                    {isRouteSafeWithBuffer 
                      ? 'Route 100% Feasible with Safety Buffer' 
                      : isRouteFeasible 
                      ? 'Route Feasible but encroaching on 10% Reserve'
                      : 'Route Infeasible — Battery Swap Required!'}
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">
                    {isRouteSafeWithBuffer 
                      ? `Arrive at destination with ~${arrivalSocPercent}% SoC remaining (${remainingMarginKm} km surplus margin).`
                      : isRouteFeasible
                      ? `Arrive with critical ~${arrivalSocPercent}% SoC. Consider swapping pack at nearest hub.`
                      : `Will deplete pack ${(plannedRouteKm - prediction.estimatedRangeRemainingKm).toFixed(1)} km before reaching destination.`}
                  </div>
                </div>
              </div>

              {!isRouteSafeWithBuffer && (
                <button
                  onClick={() => handleReserveSwap('Roam Hub Kilimani')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2 rounded-lg text-xs transition shadow shrink-0 cursor-pointer"
                >
                  Reserve Swap
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* SECTION 2: Swap Station Reachability Radar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Nairobi Regional Battery Swap Hub Reachability</span>
            </h4>
            <p className="text-xs text-slate-400">
              Live validation of whether {activeVehicle?.registrationNumber || 'this vehicle'} can safely reach nearby swap cabinets on current charge
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Safe Buffer Reachable
            </span>
            <span className="flex items-center gap-1 text-rose-400 ml-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Out of Range
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {prediction.nearbyStations.map((station) => (
            <div 
              key={station.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                station.isSafeWithBuffer 
                  ? 'bg-slate-950 border-emerald-500/30 hover:border-emerald-500/60' 
                  : station.isReachable
                  ? 'bg-slate-950 border-amber-500/30 hover:border-amber-500/60'
                  : 'bg-slate-950/60 border-rose-500/20 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs truncate max-w-[150px]">{station.name}</span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    station.isSafeWithBuffer ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    station.isReachable ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {station.distanceKm} km
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 truncate">{station.location}</p>

                <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[10px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Available Packs:</span>
                    <span className="font-bold text-emerald-400">{station.availablePacks} Charged</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Arrival SoC:</span>
                    <span className="font-bold text-slate-200 font-mono">~{station.estimatedArrivalSocPercent}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleReserveSwap(station.name)}
                disabled={!station.isReachable}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  station.isSafeWithBuffer 
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' 
                    : station.isReachable
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <span>{station.isReachable ? 'Reserve Swap Slot' : 'Out of Reach'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Fleet EV Live Range Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Fleet-Wide Live EV Range & Energy Matrix</span>
            </h4>
            <p className="text-xs text-slate-400">
              Real-time calculations for all electric vehicles in the active fleet
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-bold">
            {evVehicles.length} EV Units Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-3 pl-2">Vehicle Reg</th>
                <th className="pb-3">Model & Type</th>
                <th className="pb-3">Assigned Driver</th>
                <th className="pb-3 text-center">SoC %</th>
                <th className="pb-3 text-center">Battery SoH</th>
                <th className="pb-3 text-right">Effective Range</th>
                <th className="pb-3 text-right">Safe Buffer</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {evVehicles.map((v) => {
                const vehNominal = getVehicleNominalCapacityKwh(v);
                const vehWhKm = getVehicleHistoricalWhPerKm(v, evSessions);
                const vehCalc = calculatePredictiveRange({
                  batteryCapacityKwh: vehNominal,
                  sohPercent: v.batteryHealthPercent || 96,
                  socPercent: v.currentSoCPercent || 80,
                  temperatureC: 25,
                  historicalAvgWhPerKm: vehWhKm
                });

                const isSelected = v.id === activeVehicleId;

                return (
                  <tr 
                    key={v.id} 
                    onClick={() => {
                      setActiveVehicleId(v.id);
                      setCustomSoc(null);
                      setCustomSoh(null);
                      if (onSelectVehicle) onSelectVehicle(v.id);
                    }}
                    className={`transition-colors cursor-pointer hover:bg-slate-800/50 ${
                      isSelected ? 'bg-emerald-500/10 border-l-2 border-emerald-400' : ''
                    }`}
                  >
                    <td className="py-3 pl-2 font-bold text-white font-mono">
                      {v.registrationNumber}
                    </td>
                    <td className="py-3 text-slate-300">
                      <div>{v.make} {v.model}</div>
                      <div className="text-[10px] text-slate-500">{v.type}</div>
                    </td>
                    <td className="py-3 text-slate-300">
                      {v.assignedDriverName || <span className="text-slate-500 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        (v.currentSoCPercent || 0) > 50 ? 'text-emerald-400 bg-emerald-500/10' :
                        (v.currentSoCPercent || 0) > 20 ? 'text-amber-400 bg-amber-500/10' :
                        'text-rose-400 bg-rose-500/10 font-black animate-pulse'
                      }`}>
                        {v.currentSoCPercent || 0}%
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono text-teal-300 font-bold">
                      {v.batteryHealthPercent || 96}%
                    </td>
                    <td className="py-3 text-right font-mono font-black text-emerald-400 text-sm">
                      {vehCalc.estimatedRangeRemainingKm} km
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-300">
                      {vehCalc.safeBufferRangeKm} km
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        vehCalc.urgencyLevel === 'optimal' ? 'bg-emerald-500/20 text-emerald-300' :
                        vehCalc.urgencyLevel === 'moderate' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-rose-500/20 text-rose-300 animate-pulse'
                      }`}>
                        {vehCalc.statusMessage}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVehicleId(v.id);
                          setCustomSoc(null);
                          setCustomSoh(null);
                          if (onSelectVehicle) onSelectVehicle(v.id);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold transition border border-slate-700 cursor-pointer"
                      >
                        Simulate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
