import React, { useState, useMemo } from 'react';
import { Vehicle, EvBatterySession, BatterySwapRecord } from '../types';
import {
  Calculator, Zap, Fuel, DollarSign, TrendingUp, TrendingDown,
  Calendar, Clock, Award, ShieldCheck, HelpCircle, Info,
  Sparkles, CheckCircle2, Sliders, RefreshCw, Download, Copy,
  ArrowUpRight, ArrowDownRight, Layers, Car, Wrench, Leaf,
  ChevronRight, Scale, BarChart3, LineChart as LucideLineChart,
  FileSpreadsheet, Percent, Timer
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceDot
} from 'recharts';
import { toast } from 'sonner';

interface EvRoiCalculatorProps {
  vehicles?: Vehicle[];
  evSessions?: EvBatterySession[];
  swapRecords?: BatterySwapRecord[];
  className?: string;
  onNavigateToVehicle?: (vehicleId: string) => void;
}

export type VehicleArchetypeId = 'roam_air_2w' | 'spiro_commuter' | 'byd_t3_van' | 'byd_atto3_cargo' | 'opibus_bus' | 'custom_fleet';

interface ArchetypeProfile {
  id: VehicleArchetypeId;
  name: string;
  category: 'Two-Wheeler' | 'Light Commercial' | 'Bus & Shuttle' | 'Custom';
  evWhPerKm: number; // Wh/km
  iceKmPerLiter: number; // km/L
  fuelType: 'Super Petrol' | 'Automotive Diesel';
  defaultDailyMileageKm: number;
  defaultCapexPremiumKes: number; // Upfront price difference or conversion cost
  defaultMonthlyMaintSavingsKes: number; // Monthly maintenance savings
  co2GramsPerKm: number;
}

const ARCHETYPE_PROFILES: Record<VehicleArchetypeId, ArchetypeProfile> = {
  roam_air_2w: {
    id: 'roam_air_2w',
    name: 'Roam Air EV Motorcycle',
    category: 'Two-Wheeler',
    evWhPerKm: 48,
    iceKmPerLiter: 35.0,
    fuelType: 'Super Petrol',
    defaultDailyMileageKm: 85,
    defaultCapexPremiumKes: 110000,
    defaultMonthlyMaintSavingsKes: 4500,
    co2GramsPerKm: 82
  },
  spiro_commuter: {
    id: 'spiro_commuter',
    name: 'Spiro Commuter e-Moto',
    category: 'Two-Wheeler',
    evWhPerKm: 52,
    iceKmPerLiter: 36.0,
    fuelType: 'Super Petrol',
    defaultDailyMileageKm: 90,
    defaultCapexPremiumKes: 125000,
    defaultMonthlyMaintSavingsKes: 4800,
    co2GramsPerKm: 80
  },
  byd_t3_van: {
    id: 'byd_t3_van',
    name: 'BYD T3 Express Electric Van',
    category: 'Light Commercial',
    evWhPerKm: 145,
    iceKmPerLiter: 11.5,
    fuelType: 'Super Petrol',
    defaultDailyMileageKm: 130,
    defaultCapexPremiumKes: 680000,
    defaultMonthlyMaintSavingsKes: 14500,
    co2GramsPerKm: 195
  },
  byd_atto3_cargo: {
    id: 'byd_atto3_cargo',
    name: 'BYD Atto 3 Cargo Delivery',
    category: 'Light Commercial',
    evWhPerKm: 138,
    iceKmPerLiter: 12.0,
    fuelType: 'Super Petrol',
    defaultDailyMileageKm: 120,
    defaultCapexPremiumKes: 750000,
    defaultMonthlyMaintSavingsKes: 16000,
    co2GramsPerKm: 190
  },
  opibus_bus: {
    id: 'opibus_bus',
    name: 'Opibus 25-Seater Electric Bus',
    category: 'Bus & Shuttle',
    evWhPerKm: 185,
    iceKmPerLiter: 5.5,
    fuelType: 'Automotive Diesel',
    defaultDailyMileageKm: 175,
    defaultCapexPremiumKes: 2400000,
    defaultMonthlyMaintSavingsKes: 38000,
    co2GramsPerKm: 380
  },
  custom_fleet: {
    id: 'custom_fleet',
    name: 'Custom Fleet Configuration',
    category: 'Custom',
    evWhPerKm: 75,
    iceKmPerLiter: 22.0,
    fuelType: 'Super Petrol',
    defaultDailyMileageKm: 100,
    defaultCapexPremiumKes: 250000,
    defaultMonthlyMaintSavingsKes: 7500,
    co2GramsPerKm: 120
  }
};

export const EvRoiCalculator: React.FC<EvRoiCalculatorProps> = ({
  vehicles = [],
  evSessions = [],
  swapRecords = [],
  className = '',
  onNavigateToVehicle
}) => {
  // Selected Vehicle Archetype
  const [selectedArchetype, setSelectedArchetype] = useState<VehicleArchetypeId>('roam_air_2w');
  const profile = ARCHETYPE_PROFILES[selectedArchetype];

  // User-Adjustable Core Calculator Parameters
  const [dailyMileageKm, setDailyMileageKm] = useState<number>(profile.defaultDailyMileageKm);
  const [operatingDaysPerMonth, setOperatingDaysPerMonth] = useState<number>(26); // standard 26 workdays
  const [electricityRateKes, setElectricityRateKes] = useState<number>(48.50); // EPRA standard KES/kWh
  const [fuelPriceKes, setFuelPriceKes] = useState<number>(198.50); // Petrol KES/L
  const [fleetSizeUnits, setFleetSizeUnits] = useState<number>(1);
  const [capexPremiumKes, setCapexPremiumKes] = useState<number>(profile.defaultCapexPremiumKes);
  const [monthlyMaintenanceSavingsKes, setMonthlyMaintenanceSavingsKes] = useState<number>(profile.defaultMonthlyMaintSavingsKes);
  
  // Advanced Custom Efficiency Overrides
  const [evEfficiencyWhPerKm, setEvEfficiencyWhPerKm] = useState<number>(profile.evWhPerKm);
  const [iceFuelEconomyKmPerL, setIceFuelEconomyKmPerL] = useState<number>(profile.iceKmPerLiter);
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);
  const [chartViewMode, setChartViewMode] = useState<'CUMULATIVE_TCO' | 'NET_CASH_GAINS'>('CUMULATIVE_TCO');

  // Sync parameters when archetype changes
  const handleArchetypeChange = (archId: VehicleArchetypeId) => {
    setSelectedArchetype(archId);
    const newProfile = ARCHETYPE_PROFILES[archId];
    setDailyMileageKm(newProfile.defaultDailyMileageKm);
    setCapexPremiumKes(newProfile.defaultCapexPremiumKes);
    setMonthlyMaintenanceSavingsKes(newProfile.defaultMonthlyMaintSavingsKes);
    setEvEfficiencyWhPerKm(newProfile.evWhPerKm);
    setIceFuelEconomyKmPerL(newProfile.iceKmPerLiter);
    setFuelPriceKes(newProfile.fuelType === 'Automotive Diesel' ? 183.00 : 198.50);
  };

  // Quick Electricity Tariff Preset Handler
  const handleTariffPreset = (rate: number) => {
    setElectricityRateKes(rate);
  };

  // Quick Mileage Preset Handler
  const handleMileagePreset = (mileage: number) => {
    setDailyMileageKm(mileage);
  };

  // CALCULATIONS
  const calculations = useMemo(() => {
    const monthlyMileageKm = dailyMileageKm * operatingDaysPerMonth;
    const annualMileageKm = monthlyMileageKm * 12;

    // EV Energy Costs
    const evKwhPerKm = evEfficiencyWhPerKm / 1000;
    const evCostPerKmKes = evKwhPerKm * electricityRateKes;
    const evDailyEnergyCostKes = dailyMileageKm * evCostPerKmKes * fleetSizeUnits;
    const evMonthlyEnergyCostKes = monthlyMileageKm * evCostPerKmKes * fleetSizeUnits;
    const evAnnualEnergyCostKes = annualMileageKm * evCostPerKmKes * fleetSizeUnits;

    // ICE Fuel Costs
    const iceCostPerKmKes = fuelPriceKes / Math.max(0.1, iceFuelEconomyKmPerL);
    const iceDailyFuelCostKes = dailyMileageKm * iceCostPerKmKes * fleetSizeUnits;
    const iceMonthlyFuelCostKes = monthlyMileageKm * iceCostPerKmKes * fleetSizeUnits;
    const iceAnnualFuelCostKes = annualMileageKm * iceCostPerKmKes * fleetSizeUnits;

    // Operational Energy Savings
    const energySavingsPerKmKes = Math.max(0, iceCostPerKmKes - evCostPerKmKes);
    const dailyEnergySavingsKes = iceDailyFuelCostKes - evDailyEnergyCostKes;
    const monthlyEnergySavingsKes = iceMonthlyFuelCostKes - evMonthlyEnergyCostKes;
    const annualEnergySavingsKes = iceAnnualFuelCostKes - evAnnualEnergyCostKes;

    // Total Operational Savings (Energy + Maintenance)
    const totalMonthlyMaintSavingsKes = monthlyMaintenanceSavingsKes * fleetSizeUnits;
    const totalAnnualMaintSavingsKes = totalMonthlyMaintSavingsKes * 12;

    const totalMonthlyOpexSavingsKes = monthlyEnergySavingsKes + totalMonthlyMaintSavingsKes;
    const totalAnnualOpexSavingsKes = annualEnergySavingsKes + totalAnnualMaintSavingsKes;
    const totalDailyOpexSavingsKes = totalMonthlyOpexSavingsKes / operatingDaysPerMonth;

    // Total Upfront Initial Capex Premium for the fleet
    const totalCapexPremiumKes = capexPremiumKes * fleetSizeUnits;

    // Break-Even Metrics
    const breakEvenMonthsExact = totalMonthlyOpexSavingsKes > 0 
      ? totalCapexPremiumKes / totalMonthlyOpexSavingsKes 
      : 0;
    const breakEvenMonths = Math.round(breakEvenMonthsExact * 10) / 10;
    const breakEvenDays = Math.round(breakEvenMonthsExact * 30.4);
    const breakEvenKilometers = Math.round(breakEvenMonthsExact * monthlyMileageKm);

    // 3-Year and 5-Year Net ROI
    const threeYearOpexSavingsKes = totalAnnualOpexSavingsKes * 3;
    const threeYearNetProfitKes = threeYearOpexSavingsKes - totalCapexPremiumKes;
    const threeYearRoiPercent = totalCapexPremiumKes > 0 
      ? Math.round((threeYearNetProfitKes / totalCapexPremiumKes) * 100) 
      : 0;

    const fiveYearOpexSavingsKes = totalAnnualOpexSavingsKes * 5;
    const fiveYearNetProfitKes = fiveYearOpexSavingsKes - totalCapexPremiumKes;
    const fiveYearRoiPercent = totalCapexPremiumKes > 0 
      ? Math.round((fiveYearNetProfitKes / totalCapexPremiumKes) * 100) 
      : 0;

    // Environmental Impact
    const annualCo2KgAvoided = (annualMileageKm * profile.co2GramsPerKm * fleetSizeUnits) / 1000;
    const annualCo2TonnesAvoided = Math.round((annualCo2KgAvoided / 1000) * 10) / 10;
    const treesEquivalent = Math.round(annualCo2KgAvoided / 22); // ~22 kg CO2 sequestered per mature tree/yr

    return {
      monthlyMileageKm,
      annualMileageKm,
      evCostPerKmKes: Math.round(evCostPerKmKes * 100) / 100,
      iceCostPerKmKes: Math.round(iceCostPerKmKes * 100) / 100,
      energySavingsPerKmKes: Math.round(energySavingsPerKmKes * 100) / 100,
      costReductionPercent: Math.round((energySavingsPerKmKes / Math.max(0.1, iceCostPerKmKes)) * 100),
      evDailyEnergyCostKes: Math.round(evDailyEnergyCostKes),
      iceDailyFuelCostKes: Math.round(iceDailyFuelCostKes),
      evMonthlyEnergyCostKes: Math.round(evMonthlyEnergyCostKes),
      iceMonthlyFuelCostKes: Math.round(iceMonthlyFuelCostKes),
      evAnnualEnergyCostKes: Math.round(evAnnualEnergyCostKes),
      iceAnnualFuelCostKes: Math.round(iceAnnualFuelCostKes),
      totalDailyOpexSavingsKes: Math.round(totalDailyOpexSavingsKes),
      totalMonthlyOpexSavingsKes: Math.round(totalMonthlyOpexSavingsKes),
      totalAnnualOpexSavingsKes: Math.round(totalAnnualOpexSavingsKes),
      totalMonthlyMaintSavingsKes: Math.round(totalMonthlyMaintSavingsKes),
      totalCapexPremiumKes,
      breakEvenMonthsExact,
      breakEvenMonths,
      breakEvenDays,
      breakEvenKilometers,
      threeYearNetProfitKes: Math.round(threeYearNetProfitKes),
      threeYearRoiPercent,
      fiveYearNetProfitKes: Math.round(fiveYearNetProfitKes),
      fiveYearRoiPercent,
      annualCo2TonnesAvoided,
      treesEquivalent
    };
  }, [
    dailyMileageKm,
    operatingDaysPerMonth,
    electricityRateKes,
    fuelPriceKes,
    fleetSizeUnits,
    capexPremiumKes,
    monthlyMaintenanceSavingsKes,
    evEfficiencyWhPerKm,
    iceFuelEconomyKmPerL,
    profile.co2GramsPerKm
  ]);

  // Trajectory Simulation Data (Month 0 to Month 36)
  const trajectoryData = useMemo(() => {
    const data = [];
    const monthlyEvOpex = calculations.evMonthlyEnergyCostKes;
    const monthlyIceOpex = calculations.iceMonthlyFuelCostKes + (calculations.totalMonthlyMaintSavingsKes);
    const initialEvCapex = calculations.totalCapexPremiumKes;

    for (let m = 0; m <= 36; m += 2) {
      const cumulativeEvCost = initialEvCapex + (monthlyEvOpex * m);
      const cumulativeIceCost = (monthlyIceOpex * m);
      const netRetainedGain = cumulativeIceCost - cumulativeEvCost;

      data.push({
        month: `M${m}`,
        monthNum: m,
        evCumulativeTco: Math.round(cumulativeEvCost),
        iceCumulativeTco: Math.round(cumulativeIceCost),
        netCashGain: Math.round(netRetainedGain),
        isBreakEvenPoint: m >= calculations.breakEvenMonths && (m - 2) < calculations.breakEvenMonths
      });
    }
    return data;
  }, [calculations]);

  // Sensitivity Analysis Matrix Table (Mileage vs Electricity Tariff)
  const sensitivityMatrix = useMemo(() => {
    const mileages = [40, 70, 100, 140, 200];
    const tariffs = [25.0, 35.0, 48.5, 60.0];

    return tariffs.map(tariff => {
      const rowData: Record<string, any> = { tariff };
      mileages.forEach(mileage => {
        const mDist = mileage * operatingDaysPerMonth;
        const evC = (evEfficiencyWhPerKm / 1000) * tariff * mDist;
        const iceC = (fuelPriceKes / Math.max(0.1, iceFuelEconomyKmPerL)) * mDist;
        const mSavings = (iceC - evC) + monthlyMaintenanceSavingsKes;
        const beMonths = mSavings > 0 ? Math.round((capexPremiumKes / mSavings) * 10) / 10 : 99.9;
        rowData[`km_${mileage}`] = beMonths;
      });
      return rowData;
    });
  }, [
    operatingDaysPerMonth,
    evEfficiencyWhPerKm,
    fuelPriceKes,
    iceFuelEconomyKmPerL,
    monthlyMaintenanceSavingsKes,
    capexPremiumKes
  ]);

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `=== GREENSHIFT EV ROI & BREAK-EVEN ANALYSIS ===
Vehicle Archetype: ${profile.name} (Fleet Size: ${fleetSizeUnits} Unit(s))
Average Daily Mileage: ${dailyMileageKm} km/day (${calculations.monthlyMileageKm.toLocaleString()} km/month)
Local Electricity Rate: KES ${electricityRateKes.toFixed(2)} / kWh
Fuel Benchmark: KES ${fuelPriceKes.toFixed(2)} / Liter
------------------------------------------------
• Projected Time to Break Even: ${calculations.breakEvenMonths} Months (~${calculations.breakEvenDays} Days)
• Distance to Parity: ${calculations.breakEvenKilometers.toLocaleString()} km
• Net Monthly Cash Retained: +KES ${calculations.totalMonthlyOpexSavingsKes.toLocaleString()} / month
• Net Annual Operating Savings: +KES ${calculations.totalAnnualOpexSavingsKes.toLocaleString()} / year
• 3-Year Net Profit ROI: +KES ${calculations.threeYearNetProfitKes.toLocaleString()} (+${calculations.threeYearRoiPercent}%)
• Carbon Emissions Avoided: ${calculations.annualCo2TonnesAvoided} Tonnes CO2/yr (~${calculations.treesEquivalent} Trees)
================================================`;
    navigator.clipboard.writeText(text);
    toast.success('EV ROI & Break-Even Summary copied to clipboard!');
  };

  // Export CSV Report
  const handleExportCsv = () => {
    let csv = 'Month,EV Cumulative TCO (KES),ICE Cumulative TCO (KES),Net Retained Cash (KES)\n';
    trajectoryData.forEach(d => {
      csv += `${d.monthNum},${d.evCumulativeTco},${d.iceCumulativeTco},${d.netCashGain}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EV_ROI_BreakEven_Analysis_${profile.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded EV ROI Break-Even Analysis Report');
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6 ${className}`}>
      
      {/* Top Header & Overview */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Calculator className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>EV Return on Investment (ROI) & Break-Even Calculator</span>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold">
                  Fleet Amortization Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate custom daily mileage, local grid/solar charging tariffs, and fuel price benchmarks to compute exact break-even duration and multi-year cash flow gains.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
            title="Copy Analysis Summary"
          >
            <Copy className="w-3.5 h-3.5 text-teal-400" />
            <span>Copy Summary</span>
          </button>
          
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
            title="Export Trajectory CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Vehicle Archetype Selector Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-teal-400" />
            Select Vehicle Class Archetype:
          </span>
          <span className="text-teal-400 font-mono text-[11px]">
            {profile.name} ({profile.category})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.keys(ARCHETYPE_PROFILES) as VehicleArchetypeId[]).map(key => {
            const item = ARCHETYPE_PROFILES[key];
            const isSelected = selectedArchetype === key;
            return (
              <button
                key={key}
                onClick={() => handleArchetypeChange(key)}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/15 border-teal-400 text-white shadow-lg ring-1 ring-teal-400/40'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs truncate">{item.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{item.category}</span>
                  <span className="font-mono text-teal-300">{item.evWhPerKm} Wh/km</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* HERO BREAK-EVEN METRIC BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-teal-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
          
          {/* Hero 1: Time to Break Even */}
          <div className="bg-slate-900/90 border border-teal-500/40 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-teal-400" />
                Projected Break-Even
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-mono font-bold">
                CAPEX Amortized
              </span>
            </div>
            
            <div className="my-2.5">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight flex items-baseline gap-1.5">
                <span className="text-teal-300">{calculations.breakEvenMonths}</span>
                <span className="text-base font-normal text-slate-400">Months</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                <Clock className="w-3 h-3 text-teal-400" />
                <span>~{calculations.breakEvenDays} Days • {calculations.breakEvenKilometers.toLocaleString()} km</span>
              </div>
            </div>

            <div className="text-[11px] text-teal-400 font-mono pt-2 border-t border-slate-800 flex justify-between">
              <span>Payback Rate:</span>
              <strong className="text-emerald-300 font-bold">Fast Capital Recovery</strong>
            </div>
          </div>

          {/* Hero 2: Net Monthly Cash Retained */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                Monthly Cash Retained
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                OPEX Savings
              </span>
            </div>

            <div className="my-2.5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                +KES {calculations.totalMonthlyOpexSavingsKes.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Fuel + Maintenance Drop: <strong className="text-emerald-300">-{calculations.costReductionPercent}% vs ICE</strong>
              </div>
            </div>

            <div className="text-[11px] text-emerald-400 font-mono pt-2 border-t border-slate-800 flex justify-between">
              <span>Per KM Advantage:</span>
              <strong className="text-slate-200">-KES {calculations.energySavingsPerKmKes} / km</strong>
            </div>
          </div>

          {/* Hero 3: Annualized Net Gain */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                Annual Net Gain
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                12-Month OPEX
              </span>
            </div>

            <div className="my-2.5">
              <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight">
                KES {(calculations.totalAnnualOpexSavingsKes / 1000000).toFixed(2)}M
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                USD Equiv: <strong className="text-slate-200">${Math.round(calculations.totalAnnualOpexSavingsKes / 129).toLocaleString()} USD/yr</strong>
              </div>
            </div>

            <div className="text-[11px] text-cyan-400 font-mono pt-2 border-t border-slate-800 flex justify-between">
              <span>3-Year ROI:</span>
              <strong className="text-emerald-300 font-bold">+{calculations.threeYearRoiPercent}% Net Profit</strong>
            </div>
          </div>

          {/* Hero 4: Carbon Emissions Offset */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-400" />
                Annual CO₂ Offset
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                ESG Impact
              </span>
            </div>

            <div className="my-2.5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight flex items-baseline gap-1">
                <span>{calculations.annualCo2TonnesAvoided}</span>
                <span className="text-sm font-normal text-slate-400">Tonnes</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Direct Tailpipe Emissions Cut: <strong className="text-emerald-300">100%</strong>
              </div>
            </div>

            <div className="text-[11px] text-emerald-400 font-mono pt-2 border-t border-slate-800 flex justify-between">
              <span>Tree Equivalent:</span>
              <strong className="text-slate-200">~{calculations.treesEquivalent} Trees Planted</strong>
            </div>
          </div>

        </div>
      </div>

      {/* CORE INTERACTIVE INPUTS PANEL */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Interactive Operational Parameters:
            </span>
          </div>

          <button
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <span>{showAdvancedParams ? 'Hide Advanced Settings' : 'Customize Fuel, Efficiencies & CAPEX'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAdvancedParams ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* PRIMARY SLIDERS (Requested: Average Daily Mileage & Local Electricity Rates) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          
          {/* INPUT 1: Average Daily Mileage (km/day) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-1.5">
                <Car className="w-4 h-4 text-teal-400" />
                Average Daily Mileage:
              </label>
              <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={dailyMileageKm}
                  onChange={(e) => setDailyMileageKm(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-transparent text-teal-300 font-mono font-bold text-right outline-none"
                />
                <span className="text-[11px] text-slate-400 font-mono">km/day</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={15}
              max={350}
              step={5}
              value={dailyMileageKm}
              onChange={(e) => setDailyMileageKm(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[
                { label: '50 km (Short)', val: 50 },
                { label: '85 km (Boda)', val: 85 },
                { label: '130 km (Delivery)', val: 130 },
                { label: '200 km (High)', val: 200 }
              ].map(p => (
                <button
                  key={p.val}
                  onClick={() => handleMileagePreset(p.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                    dailyMileageKm === p.val
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-850">
              <span>Monthly Run Distance:</span>
              <strong className="text-slate-200 font-mono">{calculations.monthlyMileageKm.toLocaleString()} km/mo</strong>
            </div>
          </div>

          {/* INPUT 2: Local Electricity Rate (KES/kWh) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                Local Electricity Rate:
              </label>
              <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400 font-mono">KES</span>
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={0.5}
                  value={electricityRateKes}
                  onChange={(e) => setElectricityRateKes(Math.max(1, Number(e.target.value)))}
                  className="w-14 bg-transparent text-emerald-300 font-mono font-bold text-right outline-none"
                />
                <span className="text-[11px] text-slate-400 font-mono">/kWh</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={15}
              max={75}
              step={0.5}
              value={electricityRateKes}
              onChange={(e) => setElectricityRateKes(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />

            {/* Tariff Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[
                { label: 'Solar 28.0', val: 28.0 },
                { label: 'Night 36.0', val: 36.0 },
                { label: 'Blend 48.5', val: 48.5 },
                { label: 'Peak 58.0', val: 58.0 }
              ].map(p => (
                <button
                  key={p.val}
                  onClick={() => handleTariffPreset(p.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                    electricityRateKes === p.val
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-850">
              <span>EV Energy Cost / KM:</span>
              <strong className="text-emerald-400 font-mono font-bold">KES {calculations.evCostPerKmKes} / km</strong>
            </div>
          </div>

          {/* INPUT 3: Fleet Scale & Acquisition Difference */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Fleet Scale (Unit Count):
              </label>
              <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={fleetSizeUnits}
                  onChange={(e) => setFleetSizeUnits(Math.max(1, Number(e.target.value)))}
                  className="w-12 bg-transparent text-cyan-300 font-mono font-bold text-right outline-none"
                />
                <span className="text-[11px] text-slate-400 font-mono">Units</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={fleetSizeUnits}
              onChange={(e) => setFleetSizeUnits(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            {/* Scale Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[1, 5, 10, 25, 46].map(u => (
                <button
                  key={u}
                  onClick={() => setFleetSizeUnits(u)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                    fleetSizeUnits === u
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {u === 1 ? '1 Single' : `${u} Fleet`}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-850">
              <span>Total Initial CAPEX:</span>
              <strong className="text-amber-300 font-mono">KES {calculations.totalCapexPremiumKes.toLocaleString()}</strong>
            </div>
          </div>

        </div>

        {/* ADVANCED CUSTOMIZABLE PARAMETERS (Collapsible) */}
        {showAdvancedParams && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-slate-900/60 p-4 rounded-xl">
            
            {/* Fuel Price Benchmark */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-rose-400" />
                Fuel Price Benchmark (KES/L):
              </label>
              <input
                type="number"
                min={100}
                max={300}
                step={0.5}
                value={fuelPriceKes}
                onChange={(e) => setFuelPriceKes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-rose-400 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500">EPRA: 198.5 (Petrol) / 183.0 (Diesel)</span>
            </div>

            {/* EV Energy Efficiency (Wh/km) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                EV Efficiency (Wh/km):
              </label>
              <input
                type="number"
                min={20}
                max={400}
                value={evEfficiencyWhPerKm}
                onChange={(e) => setEvEfficiencyWhPerKm(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-teal-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500">{(evEfficiencyWhPerKm / 1000).toFixed(3)} kWh per km</span>
            </div>

            {/* ICE Fuel Economy (km/L) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-rose-400" />
                ICE Economy (km/Liter):
              </label>
              <input
                type="number"
                min={2}
                max={60}
                step={0.5}
                value={iceFuelEconomyKmPerL}
                onChange={(e) => setIceFuelEconomyKmPerL(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-rose-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500">KES {calculations.iceCostPerKmKes} / km fuel cost</span>
            </div>

            {/* Monthly Maintenance Savings */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Monthly Maint Savings (KES):
              </label>
              <input
                type="number"
                min={0}
                max={100000}
                step={500}
                value={monthlyMaintenanceSavingsKes}
                onChange={(e) => setMonthlyMaintenanceSavingsKes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-amber-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500">Fewer oil/filter/brake pad changes</span>
            </div>

          </div>
        )}

      </div>

      {/* CUMULATIVE TCO & BREAK-EVEN TRAJECTORY CHART */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <LucideLineChart className="w-4 h-4 text-teal-400" />
              <span>Projected 36-Month Break-Even Trajectory & Total Cost of Ownership (TCO)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizes the crossover point where initial EV capital expenditure is fully recovered through operational fuel and maintenance savings
            </p>
          </div>

          {/* Chart Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setChartViewMode('CUMULATIVE_TCO')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                chartViewMode === 'CUMULATIVE_TCO'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cumulative TCO (KES)
            </button>
            <button
              onClick={() => setChartViewMode('NET_CASH_GAINS')}
              className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                chartViewMode === 'NET_CASH_GAINS'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Net Retained Cash Gain
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'CUMULATIVE_TCO' ? (
              <ComposedChart data={trajectoryData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 max-w-xs font-mono">
                          <div className="font-bold text-white border-b border-slate-800 pb-1.5 flex justify-between">
                            <span>Month {d.monthNum} Trajectory</span>
                            <span className="text-teal-400">
                              {d.monthNum >= calculations.breakEvenMonths ? '✅ In Net Profit' : '⏳ Amortizing'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-emerald-400">
                              <span>EV Total Spend (CAPEX+OPEX):</span>
                              <strong>KES {d.evCumulativeTco.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between text-rose-400">
                              <span>ICE Baseline Spend:</span>
                              <strong>KES {d.iceCumulativeTco.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between text-cyan-300 pt-1 border-t border-slate-800 font-bold">
                              <span>Net Retained Margin:</span>
                              <span>{d.netCashGain >= 0 ? `+KES ${d.netCashGain.toLocaleString()}` : `-KES ${Math.abs(d.netCashGain).toLocaleString()}`}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                
                {/* Reference Line for Break-Even Crossover */}
                <ReferenceLine 
                  x={`M${Math.round(calculations.breakEvenMonths / 2) * 2}`} 
                  stroke="#2dd4bf" 
                  strokeDasharray="4 4"
                  label={{ 
                    value: `★ Break-Even (${calculations.breakEvenMonths} Mos)`, 
                    fill: '#2dd4bf', 
                    fontSize: 11, 
                    position: 'top' 
                  }} 
                />

                <Line
                  type="monotone"
                  dataKey="evCumulativeTco"
                  name="EV Fleet Cumulative Cost (CAPEX + Charging)"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="iceCumulativeTco"
                  name="ICE Fuel Benchmark Cumulative Spend"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#f43f5e' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart data={trajectoryData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 font-mono">
                          <div className="font-bold text-white border-b border-slate-800 pb-1">Month {d.monthNum} Net Balance</div>
                          <div className="text-emerald-400 font-bold text-sm">
                            {d.netCashGain >= 0 ? `+KES ${d.netCashGain.toLocaleString()}` : `-KES ${Math.abs(d.netCashGain).toLocaleString()}`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                <Area 
                  type="monotone" 
                  dataKey="netCashGain" 
                  name="Net Cumulative Cash Gain (KES)" 
                  fill="#06b6d4" 
                  stroke="#06b6d4" 
                  fillOpacity={0.2} 
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend Context */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-850">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <strong className="text-slate-300">EV Electric Operating Curve (Flat Slope)</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" />
              <strong className="text-slate-300">ICE Petrol Benchmark (Steep Expense Slope)</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-teal-400" />
              <strong className="text-teal-300">Break-Even Intersection: {calculations.breakEvenMonths} Mos</strong>
            </span>
          </div>

          <span className="font-mono text-emerald-400">
            3-Year Net Fleet Gain: +KES {calculations.threeYearNetProfitKes.toLocaleString()}
          </span>
        </div>

      </div>

      {/* SENSITIVITY ANALYSIS MATRIX TABLE */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-400" />
              <span>Break-Even Sensitivity Matrix (Daily Mileage vs Electricity Tariff)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Cross-tabulation showing required payback time (in months) across varied utilization intensities and electricity tariff rates
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 pl-4">Electricity Tariff Rate</th>
                <th className="py-3 text-center">40 km / day</th>
                <th className="py-3 text-center">70 km / day</th>
                <th className="py-3 text-center">100 km / day</th>
                <th className="py-3 text-center">140 km / day</th>
                <th className="py-3 text-center pr-4">200 km / day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {sensitivityMatrix.map(row => {
                const isCurrentTariff = Math.abs(row.tariff - electricityRateKes) < 5;

                return (
                  <tr 
                    key={row.tariff}
                    className={`transition-colors ${
                      isCurrentTariff 
                        ? 'bg-teal-500/10 font-bold text-white border-y border-teal-500/30' 
                        : 'hover:bg-slate-900/50 text-slate-300'
                    }`}
                  >
                    <td className="py-3 pl-4 font-mono font-bold text-teal-300">
                      KES {row.tariff.toFixed(1)} / kWh
                      {row.tariff === 28 && ' (Depot Solar)'}
                      {row.tariff === 48.5 && ' (EPRA Standard)'}
                    </td>

                    {[40, 70, 100, 140, 200].map(mileage => {
                      const months = row[`km_${mileage}`];
                      const isHighlighted = isCurrentTariff && Math.abs(dailyMileageKm - mileage) < 25;

                      return (
                        <td key={mileage} className="py-3 text-center font-mono">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-block ${
                            isHighlighted
                              ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-300 shadow'
                              : months <= 6
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : months <= 12
                              ? 'bg-teal-500/15 text-teal-300'
                              : months <= 24
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {months > 60 ? '> 5 Yrs' : `${months} Mos`}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>* High-mileage commercial operations recover capital up to 3x faster</span>
          <span className="font-mono text-teal-400">Green cells = Break-even under 12 months</span>
        </div>

      </div>

    </div>
  );
};
