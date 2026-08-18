import React, { useState } from 'react';
import { 
  BarChart3, Zap, Fuel, TrendingUp, DollarSign, 
  ArrowUpRight, ArrowDownRight, Sparkles, Filter, 
  Download, Calculator, ShieldCheck, ChevronRight, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, ReferenceLine, CartesianGrid, Line, ComposedChart
} from 'recharts';
import { toast } from 'sonner';

export interface MonthlyProfitData {
  month: string;
  fullMonth: string;
  evNetProfit: number;
  fuelNetProfit: number;
  profitGap: number;
  evRevenue: number;
  fuelRevenue: number;
  evExpenses: number;
  fuelExpenses: number;
  evMarginPercent: number;
  fuelMarginPercent: number;
  evCostPerKm: number;
  fuelCostPerKm: number;
  notes: string;
}

// 12 Months Comparative Telemetry Data (Nairobi, Mombasa, Kisumu operational averages)
const initialMonthlyData: MonthlyProfitData[] = [
  {
    month: 'Jan',
    fullMonth: 'January 2026',
    evNetProfit: 1240000,
    fuelNetProfit: 810000,
    profitGap: 430000,
    evRevenue: 1680000,
    fuelRevenue: 1520000,
    evExpenses: 440000,
    fuelExpenses: 710000,
    evMarginPercent: 73.8,
    fuelMarginPercent: 53.2,
    evCostPerKm: 2.3,
    fuelCostPerKm: 8.4,
    notes: 'Post-holiday delivery surge; stable power grid tariffs'
  },
  {
    month: 'Feb',
    fullMonth: 'February 2026',
    evNetProfit: 1310000,
    fuelNetProfit: 830000,
    profitGap: 480000,
    evRevenue: 1750000,
    fuelRevenue: 1560000,
    evExpenses: 440000,
    fuelExpenses: 730000,
    evMarginPercent: 74.8,
    fuelMarginPercent: 53.2,
    evCostPerKm: 2.4,
    fuelCostPerKm: 8.6,
    notes: 'EV fleet expanded by 12 Roam Air units'
  },
  {
    month: 'Mar',
    fullMonth: 'March 2026',
    evNetProfit: 1390000,
    fuelNetProfit: 850000,
    profitGap: 540000,
    evRevenue: 1840000,
    fuelRevenue: 1610000,
    evExpenses: 450000,
    fuelExpenses: 760000,
    evMarginPercent: 75.5,
    fuelMarginPercent: 52.7,
    evCostPerKm: 2.2,
    fuelCostPerKm: 8.8,
    notes: 'Spiro swap stations added in Kisumu'
  },
  {
    month: 'Apr',
    fullMonth: 'April 2026',
    evNetProfit: 1420000,
    fuelNetProfit: 820000,
    profitGap: 600000,
    evRevenue: 1890000,
    fuelRevenue: 1590000,
    evExpenses: 470000,
    fuelExpenses: 770000,
    evMarginPercent: 75.1,
    fuelMarginPercent: 51.5,
    evCostPerKm: 2.4,
    fuelCostPerKm: 9.1,
    notes: 'EPRA fuel pump price increase (+4.2 KES/L)'
  },
  {
    month: 'May',
    fullMonth: 'May 2026',
    evNetProfit: 1560000,
    fuelNetProfit: 840000,
    profitGap: 720000,
    evRevenue: 2050000,
    fuelRevenue: 1650000,
    evExpenses: 490000,
    fuelExpenses: 810000,
    evMarginPercent: 76.0,
    fuelMarginPercent: 50.9,
    evCostPerKm: 2.3,
    fuelCostPerKm: 9.4,
    notes: 'Peak rainy season; EV sealed powertrains required zero maintenance'
  },
  {
    month: 'Jun',
    fullMonth: 'June 2026',
    evNetProfit: 1680000,
    fuelNetProfit: 870000,
    profitGap: 810000,
    evRevenue: 2180000,
    fuelRevenue: 1710000,
    evExpenses: 500000,
    fuelExpenses: 840000,
    evMarginPercent: 77.0,
    fuelMarginPercent: 50.8,
    evCostPerKm: 2.2,
    fuelCostPerKm: 9.5,
    notes: 'Off-peak solar battery charging subscription active'
  },
  {
    month: 'Jul',
    fullMonth: 'July 2026',
    evNetProfit: 1750000,
    fuelNetProfit: 890000,
    profitGap: 860000,
    evRevenue: 2280000,
    fuelRevenue: 1750000,
    evExpenses: 530000,
    fuelExpenses: 860000,
    evMarginPercent: 76.7,
    fuelMarginPercent: 50.8,
    evCostPerKm: 2.3,
    fuelCostPerKm: 9.6,
    notes: 'Mombasa coastal expansion route launch'
  },
  {
    month: 'Aug',
    fullMonth: 'August 2026 (Current)',
    evNetProfit: 1820000,
    fuelNetProfit: 910000,
    profitGap: 910000,
    evRevenue: 2360000,
    fuelRevenue: 1790000,
    evExpenses: 540000,
    fuelExpenses: 880000,
    evMarginPercent: 77.1,
    fuelMarginPercent: 50.8,
    evCostPerKm: 2.2,
    fuelCostPerKm: 9.7,
    notes: 'Record high net profit gap: EV generates 2x fuel net profit'
  }
];

export const EvVsFuelProfitChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'8M' | '6M' | '3M'>('8M');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [viewMetric, setViewMetric] = useState<'profit' | 'margins' | 'costPerKm'>('profit');
  const [showProfitGapLine, setShowProfitGapLine] = useState<boolean>(true);

  // Scenario simulator state
  const [transitionPercent, setTransitionPercent] = useState<number>(60);

  // Filter data according to timeRange
  const displayedData = React.useMemo(() => {
    let sliced = [...initialMonthlyData];
    if (timeRange === '6M') sliced = sliced.slice(-6);
    if (timeRange === '3M') sliced = sliced.slice(-3);

    // Apply city multiplier effect if specific city selected
    if (cityFilter === 'Nairobi') {
      return sliced.map(d => ({
        ...d,
        evNetProfit: Math.round(d.evNetProfit * 0.55),
        fuelNetProfit: Math.round(d.fuelNetProfit * 0.55),
        profitGap: Math.round(d.profitGap * 0.55),
        evRevenue: Math.round(d.evRevenue * 0.55),
        fuelRevenue: Math.round(d.fuelRevenue * 0.55)
      }));
    } else if (cityFilter === 'Mombasa') {
      return sliced.map(d => ({
        ...d,
        evNetProfit: Math.round(d.evNetProfit * 0.28),
        fuelNetProfit: Math.round(d.fuelNetProfit * 0.28),
        profitGap: Math.round(d.profitGap * 0.28),
        evRevenue: Math.round(d.evRevenue * 0.28),
        fuelRevenue: Math.round(d.fuelRevenue * 0.28)
      }));
    } else if (cityFilter === 'Kisumu') {
      return sliced.map(d => ({
        ...d,
        evNetProfit: Math.round(d.evNetProfit * 0.17),
        fuelNetProfit: Math.round(d.fuelNetProfit * 0.17),
        profitGap: Math.round(d.profitGap * 0.17),
        evRevenue: Math.round(d.evRevenue * 0.17),
        fuelRevenue: Math.round(d.fuelRevenue * 0.17)
      }));
    }

    return sliced;
  }, [timeRange, cityFilter]);

  // Totals calculations
  const totalEvProfit = displayedData.reduce((acc, d) => acc + d.evNetProfit, 0);
  const totalFuelProfit = displayedData.reduce((acc, d) => acc + d.fuelNetProfit, 0);
  const totalProfitGap = totalEvProfit - totalFuelProfit;
  const evMarginAvg = (displayedData.reduce((acc, d) => acc + d.evMarginPercent, 0) / displayedData.length).toFixed(1);
  const fuelMarginAvg = (displayedData.reduce((acc, d) => acc + d.fuelMarginPercent, 0) / displayedData.length).toFixed(1);

  // Scenario Simulator calculations:
  // Assuming converting remaining fuel fleet (e.g. 45 fuel bikes) to EV
  // Current average monthly fuel profit per bike ~ KES 25,000; EV bike profit ~ KES 52,000
  const additionalMonthlyProfitPerBike = 27000;
  const totalFuelBikesCount = 40;
  const convertedBikesCount = Math.round((transitionPercent / 100) * totalFuelBikesCount);
  const projectedMonthlyProfitGain = convertedBikesCount * additionalMonthlyProfitPerBike;
  const projectedAnnualProfitGain = projectedMonthlyProfitGain * 12;
  const projectedCo2SavingsTons = Math.round(convertedBikesCount * 2.8); // 2.8 tonnes CO2 per bike per year

  const exportCsv = () => {
    const headers = "Month,EV Net Profit (KES),Fuel Net Profit (KES),Profit Gap (KES),EV Margin %,Fuel Margin %,EV Cost/KM,Fuel Cost/KM,Key Drivers\n";
    const rows = displayedData.map(d => 
      `"${d.fullMonth}",${d.evNetProfit},${d.fuelNetProfit},${d.profitGap},${d.evMarginPercent}%,${d.fuelMarginPercent}%,KES ${d.evCostPerKm},KES ${d.fuelCostPerKm},"${d.notes.replace(/"/g, '""')}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GreenShift_EV_vs_Fuel_Profit_Trends_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Downloaded EV vs Fuel Monthly Profit Analysis CSV Report');
  };

  return (
    <div className="space-y-6">
      
      {/* MODULE HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">
                EV vs Fuel Net Profit Trends & Cost-Efficiency Gap
              </h2>
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Multi-Series Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative analysis of monthly operating profit, margins, and unit economics across Electric vs Fuel fleets.
            </p>
          </div>
        </div>

        {/* Global Controls & Download */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range */}
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs font-semibold">
            <button
              onClick={() => setTimeRange('8M')}
              className={`px-2.5 py-1 rounded-md transition ${timeRange === '8M' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              8 Months
            </button>
            <button
              onClick={() => setTimeRange('6M')}
              className={`px-2.5 py-1 rounded-md transition ${timeRange === '6M' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeRange('3M')}
              className={`px-2.5 py-1 rounded-md transition ${timeRange === '3M' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              Q2/Q3
            </button>
          </div>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Cities (Aggregate)</option>
            <option value="Nairobi">Nairobi Metropolitan</option>
            <option value="Mombasa">Mombasa Hub</option>
            <option value="Kisumu">Kisumu Region</option>
          </select>

          <button
            onClick={exportCsv}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total EV Profit */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-lg hover:border-emerald-500/60 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>EV Net Profit ({timeRange})</span>
            </span>
            <span className="text-emerald-400 text-[10px] bg-emerald-500/20 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
              {evMarginAvg}% Margin
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-2">
            KES {totalEvProfit.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">+61.8%</span> higher than Fuel Fleet
          </p>
        </div>

        {/* Total Fuel Profit */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-lg hover:border-amber-500/60 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Fuel className="w-4 h-4 text-amber-400" />
              <span>Fuel Net Profit ({timeRange})</span>
            </span>
            <span className="text-amber-400 text-[10px] bg-amber-500/20 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
              {fuelMarginAvg}% Margin
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-2">
            KES {totalFuelProfit.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Impacted by petrol prices & higher maintenance
          </p>
        </div>

        {/* Profit Efficiency Gap */}
        <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 shadow-lg hover:border-cyan-500/60 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Cumulative Profit Gap</span>
            </span>
            <span className="text-cyan-400 text-[10px] bg-cyan-500/20 font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
              Net Gain
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono mt-2">
            KES {totalProfitGap.toLocaleString()}
          </div>
          <p className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Extra net profit earned by EV transition
          </p>
        </div>

        {/* Cost per KM Efficiency */}
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-4 shadow-lg hover:border-indigo-500/60 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              <span>Avg Cost / KM Gap</span>
            </span>
            <span className="text-indigo-300 text-[10px] bg-indigo-500/20 font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">
              -75% Cost
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-300 font-mono mt-2">
            KES 2.3 vs 9.1
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            KES <strong className="text-emerald-400">6.8 / km saved</strong> in energy & maintenance
          </p>
        </div>

      </div>

      {/* MAIN MULTI-SERIES BAR CHART BOARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        
        {/* Chart Header & View Mode Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-emerald-400" />
              <span>Monthly Net Profit Trends (EV vs Fuel Fleet)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-series comparison showing net profit divergence and cost-efficiency gap expansion
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Metric Mode Switcher */}
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs font-semibold">
              <button
                onClick={() => setViewMetric('profit')}
                className={`px-3 py-1 rounded-md transition ${viewMetric === 'profit' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
              >
                Net Profit (KES)
              </button>
              <button
                onClick={() => setViewMetric('margins')}
                className={`px-3 py-1 rounded-md transition ${viewMetric === 'margins' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
              >
                Profit Margin (%)
              </button>
              <button
                onClick={() => setViewMetric('costPerKm')}
                className={`px-3 py-1 rounded-md transition ${viewMetric === 'costPerKm' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
              >
                Cost / KM (KES)
              </button>
            </div>

            {/* Toggle Gap Line */}
            {viewMetric === 'profit' && (
              <button
                onClick={() => setShowProfitGapLine(!showProfitGapLine)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5 ${
                  showProfitGapLine 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{showProfitGapLine ? 'Gap Series Active' : 'Show Profit Gap'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Recharts Bar/Composed Chart Container */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {viewMetric === 'profit' ? (
              <ComposedChart data={displayedData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = displayedData.find(d => d.month === label);
                      if (!item) return null;

                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-60">
                          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{item.fullMonth}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded font-mono">
                              {item.notes.slice(0, 28)}...
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-emerald-400 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                EV Net Profit:
                              </span>
                              <strong className="font-mono">KES {item.evNetProfit.toLocaleString()} ({item.evMarginPercent}%)</strong>
                            </div>

                            <div className="flex items-center justify-between text-amber-400 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                Fuel Net Profit:
                              </span>
                              <strong className="font-mono">KES {item.fuelNetProfit.toLocaleString()} ({item.fuelMarginPercent}%)</strong>
                            </div>

                            <div className="flex items-center justify-between text-cyan-300 font-bold pt-1 border-t border-slate-800">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                Net Profit Gap:
                              </span>
                              <strong className="font-mono text-cyan-400">+KES {item.profitGap.toLocaleString()}</strong>
                            </div>
                          </div>

                          <div className="bg-slate-900 p-2 rounded text-[11px] text-slate-300 space-y-0.5">
                            <div className="flex justify-between">
                              <span>EV Energy/Maint:</span>
                              <span className="text-emerald-400 font-mono">KES {item.evExpenses.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fuel Pump/Maint:</span>
                              <span className="text-amber-400 font-mono">KES {item.fuelExpenses.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  formatter={(value) => {
                    if (value === 'evNetProfit') return <span className="text-emerald-400 font-bold">Electric Vehicles Net Profit</span>;
                    if (value === 'fuelNetProfit') return <span className="text-amber-400 font-bold">Fuel Vehicles Net Profit</span>;
                    if (value === 'profitGap') return <span className="text-cyan-300 font-bold">Cost-Efficiency Profit Gap</span>;
                    return value;
                  }}
                />
                <ReferenceLine 
                  y={1000000} 
                  stroke="#334155" 
                  strokeDasharray="3 3" 
                  label={{ value: "KES 1M Target", fill: "#64748b", fontSize: 10, position: "right" }} 
                />

                <Bar dataKey="evNetProfit" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="fuelNetProfit" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                
                {showProfitGapLine && (
                  <Line 
                    type="monotone" 
                    dataKey="profitGap" 
                    stroke="#06b6d4" 
                    strokeWidth={3} 
                    dot={{ fill: '#06b6d4', r: 4 }} 
                  />
                )}
              </ComposedChart>
            ) : viewMetric === 'margins' ? (
              <BarChart data={displayedData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = displayedData.find(d => d.month === label);
                      if (!item) return null;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                          <p className="font-bold text-white">{item.fullMonth}</p>
                          <p className="text-emerald-400 font-bold">EV Margin: {item.evMarginPercent}%</p>
                          <p className="text-amber-400 font-bold">Fuel Margin: {item.fuelMarginPercent}%</p>
                          <p className="text-cyan-300 font-mono">Margin Delta: +{(item.evMarginPercent - item.fuelMarginPercent).toFixed(1)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Bar dataKey="evMarginPercent" name="EV Net Margin %" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Bar dataKey="fuelMarginPercent" name="Fuel Net Margin %" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            ) : (
              <BarChart data={displayedData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" KES" domain={[0, 15]} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = displayedData.find(d => d.month === label);
                      if (!item) return null;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                          <p className="font-bold text-white">{item.fullMonth}</p>
                          <p className="text-emerald-400 font-bold">EV Energy + Maint / KM: KES {item.evCostPerKm}</p>
                          <p className="text-amber-400 font-bold">Fuel Pump + Maint / KM: KES {item.fuelCostPerKm}</p>
                          <p className="text-emerald-300 font-mono">Savings: KES {(item.fuelCostPerKm - item.evCostPerKm).toFixed(1)} / KM</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Bar dataKey="evCostPerKm" name="EV Energy & Maint Cost / KM" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Bar dataKey="fuelCostPerKm" name="Fuel Pump & Maint Cost / KM" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* TWO COLUMN SECTION: INTERACTIVE SCENARIO SIMULATOR VS EXECUTIVE MANAGEMENT TAKEAWAYS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* FLEET TRANSITION & PROFIT SIMULATOR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Management Fleet Transition Simulator</h3>
              <p className="text-xs text-slate-400">Model the impact of replacing remaining fuel bikes with Electric Vehicles</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Fuel-to-EV Replacement Target (% of Remaining Fuel Bikes):</span>
                <span className="text-emerald-400 font-mono text-sm">{transitionPercent}% ({convertedBikesCount} / 40 Bikes)</span>
              </div>
              
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={transitionPercent} 
                onChange={(e) => setTransitionPercent(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer bg-slate-950 rounded-lg h-2"
              />
              
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>10% (4 Bikes)</span>
                <span>50% (20 Bikes)</span>
                <span>100% Full Transition (40 Bikes)</span>
              </div>
            </div>

            {/* Simulated Gain Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Projected Monthly Profit Lift</span>
                <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                  +KES {projectedMonthlyProfitGain.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  +KES {(projectedAnnualProfitGain / 1000000).toFixed(2)}M annual cashflow gain
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Environmental Impact</span>
                <div className="text-xl font-black text-indigo-300 font-mono mt-1">
                  -{projectedCo2SavingsTons} Tonnes CO₂
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Annual carbon offset reduction
                </span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Unit Economic Rationale:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Replacing 1 fuel motorcycle saving ~KES 27,000/month in net margin yields an estimated payback period of <strong>9.6 months</strong> on a new Roam Air or Spiro Equator bike (costing ~KES 260,000).
              </p>
            </div>
          </div>
        </div>

        {/* MANAGEMENT INSIGHTS & COST-EFFICIENCY DRIVERS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Management Analysis & Key Takeaways</h3>
              <p className="text-xs text-slate-400">Core drivers behind the EV cost-efficiency advantage</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white text-xs block">75% Reduction in Energy Expenditure</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Electric motorcycles consume ~KES 2.3/km in battery battery swap or charging vs Petrol at KES 9.4/km (KES 212/L pump price in Kenya).
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white text-xs block">Zero Fuel Theft & Siphoning Leakage</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Fuel motorcycles lose an estimated 4-6% of operating budget to driver fuel siphoning and unverified receipts. EV battery telemetry guarantees 100% audit accuracy.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white text-xs block">Lower Maintenance & Powertrain Downtime</strong>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  No oil changes, spark plugs, or clutch replacements. EV scheduled servicing costs average KES 3,500/month compared to KES 8,200/month for fuel engines.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* DETAILED MONTHLY BREAKDOWN DATA TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4.5 h-4.5 text-emerald-400" />
              <span>Monthly Telemetry & Profit Variance Data Table</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Granular breakdown of net profits, revenue, expenses, and operational notes
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Showing {displayedData.length} Months
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="py-3 px-3">Month</th>
                <th className="py-3 px-3">EV Net Profit</th>
                <th className="py-3 px-3">Fuel Net Profit</th>
                <th className="py-3 px-3">Profit Gap (Delta)</th>
                <th className="py-3 px-3">EV Margin</th>
                <th className="py-3 px-3">Fuel Margin</th>
                <th className="py-3 px-3">EV Cost / KM</th>
                <th className="py-3 px-3">Fuel Cost / KM</th>
                <th className="py-3 px-3">Operational Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {row.fullMonth}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    KES {row.evNetProfit.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-amber-400">
                    KES {row.fuelNetProfit.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-cyan-300 bg-cyan-950/30">
                    +KES {row.profitGap.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-emerald-300">
                    {row.evMarginPercent}%
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-amber-300">
                    {row.fuelMarginPercent}%
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-400">
                    KES {row.evCostPerKm}
                  </td>
                  <td className="py-3 px-3 font-mono text-red-400">
                    KES {row.fuelCostPerKm}
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                    {row.notes}
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
