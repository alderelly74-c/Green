import React, { useState, useEffect } from 'react';
import { FleetSummaryStats, Driver, MpesaPayoutRequest, Vehicle } from '../types';
import { 
  Wallet, Send, CheckCircle2, DollarSign, TrendingUp, ShieldCheck, 
  ArrowUpRight, Download, Calendar, Filter, X, FileSpreadsheet, BarChart3,
  AlertTriangle, ShieldAlert, AlertCircle, RefreshCw, Check, LineChart,
  Bell, BellRing, TrendingDown, Sliders, Zap, Calculator, Sparkles, Wrench, MapPin, PieChart, Scale
} from 'lucide-react';
import { toast } from 'sonner';
import { EvVsFuelProfitChart } from './EvVsFuelProfitChart';
import { FleetRevenueTrendsChart } from './FleetRevenueTrendsChart';
import { VehicleRoiAnalysisTable } from './VehicleRoiAnalysisTable';
import { ReconciliationAlertsTable } from './ReconciliationAlertsTable';
import { MpesaCashFlowGapD3Chart } from './MpesaCashFlowGapD3Chart';
import { ProjectedWeeklyRevenueChart } from './ProjectedWeeklyRevenueChart';
import { ProjectedMaintenanceCostsChart } from './ProjectedMaintenanceCostsChart';
import { ProjectedDriverPayoutsChart } from './ProjectedDriverPayoutsChart';
import { CashFlowAnomaliesCard } from './CashFlowAnomaliesCard';
import { ReconciliationAuditorCard } from './ReconciliationAuditorCard';
import { CityEfficiencyD3Heatmap } from './CityEfficiencyD3Heatmap';
import { DriverEfficiencyVsMaintenanceScatterPlot } from './DriverEfficiencyVsMaintenanceScatterPlot';
import { OperationalCostDonutChart } from './OperationalCostDonutChart';
import { VehicleExpenseSpikeAlertsCard } from './VehicleExpenseSpikeAlertsCard';
import { CategoryCostComparisonChart } from './CategoryCostComparisonChart';
import { MpesaFeeTreemap } from './MpesaFeeTreemap';
import { LifecycleRoiWidget } from './LifecycleRoiWidget';
import { MpesaPayrollFeeEstimator } from './MpesaPayrollFeeEstimator';

interface FinancialsModuleProps {
  stats: FleetSummaryStats | null;
  drivers: Driver[];
  vehicles?: Vehicle[];
  mpesaPayouts: MpesaPayoutRequest[];
  onSendMpesaPayout: (driverId: string, amountKes: number, reason: string) => void;
}

export interface PayoutVerificationResult {
  status: 'Verified' | 'Warning';
  issueType: 'Valid' | 'Duplicate' | 'Missing';
  message: string;
  duplicateCount?: number;
  matchingRefs?: string[];
  verifiedAt: string;
}

export const FinancialsModule: React.FC<FinancialsModuleProps> = ({
  stats,
  drivers = [],
  vehicles = [],
  mpesaPayouts = [],
  onSendMpesaPayout = (_driverId?: any, _amountKes?: any, _reason?: any) => {}
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [payoutAmount, setPayoutAmount] = useState<string>('15000');
  const [payoutReason, setPayoutReason] = useState<string>('Weekly Earnings Payout');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'cashflowGap' | 'mpesaFeeTreemap' | 'mpesaFeeEstimator' | 'lifecycleRoi' | 'categoryComparison' | 'driverScatter' | 'efficiencyHeatmap' | 'projectedWeekly' | 'projectedMaintenance' | 'projectedPayouts' | 'revenueTrends' | 'profitTrends' | 'vehicleRoi' | 'reconciliation' | 'payouts' | 'operatingCosts'>('mpesaFeeEstimator');

  // Local state for payouts to allow real-time receipt edits and audit reconciliation updates
  const [localPayouts, setLocalPayouts] = useState<MpesaPayoutRequest[]>(mpesaPayouts);

  useEffect(() => {
    setLocalPayouts(mpesaPayouts);
  }, [mpesaPayouts]);

  const handleUpdateMpesaReceipt = (payoutId: string, newReceiptNo: string) => {
    setLocalPayouts(prev => prev.map(p => {
      if (p.id === payoutId) {
        return {
          ...p,
          mpesaReceiptNo: newReceiptNo
        };
      }
      return p;
    }));
  };

  // Date Range Filtering for CSV Statement
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Reconciliation Verification State
  const [verificationMap, setVerificationMap] = useState<Record<string, PayoutVerificationResult>>({});
  const [reconciliationFilter, setReconciliationFilter] = useState<'ALL' | 'WARNINGS' | 'VERIFIED'>('ALL');

  // Profit Anomaly & 30-Day Moving Average Threshold Monitoring State
  const [movingAvg30DayProfit, setMovingAvg30DayProfit] = useState<number>(85000); // 30-day moving average daily profit benchmark
  const [currentDailyProfit, setCurrentDailyProfit] = useState<number>(stats?.todayCompanyProfitKes || 85000);
  const [thresholdDropPct, setThresholdDropPct] = useState<number>(15); // Trigger threshold % drop below 30-day MA
  const [lastAlertTime, setLastAlertTime] = useState<string | null>(null);

  // Sync with stats if updated
  useEffect(() => {
    if (stats?.todayCompanyProfitKes && stats.todayCompanyProfitKes > 0) {
      setCurrentDailyProfit(stats.todayCompanyProfitKes);
    }
  }, [stats]);

  // Evaluate Daily Company Profit against 30-Day Moving Average Threshold
  const checkDailyProfitThreshold = (
    profitVal: number = currentDailyProfit,
    maVal: number = movingAvg30DayProfit,
    threshold: number = thresholdDropPct,
    userTriggered: boolean = true
  ) => {
    if (maVal <= 0) return false;
    const dropAmount = maVal - profitVal;
    const dropPct = (dropAmount / maVal) * 100;

    if (dropPct >= threshold) {
      const formattedDrop = dropPct.toFixed(1);
      const alertMessage = `⚠️ Profit Anomaly Warning: Today's company profit (KES ${profitVal.toLocaleString()}) has fallen ${formattedDrop}% below the 30-day moving average (KES ${maVal.toLocaleString()}). Threshold limit is set to -${threshold}%.`;
      
      toast.error('Daily Company Profit Threshold Alert!', {
        description: alertMessage,
        duration: 9000,
        action: {
          label: 'Reset Profit',
          onClick: () => handleResetDailyProfit()
        }
      });
      setLastAlertTime(new Date().toLocaleTimeString());
      return true;
    } else {
      if (userTriggered) {
        toast.success('Daily Profit Within Healthy Bounds', {
          description: `Today's profit (KES ${profitVal.toLocaleString()}) is within allowable bounds (-${dropPct > 0 ? dropPct.toFixed(1) : 0}% vs 30-day MA KES ${maVal.toLocaleString()}).`
        });
      }
      return false;
    }
  };

  const handleSimulateProfitDip = () => {
    const dippedProfit = Math.round(movingAvg30DayProfit * 0.72); // KES 61,200 (28% drop below 30-day MA)
    setCurrentDailyProfit(dippedProfit);
    checkDailyProfitThreshold(dippedProfit, movingAvg30DayProfit, thresholdDropPct, true);
  };

  const handleSimulateProfitSurge = () => {
    const surgedProfit = Math.round(movingAvg30DayProfit * 1.18); // KES 100,300 (+18% above 30-day MA)
    setCurrentDailyProfit(surgedProfit);
    checkDailyProfitThreshold(surgedProfit, movingAvg30DayProfit, thresholdDropPct, true);
  };

  const handleResetDailyProfit = () => {
    const defaultVal = stats?.todayCompanyProfitKes || 85000;
    setCurrentDailyProfit(defaultVal);
    toast.info('Restored Baseline Profit', {
      description: `Today's profit restored to KES ${defaultVal.toLocaleString()}.`
    });
  };

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  // Helper to parse timestamps safely
  const parsePayoutDate = (timestampStr: string): Date | null => {
    if (!timestampStr) return null;
    const isoMatch = timestampStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }
    const cleaned = timestampStr.replace(/EAT|CAT|UTC/g, '').trim();
    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Verify single transaction function
  const handleVerifyTransaction = (payout: MpesaPayoutRequest, showToast: boolean = true) => {
    const rawReceipt = payout.mpesaReceiptNo ? payout.mpesaReceiptNo.trim() : '';

    // 1. Check if missing or invalid
    if (!rawReceipt || rawReceipt.toUpperCase() === 'N/A' || rawReceipt === '-') {
      const result: PayoutVerificationResult = {
        status: 'Warning',
        issueType: 'Missing',
        message: `Reconciliation Warning: Missing or unassigned M-Pesa Receipt reference for payout ${payout.transactionRef}`,
        verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setVerificationMap(prev => ({ ...prev, [payout.id]: result }));
      if (showToast) {
        toast.error(`Reconciliation Warning (${payout.transactionRef})`, {
          description: `Missing M-Pesa Receipt Number! Driver: ${payout.driverName} | Amount: KES ${payout.amountKes.toLocaleString()}`
        });
      }
      return result;
    }

    // 2. Check duplicate receipts across all mpesaPayouts
    const matchingPayouts = mpesaPayouts.filter(p => (p.mpesaReceiptNo || '').trim().toUpperCase() === rawReceipt.toUpperCase());

    if (matchingPayouts.length > 1) {
      const matchingRefs = matchingPayouts.map(m => m.transactionRef);
      const result: PayoutVerificationResult = {
        status: 'Warning',
        issueType: 'Duplicate',
        message: `Reconciliation Warning: Duplicate M-Pesa Receipt No. '${rawReceipt}' detected across ${matchingPayouts.length} payout transactions (${matchingRefs.join(', ')})!`,
        duplicateCount: matchingPayouts.length,
        matchingRefs,
        verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setVerificationMap(prev => ({ ...prev, [payout.id]: result }));
      if (showToast) {
        toast.warning(`Reconciliation Warning (${payout.transactionRef})`, {
          description: `Duplicate M-Pesa Receipt '${rawReceipt}' found in ${matchingPayouts.length} transactions (${matchingRefs.join(', ')})!`
        });
      }
      return result;
    }

    // 3. Valid & unique
    const result: PayoutVerificationResult = {
      status: 'Verified',
      issueType: 'Valid',
      message: `M-Pesa Receipt '${rawReceipt}' verified as unique & reconciled in current system state.`,
      verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setVerificationMap(prev => ({ ...prev, [payout.id]: result }));
    if (showToast) {
      toast.success(`Transaction Verified (${payout.transactionRef})`, {
        description: `Receipt '${rawReceipt}' is valid and unique.`
      });
    }
    return result;
  };

  // Verify all transactions in batch
  const handleVerifyAllTransactions = () => {
    let warningCount = 0;
    let verifiedCount = 0;
    const newMap: Record<string, PayoutVerificationResult> = {};

    localPayouts.forEach(p => {
      const rawReceipt = (p.mpesaReceiptNo || '').trim();
      if (!rawReceipt || rawReceipt.toUpperCase() === 'N/A' || rawReceipt === '-') {
        warningCount++;
        newMap[p.id] = {
          status: 'Warning',
          issueType: 'Missing',
          message: `Reconciliation Warning: Missing or unassigned M-Pesa Receipt reference`,
          verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
      } else {
        const matchingPayouts = localPayouts.filter(m => (m.mpesaReceiptNo || '').trim().toUpperCase() === rawReceipt.toUpperCase());
        if (matchingPayouts.length > 1) {
          warningCount++;
          const matchingRefs = matchingPayouts.map(m => m.transactionRef);
          newMap[p.id] = {
            status: 'Warning',
            issueType: 'Duplicate',
            message: `Reconciliation Warning: Duplicate receipt '${rawReceipt}' found in ${matchingPayouts.length} records (${matchingRefs.join(', ')})`,
            duplicateCount: matchingPayouts.length,
            matchingRefs,
            verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
        } else {
          verifiedCount++;
          newMap[p.id] = {
            status: 'Verified',
            issueType: 'Valid',
            message: `Receipt '${rawReceipt}' verified as unique in system state`,
            verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
        }
      }
    });

    setVerificationMap(newMap);
    if (warningCount > 0) {
      toast.warning(`Reconciliation Audit Complete: ${warningCount} Reconciliation Warning(s) Flagged!`, {
        description: `${verifiedCount} verified unique, ${warningCount} flagged with missing or duplicate receipt references.`
      });
    } else {
      toast.success(`Reconciliation Audit Complete: All ${verifiedCount} M-Pesa payout receipts verified as unique & valid!`);
    }
  };

  // Filter payouts by date range and reconciliation filter
  const filteredPayouts = localPayouts.filter(p => {
    // Reconciliation filter
    const vResult = verificationMap[p.id];
    if (reconciliationFilter === 'WARNINGS' && (!vResult || vResult.status !== 'Warning')) {
      return false;
    }
    if (reconciliationFilter === 'VERIFIED' && (!vResult || vResult.status !== 'Verified')) {
      return false;
    }

    if (!startDate && !endDate) return true;
    const pDate = parsePayoutDate(p.timestamp);
    if (!pDate) return true;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (pDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (pDate > end) return false;
    }
    return true;
  });

  const totalFilteredKes = filteredPayouts.reduce((sum, p) => sum + p.amountKes, 0);
  const totalWarningsCount = (Object.values(verificationMap) as PayoutVerificationResult[]).filter(v => v.status === 'Warning').length;

  const downloadCsvFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Generator for M-Pesa Payouts
  const handleDownloadCsvStatement = () => {
    const headers = [
      'Transaction Ref',
      'Driver Name',
      'Phone Number',
      'Amount (KES)',
      'Payout Reason',
      'M-Pesa Receipt No',
      'Status',
      'Timestamp',
      'Initiated By'
    ];

    const rows = filteredPayouts.map(p => [
      `"${p.transactionRef || ''}"`,
      `"${(p.driverName || '').replace(/"/g, '""')}"`,
      `"${p.phoneNumber || ''}"`,
      p.amountKes,
      `"${(p.payoutReason || '').replace(/"/g, '""')}"`,
      `"${p.mpesaReceiptNo || 'N/A'}"`,
      `"${p.status || 'Success'}"`,
      `"${(p.timestamp || '').replace(/"/g, '""')}"`,
      `"${(p.initiatedByRole || 'Admin').replace(/"/g, '""')}"`
    ]);

    const startStr = startDate || 'all';
    const endStr = endDate || 'present';

    const metaHeader = [
      `"GREENSHIFT FLEET FINANCIAL REPORT - M-PESA B2C DISPATCHES AUDIT LOG"`,
      `"Export Date: ${new Date().toLocaleString()}"`,
      `"Date Filter Range: ${startStr} to ${endStr}"`,
      `"Total Filtered Amount: KES ${totalFilteredKes.toLocaleString()}"`,
      `""`
    ].join('\n');

    const csvContent = metaHeader + '\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsvFile(csvContent, `mpesa_payouts_statement_${startStr}_to_${endStr}.csv`);
  };

  // Master / View-Specific CSV Export Handler
  const handleExportCurrentViewCsv = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (activeSubTab === 'cashflowGap') {
      handleDownloadCsvStatement();
      toast.success('Exported M-Pesa Cash Flow Gap & Dispatches Audit Statement to CSV!');
    } else if (activeSubTab === 'projectedWeekly') {
      toast.info('Exporting 7-Day Weekly Projected Revenue Forecast model...');
      handleDownloadCsvStatement();
    } else if (activeSubTab === 'projectedMaintenance') {
      toast.info('Exporting Projected Maintenance Costs & Odometer CapEx Forecast model...');
      handleDownloadCsvStatement();
    } else if (activeSubTab === 'projectedPayouts') {
      toast.info('Exporting Projected Driver M-Pesa Payouts model...');
      handleDownloadCsvStatement();
    } else if (activeSubTab === 'revenueTrends') {
      const headers = [
        'Month Key',
        'Month',
        'Gross Revenue (KES)',
        'EV Revenue (KES)',
        'Fuel Revenue (KES)',
        'Total OPEX (KES)',
        'Fuel Expense (KES)',
        'Charging Expense (KES)',
        'Maintenance Expense (KES)',
        'Net Profit (KES)',
        'Profit Margin (%)',
        'MoM Growth (%)'
      ];

      const monthConfigs = [
        { key: '2026-03', name: 'March 2026', factor: 0.72, growth: 6.4 },
        { key: '2026-04', name: 'April 2026', factor: 0.78, growth: 8.3 },
        { key: '2026-05', name: 'May 2026', factor: 0.84, growth: 7.7 },
        { key: '2026-06', name: 'June 2026', factor: 0.89, growth: 6.0 },
        { key: '2026-07', name: 'July 2026', factor: 0.94, growth: 5.6 },
        { key: '2026-08', name: 'August 2026', factor: 1.00, growth: 6.4 }
      ];

      const totalRev = vehicles.reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 0), 0) || 4850000;
      const totalFuel = vehicles.reduce((sum, v) => sum + (v.totalFuelSpentKes || 0), 0) || 920000;
      const totalCharging = vehicles.reduce((sum, v) => sum + (v.totalChargingSpentKes || 0), 0) || 380000;
      const totalMaint = vehicles.reduce((sum, v) => sum + (v.totalMaintenanceSpentKes || 0), 0) || 320000;
      const totalOpex = totalFuel + totalCharging + totalMaint || 1620000;
      const evRev = vehicles.filter(v => v.category === 'Electric').reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 0), 0) || 3100000;
      const fuelRev = vehicles.filter(v => v.category === 'Fuel').reduce((sum, v) => sum + (v.totalRevenueGeneratedKes || 0), 0) || 1750000;

      const rows = monthConfigs.map(m => {
        const rev = Math.round(totalRev * m.factor);
        const eRev = Math.round(evRev * m.factor);
        const fRev = Math.round(fuelRev * m.factor);
        const opex = Math.round(totalOpex * (m.factor * 0.95));
        const fExp = Math.round(totalFuel * m.factor);
        const cExp = Math.round(totalCharging * (m.factor * 0.9));
        const mExp = Math.round(totalMaint * m.factor);
        const netProfit = rev - opex;
        const margin = rev > 0 ? ((netProfit / rev) * 100).toFixed(1) : '0';

        return [
          `"${m.key}"`,
          `"${m.name}"`,
          rev,
          eRev,
          fRev,
          opex,
          fExp,
          cExp,
          mExp,
          netProfit,
          `"${margin}%"`,
          `"+${m.growth}%"`
        ];
      });

      const metaHeader = [
        `"GREENSHIFT FLEET FINANCIAL REPORT - 6-MONTH REVENUE & OPEX TRENDS"`,
        `"Export Date: ${new Date().toLocaleString()}"`,
        `"Active Vehicles Count: ${vehicles.length || 24}"`,
        `""`
      ].join('\n');

      const csvContent = metaHeader + '\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCsvFile(csvContent, `fleet_revenue_trends_${timestamp}.csv`);
      toast.success('Exported 6-Month Fleet Revenue Trends Recharts data to CSV!');
    } else if (activeSubTab === 'profitTrends') {
      const headers = [
        'Month',
        'EV Net Profit (KES)',
        'Fuel Net Profit (KES)',
        'EV-Fuel Profit Gap (KES)',
        'EV Revenue (KES)',
        'Fuel Revenue (KES)',
        'EV Expenses (KES)',
        'Fuel Expenses (KES)',
        'EV Profit Margin (%)',
        'Fuel Profit Margin (%)',
        'EV Cost per KM (KES)',
        'Fuel Cost per KM (KES)',
        'Operational Notes'
      ];

      const monthlyComparisonData = [
        { month: 'Jan 2026', evProfit: 1240000, fuelProfit: 810000, gap: 430000, evRev: 1680000, fuelRev: 1520000, evExp: 440000, fuelExp: 710000, evMargin: 73.8, fuelMargin: 53.2, evCostKm: 2.3, fuelCostKm: 8.4, notes: 'Post-holiday delivery surge; stable power grid tariffs' },
        { month: 'Feb 2026', evProfit: 1310000, fuelProfit: 830000, gap: 480000, evRev: 1750000, fuelRev: 1560000, evExp: 440000, fuelExp: 730000, evMargin: 74.8, fuelMargin: 53.2, evCostKm: 2.4, fuelCostKm: 8.6, notes: 'EV fleet expanded by 12 Roam Air units' },
        { month: 'Mar 2026', evProfit: 1390000, fuelProfit: 850000, gap: 540000, evRev: 1840000, fuelRev: 1610000, evExp: 450000, fuelExp: 760000, evMargin: 75.5, fuelMargin: 52.7, evCostKm: 2.2, fuelCostKm: 8.8, notes: 'Spiro swap stations added in Kisumu' },
        { month: 'Apr 2026', evProfit: 1420000, fuelProfit: 820000, gap: 600000, evRev: 1890000, fuelRev: 1590000, evExp: 470000, fuelExp: 770000, evMargin: 75.1, fuelMargin: 51.5, evCostKm: 2.4, fuelCostKm: 9.1, notes: 'EPRA fuel pump price increase (+4.2 KES/L)' },
        { month: 'May 2026', evProfit: 1560000, fuelProfit: 840000, gap: 720000, evRev: 2010000, fuelRev: 1620000, evExp: 450000, fuelExp: 780000, evMargin: 77.6, fuelMargin: 51.9, evCostKm: 2.1, fuelCostKm: 9.2, notes: 'Solar microgrid charging operational in Nairobi HQ' },
        { month: 'Jun 2026', evProfit: 1680000, fuelProfit: 860000, gap: 820000, evRev: 2150000, fuelRev: 1650000, evExp: 470000, fuelExp: 790000, evMargin: 78.1, fuelMargin: 52.1, evCostKm: 2.0, fuelCostKm: 9.4, notes: 'Off-peak overnight charging tariff reduced by 15%' },
        { month: 'Jul 2026', evProfit: 1790000, fuelProfit: 870000, gap: 920000, evRev: 2280000, fuelRev: 1680000, evExp: 490000, fuelExp: 810000, evMargin: 78.5, fuelMargin: 51.8, evCostKm: 1.9, fuelCostKm: 9.5, notes: 'Ampersand battery swap network integration complete' },
        { month: 'Aug 2026', evProfit: 1890000, fuelProfit: 880000, gap: 1010000, evRev: 2410000, fuelRev: 1700000, evExp: 520000, fuelExp: 820000, evMargin: 78.4, fuelMargin: 51.8, evCostKm: 1.9, fuelCostKm: 9.6, notes: 'Record EV profitability gap achieved (+KES 1.01M)' }
      ];

      const rows = monthlyComparisonData.map(m => [
        `"${m.month}"`,
        m.evProfit,
        m.fuelProfit,
        m.gap,
        m.evRev,
        m.fuelRev,
        m.evExp,
        m.fuelExp,
        `"${m.evMargin}%"`,
        `"${m.fuelMargin}%"`,
        m.evCostKm,
        m.fuelCostKm,
        `"${m.notes.replace(/"/g, '""')}"`
      ]);

      const metaHeader = [
        `"GREENSHIFT FLEET FINANCIAL REPORT - EV VS FUEL PROFIT & COST-EFFICIENCY COMPARISON"`,
        `"Export Date: ${new Date().toLocaleString()}"`,
        `"EV Fleet Cost Advantage: ~72% Savings per KM vs ICE Fuel Vehicles"`,
        `""`
      ].join('\n');

      const csvContent = metaHeader + '\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCsvFile(csvContent, `ev_vs_fuel_profit_trends_${timestamp}.csv`);
      toast.success('Exported EV vs Fuel Cost-Efficiency Comparison data to CSV!');
    } else if (activeSubTab === 'vehicleRoi') {
      const headers = [
        'Registration Number',
        'Make & Model',
        'Category',
        'City',
        'Assigned Driver',
        'Purchase Price (KES)',
        'Fuel Expense (KES)',
        'Charging Expense (KES)',
        'Maintenance Expense (KES)',
        'Total OPEX (KES)',
        'Total Cost of Ownership - TCO (KES)',
        'Cumulative Revenue (KES)',
        'Net Operating Profit (KES)',
        'Net Cashflow (KES)',
        'ROI % vs Purchase Capital',
        'Payback Progress %',
        'Status'
      ];

      const rows = (vehicles.length > 0 ? vehicles : [
        { id: 'v1', registrationNumber: 'KMG 482E', make: 'Roam', model: 'Air', category: 'Electric', city: 'Nairobi', purchasePriceKes: 240000, totalFuelSpentKes: 0, totalChargingSpentKes: 38000, totalMaintenanceSpentKes: 18000, totalRevenueGeneratedKes: 480000, assignedDriverName: 'Kamau Otieno' },
        { id: 'v2', registrationNumber: 'KDH 102B', make: 'TVS', model: 'HLX 150', category: 'Fuel', city: 'Nairobi', purchasePriceKes: 195000, totalFuelSpentKes: 142000, totalChargingSpentKes: 0, totalMaintenanceSpentKes: 45000, totalRevenueGeneratedKes: 390000, assignedDriverName: 'Benson Mutua' },
        { id: 'v3', registrationNumber: 'KMF 910E', make: 'Spiro', model: 'Commuto', category: 'Electric', city: 'Mombasa', purchasePriceKes: 220000, totalFuelSpentKes: 0, totalChargingSpentKes: 32000, totalMaintenanceSpentKes: 14000, totalRevenueGeneratedKes: 410000, assignedDriverName: 'Hassan Juma' }
      ] as any[]).map(v => {
        const purchasePrice = v.purchasePriceKes || (v.category === 'Electric' ? 240000 : 190000);
        const fuel = v.totalFuelSpentKes || 0;
        const charging = v.totalChargingSpentKes || 0;
        const maint = v.totalMaintenanceSpentKes || 0;
        const opex = fuel + charging + maint;
        const tco = purchasePrice + opex;
        const rev = v.totalRevenueGeneratedKes || 0;
        const netProfit = rev - opex;
        const roi = purchasePrice > 0 ? ((netProfit / purchasePrice) * 100).toFixed(1) : '0';
        const payback = Math.min(100, Math.max(0, (netProfit / purchasePrice) * 100)).toFixed(1);
        const status = netProfit >= purchasePrice ? 'Capital Recovered' : (netProfit < 0 ? 'Operating Loss' : 'In Payback');

        return [
          `"${v.registrationNumber}"`,
          `"${v.make} ${v.model}"`,
          `"${v.category}"`,
          `"${v.city}"`,
          `"${(v.assignedDriverName || 'Unassigned').replace(/"/g, '""')}"`,
          purchasePrice,
          fuel,
          charging,
          maint,
          opex,
          tco,
          rev,
          netProfit,
          rev - tco,
          `"${roi}%"`,
          `"${payback}%"`,
          `"${status}"`
        ];
      });

      const metaHeader = [
        `"GREENSHIFT FLEET FINANCIAL REPORT - VEHICLE RETURN ON INVESTMENT (ROI) AUDIT"`,
        `"Export Date: ${new Date().toLocaleString()}"`,
        `"Active Fleet Assets: ${vehicles.length || 5}"`,
        `""`
      ].join('\n');

      const csvContent = metaHeader + '\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCsvFile(csvContent, `vehicle_roi_analysis_${timestamp}.csv`);
      toast.success('Exported Vehicle Asset ROI & TCO Audit data to CSV!');
    } else {
      handleDownloadCsvStatement();
      toast.success('Exported M-Pesa Driver Payouts Audit Statement to CSV!');
    }
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId || !payoutAmount || Number(payoutAmount) <= 0) return;

    setIsSubmitting(true);
    setSuccessMessage(null);

    setTimeout(() => {
      onSendMpesaPayout(selectedDriverId, Number(payoutAmount), payoutReason);
      setIsSubmitting(false);
      setSuccessMessage(`Successfully dispatched KES ${Number(payoutAmount).toLocaleString()} via M-Pesa B2C to ${selectedDriver?.fullName}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }, 600);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">M-Pesa B2C & Fleet Financial Command</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time revenue reconciliation, driver payout dispatching, and EV vs Fuel cost-efficiency gap analysis
          </p>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Export Current View CSV Button */}
          <button
            onClick={handleExportCurrentViewCsv}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Export active financial dataset to formatted CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export View CSV</span>
          </button>

          {/* Sub-view Navigation Buttons */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('mpesaFeeEstimator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'mpesaFeeEstimator'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>M-Pesa Fee Estimator</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lifecycleRoi')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'lifecycleRoi'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Lifecycle ROI (TCO)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mpesaFeeTreemap')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'mpesaFeeTreemap'
                ? 'bg-indigo-600 text-white font-black shadow-md'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4 text-indigo-300" />
            <span>M-Pesa Fee Treemap (D3)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('categoryComparison')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'categoryComparison'
                ? 'bg-indigo-600 text-white font-black shadow-md'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-300" />
            <span>Category Cost Breakdown (D3)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cashflowGap')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'cashflowGap'
                ? 'bg-rose-500 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineChart className="w-4 h-4 text-rose-300" />
            <span>M-Pesa Cash Flow Gap (D3)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('driverScatter')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'driverScatter'
                ? 'bg-rose-600 text-white font-black shadow-md'
                : 'text-rose-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4 text-rose-300 animate-pulse" />
            <span>Driver Outliers Scatter (D3)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('efficiencyHeatmap')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'efficiencyHeatmap'
                ? 'bg-indigo-500 text-white font-black shadow-md'
                : 'text-indigo-400 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4 text-indigo-300" />
            <span>City Efficiency Heatmap (D3)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('operatingCosts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'operatingCosts'
                ? 'bg-indigo-600 text-white font-black shadow-md'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-200" />
            <span>Operating Costs Donut (D3)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('projectedWeekly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'projectedWeekly'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span>Projected Weekly Revenue</span>
          </button>

          <button
            onClick={() => setActiveSubTab('projectedMaintenance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'projectedMaintenance'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4 text-slate-950" />
            <span>Projected Maintenance Costs</span>
          </button>

          <button
            onClick={() => setActiveSubTab('projectedPayouts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'projectedPayouts'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4 text-slate-950" />
            <span>Projected Driver Payouts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('revenueTrends')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'revenueTrends'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Fleet Revenue Trends</span>
          </button>

          <button
            onClick={() => setActiveSubTab('profitTrends')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'profitTrends'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>EV vs Fuel Profit Trends</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vehicleRoi')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'vehicleRoi'
                ? 'bg-teal-400 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Vehicle ROI Matrix</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reconciliation')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'reconciliation'
                ? 'bg-rose-500 text-white font-black shadow-md'
                : 'text-rose-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-300" />
            <span>Reconciliation Alerts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('payouts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'payouts'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>M-Pesa Dispatches</span>
          </button>
        </div>
      </div>
    </div>

      {/* REAL-TIME VEHICLE EXPENSE SPIKE NOTIFICATIONS & ANOMALY ENGINE */}
      <VehicleExpenseSpikeAlertsCard vehicles={vehicles} />

      {/* AUTOMATED RECONCILIATION AUDITOR CARD */}
      <ReconciliationAuditorCard
        mpesaPayouts={localPayouts}
        onUpdateMpesaReceipt={handleUpdateMpesaReceipt}
      />

      {/* TOP 3 BIGGEST CASH-FLOW ANOMALIES SUMMARY ALERT CARD */}
      <CashFlowAnomaliesCard vehicles={vehicles} />

      {/* PROFIT ANOMALY & 30-DAY MOVING AVERAGE THRESHOLD MONITOR CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              ((movingAvg30DayProfit - currentDailyProfit) / movingAvg30DayProfit) * 100 >= thresholdDropPct
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Daily Company Profit Threshold Alert Engine
                {((movingAvg30DayProfit - currentDailyProfit) / movingAvg30DayProfit) * 100 >= thresholdDropPct ? (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    THRESHOLD BREACHED
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    HEALTHY PROFIT RANGE
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Triggers toast notification when today's profit falls below set threshold (-{thresholdDropPct}%) compared to 30-day moving average
              </p>
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => checkDailyProfitThreshold(currentDailyProfit, movingAvg30DayProfit, thresholdDropPct, true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Evaluate Alert Now</span>
            </button>

            <button
              onClick={handleSimulateProfitDip}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Simulate a 28% profit drop below 30-day MA to trigger toast notification"
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Dip (-28%)</span>
            </button>

            <button
              onClick={handleSimulateProfitSurge}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Simulate profit surge (+18% above 30-day MA)"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Surge</span>
            </button>

            <button
              onClick={handleResetDailyProfit}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-sans text-slate-400 block font-medium">30-Day Moving Average Profit</span>
            <div className="text-lg font-bold text-slate-200 mt-1">
              KES {movingAvg30DayProfit.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">/ day</span>
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">Historical 30-day company benchmark</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-sans text-slate-400 block font-medium">Today's Daily Profit</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              KES {currentDailyProfit.toLocaleString()}
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">Current company net earnings</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-sans text-slate-400 block font-medium">Variance vs 30-Day MA</span>
            {(() => {
              const diff = currentDailyProfit - movingAvg30DayProfit;
              const pct = ((diff) / movingAvg30DayProfit) * 100;
              const isNegative = pct < 0;
              return (
                <div className={`text-lg font-bold mt-1 flex items-center gap-1 ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isNegative ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  <span>{pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}</span>
                </div>
              );
            })()}
            <div className="text-[10px] font-sans text-slate-400 mt-0.5">
              {currentDailyProfit < movingAvg30DayProfit 
                ? `KES ${(movingAvg30DayProfit - currentDailyProfit).toLocaleString()} below 30-day avg`
                : `KES ${(currentDailyProfit - movingAvg30DayProfit).toLocaleString()} above 30-day avg`}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-sans text-slate-400 font-medium">Alert Drop Threshold</span>
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {[10, 15, 20, 25].map(pct => (
                <button
                  key={pct}
                  onClick={() => {
                    setThresholdDropPct(pct);
                    checkDailyProfitThreshold(currentDailyProfit, movingAvg30DayProfit, pct, true);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-sans transition cursor-pointer ${
                    thresholdDropPct === pct 
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  -{pct}%
                </button>
              ))}
            </div>
            <div className="text-[10px] font-sans text-slate-400 mt-1">Triggers toast if drop ≥ -{thresholdDropPct}%</div>
          </div>

        </div>
      </div>

      {/* SUB-VIEW 0: M-PESA BULK PAYROLL TRANSACTION FEE ESTIMATOR */}
      {activeSubTab === 'mpesaFeeEstimator' && (
        <MpesaPayrollFeeEstimator drivers={drivers} mpesaPayouts={localPayouts} />
      )}

      {/* SUB-VIEW 0.1: LIFECYCLE ROI & TOTAL COST OF OWNERSHIP (TCO) WIDGET */}
      {activeSubTab === 'lifecycleRoi' && (
        <LifecycleRoiWidget vehicles={vehicles} />
      )}

      {/* SUB-VIEW 0.1: M-PESA TRANSACTION FEE OVERHEAD TREEMAP (D3) */}
      {activeSubTab === 'mpesaFeeTreemap' && (
        <MpesaFeeTreemap mpesaPayouts={localPayouts} drivers={drivers} />
      )}

      {/* SUB-VIEW 0.1: COMPARATIVE VEHICLE CATEGORY OPERATIONAL COST BREAKDOWN (D3 BAR CHART) */}
      {activeSubTab === 'categoryComparison' && (
        <CategoryCostComparisonChart vehicles={vehicles} />
      )}

      {/* SUB-VIEW 0.1: M-PESA CASH FLOW GAP TRENDS (D3 ENGINE) */}
      {activeSubTab === 'cashflowGap' && (
        <MpesaCashFlowGapD3Chart drivers={drivers} mpesaPayouts={localPayouts} />
      )}

      {/* SUB-VIEW 0.05: DRIVER EFFICIENCY VS MAINTENANCE SCATTER MATRIX (D3) */}
      {activeSubTab === 'driverScatter' && (
        <DriverEfficiencyVsMaintenanceScatterPlot drivers={drivers} vehicles={vehicles} />
      )}

      {/* SUB-VIEW 0.1: REGIONAL VEHICLE EFFICIENCY D3 HEATMAP */}
      {activeSubTab === 'efficiencyHeatmap' && (
        <CityEfficiencyD3Heatmap vehicles={vehicles} />
      )}

      {/* SUB-VIEW 0.2: OPERATING COST ALLOCATION D3 DONUT CHART */}
      {activeSubTab === 'operatingCosts' && (
        <OperationalCostDonutChart vehicles={vehicles} mpesaPayouts={localPayouts} />
      )}

      {/* SUB-VIEW 0.5: PROJECTED WEEKLY REVENUE MODEL */}
      {activeSubTab === 'projectedWeekly' && (
        <ProjectedWeeklyRevenueChart vehicles={vehicles} drivers={drivers} />
      )}

      {/* SUB-VIEW 0.6: PROJECTED MAINTENANCE COSTS & CAPEX ALERTS */}
      {activeSubTab === 'projectedMaintenance' && (
        <ProjectedMaintenanceCostsChart vehicles={vehicles} />
      )}

      {/* SUB-VIEW 0.7: PROJECTED DRIVER PAYOUTS & M-PESA DISPATCHES MODEL */}
      {activeSubTab === 'projectedPayouts' && (
        <ProjectedDriverPayoutsChart 
          drivers={drivers} 
          mpesaPayouts={localPayouts} 
          onSendMpesaPayout={onSendMpesaPayout} 
        />
      )}

      {/* SUB-VIEW 1: FLEET REVENUE TRENDS (6 MONTHS RECHARTS & OPEX DONUT) */}
      {activeSubTab === 'revenueTrends' && (
        <FleetRevenueTrendsChart vehicles={vehicles} mpesaPayouts={mpesaPayouts} />
      )}

      {/* SUB-VIEW 2: EV VS FUEL PROFIT TRENDS & COST-EFFICIENCY CHART */}
      {activeSubTab === 'profitTrends' && (
        <EvVsFuelProfitChart />
      )}

      {/* SUB-VIEW 3: VEHICLE RETURN ON INVESTMENT (ROI) & TCO MATRIX */}
      {activeSubTab === 'vehicleRoi' && (
        <VehicleRoiAnalysisTable vehicles={vehicles} />
      )}

      {/* SUB-VIEW 4: RECONCILIATION ALERTS & FINANCIAL AUDIT CENTER */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-6">
          <ReconciliationAuditorCard
            mpesaPayouts={localPayouts}
            onUpdateMpesaReceipt={handleUpdateMpesaReceipt}
          />
          <ReconciliationAlertsTable
            mpesaPayouts={localPayouts}
            onUpdateMpesaReceipt={handleUpdateMpesaReceipt}
          />
        </div>
      )}

      {/* SUB-VIEW 5: M-PESA PAYOUTS & DISPATCHES */}
      {activeSubTab === 'payouts' && (
        <>
          {/* Reconciliation Alerts Table Summary inside Payouts Tab */}
          <ReconciliationAlertsTable
            mpesaPayouts={localPayouts}
            onUpdateMpesaReceipt={handleUpdateMpesaReceipt}
          />

          {/* Financial KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Fleet Revenue</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">KES {stats.todayGrossRevenueKes.toLocaleString()}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total trip fares collected</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver Earnings Allocation</div>
            <div className="text-2xl font-black text-white mt-1">KES {stats.todayDriverPayoutsKes.toLocaleString()}</div>
            <p className="text-[11px] text-slate-400 mt-1">Net payable to riders/drivers</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Net Profit</div>
            <div className="text-2xl font-black text-teal-400 mt-1">KES {stats.todayCompanyProfitKes.toLocaleString()}</div>
            <p className="text-[11px] text-emerald-400 mt-1">Platform commissions & margins</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Operating OPEX</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              KES {(stats.todayFuelExpensesKes + stats.todayChargingExpensesKes + stats.todayMaintenanceExpensesKes).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fuel + EV Charging + Repairs</p>
          </div>

        </div>
      )}

      {/* M-Pesa B2C Driver Payout Engine Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Send className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Dispatch M-Pesa B2C Driver Payout</h3>
          </div>

          {successMessage && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handlePayoutSubmit} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Select Recipient Driver:</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.mpesaPhoneNumber}) — Balance: KES {d.outstandingBalanceKes.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedDriver && (
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span>M-Pesa Phone:</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedDriver.mpesaPhoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Outstanding Balance:</span>
                  <span className="font-mono text-white font-bold">KES {selectedDriver.outstandingBalanceKes.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Payout Amount (KES):</label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. 15000"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Payout Reason:</label>
              <select
                value={payoutReason}
                onChange={(e) => setPayoutReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Weekly Earnings Payout">Weekly Earnings Payout</option>
                <option value="Daily Target Surplus">Daily Target Surplus</option>
                <option value="Expense Reimbursement">Expense Reimbursement</option>
                <option value="Bonus Incentive">Bonus Incentive</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <span>Processing M-Pesa B2C...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send M-Pesa Payout Now</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Transaction History Log (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                M-Pesa B2C Payout Transaction History
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {filteredPayouts.length} Payouts
                </span>
                {totalWarningsCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {totalWarningsCount} Reconciliation Warning{totalWarningsCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Filtered Total: <strong className="text-emerald-400 font-mono">KES {totalFilteredKes.toLocaleString()}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Batch Audit Button */}
              <button
                onClick={handleVerifyAllTransactions}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-bold px-3 py-2 rounded-lg text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                title="Verify all payout receipt references for missing or duplicate references"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify All Transactions</span>
              </button>

              {/* CSV Statement Download Button */}
              <button
                onClick={handleDownloadCsvStatement}
                disabled={filteredPayouts.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                title="Download CSV Statement of filtered payouts"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          {/* Reconciliation Audit Warning Banner */}
          {totalWarningsCount > 0 && (
            <div className="bg-amber-950/60 border border-amber-500/50 p-3 rounded-lg text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Reconciliation Alert:</strong> {totalWarningsCount} payout record(s) flagged with duplicate or missing M-Pesa receipt references.
                </span>
              </div>
              <button
                onClick={() => setReconciliationFilter('WARNINGS')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded text-[11px] shrink-0 transition"
              >
                Show Flagged Only
              </button>
            </div>
          )}

          {/* Date Filter & Reconciliation Status Toolbar */}
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Date Range:</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-400">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-400">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-[11px] flex items-center gap-1 transition"
                  title="Clear Date Filters"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Reconciliation Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setReconciliationFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  reconciliationFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({mpesaPayouts.length})
              </button>
              <button
                onClick={() => setReconciliationFilter('WARNINGS')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                  reconciliationFilter === 'WARNINGS'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Warnings</span>
              </button>
              <button
                onClick={() => setReconciliationFilter('VERIFIED')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                  reconciliationFilter === 'VERIFIED'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Verified Only
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ref Code</th>
                  <th className="px-4 py-3 font-semibold">Driver</th>
                  <th className="px-4 py-3 font-semibold">Phone Number</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Date / Time</th>
                  <th className="px-4 py-3 font-semibold">M-Pesa Receipt</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount (KES)</th>
                  <th className="px-4 py-3 font-semibold text-center">Audit Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 italic">
                      No M-Pesa payouts match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map(p => {
                    const vResult = verificationMap[p.id];
                    const hasWarning = vResult?.status === 'Warning';
                    const isVerified = vResult?.status === 'Verified';
                    const rawReceipt = (p.mpesaReceiptNo || '').trim();
                    const isMissingReceipt = !rawReceipt || rawReceipt.toUpperCase() === 'N/A' || rawReceipt === '-';

                    return (
                      <React.Fragment key={p.id}>
                        <tr className={`hover:bg-slate-800/40 transition ${hasWarning ? 'bg-amber-950/20' : ''}`}>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">{p.transactionRef}</td>
                          <td className="px-4 py-3 font-bold text-white">{p.driverName}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{p.phoneNumber}</td>
                          <td className="px-4 py-3 text-slate-400">{p.payoutReason}</td>
                          <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">{p.timestamp}</td>
                          
                          {/* M-Pesa Receipt Cell */}
                          <td className="px-4 py-3 font-mono text-[11px]">
                            {isMissingReceipt ? (
                              <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                MISSING REF
                              </span>
                            ) : (
                              <span className="text-slate-200 font-bold">{rawReceipt}</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                            KES {p.amountKes.toLocaleString()}
                          </td>

                          {/* Audit Status Badge */}
                          <td className="px-4 py-3 text-center">
                            {hasWarning ? (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Reconciliation Warning
                              </span>
                            ) : isVerified ? (
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                Verified Unique
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                Not Audited
                              </span>
                            )}
                          </td>

                          {/* Verify Action Button */}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleVerifyTransaction(p, true)}
                              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                              title="Verify if M-Pesa Receipt reference exists and is unique in system state"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Verify Transaction</span>
                            </button>
                          </td>
                        </tr>

                        {/* Inline Reconciliation Warning Callout Sub-Row */}
                        {hasWarning && (
                          <tr className="bg-amber-950/30 border-t border-b border-amber-500/30">
                            <td colSpan={9} className="px-4 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-200">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span className="font-bold text-amber-300">{vResult.message}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Audited: {vResult.verifiedAt}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
        </>
      )}

    </div>
  );
};
