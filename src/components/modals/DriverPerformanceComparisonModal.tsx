import React, { useState, useMemo } from 'react';
import { Driver, Vehicle, MpesaPayoutRequest } from '../../types';
import { 
  X, 
  Users, 
  ShieldCheck, 
  Award, 
  Wallet, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Activity, 
  ArrowLeftRight, 
  ArrowUpRight, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  Send, 
  Sparkles, 
  Check, 
  Copy, 
  Printer, 
  ShieldAlert, 
  Sliders, 
  ChevronRight, 
  ThumbsUp, 
  AlertOctagon,
  Download,
  Percent,
  Search,
  MessageSquare
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { toast } from 'sonner';
import { getDriverLicensingAlerts } from '../../utils/licensing';

interface DriverPerformanceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  vehicles?: Vehicle[];
  initialDriverAId?: string;
  initialDriverBId?: string;
  onOpenMpesaModal?: (driver: Driver) => void;
  onOpenMessageModal?: (driver: Driver) => void;
  onUpdateDriverSafetyScore?: (driverId: string, score: number) => void;
  onSendCoaching?: (driver: Driver) => void;
}

export const DriverPerformanceComparisonModal: React.FC<DriverPerformanceComparisonModalProps> = ({
  isOpen,
  onClose,
  drivers = [],
  vehicles = [],
  initialDriverAId,
  initialDriverBId,
  onOpenMpesaModal,
  onOpenMessageModal,
  onUpdateDriverSafetyScore,
  onSendCoaching
}) => {
  // State for selected drivers
  const [selectedDriverAId, setSelectedDriverAId] = useState<string>(() => {
    if (initialDriverAId && drivers.some(d => d.id === initialDriverAId)) return initialDriverAId;
    return drivers[0]?.id || '';
  });

  const [selectedDriverBId, setSelectedDriverBId] = useState<string>(() => {
    if (initialDriverBId && drivers.some(d => d.id === initialDriverBId) && initialDriverBId !== initialDriverAId) {
      return initialDriverBId;
    }
    const other = drivers.find(d => d.id !== selectedDriverAId);
    return other?.id || drivers[1]?.id || drivers[0]?.id || '';
  });

  // Review evaluation notes
  const [managerNotesA, setManagerNotesA] = useState<string>('Demonstrates reliable shift coverage and strong commitment to vehicle care.');
  const [managerNotesB, setManagerNotesB] = useState<string>('Strong customer ratings; recommend attending defensive driving refresher module.');
  const [activeTab, setActiveTab] = useState<'comparison' | 'charts' | 'appraisal'>('comparison');
  const [searchFilterA, setSearchFilterA] = useState<string>('');
  const [searchFilterB, setSearchFilterB] = useState<string>('');
  const [isDropdownAOpen, setIsDropdownAOpen] = useState<boolean>(false);
  const [isDropdownBOpen, setIsDropdownBOpen] = useState<boolean>(false);

  // Sync if initial props change when opening modal
  React.useEffect(() => {
    if (isOpen) {
      if (initialDriverAId && drivers.some(d => d.id === initialDriverAId)) {
        setSelectedDriverAId(initialDriverAId);
      }
      if (initialDriverBId && drivers.some(d => d.id === initialDriverBId)) {
        setSelectedDriverBId(initialDriverBId);
      } else if (initialDriverAId) {
        const alt = drivers.find(d => d.id !== initialDriverAId);
        if (alt) setSelectedDriverBId(alt.id);
      }
    }
  }, [isOpen, initialDriverAId, initialDriverBId, drivers]);

  if (!isOpen) return null;

  const driverA = drivers.find(d => d.id === selectedDriverAId) || drivers[0];
  const driverB = drivers.find(d => d.id === selectedDriverBId) || drivers[1] || drivers[0];

  if (!driverA || !driverB) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-bold">Insufficient Drivers for Comparison</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Please ensure at least two drivers are registered in the fleet database.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold">Close</button>
        </div>
      </div>
    );
  }

  // Vehicles assigned
  const vehicleA = vehicles.find(v => v.id === driverA.assignedVehicleId || v.registrationNumber === driverA.assignedVehicleReg);
  const vehicleB = vehicles.find(v => v.id === driverB.assignedVehicleId || v.registrationNumber === driverB.assignedVehicleReg);

  // Licensing alerts
  const licensingA = getDriverLicensingAlerts(driverA);
  const licensingB = getDriverLicensingAlerts(driverB);

  // Derived Performance Metrics
  const completionRateA = Math.min(100, Math.round((driverA.completedTrips / Math.max(1, driverA.totalTrips)) * 100));
  const completionRateB = Math.min(100, Math.round((driverB.completedTrips / Math.max(1, driverB.totalTrips)) * 100));

  const avgNetPerTripA = driverA.completedTrips > 0 ? Math.round(driverA.netEarningsKes / driverA.completedTrips) : 0;
  const avgNetPerTripB = driverB.completedTrips > 0 ? Math.round(driverB.netEarningsKes / driverB.completedTrips) : 0;

  const efficiencyIndexA = Math.round(((completionRateA * 0.5) + (driverA.safetyScorePercent * 0.5)) * 10) / 10;
  const efficiencyIndexB = Math.round(((completionRateB * 0.5) + (driverB.safetyScorePercent * 0.5)) * 10) / 10;

  // Comparison Deltas
  const safetyDelta = driverA.safetyScorePercent - driverB.safetyScorePercent;
  const tripsDelta = driverA.completedTrips - driverB.completedTrips;
  const earningsDelta = driverA.netEarningsKes - driverB.netEarningsKes;
  const completionRateDelta = completionRateA - completionRateB;
  const ratingDelta = Math.round((driverA.rating - driverB.rating) * 100) / 100;

  // Swap action
  const handleSwapDrivers = () => {
    const temp = selectedDriverAId;
    setSelectedDriverAId(selectedDriverBId);
    setSelectedDriverBId(temp);
    toast.info('Swapped Driver A and Driver B positions');
  };

  // Quick Preset Handlers
  const handleApplyPreset = (type: 'topVsLow' | 'topEarners' | 'sameCity') => {
    if (type === 'topVsLow') {
      const sortedBySafety = [...drivers].sort((a, b) => b.safetyScorePercent - a.safetyScorePercent);
      if (sortedBySafety.length >= 2) {
        setSelectedDriverAId(sortedBySafety[0].id);
        setSelectedDriverBId(sortedBySafety[sortedBySafety.length - 1].id);
        toast.success(`Selected Safety Champion (${sortedBySafety[0].fullName}) vs Remedial Safety (${sortedBySafety[sortedBySafety.length - 1].fullName})`);
      }
    } else if (type === 'topEarners') {
      const sortedByEarnings = [...drivers].sort((a, b) => b.netEarningsKes - a.netEarningsKes);
      if (sortedByEarnings.length >= 2) {
        setSelectedDriverAId(sortedByEarnings[0].id);
        setSelectedDriverBId(sortedByEarnings[1].id);
        toast.success(`Selected Top Earner (${sortedByEarnings[0].fullName}) vs Runner-Up (${sortedByEarnings[1].fullName})`);
      }
    } else if (type === 'sameCity') {
      // Find two in Nairobi or first available city
      const nairobiDrivers = drivers.filter(d => d.city === 'Nairobi');
      if (nairobiDrivers.length >= 2) {
        setSelectedDriverAId(nairobiDrivers[0].id);
        setSelectedDriverBId(nairobiDrivers[1].id);
        toast.success(`Selected Nairobi Peer Comparison: ${nairobiDrivers[0].fullName} vs ${nairobiDrivers[1].fullName}`);
      } else if (drivers.length >= 2) {
        setSelectedDriverAId(drivers[0].id);
        setSelectedDriverBId(drivers[1].id);
      }
    }
  };

  // Chart comparison data
  const comparisonChartData = [
    {
      metric: 'Safety Score (%)',
      [driverA.fullName.split(' ')[0]]: driverA.safetyScorePercent,
      [driverB.fullName.split(' ')[0]]: driverB.safetyScorePercent,
    },
    {
      metric: 'Completion (%)',
      [driverA.fullName.split(' ')[0]]: completionRateA,
      [driverB.fullName.split(' ')[0]]: completionRateB,
    },
    {
      metric: 'Acceptance (%)',
      [driverA.fullName.split(' ')[0]]: driverA.acceptanceRatePercent,
      [driverB.fullName.split(' ')[0]]: driverB.acceptanceRatePercent,
    },
    {
      metric: 'Efficiency Index',
      [driverA.fullName.split(' ')[0]]: efficiencyIndexA,
      [driverB.fullName.split(' ')[0]]: efficiencyIndexB,
    },
  ];

  const financialChartData = [
    {
      metric: 'Net Earnings (k KES)',
      [driverA.fullName.split(' ')[0]]: Math.round(driverA.netEarningsKes / 1000),
      [driverB.fullName.split(' ')[0]]: Math.round(driverB.netEarningsKes / 1000),
    },
    {
      metric: 'Gross Revenue (k KES)',
      [driverA.fullName.split(' ')[0]]: Math.round(driverA.grossEarningsKes / 1000),
      [driverB.fullName.split(' ')[0]]: Math.round(driverB.grossEarningsKes / 1000),
    },
    {
      metric: 'Company Comm. (k KES)',
      [driverA.fullName.split(' ')[0]]: Math.round(driverA.companyCommissionKes / 1000),
      [driverB.fullName.split(' ')[0]]: Math.round(driverB.companyCommissionKes / 1000),
    },
  ];

  // Appraisal Rating determination
  const getAppraisalGrade = (driver: Driver, completionRate: number) => {
    if (driver.safetyScorePercent >= 90 && completionRate >= 92 && driver.rating >= 4.7) {
      return {
        label: 'Exceeds Performance Standards (Tier 1)',
        badgeColor: 'bg-emerald-500 text-slate-950 font-black',
        recommendation: 'Eligible for quarterly performance bonus & green fleet leadership commendation.'
      };
    }
    if (driver.safetyScorePercent >= 80 && completionRate >= 80) {
      return {
        label: 'Meets Operational Benchmark (Tier 2)',
        badgeColor: 'bg-indigo-500 text-white font-bold',
        recommendation: 'Consistent service delivery. Maintain routine vehicle servicing and defensive driving habits.'
      };
    }
    return {
      label: 'Performance Remedial Plan Required (Tier 3)',
      badgeColor: 'bg-red-600 text-white font-black animate-pulse',
      recommendation: 'Requires mandatory speed limiter inspection, telematics review, and coaching module completion.'
    };
  };

  const appraisalA = getAppraisalGrade(driverA, completionRateA);
  const appraisalB = getAppraisalGrade(driverB, completionRateB);

  // Copy Full Review Summary to Clipboard
  const handleCopyReviewSummary = () => {
    const summaryText = `======================================================
GREENSHIFT KENYA FLEET - DRIVER PERFORMANCE COMPARISON & REVIEW
======================================================
Date Generated: ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
Evaluation Window: Active Fleet Operating Cycle

------------------------------------------------------
DRIVER A: ${driverA.fullName.toUpperCase()} (${driverA.phone})
City: ${driverA.city} | Vehicle: ${driverA.assignedVehicleReg || 'Unassigned'}
Contract: ${driverA.employmentType}
- Safety Score: ${driverA.safetyScorePercent}% (${driverA.safetyScorePercent >= 80 ? 'Compliant' : 'Needs Attention'})
- Total Trips: ${driverA.totalTrips} (Completed: ${driverA.completedTrips}, Cancelled: ${driverA.cancelledTrips})
- Completion Rate: ${completionRateA}% | Acceptance Rate: ${driverA.acceptanceRatePercent}%
- Customer Rating: ${driverA.rating} / 5.0
- Gross Revenue: KES ${driverA.grossEarningsKes.toLocaleString()}
- Net Earnings: KES ${driverA.netEarningsKes.toLocaleString()} (Avg KES ${avgNetPerTripA}/trip)
- Outstanding Payout Balance: KES ${driverA.outstandingBalanceKes.toLocaleString()}
- Appraisal Grade: ${appraisalA.label}
- Reviewer Notes: ${managerNotesA}

------------------------------------------------------
DRIVER B: ${driverB.fullName.toUpperCase()} (${driverB.phone})
City: ${driverB.city} | Vehicle: ${driverB.assignedVehicleReg || 'Unassigned'}
Contract: ${driverB.employmentType}
- Safety Score: ${driverB.safetyScorePercent}% (${driverB.safetyScorePercent >= 80 ? 'Compliant' : 'Needs Attention'})
- Total Trips: ${driverB.totalTrips} (Completed: ${driverB.completedTrips}, Cancelled: ${driverB.cancelledTrips})
- Completion Rate: ${completionRateB}% | Acceptance Rate: ${driverB.acceptanceRatePercent}%
- Customer Rating: ${driverB.rating} / 5.0
- Gross Revenue: KES ${driverB.grossEarningsKes.toLocaleString()}
- Net Earnings: KES ${driverB.netEarningsKes.toLocaleString()} (Avg KES ${avgNetPerTripB}/trip)
- Outstanding Payout Balance: KES ${driverB.outstandingBalanceKes.toLocaleString()}
- Appraisal Grade: ${appraisalB.label}
- Reviewer Notes: ${managerNotesB}

------------------------------------------------------
SIDE-BY-SIDE HEAD-TO-HEAD SUMMARY:
- Safety Score: ${driverA.fullName} (${driverA.safetyScorePercent}%) vs ${driverB.fullName} (${driverB.safetyScorePercent}%) -> Delta: ${safetyDelta > 0 ? '+' : ''}${safetyDelta}%
- Completed Trips: ${driverA.fullName} (${driverA.completedTrips}) vs ${driverB.fullName} (${driverB.completedTrips}) -> Delta: ${tripsDelta > 0 ? '+' : ''}${tripsDelta} trips
- Net Earnings: ${driverA.fullName} (KES ${driverA.netEarningsKes.toLocaleString()}) vs ${driverB.fullName} (KES ${driverB.netEarningsKes.toLocaleString()}) -> Delta: ${earningsDelta > 0 ? '+' : ''}KES ${earningsDelta.toLocaleString()}
======================================================`;

    navigator.clipboard.writeText(summaryText);
    toast.success('Performance Review Summary Copied to Clipboard!', {
      description: 'Ready to paste into appraisal documents, HR records, or dispatch logs.',
      duration: 4000
    });
  };

  return (
    <div id="driver-performance-comparison-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-950 border-b border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">Driver Performance Comparison</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Performance &amp; Appraisal Review
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Side-by-side comparative analysis of safety telematics scores, trip volume &amp; fulfillment, and net revenue earnings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleCopyReviewSummary}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Copy formatted appraisal summary to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copy Review Summary</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition cursor-pointer"
              title="Close Comparison Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DRIVER SELECTOR BAR & QUICK PRESETS */}
        <div className="bg-slate-950/60 border-b border-slate-800 p-4 shrink-0 space-y-3">
          
          {/* Quick Comparison Presets */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-slate-300">Quick Comparison Presets:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleApplyPreset('topVsLow')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <ShieldAlert className="w-3 h-3 text-red-400" />
                <span>Safety Champion vs Remedial</span>
              </button>
              <button
                onClick={() => handleApplyPreset('topEarners')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <Wallet className="w-3 h-3 text-emerald-400" />
                <span>Top Earners Head-to-Head</span>
              </button>
              <button
                onClick={() => handleApplyPreset('sameCity')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>Nairobi Peer Benchmark</span>
              </button>
            </div>
          </div>

          {/* TWO DRIVER SELECTORS & SWAP BUTTON */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
            
            {/* DRIVER A SELECTOR */}
            <div className="md:col-span-5 bg-slate-900 border border-emerald-500/40 rounded-xl p-3 shadow-md relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Driver Candidate A (Primary)</span>
                </span>
                <span className="text-slate-400 font-normal lowercase">click below to change</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => { setIsDropdownAOpen(!isDropdownAOpen); setIsDropdownBOpen(false); }}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-2.5 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={driverA.profilePhotoUrl} 
                      alt={driverA.fullName} 
                      className="w-10 h-10 rounded-lg object-cover border-2 border-emerald-400 shrink-0" 
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                        <span>{driverA.fullName}</span>
                        {driverA.safetyScorePercent >= 90 && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{driverA.city}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400">{driverA.assignedVehicleReg || 'No Vehicle'}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{driverA.phone}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu A */}
                {isDropdownAOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-30 max-h-64 overflow-y-auto space-y-1">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search driver by name..."
                        value={searchFilterA}
                        onChange={(e) => setSearchFilterA(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {drivers
                      .filter(d => d.fullName.toLowerCase().includes(searchFilterA.toLowerCase()) || d.phone.includes(searchFilterA))
                      .map(d => (
                        <button
                          key={`select-a-${d.id}`}
                          onClick={() => {
                            setSelectedDriverAId(d.id);
                            setIsDropdownAOpen(false);
                          }}
                          className={`w-full p-2 rounded-lg flex items-center justify-between text-left text-xs transition cursor-pointer ${
                            d.id === selectedDriverAId ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40' : 'hover:bg-slate-900 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={d.profilePhotoUrl} alt="" className="w-7 h-7 rounded-md object-cover" />
                            <div className="truncate">
                              <span className="block font-bold">{d.fullName}</span>
                              <span className="text-[10px] text-slate-400">{d.city} • {d.assignedVehicleReg || 'Unassigned'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[11px] font-mono font-bold ${d.safetyScorePercent >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {d.safetyScorePercent}% Safety
                            </span>
                            <span className="text-[10px] text-slate-400 block">{d.completedTrips} trips</span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Quick Action Button for Driver A */}
              <div className="flex items-center gap-2 mt-2.5">
                {onOpenMessageModal && (
                  <button
                    onClick={() => onOpenMessageModal(driverA)}
                    className="flex-1 py-1.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title={`Open Message Composer for ${driverA.fullName}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Message {driverA.fullName.split(' ')[0]}</span>
                  </button>
                )}
                {onOpenMpesaModal && (
                  <button
                    onClick={() => onOpenMpesaModal(driverA)}
                    className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title={`M-Pesa Payout to ${driverA.fullName}`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pay</span>
                  </button>
                )}
              </div>
            </div>

            {/* SWAP BUTTON */}
            <div className="md:col-span-1 flex justify-center">
              <button
                onClick={handleSwapDrivers}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 shadow-md transition cursor-pointer"
                title="Swap Driver A and Driver B positions"
              >
                <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
              </button>
            </div>

            {/* DRIVER B SELECTOR */}
            <div className="md:col-span-5 bg-slate-900 border border-indigo-500/40 rounded-xl p-3 shadow-md relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span>Driver Candidate B (Comparison Peer)</span>
                </span>
                <span className="text-slate-400 font-normal lowercase">click below to change</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => { setIsDropdownBOpen(!isDropdownBOpen); setIsDropdownAOpen(false); }}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-2.5 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={driverB.profilePhotoUrl} 
                      alt={driverB.fullName} 
                      className="w-10 h-10 rounded-lg object-cover border-2 border-indigo-400 shrink-0" 
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                        <span>{driverB.fullName}</span>
                        {driverB.safetyScorePercent >= 90 && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{driverB.city}</span>
                        <span>•</span>
                        <span className="font-mono text-indigo-400">{driverB.assignedVehicleReg || 'No Vehicle'}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{driverB.phone}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu B */}
                {isDropdownBOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-30 max-h-64 overflow-y-auto space-y-1">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search driver by name..."
                        value={searchFilterB}
                        onChange={(e) => setSearchFilterB(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {drivers
                      .filter(d => d.fullName.toLowerCase().includes(searchFilterB.toLowerCase()) || d.phone.includes(searchFilterB))
                      .map(d => (
                        <button
                          key={`select-b-${d.id}`}
                          onClick={() => {
                            setSelectedDriverBId(d.id);
                            setIsDropdownBOpen(false);
                          }}
                          className={`w-full p-2 rounded-lg flex items-center justify-between text-left text-xs transition cursor-pointer ${
                            d.id === selectedDriverBId ? 'bg-indigo-950 text-indigo-300 font-bold border border-indigo-500/40' : 'hover:bg-slate-900 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={d.profilePhotoUrl} alt="" className="w-7 h-7 rounded-md object-cover" />
                            <div className="truncate">
                              <span className="block font-bold">{d.fullName}</span>
                              <span className="text-[10px] text-slate-400">{d.city} • {d.assignedVehicleReg || 'Unassigned'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[11px] font-mono font-bold ${d.safetyScorePercent >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {d.safetyScorePercent}% Safety
                            </span>
                            <span className="text-[10px] text-slate-400 block">{d.completedTrips} trips</span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Quick Action Button for Driver B */}
              <div className="flex items-center gap-2 mt-2.5">
                {onOpenMessageModal && (
                  <button
                    onClick={() => onOpenMessageModal(driverB)}
                    className="flex-1 py-1.5 px-3 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title={`Open Message Composer for ${driverB.fullName}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Message {driverB.fullName.split(' ')[0]}</span>
                  </button>
                )}
                {onOpenMpesaModal && (
                  <button
                    onClick={() => onOpenMpesaModal(driverB)}
                    className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title={`M-Pesa Payout to ${driverB.fullName}`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Pay</span>
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-slate-900 border-b border-slate-800 px-5 pt-3 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'comparison'
                ? 'border-emerald-500 text-emerald-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Core Metrics Comparison</span>
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'charts'
                ? 'border-emerald-500 text-emerald-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Comparative Visual Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('appraisal')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'appraisal'
                ? 'border-emerald-500 text-emerald-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Performance Review &amp; Appraisal</span>
          </button>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/40">
          
          {/* TAB 1: CORE METRICS SIDE-BY-SIDE (SAFETY SCORES, TRIP COUNTS, NET EARNINGS) */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">

              {/* EXECUTIVE HEAD-TO-HEAD WINNER HIGHLIGHTS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. SAFETY WINNER CARD */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Safety Score Advantage</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-black">
                      {Math.abs(safetyDelta)}% Delta
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs text-slate-400">Leader:</span>
                      <h4 className="text-sm font-black text-white">
                        {safetyDelta >= 0 ? driverA.fullName : driverB.fullName}
                      </h4>
                    </div>
                    <span className={`text-lg font-mono font-black px-2.5 py-1 rounded-lg ${
                      (safetyDelta >= 0 ? driverA.safetyScorePercent : driverB.safetyScorePercent) >= 80 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}>
                      {safetyDelta >= 0 ? driverA.safetyScorePercent : driverB.safetyScorePercent}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {safetyDelta === 0 
                      ? 'Both drivers have identical telematics safety scores.'
                      : `${safetyDelta > 0 ? driverA.fullName : driverB.fullName} is +${Math.abs(safetyDelta)}% safer, with lower harsh acceleration & speeding risk.`}
                  </p>
                </div>

                {/* 2. TRIP FULFILLMENT WINNER CARD */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Trip Volume Lead</span>
                    </span>
                    <span className="font-mono text-amber-400 font-black">
                      {Math.abs(tripsDelta)} Trips Delta
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs text-slate-400">Leader:</span>
                      <h4 className="text-sm font-black text-white">
                        {tripsDelta >= 0 ? driverA.fullName : driverB.fullName}
                      </h4>
                    </div>
                    <span className="text-lg font-mono font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                      {tripsDelta >= 0 ? driverA.completedTrips : driverB.completedTrips} Trips
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {tripsDelta === 0 
                      ? 'Both drivers completed the exact same number of trips.'
                      : `${tripsDelta > 0 ? driverA.fullName : driverB.fullName} completed +${Math.abs(tripsDelta)} more deliveries/trips this cycle.`}
                  </p>
                </div>

                {/* 3. NET EARNINGS WINNER CARD */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>Net Earnings Leader</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-black">
                      KES {Math.abs(earningsDelta).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs text-slate-400">Leader:</span>
                      <h4 className="text-sm font-black text-white">
                        {earningsDelta >= 0 ? driverA.fullName : driverB.fullName}
                      </h4>
                    </div>
                    <span className="text-lg font-mono font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
                      KES {(earningsDelta >= 0 ? driverA.netEarningsKes : driverB.netEarningsKes).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {earningsDelta === 0 
                      ? 'Both drivers have equivalent net earnings.'
                      : `${earningsDelta > 0 ? driverA.fullName : driverB.fullName} took home +KES ${Math.abs(earningsDelta).toLocaleString()} more net payout.`}
                  </p>
                </div>

              </div>

              {/* THREE MAIN COMPARISON PILLARS: 1. SAFETY SCORES, 2. TRIP COUNTS, 3. NET EARNINGS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* PILLAR 1: SAFETY SCORES & TELEMATICS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">1. Telematics Safety Scores</h3>
                        <p className="text-[10px] text-slate-400">Speeding, harsh braking &amp; incident risk</p>
                      </div>
                    </div>
                  </div>

                  {/* Driver A Safety */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>{driverA.fullName}</span>
                      </span>
                      <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                        driverA.safetyScorePercent >= 80 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                      }`}>
                        {driverA.safetyScorePercent}% Safety
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          driverA.safetyScorePercent >= 80 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${driverA.safetyScorePercent}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-400">
                      <div>Status: <strong className={driverA.safetyScorePercent >= 80 ? 'text-emerald-400' : 'text-red-400'}>{driverA.safetyScorePercent >= 80 ? 'Benchmark Passed' : 'Critical Warning'}</strong></div>
                      <div>Rating: <strong className="text-amber-400 font-mono">{driverA.rating} ★</strong></div>
                    </div>

                    {driverA.safetyScorePercent < 80 && onSendCoaching && (
                      <button
                        onClick={() => onSendCoaching(driverA)}
                        className="w-full mt-1.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch Remedial Coaching to {driverA.fullName.split(' ')[0]}</span>
                      </button>
                    )}
                  </div>

                  {/* Driver B Safety */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        <span>{driverB.fullName}</span>
                      </span>
                      <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                        driverB.safetyScorePercent >= 80 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                      }`}>
                        {driverB.safetyScorePercent}% Safety
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          driverB.safetyScorePercent >= 80 ? 'bg-indigo-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${driverB.safetyScorePercent}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-400">
                      <div>Status: <strong className={driverB.safetyScorePercent >= 80 ? 'text-emerald-400' : 'text-red-400'}>{driverB.safetyScorePercent >= 80 ? 'Benchmark Passed' : 'Critical Warning'}</strong></div>
                      <div>Rating: <strong className="text-amber-400 font-mono">{driverB.rating} ★</strong></div>
                    </div>

                    {driverB.safetyScorePercent < 80 && onSendCoaching && (
                      <button
                        onClick={() => onSendCoaching(driverB)}
                        className="w-full mt-1.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch Remedial Coaching to {driverB.fullName.split(' ')[0]}</span>
                      </button>
                    )}
                  </div>

                  {/* Licensing status comparison */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                    <span className="font-bold text-slate-300 block">NTSA &amp; PSV Badge Compliance:</span>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{driverA.fullName.split(' ')[0]}:</span>
                      <span className={licensingA.hasWarning ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {licensingA.hasWarning ? licensingA.warningSummary[0] : 'Valid License & PSV'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{driverB.fullName.split(' ')[0]}:</span>
                      <span className={licensingB.hasWarning ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {licensingB.hasWarning ? licensingB.warningSummary[0] : 'Valid License & PSV'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* PILLAR 2: TRIP COUNTS & FULFILLMENT */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">2. Trip Volume &amp; Fulfillment</h3>
                        <p className="text-[10px] text-slate-400">Completed rides, acceptance &amp; cancellations</p>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Metrics Table */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                          <th className="py-2 px-3 text-left">Fulfillment Metric</th>
                          <th className="py-2 px-2 text-center text-emerald-400 font-bold">{driverA.fullName.split(' ')[0]}</th>
                          <th className="py-2 px-2 text-center text-indigo-400 font-bold">{driverB.fullName.split(' ')[0]}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Completed Trips</td>
                          <td className="py-2 px-2 text-center font-bold text-white">{driverA.completedTrips}</td>
                          <td className="py-2 px-2 text-center font-bold text-white">{driverB.completedTrips}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Total Dispatched</td>
                          <td className="py-2 px-2 text-center text-slate-400">{driverA.totalTrips}</td>
                          <td className="py-2 px-2 text-center text-slate-400">{driverB.totalTrips}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Cancelled Trips</td>
                          <td className={`py-2 px-2 text-center ${driverA.cancelledTrips > 5 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                            {driverA.cancelledTrips}
                          </td>
                          <td className={`py-2 px-2 text-center ${driverB.cancelledTrips > 5 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                            {driverB.cancelledTrips}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Completion Rate</td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-400">{completionRateA}%</td>
                          <td className="py-2 px-2 text-center font-bold text-indigo-400">{completionRateB}%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Acceptance Rate</td>
                          <td className="py-2 px-2 text-center text-slate-200">{driverA.acceptanceRatePercent}%</td>
                          <td className="py-2 px-2 text-center text-slate-200">{driverB.acceptanceRatePercent}%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Efficiency Index</td>
                          <td className="py-2 px-2 text-center font-black text-emerald-400">{efficiencyIndexA}</td>
                          <td className="py-2 px-2 text-center font-black text-indigo-400">{efficiencyIndexB}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Fulfillment Analysis:</span>
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      {completionRateDelta > 0 
                        ? `${driverA.fullName} demonstrates a +${completionRateDelta}% higher completion reliability with fewer rider cancellations.`
                        : completionRateDelta < 0
                        ? `${driverB.fullName} demonstrates a +${Math.abs(completionRateDelta)}% higher completion reliability with fewer rider cancellations.`
                        : 'Both drivers exhibit equal trip completion reliability.'}
                    </p>
                  </div>
                </div>

                {/* PILLAR 3: NET EARNINGS & FINANCIAL EFFICIENCY */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">3. Net Earnings &amp; Financials</h3>
                        <p className="text-[10px] text-slate-400">Gross revenue, commissions &amp; M-Pesa balance</p>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Financial Table */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                          <th className="py-2 px-3 text-left">Revenue Metric</th>
                          <th className="py-2 px-2 text-center text-emerald-400 font-bold">{driverA.fullName.split(' ')[0]}</th>
                          <th className="py-2 px-2 text-center text-indigo-400 font-bold">{driverB.fullName.split(' ')[0]}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        <tr className="bg-emerald-950/20">
                          <td className="py-2 px-3 text-emerald-300 font-sans font-bold">Net Earnings (KES)</td>
                          <td className="py-2 px-2 text-center font-black text-emerald-400">{driverA.netEarningsKes.toLocaleString()}</td>
                          <td className="py-2 px-2 text-center font-black text-indigo-400">{driverB.netEarningsKes.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Gross Revenue</td>
                          <td className="py-2 px-2 text-center text-slate-200">{driverA.grossEarningsKes.toLocaleString()}</td>
                          <td className="py-2 px-2 text-center text-slate-200">{driverB.grossEarningsKes.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Company Comm.</td>
                          <td className="py-2 px-2 text-center text-slate-400">{driverA.companyCommissionKes.toLocaleString()}</td>
                          <td className="py-2 px-2 text-center text-slate-400">{driverB.companyCommissionKes.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Avg Net / Trip</td>
                          <td className="py-2 px-2 text-center font-bold text-white">KES {avgNetPerTripA}</td>
                          <td className="py-2 px-2 text-center font-bold text-white">KES {avgNetPerTripB}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">M-Pesa Balance</td>
                          <td className="py-2 px-2 text-center text-emerald-400">{driverA.outstandingBalanceKes.toLocaleString()}</td>
                          <td className="py-2 px-2 text-center text-emerald-400">{driverB.outstandingBalanceKes.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">Contract Scheme</td>
                          <td className="py-2 px-2 text-center text-[10px] text-slate-400 font-sans">{driverA.employmentType}</td>
                          <td className="py-2 px-2 text-center text-[10px] text-slate-400 font-sans">{driverB.employmentType}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Action Triggers */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      {onOpenMessageModal && (
                        <button
                          onClick={() => onOpenMessageModal(driverA)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          title={`Message ${driverA.fullName}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Message {driverA.fullName.split(' ')[0]}</span>
                        </button>
                      )}
                      {onOpenMessageModal && (
                        <button
                          onClick={() => onOpenMessageModal(driverB)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-500/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          title={`Message ${driverB.fullName}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Message {driverB.fullName.split(' ')[0]}</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {onOpenMpesaModal && (
                        <button
                          onClick={() => onOpenMpesaModal(driverA)}
                          className="p-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          title={`Pay ${driverA.fullName}`}
                        >
                          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pay {driverA.fullName.split(' ')[0]}</span>
                        </button>
                      )}
                      {onOpenMpesaModal && (
                        <button
                          onClick={() => onOpenMpesaModal(driverB)}
                          className="p-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          title={`Pay ${driverB.fullName}`}
                        >
                          <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Pay {driverB.fullName.split(' ')[0]}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: COMPARATIVE VISUAL CHARTS */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Operational & Safety Performance Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <h4 className="text-sm font-bold text-white">Operational &amp; Safety Indices (%)</h4>
                      <p className="text-[10px] text-slate-400">Direct percentage comparison across safety, completion and acceptance</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                        <span>{driverA.fullName.split(' ')[0]}</span>
                      </span>
                      <span className="flex items-center gap-1 text-indigo-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
                        <span>{driverB.fullName.split(' ')[0]}</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} 
                        />
                        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '80% Safety Target', fill: '#ef4444', fontSize: 10 }} />
                        <Bar dataKey={driverA.fullName.split(' ')[0]} fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={driverB.fullName.split(' ')[0]} fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Financial Revenue Breakdown Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <h4 className="text-sm font-bold text-white">Financial Revenue &amp; Net Earnings (x1,000 KES)</h4>
                      <p className="text-[10px] text-slate-400">Net payouts, gross volume, and company commissions</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                        <span>{driverA.fullName.split(' ')[0]}</span>
                      </span>
                      <span className="flex items-center gap-1 text-indigo-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
                        <span>{driverB.fullName.split(' ')[0]}</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} 
                        />
                        <Bar dataKey={driverA.fullName.split(' ')[0]} fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={driverB.fullName.split(' ')[0]} fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: PERFORMANCE REVIEW & APPRAISAL RECOMMENDATIONS */}
          {activeTab === 'appraisal' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* APPRAISAL CARD: DRIVER A */}
                <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={driverA.profilePhotoUrl} 
                        alt={driverA.fullName} 
                        className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400"
                      />
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-1.5">
                          <span>{driverA.fullName}</span>
                          {driverA.safetyScorePercent >= 90 && <Sparkles className="w-4 h-4 text-amber-400" />}
                        </h4>
                        <p className="text-xs text-slate-400">City: {driverA.city} • Vehicle: <span className="font-mono text-emerald-400">{driverA.assignedVehicleReg || 'Unassigned'}</span></p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full text-center ${appraisalA.badgeColor}`}>
                      {appraisalA.label.split('(')[0]}
                    </span>
                  </div>

                  {/* Core Strengths */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Demonstrated Performance Strengths:</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                      <li>Achieved <strong className="text-white">{driverA.safetyScorePercent}% telematics safety score</strong> with zero fatal incidents.</li>
                      <li>Fulfilled <strong className="text-white">{driverA.completedTrips} trips</strong> with an acceptance rate of {driverA.acceptanceRatePercent}%.</li>
                      <li>Customer satisfaction rating sustained at <strong className="text-amber-400">{driverA.rating} / 5.0</strong>.</li>
                      <li>Generated <strong className="text-emerald-400 font-mono">KES {driverA.netEarningsKes.toLocaleString()}</strong> in net revenue.</li>
                    </ul>
                  </div>

                  {/* Growth & Review Recommendations */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-indigo-400">Formal Appraisal Recommendation:</span>
                    <p className="text-slate-300 leading-relaxed">{appraisalA.recommendation}</p>
                  </div>

                  {/* Manager Appraisal Notes */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-bold text-slate-300 flex items-center justify-between">
                      <span>Operations Manager Appraisal Notes:</span>
                      <span className="text-[10px] text-slate-500 font-normal">Editable for review file</span>
                    </label>
                    <textarea
                      value={managerNotesA}
                      onChange={(e) => setManagerNotesA(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Message & Dispatch Trigger */}
                  {onOpenMessageModal && (
                    <button
                      onClick={() => onOpenMessageModal(driverA)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Message Driver ({driverA.fullName.split(' ')[0]})</span>
                    </button>
                  )}
                </div>

                {/* APPRAISAL CARD: DRIVER B */}
                <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={driverB.profilePhotoUrl} 
                        alt={driverB.fullName} 
                        className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-400"
                      />
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-1.5">
                          <span>{driverB.fullName}</span>
                          {driverB.safetyScorePercent >= 90 && <Sparkles className="w-4 h-4 text-amber-400" />}
                        </h4>
                        <p className="text-xs text-slate-400">City: {driverB.city} • Vehicle: <span className="font-mono text-indigo-400">{driverB.assignedVehicleReg || 'Unassigned'}</span></p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full text-center ${appraisalB.badgeColor}`}>
                      {appraisalB.label.split('(')[0]}
                    </span>
                  </div>

                  {/* Core Strengths */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-indigo-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Demonstrated Performance Strengths:</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                      <li>Achieved <strong className="text-white">{driverB.safetyScorePercent}% telematics safety score</strong> across operating shifts.</li>
                      <li>Fulfilled <strong className="text-white">{driverB.completedTrips} trips</strong> with an acceptance rate of {driverB.acceptanceRatePercent}%.</li>
                      <li>Customer satisfaction rating sustained at <strong className="text-amber-400">{driverB.rating} / 5.0</strong>.</li>
                      <li>Generated <strong className="text-emerald-400 font-mono">KES {driverB.netEarningsKes.toLocaleString()}</strong> in net revenue.</li>
                    </ul>
                  </div>

                  {/* Growth & Review Recommendations */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-indigo-400">Formal Appraisal Recommendation:</span>
                    <p className="text-slate-300 leading-relaxed">{appraisalB.recommendation}</p>
                  </div>

                  {/* Manager Appraisal Notes */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-bold text-slate-300 flex items-center justify-between">
                      <span>Operations Manager Appraisal Notes:</span>
                      <span className="text-[10px] text-slate-500 font-normal">Editable for review file</span>
                    </label>
                    <textarea
                      value={managerNotesB}
                      onChange={(e) => setManagerNotesB(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Message & Dispatch Trigger */}
                  {onOpenMessageModal && (
                    <button
                      onClick={() => onOpenMessageModal(driverB)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Message Driver ({driverB.fullName.split(' ')[0]})</span>
                    </button>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Appraisal benchmarks aligned with GreenShift Fleet Safety Standards (80% target).</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopyReviewSummary}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Comparison Report</span>
            </button>
            
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-emerald-950 cursor-pointer"
            >
              Done / Close Review
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
