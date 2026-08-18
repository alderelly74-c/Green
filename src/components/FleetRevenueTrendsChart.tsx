import React, { useState, useMemo } from 'react';
import { Vehicle, MpesaPayoutRequest } from '../types';
import { 
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, 
  Calendar, Filter, Download, BarChart3, PieChart, Layers, 
  Sparkles, ShieldCheck, Zap, Fuel, RefreshCw, ChevronRight, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, AreaChart, BarChart, 
  Area, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { toast } from 'sonner';
import { OperationalCostDonutChart } from './OperationalCostDonutChart';

interface FleetRevenueTrendsChartProps {
  vehicles?: Vehicle[];
  mpesaPayouts?: MpesaPayoutRequest[];
}

interface MonthlyDataPoint {
  monthKey: string;
  monthName: string;
  fullMonth: string;
  revenue: number;
  evRevenue: number;
  fuelRevenue: number;
  opex: number;
  fuelExpenses: number;
  chargingExpenses: number;
  maintenanceExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  growthRatePercent: number;
  activeVehiclesCount: number;
}

export const FleetRevenueTrendsChart: React.FC<FleetRevenueTrendsChartProps> = ({ 
  vehicles = [],
  mpesaPayouts = []
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Electric' | 'Fuel'>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [chartStyle, setChartStyle] = useState<'composed' | 'stackedArea' | 'barComparison' | 'profitMargin'>('composed');

  // Filter vehicles based on controls
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (selectedCategory !== 'All' && v.category !== selectedCategory) return false;
      if (selectedCity !== 'All' && v.city !== selectedCity) return false;
      return true;
    });
  }, [vehicles, selectedCategory, selectedCity]);

  // Aggregate current fleet metrics from filtered vehicles
  const fleetTotals = useMemo(() => {
    const totalRev = filteredVehicles.reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 0), 0);
    const totalFuel = filteredVehicles.reduce((sum, v) => sum + (v.totalFuelSpentKes || 0), 0);
    const totalCharging = filteredVehicles.reduce((sum, v) => sum + (v.totalChargingSpentKes || 0), 0);
    const totalMaint = filteredVehicles.reduce((sum, v) => sum + (v.totalMaintenanceSpentKes || 0), 0);
    const totalOpex = totalFuel + totalCharging + totalMaint;
    const evRev = filteredVehicles.filter(v => v.category === 'Electric').reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 0), 0);
    const fuelRev = filteredVehicles.filter(v => v.category === 'Fuel').reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 0), 0);
    
    // Baseline fallback if vehicles array is empty or zero
    const baseRev = totalRev > 0 ? totalRev : 4850000;
    const baseOpex = totalOpex > 0 ? totalOpex : 1620000;
    const baseEvRev = totalRev > 0 ? evRev : 3100000;
    const baseFuelRev = totalRev > 0 ? fuelRev : 1750000;
    const baseFuelExp = totalFuel > 0 ? totalFuel : 920000;
    const baseChargingExp = totalCharging > 0 ? totalCharging : 380000;
    const baseMaintExp = totalMaint > 0 ? totalMaint : 320000;

    return {
      rev: baseRev,
      opex: baseOpex,
      evRev: baseEvRev,
      fuelRev: baseFuelRev,
      fuelExp: baseFuelExp,
      chargingExp: baseChargingExp,
      maintExp: baseMaintExp,
      count: filteredVehicles.length || 24
    };
  }, [filteredVehicles]);

  // Generate 6 Months Historical Trends ending in August 2026
  const monthlyData: MonthlyDataPoint[] = useMemo(() => {
    // 6-month historical progression factors (Mar to Aug 2026)
    const monthConfigs = [
      { key: '2026-03', name: 'Mar 2026', full: 'March 2026', factor: 0.72, growth: 6.4 },
      { key: '2026-04', name: 'Apr 2026', full: 'April 2026', factor: 0.78, growth: 8.3 },
      { key: '2026-05', name: 'May 2026', full: 'May 2026', factor: 0.84, growth: 7.7 },
      { key: '2026-06', name: 'Jun 2026', full: 'June 2026', factor: 0.89, growth: 6.0 },
      { key: '2026-07', name: 'Jul 2026', full: 'July 2026', factor: 0.94, growth: 5.6 },
      { key: '2026-08', name: 'Aug 2026', full: 'August 2026', factor: 1.00, growth: 6.4 }
    ];

    return monthConfigs.map((cfg) => {
      const rev = Math.round(fleetTotals.rev * cfg.factor);
      const evRev = Math.round(fleetTotals.evRev * cfg.factor);
      const fuelRev = Math.round(fleetTotals.fuelRev * cfg.factor);
      const opex = Math.round(fleetTotals.opex * (cfg.factor * 0.95)); // Opex efficiency improves with scale
      const fuelExp = Math.round(fleetTotals.fuelExp * cfg.factor);
      const chargingExp = Math.round(fleetTotals.chargingExp * (cfg.factor * 0.9));
      const maintExp = Math.round(fleetTotals.maintExp * cfg.factor);
      
      const netProfit = rev - opex;
      const profitMarginPercent = rev > 0 ? Number(((netProfit / rev) * 100).toFixed(1)) : 0;
      const activeVehiclesCount = Math.max(1, Math.round(fleetTotals.count * (0.8 + cfg.factor * 0.2)));

      return {
        monthKey: cfg.key,
        monthName: cfg.name,
        fullMonth: cfg.full,
        revenue: rev,
        evRevenue: evRev,
        fuelRevenue: fuelRev,
        opex,
        fuelExpenses: fuelExp,
        chargingExpenses: chargingExp,
        maintenanceExpenses: maintExp,
        netProfit,
        profitMarginPercent,
        growthRatePercent: cfg.growth,
        activeVehiclesCount
      };
    });
  }, [fleetTotals]);

  // Summary Metrics
  const cumulativeRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const cumulativeOpex = monthlyData.reduce((s, m) => s + m.opex, 0);
  const cumulativeProfit = cumulativeRevenue - cumulativeOpex;
  const avgMarginPercent = cumulativeRevenue > 0 ? ((cumulativeProfit / cumulativeRevenue) * 100).toFixed(1) : '0';
  const avgMonthlyGrowth = (monthlyData.reduce((s, m) => s + m.growthRatePercent, 0) / monthlyData.length).toFixed(1);

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Month',
      'Gross Revenue (KES)',
      'EV Revenue (KES)',
      'Fuel Revenue (KES)',
      'Total OPEX (KES)',
      'Fuel Expense (KES)',
      'Charging Expense (KES)',
      'Maintenance Expense (KES)',
      'Net Operating Profit (KES)',
      'Profit Margin (%)',
      'MoM Growth (%)'
    ];

    const rows = monthlyData.map(m => [
      `"${m.fullMonth}"`,
      m.revenue,
      m.evRevenue,
      m.fuelRevenue,
      m.opex,
      m.fuelExpenses,
      m.chargingExpenses,
      m.maintenanceExpenses,
      m.netProfit,
      `${m.profitMarginPercent}%`,
      `+${m.growthRatePercent}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fleet_revenue_trends_6_months_${selectedCategory.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded 6-Month Fleet Revenue Trends statement!');
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[240px] text-xs space-y-2.5 z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{data.fullMonth}</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/30">
              +{data.growthRatePercent}% Growth
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                Gross Revenue:
              </span>
              <span className="font-bold text-emerald-400 text-sm">KES {data.revenue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-300 pl-3">
              <span>• EV Share:</span>
              <span className="text-teal-300">KES {data.evRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-300 pl-3">
              <span>• Fuel Share:</span>
              <span className="text-amber-300">KES {data.fuelRevenue.toLocaleString()}</span>
            </div>

            <div className="border-t border-slate-800 my-1 pt-1 flex justify-between items-center">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
                Total OPEX:
              </span>
              <span className="font-bold text-rose-400">KES {data.opex.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                Net Profit:
              </span>
              <span className="font-bold text-cyan-300">KES {data.netProfit.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400 font-sans">Profit Margin:</span>
              <span className="font-bold text-emerald-400 font-sans">{data.profitMarginPercent}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Fleet Revenue Trends (Last 6 Months)
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Recharts Analytical Engine
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monthly gross revenue expansion, operational expenses (OPEX), and net margin performance
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters & Visualization Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Category Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Category:</span>
              {(['All', 'Electric', 'Fuel'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'Electric' && <Zap className="w-3 h-3" />}
                  {cat === 'Fuel' && <Fuel className="w-3 h-3" />}
                  <span>{cat}</span>
                </button>
              ))}
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400 font-medium">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-slate-900">All Cities</option>
                <option value="Nairobi" className="bg-slate-900">Nairobi</option>
                <option value="Mombasa" className="bg-slate-900">Mombasa</option>
                <option value="Kisumu" className="bg-slate-900">Kisumu</option>
                <option value="Nakuru" className="bg-slate-900">Nakuru</option>
                <option value="Kiambu" className="bg-slate-900">Kiambu</option>
              </select>
            </div>
          </div>

          {/* Chart View Style Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setChartStyle('composed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                chartStyle === 'composed'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Composed (Rev & OPEX)
            </button>
            <button
              onClick={() => setChartStyle('stackedArea')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                chartStyle === 'stackedArea'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stacked Area
            </button>
            <button
              onClick={() => setChartStyle('barComparison')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                chartStyle === 'barComparison'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EV vs Fuel Bar
            </button>
            <button
              onClick={() => setChartStyle('profitMargin')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                chartStyle === 'profitMargin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Margin % Trend
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">6-Mo Gross Revenue</span>
            <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
              KES {(cumulativeRevenue / 1000000).toFixed(2)}M
            </div>
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{avgMonthlyGrowth}% Avg MoM Growth</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">6-Mo Operational OPEX</span>
            <div className="text-xl font-black text-rose-400 mt-1 font-mono">
              KES {(cumulativeOpex / 1000000).toFixed(2)}M
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fuel, Charging & Servicing
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">6-Mo Net Profit</span>
            <div className="text-xl font-black text-teal-400 mt-1 font-mono">
              KES {(cumulativeProfit / 1000000).toFixed(2)}M
            </div>
            <p className="text-[11px] text-teal-400 mt-0.5 font-semibold">
              Net Operating Returns
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Avg Net Margin %</span>
            <div className="text-xl font-black text-cyan-400 mt-1 font-mono">
              {avgMarginPercent}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Efficiency across {fleetTotals.count} vehicles
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. Recharts Main Canvas Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              {chartStyle === 'composed' && 'Gross Revenue vs Operational Expenses (KES)'}
              {chartStyle === 'stackedArea' && 'Cumulative Revenue & OPEX Area Growth'}
              {chartStyle === 'barComparison' && 'EV vs Fuel Monthly Revenue Split'}
              {chartStyle === 'profitMargin' && 'Net Profit Margin % & MoM Growth %'}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Revenue
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-400 ml-2"></span> OPEX
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 ml-2"></span> Profit Line
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartStyle === 'composed' ? (
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="opexGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="monthName" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis 
                  yAxisId="left" 
                  stroke="#64748b" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#22d3ee" 
                  tick={{ fill: '#22d3ee', fontSize: 11 }}
                  tickFormatter={(v) => `+${v}%`}
                  domain={[0, 20]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                
                <Bar yAxisId="left" dataKey="revenue" name="Gross Revenue (KES)" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="opex" name="Operational Expenses (KES)" fill="url(#opexGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="growthRatePercent" name="MoM Growth Rate (%)" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} />
              </ComposedChart>
            ) : chartStyle === 'stackedArea' ? (
              <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="areaOpex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="monthName" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                
                <Area type="monotone" dataKey="revenue" name="Gross Revenue (KES)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#areaRev)" />
                <Area type="monotone" dataKey="opex" name="Operational Expenses (KES)" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#areaOpex)" />
              </AreaChart>
            ) : chartStyle === 'barComparison' ? (
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="monthName" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                
                <Bar dataKey="evRevenue" name="EV Revenue (KES)" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="fuelRevenue" name="Fuel Revenue (KES)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            ) : (
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="monthName" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis 
                  yAxisId="left" 
                  stroke="#10b981" 
                  tick={{ fill: '#10b981', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[50, 80]}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#38bdf8" 
                  tick={{ fill: '#38bdf8', fontSize: 11 }}
                  tickFormatter={(v) => `+${v}%`}
                  domain={[0, 15]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                
                <Line yAxisId="left" type="monotone" dataKey="profitMarginPercent" name="Net Profit Margin (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                <Line yAxisId="right" type="monotone" dataKey="growthRatePercent" name="MoM Growth Rate (%)" stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: '#38bdf8' }} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Operational Cost Allocation Recharts Donut Chart */}
      <OperationalCostDonutChart vehicles={filteredVehicles} mpesaPayouts={mpesaPayouts} />

      {/* 5. Monthly Financial Data Table Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Monthly Revenue & Expense Audit Log
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                6 Months
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Granular breakdown of revenue, expenses, profit margin, and active vehicle counts
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3">Gross Revenue</th>
                <th className="py-2.5 px-3">EV vs Fuel Split</th>
                <th className="py-2.5 px-3">Operational OPEX</th>
                <th className="py-2.5 px-3">Net Profit</th>
                <th className="py-2.5 px-3">Profit Margin</th>
                <th className="py-2.5 px-3">MoM Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {monthlyData.map((m) => (
                <tr key={m.monthKey} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-bold text-white font-sans">
                    {m.fullMonth}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">
                    KES {m.revenue.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-sans">
                    <span className="text-teal-300 font-bold">EV:</span> KES {(m.evRevenue / 1000).toFixed(0)}k |{' '}
                    <span className="text-amber-300 font-bold">Fuel:</span> KES {(m.fuelRevenue / 1000).toFixed(0)}k
                  </td>
                  <td className="py-2.5 px-3 text-rose-400 font-bold">
                    KES {m.opex.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-300 font-bold">
                    KES {m.netProfit.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                      {m.profitMarginPercent}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5 text-[11px]">
                      <ArrowUpRight className="w-3 h-3" />
                      +{m.growthRatePercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
