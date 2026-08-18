import React, { useState, useMemo } from 'react';
import { Driver, Vehicle } from '../types';
import { 
  Calculator, Sliders, TrendingUp, TrendingDown, DollarSign, 
  Users, Trophy, Percent, Sparkles, Download, RefreshCw, 
  CheckCircle2, AlertCircle, ArrowRight, Zap, ShieldCheck,
  ChevronRight, Info, Building2, UserCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip as RechartsTooltip, Legend, Cell, CartesianGrid 
} from 'recharts';
import { toast } from 'sonner';

interface WhatIfEarningsSimulatorProps {
  drivers: Driver[];
  vehicles?: Vehicle[];
}

export interface PresetScenario {
  id: string;
  name: string;
  commissionPercent: number;
  tier1Target: number;
  tier1BonusKes: number;
  tier2Target: number;
  tier2BonusKes: number;
  tier3Target: number;
  tier3BonusKes: number;
  energySubsidyPercent: number;
  safetyMultiplierEnabled: boolean;
  safetyBonusPercent: number;
  description: string;
}

export const WhatIfEarningsSimulator: React.FC<WhatIfEarningsSimulatorProps> = ({
  drivers = [],
  vehicles = []
}) => {
  // Baseline Parameters
  const baselineCommission = 18; // 18% company commission
  const baselineTier1Target = 50;
  const baselineTier1Bonus = 2500;
  const baselineTier2Target = 100;
  const baselineTier2Bonus = 6000;
  const baselineTier3Target = 150;
  const baselineTier3Bonus = 12000;

  // Adjustable Simulator Controls
  const [commissionPercent, setCommissionPercent] = useState<number>(15); // Default simulated 15%
  const [tier1Target, setTier1Target] = useState<number>(50);
  const [tier1BonusKes, setTier1BonusKes] = useState<number>(3000);
  const [tier2Target, setTier2Target] = useState<number>(100);
  const [tier2BonusKes, setTier2BonusKes] = useState<number>(7500);
  const [tier3Target, setTier3Target] = useState<number>(150);
  const [tier3BonusKes, setTier3BonusKes] = useState<number>(15000);
  
  const [energySubsidyPercent, setEnergySubsidyPercent] = useState<number>(20); // 20% subsidy on fuel/charging
  const [safetyMultiplierEnabled, setSafetyMultiplierEnabled] = useState<boolean>(true);
  const [safetyBonusPercent, setSafetyBonusPercent] = useState<number>(3); // +3% bonus for Safety Score >= 90%

  const [selectedDriverFilter, setSelectedDriverFilter] = useState<'ALL' | 'EV_ONLY' | 'TOP_PERFORMERS'>('ALL');
  const [activePreset, setActivePreset] = useState<string>('incentive');

  // PRESETS
  const presets: PresetScenario[] = [
    {
      id: 'incentive',
      name: '🚀 High Incentive Growth',
      commissionPercent: 12,
      tier1Target: 40,
      tier1BonusKes: 3000,
      tier2Target: 90,
      tier2BonusKes: 8000,
      tier3Target: 140,
      tier3BonusKes: 16000,
      energySubsidyPercent: 25,
      safetyMultiplierEnabled: true,
      safetyBonusPercent: 3,
      description: 'Lower commission + high tier bonuses to boost driver retention & trip volume'
    },
    {
      id: 'ev_accel',
      name: '⚡ EV Fleet Transition',
      commissionPercent: 15,
      tier1Target: 50,
      tier1BonusKes: 3500,
      tier2Target: 100,
      tier2BonusKes: 9000,
      tier3Target: 150,
      tier3BonusKes: 18000,
      energySubsidyPercent: 40, // High subsidy
      safetyMultiplierEnabled: true,
      safetyBonusPercent: 4,
      description: 'High energy subsidy (40%) to heavily incentivize electric bike & van adoption'
    },
    {
      id: 'safety_first',
      name: '🛡️ Safety Champion Mode',
      commissionPercent: 16,
      tier1Target: 50,
      tier1BonusKes: 2500,
      tier2Target: 100,
      tier2BonusKes: 7000,
      tier3Target: 150,
      tier3BonusKes: 14000,
      energySubsidyPercent: 15,
      safetyMultiplierEnabled: true,
      safetyBonusPercent: 5, // 5% bonus for safety
      description: 'Places a 5% bonus multiplier on driver safety scores >= 90% to reduce incidents'
    },
    {
      id: 'margin_expansion',
      name: '💼 Company Margin Focus',
      commissionPercent: 22,
      tier1Target: 60,
      tier1BonusKes: 2000,
      tier2Target: 110,
      tier2BonusKes: 5000,
      tier3Target: 160,
      tier3BonusKes: 10000,
      energySubsidyPercent: 10,
      safetyMultiplierEnabled: false,
      safetyBonusPercent: 0,
      description: 'Increases platform commission to 22% for accelerated company EBITDA growth'
    }
  ];

  const applyPreset = (p: PresetScenario) => {
    setActivePreset(p.id);
    setCommissionPercent(p.commissionPercent);
    setTier1Target(p.tier1Target);
    setTier1BonusKes(p.tier1BonusKes);
    setTier2Target(p.tier2Target);
    setTier2BonusKes(p.tier2BonusKes);
    setTier3Target(p.tier3Target);
    setTier3BonusKes(p.tier3BonusKes);
    setEnergySubsidyPercent(p.energySubsidyPercent);
    setSafetyMultiplierEnabled(p.safetyMultiplierEnabled);
    setSafetyBonusPercent(p.safetyBonusPercent);

    toast.success(`Applied Preset: ${p.name}`, {
      description: p.description
    });
  };

  const resetToBaseline = () => {
    setActivePreset('baseline');
    setCommissionPercent(18);
    setTier1Target(50);
    setTier1BonusKes(2500);
    setTier2Target(100);
    setTier2BonusKes(6000);
    setTier3Target(150);
    setTier3BonusKes(12000);
    setEnergySubsidyPercent(0);
    setSafetyMultiplierEnabled(false);
    setSafetyBonusPercent(0);

    toast.info('Reset to Current Baseline Settings');
  };

  // --- SIMULATION CALCULATIONS ---
  const simulationResults = useMemo(() => {
    const totalDrivers = drivers.length;
    if (totalDrivers === 0) {
      return {
        baselineTotalGross: 0,
        baselineCompanyRevenue: 0,
        baselineTotalDriverPay: 0,
        baselineAvgDriverPay: 0,
        simulatedTotalGross: 0,
        simulatedCompanyRevenue: 0,
        simulatedTotalDriverPay: 0,
        simulatedAvgDriverPay: 0,
        simulatedTotalBonuses: 0,
        simulatedTotalSubsidies: 0,
        driverImpactList: [],
        tier1Qualifiers: 0,
        tier2Qualifiers: 0,
        tier3Qualifiers: 0
      };
    }

    let baselineTotalGross = 0;
    let baselineCompanyRevenue = 0;
    let baselineTotalDriverPay = 0;

    let simulatedTotalGross = 0;
    let simulatedCompanyRevenue = 0;
    let simulatedTotalDriverPay = 0;
    let simulatedTotalBonuses = 0;
    let simulatedTotalSubsidies = 0;

    let tier1Qualifiers = 0;
    let tier2Qualifiers = 0;
    let tier3Qualifiers = 0;

    const driverImpactList = drivers.map(d => {
      // Estimated monthly gross based on completed trips
      const completedTrips = d.completedTrips || 0;
      const estimatedAvgFareKes = 850; // KES 850 per trip average
      const grossEarningsKes = d.totalEarningsKes > 0 ? d.totalEarningsKes : (completedTrips * estimatedAvgFareKes);

      // BASELINE COMPUTATION
      const baselineCommissionAmount = Math.round(grossEarningsKes * (baselineCommission / 100));
      let baselineBonus = 0;
      if (completedTrips >= baselineTier3Target) baselineBonus = baselineTier3Bonus;
      else if (completedTrips >= baselineTier2Target) baselineBonus = baselineTier2Bonus;
      else if (completedTrips >= baselineTier1Target) baselineBonus = baselineTier1Bonus;

      const baselineTakeHome = (grossEarningsKes - baselineCommissionAmount) + baselineBonus;

      baselineTotalGross += grossEarningsKes;
      baselineCompanyRevenue += (baselineCommissionAmount - baselineBonus);
      baselineTotalDriverPay += baselineTakeHome;

      // SIMULATED COMPUTATION
      // Assume higher incentives slightly boost trip volume (+3% to +8% volume if incentives are good)
      const incentiveEffectMultiplier = commissionPercent < 15 ? 1.05 : commissionPercent > 20 ? 0.96 : 1.0;
      const simCompletedTrips = Math.round(completedTrips * incentiveEffectMultiplier);
      const simGross = Math.round(grossEarningsKes * incentiveEffectMultiplier);

      const simCommissionAmount = Math.round(simGross * (commissionPercent / 100));

      // Tier Bonuses
      let simTierBonus = 0;
      let achievedTier = 'None';
      if (simCompletedTrips >= tier3Target) {
        simTierBonus = tier3BonusKes;
        achievedTier = 'Tier 3 (Champion)';
        tier3Qualifiers++;
      } else if (simCompletedTrips >= tier2Target) {
        simTierBonus = tier2BonusKes;
        achievedTier = 'Tier 2 (Pro)';
        tier2Qualifiers++;
      } else if (simCompletedTrips >= tier1Target) {
        simTierBonus = tier1BonusKes;
        achievedTier = 'Tier 1 (Starter)';
        tier1Qualifiers++;
      }

      // Safety Multiplier
      let simSafetyBonus = 0;
      if (safetyMultiplierEnabled && d.safetyScorePercent >= 90) {
        simSafetyBonus = Math.round(simGross * (safetyBonusPercent / 100));
      }

      // Energy Subsidy
      // Estimate monthly fuel/charging cost per driver
      const estimatedEnergyCost = d.assignedVehicleId 
        ? (vehicles.find(v => v.id === d.assignedVehicleId)?.totalFuelSpentKes || 12000)
        : 12000;
      const simSubsidy = Math.round(estimatedEnergyCost * (energySubsidyPercent / 100));

      const simTakeHome = (simGross - simCommissionAmount) + simTierBonus + simSafetyBonus + simSubsidy;
      const simNetCompany = simCommissionAmount - simTierBonus - simSafetyBonus - simSubsidy;

      simulatedTotalGross += simGross;
      simulatedCompanyRevenue += simNetCompany;
      simulatedTotalDriverPay += simTakeHome;
      simulatedTotalBonuses += (simTierBonus + simSafetyBonus);
      simulatedTotalSubsidies += simSubsidy;

      const takeHomeDiff = simTakeHome - baselineTakeHome;
      const takeHomePctDiff = baselineTakeHome > 0 ? ((takeHomeDiff / baselineTakeHome) * 100) : 0;

      return {
        driver: d,
        completedTrips: simCompletedTrips,
        grossEarningsKes: simGross,
        baselineTakeHome,
        simTakeHome,
        takeHomeDiff,
        takeHomePctDiff,
        achievedTier,
        simTierBonus,
        simSafetyBonus,
        simSubsidy,
        simCommissionAmount
      };
    });

    const baselineAvgDriverPay = Math.round(baselineTotalDriverPay / totalDrivers);
    const simulatedAvgDriverPay = Math.round(simulatedTotalDriverPay / totalDrivers);

    return {
      baselineTotalGross,
      baselineCompanyRevenue,
      baselineTotalDriverPay,
      baselineAvgDriverPay,
      simulatedTotalGross,
      simulatedCompanyRevenue,
      simulatedTotalDriverPay,
      simulatedAvgDriverPay,
      simulatedTotalBonuses,
      simulatedTotalSubsidies,
      driverImpactList,
      tier1Qualifiers,
      tier2Qualifiers,
      tier3Qualifiers
    };
  }, [
    drivers, vehicles, 
    commissionPercent, 
    tier1Target, tier1BonusKes, 
    tier2Target, tier2BonusKes, 
    tier3Target, tier3BonusKes, 
    energySubsidyPercent, 
    safetyMultiplierEnabled, safetyBonusPercent
  ]);

  // Filtered driver list for table view
  const filteredDriverImpactList = useMemo(() => {
    return simulationResults.driverImpactList.filter(item => {
      if (selectedDriverFilter === 'EV_ONLY') {
        const v = vehicles.find(veh => veh.id === item.driver.assignedVehicleId);
        return v && (v.type === 'EV' || v.type === 'Electric Scooter' || v.type === 'Electric Van');
      }
      if (selectedDriverFilter === 'TOP_PERFORMERS') {
        return item.driver.safetyScorePercent >= 88 || item.completedTrips >= 80;
      }
      return true;
    });
  }, [simulationResults.driverImpactList, selectedDriverFilter, vehicles]);

  // Recharts Data for Side-by-side Visual Comparison
  const chartComparisonData = [
    {
      metric: 'Company Net Revenue',
      Baseline: Math.round(simulationResults.baselineCompanyRevenue / 1000),
      Simulated: Math.round(simulationResults.simulatedCompanyRevenue / 1000)
    },
    {
      metric: 'Driver Net Take-Home',
      Baseline: Math.round(simulationResults.baselineTotalDriverPay / 1000),
      Simulated: Math.round(simulationResults.simulatedTotalDriverPay / 1000)
    },
    {
      metric: 'Tier & Safety Bonuses',
      Baseline: Math.round((drivers.length * 2000) / 1000),
      Simulated: Math.round(simulationResults.simulatedTotalBonuses / 1000)
    }
  ];

  const handleExportCsv = () => {
    const headers = [
      'Driver ID', 'Driver Name', 'Phone', 'Completed Trips', 'Gross Revenue (KES)', 
      'Baseline Take-Home (KES)', 'Simulated Take-Home (KES)', 'Variance (KES)', 'Variance (%)', 
      'Achieved Tier', 'Tier Bonus (KES)', 'Safety Bonus (KES)', 'Energy Subsidy (KES)'
    ];

    const rows = simulationResults.driverImpactList.map(item => [
      item.driver.id,
      `"${item.driver.fullName}"`,
      item.driver.phone,
      item.completedTrips,
      item.grossEarningsKes,
      item.baselineTakeHome,
      item.simulatedTakeHome,
      item.takeHomeDiff,
      item.takeHomePctDiff.toFixed(1) + '%',
      `"${item.achievedTier}"`,
      item.simTierBonus,
      item.simSafetyBonus,
      item.simSubsidy
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WhatIf_Earnings_Simulation_${commissionPercent}pct_commission.csv`;
    link.click();

    toast.success('Simulation Report Downloaded', {
      description: `Exported projected payouts for ${drivers.length} fleet drivers.`
    });
  };

  const handleApplyPolicy = () => {
    toast.success('Payout Policy Updated', {
      description: `Commission set to ${commissionPercent}%, Tier 3 Bonus KES ${tier3BonusKes.toLocaleString()}, Energy Subsidy ${energySubsidyPercent}%. Policy broadcasted to driver app.`
    });
  };

  // Variance formatting helpers
  const companyRevDiff = simulationResults.simulatedCompanyRevenue - simulationResults.baselineCompanyRevenue;
  const companyRevPctDiff = simulationResults.baselineCompanyRevenue > 0 ? ((companyRevDiff / simulationResults.baselineCompanyRevenue) * 100) : 0;

  const driverPayDiff = simulationResults.simulatedTotalDriverPay - simulationResults.baselineTotalDriverPay;
  const driverPayPctDiff = simulationResults.baselineTotalDriverPay > 0 ? ((driverPayDiff / simulationResults.baselineTotalDriverPay) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6">
      
      {/* HEADER & PRESET SELECTOR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white tracking-wide">
                'What-If' Driver Earnings & Commission Simulator
              </h2>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Real-Time Yield Model</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate commission policy changes, target tiers, and subsidies to evaluate impact on company revenue and driver take-home pay
            </p>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={resetToBaseline}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Baseline</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV Report</span>
          </button>

          <button
            onClick={handleApplyPolicy}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply Policy Settings</span>
          </button>
        </div>
      </div>

      {/* PRESETS BAR */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick Scenario Presets:</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {presets.map(p => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isActive 
                    ? 'bg-indigo-600/20 border-indigo-500/60 ring-1 ring-indigo-500/40 text-white' 
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center justify-between">
                  <span>{p.name}</span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                <div className="mt-2 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-2">
                  <span>Comm: {p.commissionPercent}%</span>
                  <span>Sub: {p.energySubsidyPercent}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTROLS SLIDERS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
        
        {/* COLUMN 1: COMMISSION & SUBSIDIES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Platform Commission & Subsidies
            </h3>
          </div>

          {/* Commission Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Company Commission Rate</span>
              <span className="font-mono font-black text-emerald-400 text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {commissionPercent}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="1"
              value={commissionPercent}
              onChange={(e) => {
                setCommissionPercent(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5% (Low Margin)</span>
              <span>18% (Baseline)</span>
              <span>35% (High Margin)</span>
            </div>
          </div>

          {/* Energy Subsidy Slider */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Energy / Fuel Subsidy
              </span>
              <span className="font-mono font-black text-amber-400 text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {energySubsidyPercent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={energySubsidyPercent}
              onChange={(e) => {
                setEnergySubsidyPercent(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-[10px] text-slate-400">
              Company covers {energySubsidyPercent}% of driver monthly electricity charging or fuel expenses.
            </p>
          </div>
        </div>

        {/* COLUMN 2: TARGET TIERS & BONUSES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Monthly Trip Target Tier Bonuses
            </h3>
          </div>

          {/* Tier 1 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Tier 1 Target Trips</label>
              <input
                type="number"
                value={tier1Target}
                onChange={(e) => setTier1Target(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-xs focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Tier 1 Bonus (KES)</label>
              <input
                type="number"
                value={tier1BonusKes}
                onChange={(e) => setTier1BonusKes(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono text-xs focus:border-indigo-500 font-bold"
              />
            </div>
          </div>

          {/* Tier 2 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Tier 2 Target Trips</label>
              <input
                type="number"
                value={tier2Target}
                onChange={(e) => setTier2Target(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-xs focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Tier 2 Bonus (KES)</label>
              <input
                type="number"
                value={tier2BonusKes}
                onChange={(e) => setTier2BonusKes(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono text-xs focus:border-indigo-500 font-bold"
              />
            </div>
          </div>

          {/* Tier 3 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Tier 3 Target Trips</label>
              <input
                type="number"
                value={tier3Target}
                onChange={(e) => setTier3Target(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-xs focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Tier 3 Champion (KES)</label>
              <input
                type="number"
                value={tier3BonusKes}
                onChange={(e) => setTier3BonusKes(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono text-xs focus:border-indigo-500 font-bold"
              />
            </div>
          </div>
        </div>

        {/* COLUMN 3: SAFETY MULTIPLIER & QUALIFIER STATS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Safety Score Incentive Multiplier
            </h3>
          </div>

          <div className="space-y-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Safety Score ≥ 90% Multiplier</span>
              <input
                type="checkbox"
                checked={safetyMultiplierEnabled}
                onChange={(e) => setSafetyMultiplierEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {safetyMultiplierEnabled && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Safety Bonus Multiplier</span>
                  <span className="font-mono font-bold text-emerald-400">{safetyBonusPercent}% Extra</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={safetyBonusPercent}
                  onChange={(e) => setSafetyBonusPercent(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
              <div className="text-slate-400 font-semibold uppercase text-[10px]">Projected Tier Qualifiers:</div>
              <div className="grid grid-cols-3 gap-1 font-mono text-[10px] text-center">
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">Tier 1</span>
                  <strong className="text-white">{simulationResults.tier1Qualifiers} drivers</strong>
                </div>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">Tier 2</span>
                  <strong className="text-indigo-300">{simulationResults.tier2Qualifiers} drivers</strong>
                </div>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">Tier 3</span>
                  <strong className="text-amber-400">{simulationResults.tier3Qualifiers} drivers</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* KPI IMPACT COMPARISON CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Company Net Revenue */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Projected Company Net Revenue</span>
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            KES {simulationResults.simulatedCompanyRevenue.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <span className="text-slate-500 text-[11px]">vs. Baseline KES {simulationResults.baselineCompanyRevenue.toLocaleString()}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5 ${
              companyRevDiff >= 0 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {companyRevDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{companyRevDiff >= 0 ? `+${companyRevPctDiff.toFixed(1)}%` : `${companyRevPctDiff.toFixed(1)}%`}</span>
            </span>
          </div>
        </div>

        {/* Avg Driver Net Take-Home */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Avg Driver Monthly Take-Home</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            KES {simulationResults.simulatedAvgDriverPay.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <span className="text-slate-500 text-[11px]">vs. Baseline KES {simulationResults.baselineAvgDriverPay.toLocaleString()}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5 ${
              driverPayDiff >= 0 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {driverPayDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{driverPayDiff >= 0 ? `+${driverPayPctDiff.toFixed(1)}%` : `${driverPayPctDiff.toFixed(1)}%`}</span>
            </span>
          </div>
        </div>

        {/* Total Tier & Safety Bonus Pool */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Bonus Pool Outlay</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            KES {simulationResults.simulatedTotalBonuses.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Pertains to Tiers 1-3 & Safety rewards
          </div>
        </div>

        {/* Energy & Fuel Subsidy Outlay */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Energy / Fuel Subsidy Cost</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-indigo-300 font-mono">
            KES {simulationResults.simulatedTotalSubsidies.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {energySubsidyPercent}% company contribution
          </div>
        </div>

      </div>

      {/* RECHARTS COMPARISON CHART */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Baseline vs. Simulated Yield Comparison (In KES '000s)</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            Current Fleet Size: {drivers.length} Active Drivers
          </span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartComparisonData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="k" />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any) => [`KES ${(Number(value) * 1000).toLocaleString()}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Baseline" fill="#64748b" name="Current Baseline (18% Comm)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Simulated" fill="#10b981" name={`Simulated Scenario (${commissionPercent}% Comm)`} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DRIVER IMPACT BREAKDOWN TABLE */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Driver-Level Projected Earnings Impact
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded font-bold">
              Showing {filteredDriverImpactList.length} drivers
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedDriverFilter('ALL')}
              className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                selectedDriverFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Drivers
            </button>
            <button
              onClick={() => setSelectedDriverFilter('EV_ONLY')}
              className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                selectedDriverFilter === 'EV_ONLY' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EV Drivers
            </button>
            <button
              onClick={() => setSelectedDriverFilter('TOP_PERFORMERS')}
              className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                selectedDriverFilter === 'TOP_PERFORMERS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Top Performers
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Driver</th>
                <th className="px-3 py-2.5">Completed Trips</th>
                <th className="px-3 py-2.5">Gross Revenue</th>
                <th className="px-3 py-2.5">Baseline Take-Home</th>
                <th className="px-3 py-2.5">Simulated Take-Home</th>
                <th className="px-3 py-2.5">Net Variance</th>
                <th className="px-3 py-2.5">Achieved Tier</th>
                <th className="px-3 py-2.5">Subsidies & Bonuses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono text-[11px]">
              {filteredDriverImpactList.map((item) => {
                const isPositive = item.takeHomeDiff >= 0;
                return (
                  <tr key={item.driver.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2 font-sans">
                      <div className="font-bold text-slate-100">{item.driver.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.driver.phone}</div>
                    </td>

                    <td className="px-3 py-2 font-bold text-slate-200">
                      {item.completedTrips} <span className="text-[9px] text-slate-500 font-normal">trips</span>
                    </td>

                    <td className="px-3 py-2 text-slate-300">
                      KES {item.grossEarningsKes.toLocaleString()}
                    </td>

                    <td className="px-3 py-2 text-slate-400">
                      KES {item.baselineTakeHome.toLocaleString()}
                    </td>

                    <td className="px-3 py-2 font-extrabold text-emerald-400">
                      KES {item.simulatedTakeHome.toLocaleString()}
                    </td>

                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-0.5 ${
                        isPositive 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isPositive ? '+' : ''}{item.takeHomeDiff.toLocaleString()} KES ({item.takeHomePctDiff.toFixed(1)}%)
                      </span>
                    </td>

                    <td className="px-3 py-2 font-sans font-bold text-[10px]">
                      {item.achievedTier !== 'None' ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                          {item.achievedTier}
                        </span>
                      ) : (
                        <span className="text-slate-500">Standard</span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-[10px] text-slate-300">
                      {item.simTierBonus > 0 && <span className="text-amber-400 font-bold mr-1">+{item.simTierBonus} (Tier)</span>}
                      {item.simSafetyBonus > 0 && <span className="text-emerald-400 font-bold mr-1">+{item.simSafetyBonus} (Safety)</span>}
                      {item.simSubsidy > 0 && <span className="text-indigo-300 font-bold">+{item.simSubsidy} (Subsidy)</span>}
                      {item.simTierBonus === 0 && item.simSafetyBonus === 0 && item.simSubsidy === 0 && <span className="text-slate-500">-</span>}
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
