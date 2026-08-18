import React, { useState, useMemo } from 'react';
import { Vehicle, EvBatterySession, BatterySwapRecord } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Cell, ComposedChart, Line
} from 'recharts';
import { 
  Zap, Fuel, DollarSign, TrendingDown, TrendingUp, Filter, 
  Download, ArrowUpRight, CheckCircle2, ShieldCheck, Sliders, 
  Sparkles, Info, HelpCircle, RefreshCw, BarChart3, Scale, 
  ArrowDownRight, Layers, Car, FileSpreadsheet, Calculator
} from 'lucide-react';
import { toast } from 'sonner';

interface EvChargingCostPerKmBarChartProps {
  vehicles?: Vehicle[];
  evSessions?: EvBatterySession[];
  swapRecords?: BatterySwapRecord[];
  className?: string;
}

export interface ModelCostBenchmark {
  modelName: string;
  category: 'Two-Wheeler' | 'Light Commercial' | 'Bus & Shuttle' | 'Fleet Average';
  unitCount: number;
  evWhPerKm: number; // Wh/km
  evKwhPerKm: number; // kWh/km
  evChargingCostPerKm: number; // KES/km
  iceFuelKmPerLiter: number; // km/L
  iceFuelType: 'Super Petrol' | 'Automotive Diesel';
  iceFuelCostPerKm: number; // KES/km
  netSavingsPerKm: number; // KES/km saved
  savingsPercent: number; // % cost reduction
  costRatioPercent: number; // EV cost as % of Fuel cost
  tenThousandKmEvCostKes: number; // Cost for 10,000 km
  tenThousandKmFuelCostKes: number; // Cost for 10,000 km
  tenThousandKmSavingsKes: number; // Savings for 10,000 km
  co2SavedKgPerKm: number; // kg CO2 saved per km
}

// Default Official EPRA Kenya Benchmarks (August 2026)
export const DEFAULT_EPRA_PETROL_PRICE_KES = 198.50; // Super Petrol KES/L
export const DEFAULT_EPRA_DIESEL_PRICE_KES = 183.00; // Diesel KES/L
export const DEFAULT_EV_TARIFF_KES_PER_KWH = 48.50;  // Standard Blend KES/kWh

export const EvChargingCostPerKmBarChart: React.FC<EvChargingCostPerKmBarChartProps> = ({
  vehicles = [],
  evSessions = [],
  swapRecords = [],
  className = ''
}) => {
  // Fuel & Electricity Price Scenario States
  const [fuelPricePreset, setFuelPricePreset] = useState<'EPRA_STANDARD' | 'DIESEL_STANDARD' | 'HIGH_SPIKE' | 'CUSTOM'>('EPRA_STANDARD');
  const [petrolPriceKes, setPetrolPriceKes] = useState<number>(DEFAULT_EPRA_PETROL_PRICE_KES);
  const [dieselPriceKes, setDieselPriceKes] = useState<number>(DEFAULT_EPRA_DIESEL_PRICE_KES);

  const [tariffPreset, setTariffPreset] = useState<'DEPOT_SOLAR' | 'NIGHT_GRID' | 'STANDARD_BLEND' | 'PEAK_DEMAND' | 'CUSTOM'>('STANDARD_BLEND');
  const [electricityTariffKes, setElectricityTariffKes] = useState<number>(DEFAULT_EV_TARIFF_KES_PER_KWH);

  // View Controls
  const [displayMode, setDisplayMode] = useState<'SIDE_BY_SIDE' | 'NET_SAVINGS' | 'COST_RATIO'>('SIDE_BY_SIDE');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Two-Wheeler' | 'Light Commercial' | 'Bus & Shuttle'>('ALL');
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null);

  // Transition ROI Calculator States
  const [simulatedMonthlyKm, setSimulatedMonthlyKm] = useState<number>(25000); // 25,000 km fleet monthly distance
  const [vehicleReplacementCostKes, setVehicleReplacementCostKes] = useState<number>(350000); // avg EV boda / conversion cost

  // Handle Preset Changes for Fuel
  const handleFuelPresetChange = (preset: 'EPRA_STANDARD' | 'DIESEL_STANDARD' | 'HIGH_SPIKE' | 'CUSTOM') => {
    setFuelPricePreset(preset);
    if (preset === 'EPRA_STANDARD') {
      setPetrolPriceKes(198.50);
      setDieselPriceKes(183.00);
    } else if (preset === 'DIESEL_STANDARD') {
      setPetrolPriceKes(198.50);
      setDieselPriceKes(183.00);
    } else if (preset === 'HIGH_SPIKE') {
      setPetrolPriceKes(235.00);
      setDieselPriceKes(218.00);
    }
  };

  // Handle Preset Changes for Electricity
  const handleTariffPresetChange = (preset: 'DEPOT_SOLAR' | 'NIGHT_GRID' | 'STANDARD_BLEND' | 'PEAK_DEMAND' | 'CUSTOM') => {
    setTariffPreset(preset);
    if (preset === 'DEPOT_SOLAR') {
      setElectricityTariffKes(28.00);
    } else if (preset === 'NIGHT_GRID') {
      setElectricityTariffKes(36.00);
    } else if (preset === 'STANDARD_BLEND') {
      setElectricityTariffKes(48.50);
    } else if (preset === 'PEAK_DEMAND') {
      setElectricityTariffKes(58.00);
    }
  };

  // Extract EV models from fleet
  const evVehicles = useMemo(() => {
    return vehicles.filter(v => v.category === 'Electric' || v.type.toLowerCase().includes('electric'));
  }, [vehicles]);

  // Model Profiles Master Baseline
  const modelProfiles = useMemo(() => [
    {
      modelName: 'Roam Air 2W',
      category: 'Two-Wheeler' as const,
      whPerKm: 48,
      iceKmPerLiter: 35,
      fuelType: 'Super Petrol' as const,
      co2KgPerKm: 0.082,
      defaultCount: 14
    },
    {
      modelName: 'Spiro Commuter e-Moto',
      category: 'Two-Wheeler' as const,
      whPerKm: 52,
      iceKmPerLiter: 36,
      fuelType: 'Super Petrol' as const,
      co2KgPerKm: 0.080,
      defaultCount: 12
    },
    {
      modelName: 'Ampersand e-Boda',
      category: 'Two-Wheeler' as const,
      whPerKm: 50,
      iceKmPerLiter: 35,
      fuelType: 'Super Petrol' as const,
      co2KgPerKm: 0.082,
      defaultCount: 8
    },
    {
      modelName: 'BYD T3 Express Van',
      category: 'Light Commercial' as const,
      whPerKm: 145,
      iceKmPerLiter: 11.5,
      fuelType: 'Super Petrol' as const,
      co2KgPerKm: 0.195,
      defaultCount: 5
    },
    {
      modelName: 'BYD Atto 3 Cargo',
      category: 'Light Commercial' as const,
      whPerKm: 138,
      iceKmPerLiter: 12.0,
      fuelType: 'Super Petrol' as const,
      co2KgPerKm: 0.190,
      defaultCount: 3
    },
    {
      modelName: 'GreenShift Shuttle',
      category: 'Bus & Shuttle' as const,
      whPerKm: 115,
      iceKmPerLiter: 9.5,
      fuelType: 'Super Petrol' as const,
      co2KgPerKm: 0.220,
      defaultCount: 2
    },
    {
      modelName: 'Opibus Electric Bus',
      category: 'Bus & Shuttle' as const,
      whPerKm: 185,
      iceKmPerLiter: 5.5,
      fuelType: 'Automotive Diesel' as const,
      co2KgPerKm: 0.380,
      defaultCount: 2
    }
  ], []);

  // Compute Benchmark Metrics
  const benchmarkData: ModelCostBenchmark[] = useMemo(() => {
    let totalEvUnits = 0;
    let weightedEvCostSum = 0;
    let weightedFuelCostSum = 0;
    let weightedWhSum = 0;

    const list: ModelCostBenchmark[] = modelProfiles.map(p => {
      // Find actual count from vehicles or fallback
      const actualCount = evVehicles.filter(v => 
        `${v.make} ${v.model}`.toLowerCase().includes(p.modelName.toLowerCase()) ||
        v.type.toLowerCase().includes(p.category.toLowerCase())
      ).length || p.defaultCount;

      const evKwhPerKm = p.whPerKm / 1000;
      const evChargingCostPerKm = Math.round(evKwhPerKm * electricityTariffKes * 100) / 100;

      const effectiveFuelPrice = p.fuelType === 'Automotive Diesel' ? dieselPriceKes : petrolPriceKes;
      const iceFuelCostPerKm = Math.round((effectiveFuelPrice / p.iceKmPerLiter) * 100) / 100;

      const netSavingsPerKm = Math.round(Math.max(0, iceFuelCostPerKm - evChargingCostPerKm) * 100) / 100;
      const savingsPercent = iceFuelCostPerKm > 0 ? Math.round((netSavingsPerKm / iceFuelCostPerKm) * 100) : 0;
      const costRatioPercent = iceFuelCostPerKm > 0 ? Math.round((evChargingCostPerKm / iceFuelCostPerKm) * 100) : 0;

      const tenThousandKmEvCostKes = Math.round(evChargingCostPerKm * 10000);
      const tenThousandKmFuelCostKes = Math.round(iceFuelCostPerKm * 10000);
      const tenThousandKmSavingsKes = tenThousandKmFuelCostKes - tenThousandKmEvCostKes;

      totalEvUnits += actualCount;
      weightedEvCostSum += (evChargingCostPerKm * actualCount);
      weightedFuelCostSum += (iceFuelCostPerKm * actualCount);
      weightedWhSum += (p.whPerKm * actualCount);

      return {
        modelName: p.modelName,
        category: p.category,
        unitCount: actualCount,
        evWhPerKm: p.whPerKm,
        evKwhPerKm: Math.round(evKwhPerKm * 1000) / 1000,
        evChargingCostPerKm,
        iceFuelKmPerLiter: p.iceKmPerLiter,
        iceFuelType: p.fuelType,
        iceFuelCostPerKm,
        netSavingsPerKm,
        savingsPercent,
        costRatioPercent,
        tenThousandKmEvCostKes,
        tenThousandKmFuelCostKes,
        tenThousandKmSavingsKes,
        co2SavedKgPerKm: p.co2KgPerKm
      };
    });

    // Add Fleet Weighted Average Benchmark
    const avgEvCost = totalEvUnits > 0 ? Math.round((weightedEvCostSum / totalEvUnits) * 100) / 100 : 3.49;
    const avgFuelCost = totalEvUnits > 0 ? Math.round((weightedFuelCostSum / totalEvUnits) * 100) / 100 : 11.85;
    const avgSavings = Math.round(Math.max(0, avgFuelCost - avgEvCost) * 100) / 100;
    const avgSavingsPercent = avgFuelCost > 0 ? Math.round((avgSavings / avgFuelCost) * 100) : 70;
    const avgCostRatio = avgFuelCost > 0 ? Math.round((avgEvCost / avgFuelCost) * 100) : 30;

    const fleetAverageItem: ModelCostBenchmark = {
      modelName: '★ Fleet-Wide Average',
      category: 'Fleet Average',
      unitCount: totalEvUnits || evVehicles.length || 46,
      evWhPerKm: Math.round(weightedWhSum / (totalEvUnits || 1)),
      evKwhPerKm: Math.round((weightedWhSum / (totalEvUnits || 1)) / 10) / 100,
      evChargingCostPerKm: avgEvCost,
      iceFuelKmPerLiter: 18.5,
      iceFuelType: 'Super Petrol',
      iceFuelCostPerKm: avgFuelCost,
      netSavingsPerKm: avgSavings,
      savingsPercent: avgSavingsPercent,
      costRatioPercent: avgCostRatio,
      tenThousandKmEvCostKes: Math.round(avgEvCost * 10000),
      tenThousandKmFuelCostKes: Math.round(avgFuelCost * 10000),
      tenThousandKmSavingsKes: Math.round(avgSavings * 10000),
      co2SavedKgPerKm: 0.145
    };

    return [...list, fleetAverageItem];
  }, [modelProfiles, evVehicles, petrolPriceKes, dieselPriceKes, electricityTariffKes]);

  // Filtered Chart Items
  const filteredData = useMemo(() => {
    if (categoryFilter === 'ALL') return benchmarkData;
    return benchmarkData.filter(d => d.category === categoryFilter || d.category === 'Fleet Average');
  }, [benchmarkData, categoryFilter]);

  // Overall Fleet Monthly Savings Summary
  const fleetSummaryMetrics = useMemo(() => {
    const fleetAvg = benchmarkData.find(d => d.category === 'Fleet Average') || benchmarkData[benchmarkData.length - 1];
    const monthlyEvCost = Math.round(simulatedMonthlyKm * fleetAvg.evChargingCostPerKm);
    const monthlyFuelCost = Math.round(simulatedMonthlyKm * fleetAvg.iceFuelCostPerKm);
    const monthlySavingsKes = monthlyFuelCost - monthlyEvCost;
    const annualSavingsKes = monthlySavingsKes * 12;
    const annualSavingsUsd = Math.round(annualSavingsKes / 129); // ~129 KES per USD

    // Payback calculation (Months to recoup vehicle investment)
    const paybackMonths = monthlySavingsKes > 0 
      ? Math.round((vehicleReplacementCostKes / (monthlySavingsKes / (fleetAvg.unitCount || 1))) * 10) / 10
      : 0;

    return {
      fleetAvg,
      monthlyEvCost,
      monthlyFuelCost,
      monthlySavingsKes,
      annualSavingsKes,
      annualSavingsUsd,
      paybackMonths
    };
  }, [benchmarkData, simulatedMonthlyKm, vehicleReplacementCostKes]);

  // CSV Export Handler
  const handleExportCsv = () => {
    let csv = 'Vehicle Model,Category,Fleet Units,EV Consumption (Wh/km),EV Cost/KM (KES),ICE Fuel Economy (km/L),Fuel Type,ICE Fuel Cost/KM (KES),Net Savings/KM (KES),Savings %,EV/Fuel Cost Ratio %,Cost per 10k km EV (KES),Cost per 10k km Fuel (KES),Net Savings per 10k km (KES),CO2 Offset (kg/km)\n';

    benchmarkData.forEach(d => {
      csv += `"${d.modelName}","${d.category}",${d.unitCount},${d.evWhPerKm},${d.evChargingCostPerKm},${d.iceFuelKmPerLiter},"${d.iceFuelType}",${d.iceFuelCostPerKm},${d.netSavingsPerKm},${d.savingsPercent}%,${d.costRatioPercent}%,${d.tenThousandKmEvCostKes},${d.tenThousandKmFuelCostKes},${d.tenThousandKmSavingsKes},${d.co2SavedKgPerKm}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EV_Charging_Cost_vs_Fuel_Benchmark_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Downloaded Cost per KM Benchmark CSV Report');
  };

  // Custom Chart Tooltip
  const CustomBenchmarkTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: ModelCostBenchmark = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 shadow-2xl space-y-2.5 max-w-xs text-xs">
          <div className="border-b border-slate-800 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white text-sm">{data.modelName}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {data.category}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Fleet Active: <strong className="text-slate-200">{data.unitCount} Units</strong>
            </div>
          </div>

          {/* EV vs Fuel Stats */}
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> EV Charging:
              </span>
              <span className="text-emerald-300 font-black">
                KES {data.evChargingCostPerKm} / km
              </span>
            </div>

            <div className="flex items-center justify-between bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5" /> ICE {data.iceFuelType}:
              </span>
              <span className="text-rose-300 font-black">
                KES {data.iceFuelCostPerKm} / km
              </span>
            </div>

            <div className="flex items-center justify-between bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Net Savings / km:
              </span>
              <span className="text-amber-300 font-black">
                -KES {data.netSavingsPerKm} ({data.savingsPercent}%)
              </span>
            </div>
          </div>

          {/* Efficiency Details */}
          <div className="pt-1.5 border-t border-slate-800 text-[10px] space-y-1 text-slate-400">
            <div className="flex justify-between">
              <span>Energy Efficiency:</span>
              <span className="text-slate-200 font-mono">{data.evWhPerKm} Wh/km ({data.evKwhPerKm} kWh/km)</span>
            </div>
            <div className="flex justify-between">
              <span>ICE Benchmark Economy:</span>
              <span className="text-slate-200 font-mono">{data.iceFuelKmPerLiter} km/L</span>
            </div>
            <div className="flex justify-between">
              <span>10,000 km Cost Delta:</span>
              <span className="text-emerald-400 font-mono font-bold">
                Save KES {data.tenThousandKmSavingsKes.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6 ${className}`}>
      
      {/* Top Header & Overview */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Scale className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Charging Costs per KM vs Fuel Price Benchmarks</span>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Cost-Effectiveness Index
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Side-by-side comparison of electricity charging expenditure against EPRA pump petrol/diesel benchmarks to quantify EV fleet cost reduction
              </p>
            </div>
          </div>
        </div>

        {/* Actions & Export */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
            title="Download Cost per KM Benchmark Dataset as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Level Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Electric Fleet Avg Cost/KM */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">EV Fleet Charging</span>
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              KES {fleetSummaryMetrics.fleetAvg.evChargingCostPerKm} <span className="text-sm font-normal text-slate-400">/ km</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Electricity Blend:</span>
              <strong className="text-teal-300 font-mono">KES {electricityTariffKes}/kWh</strong>
            </div>
          </div>
          <div className="text-[11px] text-teal-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>2W Boda Cost:</span>
            <strong className="text-slate-200">~KES 2.33 / km</strong>
          </div>
        </div>

        {/* Card 2: Fuel Benchmark Avg Cost/KM */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ICE Fuel Benchmark</span>
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Fuel className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
              KES {fleetSummaryMetrics.fleetAvg.iceFuelCostPerKm} <span className="text-sm font-normal text-slate-400">/ km</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Super Petrol EPRA:</span>
              <strong className="text-amber-300 font-mono">KES {petrolPriceKes}/L</strong>
            </div>
          </div>
          <div className="text-[11px] text-rose-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>ICE 2W Boda Cost:</span>
            <strong className="text-slate-200">~KES 5.67 / km</strong>
          </div>
        </div>

        {/* Card 3: Net Operational Cost Savings */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Per-KM Cost Savings</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              -KES {fleetSummaryMetrics.fleetAvg.netSavingsPerKm} <span className="text-sm font-normal text-slate-400">/ km</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Operating Cost Drop:</span>
              <strong className="text-emerald-300 font-mono font-bold">-{fleetSummaryMetrics.fleetAvg.savingsPercent}% Cheaper</strong>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>Per 10,000 km:</span>
            <strong className="text-slate-200">+KES {fleetSummaryMetrics.fleetAvg.tenThousandKmSavingsKes.toLocaleString()}</strong>
          </div>
        </div>

        {/* Card 4: Break-Even Payback Period */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fleet ROI Payback</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Calculator className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight">
              {fleetSummaryMetrics.paybackMonths} <span className="text-sm font-normal text-slate-400">Months</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Annual Fleet Savings:</span>
              <strong className="text-emerald-400 font-mono font-bold">KES {(fleetSummaryMetrics.annualSavingsKes / 1000000).toFixed(2)}M</strong>
            </div>
          </div>
          <div className="text-[11px] text-cyan-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>USD Equiv / Year:</span>
            <strong className="text-slate-200">${fleetSummaryMetrics.annualSavingsUsd.toLocaleString()} USD</strong>
          </div>
        </div>

      </div>

      {/* Interactive Scenario Controls Bar */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Benchmark Simulation Parameters:
            </span>
          </div>

          {/* Chart Display Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setDisplayMode('SIDE_BY_SIDE')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                displayMode === 'SIDE_BY_SIDE'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side (EV vs Fuel)
            </button>

            <button
              onClick={() => setDisplayMode('NET_SAVINGS')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                displayMode === 'NET_SAVINGS'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Net Savings / KM (KES)
            </button>

            <button
              onClick={() => setDisplayMode('COST_RATIO')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                displayMode === 'COST_RATIO'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EV as % of Fuel Cost
            </button>
          </div>
        </div>

        {/* Dual Parameter Sliders & Presets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Column 1: Fuel Benchmark Settings */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-rose-400" />
                Fuel Price Benchmark:
              </span>
              <span className="font-mono font-bold text-rose-400">
                Petrol KES {petrolPriceKes}/L • Diesel KES {dieselPriceKes}/L
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleFuelPresetChange('EPRA_STANDARD')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                  fuelPricePreset === 'EPRA_STANDARD'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                EPRA Standard (198.5 KES)
              </button>

              <button
                onClick={() => handleFuelPresetChange('HIGH_SPIKE')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                  fuelPricePreset === 'HIGH_SPIKE'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Fuel Price Spike (235.0 KES)
              </button>
            </div>

            {/* Interactive Petrol Price Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Super Petrol Rate Adjustment:</span>
                <span className="font-mono text-rose-300 font-bold">KES {petrolPriceKes} / Liter</span>
              </div>
              <input
                type="range"
                min={150}
                max={280}
                step={0.5}
                value={petrolPriceKes}
                onChange={(e) => {
                  setPetrolPriceKes(Number(e.target.value));
                  setFuelPricePreset('CUSTOM');
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          {/* Column 2: Electricity Charging Tariff Settings */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                EV Electricity Charging Tariff:
              </span>
              <span className="font-mono font-bold text-teal-300">
                KES {electricityTariffKes} / kWh
              </span>
            </div>

            {/* Tariff Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleTariffPresetChange('DEPOT_SOLAR')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                  tariffPreset === 'DEPOT_SOLAR'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Off-Peak Solar (28.0)
              </button>

              <button
                onClick={() => handleTariffPresetChange('STANDARD_BLEND')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                  tariffPreset === 'STANDARD_BLEND'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Standard Blend (48.5)
              </button>

              <button
                onClick={() => handleTariffPresetChange('PEAK_DEMAND')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                  tariffPreset === 'PEAK_DEMAND'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Peak Fast Swap (58.0)
              </button>
            </div>

            {/* Interactive Electricity Tariff Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Electricity Tariff Adjustment:</span>
                <span className="font-mono text-teal-300 font-bold">KES {electricityTariffKes} / kWh</span>
              </div>
              <input
                type="range"
                min={20}
                max={75}
                step={0.5}
                value={electricityTariffKes}
                onChange={(e) => {
                  setElectricityTariffKes(Number(e.target.value));
                  setTariffPreset('CUSTOM');
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>
          </div>

        </div>

      </div>

      {/* Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-teal-400" />
          <span className="text-slate-400 font-semibold">Filter Vehicle Category:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'Two-Wheeler', 'Light Commercial', 'Bus & Shuttle'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg font-semibold transition border cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All EV Classes' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* PRIMARY RECHARTS BAR CHART */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        
        <div className="flex items-center justify-between text-xs border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-white uppercase tracking-wider">
              {displayMode === 'SIDE_BY_SIDE' && 'Side-by-Side: EV Charging Cost/KM vs Fuel Benchmark (KES/km)'}
              {displayMode === 'NET_SAVINGS' && 'Net Cost Savings per KM Driven by Vehicle Model (KES/km Saved)'}
              {displayMode === 'COST_RATIO' && 'EV Operating Cost as a Percentage of ICE Fuel Expense (%)'}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            {displayMode === 'SIDE_BY_SIDE' && 'Lower is Better (EV in Emerald, Fuel in Rose)'}
            {displayMode === 'NET_SAVINGS' && 'Higher is Better (Net Margin Retained)'}
            {displayMode === 'COST_RATIO' && 'Lower % = Greater Relative Savings'}
          </div>
        </div>

        {/* Chart View Container */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {displayMode === 'SIDE_BY_SIDE' ? (
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="modelName" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  unit=" KES"
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomBenchmarkTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                />
                <Bar 
                  dataKey="evChargingCostPerKm" 
                  name="EV Charging Cost / KM (KES)" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                >
                  {filteredData.map((entry, index) => (
                    <Cell 
                      key={`cell-ev-${index}`} 
                      fill={entry.category === 'Fleet Average' ? '#2dd4bf' : '#10b981'} 
                    />
                  ))}
                </Bar>
                <Bar 
                  dataKey="iceFuelCostPerKm" 
                  name="ICE Fuel Cost / KM (KES)" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                >
                  {filteredData.map((entry, index) => (
                    <Cell 
                      key={`cell-fuel-${index}`} 
                      fill={entry.category === 'Fleet Average' ? '#fb7185' : '#f43f5e'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : displayMode === 'NET_SAVINGS' ? (
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="modelName" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  unit=" KES"
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomBenchmarkTooltip />} />
                <Bar 
                  dataKey="netSavingsPerKm" 
                  name="Net Savings per KM (KES)" 
                  fill="#06b6d4" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  {filteredData.map((entry, index) => (
                    <Cell 
                      key={`cell-savings-${index}`} 
                      fill={entry.category === 'Fleet Average' ? '#38bdf8' : '#06b6d4'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="modelName" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomBenchmarkTooltip />} />
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '50% Fuel Cost Benchmark', fill: '#f59e0b', fontSize: 10 }} />
                <Bar 
                  dataKey="costRatioPercent" 
                  name="EV Cost as % of Fuel" 
                  fill="#8b5cf6" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  {filteredData.map((entry, index) => (
                    <Cell 
                      key={`cell-ratio-${index}`} 
                      fill={entry.category === 'Fleet Average' ? '#a78bfa' : '#8b5cf6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend / Context Guide */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-850">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <strong className="text-slate-300">EV Electric Charging (KES/km)</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" />
              <strong className="text-slate-300">ICE Fuel Benchmark (KES/km)</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-teal-400" />
              <strong className="text-teal-300">★ Fleet-Wide Average Anchor</strong>
            </span>
          </div>

          <span className="font-mono text-emerald-400">
            Average Cost Advantage: -{fleetSummaryMetrics.fleetAvg.savingsPercent}% vs Petrol/Diesel
          </span>
        </div>

      </div>

      {/* Model Benchmark Data Table Matrix */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3 pl-4">Vehicle Model</th>
              <th className="py-3">Category</th>
              <th className="py-3 text-right">EV Consumption</th>
              <th className="py-3 text-right font-black text-emerald-400">EV Cost / KM</th>
              <th className="py-3 text-right">ICE Fuel Econ</th>
              <th className="py-3 text-right font-black text-rose-400">Fuel Cost / KM</th>
              <th className="py-3 text-right font-black text-amber-300">Net Savings / KM</th>
              <th className="py-3 text-right">Cost Drop %</th>
              <th className="py-3 text-right pr-4">10,000 KM Net Savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredData.map(d => {
              const isAverage = d.category === 'Fleet Average';

              return (
                <tr 
                  key={d.modelName}
                  className={`transition-colors ${
                    isAverage 
                      ? 'bg-teal-500/10 font-bold text-white border-y border-teal-500/30' 
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <td className="py-3 pl-4 font-bold text-white flex items-center gap-2">
                    <Car className={`w-3.5 h-3.5 ${isAverage ? 'text-teal-400' : 'text-slate-400'}`} />
                    <span>{d.modelName}</span>
                  </td>

                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAverage ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                      d.category === 'Two-Wheeler' ? 'bg-cyan-500/10 text-cyan-400' :
                      d.category === 'Light Commercial' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      {d.category}
                    </span>
                  </td>

                  <td className="py-3 text-right font-mono text-slate-300">
                    {d.evWhPerKm} Wh/km
                  </td>

                  <td className="py-3 text-right font-mono font-black text-emerald-400 text-sm">
                    KES {d.evChargingCostPerKm}
                  </td>

                  <td className="py-3 text-right font-mono text-slate-400">
                    {d.iceFuelKmPerLiter} km/L ({d.iceFuelType.includes('Diesel') ? 'Diesel' : 'Petrol'})
                  </td>

                  <td className="py-3 text-right font-mono font-black text-rose-400 text-sm">
                    KES {d.iceFuelCostPerKm}
                  </td>

                  <td className="py-3 text-right font-mono font-black text-amber-300">
                    -KES {d.netSavingsPerKm}
                  </td>

                  <td className="py-3 text-right font-mono font-bold text-emerald-400">
                    -{d.savingsPercent}%
                  </td>

                  <td className="py-3 text-right font-mono font-black text-emerald-300 pr-4">
                    +KES {d.tenThousandKmSavingsKes.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Fleet Transition Financial Payback Calculator */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-teal-400" />
              <span>Fleet Transition Business Case & Payback Calculator</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate fleet operational scale to quantify monthly cash flow savings and capital expenditure amortization
            </p>
          </div>

          <div className="text-xs font-mono text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-lg">
            Payback Time: <strong>{fleetSummaryMetrics.paybackMonths} Months</strong>
          </div>
        </div>

        {/* Calculator Controls & Output Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          
          {/* Distance Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-300">Total Fleet Monthly Distance:</span>
              <span className="font-mono font-bold text-teal-400">{simulatedMonthlyKm.toLocaleString()} km/mo</span>
            </div>

            <input
              type="range"
              min={5000}
              max={150000}
              step={2500}
              value={simulatedMonthlyKm}
              onChange={(e) => setSimulatedMonthlyKm(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5,000 km</span>
              <span>75,000 km</span>
              <span>150,000 km</span>
            </div>
          </div>

          {/* Capital Cost Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-300">Per-Vehicle Acquisition/Conversion:</span>
              <span className="font-mono font-bold text-amber-300">KES {vehicleReplacementCostKes.toLocaleString()}</span>
            </div>

            <input
              type="range"
              min={150000}
              max={1200000}
              step={25000}
              value={vehicleReplacementCostKes}
              onChange={(e) => setVehicleReplacementCostKes(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>KES 150K (Retrofit)</span>
              <span>KES 350K (2W)</span>
              <span>KES 1.2M (Van)</span>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between font-mono">
            <div>
              <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                Monthly Net Cash Retained
              </div>
              <div className="text-xl font-black text-emerald-300 mt-1">
                +KES {fleetSummaryMetrics.monthlySavingsKes.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ mo</span>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 text-[10px] text-slate-300 flex justify-between">
              <span>Annual Net Gain:</span>
              <strong className="text-emerald-400 font-bold">KES {(fleetSummaryMetrics.annualSavingsKes / 1000000).toFixed(2)}M (${fleetSummaryMetrics.annualSavingsUsd.toLocaleString()})</strong>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
