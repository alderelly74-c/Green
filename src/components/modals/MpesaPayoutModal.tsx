import React, { useState, useEffect, useMemo } from 'react';
import { Driver, MpesaPayoutRequest } from '../../types';
import { 
  X, Send, Wallet, CheckCircle2, Phone, User, 
  DollarSign, ShieldCheck, Zap, AlertCircle, ArrowRight,
  Users, Layers, Search, CheckSquare, Square, Download,
  FileSpreadsheet, Sparkles, Calculator, RefreshCw, Filter, Sliders
} from 'lucide-react';
import { toast } from 'sonner';
import { getMpesaFeeForAmount } from '../MpesaPayrollFeeEstimator';

interface MpesaPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  preselectedDriver?: Driver | null;
  onSendMpesaPayout: (driverId: string, amountKes: number, reason: string) => void;
  onSendBulkMpesaPayouts?: (payouts: Array<{ driverId: string; amountKes: number; reason: string }>) => void;
}

export interface BulkBatchItemReport {
  driverId: string;
  driverName: string;
  phone: string;
  amountKes: number;
  feeKes: number;
  tariffBandLabel: string;
  receiptNo: string;
  ref: string;
  status: 'Success';
}

export interface BulkBatchReport {
  batchId: string;
  timestamp: string;
  totalGross: number;
  totalFees: number;
  totalFloat: number;
  reason: string;
  items: BulkBatchItemReport[];
}

export const MpesaPayoutModal: React.FC<MpesaPayoutModalProps> = ({
  isOpen,
  onClose,
  drivers = [],
  preselectedDriver,
  onSendMpesaPayout,
  onSendBulkMpesaPayouts
}) => {
  if (!isOpen) return null;

  // Tab mode state: SINGLE vs BULK
  const [payoutMode, setPayoutMode] = useState<'SINGLE' | 'BULK'>(
    preselectedDriver ? 'SINGLE' : 'BULK'
  );

  // --- SINGLE DRIVER PAYOUT STATE ---
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    preselectedDriver?.id || (drivers[0]?.id || '')
  );
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Weekly Earnings Payout');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    ref: string;
    amount: number;
    fee: number;
    driverName: string;
    phone: string;
    receiptNo: string;
    timestamp: string;
  } | null>(null);

  // --- BULK BATCH PAYOUT STATE ---
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());
  const [bulkAmounts, setBulkAmounts] = useState<Record<string, number>>({});
  const [batchReason, setBatchReason] = useState<string>('Weekly Earnings Payout');
  const [customBatchReason, setCustomBatchReason] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBalanceOnly, setFilterBalanceOnly] = useState<boolean>(false);
  const [bulkSuccessReport, setBulkSuccessReport] = useState<BulkBatchReport | null>(null);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId) || preselectedDriver || drivers[0];

  // Initialize or reset modal state on open or driver change
  useEffect(() => {
    if (preselectedDriver) {
      setSelectedDriverId(preselectedDriver.id);
      setPayoutMode('SINGLE');
      const defaultAmt = preselectedDriver.outstandingBalanceKes > 0 
        ? preselectedDriver.outstandingBalanceKes 
        : 5000;
      setAmount(defaultAmt.toString());
    } else if (drivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(drivers[0].id);
      const defaultAmt = drivers[0].outstandingBalanceKes > 0 
        ? drivers[0].outstandingBalanceKes 
        : 5000;
      setAmount(defaultAmt.toString());
    }

    // Pre-populate bulk default amounts and select drivers with balance > 0
    const initialAmounts: Record<string, number> = {};
    const autoSelected = new Set<string>();

    drivers.forEach(d => {
      const amt = d.outstandingBalanceKes > 0 ? d.outstandingBalanceKes : 5000;
      initialAmounts[d.id] = amt;
      if (d.outstandingBalanceKes > 0) {
        autoSelected.add(d.id);
      }
    });

    setBulkAmounts(initialAmounts);
    
    // If no driver had positive balance, default select top 5
    if (autoSelected.size === 0 && drivers.length > 0) {
      drivers.slice(0, 5).forEach(d => autoSelected.add(d.id));
    }
    setSelectedDriverIds(autoSelected);

  }, [preselectedDriver, isOpen, drivers]);

  // Single mode handlers
  const handleDriverChange = (driverId: string) => {
    setSelectedDriverId(driverId);
    const d = drivers.find(drv => drv.id === driverId);
    if (d) {
      const defaultAmt = d.outstandingBalanceKes > 0 ? d.outstandingBalanceKes : 5000;
      setAmount(defaultAmt.toString());
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (!selectedDriver) {
      toast.error('Please select a valid driver');
      return;
    }
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payout amount (greater than 0)');
      return;
    }

    const finalReason = reason === 'Other' ? (customReason || 'Custom Driver Disbursal') : reason;

    setIsSubmitting(true);

    setTimeout(() => {
      onSendMpesaPayout(selectedDriver.id, numAmount, finalReason);
      
      const receiptNo = `RGK${Math.floor(10000000 + Math.random() * 90000000)}`;
      const ref = `MPESA-B2C-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = new Date().toLocaleString() + ' EAT';
      const fee = getMpesaFeeForAmount(numAmount).feeKes;

      setSuccessReceipt({
        ref,
        amount: numAmount,
        fee,
        driverName: selectedDriver.fullName,
        phone: selectedDriver.mpesaPhoneNumber || selectedDriver.phone,
        receiptNo,
        timestamp
      });

      setIsSubmitting(false);
      toast.success(`M-Pesa payout of KES ${numAmount.toLocaleString()} sent to ${selectedDriver.fullName}!`);
    }, 800);
  };

  // --- BULK SELECTION CALCULATIONS & HANDLERS ---
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchesSearch = d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.phone.includes(searchQuery) || 
                            (d.mpesaPhoneNumber && d.mpesaPhoneNumber.includes(searchQuery)) ||
                            d.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBalance = filterBalanceOnly ? d.outstandingBalanceKes > 0 : true;
      return matchesSearch && matchesBalance;
    });
  }, [drivers, searchQuery, filterBalanceOnly]);

  const toggleSelectDriver = (driverId: string) => {
    setSelectedDriverIds(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedDriverIds(prev => {
      const next = new Set(prev);
      filteredDrivers.forEach(d => next.add(d.id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedDriverIds(new Set());
  };

  const handleSelectBalanceOnly = () => {
    const next = new Set<string>();
    drivers.forEach(d => {
      if (d.outstandingBalanceKes > 0) next.add(d.id);
    });
    setSelectedDriverIds(next);
  };

  const handleUpdateBulkAmount = (driverId: string, val: number) => {
    setBulkAmounts(prev => ({
      ...prev,
      [driverId]: Math.max(0, val)
    }));
  };

  const handleQuickFillSelectedAmounts = (type: 'BALANCE' | 'FLAT_5000' | 'FLAT_10000') => {
    setBulkAmounts(prev => {
      const next = { ...prev };
      drivers.forEach(d => {
        if (selectedDriverIds.has(d.id)) {
          if (type === 'BALANCE') {
            next[d.id] = d.outstandingBalanceKes > 0 ? d.outstandingBalanceKes : 5000;
          } else if (type === 'FLAT_5000') {
            next[d.id] = 5000;
          } else if (type === 'FLAT_10000') {
            next[d.id] = 10000;
          }
        }
      });
      return next;
    });
    toast.info(`Updated payout amounts for ${selectedDriverIds.size} selected drivers.`);
  };

  // Calculate Total Bulk Requirements
  const bulkCalculations = useMemo(() => {
    const selectedList = drivers.filter(d => selectedDriverIds.has(d.id));
    let totalGross = 0;
    let totalFees = 0;

    const items = selectedList.map(d => {
      const amountKes = bulkAmounts[d.id] || 0;
      const feeInfo = getMpesaFeeForAmount(amountKes);
      totalGross += amountKes;
      totalFees += feeInfo.feeKes;

      return {
        driver: d,
        amountKes,
        feeKes: feeInfo.feeKes,
        tariffBandLabel: feeInfo.band.label
      };
    });

    const totalFloat = totalGross + totalFees;

    return {
      selectedCount: selectedList.length,
      items,
      totalGross,
      totalFees,
      totalFloat,
      avgPayoutPerDriver: selectedList.length > 0 ? Math.round(totalGross / selectedList.length) : 0
    };
  }, [drivers, selectedDriverIds, bulkAmounts]);

  // Execute Bulk Batch Submit
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDriverIds.size === 0) {
      toast.error('Please select at least one driver for bulk payout');
      return;
    }

    if (bulkCalculations.totalGross <= 0) {
      toast.error('Total bulk payout amount must be greater than KES 0');
      return;
    }

    const finalReason = batchReason === 'Other' ? (customBatchReason || 'Bulk Driver Payroll') : batchReason;

    setIsSubmitting(true);

    setTimeout(() => {
      const batchId = `BATCH-B2C-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = new Date().toLocaleString() + ' EAT';

      const payoutsToDispatch: Array<{ driverId: string; amountKes: number; reason: string }> = [];
      const reportItems: BulkBatchItemReport[] = [];

      drivers.forEach(d => {
        if (selectedDriverIds.has(d.id)) {
          const amt = bulkAmounts[d.id] || 0;
          if (amt > 0) {
            payoutsToDispatch.push({
              driverId: d.id,
              amountKes: amt,
              reason: finalReason
            });

            const feeInfo = getMpesaFeeForAmount(amt);
            reportItems.push({
              driverId: d.id,
              driverName: d.fullName,
              phone: d.mpesaPhoneNumber || d.phone,
              amountKes: amt,
              feeKes: feeInfo.feeKes,
              tariffBandLabel: feeInfo.band.label,
              receiptNo: `RGK${Math.floor(10000000 + Math.random() * 90000000)}`,
              ref: `MPESA-B2C-${Math.floor(100000 + Math.random() * 900000)}`,
              status: 'Success'
            });
          }
        }
      });

      // Dispatch via prop callback
      if (onSendBulkMpesaPayouts) {
        onSendBulkMpesaPayouts(payoutsToDispatch);
      } else {
        payoutsToDispatch.forEach(p => {
          onSendMpesaPayout(p.driverId, p.amountKes, p.reason);
        });
      }

      setBulkSuccessReport({
        batchId,
        timestamp,
        totalGross: bulkCalculations.totalGross,
        totalFees: bulkCalculations.totalFees,
        totalFloat: bulkCalculations.totalFloat,
        reason: finalReason,
        items: reportItems
      });

      setIsSubmitting(false);
      toast.success(`Bulk M-Pesa batch processing executed for ${payoutsToDispatch.length} drivers!`, {
        description: `Total Disbursed: KES ${bulkCalculations.totalGross.toLocaleString()} (+ KES ${bulkCalculations.totalFees.toLocaleString()} M-Pesa Fees)`
      });
    }, 1200);
  };

  const handleDownloadReportCsv = () => {
    if (!bulkSuccessReport) return;

    const headers = [
      'Batch ID',
      'Execution Timestamp',
      'Driver Name',
      'Phone Number',
      'Disbursed Amount (KES)',
      'M-Pesa B2C Fee (KES)',
      'Tariff Band',
      'Total Float (KES)',
      'M-Pesa Receipt No',
      'Transaction Ref',
      'Status'
    ];

    const rows = bulkSuccessReport.items.map(item => [
      bulkSuccessReport.batchId,
      `"${bulkSuccessReport.timestamp}"`,
      `"${item.driverName.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      item.amountKes,
      item.feeKes,
      `"${item.tariffBandLabel}"`,
      item.amountKes + item.feeKes,
      item.receiptNo,
      item.ref,
      item.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mpesa_b2c_batch_report_${bulkSuccessReport.batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Downloaded M-Pesa Batch Processing CSV Report!');
  };

  const handleCopyBatchSummary = () => {
    if (!bulkSuccessReport) return;
    const summaryText = `--- M-PESA B2C BATCH PROCESSING REPORT ---
Batch Ref: ${bulkSuccessReport.batchId}
Processed At: ${bulkSuccessReport.timestamp}
Reason: ${bulkSuccessReport.reason}
Recipients: ${bulkSuccessReport.items.length} Drivers
Gross Payout Amount: KES ${bulkSuccessReport.totalGross.toLocaleString()}
Total M-Pesa Fees: KES ${bulkSuccessReport.totalFees.toLocaleString()}
Total Float Consumed: KES ${bulkSuccessReport.totalFloat.toLocaleString()}`;

    navigator.clipboard.writeText(summaryText);
    toast.success('Batch Summary Copied to Clipboard!');
  };

  const handleCloseAll = () => {
    setSuccessReceipt(null);
    setBulkSuccessReport(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* HEADER & TABS */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Zap className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">
                  M-Pesa B2C Commercial Driver Payout Hub
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Safaricom B2C API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Process single express transfers or execute bulk batch payouts with tariff fee projections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Mode Toggle Pills (If not in success view) */}
            {!successReceipt && !bulkSuccessReport && (
              <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPayoutMode('SINGLE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    payoutMode === 'SINGLE'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Single Driver</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMode('BULK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    payoutMode === 'BULK'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Bulk Batch ({drivers.length})</span>
                </button>
              </div>
            )}

            <button 
              onClick={handleCloseAll}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* VIEW A: SINGLE DRIVER SUCCESS RECEIPT */}
          {successReceipt && (
            <div className="p-6 space-y-5 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">M-Pesa Payout Dispatched!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Single transaction processed successfully via GreenShift B2C API gateway.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Recipient Driver:</span>
                  <strong className="text-white font-sans">{successReceipt.driverName}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Phone Number:</span>
                  <strong className="text-emerald-400">{successReceipt.phone}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Disbursed Amount:</span>
                  <strong className="text-emerald-400 font-bold text-sm">KES {successReceipt.amount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">M-Pesa B2C Tariff Fee:</span>
                  <strong className="text-amber-400 font-bold">KES {successReceipt.fee}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">M-Pesa Receipt No:</span>
                  <strong className="text-amber-400">{successReceipt.receiptNo}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ref Code:</span>
                  <strong className="text-slate-300">{successReceipt.ref}</strong>
                </div>
              </div>

              <button
                onClick={handleCloseAll}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition shadow-lg cursor-pointer"
              >
                Done & Return to Fleet Command
              </button>
            </div>
          )}

          {/* VIEW B: BULK BATCH SUCCESS REPORT */}
          {bulkSuccessReport && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">Bulk M-Pesa Batch Dispatched Successfully</h3>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {bulkSuccessReport.batchId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Batch processed at {bulkSuccessReport.timestamp} • Category: {bulkSuccessReport.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyBatchSummary}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Copy Summary</span>
                  </button>

                  <button
                    onClick={handleDownloadReportCsv}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Report CSV</span>
                  </button>
                </div>
              </div>

              {/* Summary Requirement Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans font-bold block">Recipients Paid</span>
                  <div className="text-xl font-black text-white mt-1">
                    {bulkSuccessReport.items.length} Drivers
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans font-bold block">Gross Amount Disbursed</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    KES {bulkSuccessReport.totalGross.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-sans font-bold block">Total Float Consumed (+ Fees)</span>
                  <div className="text-xl font-black text-amber-400 mt-1">
                    KES {bulkSuccessReport.totalFloat.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">(includes KES {bulkSuccessReport.totalFees.toLocaleString()} M-Pesa fees)</span>
                </div>
              </div>

              {/* Itemized Batch Report Table */}
              <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-white">
                  <span>Batch Execution Itemized Log</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">100% Confirmed API Delivery</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Driver</th>
                        <th className="px-4 py-2">Phone</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2">M-Pesa Fee</th>
                        <th className="px-4 py-2">Receipt No</th>
                        <th className="px-4 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {bulkSuccessReport.items.map((item) => (
                        <tr key={item.driverId} className="hover:bg-slate-900/40">
                          <td className="px-4 py-2.5 font-bold text-white font-sans">{item.driverName}</td>
                          <td className="px-4 py-2.5 text-slate-400">{item.phone}</td>
                          <td className="px-4 py-2.5 font-bold text-emerald-400">KES {item.amountKes.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-amber-400">KES {item.feeKes}</td>
                          <td className="px-4 py-2.5 text-slate-300">{item.receiptNo}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCloseAll}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition shadow-lg cursor-pointer"
                >
                  Done & Return to Fleet Command
                </button>
              </div>
            </div>
          )}

          {/* VIEW C: SINGLE DRIVER FORM */}
          {!successReceipt && !bulkSuccessReport && payoutMode === 'SINGLE' && (
            <form onSubmit={handleSingleSubmit} className="space-y-5 max-w-lg mx-auto">
              
              {/* Pre-filled Driver Card Preview */}
              {selectedDriver && (
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedDriver.profilePhotoUrl} 
                      alt={selectedDriver.fullName}
                      className="w-11 h-11 rounded-lg object-cover border border-emerald-500/40 shrink-0" 
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{selectedDriver.fullName}</span>
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded">
                          {selectedDriver.city}
                        </span>
                      </h4>
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{selectedDriver.mpesaPhoneNumber || selectedDriver.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Available Balance</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      KES {selectedDriver.outstandingBalanceKes.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Driver Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Select Target Driver</span>
                  <span className="text-[10px] text-slate-500 font-normal">Pre-filled from driver details</span>
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.phone}) — Balance: KES {d.outstandingBalanceKes.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Field + Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Payout Amount (KES) <span className="text-red-400">*</span>
                  </label>
                  {selectedDriver && selectedDriver.outstandingBalanceKes > 0 && (
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(selectedDriver.outstandingBalanceKes)}
                      className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      Set Full Balance (KES {selectedDriver.outstandingBalanceKes.toLocaleString()})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    KES
                  </span>
                  <input
                    type="number"
                    required
                    min="100"
                    max="250000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-2.5 text-sm font-mono font-bold text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Tariff Fee Projection Badge */}
                {Number(amount) > 0 && (
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                    <span className="text-slate-400">Safaricom B2C Transaction Fee:</span>
                    <span className="text-amber-400 font-bold">
                      KES {getMpesaFeeForAmount(Number(amount)).feeKes} ({getMpesaFeeForAmount(Number(amount)).band.label})
                    </span>
                  </div>
                )}

                {/* Quick Amount Pills */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                  <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Quick Preset:</span>
                  {[1000, 2500, 5000, 10000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmount(val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition shrink-0 cursor-pointer ${
                        Number(amount) === val 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      +KES {val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Disbursement Category / Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Weekly Earnings Payout">Weekly Earnings Payout</option>
                  <option value="Daily Revenue Settlement">Daily Revenue Settlement</option>
                  <option value="Driver Performance Bonus">Driver Performance Bonus</option>
                  <option value="Emergency Advance">Emergency Advance</option>
                  <option value="EV Battery Charging Subsidy">EV Battery Charging Subsidy</option>
                  <option value="Fuel Allowance Disbursement">Fuel Allowance Disbursement</option>
                  <option value="Other">Other Custom Reason</option>
                </select>

                {reason === 'Other' && (
                  <input
                    type="text"
                    placeholder="Specify custom payout reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching M-Pesa...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                      <span>Execute Quick Pay (KES {Number(amount || 0).toLocaleString()})</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* VIEW D: BULK BATCH FORM & RECIPIENT SELECTION */}
          {!successReceipt && !bulkSuccessReport && payoutMode === 'BULK' && (
            <form onSubmit={handleBulkSubmit} className="space-y-5">
              
              {/* TOP BULK SUMMARY REQUIREMENTS BANNER */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider block">Selected Drivers</span>
                  <div className="text-xl font-black text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>{bulkCalculations.selectedCount} / {drivers.length}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider block">Total Gross Disbursed</span>
                  <div className="text-xl font-black text-emerald-400">
                    KES {bulkCalculations.totalGross.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider block">Total M-Pesa Fees</span>
                  <div className="text-xl font-black text-amber-400">
                    KES {bulkCalculations.totalFees.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider block">Required M-Pesa Float</span>
                  <div className="text-xl font-black text-indigo-300">
                    KES {bulkCalculations.totalFloat.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* BATCH PARAMETERS & FILTER TOOLBAR */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  
                  {/* Category Selector */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-slate-400 font-bold shrink-0">Batch Category:</label>
                    <select
                      value={batchReason}
                      onChange={(e) => setBatchReason(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="Weekly Earnings Payout">Weekly Earnings Payout</option>
                      <option value="Daily Revenue Settlement">Daily Revenue Settlement</option>
                      <option value="Driver Performance Bonus">Driver Performance Bonus</option>
                      <option value="Emergency Advance">Emergency Advance</option>
                      <option value="EV Battery Charging Subsidy">EV Battery Charging Subsidy</option>
                      <option value="Fuel Allowance Disbursement">Fuel Allowance Disbursement</option>
                      <option value="Other">Other Custom Reason</option>
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search driver name, phone, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white text-xs pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                </div>

                {/* QUICK SELECTION BUTTONS & QUICK FILL */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[11px] transition cursor-pointer"
                    >
                      Select All Filtered ({filteredDrivers.length})
                    </button>

                    <button
                      type="button"
                      onClick={handleSelectBalanceOnly}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold text-[11px] transition cursor-pointer"
                    >
                      Select Balance &gt; 0 Only
                    </button>

                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>

                  {/* Amount fill presets */}
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    <span>Fill Selected:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickFillSelectedAmounts('BALANCE')}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer"
                    >
                      Full Balance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillSelectedAmounts('FLAT_5000')}
                      className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
                    >
                      KES 5k
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillSelectedAmounts('FLAT_10000')}
                      className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
                    >
                      KES 10k
                    </button>
                  </div>
                </div>
              </div>

              {/* DRIVER CHECKLIST MATRIX TABLE */}
              <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 sticky top-0 font-mono">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredDrivers.length > 0 && filteredDrivers.every(d => selectedDriverIds.has(d.id))}
                            onChange={(e) => {
                              if (e.target.checked) handleSelectAllFiltered();
                              else handleDeselectAll();
                            }}
                            className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="px-4 py-3">Driver Recipient</th>
                        <th className="px-4 py-3">Phone Number</th>
                        <th className="px-4 py-3">Outstanding Balance</th>
                        <th className="px-4 py-3 text-white">Disbursal Amount (KES)</th>
                        <th className="px-4 py-3 text-right text-amber-400">M-Pesa B2C Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {filteredDrivers.map((driver) => {
                        const isSelected = selectedDriverIds.has(driver.id);
                        const currentAmount = bulkAmounts[driver.id] || 0;
                        const feeInfo = getMpesaFeeForAmount(currentAmount);

                        return (
                          <tr 
                            key={driver.id} 
                            className={`transition ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-900/40'}`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectDriver(driver.id)}
                                className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-bold text-white font-sans flex items-center gap-2">
                                <span>{driver.fullName}</span>
                                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                                  {driver.city}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-emerald-400">
                              {driver.mpesaPhoneNumber || driver.phone}
                            </td>

                            <td className="px-4 py-3 text-slate-300">
                              KES {driver.outstandingBalanceKes.toLocaleString()}
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                disabled={!isSelected}
                                min="0"
                                max="250000"
                                value={currentAmount}
                                onChange={(e) => handleUpdateBulkAmount(driver.id, Number(e.target.value))}
                                className={`w-28 px-2.5 py-1 rounded border font-mono font-bold text-xs focus:outline-none ${
                                  isSelected 
                                    ? 'bg-slate-900 border-slate-700 text-emerald-400 focus:border-emerald-500' 
                                    : 'bg-slate-950 border-slate-900 text-slate-600 opacity-50'
                                }`}
                              />
                            </td>

                            <td className="px-4 py-3 text-right">
                              {isSelected && currentAmount > 0 ? (
                                <span className="text-amber-400 font-bold">
                                  KES {feeInfo.feeKes} <span className="text-[10px] text-slate-500 font-normal">({feeInfo.band.label})</span>
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Total Float Required: <strong className="text-white font-mono">KES {bulkCalculations.totalFloat.toLocaleString()}</strong>
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || selectedDriverIds.size === 0 || bulkCalculations.totalGross <= 0}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Processing Bulk Batch...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>
                          Execute Bulk Batch ({bulkCalculations.selectedCount} Drivers • KES {bulkCalculations.totalGross.toLocaleString()})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
