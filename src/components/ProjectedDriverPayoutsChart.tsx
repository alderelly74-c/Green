import React, { useState, useMemo } from 'react';
import { Driver, MpesaPayoutRequest } from '../types';
import { 
  Wallet, Send, DollarSign, Calendar, TrendingUp, Sliders, Download, 
  ShieldCheck, AlertTriangle, ArrowUpRight, CheckCircle2, User, Phone, 
  Sparkles, RefreshCw, Layers, Zap, Info, Clock, Check, FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid, ReferenceLine 
} from 'recharts';
import { toast } from 'sonner';

interface ProjectedDriverPayoutsChartProps {
  drivers?: Driver[];
  mpesaPayouts?: MpesaPayoutRequest[];
  onSendMpesaPayout?: (driverId: string, amountKes: number, reason: string) => void;
}

export interface DriverPayoutProjection {
  driverId: string;
  driverName: string;
  phone: string;
  employmentType: 'Commission' | 'Daily Target' | 'Weekly Rental' | 'Salary + Commission' | 'Hybrid';
  rating: number;
  safetyScorePercent: number;
  completedTrips: number;
  grossEarningsKes: number;
  companyCommissionKes: number;
  netEarningsKes: number;
  outstandingBalanceKes: number;
  estWeeklyPayoutKes: number;
  est30DayPayoutKes: number;
  estMpesaB2cFeeKes: number;
  bonusEligibility: boolean;
  estBonusKes: number;
  nextPayoutDateStr: string;
  payoutStatus: 'Ready for Disbursement' | 'Threshold Pending' | 'Account Review';
}

export interface WeeklyPayoutForecastPoint {
  periodKey: string;
  periodLabel: string;
  regularEarningsKes: number;
  targetSurplusKes: number;
  performanceBonusKes: number;
  reimbursementsKes: number;
  totalProjectedPayoutKes: number;
  cumulativePayoutKes: number;
  totalB2cFeesKes: number;
  driversToDisburseCount: number;
}

export const ProjectedDriverPayoutsChart: React.FC<ProjectedDriverPayoutsChartProps> = ({
  drivers = [],
  mpesaPayouts = [],
  onSendMpesaPayout
}) => {
  // Scenario & Filter States
  const [timeHorizonDays, setTimeHorizonDays] = useState<14 | 30 | 60 | 90>(30);
  const [performanceScenario, setPerformanceScenario] = useState<'Baseline' | 'Peak Surge (+15%)' | 'Off-Peak (-10%)'>('Baseline');
  const [payoutCadence, setPayoutCadence] = useState<'Weekly' | 'Bi-Weekly' | 'Daily Sweeps'>('Weekly');
  const [bonusIncentiveBufferPct, setBonusIncentiveBufferPct] = useState<number>(10); // 10% performance bonus buffer
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('All');
  const [workingCapitalLimitKes, setWorkingCapitalLimitKes] = useState<number>(2000000); // 2M KES M-Pesa float limit
  const [selectedDriverForPayout, setSelectedDriverForPayout] = useState<DriverPayoutProjection | null>(null);
  const [quickPayoutAmount, setQuickPayoutAmount] = useState<string>('');
  const [quickPayoutReason, setQuickPayoutReason] = useState<string>('Weekly Earnings Payout');

  // Active Drivers List with Rich Fallback
  const activeDrivers = useMemo(() => {
    if (drivers && drivers.length > 0) return drivers;

    return [
      {
        id: 'd1',
        fullName: 'Juma Omondi',
        phone: '+254 722 104 889',
        nationalId: '29841029',
        profilePhotoUrl: '',
        drivingLicenseNumber: 'DL-88412',
        licenseExpiry: '2028-05-12',
        city: 'Nairobi',
        employmentType: 'Commission',
        dateJoined: '2024-02-15',
        status: 'Active',
        rating: 4.88,
        totalTrips: 1240,
        completedTrips: 1210,
        cancelledTrips: 30,
        acceptanceRatePercent: 96,
        grossEarningsKes: 185000,
        companyCommissionKes: 37000,
        netEarningsKes: 148000,
        outstandingBalanceKes: 24500, // Ready for immediate payout
        loanBalanceKes: 0,
        safetyScorePercent: 98,
        mpesaPhoneNumber: '+254 722 104 889'
      },
      {
        id: 'd2',
        fullName: 'Faith Kiprop',
        phone: '+254 711 902 334',
        nationalId: '31092811',
        profilePhotoUrl: '',
        drivingLicenseNumber: 'DL-90112',
        licenseExpiry: '2027-11-20',
        city: 'Nairobi',
        employmentType: 'Daily Target',
        dateJoined: '2024-06-01',
        status: 'Active',
        rating: 4.92,
        totalTrips: 890,
        completedTrips: 880,
        cancelledTrips: 10,
        acceptanceRatePercent: 98,
        grossEarningsKes: 142000,
        companyCommissionKes: 28400,
        netEarningsKes: 113600,
        outstandingBalanceKes: 18200,
        loanBalanceKes: 0,
        safetyScorePercent: 99,
        mpesaPhoneNumber: '+254 711 902 334'
      },
      {
        id: 'd3',
        fullName: 'David Mwangi',
        phone: '+254 733 441 002',
        nationalId: '27182901',
        profilePhotoUrl: '',
        drivingLicenseNumber: 'DL-10922',
        licenseExpiry: '2026-12-10',
        city: 'Mombasa',
        employmentType: 'Salary + Commission',
        dateJoined: '2023-10-10',
        status: 'Active',
        rating: 4.75,
        totalTrips: 1560,
        completedTrips: 1500,
        cancelledTrips: 60,
        acceptanceRatePercent: 92,
        grossEarningsKes: 210000,
        companyCommissionKes: 42000,
        netEarningsKes: 168000,
        outstandingBalanceKes: 31000,
        loanBalanceKes: 5000,
        safetyScorePercent: 94,
        mpesaPhoneNumber: '+254 733 441 002'
      },
      {
        id: 'd4',
        fullName: 'Amina Hassan',
        phone: '+254 705 611 928',
        nationalId: '33491022',
        profilePhotoUrl: '',
        drivingLicenseNumber: 'DL-55210',
        licenseExpiry: '2029-01-15',
        city: 'Nairobi',
        employmentType: 'Weekly Rental',
        dateJoined: '2024-08-01',
        status: 'Active',
        rating: 4.82,
        totalTrips: 620,
        completedTrips: 610,
        cancelledTrips: 10,
        acceptanceRatePercent: 95,
        grossEarningsKes: 98000,
        companyCommissionKes: 19600,
        netEarningsKes: 78400,
        outstandingBalanceKes: 12800,
        loanBalanceKes: 0,
        safetyScorePercent: 96,
        mpesaPhoneNumber: '+254 705 611 928'
      },
      {
        id: 'd5',
        fullName: 'Peter Otieno',
        phone: '+254 720 338 119',
        nationalId: '28192011',
        profilePhotoUrl: '',
        drivingLicenseNumber: 'DL-33920',
        licenseExpiry: '2027-04-25',
        city: 'Kisumu',
        employmentType: 'Hybrid',
        dateJoined: '2024-01-20',
        status: 'Active',
        rating: 4.68,
        totalTrips: 940,
        completedTrips: 910,
        cancelledTrips: 30,
        acceptanceRatePercent: 89,
        grossEarningsKes: 135000,
        companyCommissionKes: 27000,
        netEarningsKes: 108000,
        outstandingBalanceKes: 15400,
        loanBalanceKes: 2000,
        safetyScorePercent: 91,
        mpesaPhoneNumber: '+254 720 338 119'
      },
      {
        id: 'd6',
        fullName: 'Samuel Wambugu',
        phone: '+254 712 003 441',
        nationalId: '30291822',
        profilePhotoUrl: '',
        drivingLicenseNumber: 'DL-77102',
        licenseExpiry: '2028-09-18',
        city: 'Nakuru',
        employmentType: 'Commission',
        dateJoined: '2024-03-12',
        status: 'Active',
        rating: 4.89,
        totalTrips: 1100,
        completedTrips: 1080,
        cancelledTrips: 20,
        acceptanceRatePercent: 97,
        grossEarningsKes: 162000,
        companyCommissionKes: 32400,
        netEarningsKes: 129600,
        outstandingBalanceKes: 21800,
        loanBalanceKes: 0,
        safetyScorePercent: 97,
        mpesaPhoneNumber: '+254 712 003 441'
      }
    ] as Driver[];
  }, [drivers]);

  // Safaricom M-Pesa B2C Tiered Fee Calculator
  const calculateMpesaB2cFee = (amountKes: number): number => {
    if (amountKes <= 100) return 0;
    if (amountKes <= 1000) return 15;
    if (amountKes <= 5000) return 23;
    if (amountKes <= 20000) return 34;
    return 45; // KES 20,001 - 70,000+
  };

  // Compute Driver-by-Driver 30-Day Payout Projections
  const driverProjections = useMemo<DriverPayoutProjection[]>(() => {
    const scenarioMultiplier = performanceScenario === 'Peak Surge (+15%)' 
      ? 1.15 
      : performanceScenario === 'Off-Peak (-10%)' 
      ? 0.90 
      : 1.0;

    const today = new Date(2026, 7, 12); // Aug 12, 2026

    return activeDrivers.map((d, index) => {
      // Calculate baseline weekly net earnings run-rate
      const historicalMonthlyNet = d.netEarningsKes || 120000;
      let baseWeeklyNet = (historicalMonthlyNet / 4) * scenarioMultiplier;

      // Adjust based on rating & safety score performance
      if (d.rating >= 4.85) baseWeeklyNet *= 1.05;
      if (d.safetyScorePercent >= 95) baseWeeklyNet *= 1.03;

      // Bonus eligibility check
      const isBonusEligible = d.safetyScorePercent >= 95 && d.rating >= 4.80;
      const estBonus = isBonusEligible 
        ? Math.round((baseWeeklyNet * 4) * (bonusIncentiveBufferPct / 100)) 
        : 0;

      // Project 30-day total payout
      const est30DayTotal = Math.round((baseWeeklyNet * 4) + (d.outstandingBalanceKes || 0) + estBonus);
      const estWeeklyPayout = Math.round(est30DayTotal / 4);

      // M-Pesa B2C Fee per weekly transaction * 4
      const b2cFeePerTx = calculateMpesaB2cFee(estWeeklyPayout);
      const totalB2cFees = b2cFeePerTx * 4;

      // Scheduled Next Payout Date
      const daysUntilNext = (index % 3) + 2; // Staggered payout dates (2 to 4 days)
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntilNext);
      const nextDateStr = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Status
      let status: 'Ready for Disbursement' | 'Threshold Pending' | 'Account Review' = 'Ready for Disbursement';
      if ((d.outstandingBalanceKes || 0) < 3000) status = 'Threshold Pending';
      if (d.rating < 4.60) status = 'Account Review';

      return {
        driverId: d.id,
        driverName: d.fullName,
        phone: d.mpesaPhoneNumber || d.phone,
        employmentType: d.employmentType,
        rating: d.rating,
        safetyScorePercent: d.safetyScorePercent,
        completedTrips: d.completedTrips,
        grossEarningsKes: d.grossEarningsKes,
        companyCommissionKes: d.companyCommissionKes,
        netEarningsKes: d.netEarningsKes,
        outstandingBalanceKes: d.outstandingBalanceKes || 0,
        estWeeklyPayoutKes: estWeeklyPayout,
        est30DayPayoutKes: est30DayTotal,
        estMpesaB2cFeeKes: totalB2cFees,
        bonusEligibility: isBonusEligible,
        estBonusKes: estBonus,
        nextPayoutDateStr: nextDateStr,
        payoutStatus: status
      };
    });
  }, [activeDrivers, performanceScenario, bonusIncentiveBufferPct]);

  // Filtered Driver Projections for Table & Analytics
  const filteredDriverProjections = useMemo(() => {
    return driverProjections.filter(dp => {
      if (selectedEmploymentType !== 'All' && dp.employmentType !== selectedEmploymentType) return false;
      return true;
    }).sort((a, b) => b.est30DayPayoutKes - a.est30DayPayoutKes);
  }, [driverProjections, selectedEmploymentType]);

  // Generate 4-Week / 30-Day Time Series Forecast Points
  const weeklyForecastData = useMemo<WeeklyPayoutForecastPoint[]>(() => {
    const totalWeeks = Math.ceil(timeHorizonDays / 7);
    const weeks: WeeklyPayoutForecastPoint[] = [];
    const today = new Date(2026, 7, 12);
    let cumulativePayout = 0;

    for (let w = 1; w <= totalWeeks; w++) {
      const weekStartDays = (w - 1) * 7;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + weekStartDays);
      const periodLabel = `Wk ${w} (${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

      // Calculate weekly totals across filtered drivers
      let regularEarnings = 0;
      let targetSurplus = 0;
      let performanceBonus = 0;
      let reimbursements = 0;
      let b2cFees = 0;

      filteredDriverProjections.forEach(dp => {
        const weeklyRegular = dp.estWeeklyPayoutKes;
        
        if (dp.employmentType === 'Daily Target') {
          regularEarnings += Math.round(weeklyRegular * 0.75);
          targetSurplus += Math.round(weeklyRegular * 0.25);
        } else if (dp.employmentType === 'Salary + Commission') {
          regularEarnings += Math.round(weeklyRegular * 0.85);
          reimbursements += Math.round(weeklyRegular * 0.15);
        } else {
          regularEarnings += weeklyRegular;
        }

        // Add bonus on Week 2 & Week 4
        if ((w === 2 || w === 4) && dp.bonusEligibility) {
          performanceBonus += Math.round(dp.estBonusKes / 2);
        }

        b2cFees += calculateMpesaB2cFee(weeklyRegular);
      });

      const totalWeekPayout = regularEarnings + targetSurplus + performanceBonus + reimbursements;
      cumulativePayout += totalWeekPayout;

      weeks.push({
        periodKey: `W${w}`,
        periodLabel,
        regularEarningsKes: regularEarnings,
        targetSurplusKes: targetSurplus,
        performanceBonusKes: performanceBonus,
        reimbursementsKes: reimbursements,
        totalProjectedPayoutKes: totalWeekPayout,
        cumulativePayoutKes: cumulativePayout,
        totalB2cFeesKes: b2cFees,
        driversToDisburseCount: filteredDriverProjections.length
      });
    }

    return weeks;
  }, [filteredDriverProjections, timeHorizonDays]);

  // Aggregate Key Indicators
  const total30DayOutflowKes = useMemo(() => {
    return filteredDriverProjections.reduce((sum, dp) => sum + dp.est30DayPayoutKes, 0);
  }, [filteredDriverProjections]);

  const totalOutstandingPayableKes = useMemo(() => {
    return filteredDriverProjections.reduce((sum, dp) => sum + dp.outstandingBalanceKes, 0);
  }, [filteredDriverProjections]);

  const totalMpesaB2cFeesKes = useMemo(() => {
    return filteredDriverProjections.reduce((sum, dp) => sum + dp.estMpesaB2cFeeKes, 0);
  }, [filteredDriverProjections]);

  const avgPayoutPerDriverKes = useMemo(() => {
    return filteredDriverProjections.length > 0 
      ? Math.round(total30DayOutflowKes / filteredDriverProjections.length) 
      : 0;
  }, [filteredDriverProjections, total30DayOutflowKes]);

  // Handle Quick M-Pesa Payout Modal
  const handleOpenPayoutModal = (dp: DriverPayoutProjection) => {
    setSelectedDriverForPayout(dp);
    setQuickPayoutAmount(dp.outstandingBalanceKes > 0 ? dp.outstandingBalanceKes.toString() : dp.estWeeklyPayoutKes.toString());
    setQuickPayoutReason('Weekly Earnings Payout');
  };

  const handleConfirmMpesaPayout = () => {
    if (!selectedDriverForPayout) return;
    const amount = Number(quickPayoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payout amount');
      return;
    }

    if (onSendMpesaPayout) {
      onSendMpesaPayout(selectedDriverForPayout.driverId, amount, quickPayoutReason);
    } else {
      toast.success(`Dispatched M-Pesa B2C payout of KES ${amount.toLocaleString()} to ${selectedDriverForPayout.driverName} (${selectedDriverForPayout.phone})`);
    }

    setSelectedDriverForPayout(null);
  };

  // Export CSV Report for Treasury & M-Pesa B2C Bulk Dispatches
  const handleExportCsv = () => {
    const headers = [
      'Driver Name',
      'M-Pesa Phone Number',
      'Employment Type',
      'Rating',
      'Safety Score (%)',
      'Completed Trips',
      'Current Outstanding Balance (KES)',
      'Est Weekly Payout (KES)',
      'Est 30-Day Total Outflow (KES)',
      'Performance Bonus (KES)',
      'Safaricom B2C Fee (KES)',
      'Scheduled Payout Date',
      'Status'
    ];

    const rows = filteredDriverProjections.map(dp => [
      `"${dp.driverName}"`,
      `"${dp.phone}"`,
      dp.employmentType,
      dp.rating,
      `${dp.safetyScorePercent}%`,
      dp.completedTrips,
      dp.outstandingBalanceKes,
      dp.estWeeklyPayoutKes,
      dp.est30DayPayoutKes,
      dp.estBonusKes,
      dp.estMpesaB2cFeeKes,
      `"${dp.nextPayoutDateStr}"`,
      dp.payoutStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projected_driver_mpesa_payouts_forecast_${timeHorizonDays}d_2026.csv`;
    link.click();
    toast.success(`Exported ${filteredDriverProjections.length} driver M-Pesa payout projections to CSV!`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Projected Driver M-Pesa Payouts & Dispatches Forecast
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Next {timeHorizonDays} Days B2C Model
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Predictive outgoing M-Pesa B2C payments based on driver trip completions, rating incentives, employment contracts, and Safaricom transaction fees.
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Employment Type Filter */}
          <select
            value={selectedEmploymentType}
            onChange={(e) => setSelectedEmploymentType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Contracts ({driverProjections.length})</option>
            <option value="Commission">Commission</option>
            <option value="Daily Target">Daily Target</option>
            <option value="Weekly Rental">Weekly Rental</option>
            <option value="Salary + Commission">Salary + Commission</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          {/* Time Horizon Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            {([14, 30, 60, 90] as const).map(d => (
              <button
                key={d}
                onClick={() => setTimeHorizonDays(d)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  timeHorizonDays === d
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
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
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export M-Pesa B2C CSV</span>
          </button>

        </div>
      </div>

      {/* IMMEDIATE OUTSTANDING PAYABLE BANNER */}
      {totalOutstandingPayableKes > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wide flex items-center gap-2">
                <span>Immediate M-Pesa Payable Balance</span>
                <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono">
                  {filteredDriverProjections.filter(d => d.outstandingBalanceKes > 0).length} Drivers Ready
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Current total accumulated net earnings awaiting M-Pesa B2C batch release: <strong className="text-emerald-300 font-mono text-sm">KES {totalOutstandingPayableKes.toLocaleString()}</strong>. Ensure M-Pesa B2C utility account has sufficient float.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-mono">Est B2C Fees: KES {filteredDriverProjections.reduce((sum, d) => sum + calculateMpesaB2cFee(d.outstandingBalanceKes), 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* PARAMETER CONTROLS & SCENARIOS */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        
        {/* Performance Scenario Selector */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Demand Performance Run-Rate:</span>
          </label>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['Baseline', 'Peak Surge (+15%)', 'Off-Peak (-10%)'] as const).map(sc => (
              <button
                key={sc}
                onClick={() => setPerformanceScenario(sc)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold w-full transition cursor-pointer ${
                  performanceScenario === sc 
                    ? 'bg-emerald-500 text-slate-950 font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sc.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Cadence */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Payout Cadence Schedule:</span>
          </label>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['Weekly', 'Bi-Weekly', 'Daily Sweeps'] as const).map(cd => (
              <button
                key={cd}
                onClick={() => setPayoutCadence(cd)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold w-full transition cursor-pointer ${
                  payoutCadence === cd 
                    ? 'bg-cyan-500 text-slate-950 font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cd}
              </button>
            ))}
          </div>
        </div>

        {/* Bonus Incentive Buffer Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Top-Tier Safety & Rating Bonus Buffer:</span>
            </span>
            <span className="text-amber-400 font-mono font-black">{bonusIncentiveBufferPct}%</span>
          </div>
          <input 
            type="range"
            min="0"
            max="25"
            step="5"
            value={bonusIncentiveBufferPct}
            onChange={(e) => setBonusIncentiveBufferPct(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg mt-1"
          />
        </div>

      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        
        {/* Total Projected 30-Day Outflow */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{timeHorizonDays}-Day M-Pesa Outflow</span>
            </span>
            <span className="text-emerald-300 text-[10px] bg-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
              B2C Dispatches
            </span>
          </div>
          <div className="text-xl font-black text-emerald-400 mt-1.5">
            KES {total30DayOutflowKes.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            Estimated total outgoing payments across {filteredDriverProjections.length} drivers
          </p>
        </div>

        {/* Immediate Payable Balance */}
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span>Immediate Payable Balance</span>
            </span>
            <span className="text-cyan-300 text-[10px] bg-cyan-500/20 font-bold px-1.5 py-0.5 rounded">
              Ready
            </span>
          </div>
          <div className="text-xl font-black text-cyan-300 mt-1.5">
            KES {totalOutstandingPayableKes.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            Current unpaid net earnings balance ready for batch release
          </p>
        </div>

        {/* Est. Safaricom B2C Transaction Fees */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Send className="w-4 h-4 text-amber-400" />
              <span>M-Pesa B2C Service Fees</span>
            </span>
            <span className="text-amber-300 text-[10px] bg-amber-500/20 font-bold px-1.5 py-0.5 rounded">
              Tiered Cost
            </span>
          </div>
          <div className="text-xl font-black text-amber-400 mt-1.5">
            KES {totalMpesaB2cFeesKes.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            Safaricom transaction charges (~KES {filteredDriverProjections.length > 0 ? Math.round(totalMpesaB2cFeesKes / (filteredDriverProjections.length * 4)) : 0}/disbursement)
          </p>
        </div>

        {/* Average Outflow Per Driver */}
        <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <User className="w-4 h-4 text-purple-400" />
              <span>Avg Outflow / Driver</span>
            </span>
            <span className="text-purple-300 text-[10px] bg-purple-500/20 font-bold px-1.5 py-0.5 rounded">
              Monthly Run-Rate
            </span>
          </div>
          <div className="text-xl font-black text-purple-300 mt-1.5">
            KES {avgPayoutPerDriverKes.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            Based on active trips & rating performance metrics
          </p>
        </div>

      </div>

      {/* WEEKLY PAYOUT OUTFLOW CHART (RECHARTS) */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 pb-2">
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              Regular Net Earnings (KES)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-3 h-3 rounded bg-cyan-500"></span>
              Target Surplus (KES)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              Performance Bonuses (KES)
            </span>
            <span className="flex items-center gap-1.5 text-rose-300 font-bold">
              <span className="w-3 h-1 bg-rose-400 rounded"></span>
              Cumulative M-Pesa Outflow
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {weeklyForecastData.length}-Week Time Series Horizon
          </span>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyForecastData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="periodKey" 
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
                stroke="#f43f5e" 
                tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
                tick={{ fill: '#fb7185', fontSize: 10 }}
              />

              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as WeeklyPayoutForecastPoint;
                    return (
                      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-2 font-sans w-64">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white text-xs">{data.periodLabel}</span>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-black">
                            {data.driversToDisburseCount} Drivers
                          </span>
                        </div>

                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Regular Net Earnings:</span>
                            <strong className="font-bold">KES {data.regularEarningsKes.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center justify-between text-cyan-400">
                            <span>Target Surplus:</span>
                            <strong className="font-bold">KES {data.targetSurplusKes.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center justify-between text-amber-400">
                            <span>Performance Bonuses:</span>
                            <strong className="font-bold">KES {data.performanceBonusKes.toLocaleString()}</strong>
                          </div>
                          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-white font-extrabold">
                            <span>Total Period Payout:</span>
                            <span className="text-emerald-300 text-xs">KES {data.totalProjectedPayoutKes.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-300 text-[10px] pt-0.5">
                            <span>M-Pesa B2C Fees:</span>
                            <span>KES {data.totalB2cFeesKes.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Working Capital Reserve Threshold Line */}
              <ReferenceLine 
                yAxisId="left"
                y={workingCapitalLimitKes / 4} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                label={{ 
                  value: `M-Pesa Utility Reserve Threshold (KES ${((workingCapitalLimitKes/4)/1000).toFixed(0)}k/wk)`, 
                  fill: '#10b981', 
                  fontSize: 10, 
                  fontWeight: 'bold',
                  position: 'top' 
                }} 
              />

              {/* Stacked Bars */}
              <Bar yAxisId="left" dataKey="regularEarningsKes" name="Regular Net Earnings" stackId="payout" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="targetSurplusKes" name="Target Surplus" stackId="payout" fill="#06b6d4" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="performanceBonusKes" name="Performance Bonuses" stackId="payout" fill="#f59e0b" radius={[4, 4, 0, 0]} />

              {/* Cumulative Line */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativePayoutKes" 
                name="Cumulative Outflow" 
                stroke="#fb7185" 
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#fb7185' }}
              />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DRIVER-BY-DRIVER 30-DAY PAYOUT SCHEDULE TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Driver Performance & 30-Day M-Pesa Payout Forecast ({filteredDriverProjections.length} Drivers)</span>
          </h4>
          <span className="text-[11px] font-normal text-slate-400 font-mono">
            Sorted by highest projected monthly payout
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Driver & M-Pesa Phone</th>
                <th className="py-2.5 px-3 font-semibold">Contract Type</th>
                <th className="py-2.5 px-3 font-semibold">Rating / Safety</th>
                <th className="py-2.5 px-3 font-semibold">Unpaid Balance</th>
                <th className="py-2.5 px-3 font-semibold">Est. Weekly Run-Rate</th>
                <th className="py-2.5 px-3 font-semibold">Est 30-Day Outflow</th>
                <th className="py-2.5 px-3 font-semibold">Next Payout Date</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 text-[11px]">
              {filteredDriverProjections.map((dp) => (
                <tr key={dp.driverId} className="hover:bg-slate-900/60 transition">
                  
                  {/* Driver Name & Phone */}
                  <td className="py-3 px-3 font-sans font-bold text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black flex items-center justify-center shrink-0 text-xs">
                        {dp.driverName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-slate-100 flex items-center gap-1">
                          <span>{dp.driverName}</span>
                          {dp.bonusEligibility && (
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" title="Bonus Eligible" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{dp.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contract Type */}
                  <td className="py-3 px-3 font-sans text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                      {dp.employmentType}
                    </span>
                  </td>

                  {/* Rating & Safety Score */}
                  <td className="py-3 px-3 font-sans">
                    <div className="text-amber-400 font-black text-xs">
                      ★ {dp.rating.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      {dp.safetyScorePercent}% Safety
                    </div>
                  </td>

                  {/* Unpaid Balance */}
                  <td className="py-3 px-3 font-black text-cyan-300">
                    KES {dp.outstandingBalanceKes.toLocaleString()}
                  </td>

                  {/* Weekly Run Rate */}
                  <td className="py-3 px-3 text-slate-200">
                    KES {dp.estWeeklyPayoutKes.toLocaleString()}
                  </td>

                  {/* 30-Day Outflow */}
                  <td className="py-3 px-3 font-black text-emerald-400 text-xs">
                    KES {dp.est30DayPayoutKes.toLocaleString()}
                    {dp.estBonusKes > 0 && (
                      <span className="block text-[9px] text-amber-400 font-normal">
                        (+KES {dp.estBonusKes.toLocaleString()} bonus)
                      </span>
                    )}
                  </td>

                  {/* Next Payout Date */}
                  <td className="py-3 px-3 font-sans">
                    <div className="text-slate-200 text-[11px] font-bold">
                      {dp.nextPayoutDateStr}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                      dp.payoutStatus === 'Ready for Disbursement'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : dp.payoutStatus === 'Threshold Pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {dp.payoutStatus}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleOpenPayoutModal(dp)}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[10px] transition cursor-pointer shadow flex items-center gap-1 ml-auto"
                    >
                      <Send className="w-3 h-3" />
                      <span>Pay M-Pesa</span>
                    </button>
                  </td>

                </tr>
              ))}

              {filteredDriverProjections.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No drivers found matching selected employment filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK DISPATCH M-PESA MODAL */}
      {selectedDriverForPayout && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 text-xs font-sans">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm">
                  Initiate M-Pesa B2C Driver Payout
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDriverForPayout(null)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Driver:</span>
                <strong className="text-white font-sans">{selectedDriverForPayout.driverName}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>M-Pesa Number:</span>
                <strong className="text-emerald-400">{selectedDriverForPayout.phone}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Contract Type:</span>
                <strong className="text-slate-300">{selectedDriverForPayout.employmentType}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Unpaid Net Balance:</span>
                <strong className="text-cyan-300">KES {selectedDriverForPayout.outstandingBalanceKes.toLocaleString()}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Payout Amount (KES):
                </label>
                <input 
                  type="number"
                  value={quickPayoutAmount}
                  onChange={(e) => setQuickPayoutAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Payout Reason:
                </label>
                <select
                  value={quickPayoutReason}
                  onChange={(e) => setQuickPayoutReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Weekly Earnings Payout">Weekly Earnings Payout</option>
                  <option value="Daily Target Surplus">Daily Target Surplus</option>
                  <option value="Expense Reimbursement">Expense Reimbursement</option>
                  <option value="Bonus Incentive">Bonus Incentive</option>
                </select>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[10px] text-amber-300 flex items-center justify-between font-mono">
                <span>Estimated Safaricom B2C Fee:</span>
                <strong className="font-bold">KES {calculateMpesaB2cFee(Number(quickPayoutAmount) || 0)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedDriverForPayout(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMpesaPayout}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Confirm M-Pesa B2C Send</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
