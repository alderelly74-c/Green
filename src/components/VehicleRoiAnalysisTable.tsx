import React, { useState, useMemo } from 'react';
import { Vehicle } from '../types';
import { 
  Calculator, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, 
  Search, Filter, Download, Zap, Fuel, ShieldCheck, CheckCircle2, 
  AlertCircle, HelpCircle, Layers, PieChart, Sparkles, RefreshCw,
  LineChart as LineChartIcon, Sliders, Calendar, ArrowRight, ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, Bar, XAxis, YAxis, 
  Tooltip, Legend, ReferenceLine, CartesianGrid 
} from 'recharts';
import { toast } from 'sonner';

interface VehicleRoiAnalysisTableProps {
  vehicles?: Vehicle[];
}

export interface VehicleRoiData {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  category: 'Electric' | 'Fuel';
  city: string;
  purchasePriceKes: number;
  totalFuelSpentKes: number;
  totalChargingSpentKes: number;
  totalMaintenanceSpentKes: number;
  totalOpexKes: number;
  tcoKes: number; // Purchase Price + OPEX
  totalRevenueGeneratedKes: number;
  netOperatingProfitKes: number; // Revenue - OPEX
  netCashflowKes: number; // Revenue - TCO
  roiPercent: number; // (Net Profit / Purchase Price) * 100
  paybackProgressPercent: number; // Min(100, (Net Profit / Purchase Price) * 100)
  status: 'Capital Recovered' | 'In Payback' | 'Operating Loss';
  assignedDriverName?: string;
}

export const VehicleRoiAnalysisTable: React.FC<VehicleRoiAnalysisTableProps> = ({
  vehicles = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Electric' | 'Fuel'>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'roi' | 'revenue' | 'tco' | 'profit' | 'purchasePrice'>('roi');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ROI Projections & Depreciation Controls State
  const [projectionScope, setProjectionScope] = useState<string>('All');
  const [annualDepreciationRate, setAnnualDepreciationRate] = useState<number>(15); // 15% annual straight-line
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState<number>(0); // 0% growth baseline

  // Compute detailed ROI metrics per vehicle
  const roiList = useMemo<VehicleRoiData[]>(() => {
    // If empty or initial fallback, ensure we provide sample vehicle calculations if vehicles array is empty
    const sourceVehicles = vehicles.length > 0 ? vehicles : [
      {
        id: 'v1', registrationNumber: 'KMG 482E', make: 'Roam', model: 'Air', category: 'Electric', city: 'Nairobi',
        purchasePriceKes: 240000, totalFuelSpentKes: 0, totalChargingSpentKes: 38000, totalMaintenanceSpentKes: 18000,
        totalRevenueGeneratedKes: 480000, assignedDriverName: 'Kamau Otieno'
      },
      {
        id: 'v2', registrationNumber: 'KDH 102B', make: 'TVS', model: 'HLX 150', category: 'Fuel', city: 'Nairobi',
        purchasePriceKes: 195000, totalFuelSpentKes: 142000, totalChargingSpentKes: 0, totalMaintenanceSpentKes: 45000,
        totalRevenueGeneratedKes: 390000, assignedDriverName: 'Benson Mutua'
      },
      {
        id: 'v3', registrationNumber: 'KMF 910E', make: 'Spiro', model: 'Commuto', category: 'Electric', city: 'Mombasa',
        purchasePriceKes: 220000, totalFuelSpentKes: 0, totalChargingSpentKes: 32000, totalMaintenanceSpentKes: 14000,
        totalRevenueGeneratedKes: 410000, assignedDriverName: 'Hassan Juma'
      },
      {
        id: 'v4', registrationNumber: 'KDG 554C', make: 'Boxer', model: 'BM 150', category: 'Fuel', city: 'Kisumu',
        purchasePriceKes: 185000, totalFuelSpentKes: 158000, totalChargingSpentKes: 0, totalMaintenanceSpentKes: 52000,
        totalRevenueGeneratedKes: 340000, assignedDriverName: 'Ochieng Odhiambo'
      },
      {
        id: 'v5', registrationNumber: 'KMG 771E', make: 'BYD', model: 'Atto 3', category: 'Electric', city: 'Nairobi',
        purchasePriceKes: 3800000, totalFuelSpentKes: 0, totalChargingSpentKes: 210000, totalMaintenanceSpentKes: 85000,
        totalRevenueGeneratedKes: 5200000, assignedDriverName: 'David Waweru'
      }
    ] as any[];

    return sourceVehicles.map(v => {
      const purchasePrice = v.purchasePriceKes || (v.category === 'Electric' ? 240000 : 190000);
      const fuel = v.totalFuelSpentKes || 0;
      const charging = v.totalChargingSpentKes || 0;
      const maint = v.totalMaintenanceSpentKes || 0;
      const opex = fuel + charging + maint;
      const tco = purchasePrice + opex;
      const rev = v.totalRevenueGeneratedKes || 0;
      const netProfit = rev - opex;
      const netCashflow = rev - tco;

      const roi = purchasePrice > 0 ? ((netProfit / purchasePrice) * 100) : 0;
      const paybackProgress = Math.min(100, Math.max(0, (netProfit / purchasePrice) * 100));

      let status: 'Capital Recovered' | 'In Payback' | 'Operating Loss' = 'In Payback';
      if (netProfit >= purchasePrice) {
        status = 'Capital Recovered';
      } else if (netProfit < 0) {
        status = 'Operating Loss';
      }

      return {
        id: v.id,
        registrationNumber: v.registrationNumber,
        make: v.make,
        model: v.model,
        category: v.category,
        city: v.city,
        purchasePriceKes: purchasePrice,
        totalFuelSpentKes: fuel,
        totalChargingSpentKes: charging,
        totalMaintenanceSpentKes: maint,
        totalOpexKes: opex,
        tcoKes: tco,
        totalRevenueGeneratedKes: rev,
        netOperatingProfitKes: netProfit,
        netCashflowKes: netCashflow,
        roiPercent: Number(roi.toFixed(1)),
        paybackProgressPercent: Number(paybackProgress.toFixed(1)),
        status,
        assignedDriverName: v.assignedDriverName
      };
    });
  }, [vehicles]);

  // Filter & Sort
  const filteredVehicles = useMemo(() => {
    return roiList.filter(item => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (cityFilter !== 'All' && item.city !== cityFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchReg = item.registrationNumber.toLowerCase().includes(query);
        const matchMake = item.make.toLowerCase().includes(query);
        const matchModel = item.model.toLowerCase().includes(query);
        const matchDriver = item.assignedDriverName?.toLowerCase().includes(query);
        if (!matchReg && !matchMake && !matchModel && !matchDriver) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'roi') { valA = a.roiPercent; valB = b.roiPercent; }
      else if (sortBy === 'revenue') { valA = a.totalRevenueGeneratedKes; valB = b.totalRevenueGeneratedKes; }
      else if (sortBy === 'tco') { valA = a.tcoKes; valB = b.tcoKes; }
      else if (sortBy === 'profit') { valA = a.netOperatingProfitKes; valB = b.netOperatingProfitKes; }
      else if (sortBy === 'purchasePrice') { valA = a.purchasePriceKes; valB = b.purchasePriceKes; }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [roiList, categoryFilter, cityFilter, searchTerm, sortBy, sortOrder]);

  // Aggregate Fleet ROI Summary
  const fleetSummary = useMemo(() => {
    const totalCapital = filteredVehicles.reduce((s, i) => s + i.purchasePriceKes, 0);
    const totalOpex = filteredVehicles.reduce((s, i) => s + i.totalOpexKes, 0);
    const totalTco = filteredVehicles.reduce((s, i) => s + i.tcoKes, 0);
    const totalRev = filteredVehicles.reduce((s, i) => s + i.totalRevenueGeneratedKes, 0);
    const totalNetProfit = filteredVehicles.reduce((s, i) => s + i.netOperatingProfitKes, 0);
    const avgRoi = totalCapital > 0 ? ((totalNetProfit / totalCapital) * 100).toFixed(1) : '0';

    const evs = filteredVehicles.filter(i => i.category === 'Electric');
    const fuels = filteredVehicles.filter(i => i.category === 'Fuel');

    const evCapital = evs.reduce((s, i) => s + i.purchasePriceKes, 0);
    const evProfit = evs.reduce((s, i) => s + i.netOperatingProfitKes, 0);
    const evAvgRoi = evCapital > 0 ? ((evProfit / evCapital) * 100).toFixed(1) : '0';

    const fuelCapital = fuels.reduce((s, i) => s + i.purchasePriceKes, 0);
    const fuelProfit = fuels.reduce((s, i) => s + i.netOperatingProfitKes, 0);
    const fuelAvgRoi = fuelCapital > 0 ? ((fuelProfit / fuelCapital) * 100).toFixed(1) : '0';

    return {
      totalCapital,
      totalOpex,
      totalTco,
      totalRev,
      totalNetProfit,
      avgRoi,
      evAvgRoi,
      fuelAvgRoi,
      count: filteredVehicles.length
    };
  }, [filteredVehicles]);

  // 6-Month Projected ROI & Asset Depreciation Calculation Engine
  const projectionModel = useMemo(() => {
    // 1. Filter vehicles by scope
    let scopedVehicles = roiList;
    if (projectionScope === 'Electric') {
      scopedVehicles = roiList.filter(v => v.category === 'Electric');
    } else if (projectionScope === 'Fuel') {
      scopedVehicles = roiList.filter(v => v.category === 'Fuel');
    } else if (projectionScope !== 'All') {
      scopedVehicles = roiList.filter(v => v.id === projectionScope);
    }

    if (scopedVehicles.length === 0) scopedVehicles = roiList;

    const totalCapital = scopedVehicles.reduce((s, i) => s + i.purchasePriceKes, 0);
    const totalNetProfitM0 = scopedVehicles.reduce((s, i) => s + i.netOperatingProfitKes, 0);
    const totalRevM0 = scopedVehicles.reduce((s, i) => s + i.totalRevenueGeneratedKes, 0);
    const totalOpexM0 = scopedVehicles.reduce((s, i) => s + i.totalOpexKes, 0);

    // Monthly profit baseline (assuming ~6 months active operations)
    const monthlyNetProfitRunRate = totalNetProfitM0 / 6;

    // Monthly depreciation based on annual rate
    const monthlyDepreciation = (totalCapital * (annualDepreciationRate / 100)) / 12;

    // EV vs Fuel breakdown for comparative projection lines
    const evs = roiList.filter(v => v.category === 'Electric');
    const fuels = roiList.filter(v => v.category === 'Fuel');

    const evCapital = evs.reduce((s, i) => s + i.purchasePriceKes, 0);
    const evNetProfitM0 = evs.reduce((s, i) => s + i.netOperatingProfitKes, 0);
    const evMonthlyProfit = evNetProfitM0 / 6;

    const fuelCapital = fuels.reduce((s, i) => s + i.purchasePriceKes, 0);
    const fuelNetProfitM0 = fuels.reduce((s, i) => s + i.netOperatingProfitKes, 0);
    const fuelMonthlyProfit = fuelNetProfitM0 / 6;

    // Generate timeline nodes
    const months = [
      { key: 'M-3', label: 'May 2026', monthIdx: -3 },
      { key: 'M-2', label: 'Jun 2026', monthIdx: -2 },
      { key: 'M-1', label: 'Jul 2026', monthIdx: -1 },
      { key: 'M0', label: 'Aug 2026 (Now)', monthIdx: 0 },
      { key: 'M+1', label: 'Sep 2026', monthIdx: 1 },
      { key: 'M+2', label: 'Oct 2026', monthIdx: 2 },
      { key: 'M+3', label: 'Nov 2026', monthIdx: 3 },
      { key: 'M+4', label: 'Dec 2026', monthIdx: 4 },
      { key: 'M+5', label: 'Jan 2027', monthIdx: 5 },
      { key: 'M+6', label: 'Feb 2027', monthIdx: 6 },
    ];

    let runningCumProfit = totalNetProfitM0;
    let runningEvProfit = evNetProfitM0;
    let runningFuelProfit = fuelNetProfitM0;

    const chartPoints = months.map(m => {
      if (m.monthIdx < 0) {
        // Historical points
        const ratio = Math.max(0.2, 1 + (m.monthIdx * 0.16));
        const histProfit = Math.round(totalNetProfitM0 * ratio);
        const histEvProfit = Math.round(evNetProfitM0 * ratio);
        const histFuelProfit = Math.round(fuelNetProfitM0 * ratio);

        const histRoi = totalCapital > 0 ? Number(((histProfit / totalCapital) * 100).toFixed(1)) : 0;
        const histEvRoi = evCapital > 0 ? Number(((histEvProfit / evCapital) * 100).toFixed(1)) : 0;
        const histFuelRoi = fuelCapital > 0 ? Number(((histFuelProfit / fuelCapital) * 100).toFixed(1)) : 0;

        const histBookVal = Math.round(totalCapital - (monthlyDepreciation * (6 + m.monthIdx)));

        return {
          month: m.label,
          shortMonth: m.key,
          isHistorical: true,
          isCurrent: false,
          isProjected: false,
          historicalRoi: histRoi,
          projectedRoi: null as number | null,
          evHistoricalRoi: histEvRoi,
          evProjectedRoi: null as number | null,
          fuelHistoricalRoi: histFuelRoi,
          fuelProjectedRoi: null as number | null,
          cumProfitKes: histProfit,
          bookValueKes: Math.max(0, histBookVal),
          monthlyNetProfit: Math.round(monthlyNetProfitRunRate),
        };
      } else if (m.monthIdx === 0) {
        // Current month (bridge point)
        const currentRoi = totalCapital > 0 ? Number(((totalNetProfitM0 / totalCapital) * 100).toFixed(1)) : 0;
        const currentEvRoi = evCapital > 0 ? Number(((evNetProfitM0 / evCapital) * 100).toFixed(1)) : 0;
        const currentFuelRoi = fuelCapital > 0 ? Number(((fuelNetProfitM0 / fuelCapital) * 100).toFixed(1)) : 0;
        const currentBookVal = Math.round(totalCapital - (monthlyDepreciation * 6));

        return {
          month: m.label,
          shortMonth: m.key,
          isHistorical: false,
          isCurrent: true,
          isProjected: false,
          historicalRoi: currentRoi,
          projectedRoi: currentRoi, // connect historical to projected
          evHistoricalRoi: currentEvRoi,
          evProjectedRoi: currentEvRoi,
          fuelHistoricalRoi: currentFuelRoi,
          fuelProjectedRoi: currentFuelRoi,
          cumProfitKes: Math.round(totalNetProfitM0),
          bookValueKes: Math.max(0, currentBookVal),
          monthlyNetProfit: Math.round(monthlyNetProfitRunRate),
        };
      } else {
        // Future 6 months projection
        const growthFactor = Math.pow(1 + (monthlyGrowthRate / 100), m.monthIdx);
        const projectedMonthlyProfit = monthlyNetProfitRunRate * growthFactor;
        const projectedEvMonthlyProfit = evMonthlyProfit * growthFactor;
        const projectedFuelMonthlyProfit = fuelMonthlyProfit * growthFactor;

        runningCumProfit += projectedMonthlyProfit;
        runningEvProfit += projectedEvMonthlyProfit;
        runningFuelProfit += projectedFuelMonthlyProfit;

        const projRoi = totalCapital > 0 ? Number(((runningCumProfit / totalCapital) * 100).toFixed(1)) : 0;
        const projEvRoi = evCapital > 0 ? Number(((runningEvProfit / evCapital) * 100).toFixed(1)) : 0;
        const projFuelRoi = fuelCapital > 0 ? Number(((runningFuelProfit / fuelCapital) * 100).toFixed(1)) : 0;

        const projBookVal = Math.round(totalCapital - (monthlyDepreciation * (6 + m.monthIdx)));

        return {
          month: m.label,
          shortMonth: m.key,
          isHistorical: false,
          isCurrent: false,
          isProjected: true,
          historicalRoi: null as number | null,
          projectedRoi: projRoi,
          evHistoricalRoi: null as number | null,
          evProjectedRoi: projEvRoi,
          fuelHistoricalRoi: null as number | null,
          fuelProjectedRoi: projFuelRoi,
          cumProfitKes: Math.round(runningCumProfit),
          bookValueKes: Math.max(0, projBookVal),
          monthlyNetProfit: Math.round(projectedMonthlyProfit),
        };
      }
    });

    const m6Point = chartPoints[chartPoints.length - 1];
    const m0Point = chartPoints[3];
    const projectedRoiGain6Mo = Number(((m6Point.projectedRoi ?? 0) - (m0Point.historicalRoi ?? 0)).toFixed(1));
    const projected6MoProfitDelta = m6Point.cumProfitKes - m0Point.cumProfitKes;
    const projected6MoDepreciationLoss = Math.round(monthlyDepreciation * 6);

    return {
      scopedVehicles,
      totalCapital,
      chartPoints,
      m0Point,
      m6Point,
      projectedRoiGain6Mo,
      projected6MoProfitDelta,
      projected6MoDepreciationLoss,
      monthlyDepreciation
    };
  }, [roiList, projectionScope, annualDepreciationRate, monthlyGrowthRate]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Registration Number',
      'Make & Model',
      'Category',
      'City',
      'Assigned Driver',
      'Purchase Price (KES)',
      'Fuel Expense (KES)',
      'Charging Expense (KES)',
      'Maintenance Expense (KES)',
      'Total OPEX (KES)',
      'Total Cost of Ownership - TCO (KES)',
      'Cumulative Revenue (KES)',
      'Net Operating Profit (KES)',
      'Net Cashflow (KES)',
      'ROI % vs Purchase Capital',
      'Payback Progress %',
      'Status'
    ];

    const rows = filteredVehicles.map(v => [
      `"${v.registrationNumber}"`,
      `"${v.make} ${v.model}"`,
      `"${v.category}"`,
      `"${v.city}"`,
      `"${(v.assignedDriverName || 'Unassigned').replace(/"/g, '""')}"`,
      v.purchasePriceKes,
      v.totalFuelSpentKes,
      v.totalChargingSpentKes,
      v.totalMaintenanceSpentKes,
      v.totalOpexKes,
      v.tcoKes,
      v.totalRevenueGeneratedKes,
      v.netOperatingProfitKes,
      v.netCashflowKes,
      `"${v.roiPercent}%"`,
      `"${v.paybackProgressPercent}%"`,
      `"${v.status}"`
    ]);

    const metaHeader = [
      `"GREENSHIFT FLEET FINANCIAL REPORT - VEHICLE RETURN ON INVESTMENT (ROI) AUDIT"`,
      `"Export Date: ${new Date().toLocaleString()}"`,
      `"Total Fleet Capital Invested: KES ${fleetSummary.totalCapital.toLocaleString()}"`,
      `"Cumulative Fleet Revenue: KES ${fleetSummary.totalRev.toLocaleString()}"`,
      `"Average Fleet ROI: ${fleetSummary.avgRoi}%"`,
      `""`
    ].join('\n');

    const csvContent = metaHeader + '\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vehicle_roi_analysis_statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded Vehicle ROI Statement CSV!');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Vehicle Return on Investment (ROI) & TCO Matrix
                <span className="bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Capital Return Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compares Total Cost of Ownership (Purchase Capital + OPEX) against cumulative revenue per asset
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export ROI CSV</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search plate, model, driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 w-52"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['All', 'Electric', 'Fuel'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    categoryFilter === cat
                      ? 'bg-teal-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'Electric' && <Zap className="w-3 h-3" />}
                  {cat === 'Fuel' && <Fuel className="w-3 h-3" />}
                  <span>{cat}</span>
                </button>
              ))}
            </div>

            {/* City Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
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

          {/* Sort Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px] font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="roi" className="bg-slate-900">ROI % (Capital Return)</option>
              <option value="revenue" className="bg-slate-900">Cumulative Revenue</option>
              <option value="profit" className="bg-slate-900">Net Operating Profit</option>
              <option value="tco" className="bg-slate-900">Total Cost of Ownership (TCO)</option>
              <option value="purchasePrice" className="bg-slate-900">Purchase Price</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="text-teal-400 hover:text-teal-300 font-bold px-1 cursor-pointer"
              title="Toggle sort order"
            >
              {sortOrder === 'desc' ? '↓ DESC' : '↑ ASC'}
            </button>
          </div>

        </div>
      </div>

      {/* 2. Top Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Capital Invested</span>
            <div className="text-xl font-black text-slate-100 mt-1 font-mono">
              KES {(fleetSummary.totalCapital / 1000000).toFixed(2)}M
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Across {fleetSummary.count} fleet assets
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Cost of Ownership (TCO)</span>
            <div className="text-xl font-black text-rose-400 mt-1 font-mono">
              KES {(fleetSummary.totalTco / 1000000).toFixed(2)}M
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Purchase Price + OPEX
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cumulative Revenue</span>
            <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
              KES {(fleetSummary.totalRev / 1000000).toFixed(2)}M
            </div>
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Net Profit: KES {(fleetSummary.totalNetProfit / 1000000).toFixed(2)}M</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Average Fleet ROI %</span>
            <div className="text-xl font-black text-teal-400 mt-1 font-mono">
              +{fleetSummary.avgRoi}%
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 font-sans">
              <span className="text-emerald-400 font-bold">EV: +{fleetSummary.evAvgRoi}%</span> vs{' '}
              <span className="text-amber-400 font-bold">Fuel: +{fleetSummary.fuelAvgRoi}%</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2.5 6-MONTH ROI PROJECTION & DEPRECIATION TREND LINE CHART */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        
        {/* Panel Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <LineChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                6-Month Projected ROI Trend Line & Depreciation Forecast
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Forward Trajectory (Aug '26 → Feb '27)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Modeled from monthly earnings run-rate, asset depreciation curve, and operational growth assumptions
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            
            {/* Scope Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 font-medium">Scope:</span>
              <select
                value={projectionScope}
                onChange={(e) => setProjectionScope(e.target.value)}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-slate-900">Entire Fleet ({roiList.length} assets)</option>
                <option value="Electric" className="bg-slate-900">⚡ Electric Fleet Only</option>
                <option value="Fuel" className="bg-slate-900">⛽ Fuel Fleet Only</option>
                <optgroup label="Individual Vehicles" className="bg-slate-900 text-slate-400">
                  {roiList.map(v => (
                    <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                      {v.registrationNumber} - {v.make} {v.model} ({v.category})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Depreciation Rate Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 font-medium">Depreciation Rate:</span>
              <select
                value={annualDepreciationRate}
                onChange={(e) => setAnnualDepreciationRate(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value={10} className="bg-slate-900">10% / year (EV Low Maintenance)</option>
                <option value={15} className="bg-slate-900">15% / year (Standard Straight-Line)</option>
                <option value={20} className="bg-slate-900">20% / year (Accelerated Usage)</option>
              </select>
            </div>

            {/* Profit Growth Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-medium">Growth Run-Rate:</span>
              <select
                value={monthlyGrowthRate}
                onChange={(e) => setMonthlyGrowthRate(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900">0.0% / mo (Flat Run-Rate)</option>
                <option value={2.5} className="bg-slate-900">+2.5% / mo (Optimistic Growth)</option>
                <option value={-2.0} className="bg-slate-900">-2.0% / mo (Seasonal Downside)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Projection KPI Summary Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-sans text-slate-400 font-medium block">Current Baseline ROI (M0)</span>
            <div className="text-base font-black text-teal-400 mt-1">
              +{projectionModel.m0Point?.historicalRoi}%
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              Capital Net Return Today
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-sans text-slate-400 font-medium block">6-Month Projected ROI (M+6)</span>
            <div className="text-base font-black text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              <span>+{projectionModel.m6Point?.projectedRoi}%</span>
              <span className="text-xs text-indigo-300 font-sans font-normal ml-1">
                (+{projectionModel.projectedRoiGain6Mo}% gain)
              </span>
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              Forecasted for Feb 2027
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-sans text-slate-400 font-medium block">Projected 6-Mo Profit Contribution</span>
            <div className="text-base font-black text-indigo-300 mt-1">
              +KES {projectionModel.projected6MoProfitDelta.toLocaleString()}
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              Net cashflow generated over next 6 mos
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-sans text-slate-400 font-medium block">6-Mo Asset Depreciation Loss</span>
            <div className="text-base font-black text-amber-400 mt-1">
              -KES {projectionModel.projected6MoDepreciationLoss.toLocaleString()}
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              Based on {annualDepreciationRate}% annual straight-line rate
            </div>
          </div>
        </div>

        {/* Recharts Composed Chart with Trend Line & Reference Lines */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={projectionModel.chartPoints} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="bookValGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              
              <XAxis 
                dataKey="shortMonth" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
              />
              
              <YAxis 
                yAxisId="roi"
                stroke="#2dd4bf" 
                fontSize={11} 
                tickLine={false}
                unit="%"
                domain={['auto', 'auto']}
              />

              <YAxis 
                yAxisId="book"
                orientation="right"
                stroke="#818cf8" 
                fontSize={10} 
                tickLine={false}
                tickFormatter={(v) => `KES ${(v/1000).toFixed(0)}k`}
                domain={['auto', 'auto']}
              />

              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                formatter={(value: any, name: any, item: any) => {
                  if (name === 'Historical ROI %') return [`+${value}%`, 'Historical ROI'];
                  if (name === 'Projected ROI %') return [`+${value}%`, 'Projected ROI (6-Mo Trend)'];
                  if (name === 'EV Projected ROI %') return [`+${value}%`, 'EV Fleet Projected ROI'];
                  if (name === 'Fuel Projected ROI %') return [`+${value}%`, 'Fuel Fleet Projected ROI'];
                  if (name === 'Asset Book Value') return [`KES ${Number(value).toLocaleString()}`, 'Depreciated Asset Value'];
                  return [value, name];
                }}
                labelFormatter={(label, items) => {
                  const node = items && items[0] && items[0].payload;
                  if (!node) return label;
                  return `${node.month} ${node.isProjected ? '🔮 (6-Month Projection)' : node.isCurrent ? '📍 (Current Position)' : '📜 (Historical)'}`;
                }}
              />

              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
              />

              {/* 100% Capital Recovery Reference Line */}
              <ReferenceLine 
                yAxisId="roi"
                y={100} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                label={{ value: '100% Capital Recovery Threshold', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} 
              />

              {/* Current Month Bridge Reference Line */}
              <ReferenceLine 
                yAxisId="roi"
                x="M0" 
                stroke="#6366f1" 
                strokeDasharray="2 2"
                label={{ value: 'Today', fill: '#818cf8', fontSize: 10, position: 'top' }} 
              />

              {/* Asset Depreciated Book Value Area */}
              <Area 
                yAxisId="book"
                type="monotone" 
                dataKey="bookValueKes" 
                name="Asset Book Value" 
                fill="url(#bookValGrad)" 
                stroke="#6366f1" 
                strokeWidth={1.5}
              />

              {/* Historical ROI Line (Solid Teal) */}
              <Line 
                yAxisId="roi"
                type="monotone" 
                dataKey="historicalRoi" 
                name="Historical ROI %" 
                stroke="#2dd4bf" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#2dd4bf' }} 
                activeDot={{ r: 6, fill: '#14b8a6' }}
                connectNulls
              />

              {/* Projected 6-Month ROI Trend Line (Dashed Emerald/Indigo Glowing Line) */}
              <Line 
                yAxisId="roi"
                type="monotone" 
                dataKey="projectedRoi" 
                name="Projected ROI %" 
                stroke="#10b981" 
                strokeWidth={3} 
                strokeDasharray="6 6"
                dot={{ r: 4, fill: '#10b981' }} 
                activeDot={{ r: 7, fill: '#34d399' }}
                connectNulls
              />

              {/* EV Projected ROI Line (for comparison when Scope = All) */}
              {projectionScope === 'All' && (
                <Line 
                  yAxisId="roi"
                  type="monotone" 
                  dataKey="evProjectedRoi" 
                  name="EV Projected ROI %" 
                  stroke="#34d399" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls
                />
              )}

              {/* Fuel Projected ROI Line (for comparison when Scope = All) */}
              {projectionScope === 'All' && (
                <Line 
                  yAxisId="roi"
                  type="monotone" 
                  dataKey="fuelProjectedRoi" 
                  name="Fuel Projected ROI %" 
                  stroke="#fbbf24" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls
                />
              )}

            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Explanatory Footer Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              Projections compound monthly earnings against a <strong className="text-slate-200">{annualDepreciationRate}% annual straight-line asset depreciation curve</strong>.
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-teal-400 inline-block rounded" /> Solid: Historical
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block rounded" /> Dashed: 6-Mo Projection
            </span>
          </div>
        </div>

      </div>

      {/* 3. Detailed Per-Vehicle ROI Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Vehicle Asset ROI & Payback Audit Log
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                {filteredVehicles.length} Vehicles
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Net Profit / Purchase Price capital recovery progress & cost breakdown
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3">Vehicle / Driver</th>
                <th className="py-2.5 px-3">Purchase Price</th>
                <th className="py-2.5 px-3">Running OPEX</th>
                <th className="py-2.5 px-3">TCO (Cost Base)</th>
                <th className="py-2.5 px-3">Cumulative Revenue</th>
                <th className="py-2.5 px-3">Net Profit</th>
                <th className="py-2.5 px-3">Payback Progress</th>
                <th className="py-2.5 px-3 text-right">ROI %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {filteredVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-sans">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        v.category === 'Electric' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {v.category === 'Electric' ? <Zap className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{v.registrationNumber}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({v.make} {v.model})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {v.assignedDriverName || 'Unassigned'} • <span className="text-slate-300">{v.city}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-bold text-slate-300">
                    KES {v.purchasePriceKes.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 text-rose-400 font-semibold text-[11px]">
                    KES {v.totalOpexKes.toLocaleString()}
                    <div className="text-[10px] text-slate-500 font-sans">
                      {v.category === 'Electric' ? `Charging: KES ${(v.totalChargingSpentKes/1000).toFixed(0)}k` : `Fuel: KES ${(v.totalFuelSpentKes/1000).toFixed(0)}k`}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-slate-400 font-semibold text-[11px]">
                    KES {v.tcoKes.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 font-bold text-emerald-400">
                    KES {v.totalRevenueGeneratedKes.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 font-bold text-teal-300">
                    KES {v.netOperatingProfitKes.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 font-sans">
                    <div className="space-y-1 w-28">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-medium">{v.status}</span>
                        <span className="font-bold text-white font-mono">{v.paybackProgressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full ${
                            v.status === 'Capital Recovered' ? 'bg-emerald-400' : 'bg-teal-400'
                          }`}
                          style={{ width: `${Math.min(100, v.paybackProgressPercent)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-sans">
                    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-black font-mono border ${
                      v.roiPercent >= 100 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : v.roiPercent > 0 
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      +{v.roiPercent}%
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
