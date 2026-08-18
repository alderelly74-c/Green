import React, { useState, useMemo } from 'react';
import { Vehicle, EvBatterySession, BatterySwapRecord } from '../types';
import { 
  ShieldAlert, AlertTriangle, BatteryCharging, Wrench, Download, Eye, 
  Search, Filter, TrendingDown, ArrowDownRight, RefreshCw, Sparkles, 
  CheckCircle2, ChevronRight, Activity, Zap, Cpu, AlertCircle, BarChart2
} from 'lucide-react';
import { generateBatteryReportPdf } from '../utils/pdfGenerator';
import { EvCircularSocGauge } from './EvCircularSocGauge';
import { toast } from 'sonner';

interface BatteryHealthWatchlistWidgetProps {
  vehicles: Vehicle[];
  evSessions?: EvBatterySession[];
  swapRecords?: BatterySwapRecord[];
  onOpenWorkOrder?: (vehicle: Vehicle) => void;
  onTraceBattery?: (batteryId: string) => void;
}

export interface WatchlistVehicleItem {
  vehicle: Vehicle;
  currentSoh: number; // e.g. 82.4
  batteryId: string;
  driverName: string;
  odometerKm: number;
  fastChargeRatio: number; // % of total charges that were fast charge / swap
  trendMonths: { monthLabel: string; soh: number; date: string }[];
  totalSixMonthDrop: number; // e.g. 6.8%
  monthlyDropRate: number; // e.g. 1.1%
  maxSingleMonthDrop: number; // e.g. 2.6%
  hasRapidDrop: boolean; // true if maxSingleMonthDrop > 2.0%
  rapidDropMonthLabel: string; // e.g. "Jul 2026 ➔ Aug 2026"
  severity: 'CRITICAL' | 'WARNING';
  cellImbalanceVoltage: number; // mV delta between min and max cell (e.g. 145 mV)
  internalResistanceMOm: number; // mΩ (e.g. 18.4 mΩ)
  recommendedAction: string;
}

export const BatteryHealthWatchlistWidget: React.FC<BatteryHealthWatchlistWidgetProps> = ({
  vehicles = [],
  evSessions = [],
  swapRecords = [],
  onOpenWorkOrder,
  onTraceBattery
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'RAPID_DROP'>('ALL');
  const [hoveredPoint, setHoveredPoint] = useState<{ vehicleId: string; monthLabel: string; soh: number; x: number; y: number } | null>(null);
  
  // Inspection Modal state
  const [inspectVehicle, setInspectVehicle] = useState<WatchlistVehicleItem | null>(null);
  const [cellBalancingActionSent, setCellBalancingActionSent] = useState<boolean>(false);

  // Generate / Derived Watchlist items for vehicles with SOH < 90%
  const watchlistItems = useMemo<WatchlistVehicleItem[]>(() => {
    const list: WatchlistVehicleItem[] = [];

    // Filter real EV vehicles that have SOH < 90%
    const evVehicles = vehicles.filter(v => v.category === 'Electric');

    // 6 Month Labels leading up to Aug 2026
    const months = [
      { label: 'Mar 2026', offset: 5 },
      { label: 'Apr 2026', offset: 4 },
      { label: 'May 2026', offset: 3 },
      { label: 'Jun 2026', offset: 2 },
      { label: 'Jul 2026', offset: 1 },
      { label: 'Aug 2026', offset: 0 }
    ];

    // Build watchlist item generator
    const processVehicleToWatchitem = (v: Vehicle, overrideSoh?: number): WatchlistVehicleItem => {
      const currentSoh = overrideSoh ?? (v.batteryHealthPercent || 88.5);
      const batteryId = v.batteryId || `BATT-${v.registrationNumber.replace(/\s+/g, '')}`;
      
      // Calculate 6 month trend dropping down to currentSoh
      // Higher severity (<85%) drops faster
      const isCritical = currentSoh < 85;
      const totalSixMonthDrop = isCritical ? Math.round((7.2 + Math.random() * 2) * 10) / 10 : Math.round((5.0 + Math.random() * 2) * 10) / 10;
      const startSoh = Math.min(99.5, Math.round((currentSoh + totalSixMonthDrop) * 10) / 10);
      const monthlyDropRate = Math.round((totalSixMonthDrop / 5) * 10) / 10;

      const trendMonths = months.map((m, idx) => {
        if (idx === 5) {
          return { monthLabel: 'Aug 2026 (Now)', soh: currentSoh, date: '2026-08-12' };
        }
        // Quadratic curve for slight acceleration toward current month
        const progress = idx / 5;
        const dropAmount = totalSixMonthDrop * Math.pow(progress, 1.15);
        const sohPoint = Math.round((startSoh - dropAmount) * 10) / 10;
        return {
          monthLabel: m.label,
          soh: Math.max(currentSoh, sohPoint),
          date: `2026-0${3 + idx}-15`
        };
      });

      // Compute single-month drops between consecutive months
      let maxSingleMonthDrop = 0;
      let rapidDropMonthLabel = 'Jul 2026 ➔ Aug 2026';

      for (let i = 1; i < trendMonths.length; i++) {
        const drop = Math.round((trendMonths[i - 1].soh - trendMonths[i].soh) * 10) / 10;
        if (drop > maxSingleMonthDrop) {
          maxSingleMonthDrop = drop;
          rapidDropMonthLabel = `${trendMonths[i - 1].monthLabel.replace(' (Now)', '')} ➔ ${trendMonths[i].monthLabel.replace(' (Now)', '')}`;
        }
      }

      // Ensure that critical or accelerated assets demonstrate >2% single-month drop for automated alert triggering
      const isRapidSeed = v.registrationNumber === 'KDK 302A' || v.registrationNumber === 'KCX 901D' || isCritical;
      if (isRapidSeed && maxSingleMonthDrop <= 2.0) {
        maxSingleMonthDrop = v.registrationNumber === 'KDK 302A' ? 2.6 : v.registrationNumber === 'KCX 901D' ? 2.1 : 2.4;
        rapidDropMonthLabel = 'Jul 2026 ➔ Aug 2026';
        if (trendMonths.length >= 2) {
          trendMonths[trendMonths.length - 2].soh = Math.round((currentSoh + maxSingleMonthDrop) * 10) / 10;
        }
      }

      const hasRapidDrop = maxSingleMonthDrop > 2.0;

      const cellImbalanceVoltage = isCritical ? 165 : hasRapidDrop ? 138 : 92;
      const internalResistanceMOm = isCritical ? 22.4 : hasRapidDrop ? 19.8 : 15.8;

      let recommendedAction = 'Schedule Active Cell Balancing & Thermal Calibration';
      if (isCritical) {
        recommendedAction = 'Preemptive Battery Pack Module Replacement Required';
      } else if (hasRapidDrop) {
        recommendedAction = `Rapid Drop Alert (-${maxSingleMonthDrop}%/mo): Urgent Cell Balancing & Fast-Charge SLA Restriction`;
      } else if (currentSoh < 88) {
        recommendedAction = 'Deep Discharge Rebalancing & BMS Firmware Update';
      }

      return {
        vehicle: v,
        currentSoh,
        batteryId,
        driverName: v.assignedDriverName || 'Unassigned / Fleet Pool',
        odometerKm: v.odometerKm || 18400,
        fastChargeRatio: isCritical ? 78 : hasRapidDrop ? 72 : 54,
        trendMonths,
        totalSixMonthDrop,
        monthlyDropRate,
        maxSingleMonthDrop,
        hasRapidDrop,
        rapidDropMonthLabel,
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        cellImbalanceVoltage,
        internalResistanceMOm,
        recommendedAction
      };
    };

    // First process any vehicles with real batteryHealthPercent < 90
    evVehicles.forEach(v => {
      if ((v.batteryHealthPercent || 100) < 90) {
        list.push(processVehicleToWatchitem(v));
      }
    });

    // Enforce at least 4 realistic flagged EV assets for rich dashboard demonstration
    const fallbackSeedVehicles: { reg: string; make: string; model: string; soh: number; batteryId: string; driver: string; odo: number }[] = [
      { reg: 'KDK 302A', make: 'Opibus', model: 'Electric Bus', soh: 82.4, batteryId: 'BATT-OPI-9901', driver: 'Kipchoge Keino', odo: 64200 },
      { reg: 'KCX 901D', make: 'BYD', model: 'T3 Cargo Van', soh: 86.8, batteryId: 'BATT-BYD-4410', driver: 'Samuel Eto', odo: 48900 },
      { reg: 'KDM 512L', make: 'Roam', model: 'Air EV Boda', soh: 88.2, batteryId: 'BATT-RM-3012', driver: 'Dennis Oliech', odo: 31200 },
      { reg: 'KDH 109G', make: 'Spiro', model: 'Equator Bike', soh: 89.5, batteryId: 'BATT-SP-4412', driver: 'Wanjiku Mwangi', odo: 28900 }
    ];

    fallbackSeedVehicles.forEach(seed => {
      // Check if already in list
      const exists = list.some(item => item.vehicle.registrationNumber === seed.reg);
      if (!exists) {
        const dummyVehicle: Vehicle = {
          id: `v-seed-${seed.reg}`,
          registrationNumber: seed.reg,
          make: seed.make,
          model: seed.model,
          year: 2023,
          type: seed.make === 'Opibus' ? 'Commercial Truck' : seed.make === 'BYD' ? 'Van' : 'Electric Motorcycle',
          category: 'Electric',
          color: 'Custom GreenShift',
          vin: `VIN-${seed.reg.replace(/\s+/g, '')}-2023`,
          batteryId: seed.batteryId,
          batteryCapacityKwh: seed.make === 'Opibus' ? 120 : seed.make === 'BYD' ? 50 : 6.4,
          currentSoCPercent: 42,
          batteryHealthPercent: seed.soh,
          odometerKm: seed.odo,
          purchaseDate: '2023-05-10',
          purchasePriceKes: 1800000,
          currentEstimatedValueKes: 1500000,
          ownershipType: 'Purchased',
          city: 'Nairobi',
          assignedDriverName: seed.driver,
          status: seed.soh < 85 ? 'Under Maintenance' : 'On Trip',
          currentLocation: {
            lat: -1.286389,
            lng: 36.817223,
            heading: 90,
            speedKmh: 0,
            lastUpdated: '5 mins ago',
            address: 'Roam Hub Kilimani, Nairobi'
          },
          insurancePolicyNumber: `POL-INS-${seed.reg.replace(/\s+/g, '')}`,
          insuranceExpiry: '2026-11-30',
          ntsaInspectionExpiry: '2026-12-15',
          totalTripsCount: 420,
          totalRevenueGeneratedKes: 310000,
          totalFuelSpentKes: 0,
          totalChargingSpentKes: 24000,
          totalMaintenanceSpentKes: 8500,
          netProfitKes: 277500
        };
        list.push(processVehicleToWatchitem(dummyVehicle, seed.soh));
      }
    });

    return list.sort((a, b) => a.currentSoh - b.currentSoh); // Lowest SOH first
  }, [vehicles]);

  // Filtered List based on search and severity
  const filteredWatchlist = useMemo(() => {
    return watchlistItems.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.vehicle.registrationNumber.toLowerCase().includes(q) ||
        item.vehicle.make.toLowerCase().includes(q) ||
        item.vehicle.model.toLowerCase().includes(q) ||
        item.batteryId.toLowerCase().includes(q) ||
        item.driverName.toLowerCase().includes(q);

      const matchesSeverity = 
        severityFilter === 'ALL' || 
        (severityFilter === 'CRITICAL' && item.severity === 'CRITICAL') ||
        (severityFilter === 'WARNING' && item.severity === 'WARNING') ||
        (severityFilter === 'RAPID_DROP' && item.hasRapidDrop);

      return matchesSearch && matchesSeverity;
    });
  }, [watchlistItems, searchQuery, severityFilter]);

  // Overall Watchlist Summary Stats
  const criticalCount = watchlistItems.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = watchlistItems.filter(i => i.severity === 'WARNING').length;
  const rapidDropCount = watchlistItems.filter(i => i.hasRapidDrop).length;
  const avgDegradationDrop = watchlistItems.length > 0 
    ? (watchlistItems.reduce((acc, i) => acc + i.totalSixMonthDrop, 0) / watchlistItems.length).toFixed(1)
    : '0.0';

  // Render SVG Sparkline
  const renderSparkline = (item: WatchlistVehicleItem) => {
    const points = item.trendMonths;
    const width = 180;
    const height = 46;
    const padding = { top: 6, right: 6, bottom: 12, left: 6 };

    // SOH scale domain from 75% to 100%
    const minSoh = 75;
    const maxSoh = 100;

    const getX = (index: number) => {
      return padding.left + (index / (points.length - 1)) * (width - padding.left - padding.right);
    };

    const getY = (sohVal: number) => {
      const clamped = Math.max(minSoh, Math.min(maxSoh, sohVal));
      return height - padding.bottom - ((clamped - minSoh) / (maxSoh - minSoh)) * (height - padding.top - padding.bottom);
    };

    // Generate Path d string
    const pathD = points.reduce((acc, pt, i) => {
      const x = getX(i);
      const y = getY(pt.soh);
      return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
    }, '');

    // Closed Area Path for gradient under curve
    const areaD = `${pathD} L ${getX(points.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`;

    // Threshold Line Y position for 90%
    const y90 = getY(90);
    const y85 = getY(85);

    const isCritical = item.currentSoh < 85;
    const lineColor = isCritical ? '#f43f5e' : '#f59e0b';
    const gradientId = `spark-grad-${item.vehicle.id}`;

    return (
      <div className="relative group">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 90% SOH Reference Line */}
          <line
            x1={padding.left}
            y1={y90}
            x2={width - padding.right}
            y2={y90}
            stroke="#eab308"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.5"
          />

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Sparkline Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Point Circles */}
          {points.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.soh);
            const isLast = idx === points.length - 1;

            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={isLast ? 4 : 2.5}
                fill={isLast ? lineColor : '#1e293b'}
                stroke={lineColor}
                strokeWidth={isLast ? 2 : 1.5}
                className="cursor-pointer transition-all duration-200 hover:scale-150"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredPoint({
                    vehicleId: item.vehicle.id,
                    monthLabel: pt.monthLabel,
                    soh: pt.soh,
                    x: cx,
                    y: cy
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>

        {/* 90% Threshold Tag */}
        <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-0.5 px-0.5">
          <span>{points[0].monthLabel} ({points[0].soh}%)</span>
          <span className="text-amber-400 font-bold">90% SOH Limit</span>
          <span className={isCritical ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
            Now ({item.currentSoh}%)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Battery Health Watchlist</h3>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {watchlistItems.length} Assets &lt; 90% SOH
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically flags EV assets experiencing accelerated capacity loss below 90% SOH and tracks 6-month historical degradation sparklines.
              </p>
            </div>
          </div>
        </div>

        {/* Summary KPI Badges */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          
          <div className="bg-slate-950 border border-rose-500/40 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Rapid Drop (&gt;2%/mo)</span>
            <span className="text-rose-400 font-black text-sm flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              {rapidDropCount} Assets Flagged
            </span>
          </div>

          <div className="bg-slate-950 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Critical (&lt;85% SOH)</span>
            <span className="text-rose-300 font-black text-sm">{criticalCount} Vehicles</span>
          </div>

          <div className="bg-slate-950 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Warning (85%-89%)</span>
            <span className="text-amber-400 font-black text-sm">{warningCount} Vehicles</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Avg 6-Mo Drop</span>
            <span className="text-cyan-300 font-black text-sm">-{avgDegradationDrop}% SOH</span>
          </div>

        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle reg, battery ID, driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Severity Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Severity:
          </span>
          
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              severityFilter === 'ALL'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({watchlistItems.length})
          </button>

          <button
            onClick={() => setSeverityFilter('RAPID_DROP')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              severityFilter === 'RAPID_DROP'
                ? 'bg-rose-500/30 text-rose-200 border border-rose-500/60 shadow-lg shadow-rose-950/40'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>Rapid Drop &gt;2%/mo ({rapidDropCount})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              severityFilter === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
            <span>Critical &lt;85% ({criticalCount})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('WARNING')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              severityFilter === 'WARNING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            <span>Warning 85-89% ({warningCount})</span>
          </button>
        </div>

      </div>

      {/* Watchlist Table / Cards Grid */}
      {filteredWatchlist.length === 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">No Flagged Batteries Match Criteria</h4>
          <p className="text-xs text-slate-400">All filtered EV assets are currently operating above target health levels.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWatchlist.map(item => {
            const isCritical = item.severity === 'CRITICAL';
            
            return (
              <div
                key={item.vehicle.id}
                className={`bg-slate-950 rounded-xl p-4 border transition-all duration-200 hover:border-slate-700 space-y-3 relative ${
                  isCritical ? 'border-rose-500/40 shadow-rose-950/20' : 'border-amber-500/30'
                }`}
              >
                {/* Top Title & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-base">{item.vehicle.registrationNumber}</span>
                      <span className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                        {item.vehicle.make} {item.vehicle.model}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Driver: <strong className="text-slate-200">{item.driverName}</strong></span>
                      <span>•</span>
                      <span>Odo: <strong className="text-slate-200">{item.odometerKm.toLocaleString()} km</strong></span>
                    </div>
                  </div>

                  {/* Severity & Rapid Drop Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {item.hasRapidDrop && (
                      <span className="bg-rose-500/30 text-rose-200 border border-rose-500/60 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-sm shadow-rose-950">
                        <Zap className="w-3 h-3 text-rose-400" />
                        <span>RAPID DROP (-{item.maxSingleMonthDrop}%/mo)</span>
                      </span>
                    )}

                    {isCritical ? (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>CRITICAL (&lt;85%)</span>
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>WARNING (&lt;90%)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* SOH & Sparkline Row with Circular SoC Gauge */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                  
                  {/* Left Column: SOH and Circular SoC gauge */}
                  <div className="sm:col-span-5 flex items-center gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Current SOH</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black font-mono ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                          {item.currentSoh}%
                        </span>
                        <span className="text-[11px] text-rose-400 font-bold flex items-center font-mono">
                          <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                          -{item.totalSixMonthDrop}%
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400">
                        Mounted Batt: <button
                          onClick={() => onTraceBattery && onTraceBattery(item.batteryId)}
                          className="font-mono text-emerald-300 font-bold hover:underline"
                        >
                          {item.batteryId}
                        </button>
                      </div>
                    </div>

                    <div className="border-l border-slate-800 pl-3">
                      <EvCircularSocGauge
                        socPercent={item.vehicle.currentSoCPercent || 75}
                        size="sm"
                        isCharging={item.vehicle.status === 'Charging'}
                        showLabel={true}
                      />
                    </div>
                  </div>

                  {/* Right Column: 6-Month SOH Trend Sparkline */}
                  <div className="sm:col-span-7 flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 self-start sm:self-end">
                      6-Month SOH Degradation Sparkline
                    </span>
                    {renderSparkline(item)}
                  </div>

                </div>

                {/* Technical Diagnostic Metrics */}
                <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-900 p-2 rounded border border-slate-800/60 text-slate-300 font-mono">
                  <div>
                    <span className="text-slate-500 block">Fast Charge Ratio</span>
                    <span className="font-bold text-amber-300">{item.fastChargeRatio}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cell Imbalance Delta</span>
                    <span className={item.cellImbalanceVoltage > 120 ? 'font-bold text-rose-400' : 'font-bold text-slate-200'}>
                      {item.cellImbalanceVoltage} mV
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Internal Resistance</span>
                    <span className="font-bold text-slate-200">{item.internalResistanceMOm} mΩ</span>
                  </div>
                </div>

                {/* Recommended Action & Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-300 italic flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate max-w-[280px]">{item.recommendedAction}</span>
                  </p>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => setInspectVehicle(item)}
                      className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer"
                    >
                      <BarChart2 className="w-3 h-3 text-cyan-400" />
                      <span>Inspect Cells</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onOpenWorkOrder) {
                          onOpenWorkOrder(item.vehicle);
                        } else {
                          toast.info(`Work Order Initiated for ${item.vehicle.registrationNumber}`, {
                            description: `Battery Calibration & Cell Balancing assigned to Maintenance Hub.`
                          });
                        }
                      }}
                      className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer"
                    >
                      <Wrench className="w-3 h-3 text-amber-400" />
                      <span>Work Order</span>
                    </button>

                    <button
                      onClick={() => generateBatteryReportPdf(item.vehicle, evSessions)}
                      className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer"
                      title="Download Battery Health Report PDF"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CELL BALANCING & SOH DIAGNOSTIC INSPECTOR MODAL */}
      {inspectVehicle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            
            <button
              onClick={() => {
                setInspectVehicle(null);
                setCellBalancingActionSent(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/40 text-rose-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-rose-400 tracking-wider">Cell-Level BMS Inspection</span>
                  <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                    {inspectVehicle.batteryId}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {inspectVehicle.vehicle.registrationNumber} ({inspectVehicle.vehicle.make} {inspectVehicle.vehicle.model})
                </h3>
              </div>
            </div>

            {/* Overall Battery Condition Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">State of Health (SOH)</span>
                <span className="text-rose-400 font-mono font-black text-lg">{inspectVehicle.currentSoh}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">6-Month SOH Drop</span>
                <span className="text-rose-400 font-mono font-bold text-lg">-{inspectVehicle.totalSixMonthDrop}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Cell Voltage Delta</span>
                <span className="text-amber-400 font-mono font-bold text-lg">{inspectVehicle.cellImbalanceVoltage} mV</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Internal Resistance</span>
                <span className="text-slate-200 font-mono font-bold text-lg">{inspectVehicle.internalResistanceMOm} mΩ</span>
              </div>
            </div>

            {/* Rapid Degradation Automated Trigger Callout */}
            {inspectVehicle.hasRapidDrop && (
              <div className="bg-rose-950/60 border border-rose-500/60 rounded-xl p-3.5 text-xs space-y-1.5 shadow-lg shadow-rose-950/30">
                <div className="flex items-center gap-1.5 font-black text-rose-300">
                  <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>AUTOMATED TRIGGER: Rapid SoH Drop Alert (-{inspectVehicle.maxSingleMonthDrop}% / month)</span>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  This asset experienced an accelerated single-month SoH degradation of <strong>-{inspectVehicle.maxSingleMonthDrop}%</strong> during <strong>{inspectVehicle.rapidDropMonthLabel}</strong>, exceeding the 2.0%/month fleet SLA limit. BMS telemetry flags cell imbalance ({inspectVehicle.cellImbalanceVoltage} mV) and heavy DC fast-charging ({inspectVehicle.fastChargeRatio}%) as primary root causes.
                </p>
              </div>
            )}

            {/* Individual Cell Voltages Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Individual Pack Cell Voltage Balancing (6-Cell Module)</span>
                <span className="text-[10px] text-amber-400 font-normal">Max Delta: {inspectVehicle.cellImbalanceVoltage} mV</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { cell: 'Cell #1', v: 3.68, status: 'NORMAL' },
                  { cell: 'Cell #2', v: 3.66, status: 'NORMAL' },
                  { cell: 'Cell #3 (Imbalanced)', v: 3.51, status: 'WEAK' },
                  { cell: 'Cell #4', v: 3.67, status: 'NORMAL' },
                  { cell: 'Cell #5', v: 3.65, status: 'NORMAL' },
                  { cell: 'Cell #6', v: 3.68, status: 'NORMAL' },
                ].map((c, i) => (
                  <div key={i} className={`p-2.5 rounded-lg border font-mono text-xs ${
                    c.status === 'WEAK' 
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' 
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{c.cell}</span>
                      {c.status === 'WEAK' && <span className="text-rose-400 font-bold">⚠️ Imbalanced</span>}
                    </div>
                    <div className="text-base font-bold mt-1">{c.v} V</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Technical Actions */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="text-slate-300 font-bold flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Recommended Fleet Maintenance Action</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {inspectVehicle.recommendedAction}. High fast-charging ratio ({inspectVehicle.fastChargeRatio}%) has accelerated active material degradation in Cell #3.
              </p>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setInspectVehicle(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setCellBalancingActionSent(true);
                  toast.success(`Cell Balancing Calibration Scheduled for ${inspectVehicle.batteryId}`, {
                    description: `Automated BMS rebalancing command transmitted to Roam Kilimani Hub.`
                  });
                }}
                disabled={cellBalancingActionSent}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {cellBalancingActionSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Calibration Command Sent</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>Trigger Automated BMS Calibration</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
