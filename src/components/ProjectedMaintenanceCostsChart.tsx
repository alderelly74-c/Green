import React, { useState, useMemo } from 'react';
import { Vehicle } from '../types';
import { 
  Wrench, AlertTriangle, DollarSign, Gauge, Calendar, TrendingUp, 
  Sliders, Download, ShieldAlert, CheckCircle2, Zap, Fuel, Info, 
  ArrowUpRight, FileSpreadsheet, Sparkles, AlertCircle, Clock, Check
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Area, Line, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid, ReferenceLine 
} from 'recharts';
import { toast } from 'sonner';

interface ProjectedMaintenanceCostsChartProps {
  vehicles?: Vehicle[];
}

export interface VehicleMaintenanceProjection {
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  category: 'Electric' | 'Fuel';
  currentOdometerKm: number;
  dailyAvgKm: number;
  nextServiceOdometerKm: number;
  kmUntilService: number;
  daysUntilService: number;
  projectedDueDateStr: string;
  serviceTier: 'Minor PM' | 'Major Service' | 'Critical Overhaul';
  estimatedCostKes: number;
  urgencyLevel: 'CRITICAL' | 'UPCOMING' | 'SCHEDULED' | 'HEALTHY';
  componentsToInspect: string[];
}

export interface WeeklyCostForecastPoint {
  weekKey: string;
  weekLabel: string;
  minorCostsKes: number;
  majorCostsKes: number;
  overhaulCostsKes: number;
  totalProjectedKes: number;
  cumulativeExpenditureKes: number;
  vehiclesCountDue: number;
}

export const ProjectedMaintenanceCostsChart: React.FC<ProjectedMaintenanceCostsChartProps> = ({
  vehicles = []
}) => {
  // Filters & Controls
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Electric' | 'Fuel'>('All');
  const [timeHorizonDays, setTimeHorizonDays] = useState<30 | 60 | 90 | 180>(60);
  const [partsInflationBufferPct, setPartsInflationBufferPct] = useState<number>(5); // 5% spare parts buffer
  const [filterUrgencyOnly, setFilterUrgencyOnly] = useState<boolean>(false);
  const [weeklyBudgetCapKes, setWeeklyBudgetCapKes] = useState<number>(180000);

  // Default mock fleet if empty vehicles list passed
  const activeVehicles = useMemo(() => {
    if (vehicles && vehicles.length > 0) return vehicles;

    // Fallback representative fleet with diverse odometers
    return [
      { id: 'v1', registrationNumber: 'KMG 482E', make: 'Roam', model: 'Air EV', category: 'Electric', odometerKm: 19450, nextServiceOdometerKm: 20000, dailyRevenueKes: 4200, totalMaintenanceSpentKes: 18500 },
      { id: 'v2', registrationNumber: 'KCF 112A', make: 'Spiro', model: 'Commuter EV', category: 'Electric', odometerKm: 9800, nextServiceOdometerKm: 10000, dailyRevenueKes: 4500, totalMaintenanceSpentKes: 9200 },
      { id: 'v3', registrationNumber: 'KDK 890B', make: 'TVS', model: 'HLX 150', category: 'Fuel', odometerKm: 28900, nextServiceOdometerKm: 30000, dailyRevenueKes: 3800, totalMaintenanceSpentKes: 34000 },
      { id: 'v4', registrationNumber: 'KDD 455X', make: 'Toyota', model: 'Fielder', category: 'Fuel', odometerKm: 48500, nextServiceOdometerKm: 50000, dailyRevenueKes: 5200, totalMaintenanceSpentKes: 68000 },
      { id: 'v5', registrationNumber: 'KMG 901E', make: 'BYD', model: 'Atto 3', category: 'Electric', odometerKm: 24200, nextServiceOdometerKm: 25000, dailyRevenueKes: 6100, totalMaintenanceSpentKes: 22000 },
      { id: 'v6', registrationNumber: 'KCE 339L', make: 'Honda', model: 'Ace 125', category: 'Fuel', odometerKm: 14800, nextServiceOdometerKm: 15000, dailyRevenueKes: 3400, totalMaintenanceSpentKes: 16500 },
      { id: 'v7', registrationNumber: 'KMG 104E', make: 'Roam', model: 'Air EV', category: 'Electric', odometerKm: 39100, nextServiceOdometerKm: 40000, dailyRevenueKes: 4300, totalMaintenanceSpentKes: 41000 },
      { id: 'v8', registrationNumber: 'KCG 772M', make: 'Boxer', model: 'BM 150', category: 'Fuel', odometerKm: 21900, nextServiceOdometerKm: 22500, dailyRevenueKes: 3600, totalMaintenanceSpentKes: 28000 },
    ] as unknown as Vehicle[];
  }, [vehicles]);

  // Compute Vehicle-by-Vehicle Odometer & Cost Projections
  const vehicleProjections = useMemo<VehicleMaintenanceProjection[]>(() => {
    const costMultiplier = 1 + (partsInflationBufferPct / 100);
    const today = new Date(2026, 7, 12); // Aug 12, 2026

    return activeVehicles.map(v => {
      const odo = v.odometerKm || 15000;
      const isEv = v.category === 'Electric';
      
      // Estimated daily mileage based on vehicle type and operational usage
      const dailyKm = isEv ? 135 : 165; 
      
      // Calculate target service milestone (multiples of 5,000 km)
      let nextServiceOdo = v.nextServiceOdometerKm || (Math.floor(odo / 5000) + 1) * 5000;
      if (nextServiceOdo <= odo) {
        nextServiceOdo = odo + 1200; // Overdue target
      }

      const kmUntil = Math.max(0, nextServiceOdo - odo);
      const daysUntil = Math.max(1, Math.round(kmUntil / dailyKm));

      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + daysUntil);
      const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Determine Service Tier based on Milestone
      let tier: 'Minor PM' | 'Major Service' | 'Critical Overhaul' = 'Minor PM';
      let baseCost = isEv ? 6500 : 9500;
      let components = isEv 
        ? ['Brake Pads Inspection', 'Tire Pressure & Tread', 'Chain Lube & Tension', 'BMS Diagnostics']
        : ['Engine Oil & Filter Change', 'Spark Plug Check', 'Brake Shoes', 'Air Filter Cleaning'];

      if (nextServiceOdo % 20000 === 0) {
        tier = 'Major Service';
        baseCost = isEv ? 32000 : 42000;
        components = isEv 
          ? ['Tire Set Replacement', 'Suspension Bushings', 'High-Voltage Cable Check', 'Brake Rotors & Fluid']
          : ['Full Tire Replacement', 'Clutch Assembly/Belt', 'Carburetor Cleaning', 'Shock Absorbers'];
      } else if (nextServiceOdo % 50000 === 0 || nextServiceOdo >= 48000) {
        tier = 'Critical Overhaul';
        baseCost = isEv ? 95000 : 135000;
        components = isEv 
          ? ['Battery Cell Balancing & Module Refresh', 'Electric Motor Bearing Servicing', 'Inverter Cooling Seal', 'Complete Brake Line Overhaul']
          : ['Engine Cylinder & Piston Ring Overhaul', 'Gearbox/Transmission Servicing', 'Radiator & Cooling System', 'Exhaust System Renewal'];
      }

      const estCost = Math.round(baseCost * costMultiplier);

      // Urgency Level
      let urgency: 'CRITICAL' | 'UPCOMING' | 'SCHEDULED' | 'HEALTHY' = 'HEALTHY';
      if (daysUntil <= 10) urgency = 'CRITICAL';
      else if (daysUntil <= 25) urgency = 'UPCOMING';
      else if (daysUntil <= 60) urgency = 'SCHEDULED';

      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        makeModel: `${v.make} ${v.model}`,
        category: v.category,
        currentOdometerKm: odo,
        dailyAvgKm: dailyKm,
        nextServiceOdometerKm: nextServiceOdo,
        kmUntilService: kmUntil,
        daysUntilService: daysUntil,
        projectedDueDateStr: dueDateStr,
        serviceTier: tier,
        estimatedCostKes: estCost,
        urgencyLevel: urgency,
        componentsToInspect: components
      };
    });
  }, [activeVehicles, partsInflationBufferPct]);

  // Filtered Vehicle List for Table & Analytics
  const filteredProjections = useMemo(() => {
    return vehicleProjections.filter(vp => {
      if (selectedCategory !== 'All' && vp.category !== selectedCategory) return false;
      if (filterUrgencyOnly && (vp.urgencyLevel !== 'CRITICAL' && vp.urgencyLevel !== 'UPCOMING')) return false;
      if (vp.daysUntilService > timeHorizonDays) return false;
      return true;
    }).sort((a, b) => a.daysUntilService - b.daysUntilService);
  }, [vehicleProjections, selectedCategory, filterUrgencyOnly, timeHorizonDays]);

  // Generate 12-Week Time-Series Expenditure Forecast
  const weeklyForecastData = useMemo<WeeklyCostForecastPoint[]>(() => {
    const totalWeeks = Math.ceil(timeHorizonDays / 7);
    const weeks: WeeklyCostForecastPoint[] = [];
    const today = new Date(2026, 7, 12);
    let cumulative = 0;

    for (let w = 1; w <= totalWeeks; w++) {
      const weekStartDays = (w - 1) * 7;
      const weekEndDays = w * 7;

      const startDate = new Date(today);
      startDate.setDate(today.getDate() + weekStartDays);
      const weekLabel = `Wk ${w} (${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

      // Vehicles falling into this week
      const dueVehicles = vehicleProjections.filter(vp => {
        if (selectedCategory !== 'All' && vp.category !== selectedCategory) return false;
        return vp.daysUntilService > weekStartDays && vp.daysUntilService <= weekEndDays;
      });

      let minor = 0;
      let major = 0;
      let overhaul = 0;

      dueVehicles.forEach(vp => {
        if (vp.serviceTier === 'Minor PM') minor += vp.estimatedCostKes;
        else if (vp.serviceTier === 'Major Service') major += vp.estimatedCostKes;
        else if (vp.serviceTier === 'Critical Overhaul') overhaul += vp.estimatedCostKes;
      });

      const totalWeek = minor + major + overhaul;
      cumulative += totalWeek;

      weeks.push({
        weekKey: `W${w}`,
        weekLabel,
        minorCostsKes: minor,
        majorCostsKes: major,
        overhaulCostsKes: overhaul,
        totalProjectedKes: totalWeek,
        cumulativeExpenditureKes: cumulative,
        vehiclesCountDue: dueVehicles.length
      });
    }

    return weeks;
  }, [vehicleProjections, selectedCategory, timeHorizonDays]);

  // Aggregate Summary Statistics for Finance Team
  const totalHorizonExpenditureKes = useMemo(() => {
    return filteredProjections.reduce((sum, vp) => sum + vp.estimatedCostKes, 0);
  }, [filteredProjections]);

  const criticalExpenditureKes = useMemo(() => {
    return vehicleProjections
      .filter(vp => vp.urgencyLevel === 'CRITICAL')
      .reduce((sum, vp) => sum + vp.estimatedCostKes, 0);
  }, [vehicleProjections]);

  const criticalVehiclesCount = useMemo(() => {
    return vehicleProjections.filter(vp => vp.urgencyLevel === 'CRITICAL').length;
  }, [vehicleProjections]);

  const evProjectedExpenditureKes = useMemo(() => {
    return filteredProjections
      .filter(vp => vp.category === 'Electric')
      .reduce((sum, vp) => sum + vp.estimatedCostKes, 0);
  }, [filteredProjections]);

  const fuelProjectedExpenditureKes = useMemo(() => {
    return filteredProjections
      .filter(vp => vp.category === 'Fuel')
      .reduce((sum, vp) => sum + vp.estimatedCostKes, 0);
  }, [filteredProjections]);

  // Export CSV Report for Finance Team
  const handleExportCsv = () => {
    const headers = [
      'Registration Number',
      'Vehicle Make & Model',
      'Category',
      'Current Odometer (KM)',
      'Est Daily Utilization (KM/day)',
      'Next Service Milestone (KM)',
      'KM Remaining',
      'Est Days Until Service',
      'Projected Service Date',
      'Service Type',
      'Estimated Cost (KES)',
      'Urgency Status',
      'Key Components Checklist'
    ];

    const rows = filteredProjections.map(vp => [
      `"${vp.registrationNumber}"`,
      `"${vp.makeModel}"`,
      vp.category,
      vp.currentOdometerKm,
      vp.dailyAvgKm,
      vp.nextServiceOdometerKm,
      vp.kmUntilService,
      vp.daysUntilService,
      `"${vp.projectedDueDateStr}"`,
      vp.serviceTier,
      vp.estimatedCostKes,
      vp.urgencyLevel,
      `"${vp.componentsToInspect.join('; ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projected_maintenance_costs_forecast_${timeHorizonDays}d_2026.csv`;
    link.click();
    toast.success(`Exported ${filteredProjections.length} vehicle maintenance cost projections to CSV!`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Projected Maintenance Costs & CapEx Finance Alerts
              </h3>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-400" />
                Odometer Mileage Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Predictive maintenance budget modeling using live odometer trends, daily km accumulation rates, and tiered service interval costs.
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Category Filter */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            {(['All', 'Electric', 'Fuel'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'Electric' ? 'EV Fleet' : cat === 'Fuel' ? 'Fuel Fleet' : 'All Fleet'}
              </button>
            ))}
          </div>

          {/* Time Horizon Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            {([30, 60, 90, 180] as const).map(d => (
              <button
                key={d}
                onClick={() => setTimeHorizonDays(d)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  timeHorizonDays === d
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Finance Maintenance CSV</span>
          </button>

        </div>
      </div>

      {/* CRITICAL FINANCE CAPEX WARNING BANNER */}
      {criticalVehiclesCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                <span>Finance Capital Expenditure Alert</span>
                <span className="bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded text-[10px] font-mono">
                  {criticalVehiclesCount} Vehicles Due in ≤10 Days
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Estimated immediate budget reservation required for upcoming critical service milestones: <strong className="text-amber-300 font-mono text-sm">KES {criticalExpenditureKes.toLocaleString()}</strong>. Ensure maintenance petty cash or vendor M-Pesa B2C accounts are provisioned.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterUrgencyOnly(!filterUrgencyOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition shrink-0 cursor-pointer border ${
              filterUrgencyOnly 
                ? 'bg-amber-500 text-slate-950 border-amber-400' 
                : 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            {filterUrgencyOnly ? 'Show All Projections' : 'Filter Critical Due Only'}
          </button>
        </div>
      )}

      {/* PARAMETER CONTROLS & INFLATION BUFFER */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-slate-300 font-bold shrink-0">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Parts Inflation / Spare Buffer:</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-56">
            <input 
              type="range"
              min="0"
              max="20"
              step="1"
              value={partsInflationBufferPct}
              onChange={(e) => setPartsInflationBufferPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <span className="font-mono font-extrabold text-amber-400 text-sm shrink-0 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              +{partsInflationBufferPct}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            EV CapEx: <strong className="text-emerald-400">KES {evProjectedExpenditureKes.toLocaleString()}</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Fuel CapEx: <strong className="text-amber-400">KES {fuelProjectedExpenditureKes.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        
        {/* Total Projected Maintenance */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>{timeHorizonDays}-Day Projected CapEx</span>
            </span>
            <span className="text-amber-300 text-[10px] bg-amber-500/20 font-bold px-1.5 py-0.5 rounded">
              Maintenance Total
            </span>
          </div>
          <div className="text-xl font-black text-amber-400 mt-1.5">
            KES {totalHorizonExpenditureKes.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            Across {filteredProjections.length} active fleet service events
          </p>
        </div>

        {/* Critical Overhauls Share */}
        <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Critical Overhauls CapEx</span>
            </span>
            <span className="text-rose-300 text-[10px] bg-rose-500/20 font-bold px-1.5 py-0.5 rounded">
              High Impact
            </span>
          </div>
          <div className="text-xl font-black text-rose-400 mt-1.5">
            KES {vehicleProjections.filter(v => v.serviceTier === 'Critical Overhaul').reduce((s, v) => s + v.estimatedCostKes, 0).toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            {vehicleProjections.filter(v => v.serviceTier === 'Critical Overhaul').length} major battery/engine overhauls
          </p>
        </div>

        {/* EV Savings Ratio vs ICE */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>EV Maintenance Efficiency</span>
            </span>
            <span className="text-emerald-300 text-[10px] bg-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
              -38% Cost/KM
            </span>
          </div>
          <div className="text-xl font-black text-emerald-300 mt-1.5">
            KES {evProjectedExpenditureKes.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            EV fleet average KES 0.62/km vs KES 1.15/km for fuel vehicles
          </p>
        </div>

        {/* Average Cost Per Vehicle */}
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Avg Cost per Event</span>
            </span>
            <span className="text-cyan-300 text-[10px] bg-cyan-500/20 font-bold px-1.5 py-0.5 rounded">
              Budget Target
            </span>
          </div>
          <div className="text-xl font-black text-cyan-300 mt-1.5">
            KES {filteredProjections.length > 0 ? Math.round(totalHorizonExpenditureKes / filteredProjections.length).toLocaleString() : 0}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            Based on average {timeHorizonDays}-day service interval frequency
          </p>
        </div>

      </div>

      {/* WEEKLY EXPENDITURE FORECAST CHART (RECHARTS) */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 pb-2">
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              Minor PMs (KES)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              Major Scheduled Service (KES)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-3 h-3 rounded bg-rose-500"></span>
              Critical Overhauls (KES)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <span className="w-3 h-1 bg-cyan-400 rounded"></span>
              Cumulative CapEx Outflow
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Upcoming {weeklyForecastData.length} Weeks Horizon
          </span>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyForecastData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="weekKey" 
                stroke="#64748b" 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#64748b" 
                tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#06b6d4" 
                tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
                tick={{ fill: '#38bdf8', fontSize: 10 }}
              />

              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as WeeklyCostForecastPoint;
                    return (
                      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-2 font-sans w-64">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white text-xs">{data.weekLabel}</span>
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-black">
                            {data.vehiclesCountDue} Vehicles Due
                          </span>
                        </div>

                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Minor PMs:</span>
                            <strong className="font-bold">KES {data.minorCostsKes.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center justify-between text-amber-400">
                            <span>Major Service:</span>
                            <strong className="font-bold">KES {data.majorCostsKes.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center justify-between text-rose-400">
                            <span>Critical Overhauls:</span>
                            <strong className="font-bold">KES {data.overhaulCostsKes.toLocaleString()}</strong>
                          </div>
                          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-white font-extrabold">
                            <span>Total Week Outflow:</span>
                            <span className="text-amber-300 text-xs">KES {data.totalProjectedKes.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-cyan-300 text-[10px] pt-0.5">
                            <span>Cumulative Outflow:</span>
                            <span>KES {data.cumulativeExpenditureKes.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Weekly Budget Cap Line */}
              <ReferenceLine 
                yAxisId="left"
                y={weeklyBudgetCapKes} 
                stroke="#f59e0b" 
                strokeDasharray="4 4" 
                label={{ 
                  value: `Weekly Budget Target (KES ${(weeklyBudgetCapKes/1000).toFixed(0)}k)`, 
                  fill: '#f59e0b', 
                  fontSize: 10, 
                  fontWeight: 'bold',
                  position: 'top' 
                }} 
              />

              {/* Stacked Expenditure Bars */}
              <Bar yAxisId="left" dataKey="minorCostsKes" name="Minor PMs" stackId="costs" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="majorCostsKes" name="Major Service" stackId="costs" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="overhaulCostsKes" name="Critical Overhauls" stackId="costs" fill="#f43f5e" radius={[4, 4, 0, 0]} />

              {/* Cumulative Line */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativeExpenditureKes" 
                name="Cumulative Outflow" 
                stroke="#38bdf8" 
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#38bdf8' }}
              />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* VEHICLE-BY-VEHICLE ODOMETER & SERVICE SCHEDULE TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>Vehicle Odometer Mileage & Service Cost Forecast Table ({filteredProjections.length} Vehicles)</span>
          </h4>
          <span className="text-[11px] font-normal text-slate-400 font-mono">
            Sorted by nearest service due date
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Vehicle & Registration</th>
                <th className="py-2.5 px-3 font-semibold">Odometer (KM)</th>
                <th className="py-2.5 px-3 font-semibold">Daily Run-Rate</th>
                <th className="py-2.5 px-3 font-semibold">Service Milestone</th>
                <th className="py-2.5 px-3 font-semibold">Days Remaining</th>
                <th className="py-2.5 px-3 font-semibold">Service Tier</th>
                <th className="py-2.5 px-3 font-semibold">Projected Cost (KES)</th>
                <th className="py-2.5 px-3 font-semibold">Urgency Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 text-[11px]">
              {filteredProjections.map((vp) => (
                <tr key={vp.vehicleId} className="hover:bg-slate-900/60 transition">
                  
                  {/* Vehicle Name */}
                  <td className="py-3 px-3 font-sans font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${vp.category === 'Electric' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      <div>
                        <div className="text-slate-100">{vp.registrationNumber}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{vp.makeModel} ({vp.category})</div>
                      </div>
                    </div>
                  </td>

                  {/* Odometer */}
                  <td className="py-3 px-3 font-black text-slate-200">
                    {vp.currentOdometerKm.toLocaleString()} km
                  </td>

                  {/* Daily KM */}
                  <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">
                    ~{vp.dailyAvgKm} km/day
                  </td>

                  {/* Service Milestone */}
                  <td className="py-3 px-3 text-cyan-300 font-bold">
                    {vp.nextServiceOdometerKm.toLocaleString()} km
                    <span className="block text-[10px] text-slate-400 font-normal">({vp.kmUntilService.toLocaleString()} km left)</span>
                  </td>

                  {/* Days Remaining & Projected Date */}
                  <td className="py-3 px-3">
                    <strong className="text-slate-200 block">{vp.daysUntilService} days</strong>
                    <span className="text-[10px] text-slate-400 font-sans">{vp.projectedDueDateStr}</span>
                  </td>

                  {/* Service Tier */}
                  <td className="py-3 px-3 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      vp.serviceTier === 'Critical Overhaul' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : vp.serviceTier === 'Major Service'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {vp.serviceTier}
                    </span>
                  </td>

                  {/* Projected Cost */}
                  <td className="py-3 px-3 font-black text-amber-400 text-xs">
                    KES {vp.estimatedCostKes.toLocaleString()}
                  </td>

                  {/* Urgency */}
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                      vp.urgencyLevel === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : vp.urgencyLevel === 'UPCOMING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {vp.urgencyLevel === 'CRITICAL' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                      <span>{vp.urgencyLevel}</span>
                    </span>
                  </td>

                </tr>
              ))}

              {filteredProjections.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No vehicles found matching the selected filter constraints.
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
