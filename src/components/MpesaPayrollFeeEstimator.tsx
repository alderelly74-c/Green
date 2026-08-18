import React, { useState, useMemo } from 'react';
import { Driver, MpesaPayoutRequest } from '../types';
import { 
  Calculator, Send, DollarSign, CreditCard, Sparkles, AlertTriangle, 
  TrendingUp, CheckCircle2, Layers, Users, Sliders, RefreshCw, 
  ArrowUpRight, ArrowDownRight, FileSpreadsheet, Download, Info, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface MpesaPayrollFeeEstimatorProps {
  drivers?: Driver[];
  mpesaPayouts?: MpesaPayoutRequest[];
}

export type PayoutFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

export interface TariffBandInfo {
  minKes: number;
  maxKes: number;
  feeKes: number;
  label: string;
}

export const MPESA_B2C_TARIFF_BANDS: TariffBandInfo[] = [
  { minKes: 1, maxKes: 100, feeKes: 0, label: 'KES 1 - 100' },
  { minKes: 101, maxKes: 500, feeKes: 15, label: 'KES 101 - 500' },
  { minKes: 501, maxKes: 1000, feeKes: 16, label: 'KES 501 - 1,000' },
  { minKes: 1001, maxKes: 2500, feeKes: 23, label: 'KES 1,001 - 2,500' },
  { minKes: 2501, maxKes: 5000, feeKes: 34, label: 'KES 2,501 - 5,000' },
  { minKes: 5001, maxKes: 10000, feeKes: 55, label: 'KES 5,001 - 10,000' },
  { minKes: 10001, maxKes: 20000, feeKes: 76, label: 'KES 10,001 - 20,000' },
  { minKes: 20001, maxKes: 35000, feeKes: 92, label: 'KES 20,001 - 35,000' },
  { minKes: 35001, maxKes: 50000, feeKes: 108, label: 'KES 35,001 - 50,000' },
  { minKes: 50001, maxKes: 250000, feeKes: 115, label: 'KES 50,001 - 250,000' }
];

export const getMpesaFeeForAmount = (amountKes: number): { feeKes: number; band: TariffBandInfo } => {
  if (amountKes <= 0) {
    return { feeKes: 0, band: MPESA_B2C_TARIFF_BANDS[0] };
  }
  const found = MPESA_B2C_TARIFF_BANDS.find(b => amountKes >= b.minKes && amountKes <= b.maxKes);
  if (found) {
    return { feeKes: found.feeKes, band: found };
  }
  return { feeKes: 115, band: MPESA_B2C_TARIFF_BANDS[MPESA_B2C_TARIFF_BANDS.length - 1] };
};

export interface DriverPayrollItem {
  id: string;
  name: string;
  phone: string;
  baseSalaryKes: number;
  bonusKes: number;
  reimbursementKes: number;
  totalPayoutKes: number;
  
  // Single Consolidated Transfer
  consolidatedFeeKes: number;
  consolidatedBand: string;
  
  // Fragmented Split Transfers (3 separate B2C transactions)
  splitFeesKes: number;
  splitSavingsKes: number;
}

export const MpesaPayrollFeeEstimator: React.FC<MpesaPayrollFeeEstimatorProps> = ({
  drivers = []
}) => {
  // Global Payroll Configurator Inputs
  const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>('WEEKLY');
  const [recipientCount, setRecipientCount] = useState<number>(drivers.length || 20);
  const [defaultBaseSalary, setDefaultBaseSalary] = useState<number>(18500);
  const [defaultBonus, setDefaultBonus] = useState<number>(2500);
  const [defaultReimbursement, setDefaultReimbursement] = useState<number>(1200);

  // Strategy Mode Toggle: Consolidated Batch vs Fragmented Pay
  const [disbursementStrategy, setDisbursementStrategy] = useState<'CONSOLIDATED' | 'SPLIT'>('CONSOLIDATED');

  // Search & Filter for drivers list
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Frequency multiplier for annualization calculations
  const annualCycles = useMemo(() => {
    switch (payoutFrequency) {
      case 'WEEKLY': return 52;
      case 'BI_WEEKLY': return 26;
      case 'MONTHLY': return 12;
      default: return 52;
    }
  }, [payoutFrequency]);

  // Construct Driver Payroll Items
  const payrollItems: DriverPayrollItem[] = useMemo(() => {
    const activeDrivers = drivers.length > 0 ? drivers.slice(0, recipientCount) : [];
    const countToUse = Math.max(recipientCount, activeDrivers.length);

    const items: DriverPayrollItem[] = [];

    for (let i = 0; i < countToUse; i++) {
      const driver = activeDrivers[i];
      const name = driver ? driver.name : `Driver #${101 + i}`;
      const phone = driver ? driver.phone : `+254 7${Math.floor(10000000 + Math.random() * 90000008)}`;
      
      // Slight variation based on driver earnings or default
      const base = driver ? Math.round((driver.totalEarningsKes || 24000) * (payoutFrequency === 'WEEKLY' ? 0.25 : 1)) : defaultBaseSalary;
      const bonus = driver ? Math.round((driver.ratings || 4.8) * 450) : defaultBonus;
      const reimb = defaultReimbursement;

      const totalPayout = base + bonus + reimb;

      // Consolidated
      const consolidatedInfo = getMpesaFeeForAmount(totalPayout);

      // Split
      const baseFee = getMpesaFeeForAmount(base).feeKes;
      const bonusFee = getMpesaFeeForAmount(bonus).feeKes;
      const reimbFee = getMpesaFeeForAmount(reimb).feeKes;
      const splitTotalFee = baseFee + bonusFee + reimbFee;

      const savings = splitTotalFee - consolidatedInfo.feeKes;

      items.push({
        id: driver ? driver.id : `drv-mock-${i}`,
        name,
        phone,
        baseSalaryKes: base,
        bonusKes: bonus,
        reimbursementKes: reimb,
        totalPayoutKes: totalPayout,
        consolidatedFeeKes: consolidatedInfo.feeKes,
        consolidatedBand: consolidatedInfo.band.label,
        splitFeesKes: splitTotalFee,
        splitSavingsKes: savings
      });
    }

    return items;
  }, [drivers, recipientCount, defaultBaseSalary, defaultBonus, defaultReimbursement, payoutFrequency]);

  // Filtered drivers for matrix
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return payrollItems;
    return payrollItems.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.phone.includes(searchTerm)
    );
  }, [payrollItems, searchTerm]);

  // Aggregate Payroll Summary Statistics
  const summary = useMemo(() => {
    const totalGrossPayroll = payrollItems.reduce((acc, p) => acc + p.totalPayoutKes, 0);
    const totalConsolidatedFees = payrollItems.reduce((acc, p) => acc + p.consolidatedFeeKes, 0);
    const totalSplitFees = payrollItems.reduce((acc, p) => acc + p.splitFeesKes, 0);

    const totalFeesActiveStrategy = disbursementStrategy === 'CONSOLIDATED' ? totalConsolidatedFees : totalSplitFees;
    
    const feeOverheadRatioPct = totalGrossPayroll > 0 ? (totalFeesActiveStrategy / totalGrossPayroll) * 100 : 0;
    
    const totalBatchSavingsPerCycle = totalSplitFees - totalConsolidatedFees;
    const totalAnnualSavingsPotential = totalBatchSavingsPerCycle * annualCycles;

    return {
      totalGrossPayroll,
      totalConsolidatedFees,
      totalSplitFees,
      totalFeesActiveStrategy,
      feeOverheadRatioPct: Math.round(feeOverheadRatioPct * 100) / 100,
      totalBatchSavingsPerCycle,
      totalAnnualSavingsPotential,
      avgFeePerDriver: recipientCount > 0 ? Math.round(totalFeesActiveStrategy / recipientCount) : 0
    };
  }, [payrollItems, disbursementStrategy, annualCycles, recipientCount]);

  const handleCopyPayrollSummary = () => {
    const text = `--- M-PESA B2C BULK PAYROLL COST ESTIMATE ---
Payout Cycle: ${payoutFrequency}
Recipients: ${recipientCount} Drivers
Total Gross Disbursed: KES ${summary.totalGrossPayroll.toLocaleString()}
Total M-Pesa B2C Fees: KES ${summary.totalFeesActiveStrategy.toLocaleString()} (${summary.feeOverheadRatioPct}% overhead)
Single-Batch Consolidation Savings: KES ${summary.totalBatchSavingsPerCycle.toLocaleString()} / cycle (KES ${summary.totalAnnualSavingsPotential.toLocaleString()} / year)`;
    
    navigator.clipboard.writeText(text);
    toast.success('M-Pesa Payroll Estimate Copied to Clipboard!', {
      description: 'You can now paste this estimate into your treasury disbursement plan.'
    });
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Driver Name',
      'Phone Number',
      'Payout Frequency',
      'Disbursement Strategy',
      'Base Salary (KES)',
      'Bonus (KES)',
      'Reimbursement (KES)',
      'Total Disbursed (KES)',
      'Single Batch B2C Fee (KES)',
      'Safaricom Tariff Band',
      'Fragmented Split Fee (KES)',
      'Consolidation Savings (KES)'
    ];

    const rows = payrollItems.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.phone}"`,
      payoutFrequency,
      disbursementStrategy,
      p.baseSalaryKes,
      p.bonusKes,
      p.reimbursementKes,
      p.totalPayoutKes,
      p.consolidatedFeeKes,
      `"${p.consolidatedBand}"`,
      p.splitFeesKes,
      p.splitSavingsKes
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mpesa_bulk_payroll_estimate_${payoutFrequency.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Downloaded M-Pesa Bulk Payroll Estimate CSV!', {
      description: `Exported ${payrollItems.length} driver payout estimates with transaction fee breakdowns.`
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                M-Pesa B2C Bulk Payroll Transaction Fee Estimator
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Safaricom B2C Tariff Engine</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Project real-time Safaricom B2C disbursement fees, analyze tariff bands, and optimize single-batch vs fragmented payouts
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPayrollSummary}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Copy Treasury Estimate</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* PAYROLL CONFIGURATION INPUT PANEL */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Bulk Payroll Parameters & Driver Disbursal Configurator</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Safaricom B2C Tariff Standard (2026 Bands)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          {/* Payout Frequency */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold block">Payout Frequency</label>
            <select
              value={payoutFrequency}
              onChange={(e) => setPayoutFrequency(e.target.value as PayoutFrequency)}
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="WEEKLY">Weekly (52 cycles/yr)</option>
              <option value="BI_WEEKLY">Bi-Weekly (26 cycles/yr)</option>
              <option value="MONTHLY">Monthly (12 cycles/yr)</option>
            </select>
          </div>

          {/* Recipient Driver Count */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold block">Recipients (Driver Count)</label>
            <input
              type="number"
              min={1}
              max={250}
              value={recipientCount}
              onChange={(e) => setRecipientCount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Default Base Salary */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold block">Avg Base Salary (KES)</label>
            <input
              type="number"
              step={500}
              value={defaultBaseSalary}
              onChange={(e) => setDefaultBaseSalary(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Default Bonus & Allowances */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold block">Avg Performance Bonus (KES)</label>
            <input
              type="number"
              step={250}
              value={defaultBonus}
              onChange={(e) => setDefaultBonus(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

        </div>

        {/* STRATEGY SWITCH: CONSOLIDATED VS SPLIT */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Disbursement Batch Strategy:</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setDisbursementStrategy('CONSOLIDATED');
                toast.info('Selected Consolidated Single-Batch Strategy', {
                  description: 'Bundles Base + Bonus + Reimbursement into 1 transaction per driver.'
                });
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                disbursementStrategy === 'CONSOLIDATED'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Single Consolidated Batch (Recommended)</span>
            </button>

            <button
              onClick={() => {
                setDisbursementStrategy('SPLIT');
                toast.warning('Selected Fragmented Split Transfers Strategy', {
                  description: 'Sends 3 separate B2C transactions (Base, Bonus, Reimbursement) per driver.'
                });
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                disbursementStrategy === 'SPLIT'
                  ? 'bg-rose-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Fragmented Split Disbursals</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAYROLL ESTIMATOR SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        
        {/* Total Gross Disbursed */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-sans text-slate-400 font-bold block">Total Gross Payroll</span>
          <div className="text-2xl font-black text-white">
            KES {summary.totalGrossPayroll.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            {recipientCount} Driver Recipients ({payoutFrequency.toLowerCase()})
          </p>
        </div>

        {/* Total M-Pesa B2C Fees */}
        <div className={`bg-slate-950 p-4 rounded-xl border space-y-1 ${
          disbursementStrategy === 'CONSOLIDATED' ? 'border-emerald-500/40' : 'border-rose-500/40'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-sans text-slate-400">
            <span className="font-bold text-slate-300">Total M-Pesa B2C Tariff Fees</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              disbursementStrategy === 'CONSOLIDATED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {summary.feeOverheadRatioPct}% Overhead
            </span>
          </div>
          <div className={`text-2xl font-black ${
            disbursementStrategy === 'CONSOLIDATED' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            KES {summary.totalFeesActiveStrategy.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Avg KES {summary.avgFeePerDriver} fee per driver transfer
          </p>
        </div>

        {/* Single-Batch Savings Potential */}
        <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-1">
          <span className="text-[10px] font-sans text-indigo-300 font-bold block">Consolidation Batch Savings</span>
          <div className="text-2xl font-black text-indigo-300">
            KES {summary.totalBatchSavingsPerCycle.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Saved per payroll cycle vs fragmented transfers
          </p>
        </div>

        {/* Projected Annual Savings */}
        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-sans text-emerald-400 font-bold block">Annualized Treasury Savings</span>
          <div className="text-2xl font-black text-emerald-400">
            KES {summary.totalAnnualSavingsPotential.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Over {annualCycles} cycles/year by bundling payouts
          </p>
        </div>

      </div>

      {/* SAFARICOM B2C TARIFF BAND MATRIX REFERENCE */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Safaricom M-Pesa B2C PayOut Official Tariff Bands</span>
          </h3>
          <span className="text-slate-400 text-[10px]">Business-to-Customer (B2C) Disbursal Rates</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 font-mono text-[10px]">
          {MPESA_B2C_TARIFF_BANDS.map((band, idx) => (
            <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center space-y-1">
              <span className="text-slate-400 text-[9px] block font-sans font-bold">{band.label}</span>
              <div className="text-emerald-400 font-bold text-xs">KES {band.feeKes}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ITEMIZED DRIVER PAYROLL ESTIMATE MATRIX */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Itemized Driver Disbursal Tariff Breakdown</span>
          </h3>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Filter by driver name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 font-mono">
              <tr>
                <th className="px-4 py-3">Driver / Recipient</th>
                <th className="px-4 py-3">Base Salary</th>
                <th className="px-4 py-3">Bonus & Reimb.</th>
                <th className="px-4 py-3 text-white">Gross Disbursed</th>
                <th className="px-4 py-3 text-emerald-400">Single Batch Fee</th>
                <th className="px-4 py-3 text-slate-400">Tariff Band</th>
                <th className="px-4 py-3 text-rose-400">Split Fee</th>
                <th className="px-4 py-3 text-right text-emerald-400">Consolidation Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.slice(0, 15).map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/60 transition">
                  {/* Driver Name */}
                  <td className="px-4 py-3">
                    <div className="font-bold text-white font-sans">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{item.phone}</div>
                  </td>

                  {/* Base */}
                  <td className="px-4 py-3 text-slate-300">
                    KES {item.baseSalaryKes.toLocaleString()}
                  </td>

                  {/* Bonus & Reimb */}
                  <td className="px-4 py-3 text-slate-400">
                    +KES {(item.bonusKes + item.reimbursementKes).toLocaleString()}
                  </td>

                  {/* Gross */}
                  <td className="px-4 py-3 font-extrabold text-white">
                    KES {item.totalPayoutKes.toLocaleString()}
                  </td>

                  {/* Single Batch Fee */}
                  <td className="px-4 py-3 font-bold text-emerald-400">
                    KES {item.consolidatedFeeKes}
                  </td>

                  {/* Band */}
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {item.consolidatedBand}
                  </td>

                  {/* Split Fee */}
                  <td className="px-4 py-3 text-rose-400 font-bold">
                    KES {item.splitFeesKes}
                  </td>

                  {/* Savings */}
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                      +KES {item.splitSavingsKes} saved
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
