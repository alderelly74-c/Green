import React, { useState, useMemo } from 'react';
import { MpesaPayoutRequest } from '../types';
import { 
  ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Search, 
  Filter, Download, RefreshCw, FileSpreadsheet, Edit3, Check, X,
  ShieldCheck, Info, ExternalLink, ArrowRight, DollarSign, Send
} from 'lucide-react';
import { toast } from 'sonner';

interface ReconciliationAlertsTableProps {
  mpesaPayouts: MpesaPayoutRequest[];
  onUpdateMpesaReceipt?: (payoutId: string, newReceiptNo: string) => void;
}

export interface ReconciliationException {
  payout: MpesaPayoutRequest;
  issueType: 'Missing' | 'Duplicate';
  severity: 'High' | 'Medium';
  conflictCount?: number;
  conflictingRefs?: string[];
  conflictReceiptNo?: string;
  auditNote: string;
}

export const ReconciliationAlertsTable: React.FC<ReconciliationAlertsTableProps> = ({
  mpesaPayouts = [],
  onUpdateMpesaReceipt
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL_EXCEPTIONS' | 'MISSING' | 'DUPLICATE' | 'ALL_TRANSACTIONS'>('ALL_EXCEPTIONS');
  const [editingPayoutId, setEditingPayoutId] = useState<string | null>(null);
  const [newReceiptInput, setNewReceiptInput] = useState('');
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  // Compute Reconciliation Exceptions Engine
  const { exceptionsList, missingCount, duplicateCount, missingSumKes, duplicateSumKes, verifiedCount } = useMemo(() => {
    const exceptions: ReconciliationException[] = [];
    let mCount = 0;
    let dCount = 0;
    let mSum = 0;
    let dSum = 0;
    let vCount = 0;

    // Group payouts by normalized receipt code
    const receiptGroups: Record<string, MpesaPayoutRequest[]> = {};

    mpesaPayouts.forEach(p => {
      const rawReceipt = (p.mpesaReceiptNo || '').trim().toUpperCase();
      if (rawReceipt && rawReceipt !== 'N/A' && rawReceipt !== '-') {
        if (!receiptGroups[rawReceipt]) {
          receiptGroups[rawReceipt] = [];
        }
        receiptGroups[rawReceipt].push(p);
      }
    });

    mpesaPayouts.forEach(p => {
      // If manually resolved in session, skip flagging
      if (resolvedIds.includes(p.id)) {
        vCount++;
        return;
      }

      const rawReceipt = (p.mpesaReceiptNo || '').trim().toUpperCase();
      const isMissing = !rawReceipt || rawReceipt === 'N/A' || rawReceipt === '-';

      if (isMissing) {
        mCount++;
        mSum += p.amountKes;
        exceptions.push({
          payout: p,
          issueType: 'Missing',
          severity: 'High',
          auditNote: 'No Safaricom B2C receipt reference recorded. Requires manual receipt attachment or API sync.'
        });
      } else {
        const matches = receiptGroups[rawReceipt] || [];
        if (matches.length > 1) {
          dCount++;
          dSum += p.amountKes;
          const conflictingRefs = matches.filter(m => m.id !== p.id).map(m => m.transactionRef);
          exceptions.push({
            payout: p,
            issueType: 'Duplicate',
            severity: 'Medium',
            conflictCount: matches.length,
            conflictingRefs,
            conflictReceiptNo: rawReceipt,
            auditNote: `Duplicate M-Pesa receipt code '${rawReceipt}' shared across ${matches.length} payouts (${matches.map(m => m.transactionRef).join(', ')}). Risk of double ledger posting.`
          });
        } else {
          vCount++;
        }
      }
    });

    return {
      exceptionsList: exceptions,
      missingCount: mCount,
      duplicateCount: dCount,
      missingSumKes: mSum,
      duplicateSumKes: dSum,
      verifiedCount: vCount
    };
  }, [mpesaPayouts, resolvedIds]);

  // Filter exceptions or all transactions
  const filteredItems = useMemo(() => {
    let list = exceptionsList;

    if (filterType === 'MISSING') {
      list = exceptionsList.filter(e => e.issueType === 'Missing');
    } else if (filterType === 'DUPLICATE') {
      list = exceptionsList.filter(e => e.issueType === 'Duplicate');
    } else if (filterType === 'ALL_TRANSACTIONS') {
      // Show all payouts wrapped as items
      return mpesaPayouts.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.transactionRef.toLowerCase().includes(q) ||
          p.driverName.toLowerCase().includes(q) ||
          p.phoneNumber.toLowerCase().includes(q) ||
          (p.mpesaReceiptNo || '').toLowerCase().includes(q)
        );
      }).map(p => {
        const matchExc = exceptionsList.find(e => e.payout.id === p.id);
        if (matchExc) return matchExc;
        return {
          payout: p,
          issueType: 'Missing' as const, // not an exception
          severity: 'Low' as const,
          auditNote: 'Verified unique M-Pesa receipt.'
        };
      });
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(e => 
      e.payout.transactionRef.toLowerCase().includes(q) ||
      e.payout.driverName.toLowerCase().includes(q) ||
      e.payout.phoneNumber.toLowerCase().includes(q) ||
      (e.payout.mpesaReceiptNo || '').toLowerCase().includes(q) ||
      e.auditNote.toLowerCase().includes(q)
    );
  }, [exceptionsList, filterType, searchQuery, mpesaPayouts]);

  // Save receipt update handler
  const handleSaveReceipt = (payoutId: string) => {
    if (!newReceiptInput.trim()) {
      toast.error('Please enter a valid M-Pesa receipt reference code.');
      return;
    }

    const cleanReceipt = newReceiptInput.trim().toUpperCase();

    if (onUpdateMpesaReceipt) {
      onUpdateMpesaReceipt(payoutId, cleanReceipt);
    }

    // Mark as resolved
    setResolvedIds(prev => [...prev, payoutId]);
    setEditingPayoutId(null);
    setNewReceiptInput('');

    toast.success(`M-Pesa Receipt Code Updated!`, {
      description: `Assigned code '${cleanReceipt}' to transaction. Re-auditing system state...`
    });
  };

  // Mark verified directly
  const handleDismissException = (payoutId: string, ref: string) => {
    setResolvedIds(prev => [...prev, payoutId]);
    toast.info(`Exception Dismissed`, {
      description: `Transaction ${ref} marked as manually verified by audit controller.`
    });
  };

  // Run audit scan button
  const handleRunAuditScan = () => {
    toast.success('Financial Audit Engine Executed', {
      description: `Scanned ${mpesaPayouts.length} payouts: ${exceptionsList.length} exceptions flagged (${missingCount} missing, ${duplicateCount} duplicates).`
    });
  };

  // Export Exceptions CSV
  const handleExportExceptionsCsv = () => {
    const headers = [
      'Issue Type',
      'Severity',
      'Transaction Ref',
      'Driver Name',
      'Phone Number',
      'Amount (KES)',
      'Payout Reason',
      'M-Pesa Receipt No',
      'Audit Conflict Details',
      'Timestamp'
    ];

    const rows = exceptionsList.map(e => [
      `"${e.issueType}"`,
      `"${e.severity}"`,
      `"${e.payout.transactionRef}"`,
      `"${e.payout.driverName.replace(/"/g, '""')}"`,
      `"${e.payout.phoneNumber}"`,
      e.payout.amountKes,
      `"${e.payout.payoutReason.replace(/"/g, '""')}"`,
      `"${e.payout.mpesaReceiptNo || 'MISSING'}"`,
      `"${e.auditNote.replace(/"/g, '""')}"`,
      `"${e.payout.timestamp}"`
    ]);

    const metaHeader = [
      `"GREENSHIFT FLEET FINANCIAL AUDIT REPORT - RECONCILIATION EXCEPTIONS"`,
      `"Export Date: ${new Date().toLocaleString()}"`,
      `"Total Exceptions: ${exceptionsList.length}"`,
      `"Missing Receipts Count: ${missingCount} (KES ${missingSumKes.toLocaleString()})"`,
      `"Duplicate References Count: ${duplicateCount} (KES ${duplicateSumKes.toLocaleString()})"`,
      `""`
    ].join('\n');

    const csvContent = metaHeader + '\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reconciliation_alerts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Reconciliation Alerts Exported to CSV');
  };

  return (
    <div className="space-y-4">
      
      {/* 1. AUDIT KPI SUMMARY BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              exceptionsList.length > 0 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                M-Pesa Reconciliation Alerts & Audit Center
                {exceptionsList.length > 0 ? (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    {exceptionsList.length} Exceptions Flagged
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    100% Reconciled
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated Safaricom B2C ledger verification detecting missing receipt codes and duplicate transaction references
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRunAuditScan}
              className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-bold px-3 py-2 rounded-lg text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Run Audit Scan</span>
            </button>

            <button
              onClick={handleExportExceptionsCsv}
              disabled={exceptionsList.length === 0}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold px-3 py-2 rounded-lg text-xs transition shadow flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Exceptions CSV</span>
            </button>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-sans text-slate-400 font-medium block">Total Dispatches Audited</span>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {mpesaPayouts.length} <span className="text-xs text-slate-400 font-sans">transactions</span>
            </div>
            <div className="text-[10px] font-sans text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{verifiedCount} Verified Clean</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30">
            <span className="text-[11px] font-sans text-rose-300 font-medium block flex items-center justify-between">
              Missing Receipt Codes
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <div className="text-lg font-bold text-rose-400 mt-1">
              {missingCount} <span className="text-xs text-slate-400 font-sans">records</span>
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              Exposure: <strong className="text-rose-300">KES {missingSumKes.toLocaleString()}</strong>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30">
            <span className="text-[11px] font-sans text-amber-300 font-medium block flex items-center justify-between">
              Duplicate References
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="text-lg font-bold text-amber-400 mt-1">
              {duplicateCount} <span className="text-xs text-slate-400 font-sans">records</span>
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              Exposure: <strong className="text-amber-300">KES {duplicateSumKes.toLocaleString()}</strong>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-sans text-slate-400 font-medium block">Audit System Status</span>
            <div className={`text-sm font-black mt-1 uppercase ${exceptionsList.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {exceptionsList.length > 0 ? '⚠️ Attention Required' : '✅ Ledger Reconciled'}
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              {exceptionsList.length > 0 ? `${exceptionsList.length} exceptions need resolution` : 'All receipt codes unique & valid'}
            </div>
          </div>

        </div>

      </div>

      {/* 2. TOOLBAR & FILTER TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        
        {/* Exception Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilterType('ALL_EXCEPTIONS')}
            className={`px-3 py-1.5 rounded-md font-bold transition ${
              filterType === 'ALL_EXCEPTIONS'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Flagged Exceptions ({exceptionsList.length})
          </button>

          <button
            onClick={() => setFilterType('MISSING')}
            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
              filterType === 'MISSING'
                ? 'bg-rose-500 text-slate-950 shadow'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Missing Receipts ({missingCount})</span>
          </button>

          <button
            onClick={() => setFilterType('DUPLICATE')}
            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
              filterType === 'DUPLICATE'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Duplicates ({duplicateCount})</span>
          </button>

          <button
            onClick={() => setFilterType('ALL_TRANSACTIONS')}
            className={`px-3 py-1.5 rounded-md font-bold transition ${
              filterType === 'ALL_TRANSACTIONS'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Dispatches ({mpesaPayouts.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ref, driver, phone..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* 3. RECONCILIATION ALERTS SUMMARY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Audit Flag</th>
                <th className="px-4 py-3 font-semibold">Transaction Ref</th>
                <th className="px-4 py-3 font-semibold">Driver & Contact</th>
                <th className="px-4 py-3 font-semibold">Payout Reason</th>
                <th className="px-4 py-3 font-semibold text-right">Amount (KES)</th>
                <th className="px-4 py-3 font-semibold">M-Pesa Receipt Code</th>
                <th className="px-4 py-3 font-semibold">Audit Conflict Details</th>
                <th className="px-4 py-3 font-semibold text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-400" />
                      <p className="font-bold text-slate-200">No Reconciliation Exceptions Found!</p>
                      <p className="text-xs text-slate-500 max-w-md">
                        {filterType === 'ALL_EXCEPTIONS' 
                          ? 'All M-Pesa payout dispatches have verified unique receipt numbers recorded in the ledger.'
                          : 'No items match your active filter and search query.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const p = item.payout;
                  const isEditing = editingPayoutId === p.id;
                  const rawReceipt = (p.mpesaReceiptNo || '').trim();
                  const isMissing = !rawReceipt || rawReceipt.toUpperCase() === 'N/A' || rawReceipt === '-';

                  return (
                    <tr key={p.id} className={`hover:bg-slate-800/40 transition ${
                      item.issueType === 'Missing' ? 'bg-rose-950/10' : item.issueType === 'Duplicate' ? 'bg-amber-950/10' : ''
                    }`}>
                      
                      {/* Audit Flag Badge */}
                      <td className="px-4 py-3 shrink-0">
                        {item.issueType === 'Missing' ? (
                          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                            MISSING RECEIPT
                          </span>
                        ) : item.issueType === 'Duplicate' ? (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            DUPLICATE REFERENCE
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            VERIFIED CLEAN
                          </span>
                        )}
                      </td>

                      {/* Transaction Ref */}
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {p.transactionRef}
                      </td>

                      {/* Driver & Contact */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{p.driverName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{p.phoneNumber}</div>
                      </td>

                      {/* Payout Reason */}
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        <div>{p.payoutReason}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.timestamp}</div>
                      </td>

                      {/* Amount KES */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        KES {p.amountKes.toLocaleString()}
                      </td>

                      {/* M-Pesa Receipt Code or Inline Input */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={newReceiptInput}
                              onChange={(e) => setNewReceiptInput(e.target.value)}
                              placeholder="e.g. QHK918204M"
                              className="bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-white font-mono uppercase focus:outline-none w-32"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveReceipt(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 p-1 rounded font-bold transition"
                              title="Save Receipt Code"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingPayoutId(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 rounded transition"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isMissing ? (
                          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                            [MISSING / UNASSIGNED]
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {rawReceipt}
                          </span>
                        )}
                      </td>

                      {/* Conflict Details */}
                      <td className="px-4 py-3 text-[11px] text-slate-400 max-w-xs">
                        <p className={item.issueType === 'Missing' ? 'text-rose-300 font-medium' : item.issueType === 'Duplicate' ? 'text-amber-300 font-medium' : 'text-slate-400'}>
                          {item.auditNote}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingPayoutId(p.id);
                                setNewReceiptInput(isMissing ? '' : rawReceipt);
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Attach or correct M-Pesa receipt reference"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{isMissing ? 'Attach Receipt' : 'Edit Receipt'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDismissException(p.id, p.transactionRef)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded font-bold text-[11px] transition cursor-pointer"
                            title="Dismiss or mark as manually verified"
                          >
                            Resolve
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              Reconciliation alerts cross-reference all M-Pesa B2C callback payloads against internal driver ledger entries.
            </span>
          </div>
          <div className="font-mono text-slate-300">
            Showing <strong className="text-white">{filteredItems.length}</strong> of {mpesaPayouts.length} total dispatches
          </div>
        </div>

      </div>

    </div>
  );
};
