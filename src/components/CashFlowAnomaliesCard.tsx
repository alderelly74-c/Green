import React, { useState, useMemo } from 'react';
import { Vehicle } from '../types';
import { 
  AlertTriangle, Fuel, Wrench, ShieldAlert, DollarSign, ArrowUpRight, 
  CheckCircle2, Info, Clock, Search, FileText, X, ChevronDown, ChevronUp, 
  Sparkles, RefreshCw, Filter, Download, ExternalLink, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export interface CashFlowAnomaly {
  id: string;
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  category: 'Fuel' | 'Electric';
  assignedDriverName: string;
  anomalyType: 'Fuel Spike' | 'Maintenance Spike';
  currentMonthExpenseKes: number;
  expectedBaselineKes: number;
  spikeVarianceKes: number;
  variancePercentage: number;
  detectedDate: string;
  primaryCause: string;
  status: 'New Spike' | 'Investigating' | 'Audited & Cleared' | 'Flagged Fraud';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  city: string;
  invoiceOrReceiptRef: string;
  odometerKm: number;
  diagnosticNotes: string;
  recommendedAction: string;
}

interface CashFlowAnomaliesCardProps {
  vehicles?: Vehicle[];
  onInvestigateVehicle?: (vehicleReg: string) => void;
}

export const CashFlowAnomaliesCard: React.FC<CashFlowAnomaliesCardProps> = ({
  vehicles = [],
  onInvestigateVehicle
}) => {
  const [filterCategory, setFilterCategory] = useState<'All' | 'Fuel' | 'Maintenance'>('All');
  const [selectedAnomalyForModal, setSelectedAnomalyForModal] = useState<CashFlowAnomaly | null>(null);
  const [anomalyStatuses, setAnomalyStatuses] = useState<Record<string, CashFlowAnomaly['status']>>({});
  const [dismissedAnomalyIds, setDismissedAnomalyIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Generate or calculate anomalies based on vehicles array or comprehensive default dataset
  const allAnomalies: CashFlowAnomaly[] = useMemo(() => {
    // Standard baseline list of realistic fleet anomalies
    const defaultAnomalies: CashFlowAnomaly[] = [
      {
        id: 'anom-1',
        vehicleId: 'v2',
        registrationNumber: 'KDH 102B',
        makeModel: 'TVS HLX 150',
        category: 'Fuel',
        assignedDriverName: 'Benson Mutua',
        anomalyType: 'Fuel Spike',
        currentMonthExpenseKes: 48500,
        expectedBaselineKes: 18000,
        spikeVarianceKes: 30500,
        variancePercentage: 169.4,
        detectedDate: 'Aug 09, 2026',
        primaryCause: 'Off-route rapid refueling & fuel card usage mismatch (Possible Siphoning)',
        status: 'New Spike',
        severity: 'CRITICAL',
        city: 'Nairobi',
        invoiceOrReceiptRef: 'FL-NBR-88412',
        odometerKm: 42150,
        diagnosticNotes: 'Vehicle logged 3 refueling events totaling 120 Liters within 36 hours without corresponding mileage increase on telemetry.',
        recommendedAction: 'Freeze driver M-Pesa fuel wallet, request physical mileage verification, and cross-reference Shell station CCTV footage.'
      },
      {
        id: 'anom-2',
        vehicleId: 'v-fiel-1',
        registrationNumber: 'KCJ 554C',
        makeModel: 'Toyota Fielder Petrol',
        category: 'Fuel',
        assignedDriverName: 'David Ochieng',
        anomalyType: 'Maintenance Spike',
        currentMonthExpenseKes: 62000,
        expectedBaselineKes: 22000,
        spikeVarianceKes: 40000,
        variancePercentage: 181.8,
        detectedDate: 'Aug 06, 2026',
        primaryCause: 'Unscheduled gearbox clutch overhaul & radiator coolant leak repair',
        status: 'Investigating',
        severity: 'CRITICAL',
        city: 'Nairobi',
        invoiceOrReceiptRef: 'INV-WK-9932',
        odometerKm: 118400,
        diagnosticNotes: 'Emergency workshop dispatch following severe clutch slippage on Thika Superhighway. Parts replaced: Clutch plate, pressure plate, release bearing.',
        recommendedAction: 'Verify parts warranty with AutoCare Garage and review driver shift telematics for harsh gear grinding patterns.'
      },
      {
        id: 'anom-3',
        vehicleId: 'v-star-2',
        registrationNumber: 'KDA 882L',
        makeModel: 'TVS Star HLX',
        category: 'Fuel',
        assignedDriverName: 'Erick Kiprop',
        anomalyType: 'Fuel Spike',
        currentMonthExpenseKes: 38200,
        expectedBaselineKes: 16500,
        spikeVarianceKes: 21700,
        variancePercentage: 131.5,
        detectedDate: 'Aug 11, 2026',
        primaryCause: 'Fuel injector line leak & severe air-fuel mixture misfire',
        status: 'New Spike',
        severity: 'HIGH',
        city: 'Nakuru',
        invoiceOrReceiptRef: 'FL-NK-44109',
        odometerKm: 38900,
        diagnosticNotes: 'Telematics alert: Fuel efficiency dropped from 38 km/L to 18 km/L over the last 6 days. Black exhaust smoke reported.',
        recommendedAction: 'Ground vehicle for immediate fuel injector replacement and recalibration at Nakuru regional workshop.'
      },
      {
        id: 'anom-4',
        vehicleId: 'v1',
        registrationNumber: 'KMG 482E',
        makeModel: 'Roam Air EV',
        category: 'Electric',
        assignedDriverName: 'Kamau Otieno',
        anomalyType: 'Maintenance Spike',
        currentMonthExpenseKes: 28500,
        expectedBaselineKes: 12000,
        spikeVarianceKes: 16500,
        variancePercentage: 137.5,
        detectedDate: 'Aug 04, 2026',
        primaryCause: 'DC Fast Charge Controller contactor swap & brake pad replacement',
        status: 'Audited & Cleared',
        severity: 'MEDIUM',
        city: 'Nairobi',
        invoiceOrReceiptRef: 'INV-ROAM-1049',
        odometerKm: 29400,
        diagnosticNotes: 'Charge controller thermal cutout triggered during peak fast-charging. Part covered 50% under Roam manufacturer warranty.',
        recommendedAction: 'Reimburse KES 14,250 warranty credit from Roam Motors.'
      },
      {
        id: 'anom-5',
        vehicleId: 'v-spiro-2',
        registrationNumber: 'KMC 319P',
        makeModel: 'Spiro Commuto EV',
        category: 'Electric',
        assignedDriverName: 'Peter Mwangi',
        anomalyType: 'Maintenance Spike',
        currentMonthExpenseKes: 24000,
        expectedBaselineKes: 11000,
        spikeVarianceKes: 13000,
        variancePercentage: 118.2,
        detectedDate: 'Aug 02, 2026',
        primaryCause: 'Rear hub motor bearing replacement following pothole impact',
        status: 'New Spike',
        severity: 'MEDIUM',
        city: 'Mombasa',
        invoiceOrReceiptRef: 'INV-MSA-7811',
        odometerKm: 21800,
        diagnosticNotes: 'Rear wheel noise logged during Mombasa coastal humid run. Workshop replaced dual sealed bearings.',
        recommendedAction: 'File third-party road hazard insurance claim for wheel rim & bearing reimbursement.'
      }
    ];

    // If vehicles prop has custom vehicles, overlay real metrics
    if (vehicles && vehicles.length > 0) {
      const derivedAnomalies: CashFlowAnomaly[] = [];

      vehicles.forEach((v, idx) => {
        const fuel = v.totalFuelSpentKes || 0;
        const maint = v.totalMaintenanceSpentKes || 0;

        // Check if fuel is unusually high
        if (v.category === 'Fuel' && fuel > 25000) {
          const baseline = 18000;
          const variance = fuel - baseline;
          const varPct = (variance / baseline) * 100;
          derivedAnomalies.push({
            id: `v-anom-fuel-${v.id}`,
            vehicleId: v.id,
            registrationNumber: v.registrationNumber,
            makeModel: `${v.make} ${v.model}`,
            category: 'Fuel',
            assignedDriverName: v.assignedDriverName || 'Assigned Driver',
            anomalyType: 'Fuel Spike',
            currentMonthExpenseKes: fuel,
            expectedBaselineKes: baseline,
            spikeVarianceKes: variance,
            variancePercentage: Number(varPct.toFixed(1)),
            detectedDate: 'Aug 2026',
            primaryCause: 'Abnormal fuel consumption spike vs fleet category baseline',
            status: 'New Spike',
            severity: varPct > 150 ? 'CRITICAL' : 'HIGH',
            city: v.city || 'Nairobi',
            invoiceOrReceiptRef: `FL-REC-${1000 + idx}`,
            odometerKm: v.odometerKm || 35000,
            diagnosticNotes: `Monthly fuel spend of KES ${fuel.toLocaleString()} exceeds category benchmark by ${varPct.toFixed(1)}%.`,
            recommendedAction: 'Conduct telematics fuel burn audit and driver trip log reconciliation.'
          });
        }

        // Check if maintenance is unusually high
        if (maint > 20000) {
          const baseline = 14000;
          const variance = maint - baseline;
          const varPct = (variance / baseline) * 100;
          derivedAnomalies.push({
            id: `v-anom-maint-${v.id}`,
            vehicleId: v.id,
            registrationNumber: v.registrationNumber,
            makeModel: `${v.make} ${v.model}`,
            category: v.category,
            assignedDriverName: v.assignedDriverName || 'Assigned Driver',
            anomalyType: 'Maintenance Spike',
            currentMonthExpenseKes: maint,
            expectedBaselineKes: baseline,
            spikeVarianceKes: variance,
            variancePercentage: Number(varPct.toFixed(1)),
            detectedDate: 'Aug 2026',
            primaryCause: 'Unscheduled component repair & workshop labor cost spike',
            status: 'Investigating',
            severity: varPct > 150 ? 'CRITICAL' : 'HIGH',
            city: v.city || 'Nairobi',
            invoiceOrReceiptRef: `INV-WS-${2000 + idx}`,
            odometerKm: v.odometerKm || 35000,
            diagnosticNotes: `Maintenance expenditure of KES ${maint.toLocaleString()} exceeds scheduled preventive maintenance budget.`,
            recommendedAction: 'Review garage repair invoice and replaced spare parts serial numbers.'
          });
        }
      });

      if (derivedAnomalies.length >= 3) {
        return derivedAnomalies.map(a => ({
          ...a,
          status: anomalyStatuses[a.id] || a.status
        }));
      }
    }

    return defaultAnomalies.map(a => ({
      ...a,
      status: anomalyStatuses[a.id] || a.status
    }));
  }, [vehicles, anomalyStatuses]);

  // Filter out dismissed anomalies
  const activeAnomalies = useMemo(() => {
    return allAnomalies.filter(a => !dismissedAnomalyIds.has(a.id));
  }, [allAnomalies, dismissedAnomalyIds]);

  // Apply Category Filter (All, Fuel, Maintenance)
  const filteredAnomalies = useMemo(() => {
    if (filterCategory === 'Fuel') {
      return activeAnomalies.filter(a => a.anomalyType === 'Fuel Spike');
    }
    if (filterCategory === 'Maintenance') {
      return activeAnomalies.filter(a => a.anomalyType === 'Maintenance Spike');
    }
    return activeAnomalies;
  }, [activeAnomalies, filterCategory]);

  // TOP 3 BIGGEST ANOMALIES (Sorted by highest spike variance in KES)
  const top3Anomalies = useMemo(() => {
    return [...filteredAnomalies]
      .sort((a, b) => b.spikeVarianceKes - a.spikeVarianceKes)
      .slice(0, 3);
  }, [filteredAnomalies]);

  // Summary Metrics
  const totalSpikeImpactKes = useMemo(() => {
    return top3Anomalies.reduce((sum, a) => sum + a.spikeVarianceKes, 0);
  }, [top3Anomalies]);

  const avgSpikeVariancePct = useMemo(() => {
    if (top3Anomalies.length === 0) return 0;
    const sumPct = top3Anomalies.reduce((sum, a) => sum + a.variancePercentage, 0);
    return (sumPct / top3Anomalies.length).toFixed(1);
  }, [top3Anomalies]);

  // Handlers
  const handleUpdateStatus = (id: string, newStatus: CashFlowAnomaly['status']) => {
    setAnomalyStatuses(prev => ({
      ...prev,
      [id]: newStatus
    }));

    if (newStatus === 'Investigating') {
      toast.info(`Flagged anomaly ${id} for Fleet Audit investigation`, {
        description: 'Audit ticket created and assigned to Fleet Operations Manager.'
      });
    } else if (newStatus === 'Audited & Cleared') {
      toast.success(`Anomaly ${id} marked as Audited & Cleared`, {
        description: 'Expense variance verified against authorized workshop receipt.'
      });
    } else if (newStatus === 'Flagged Fraud') {
      toast.error(`Anomaly ${id} flagged as Fraud / Unauthorized Expense`, {
        description: 'Deduction hold placed on driver M-Pesa payout queue.'
      });
    }
  };

  const handleDismissAlert = (id: string, reg: string) => {
    setDismissedAnomalyIds(prev => new Set(prev).add(id));
    toast.success(`Dismissed anomaly alert for ${reg}`);
  };

  const handleExportAnomaliesCsv = () => {
    const headers = [
      'Anomaly ID',
      'Vehicle Reg',
      'Make & Model',
      'Category',
      'Assigned Driver',
      'Anomaly Type',
      'Current Month Spend (KES)',
      'Baseline (KES)',
      'Spike Variance (KES)',
      'Variance %',
      'Detected Date',
      'Primary Cause',
      'Status',
      'Severity',
      'City',
      'Receipt Ref'
    ];

    const rows = top3Anomalies.map(a => [
      `"${a.id}"`,
      `"${a.registrationNumber}"`,
      `"${a.makeModel}"`,
      `"${a.category}"`,
      `"${a.assignedDriverName}"`,
      `"${a.anomalyType}"`,
      a.currentMonthExpenseKes,
      a.expectedBaselineKes,
      a.spikeVarianceKes,
      `"${a.variancePercentage}%"`,
      `"${a.detectedDate}"`,
      `"${a.primaryCause.replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${a.severity}"`,
      `"${a.city}"`,
      `"${a.invoiceOrReceiptRef}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `top_3_cash_flow_anomalies_aug2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Top 3 Cash-Flow Anomalies Audit Report to CSV!');
  };

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
      
      {/* Decorative subtle background gradient blur */}
      <div className="absolute -top-10 -right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* CARD HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Top 3 Biggest Cash-Flow Anomalies
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                Current Month (August 2026)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated telematics detection of abnormal fuel & maintenance expense spikes exceeding fleet category benchmarks
            </p>
          </div>
        </div>

        {/* CONTROLS TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterCategory('All')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterCategory === 'All'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterCategory('Fuel')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                filterCategory === 'Fuel'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>Fuel Spikes</span>
            </button>
            <button
              onClick={() => setFilterCategory('Maintenance')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                filterCategory === 'Maintenance'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance Spikes</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportAnomaliesCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Download anomaly audit report CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs relative z-10">
        
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Top 3 Anomaly Expense Exposure</span>
            <div className="text-base font-black text-rose-400 mt-0.5">
              KES {totalSpikeImpactKes.toLocaleString()}
              <span className="text-[10px] text-rose-300/70 font-sans font-normal ml-1.5">(Spike Variance)</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Average Cost Spike Variance</span>
            <div className="text-base font-black text-amber-400 mt-0.5">
              +{avgSpikeVariancePct}%
              <span className="text-[10px] text-amber-300/70 font-sans font-normal ml-1.5">vs Category Baseline</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Active Fleet Audit Action</span>
            <div className="text-base font-black text-indigo-300 mt-0.5 flex items-center gap-1.5">
              <span>{top3Anomalies.filter(a => a.status === 'New Spike').length} New Unresolved</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300">{top3Anomalies.filter(a => a.status === 'Investigating').length} Auditing</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* TOP 3 ANOMALIES CARDS LIST */}
      <div className="space-y-3 relative z-10">
        {top3Anomalies.length === 0 ? (
          <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-800 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No Expense Anomalies Detected</h4>
            <p className="text-xs text-slate-400 mt-1">
              All fuel and maintenance expenses for the selected category are within standard historical benchmarks.
            </p>
          </div>
        ) : (
          top3Anomalies.map((anomaly, index) => {
            const isExpanded = expandedId === anomaly.id;

            return (
              <div 
                key={anomaly.id}
                className={`bg-slate-950/90 border transition-all duration-200 rounded-xl p-4 shadow-md ${
                  anomaly.severity === 'CRITICAL'
                    ? 'border-rose-500/40 hover:border-rose-500/60'
                    : 'border-amber-500/30 hover:border-amber-500/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* Left: Rank Badge + Vehicle Info */}
                  <div className="flex items-start gap-3 min-w-[260px]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-amber-400 text-sm shadow">
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-white tracking-wide">
                          {anomaly.registrationNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          ({anomaly.makeModel})
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          anomaly.category === 'Electric'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {anomaly.category}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Driver: <strong className="text-slate-200">{anomaly.assignedDriverName}</strong></span>
                        <span>•</span>
                        <span>City: <strong className="text-slate-300">{anomaly.city}</strong></span>
                        <span>•</span>
                        <span className="text-slate-500">{anomaly.detectedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Anomaly Type Badge & Diagnostic Cause */}
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        anomaly.anomalyType === 'Fuel Spike'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {anomaly.anomalyType === 'Fuel Spike' ? (
                          <Fuel className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Wrench className="w-3 h-3 text-amber-400" />
                        )}
                        {anomaly.anomalyType}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        anomaly.status === 'New Spike'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                          : anomaly.status === 'Investigating'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : anomaly.status === 'Flagged Fraud'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {anomaly.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium line-clamp-1">
                      {anomaly.primaryCause}
                    </p>
                  </div>

                  {/* Right: Variance Amount & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-slate-800/80 pt-2 lg:pt-0">
                    
                    {/* Variance Financial Highlight */}
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Current Spend</div>
                      <div className="text-sm font-black text-rose-400 font-mono">
                        KES {anomaly.currentMonthExpenseKes.toLocaleString()}
                        <span className="text-[10px] text-rose-300 ml-1 font-bold">
                          (+{anomaly.variancePercentage}%)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Baseline: KES {anomaly.expectedBaselineKes.toLocaleString()}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedAnomalyForModal(anomaly)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Investigate full telematics anomaly breakdown"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Investigate</span>
                      </button>

                      {onInvestigateVehicle && (
                        <button
                          onClick={() => onInvestigateVehicle(anomaly.registrationNumber)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                          title="View Vehicle Profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                        title={isExpanded ? "Collapse quick view" : "Expand quick view"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDismissAlert(anomaly.id, anomaly.registrationNumber)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Dismiss Anomaly Alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                </div>

                {/* EXPANDED DIAGNOSTIC DETAILS PANEL */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-900/80 p-3 rounded-lg">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Telematics & Diagnostic Notes
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {anomaly.diagnosticNotes}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Odometer: <strong className="text-slate-200">{anomaly.odometerKm.toLocaleString()} km</strong></span>
                        <span>Ref ID: <strong className="text-slate-200 font-mono">{anomaly.invoiceOrReceiptRef}</strong></span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                        Recommended Fleet Action
                      </span>
                      <p className="text-amber-200/90 leading-relaxed font-medium">
                        {anomaly.recommendedAction}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateStatus(anomaly.id, 'Investigating')}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer"
                        >
                          Mark Investigating
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(anomaly.id, 'Flagged Fraud')}
                          className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition cursor-pointer"
                        >
                          Flag Fraud Hold
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(anomaly.id, 'Audited & Cleared')}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer"
                        >
                          Approve & Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* INVESTIGATION DETAIL MODAL */}
      {selectedAnomalyForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Expense Anomaly Telematics Audit
                    <span className="text-xs font-mono font-normal text-slate-400">({selectedAnomalyForModal.invoiceOrReceiptRef})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Vehicle {selectedAnomalyForModal.registrationNumber} • Driver: {selectedAnomalyForModal.assignedDriverName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnomalyForModal(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Variance Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Historical Baseline</span>
                <div className="text-base font-bold text-slate-200 mt-0.5 font-mono">
                  KES {selectedAnomalyForModal.expectedBaselineKes.toLocaleString()}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Logged Expense</span>
                <div className="text-base font-bold text-rose-400 mt-0.5 font-mono">
                  KES {selectedAnomalyForModal.currentMonthExpenseKes.toLocaleString()}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Spike Variance</span>
                <div className="text-base font-bold text-amber-400 mt-0.5 font-mono">
                  +KES {selectedAnomalyForModal.spikeVarianceKes.toLocaleString()} (+{selectedAnomalyForModal.variancePercentage}%)
                </div>
              </div>
            </div>

            {/* Diagnostic Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-amber-400 font-extrabold block mb-1 uppercase tracking-wider text-[10px]">
                  Telematics Diagnostic Cause
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {selectedAnomalyForModal.primaryCause}
                </p>
                <p className="text-slate-400 mt-2 leading-relaxed">
                  {selectedAnomalyForModal.diagnosticNotes}
                </p>
              </div>

              <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
                <span className="text-amber-300 font-extrabold block mb-1 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Recommended Mitigation Workflow
                </span>
                <p className="text-amber-100/90 leading-relaxed">
                  {selectedAnomalyForModal.recommendedAction}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
              <button
                onClick={() => {
                  handleUpdateStatus(selectedAnomalyForModal.id, 'Flagged Fraud');
                  setSelectedAnomalyForModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Flag Fraud Hold
              </button>

              <button
                onClick={() => {
                  handleUpdateStatus(selectedAnomalyForModal.id, 'Investigating');
                  setSelectedAnomalyForModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Assign Fleet Audit Ticket
              </button>

              <button
                onClick={() => {
                  handleUpdateStatus(selectedAnomalyForModal.id, 'Audited & Cleared');
                  setSelectedAnomalyForModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Approve & Clear Expense
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
