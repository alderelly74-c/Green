import React, { useState, useMemo } from 'react';
import { Vehicle } from '../types';
import { 
  Zap, Fuel, DollarSign, TrendingUp, ShieldCheck, Scale, 
  Sparkles, Calculator, Layers, ArrowUpRight, ArrowDownRight, 
  Info, BarChart3, Sliders, CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { toast } from 'sonner';

interface LifecycleRoiWidgetProps {
  vehicles?: Vehicle[];
}

export type OwnershipHorizon = '1_YEAR' | '3_YEARS' | '5_YEARS';

export interface CategoryTcoSummary {
  category: 'Electric' | 'Fuel';
  count: number;
  totalAcquisitionKes: number;
  avgAcquisitionPerVehicleKes: number;
  totalEnergySpentKes: number; // Charging for EV, Petrol/Diesel for Fuel
  avgEnergyPerKmKes: number;
  totalMaintenanceSpentKes: number;
  avgMaintenancePerKmKes: number;
  totalOpexKes: number; // Energy + Maintenance
  totalTcoKes: number; // CAPEX + OPEX
  totalRevenueKes: number;
  netProfitKes: number;
  roiPercentage: number;
  costPerKmKes: number;
  paybackMonths: number;
  totalOdometerKm: number;
}

export const LifecycleRoiWidget: React.FC<LifecycleRoiWidgetProps> = ({
  vehicles = []
}) => {
  // Time horizon state
  const [horizon, setHorizon] = useState<OwnershipHorizon>('5_YEARS');

  // Energy cost multipliers for scenario simulation
  const [petrolPricePerLiterKes, setPetrolPricePerLiterKes] = useState<number>(215);
  const [evTariffPerKwhKes, setEvTariffPerKwhKes] = useState<number>(28);

  // Time horizon multiplier
  const horizonFactor = useMemo(() => {
    switch (horizon) {
      case '1_YEAR': return 0.25;
      case '3_YEARS': return 0.65;
      case '5_YEARS': return 1.0;
      default: return 1.0;
    }
  }, [horizon]);

  // Compute actual or baseline vehicle data categorized into Electric vs Fuel
  const tcoData = useMemo(() => {
    // Electric vehicles calculation
    const evs = vehicles.filter(v => v.category === 'Electric');
    // Fuel vehicles calculation
    const fuels = vehicles.filter(v => v.category === 'Fuel');

    const defaultEvCount = evs.length || 14;
    const defaultFuelCount = fuels.length || 10;

    // EV Totals (scaled by horizon and current simulated tariff)
    const evAcquisition = evs.length > 0 
      ? evs.reduce((sum, v) => sum + (v.purchasePriceKes || 3800000), 0)
      : defaultEvCount * 3800000;

    const rawEvCharging = evs.length > 0
      ? evs.reduce((sum, v) => sum + (v.totalChargingSpentKes || 240000), 0)
      : defaultEvCount * 450000;
    // Scale charging by tariff ratio (28 KES/kWh baseline)
    const evEnergySpent = Math.round(rawEvCharging * (evTariffPerKwhKes / 28) * horizonFactor * 1.8);

    const rawEvMaint = evs.length > 0
      ? evs.reduce((sum, v) => sum + (v.totalMaintenanceSpentKes || 110000), 0)
      : defaultEvCount * 220000;
    const evMaintSpent = Math.round(rawEvMaint * horizonFactor * 1.6);

    const rawEvRev = evs.length > 0
      ? evs.reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 2800000), 0)
      : defaultEvCount * 6200000;
    const evRevenue = Math.round(rawEvRev * horizonFactor * 1.9);

    const evOdometer = evs.length > 0
      ? evs.reduce((sum, v) => sum + (v.odometerKm || 45000), 0)
      : defaultEvCount * 125000;

    const evOpex = evEnergySpent + evMaintSpent;
    const evTco = evAcquisition + evOpex;
    const evNetProfit = evRevenue - evTco;
    const evRoi = evTco > 0 ? (evNetProfit / evTco) * 100 : 0;
    const evCostPerKm = evOdometer > 0 ? evTco / evOdometer : 0;
    // Payback period (months) = CAPEX / Monthly Net Operating Cashflow
    const evMonthlyCashflow = (evRevenue - evOpex) / (60 * horizonFactor);
    const evPaybackMonths = evMonthlyCashflow > 0 ? Math.round((evAcquisition / evMonthlyCashflow)) : 24;

    // Fuel Totals (scaled by petrol price ratio)
    const fuelAcquisition = fuels.length > 0
      ? fuels.reduce((sum, v) => sum + (v.purchasePriceKes || 2400000), 0)
      : defaultFuelCount * 2400000;

    const rawFuelSpent = fuels.length > 0
      ? fuels.reduce((sum, v) => sum + (v.totalFuelSpentKes || 850000), 0)
      : defaultFuelCount * 1450000;
    // Scale fuel by petrol price ratio (215 KES/L baseline)
    const fuelEnergySpent = Math.round(rawFuelSpent * (petrolPricePerLiterKes / 215) * horizonFactor * 1.8);

    const rawFuelMaint = fuels.length > 0
      ? fuels.reduce((sum, v) => sum + (v.totalMaintenanceSpentKes || 380000), 0)
      : defaultFuelCount * 680000;
    const fuelMaintSpent = Math.round(rawFuelMaint * horizonFactor * 1.7);

    const rawFuelRev = fuels.length > 0
      ? fuels.reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 2100000), 0)
      : defaultFuelCount * 4800000;
    const fuelRevenue = Math.round(rawFuelRev * horizonFactor * 1.8);

    const fuelOdometer = fuels.length > 0
      ? fuels.reduce((sum, v) => sum + (v.odometerKm || 52000), 0)
      : defaultFuelCount * 138000;

    const fuelOpex = fuelEnergySpent + fuelMaintSpent;
    const fuelTco = fuelAcquisition + fuelOpex;
    const fuelNetProfit = fuelRevenue - fuelTco;
    const fuelRoi = fuelTco > 0 ? (fuelNetProfit / fuelTco) * 100 : 0;
    const fuelCostPerKm = fuelOdometer > 0 ? fuelTco / fuelOdometer : 0;
    const fuelMonthlyCashflow = (fuelRevenue - fuelOpex) / (60 * horizonFactor);
    const fuelPaybackMonths = fuelMonthlyCashflow > 0 ? Math.round((fuelAcquisition / fuelMonthlyCashflow)) : 38;

    const electricSummary: CategoryTcoSummary = {
      category: 'Electric',
      count: defaultEvCount,
      totalAcquisitionKes: evAcquisition,
      avgAcquisitionPerVehicleKes: Math.round(evAcquisition / defaultEvCount),
      totalEnergySpentKes: evEnergySpent,
      avgEnergyPerKmKes: Math.round((evEnergySpent / evOdometer) * 10) / 10,
      totalMaintenanceSpentKes: evMaintSpent,
      avgMaintenancePerKmKes: Math.round((evMaintSpent / evOdometer) * 10) / 10,
      totalOpexKes: evOpex,
      totalTcoKes: evTco,
      totalRevenueKes: evRevenue,
      netProfitKes: evNetProfit,
      roiPercentage: Math.round(evRoi),
      costPerKmKes: Math.round(evCostPerKm * 10) / 10,
      paybackMonths: evPaybackMonths,
      totalOdometerKm: evOdometer
    };

    const fuelSummary: CategoryTcoSummary = {
      category: 'Fuel',
      count: defaultFuelCount,
      totalAcquisitionKes: fuelAcquisition,
      avgAcquisitionPerVehicleKes: Math.round(fuelAcquisition / defaultFuelCount),
      totalEnergySpentKes: fuelEnergySpent,
      avgEnergyPerKmKes: Math.round((fuelEnergySpent / fuelOdometer) * 10) / 10,
      totalMaintenanceSpentKes: fuelMaintSpent,
      avgMaintenancePerKmKes: Math.round((fuelMaintSpent / fuelOdometer) * 10) / 10,
      totalOpexKes: fuelOpex,
      totalTcoKes: fuelTco,
      totalRevenueKes: fuelRevenue,
      netProfitKes: fuelNetProfit,
      roiPercentage: Math.round(fuelRoi),
      costPerKmKes: Math.round(fuelCostPerKm * 10) / 10,
      paybackMonths: fuelPaybackMonths,
      totalOdometerKm: fuelOdometer
    };

    // Calculate comparative deltas per vehicle
    const evOpexPerVeh = evOpex / defaultEvCount;
    const fuelOpexPerVeh = fuelOpex / defaultFuelCount;
    const opexSavingsPerEv = fuelOpexPerVeh - evOpexPerVeh;

    const evNetProfitPerVeh = evNetProfit / defaultEvCount;
    const fuelNetProfitPerVeh = fuelNetProfit / defaultFuelCount;
    const extraProfitPerEv = evNetProfitPerVeh - fuelNetProfitPerVeh;

    return {
      electricSummary,
      fuelSummary,
      opexSavingsPerEv: Math.round(opexSavingsPerEv),
      extraProfitPerEv: Math.round(extraProfitPerEv)
    };
  }, [vehicles, horizonFactor, petrolPricePerLiterKes, evTariffPerKwhKes]);

  // Chart dataset for stacked/grouped Recharts comparison
  const chartData = useMemo(() => {
    const { electricSummary: ev, fuelSummary: fuel } = tcoData;

    return [
      {
        metric: 'Acquisition (CAPEX)',
        Electric: Math.round(ev.avgAcquisitionPerVehicleKes / 1000),
        Fuel: Math.round(fuel.avgAcquisitionPerVehicleKes / 1000),
        unit: 'k KES'
      },
      {
        metric: 'Energy Spent (Fuel/Charging)',
        Electric: Math.round((ev.totalEnergySpentKes / ev.count) / 1000),
        Fuel: Math.round((fuel.totalEnergySpentKes / fuel.count) / 1000),
        unit: 'k KES'
      },
      {
        metric: 'Maintenance & Servicing',
        Electric: Math.round((ev.totalMaintenanceSpentKes / ev.count) / 1000),
        Fuel: Math.round((fuel.totalMaintenanceSpentKes / fuel.count) / 1000),
        unit: 'k KES'
      },
      {
        metric: 'Total Cost of Ownership (TCO)',
        Electric: Math.round((ev.totalTcoKes / ev.count) / 1000),
        Fuel: Math.round((fuel.totalTcoKes / fuel.count) / 1000),
        unit: 'k KES'
      },
      {
        metric: 'Net Profit per Vehicle',
        Electric: Math.round((ev.netProfitKes / ev.count) / 1000),
        Fuel: Math.round((fuel.netProfitKes / fuel.count) / 1000),
        unit: 'k KES'
      }
    ];
  }, [tcoData]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                Fleet Lifecycle ROI & Total Cost of Ownership (TCO) Widget
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>EV vs Fuel Capital ROI</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Combines acquisition CAPEX, lifetime fuel/charging expenditures, and maintenance expenses to demonstrate long-term vehicle profitability
            </p>
          </div>
        </div>

        {/* TIME HORIZON SELECTOR */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          {(['1_YEAR', '3_YEARS', '5_YEARS'] as OwnershipHorizon[]).map(h => (
            <button
              key={h}
              onClick={() => {
                setHorizon(h);
                toast.info(`Updated Lifecycle Horizon to ${h.replace('_', ' ')}`, {
                  description: 'Recalculated long-term TCO, energy OPEX, and net lifetime profitability.'
                });
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                horizon === h ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {h === '1_YEAR' ? '1 Year' : h === '3_YEARS' ? '3 Years' : '5 Years (Lifetime)'}
            </button>
          ))}
        </div>
      </div>

      {/* TOP SUMMARY CARDS: ELECTRIC VS FUEL SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* ELECTRIC VEHICLES TCO CARD */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 relative overflow-hidden shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  Electric Vehicles (EV)
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                    {tcoData.electricSummary.count} Active Units
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Zero tailpipe emissions • High CAPEX / Low OPEX</p>
              </div>
            </div>

            <span className="text-emerald-400 font-mono text-sm font-black bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
              +{tcoData.electricSummary.roiPercentage}% ROI
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            
            {/* Avg Acquisition */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Avg Unit Acquisition (CAPEX)</span>
              <div className="text-sm font-bold text-slate-200 mt-1">
                KES {(tcoData.electricSummary.avgAcquisitionPerVehicleKes / 1000).toFixed(0)}k
              </div>
            </div>

            {/* Total Energy Spent */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Charging OPEX ({evTariffPerKwhKes} KES/kWh)</span>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                KES {(tcoData.electricSummary.totalEnergySpentKes / tcoData.electricSummary.count / 1000).toFixed(0)}k / veh
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">KES {tcoData.electricSummary.avgEnergyPerKmKes}/km</div>
            </div>

            {/* Maintenance Spent */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Maintenance OPEX</span>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                KES {(tcoData.electricSummary.totalMaintenanceSpentKes / tcoData.electricSummary.count / 1000).toFixed(0)}k / veh
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">KES {tcoData.electricSummary.avgMaintenancePerKmKes}/km</div>
            </div>

            {/* Total TCO Per Vehicle */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] font-sans text-emerald-400 font-bold block">Total Unit TCO</span>
              <div className="text-sm font-black text-white mt-1">
                KES {(tcoData.electricSummary.totalTcoKes / tcoData.electricSummary.count / 1000).toFixed(0)}k
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">CAPEX + Lifetime OPEX</div>
            </div>

            {/* Net Lifetime Profit */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] font-sans text-emerald-400 font-bold block">Net Profit / Vehicle</span>
              <div className="text-sm font-black text-emerald-400 mt-1">
                +KES {(tcoData.electricSummary.netProfitKes / tcoData.electricSummary.count / 1000).toFixed(0)}k
              </div>
            </div>

            {/* Payback Period */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Payback Period</span>
              <div className="text-sm font-bold text-amber-300 mt-1">
                {tcoData.electricSummary.paybackMonths} Months
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">To offset CAPEX</div>
            </div>

          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>EV Lifetime Profit Advantage:</span>
            </span>
            <span className="font-mono font-black text-white">
              +KES {tcoData.extraProfitPerEv.toLocaleString()} / vehicle vs Fuel
            </span>
          </div>

        </div>

        {/* FUEL / HYBRID VEHICLES TCO CARD */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-rose-500/30 relative overflow-hidden shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  Fuel / Hybrid Vehicles
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 font-bold">
                    {tcoData.fuelSummary.count} Active Units
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Petrol / Diesel ICE • Lower CAPEX / High OPEX</p>
              </div>
            </div>

            <span className="text-rose-400 font-mono text-sm font-black bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20">
              +{tcoData.fuelSummary.roiPercentage}% ROI
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            
            {/* Avg Acquisition */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Avg Unit Acquisition (CAPEX)</span>
              <div className="text-sm font-bold text-slate-200 mt-1">
                KES {(tcoData.fuelSummary.avgAcquisitionPerVehicleKes / 1000).toFixed(0)}k
              </div>
            </div>

            {/* Total Energy Spent */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Fuel OPEX ({petrolPricePerLiterKes} KES/L)</span>
              <div className="text-sm font-bold text-rose-400 mt-1">
                KES {(tcoData.fuelSummary.totalEnergySpentKes / tcoData.fuelSummary.count / 1000).toFixed(0)}k / veh
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">KES {tcoData.fuelSummary.avgEnergyPerKmKes}/km</div>
            </div>

            {/* Maintenance Spent */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Maintenance OPEX</span>
              <div className="text-sm font-bold text-rose-400 mt-1">
                KES {(tcoData.fuelSummary.totalMaintenanceSpentKes / tcoData.fuelSummary.count / 1000).toFixed(0)}k / veh
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">KES {tcoData.fuelSummary.avgMaintenancePerKmKes}/km</div>
            </div>

            {/* Total TCO Per Vehicle */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-rose-500/30">
              <span className="text-[10px] font-sans text-rose-400 font-bold block">Total Unit TCO</span>
              <div className="text-sm font-black text-white mt-1">
                KES {(tcoData.fuelSummary.totalTcoKes / tcoData.fuelSummary.count / 1000).toFixed(0)}k
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">CAPEX + Lifetime OPEX</div>
            </div>

            {/* Net Lifetime Profit */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-rose-500/30">
              <span className="text-[10px] font-sans text-rose-400 font-bold block">Net Profit / Vehicle</span>
              <div className="text-sm font-black text-rose-300 mt-1">
                +KES {(tcoData.fuelSummary.netProfitKes / tcoData.fuelSummary.count / 1000).toFixed(0)}k
              </div>
            </div>

            {/* Payback Period */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Payback Period</span>
              <div className="text-sm font-bold text-amber-300 mt-1">
                {tcoData.fuelSummary.paybackMonths} Months
              </div>
              <div className="text-[9px] text-slate-400 font-sans mt-0.5">To offset CAPEX</div>
            </div>

          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-center justify-between text-xs text-rose-300">
            <span className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Fuel OPEX Penalty:</span>
            </span>
            <span className="font-mono font-black text-white">
              +KES {tcoData.opexSavingsPerEv.toLocaleString()} extra operating cost / veh
            </span>
          </div>

        </div>

      </div>

      {/* TCO BREAKDOWN RECHARTS COMPARISON GRAPH & TARIFF CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        
        {/* RECHARTS COMPARISON BAR CHART */}
        <div className="lg:col-span-8 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Side-by-Side Unit TCO Component Breakdown (in Thousands KES)</span>
            </h3>
            <span className="text-slate-400 font-mono text-[11px]">Horizon: {horizon.replace('_', ' ')}</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`KES ${Number(value).toLocaleString()}k`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                <Bar dataKey="Electric" fill="#10b981" radius={[4, 4, 0, 0]} name="Electric (EV)" />
                <Bar dataKey="Fuel" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Fuel / ICE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INTERACTIVE FUEL & TARIFF SCENARIO SIMULATOR */}
        <div className="lg:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-xs">Energy Price Sensitivity Simulator</h3>
          </div>

          {/* Petrol Price Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Petrol/Diesel Price:</span>
              <strong className="text-rose-400 font-mono">KES {petrolPricePerLiterKes} / Liter</strong>
            </div>
            <input 
              type="range" 
              min={180} 
              max={280} 
              value={petrolPricePerLiterKes}
              onChange={(e) => setPetrolPricePerLiterKes(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* EV Electricity Tariff Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">EV Tariff Rate:</span>
              <strong className="text-emerald-400 font-mono">KES {evTariffPerKwhKes} / kWh</strong>
            </div>
            <input 
              type="range" 
              min={15} 
              max={45} 
              value={evTariffPerKwhKes}
              onChange={(e) => setEvTariffPerKwhKes(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5 font-mono">
            <div className="text-slate-300 font-sans font-bold flex items-center justify-between">
              <span>EV TCO Advantage Index:</span>
              <span className="text-emerald-400">High Profitability</span>
            </div>
            <p className="text-slate-400 text-[10px] font-sans leading-relaxed">
              At KES {petrolPricePerLiterKes}/L fuel vs KES {evTariffPerKwhKes}/kWh electricity, EVs pay off their higher acquisition price within <strong>{tcoData.electricSummary.paybackMonths} months</strong> and deliver <strong>+{(tcoData.electricSummary.roiPercentage - tcoData.fuelSummary.roiPercentage)}% higher ROI</strong> over 5 years.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
