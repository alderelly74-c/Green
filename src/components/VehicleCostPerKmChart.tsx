import React, { useState, useMemo } from 'react';
import { Vehicle, MaintenanceWorkOrder, VehicleType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Cell, ComposedChart, Line
} from 'recharts';
import { 
  BarChart3, TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, 
  DollarSign, Gauge, Filter, Zap, Fuel, ArrowUpRight, Search, 
  Sliders, AlertTriangle, ArrowUpDown, Info, Sparkles, Scale
} from 'lucide-react';
import { toast } from 'sonner';

interface VehicleCostPerKmChartProps {
  vehicles?: Vehicle[];
  workOrders?: MaintenanceWorkOrder[];
}

// Projected baseline service cost per kilometer (KES/km) by vehicle type in East Africa
export const PROJECTED_COST_PER_KM_BASELINE: Record<VehicleType | string, number> = {
  'Electric Motorcycle': 0.15,
  'Fuel Motorcycle': 0.38,
  'Electric Bicycle': 0.08,
  'Electric Scooter': 0.12,
  'Electric Car': 0.35,
  'Petrol Car': 0.75,
  'Diesel Car': 0.85,
  'SUV': 1.10,
  'Van': 1.25,
  'Commercial Truck': 2.10,
};

export interface VehicleCpkmMetric {
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  type: VehicleType;
  category: 'Electric' | 'Fuel';
  city: string;
  odometerKm: number;
  actualMaintenanceCostKes: number;
  projectedServiceCostKes: number;
  actualCpkmKes: number;
  projectedCpkmKes: number;
  varianceKes: number; // actual - projected
  variancePercent: number; // ((actual - projected) / projected) * 100
  costStatus: 'UNDER_BUDGET' | 'ON_TARGET' | 'OVER_BUDGET';
  workOrdersCount: number;
  primaryExpenseReason: string;
}

export const VehicleCostPerKmChart: React.FC<VehicleCostPerKmChartProps> = ({
  vehicles = [],
  workOrders = []
}) => {
  // View mode state
  const [viewMetric, setViewMetric] = useState<'CPKM_RATE' | 'TOTAL_EXPENSE'>('CPKM_RATE');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Electric' | 'Fuel'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'HIGHEST_CPKM' | 'HIGHEST_VARIANCE' | 'MOST_KM' | 'LOWEST_CPKM'>('HIGHEST_CPKM');

  // Compute Per-Vehicle Cost-per-Kilometer dataset
  const cpkmData = useMemo<VehicleCpkmMetric[]>(() => {
    if (!vehicles || vehicles.length === 0) return [];

    return vehicles.map(v => {
      // Find completed or scheduled work orders for this vehicle
      const vehicleWorkOrders = workOrders.filter(w => w.vehicleId === v.id || w.vehicleReg === v.registrationNumber);
      const woTotalCost = vehicleWorkOrders.reduce((sum, wo) => sum + wo.totalCostKes, 0);

      // Actual maintenance cost (from work orders or vehicle property fallback)
      const actualMaintenanceCostKes = woTotalCost > 0 
        ? woTotalCost 
        : (v.totalMaintenanceSpentKes || 0);

      const odometerKm = Math.max(100, v.odometerKm || 0);

      // Baseline projected cost rate per km for this vehicle type
      const projectedCpkmKes = PROJECTED_COST_PER_KM_BASELINE[v.type] || 
        (v.category === 'Electric' ? 0.20 : 0.60);

      // Total projected service cost
      const projectedServiceCostKes = Math.round(odometerKm * projectedCpkmKes);

      // Actual Cost-per-Kilometer (KES/km)
      const actualCpkmKes = Math.round((actualMaintenanceCostKes / odometerKm) * 100) / 100;

      // Variance
      const varianceKes = Math.round((actualCpkmKes - projectedCpkmKes) * 100) / 100;
      const variancePercent = projectedCpkmKes > 0 
        ? Math.round(((actualCpkmKes - projectedCpkmKes) / projectedCpkmKes) * 100)
        : 0;

      // Cost Status Determination
      let costStatus: 'UNDER_BUDGET' | 'ON_TARGET' | 'OVER_BUDGET' = 'ON_TARGET';
      if (variancePercent <= -5) {
        costStatus = 'UNDER_BUDGET';
      } else if (variancePercent >= 10) {
        costStatus = 'OVER_BUDGET';
      }

      // Infer primary expense reason
      let primaryExpenseReason = 'Routine preventive service';
      if (vehicleWorkOrders.length > 0) {
        const highestWo = [...vehicleWorkOrders].sort((a, b) => b.totalCostKes - a.totalCostKes)[0];
        primaryExpenseReason = `${highestWo.serviceType} (${highestWo.workshopName || 'Garage'})`;
      } else if (v.category === 'Electric') {
        primaryExpenseReason = 'Routine drivetrain check & brake pad wear';
      } else {
        primaryExpenseReason = 'Engine oil change & spark plug replacement';
      }

      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        makeModel: `${v.make} ${v.model}`,
        type: v.type,
        category: v.category,
        city: v.city,
        odometerKm,
        actualMaintenanceCostKes,
        projectedServiceCostKes,
        actualCpkmKes,
        projectedCpkmKes,
        varianceKes,
        variancePercent,
        costStatus,
        workOrdersCount: vehicleWorkOrders.length,
        primaryExpenseReason
      };
    });
  }, [vehicles, workOrders]);

  // Overall Fleet KPI Aggregations
  const fleetTotals = useMemo(() => {
    if (cpkmData.length === 0) {
      return {
        totalActualSpent: 0,
        totalProjectedSpent: 0,
        totalKmDriven: 0,
        avgActualCpkm: 0,
        avgProjectedCpkm: 0,
        overallVariancePercent: 0,
        mostEfficientVehicle: null,
        highestCpkmOutlier: null,
        overBudgetCount: 0,
        underBudgetCount: 0,
      };
    }

    const totalActualSpent = cpkmData.reduce((acc, d) => acc + d.actualMaintenanceCostKes, 0);
    const totalProjectedSpent = cpkmData.reduce((acc, d) => acc + d.projectedServiceCostKes, 0);
    const totalKmDriven = cpkmData.reduce((acc, d) => acc + d.odometerKm, 0);

    const avgActualCpkm = totalKmDriven > 0 ? Number((totalActualSpent / totalKmDriven).toFixed(2)) : 0;
    const avgProjectedCpkm = totalKmDriven > 0 ? Number((totalProjectedSpent / totalKmDriven).toFixed(2)) : 0;

    const overallVariancePercent = avgProjectedCpkm > 0
      ? Math.round(((avgActualCpkm - avgProjectedCpkm) / avgProjectedCpkm) * 100)
      : 0;

    const sortedByCpkm = [...cpkmData].sort((a, b) => a.actualCpkmKes - b.actualCpkmKes);
    const mostEfficientVehicle = sortedByCpkm[0] || null;
    const highestCpkmOutlier = sortedByCpkm[sortedByCpkm.length - 1] || null;

    const overBudgetCount = cpkmData.filter(d => d.costStatus === 'OVER_BUDGET').length;
    const underBudgetCount = cpkmData.filter(d => d.costStatus === 'UNDER_BUDGET').length;

    return {
      totalActualSpent,
      totalProjectedSpent,
      totalKmDriven,
      avgActualCpkm,
      avgProjectedCpkm,
      overallVariancePercent,
      mostEfficientVehicle,
      highestCpkmOutlier,
      overBudgetCount,
      underBudgetCount,
    };
  }, [cpkmData]);

  // EV vs Fuel comparative CPKM
  const evVsFuelStats = useMemo(() => {
    const evs = cpkmData.filter(d => d.category === 'Electric');
    const fuels = cpkmData.filter(d => d.category === 'Fuel');

    const evKm = evs.reduce((sum, d) => sum + d.odometerKm, 0);
    const evSpent = evs.reduce((sum, d) => sum + d.actualMaintenanceCostKes, 0);
    const evAvgCpkm = evKm > 0 ? (evSpent / evKm).toFixed(2) : '0.00';

    const fuelKm = fuels.reduce((sum, d) => sum + d.odometerKm, 0);
    const fuelSpent = fuels.reduce((sum, d) => sum + d.actualMaintenanceCostKes, 0);
    const fuelAvgCpkm = fuelKm > 0 ? (fuelSpent / fuelKm).toFixed(2) : '0.00';

    const savingsPercent = Number(fuelAvgCpkm) > 0 
      ? Math.round(((Number(fuelAvgCpkm) - Number(evAvgCpkm)) / Number(fuelAvgCpkm)) * 100)
      : 0;

    return {
      evAvgCpkm,
      fuelAvgCpkm,
      savingsPercent,
      evCount: evs.length,
      fuelCount: fuels.length
    };
  }, [cpkmData]);

  // Filtered and Sorted list for chart & table
  const filteredData = useMemo(() => {
    return cpkmData.filter(d => {
      if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
      if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          d.registrationNumber.toLowerCase().includes(q) ||
          d.makeModel.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'HIGHEST_CPKM') return b.actualCpkmKes - a.actualCpkmKes;
      if (sortBy === 'LOWEST_CPKM') return a.actualCpkmKes - b.actualCpkmKes;
      if (sortBy === 'HIGHEST_VARIANCE') return b.variancePercent - a.variancePercent;
      if (sortBy === 'MOST_KM') return b.odometerKm - a.odometerKm;
      return 0;
    });
  }, [cpkmData, categoryFilter, typeFilter, searchQuery, sortBy]);

  // Chart data transformation
  const chartData = useMemo(() => {
    return filteredData.map(d => ({
      name: d.registrationNumber,
      makeModel: d.makeModel,
      category: d.category,
      type: d.type,
      odometerKm: d.odometerKm,
      actualCpkm: d.actualCpkmKes,
      projectedCpkm: d.projectedCpkmKes,
      actualCostKes: d.actualMaintenanceCostKes,
      projectedCostKes: d.projectedServiceCostKes,
      variancePercent: d.variancePercent,
      costStatus: d.costStatus
    }));
  }, [filteredData]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white tracking-tight">
                Vehicle Cost-per-Kilometer (CPKM) Analysis
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                Actual vs Projected Benchmarks
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Calculates actual maintenance expenses per kilometer against projected factory service baselines to isolate over-budget outliers and quantify EV maintenance savings.
            </p>
          </div>
        </div>

        {/* EV vs Fuel Maintenance Efficiency Badge */}
        <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3 shrink-0 self-stretch sm:self-auto">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">EV Maintenance Advantage</span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-sm font-black text-emerald-400">
                KES {evVsFuelStats.evAvgCpkm}/km
              </span>
              <span className="text-slate-500 text-[10px]">vs KES {evVsFuelStats.fuelAvgCpkm}/km Fuel</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold block">
              ⚡ {evVsFuelStats.savingsPercent}% lower service cost per km
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Fleet Avg Actual CPKM */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Fleet Avg Actual CPKM</span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              KES {fleetTotals.avgActualCpkm}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono">/ km</span>
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            Across {fleetTotals.totalKmDriven.toLocaleString()} total logged km
          </p>
        </div>

        {/* KPI 2: Fleet Avg Projected CPKM */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Projected Service CPKM</span>
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-300 font-mono">
              KES {fleetTotals.avgProjectedCpkm}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono">/ km</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <span className={fleetTotals.overallVariancePercent <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {fleetTotals.overallVariancePercent <= 0 ? '▼' : '▲'} {Math.abs(fleetTotals.overallVariancePercent)}% {fleetTotals.overallVariancePercent <= 0 ? 'Under Projected Budget' : 'Over Projected Budget'}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Maintenance Cost Variance */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Total Maintenance Spent</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              KES {fleetTotals.totalActualSpent.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            vs KES {fleetTotals.totalProjectedSpent.toLocaleString()} Projected
          </p>
        </div>

        {/* KPI 4: Top Outlier vs Most Efficient */}
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <span>Highest CPKM Outlier</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-black text-white font-mono truncate">
              {fleetTotals.highestCpkmOutlier ? fleetTotals.highestCpkmOutlier.registrationNumber : 'None'}
            </span>
            <span className="text-sm font-black text-amber-400 font-mono">
              {fleetTotals.highestCpkmOutlier ? `KES ${fleetTotals.highestCpkmOutlier.actualCpkmKes}/km` : '-'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {fleetTotals.highestCpkmOutlier ? fleetTotals.highestCpkmOutlier.primaryExpenseReason : 'All vehicles within baseline'}
          </p>
        </div>

      </div>

      {/* Filter & View Mode Controls Toolbar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left: View Metric Toggle & Category Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Metric Toggle */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setViewMetric('CPKM_RATE')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewMetric === 'CPKM_RATE'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Cost-per-Km (KES/km)</span>
            </button>

            <button
              onClick={() => setViewMetric('TOTAL_EXPENSE')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewMetric === 'TOTAL_EXPENSE'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Total Expense (KES)</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs">
            {(['ALL', 'Electric', 'Fuel'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                  categoryFilter === cat
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'Electric' && <Zap className="w-3 h-3 text-emerald-400" />}
                {cat === 'Fuel' && <Fuel className="w-3 h-3 text-amber-400" />}
                <span>{cat === 'ALL' ? 'All Drivetrains' : cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search Input & Sort Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reg number, make..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="HIGHEST_CPKM">Sort: Highest CPKM Rate</option>
              <option value="LOWEST_CPKM">Sort: Lowest CPKM (Most Efficient)</option>
              <option value="HIGHEST_VARIANCE">Sort: Highest Variance %</option>
              <option value="MOST_KM">Sort: Most Km Driven</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main Recharts Visual Section */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>
              {viewMetric === 'CPKM_RATE' 
                ? 'Actual vs Projected Maintenance Cost per Kilometer (KES / km)' 
                : 'Actual Maintenance Expense vs Projected Service Budget (KES)'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              <span className="text-slate-300 font-semibold">Actual Maintenance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
              <span className="text-slate-300 font-semibold">Projected Baseline</span>
            </div>
          </div>
        </div>

        {/* Chart Render Area */}
        <div className="h-[340px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={11}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
              />

              <YAxis 
                stroke="#64748b" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => viewMetric === 'CPKM_RATE' ? `KES ${val}` : `KES ${(val/1000).toFixed(0)}k`}
              />

              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 max-w-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-extrabold text-white text-sm">{data.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            data.category === 'Electric' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {data.category} ({data.type})
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-300 text-[11px] font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Odometer Reading:</span>
                            <span className="font-bold text-white">{data.odometerKm.toLocaleString()} km</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Actual Expense:</span>
                            <span className="font-bold text-emerald-400">KES {data.actualCostKes.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Projected Budget:</span>
                            <span className="font-bold text-indigo-300">KES {data.projectedCostKes.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between border-t border-slate-800 pt-1">
                            <span className="text-slate-400">Actual Cost / Km:</span>
                            <span className="font-bold text-emerald-400">KES {data.actualCpkm} / km</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Projected Baseline:</span>
                            <span className="font-bold text-indigo-300">KES {data.projectedCpkm} / km</span>
                          </div>

                          <div className="flex justify-between font-bold">
                            <span className="text-slate-400">Budget Variance:</span>
                            <span className={data.variancePercent <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {data.variancePercent <= 0 ? '' : '+'}{data.variancePercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Line for Fleet Target CPKM */}
              {viewMetric === 'CPKM_RATE' && (
                <ReferenceLine 
                  y={fleetTotals.avgProjectedCpkm} 
                  stroke="#818cf8" 
                  strokeDasharray="4 4" 
                  label={{ value: `Fleet Target: KES ${fleetTotals.avgProjectedCpkm}/km`, fill: '#818cf8', fontSize: 10, position: 'top' }} 
                />
              )}

              {/* Actual Cost Bar */}
              <Bar 
                dataKey={viewMetric === 'CPKM_RATE' ? 'actualCpkm' : 'actualCostKes'} 
                name="Actual Cost"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-act-${index}`} 
                    fill={entry.costStatus === 'OVER_BUDGET' ? '#f43f5e' : entry.category === 'Electric' ? '#10b981' : '#f59e0b'} 
                  />
                ))}
              </Bar>

              {/* Projected Baseline Bar */}
              <Bar 
                dataKey={viewMetric === 'CPKM_RATE' ? 'projectedCpkm' : 'projectedCostKes'} 
                name="Projected Service Baseline" 
                fill="#6366f1" 
                opacity={0.65}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Per-Vehicle Cost-per-Kilometer Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Per-Vehicle CPKM Detailed Breakdown Table</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            Showing {filteredData.length} of {cpkmData.length} vehicles
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/90">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Vehicle Reg & Model</th>
                <th className="py-3 px-4">Drivetrain</th>
                <th className="py-3 px-4 text-right">Odometer (Km)</th>
                <th className="py-3 px-4 text-right">Actual Expense (KES)</th>
                <th className="py-3 px-4 text-right">Projected Budget (KES)</th>
                <th className="py-3 px-4 text-right">Actual CPKM</th>
                <th className="py-3 px-4 text-right">Projected CPKM</th>
                <th className="py-3 px-4 text-right">Variance (%)</th>
                <th className="py-3 px-4 text-center">Cost Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium">
              {filteredData.map(item => {
                const isOver = item.costStatus === 'OVER_BUDGET';
                const isUnder = item.costStatus === 'UNDER_BUDGET';

                return (
                  <tr key={item.vehicleId} className="hover:bg-slate-900/60 transition-colors">
                    
                    {/* Vehicle Reg & Model */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-mono font-bold text-white text-xs block">{item.registrationNumber}</span>
                        <span className="text-[10px] text-slate-400">{item.makeModel}</span>
                      </div>
                    </td>

                    {/* Drivetrain Badge */}
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        item.category === 'Electric'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {item.category === 'Electric' ? <Zap className="w-3 h-3 text-emerald-400" /> : <Fuel className="w-3 h-3 text-amber-400" />}
                        <span>{item.type}</span>
                      </span>
                    </td>

                    {/* Odometer */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                      {item.odometerKm.toLocaleString()} km
                    </td>

                    {/* Actual Maintenance Expense */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      KES {item.actualMaintenanceCostKes.toLocaleString()}
                    </td>

                    {/* Projected Service Cost */}
                    <td className="py-3 px-4 text-right font-mono text-indigo-300 font-semibold">
                      KES {item.projectedServiceCostKes.toLocaleString()}
                    </td>

                    {/* Actual CPKM */}
                    <td className="py-3 px-4 text-right font-mono font-black text-white text-xs">
                      KES {item.actualCpkmKes} / km
                    </td>

                    {/* Projected CPKM */}
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      KES {item.projectedCpkmKes} / km
                    </td>

                    {/* Variance % */}
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={item.variancePercent <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {item.variancePercent <= 0 ? '' : '+'}{item.variancePercent}%
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {isUnder ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Under Budget</span>
                        </span>
                      ) : isOver ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Over Budget</span>
                        </span>
                      ) : (
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Scale className="w-3 h-3 text-indigo-400" />
                          <span>On Target</span>
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
  );
};
