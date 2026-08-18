import React, { useState, useMemo } from 'react';
import { Vehicle, EvBatterySession, BatterySwapRecord } from '../types';
import { 
  Zap, DollarSign, BarChart3, TrendingUp, TrendingDown, 
  Calendar, Layers, Filter, Download, ArrowUpRight, ShieldCheck,
  ChevronDown, ChevronRight, Info, Sparkles, Sliders, Car,
  Fuel, Leaf, CheckCircle2, RefreshCw, FileSpreadsheet, BatteryCharging
} from 'lucide-react';
import { toast } from 'sonner';

interface EvMonthlyEnergySummaryPanelProps {
  vehicles: Vehicle[];
  evSessions?: EvBatterySession[];
  swapRecords?: BatterySwapRecord[];
  onSelectVehicle?: (vehicleId: string) => void;
}

export interface ModelEnergySummary {
  modelKey: string;
  make: string;
  model: string;
  vehicleType: string;
  vehicleCount: number;
  vehicles: Vehicle[];
  totalKwh: number;
  totalCostKes: number;
  avgKwhPerVehicle: number;
  avgCostPerVehicleKes: number;
  avgCostPerKwhKes: number;
  kwhSharePercent: number;
  costSharePercent: number;
  totalKmDrivenMonth: number;
  avgWhPerKm: number;
  avgCostPerKmKes: number;
  equivalentFuelCostKes: number; // What an equivalent ICE vehicle would have spent on Petrol @ KES 198/L
  netCostSavingsKes: number;
  savingsPercent: number;
  co2OffsetKg: number; // ~0.185 kg CO2 saved per km driven vs petrol
  topEfficiencyVehicleReg: string;
}

export interface MonthlyFleetTotals {
  totalKwh: number;
  totalCostKes: number;
  totalKmDriven: number;
  avgFleetCostPerKwhKes: number;
  avgFleetCostPerKmKes: number;
  totalEquivalentFuelCostKes: number;
  totalNetSavingsKes: number;
  overallSavingsPercent: number;
  totalCo2OffsetKg: number;
  totalEvCount: number;
  modelCount: number;
}

// Available months for selector
export const AVAILABLE_MONTHS = [
  { value: '2026-08', label: 'August 2026 (Current MTD)', daysInMonth: 31, elapsedDays: 16 },
  { value: '2026-07', label: 'July 2026 (Full Month)', daysInMonth: 31, elapsedDays: 31 },
  { value: '2026-06', label: 'June 2026 (Full Month)', daysInMonth: 30, elapsedDays: 30 },
  { value: '2026-05', label: 'May 2026 (Full Month)', daysInMonth: 31, elapsedDays: 31 },
  { value: '2026-Q2', label: 'Q2 2026 (Quarterly Aggregate)', daysInMonth: 91, elapsedDays: 91 },
  { value: '2026-YTD', label: 'Year-to-Date 2026', daysInMonth: 228, elapsedDays: 228 }
];

export const EvMonthlyEnergySummaryPanel: React.FC<EvMonthlyEnergySummaryPanelProps> = ({
  vehicles = [],
  evSessions = [],
  swapRecords = [],
  onSelectVehicle
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [expandedModelKey, setExpandedModelKey] = useState<string | null>(null);
  const [tariffAdjustmentKes, setTariffAdjustmentKes] = useState<number>(0); // Simulator delta (+/- KES per kWh)
  const [sortBy, setSortBy] = useState<'kwh' | 'cost' | 'savings' | 'count'>('kwh');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filter electric vehicles
  const evVehicles = useMemo(() => {
    return vehicles.filter(v => v.category === 'Electric' || v.type.toLowerCase().includes('electric'));
  }, [vehicles]);

  // Baseline petrol cost benchmark in Kenya (KES 198.50/L, ~12.5 km/L for cars, ~35 km/L for bodas, ~6 km/L for trucks)
  const PETROL_PRICE_PER_LITER_KES = 198.5;

  // Month scaling factor for historical vs MTD periods
  const monthPeriodConfig = useMemo(() => {
    return AVAILABLE_MONTHS.find(m => m.value === selectedMonth) || AVAILABLE_MONTHS[0];
  }, [selectedMonth]);

  // Aggregate monthly data segmented by model
  const { modelSummaries, fleetTotals } = useMemo(() => {
    const modelMap = new Map<string, {
      make: string;
      model: string;
      vehicleType: string;
      vehicles: Vehicle[];
    }>();

    // Group vehicles by Model
    evVehicles.forEach(v => {
      const key = `${v.make} ${v.model}`.trim();
      if (!modelMap.has(key)) {
        modelMap.set(key, {
          make: v.make,
          model: v.model,
          vehicleType: v.type,
          vehicles: []
        });
      }
      modelMap.get(key)!.vehicles.push(v);
    });

    // Baseline consumption models (Wh/km & monthly average km)
    const modelProfileBaselines: Record<string, { whPerKm: number; baseMonthlyKm: number; iceKmPerLiter: number }> = {
      'Roam Air EV Boda': { whPerKm: 48, baseMonthlyKm: 1850, iceKmPerLiter: 35 },
      'Roam Air 2W': { whPerKm: 48, baseMonthlyKm: 1850, iceKmPerLiter: 35 },
      'Spiro Commuter EV': { whPerKm: 52, baseMonthlyKm: 1720, iceKmPerLiter: 36 },
      'Spiro e-Moto': { whPerKm: 52, baseMonthlyKm: 1720, iceKmPerLiter: 36 },
      'Ampersand e-Boda': { whPerKm: 50, baseMonthlyKm: 1900, iceKmPerLiter: 35 },
      'BYD T3 Express': { whPerKm: 145, baseMonthlyKm: 2400, iceKmPerLiter: 11.5 },
      'BYD T3 Cargo Van': { whPerKm: 142, baseMonthlyKm: 2350, iceKmPerLiter: 11.5 },
      'BYD Atto 3 Cargo': { whPerKm: 138, baseMonthlyKm: 2200, iceKmPerLiter: 12.0 },
      'GreenShift Shuttle': { whPerKm: 115, baseMonthlyKm: 2800, iceKmPerLiter: 9.5 },
      'Opibus Electric Bus': { whPerKm: 185, baseMonthlyKm: 3100, iceKmPerLiter: 5.5 }
    };

    // Calculate raw aggregates
    const summaries: ModelEnergySummary[] = [];

    let totalFleetKwh = 0;
    let totalFleetCostKes = 0;
    let totalFleetKm = 0;
    let totalFleetFuelEquivCost = 0;

    // Time scaling multiplier relative to a 30-day baseline month
    const timeScale = selectedMonth === '2026-YTD' 
      ? 7.5 
      : selectedMonth === '2026-Q2' 
      ? 3.0 
      : (monthPeriodConfig.elapsedDays / 30);

    modelMap.forEach((data, modelKey) => {
      const { make, model, vehicleType, vehicles: modelVehicles } = data;
      const count = modelVehicles.length;

      // Find profile baseline
      const profileKey = Object.keys(modelProfileBaselines).find(k => modelKey.toLowerCase().includes(k.toLowerCase())) || '';
      const profile = profileKey 
        ? modelProfileBaselines[profileKey]
        : {
            whPerKm: vehicleType.includes('Motorcycle') ? 49 : vehicleType.includes('Van') ? 142 : 125,
            baseMonthlyKm: vehicleType.includes('Motorcycle') ? 1800 : 2300,
            iceKmPerLiter: vehicleType.includes('Motorcycle') ? 35 : 12
          };

      // Model sessions energy from session props
      const modelVehicleIds = new Set(modelVehicles.map(v => v.id));
      const modelVehicleRegs = new Set(modelVehicles.map(v => v.registrationNumber));

      const matchedSessions = evSessions.filter(s => 
        modelVehicleIds.has(s.vehicleId) || modelVehicleRegs.has(s.vehicleReg)
      );

      const matchedSwaps = swapRecords.filter(s => 
        modelVehicleIds.has(s.vehicleId) || modelVehicleRegs.has(s.vehicleReg)
      );

      // Session direct sum
      let directKwh = matchedSessions.reduce((sum, s) => sum + s.energyKwhConsumed, 0);
      let directCost = matchedSessions.reduce((sum, s) => sum + s.costKes, 0);

      // Add swap record energy estimation (avg ~2.8 kWh per 2W swap, ~38 kWh per van swap)
      const avgSwapKwh = vehicleType.includes('Motorcycle') ? 2.85 : 36.0;
      const swapKwh = matchedSwaps.reduce((sum, s) => {
        const capacity = s.installedBatteryId.includes('BYD') ? 44.9 : 3.24;
        const deltaSoc = Math.max(10, s.installedBatterySoC - s.removedBatterySoC);
        return sum + (capacity * (deltaSoc / 100));
      }, 0) || (matchedSwaps.length * avgSwapKwh);

      const swapCost = matchedSwaps.reduce((sum, s) => sum + s.costKes, 0);

      // Model total km driven
      const estimatedKm = Math.round(count * profile.baseMonthlyKm * timeScale);
      
      // Calculate realistic total kWh: combination of direct logged telemetry + baseline model projection
      let modelTotalKwh = (directKwh + swapKwh);
      if (modelTotalKwh < (estimatedKm * (profile.whPerKm / 1000) * 0.7)) {
        // Supplement with fleet operational telemetry estimate
        modelTotalKwh = Math.round((estimatedKm * (profile.whPerKm / 1000)));
      }

      // Base electricity tariff average in Kenya: ~KES 48.50/kWh (commercial/swap blend)
      const baseCostPerKwh = 48.50 + tariffAdjustmentKes;
      let modelTotalCost = (directCost + swapCost);
      if (modelTotalCost < modelTotalKwh * 30) {
        modelTotalCost = Math.round(modelTotalKwh * baseCostPerKwh);
      } else if (tariffAdjustmentKes !== 0) {
        modelTotalCost = Math.round(modelTotalKwh * (modelTotalCost / modelTotalKwh + tariffAdjustmentKes));
      }

      const effectiveCostPerKwh = modelTotalKwh > 0 ? (modelTotalCost / modelTotalKwh) : baseCostPerKwh;
      const avgWhPerKm = profile.whPerKm;
      const avgCostPerKm = estimatedKm > 0 ? (modelTotalCost / estimatedKm) : (avgWhPerKm / 1000 * effectiveCostPerKwh);

      // ICE Petrol comparison
      const iceFuelLiters = estimatedKm / profile.iceKmPerLiter;
      const equivalentFuelCost = Math.round(iceFuelLiters * PETROL_PRICE_PER_LITER_KES);
      const netSavings = Math.max(0, equivalentFuelCost - modelTotalCost);
      const savingsPercent = equivalentFuelCost > 0 ? Math.round((netSavings / equivalentFuelCost) * 100) : 68;

      // CO2 offset: ~0.185 kg CO2 per km avoided vs petrol ICE engine
      const co2OffsetKg = Math.round(estimatedKm * (vehicleType.includes('Motorcycle') ? 0.082 : 0.195));

      // Find top efficiency vehicle
      const topVeh = modelVehicles.length > 0 
        ? [...modelVehicles].sort((a, b) => (b.batteryHealthPercent || 95) - (a.batteryHealthPercent || 95))[0].registrationNumber
        : 'N/A';

      totalFleetKwh += modelTotalKwh;
      totalFleetCostKes += modelTotalCost;
      totalFleetKm += estimatedKm;
      totalFleetFuelEquivCost += equivalentFuelCost;

      summaries.push({
        modelKey,
        make,
        model,
        vehicleType,
        vehicleCount: count,
        vehicles: modelVehicles,
        totalKwh: Math.round(modelTotalKwh * 10) / 10,
        totalCostKes: Math.round(modelTotalCost),
        avgKwhPerVehicle: Math.round((modelTotalKwh / count) * 10) / 10,
        avgCostPerVehicleKes: Math.round(modelTotalCost / count),
        avgCostPerKwhKes: Math.round(effectiveCostPerKwh * 100) / 100,
        kwhSharePercent: 0, // computed next
        costSharePercent: 0, // computed next
        totalKmDrivenMonth: estimatedKm,
        avgWhPerKm,
        avgCostPerKmKes: Math.round(avgCostPerKm * 100) / 100,
        equivalentFuelCostKes: equivalentFuelCost,
        netCostSavingsKes: netSavings,
        savingsPercent,
        co2OffsetKg,
        topEfficiencyVehicleReg: topVeh
      });
    });

    // Compute shares and finalize
    summaries.forEach(s => {
      s.kwhSharePercent = totalFleetKwh > 0 ? Math.round((s.totalKwh / totalFleetKwh) * 1000) / 10 : 0;
      s.costSharePercent = totalFleetCostKes > 0 ? Math.round((s.totalCostKes / totalFleetCostKes) * 1000) / 10 : 0;
    });

    // Sort summaries
    summaries.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'kwh') { valA = a.totalKwh; valB = b.totalKwh; }
      else if (sortBy === 'cost') { valA = a.totalCostKes; valB = b.totalCostKes; }
      else if (sortBy === 'savings') { valA = a.netCostSavingsKes; valB = b.netCostSavingsKes; }
      else if (sortBy === 'count') { valA = a.vehicleCount; valB = b.vehicleCount; }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    const fleetNetSavings = Math.max(0, totalFleetFuelEquivCost - totalFleetCostKes);
    const fleetOverallSavingsPercent = totalFleetFuelEquivCost > 0 
      ? Math.round((fleetNetSavings / totalFleetFuelEquivCost) * 100) 
      : 70;

    const totals: MonthlyFleetTotals = {
      totalKwh: Math.round(totalFleetKwh * 10) / 10,
      totalCostKes: Math.round(totalFleetCostKes),
      totalKmDriven: totalFleetKm,
      avgFleetCostPerKwhKes: totalFleetKwh > 0 ? Math.round((totalFleetCostKes / totalFleetKwh) * 100) / 100 : 48.50,
      avgFleetCostPerKmKes: totalFleetKm > 0 ? Math.round((totalFleetCostKes / totalFleetKm) * 100) / 100 : 2.45,
      totalEquivalentFuelCostKes: totalFleetFuelEquivCost,
      totalNetSavingsKes: fleetNetSavings,
      overallSavingsPercent: fleetOverallSavingsPercent,
      totalCo2OffsetKg: summaries.reduce((sum, s) => sum + s.co2OffsetKg, 0),
      totalEvCount: evVehicles.length,
      modelCount: summaries.length
    };

    return { modelSummaries: summaries, fleetTotals: totals };
  }, [evVehicles, evSessions, swapRecords, selectedMonth, monthPeriodConfig, tariffAdjustmentKes, sortBy, sortOrder]);

  // Export CSV of Monthly Energy Summary
  const handleExportCsv = () => {
    if (modelSummaries.length === 0) {
      toast.error('No EV model energy data available to export.');
      return;
    }

    let csv = 'Period,Vehicle Model,Manufacturer,Vehicle Type,Fleet Units,Total Energy (kWh),Energy Share %,Total Cost (KES),Avg Cost/kWh (KES),Avg kWh/Unit,Avg Cost/Unit (KES),Estimated Monthly Km,Wh/km Baseline,Cost/km (KES),Equivalent Petrol Cost (KES),Net Savings (KES),Savings %,CO2 Offset (kg)\n';

    modelSummaries.forEach(m => {
      csv += `"${monthPeriodConfig.label}","${m.model}","${m.make}","${m.vehicleType}",${m.vehicleCount},${m.totalKwh},${m.kwhSharePercent}%,${m.totalCostKes},${m.avgCostPerKwhKes},${m.avgKwhPerVehicle},${m.avgCostPerVehicleKes},${m.totalKmDrivenMonth},${m.avgWhPerKm},${m.avgCostPerKmKes},${m.equivalentFuelCostKes},${m.netCostSavingsKes},${m.savingsPercent}%,${m.co2OffsetKg}\n`;
    });

    // Summary totals row
    csv += `\n"TOTAL FLEET","All Models","GreenShift Fleet","Electric Fleet",${fleetTotals.totalEvCount},${fleetTotals.totalKwh},100%,${fleetTotals.totalCostKes},${fleetTotals.avgFleetCostPerKwhKes},${(fleetTotals.totalKwh / (fleetTotals.totalEvCount || 1)).toFixed(1)},${Math.round(fleetTotals.totalCostKes / (fleetTotals.totalEvCount || 1))},${fleetTotals.totalKmDriven},-,${fleetTotals.avgFleetCostPerKmKes},${fleetTotals.totalEquivalentFuelCostKes},${fleetTotals.totalNetSavingsKes},${fleetTotals.overallSavingsPercent}%,${fleetTotals.totalCo2OffsetKg}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EV_Fleet_Monthly_Energy_Summary_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${modelSummaries.length} EV model monthly summaries to CSV!`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Monthly Energy Consumption & Cost Summary</span>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Fleet Model Segmentation
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive kWh consumption, electricity charging expenditure, and ICE petrol savings across electric vehicle models
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {/* Month Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
            >
              {AVAILABLE_MONTHS.map(m => (
                <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
            title="Download formatted monthly energy summary spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid: High-Level Fleet Aggregate Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Energy Consumed (kWh) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Monthly Energy</span>
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {fleetTotals.totalKwh.toLocaleString()} <span className="text-sm font-normal text-teal-400">kWh</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Fleet EV Assets:</span>
              <strong className="text-slate-200">{fleetTotals.totalEvCount} Units ({fleetTotals.modelCount} Models)</strong>
            </div>
          </div>
          <div className="text-[11px] text-teal-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>Avg / Vehicle:</span>
            <strong className="text-slate-200">
              {(fleetTotals.totalKwh / (fleetTotals.totalEvCount || 1)).toFixed(1)} kWh/mo
            </strong>
          </div>
        </div>

        {/* Card 2: Total Energy Expenditure (KES) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Energy Cost</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              KES {fleetTotals.totalCostKes.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Effective Tariff:</span>
              <strong className="text-amber-300 font-mono">KES {fleetTotals.avgFleetCostPerKwhKes}/kWh</strong>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>Cost / km Driven:</span>
            <strong className="text-slate-200">~KES {fleetTotals.avgFleetCostPerKmKes} / km</strong>
          </div>
        </div>

        {/* Card 3: Net Fuel Savings vs ICE Petrol (KES) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ICE Petrol Savings</span>
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
              KES {fleetTotals.totalNetSavingsKes.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>ICE Benchmark Cost:</span>
              <span className="text-rose-400 font-mono line-through">KES {fleetTotals.totalEquivalentFuelCostKes.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>Operating Cost Reduction:</span>
            <strong className="text-emerald-300 font-bold">-{fleetTotals.overallSavingsPercent}% Savings</strong>
          </div>
        </div>

        {/* Card 4: Clean Energy & Operational Distance */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Distance & Carbon Saved</span>
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Leaf className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-teal-300 font-mono tracking-tight">
              {fleetTotals.totalKmDriven.toLocaleString()} <span className="text-sm font-normal text-slate-400">km</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>CO₂ Emissions Offset:</span>
              <strong className="text-emerald-400 font-mono font-bold">{fleetTotals.totalCo2OffsetKg.toLocaleString()} kg</strong>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-850 flex items-center justify-between">
            <span>Clean Fleet Uptime:</span>
            <strong className="text-teal-450 text-teal-300 font-bold">100% Zero Direct Tailpipe</strong>
          </div>
        </div>

      </div>

      {/* Model Consumption Distribution Progress Bars */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-teal-400" />
            Energy Consumption Share by Vehicle Model
          </span>
          <span className="text-slate-400 font-mono">
            {fleetTotals.totalKwh.toLocaleString()} kWh Total (100%)
          </span>
        </div>

        {/* Stacked segmented visual bar */}
        <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          {modelSummaries.map((m, idx) => {
            const colors = [
              'bg-teal-400', 'bg-emerald-400', 'bg-cyan-400', 
              'bg-amber-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400'
            ];
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={m.modelKey}
                style={{ width: `${Math.max(2, m.kwhSharePercent)}%` }}
                className={`h-full ${colorClass} transition-all duration-500 relative group cursor-pointer`}
                title={`${m.model}: ${m.totalKwh.toLocaleString()} kWh (${m.kwhSharePercent}%)`}
              />
            );
          })}
        </div>

        {/* Legend of Model Shares */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px]">
          {modelSummaries.map((m, idx) => {
            const dotColors = [
              'bg-teal-400', 'bg-emerald-400', 'bg-cyan-400', 
              'bg-amber-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400'
            ];
            return (
              <div 
                key={m.modelKey}
                onClick={() => setExpandedModelKey(expandedModelKey === m.modelKey ? null : m.modelKey)}
                className="flex items-center gap-1.5 cursor-pointer hover:text-white transition text-slate-300"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                <span className="font-semibold">{m.model}</span>
                <span className="text-slate-500 font-mono">({m.kwhSharePercent}% • {m.totalKwh.toLocaleString()} kWh)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Sorting & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            Model Breakdown Matrix:
          </span>
          <span className="text-xs text-slate-400 font-mono">({modelSummaries.length} Models)</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400">Sort by:</span>
          
          <button
            onClick={() => {
              if (sortBy === 'kwh') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('kwh'); setSortOrder('desc'); }
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition border cursor-pointer ${
              sortBy === 'kwh'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Energy (kWh) {sortBy === 'kwh' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'cost') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('cost'); setSortOrder('desc'); }
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition border cursor-pointer ${
              sortBy === 'cost'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Cost (KES) {sortBy === 'cost' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'savings') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('savings'); setSortOrder('desc'); }
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition border cursor-pointer ${
              sortBy === 'savings'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Net Savings {sortBy === 'savings' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'count') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('count'); setSortOrder('desc'); }
            }}
            className={`px-2.5 py-1 rounded-lg font-semibold transition border cursor-pointer ${
              sortBy === 'count'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Units Count {sortBy === 'count' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>

      {/* Primary Model Segmentation Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3.5 pl-4">Vehicle Model & Make</th>
              <th className="py-3.5 text-center">Fleet Units</th>
              <th className="py-3.5 text-right">Monthly Energy (kWh)</th>
              <th className="py-3.5 text-right">Share (%)</th>
              <th className="py-3.5 text-right">Total Cost (KES)</th>
              <th className="py-3.5 text-right">Avg Cost / kWh</th>
              <th className="py-3.5 text-right">Avg kWh / Unit</th>
              <th className="py-3.5 text-right">Cost / km</th>
              <th className="py-3.5 text-right">Net Savings (vs Petrol)</th>
              <th className="py-3.5 text-center pr-4">Drilldown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {modelSummaries.map((m) => {
              const isExpanded = expandedModelKey === m.modelKey;

              return (
                <React.Fragment key={m.modelKey}>
                  <tr 
                    onClick={() => setExpandedModelKey(isExpanded ? null : m.modelKey)}
                    className={`transition-colors cursor-pointer hover:bg-slate-800/60 ${
                      isExpanded ? 'bg-teal-500/10 border-l-2 border-teal-400' : 'bg-slate-900'
                    }`}
                  >
                    <td className="py-3.5 pl-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-teal-400">
                          <Car className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{m.make} {m.model}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{m.vehicleType}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-200 font-bold text-[11px]">
                        {m.vehicleCount} {m.vehicleCount === 1 ? 'unit' : 'units'}
                      </span>
                    </td>

                    <td className="py-3.5 text-right font-mono font-black text-teal-400 text-sm">
                      {m.totalKwh.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">kWh</span>
                    </td>

                    <td className="py-3.5 text-right font-mono">
                      <div className="font-bold text-slate-200">{m.kwhSharePercent}%</div>
                      <div className="w-16 h-1 bg-slate-800 rounded-full ml-auto mt-1 overflow-hidden">
                        <div className="h-full bg-teal-400" style={{ width: `${m.kwhSharePercent}%` }} />
                      </div>
                    </td>

                    <td className="py-3.5 text-right font-mono font-bold text-emerald-400 text-xs">
                      KES {m.totalCostKes.toLocaleString()}
                    </td>

                    <td className="py-3.5 text-right font-mono text-amber-300">
                      KES {m.avgCostPerKwhKes}
                    </td>

                    <td className="py-3.5 text-right font-mono text-slate-300">
                      {m.avgKwhPerVehicle} kWh
                    </td>

                    <td className="py-3.5 text-right font-mono text-slate-300">
                      KES {m.avgCostPerKmKes}
                    </td>

                    <td className="py-3.5 text-right font-mono">
                      <div className="text-emerald-400 font-bold">+KES {m.netCostSavingsKes.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 font-normal">({m.savingsPercent}% saved)</div>
                    </td>

                    <td className="py-3.5 text-center pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedModelKey(isExpanded ? null : m.modelKey);
                        }}
                        className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                        title="Expand model asset details"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-teal-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Model Drilldown Sub-Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-950/90 border-y border-slate-800">
                      <td colSpan={10} className="p-4 space-y-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                            <div>
                              <h5 className="font-bold text-white text-xs flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                                <span>{m.make} {m.model} Asset Sub-Fleet Drilldown</span>
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Breakdown of {m.vehicleCount} vehicles in this model group, battery health, and recent energy usage
                              </p>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-mono">
                              <span className="text-slate-400">Monthly Distance: <strong className="text-teal-300">{m.totalKmDrivenMonth.toLocaleString()} km</strong></span>
                              <span className="text-slate-400">CO₂ Avoided: <strong className="text-emerald-400">{m.co2OffsetKg} kg</strong></span>
                            </div>
                          </div>

                          {/* Individual Vehicle Assets Table */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                            {m.vehicles.map(veh => {
                              const estVehKwh = Math.round(m.avgKwhPerVehicle * ((veh.batteryHealthPercent || 96) / 96) * 10) / 10;
                              const estVehCost = Math.round(estVehKwh * m.avgCostPerKwhKes);

                              return (
                                <div 
                                  key={veh.id}
                                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs hover:border-teal-500/40 transition"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-white font-mono">{veh.registrationNumber}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      veh.status === 'On Trip' ? 'bg-emerald-500/20 text-emerald-400' :
                                      veh.status === 'Online' ? 'bg-cyan-500/20 text-cyan-400' :
                                      'bg-slate-800 text-slate-400'
                                    }`}>
                                      {veh.status}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-300">
                                    <span className="text-slate-500">Driver:</span> {veh.assignedDriverName || 'Pool Asset'}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-850 text-[10px] font-mono">
                                    <div>
                                      <span className="text-slate-500 block">Est. Energy:</span>
                                      <span className="font-bold text-teal-400">{estVehKwh} kWh</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Est. Cost:</span>
                                      <span className="font-bold text-emerald-400">KES {estVehCost.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Battery SOH:</span>
                                      <span className="font-bold text-slate-200">{veh.batteryHealthPercent || 98}%</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Current SoC:</span>
                                      <span className="font-bold text-amber-300">{veh.currentSoCPercent || 85}%</span>
                                    </div>
                                  </div>

                                  {onSelectVehicle && (
                                    <button
                                      onClick={() => onSelectVehicle(veh.id)}
                                      className="w-full mt-1.5 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 text-[10px] font-bold transition border border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <span>Simulate Range</span>
                                      <ArrowUpRight className="w-3 h-3 text-teal-400" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* Fleet Total Summary Row */}
          <tfoot>
            <tr className="bg-slate-950 border-t-2 border-teal-500/40 text-xs font-bold">
              <td className="py-4 pl-4 text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Total Electric Fleet ({fleetTotals.totalEvCount} EVs)</span>
              </td>
              <td className="py-4 text-center font-mono text-slate-200">
                {fleetTotals.totalEvCount} Total
              </td>
              <td className="py-4 text-right font-mono font-black text-teal-300 text-base">
                {fleetTotals.totalKwh.toLocaleString()} kWh
              </td>
              <td className="py-4 text-right font-mono text-slate-200">
                100%
              </td>
              <td className="py-4 text-right font-mono font-black text-emerald-400 text-base">
                KES {fleetTotals.totalCostKes.toLocaleString()}
              </td>
              <td className="py-4 text-right font-mono text-amber-300">
                KES {fleetTotals.avgFleetCostPerKwhKes}
              </td>
              <td className="py-4 text-right font-mono text-slate-300">
                {(fleetTotals.totalKwh / (fleetTotals.totalEvCount || 1)).toFixed(1)} kWh
              </td>
              <td className="py-4 text-right font-mono text-slate-300">
                KES {fleetTotals.avgFleetCostPerKmKes}
              </td>
              <td className="py-4 text-right font-mono font-black text-emerald-400">
                +KES {fleetTotals.totalNetSavingsKes.toLocaleString()}
              </td>
              <td className="py-4 pr-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tariff Simulation & E-Mobility Insights Footer Panel */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        
        {/* Left note */}
        <div className="flex items-start gap-2.5 max-w-xl">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="text-slate-300 leading-relaxed">
            <span className="font-bold text-white block">Tariff Methodology & Off-Peak TOU:</span>
            Calculated across commercial swap station tariffs and depot smart charging rates. Compared against standard Super Petrol at <strong>KES {PETROL_PRICE_PER_LITER_KES}/L</strong> with model-specific ICE consumption equivalents.
          </div>
        </div>

        {/* Right: Tariff Delta Sensitivity Slider */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5 w-full md:w-72 shrink-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              Tariff Sensitivity:
            </span>
            <span className="font-mono font-bold text-teal-300">
              {tariffAdjustmentKes > 0 ? `+${tariffAdjustmentKes}` : tariffAdjustmentKes} KES/kWh
            </span>
          </div>

          <input
            type="range"
            min={-15}
            max={25}
            step={1}
            value={tariffAdjustmentKes}
            onChange={(e) => setTariffAdjustmentKes(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />

          <div className="flex items-center justify-between text-[9px] text-slate-500">
            <span>-15 Off-Peak Solar</span>
            <span>Standard Rate</span>
            <span>+25 Peak Grid</span>
          </div>
        </div>

      </div>

    </div>
  );
};
