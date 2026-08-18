import React, { useState, useMemo } from 'react';
import { MpesaPayoutRequest } from '../types';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, Search, 
  Download, RefreshCw, Edit3, Check, X, ShieldCheck, 
  FileText, Copy, AlertCircle, DollarSign, ArrowRight,
  Filter, Sparkles, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface ReconciliationAuditorCardProps {
  mpesaPayouts: MpesaPayoutRequest[];
  onUpdateMpesaReceipt?: (payoutId: string, newReceiptNo: string) => void;
}

export interface AuditFlaggedItem {
  payout: MpesaPayoutRequest;
  flagTypes: ('MISSING_RECEIPT' | 'DUPLICATE_TX' | 'DUPLICATE_RECEIPT')[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  conflictingPayouts?: MpesaPayoutRequest[];
}

export const ReconciliationAuditorCard: React.FC<ReconciliationAuditorCardProps> = ({
  mpesaPayouts = [],
  onUpdateMpesaReceipt
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL_FLAGGED' | 'MISSING_RECEIPT' | 'DUPLICATE_TX' | 'CLEAN'>('ALL_FLAGGED');
  const [editingPayoutId, setEditingPayoutId] = useState<string | null>(null);
  const [receiptInput, setReceiptInput] = useState('');
  const [resolvedPayoutIds, setResolvedPayoutIds] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Compute Automatic Audit Results
  const auditAnalysis = useMemo(() => {
    const flaggedItems: AuditFlaggedItem[] = [];
    const cleanItems: MpesaPayoutRequest[] = [];

    // Map to detect duplicate transactionRefs
    const txRefMap = new Map<string, MpesaPayoutRequest[]>();
    // Map to detect duplicate mpesaReceiptNos
    const receiptMap = new Map<string, MpesaPayoutRequest[]>();

    mpesaPayouts.forEach(p => {
      // Group by transactionRef
      const rawTx = (p.transactionRef || '').trim().toUpperCase();
      if (rawTx) {
        if (!txRefMap.has(rawTx)) txRefMap.set(rawTx, []);
        txRefMap.get(rawTx)!.push(p);
      }

      // Group by mpesaReceiptNo
      const rawReceipt = (p.mpesaReceiptNo || '').trim().toUpperCase();
      if (rawReceipt && rawReceipt !== 'N/A' && rawReceipt !== '-') {
        if (!receiptMap.has(rawReceipt)) receiptMap.set(rawReceipt, []);
        receiptMap.get(rawReceipt)!.push(p);
      }
    });

    let totalFlaggedValueKes = 0;
    let missingReceiptCount = 0;
    let missingReceiptValueKes = 0;
    let duplicateTxCount = 0;
    let duplicateTxValueKes = 0;

    mpesaPayouts.forEach(p => {
      // If marked resolved during session, count as clean
      if (resolvedPayoutIds.includes(p.id)) {
        cleanItems.push(p);
        return;
      }

      const flags: ('MISSING_RECEIPT' | 'DUPLICATE_TX' | 'DUPLICATE_RECEIPT')[] = [];
      const rawTx = (p.transactionRef || '').trim().toUpperCase();
      const rawReceipt = (p.mpesaReceiptNo || '').trim().toUpperCase();

      const isMissingReceipt = !rawReceipt || rawReceipt === 'N/A' || rawReceipt === '-' || rawReceipt.length < 5;
      const txMatches = txRefMap.get(rawTx) || [];
      const isDuplicateTx = txMatches.length > 1;

      const receiptMatches = receiptMap.get(rawReceipt) || [];
      const isDuplicateReceipt = !isMissingReceipt && receiptMatches.length > 1;

      if (isMissingReceipt) {
        flags.push('MISSING_RECEIPT');
        missingReceiptCount++;
        missingReceiptValueKes += p.amountKes;
      }

      if (isDuplicateTx) {
        flags.push('DUPLICATE_TX');
        duplicateTxCount++;
        duplicateTxValueKes += p.amountKes;
      }

      if (isDuplicateReceipt) {
        flags.push('DUPLICATE_RECEIPT');
      }

      if (flags.length > 0) {
        totalFlaggedValueKes += p.amountKes;

        let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'HIGH';
        if (isDuplicateTx || isDuplicateReceipt) {
          severity = 'CRITICAL';
        } else if (isMissingReceipt) {
          severity = 'HIGH';
        }

        const descriptions: string[] = [];
        if (isMissingReceipt) {
          descriptions.push('Lacking a valid Safaricom B2C receipt reference');
        }
        if (isDuplicateTx) {
          const conflictingRefs = txMatches.filter(m => m.id !== p.id).map(m => `${m.driverName} (${m.transactionRef})`);
          descriptions.push(`Duplicate transaction ID '${p.transactionRef}' shared with: ${conflictingRefs.join(', ')}`);
        }
        if (isDuplicateReceipt) {
          const conflictingReceipts = receiptMatches.filter(m => m.id !== p.id).map(m => m.transactionRef);
          descriptions.push(`Duplicate M-Pesa receipt code '${rawReceipt}' shared across ${receiptMatches.length} payouts (${conflictingReceipts.join(', ')})`);
        }

        // Collect all conflicting payouts
        const conflictingPayoutsSet = new Set<MpesaPayoutRequest>();
        if (isDuplicateTx) txMatches.forEach(m => m.id !== p.id && conflictingPayoutsSet.add(m));
        if (isDuplicateReceipt) receiptMatches.forEach(m => m.id !== p.id && conflictingPayoutsSet.add(m));

        flaggedItems.push({
          payout: p,
          flagTypes: flags,
          severity,
          description: descriptions.join(' | '),
          conflictingPayouts: Array.from(conflictingPayoutsSet)
        });
      } else {
        cleanItems.push(p);
      }
    });

    const totalAudited = mpesaPayouts.length;
    const healthRatePercent = totalAudited > 0 
      ? Math.round(((totalAudited - flaggedItems.length) / totalAudited) * 100) 
      : 100;

    return {
      flaggedItems,
      cleanItems,
      totalAudited,
      totalAuditedValueKes: mpesaPayouts.reduce((acc, curr) => acc + curr.amountKes, 0),
      flaggedCount: flaggedItems.length,
      totalFlaggedValueKes,
      missingReceiptCount,
      missingReceiptValueKes,
      duplicateTxCount,
      duplicateTxValueKes,
      healthRatePercent
    };
  }, [mpesaPayouts, resolvedPayoutIds]);

  // Filter items based on active sub-tab and search query
  const filteredFlaggedItems = useMemo(() => {
    return auditAnalysis.flaggedItems.filter(item => {
      const p = item.payout;
      const matchesSearch = searchQuery === '' ||
        p.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.mpesaReceiptNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phoneNumber.includes(searchQuery);

      if (!matchesSearch) return false;

      if (activeFilter === 'ALL_FLAGGED') return true;
      if (activeFilter === 'MISSING_RECEIPT') return item.flagTypes.includes('MISSING_RECEIPT');
      if (activeFilter === 'DUPLICATE_TX') return item.flagTypes.includes('DUPLICATE_TX') || item.flagTypes.includes('DUPLICATE_RECEIPT');
      return true;
    });
  }, [auditAnalysis.flaggedItems, searchQuery, activeFilter]);

  const handleRunReScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      toast.success('Reconciliation Audit Scan Complete', {
        description: `Audited ${auditAnalysis.totalAudited} M-Pesa payouts. ${auditAnalysis.flaggedCount} discrepancies detected.`
      });
    }, 600);
  };

  const handleSaveReceipt = (payoutId: string) => {
    if (!receiptInput.trim()) {
      toast.error('Please enter a valid M-Pesa receipt number');
      return;
    }
    const cleanRef = receiptInput.trim().toUpperCase();
    if (onUpdateMpesaReceipt) {
      onUpdateMpesaReceipt(payoutId, cleanRef);
    }
    setResolvedPayoutIds(prev => [...prev, payoutId]);
    setEditingPayoutId(null);
    setReceiptInput('');
    toast.success('Receipt Reference Saved', {
      description: `M-Pesa receipt #${cleanRef} attached. Transaction marked reconciled.`
    });
  };

  const handleResolveDuplicate = (payoutId: string) => {
    setResolvedPayoutIds(prev => [...prev, payoutId]);
    toast.success('Discrepancy Resolved', {
      description: 'Marked transaction as reviewed and cleared in audit ledger.'
    });
  };

  const handleExportAuditCsv = () => {
    if (auditAnalysis.flaggedItems.length === 0) {
      toast.info('No flagged reconciliation discrepancies to export.');
      return;
    }

    const headers = ['Payout ID', 'Transaction Ref', 'Driver Name', 'Phone', 'Amount (KES)', 'Receipt No', 'Flag Type', 'Severity', 'Description', 'Timestamp'];
    const rows = auditAnalysis.flaggedItems.map(item => [
      item.payout.id,
      item.payout.transactionRef,
      item.payout.driverName,
      item.payout.phoneNumber,
      item.payout.amountKes,
      item.payout.mpesaReceiptNo || 'MISSING',
      item.flagTypes.join(' & '),
      item.severity,
      `"${item.description.replace(/"/g, '""')}"`,
      item.payout.timestamp
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mpesa_Reconciliation_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Audit CSV Exported', {
      description: `Downloaded ${auditAnalysis.flaggedItems.length} reconciliation exception records.`
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            auditAnalysis.flaggedCount > 0 
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white tracking-wide">
                Reconciliation Auditor
              </h2>
              {auditAnalysis.flaggedCount > 0 ? (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{auditAnalysis.flaggedCount} Discrepanc{auditAnalysis.flaggedCount === 1 ? 'y' : 'ies'} Flagged</span>
                </span>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Ledger Reconciled</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated M-Pesa audit engine flagging missing receipt references and duplicate transaction IDs
            </p>
          </div>
        </div>

        {/* TOP CONTROLS */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunReScan}
            disabled={isScanning}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Ledger...' : 'Run Audit Scan'}</span>
          </button>

          <button
            onClick={handleExportAuditCsv}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* METRIC PILLARS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Audited Payouts</span>
            <FileText className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-black text-white mt-1">
            {auditAnalysis.totalAudited} <span className="text-xs font-normal text-slate-400">txs</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            KES {auditAnalysis.totalAuditedValueKes.toLocaleString()}
          </div>
        </div>

        <div className={`border rounded-xl p-3 ${
          auditAnalysis.flaggedCount > 0 ? 'bg-rose-950/30 border-rose-500/40' : 'bg-slate-950/80 border-slate-800/80'
        }`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Risk Exposure</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${auditAnalysis.flaggedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-lg font-black mt-1 ${auditAnalysis.flaggedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            KES {auditAnalysis.totalFlaggedValueKes.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            {auditAnalysis.flaggedCount} flagged records
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Missing Receipts</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-400 mt-1">
            {auditAnalysis.missingReceiptCount} <span className="text-xs font-normal text-slate-400 font-sans">payouts</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            KES {auditAnalysis.missingReceiptValueKes.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Duplicate Tx IDs</span>
            <Copy className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-black text-rose-400 mt-1">
            {auditAnalysis.duplicateTxCount} <span className="text-xs font-normal text-slate-400 font-sans font-medium">payouts</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            KES {auditAnalysis.duplicateTxValueKes.toLocaleString()}
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('ALL_FLAGGED')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'ALL_FLAGGED'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Flagged ({auditAnalysis.flaggedCount})
          </button>
          <button
            onClick={() => setActiveFilter('MISSING_RECEIPT')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'MISSING_RECEIPT'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lacking Receipt ({auditAnalysis.missingReceiptCount})
          </button>
          <button
            onClick={() => setActiveFilter('DUPLICATE_TX')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'DUPLICATE_TX'
                ? 'bg-rose-600 text-white font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Duplicates ({auditAnalysis.duplicateTxCount})
          </button>
          <button
            onClick={() => setActiveFilter('CLEAN')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'CLEAN'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reconciled ({auditAnalysis.cleanItems.length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver, Tx Ref, receipt..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FLAGGED AUDIT RECORDS LIST */}
      {activeFilter !== 'CLEAN' ? (
        filteredFlaggedItems.length > 0 ? (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredFlaggedItems.map((item) => {
              const p = item.payout;
              const isEditing = editingPayoutId === p.id;
              const hasMissing = item.flagTypes.includes('MISSING_RECEIPT');
              const hasDuplicate = item.flagTypes.includes('DUPLICATE_TX') || item.flagTypes.includes('DUPLICATE_RECEIPT');

              return (
                <div 
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                    item.severity === 'CRITICAL' 
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                      : 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Severity Pill */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        item.severity === 'CRITICAL'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>{item.severity}</span>
                      </span>

                      {/* Flag Types Badges */}
                      {hasMissing && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                          Lacking Receipt Reference
                        </span>
                      )}
                      {hasDuplicate && (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                          Duplicate ID/Reference
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-mono font-bold text-slate-400">
                      Ref: <span className="text-white">{p.transactionRef}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Driver / Recipient</div>
                      <div className="text-xs font-bold text-slate-100">{p.driverName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{p.phoneNumber}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Payout Amount</div>
                      <div className="text-xs font-black text-emerald-400 font-mono">KES {p.amountKes.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400">{p.payoutReason}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">M-Pesa Receipt Code</div>
                      <div className="text-xs font-mono font-bold">
                        {p.mpesaReceiptNo && p.mpesaReceiptNo !== 'N/A' && p.mpesaReceiptNo !== '-' ? (
                          <span className="text-emerald-400">{p.mpesaReceiptNo}</span>
                        ) : (
                          <span className="text-rose-400 italic">MISSING_RECEIPT</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{new Date(p.timestamp).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Audit Description Note */}
                  <div className="text-xs text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800/60 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item.description}</span>
                  </div>

                  {/* Conflicting Payouts Breakdown if Duplicate */}
                  {item.conflictingPayouts && item.conflictingPayouts.length > 0 && (
                    <div className="text-[11px] bg-rose-950/40 p-2 rounded border border-rose-500/20 space-y-1">
                      <div className="font-bold text-rose-300 flex items-center gap-1">
                        <Copy className="w-3 h-3 text-rose-400" />
                        <span>Conflicting Payout Requests ({item.conflictingPayouts.length}):</span>
                      </div>
                      {item.conflictingPayouts.map(c => (
                        <div key={c.id} className="flex items-center justify-between font-mono text-slate-300 text-[10px] pl-2 border-l border-rose-500/30">
                          <span>{c.driverName} ({c.transactionRef})</span>
                          <span>KES {c.amountKes.toLocaleString()} • Receipt: {c.mpesaReceiptNo || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACTION CONTROLS */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          value={receiptInput}
                          onChange={(e) => setReceiptInput(e.target.value)}
                          placeholder="e.g., QK90128X91"
                          className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveReceipt(p.id)}
                          className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Reconcile</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingPayoutId(null);
                            setReceiptInput('');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {hasMissing && (
                          <button
                            onClick={() => {
                              setEditingPayoutId(p.id);
                              setReceiptInput(p.mpesaReceiptNo && p.mpesaReceiptNo !== 'N/A' ? p.mpesaReceiptNo : '');
                            }}
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Attach M-Pesa Receipt</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleResolveDuplicate(p.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mark Reviewed / Cleared</span>
                        </button>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 font-mono">
                      ID: {p.id.slice(0, 12)}...
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-white">No Discrepancies Found in Selected Filter</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All M-Pesa payouts in this view have valid Safaricom receipt references and unique transaction IDs.
            </p>
          </div>
        )
      ) : (
        /* RECONCILED / CLEAN LIST */
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {auditAnalysis.cleanItems.length > 0 ? (
            auditAnalysis.cleanItems.map(p => (
              <div key={p.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200">{p.driverName}</span>
                    <span className="text-slate-400 font-mono text-[11px] ml-2">({p.transactionRef})</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-slate-300">Receipt: <span className="text-emerald-400 font-bold">{p.mpesaReceiptNo}</span></span>
                  <span className="font-mono font-bold text-emerald-400">KES {p.amountKes.toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">No reconciled items found.</div>
          )}
        </div>
      )}
    </div>
  );
};
