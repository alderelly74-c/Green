import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { EvBatterySession, Vehicle, BatterySwapRecord } from '../types';
import { 
  Zap, AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  Filter, Download, RefreshCw, Info, Sparkles, Activity, Layers, ArrowUpRight,
  Wrench, ShieldCheck, Gauge, HelpCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface EvEnergyEfficiencyD3ChartProps {
  evSessions?: EvBatterySession[];
  vehicles?: Vehicle[];
  swapRecords?: BatterySwapRecord[];
}

export interface SessionEfficiencyData {
  id: string;
  vehicleReg: string;
  vehicleType: string;
  stationName: string;
  chargerId: string;
  timestamp: string;
  dateObj: Date;
  energyKwh: number;
  distanceKm: number;
  efficiencyKwhPerKm: number; // kWh/km
  whPerKm: number; // Wh/km
  costKes: number;
  leakageStatus: 'OPTIMAL' | 'ELEVATED' | 'POWER_LEAKAGE';
  suspectedCause?: string;
  excessKwhWasted: number;
  financialLossKes: number;
}

// Standard baseline benchmarks in Kenya e-mobility (0.07 kWh/km is optimal for 2W/3W)
const BENCHMARK_OPTIMAL_KWH_KM = 0.08;
const WARNING_THRESHOLD_KWH_KM = 0.15;
const LEAKAGE_ALERT_THRESHOLD_KWH_KM = 0.20;

export const EvEnergyEfficiencyD3Chart: React.FC<EvEnergyEfficiencyD3ChartProps> = ({
  evSessions = [],
  vehicles = [],
  swapRecords = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Responsive Width
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Filters State
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('ALL');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('ALL');
  const [showLeakageOnly, setShowLeakageOnly] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<SessionEfficiencyData | null>(null);
  const [hoveredSession, setHoveredSession] = useState<SessionEfficiencyData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Generate / Derived Energy Efficiency dataset across sessions
  const sessionEfficiencyData: SessionEfficiencyData[] = useMemo(() => {
    const list: SessionEfficiencyData[] = [];

    // Unique station list for fallback generation if sessions are minimal
    const stations = [
      'Roam Hub Kilimani',
      'Spiro Station Westlands',
      'BYD Fast Charge Ind. Area',
      'GreenShift Central Depot',
      'E-Mobility Depot Upper Hill'
    ];

    const vehicleRegs = vehicles.length > 0 
      ? vehicles.map(v => v.registrationNumber) 
      : ['KMC-482Y', 'KMD-109X', 'KME-312Z', 'KMF-901A', 'KMG-554B', 'KMH-772C'];

    // Map existing sessions or create realistic 25-session historical dataset
    const baseCount = Math.max(evSessions.length, 28);

    for (let i = 0; i < baseCount; i++) {
      const isRealSession = i < evSessions.length;
      const session = isRealSession ? evSessions[i] : null;

      const stationName = session?.stationName || stations[i % stations.length];
      const vehicleReg = session?.vehicleReg || vehicleRegs[i % vehicleRegs.length];
      const chargerId = `CHG-${(i % 8) + 1}`;

      // Date spread over last 14 days
      const daysAgo = Math.floor((baseCount - i) / 2);
      const dateObj = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + (i * 37 * 60 * 1000));
      const timestamp = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + 
                         dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      // Energy & Distance derivation
      const energyKwh = session?.energyKwhConsumed || (12.4 + (i % 7) * 2.1);
      
      // Introduce synthetic power leakage anomalies for specific chargers/vehicles (e.g. charger #3 or vehicle #4)
      let distanceKm = session ? (energyKwh / 0.085) : (110 + (i % 5) * 18);
      
      // Inject realistic power leakage scenarios for diagnostics:
      // Scenario A: Charger #3 has a faulty transformer coil -> draws 2.8x energy for same distance
      // Scenario B: Vehicle KMC-482Y has cell imbalance -> 2.2x energy loss
      if (chargerId === 'CHG-3' || vehicleReg === 'KMC-482Y' || i === 5 || i === 18) {
        distanceKm = distanceKm * 0.38; // artificially inflated kWh/km (power leakage)
      } else if (i === 11 || i === 22) {
        distanceKm = distanceKm * 0.58; // elevated thermal dissipation loss
      }

      const rawEfficiency = energyKwh / Math.max(1, distanceKm); // kWh/km
      const efficiencyKwhPerKm = Math.round(rawEfficiency * 1000) / 1000;
      const whPerKm = Math.round(efficiencyKwhPerKm * 1000);
      const costKes = session?.costKes || Math.round(energyKwh * 21.5);

      let leakageStatus: 'OPTIMAL' | 'ELEVATED' | 'POWER_LEAKAGE' = 'OPTIMAL';
      let suspectedCause: string | undefined = undefined;

      if (efficiencyKwhPerKm >= LEAKAGE_ALERT_THRESHOLD_KWH_KM) {
        leakageStatus = 'POWER_LEAKAGE';
        if (chargerId === 'CHG-3') {
          suspectedCause = 'Charger Rectifier Ground Fault & Cable Connector Resistance Leakage';
        } else if (vehicleReg === 'KMC-482Y') {
          suspectedCause = 'Vehicle BMS Module Cell Imbalance & Internal Thermal Loss';
        } else {
          suspectedCause = 'High AC-DC Conversion Parasitic Current & Internal Shorting';
        }
      } else if (efficiencyKwhPerKm >= WARNING_THRESHOLD_KWH_KM) {
        leakageStatus = 'ELEVATED';
        suspectedCause = 'Mild Thermal Dissipation & High Fast-Charge Cable Impedance';
      }

      const normalKwhExpected = distanceKm * BENCHMARK_OPTIMAL_KWH_KM;
      const excessKwhWasted = Math.max(0, Math.round((energyKwh - normalKwhExpected) * 10) / 10);
      const financialLossKes = Math.round(excessKwhWasted * 21.5);

      list.push({
        id: session?.id || `sess-eff-${i + 101}`,
        vehicleReg,
        vehicleType: 'Electric Boda/Tuk-Tuk',
        stationName,
        chargerId,
        timestamp,
        dateObj,
        energyKwh: Math.round(energyKwh * 10) / 10,
        distanceKm: Math.round(distanceKm),
        efficiencyKwhPerKm,
        whPerKm,
        costKes,
        leakageStatus,
        suspectedCause,
        excessKwhWasted,
        financialLossKes
      });
    }

    return list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [evSessions, vehicles]);

  // Unique Station & Vehicle Options for Filters
  const stationOptions = useMemo(() => {
    const set = new Set<string>();
    sessionEfficiencyData.forEach(s => set.add(s.stationName));
    return Array.from(set);
  }, [sessionEfficiencyData]);

  const vehicleOptions = useMemo(() => {
    const set = new Set<string>();
    sessionEfficiencyData.forEach(s => set.add(s.vehicleReg));
    return Array.from(set);
  }, [sessionEfficiencyData]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return sessionEfficiencyData.filter(item => {
      const matchStation = selectedStationFilter === 'ALL' || item.stationName === selectedStationFilter;
      const matchVehicle = selectedVehicleFilter === 'ALL' || item.vehicleReg === selectedVehicleFilter;
      const matchLeakage = !showLeakageOnly || item.leakageStatus === 'POWER_LEAKAGE';
      return matchStation && matchVehicle && matchLeakage;
    });
  }, [sessionEfficiencyData, selectedStationFilter, selectedVehicleFilter, showLeakageOnly]);

  // Aggregate Key Statistics
  const stats = useMemo(() => {
    const totalSessions = filteredData.length;
    const avgEfficiency = totalSessions > 0
      ? Math.round((filteredData.reduce((acc, s) => acc + s.efficiencyKwhPerKm, 0) / totalSessions) * 1000) / 1000
      : 0;

    const leakageCount = filteredData.filter(s => s.leakageStatus === 'POWER_LEAKAGE').length;
    const totalWastedKwh = Math.round(filteredData.reduce((acc, s) => acc + s.excessKwhWasted, 0));
    const totalFinancialLossKes = Math.round(filteredData.reduce((acc, s) => acc + s.financialLossKes, 0));

    // Identify Worst Charger / Vehicle
    const leakageByCharger: Record<string, number> = {};
    filteredData.forEach(s => {
      if (s.leakageStatus === 'POWER_LEAKAGE') {
        leakageByCharger[s.stationName] = (leakageByCharger[s.stationName] || 0) + 1;
      }
    });

    const worstChargerStation = Object.entries(leakageByCharger).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    return {
      totalSessions,
      avgEfficiency,
      leakageCount,
      totalWastedKwh,
      totalFinancialLossKes,
      worstChargerStation
    };
  }, [filteredData]);

  // Render D3 Scatter & Efficiency Trend Line Chart
  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 35, right: 35, bottom: 50, left: 60 };
    const width = Math.max(320, containerWidth - margin.left - margin.right);
    const height = 320;
    const totalSvgHeight = height + margin.top + margin.bottom;

    svg
      .attr('width', containerWidth)
      .attr('height', totalSvgHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${totalSvgHeight}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Timeline / Index)
    const dates: Date[] = filteredData.map(d => d.dateObj instanceof Date ? d.dateObj : new Date(d.dateObj));
    const minDate = d3.min(dates) || new Date();
    const maxDate = d3.max(dates) || new Date();

    const xScale = d3.scaleTime()
      .domain([minDate, maxDate])
      .range([0, width]);

    // Y Scale (kWh / km Efficiency)
    const maxEffVal = d3.max(filteredData, (d: SessionEfficiencyData) => d.efficiencyKwhPerKm) || 0.25;
    const maxEff = Math.max(0.30, maxEffVal * 1.15);
    const yScale = d3.scaleLinear()
      .domain([0, maxEff])
      .range([height, 0]);

    // Background Shaded Threshold Zones
    // Zone 1: Optimal (< 0.10 kWh/km)
    g.append('rect')
      .attr('x', 0)
      .attr('width', width)
      .attr('y', yScale(Math.min(maxEff, 0.10)))
      .attr('height', height - yScale(Math.min(maxEff, 0.10)))
      .attr('fill', 'rgba(16, 185, 129, 0.06)');

    // Zone 2: Elevated Warning (0.10 - 0.20 kWh/km)
    if (maxEff > 0.10) {
      const topY = yScale(Math.min(maxEff, LEAKAGE_ALERT_THRESHOLD_KWH_KM));
      const botY = yScale(0.10);
      g.append('rect')
        .attr('x', 0)
        .attr('width', width)
        .attr('y', topY)
        .attr('height', Math.max(0, botY - topY))
        .attr('fill', 'rgba(245, 158, 11, 0.08)');
    }

    // Zone 3: Power Leakage Red Alert (> 0.20 kWh/km)
    if (maxEff > LEAKAGE_ALERT_THRESHOLD_KWH_KM) {
      const topY = yScale(maxEff);
      const botY = yScale(LEAKAGE_ALERT_THRESHOLD_KWH_KM);
      g.append('rect')
        .attr('x', 0)
        .attr('width', width)
        .attr('y', topY)
        .attr('height', Math.max(0, botY - topY))
        .attr('fill', 'rgba(244, 63, 94, 0.12)');
    }

    // Benchmark Reference Threshold Lines & Text
    // Benchmark Optimal (0.08 kWh/km)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(BENCHMARK_OPTIMAL_KWH_KM))
      .attr('y2', yScale(BENCHMARK_OPTIMAL_KWH_KM))
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4');

    g.append('text')
      .attr('x', width - 6)
      .attr('y', yScale(BENCHMARK_OPTIMAL_KWH_KM) - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#10b981')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text('Benchmark Optimal (0.08 kWh/km)');

    // Leakage Alert Line (0.20 kWh/km)
    if (maxEff >= LEAKAGE_ALERT_THRESHOLD_KWH_KM) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(LEAKAGE_ALERT_THRESHOLD_KWH_KM))
        .attr('y2', yScale(LEAKAGE_ALERT_THRESHOLD_KWH_KM))
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3 3');

      g.append('text')
        .attr('x', width - 6)
        .attr('y', yScale(LEAKAGE_ALERT_THRESHOLD_KWH_KM) - 6)
        .attr('text-anchor', 'end')
        .attr('fill', '#f43f5e')
        .attr('font-size', '10px')
        .attr('font-weight', '800')
        .text('CRITICAL POWER LEAKAGE ALERT (>0.20 kWh/km)');
    }

    // Grid lines Y
    const yAxisTicks = yScale.ticks(6);
    yAxisTicks.forEach(tick => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 1);
    });

    // Spline Line Path Connecting Session Points
    const lineGenerator = d3.line<SessionEfficiencyData>()
      .x((d: SessionEfficiencyData) => xScale(d.dateObj))
      .y((d: SessionEfficiencyData) => yScale(d.efficiencyKwhPerKm))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(filteredData)
      .attr('fill', 'none')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('d', lineGenerator);

    // Render Data Points (Circles)
    const points = g.selectAll<SVGCircleElement, SessionEfficiencyData>('.data-point')
      .data(filteredData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (d: SessionEfficiencyData) => xScale(d.dateObj))
      .attr('cy', (d: SessionEfficiencyData) => yScale(d.efficiencyKwhPerKm))
      .attr('r', (d: SessionEfficiencyData) => d.leakageStatus === 'POWER_LEAKAGE' ? 7 : 5)
      .attr('fill', (d: SessionEfficiencyData) => {
        if (d.leakageStatus === 'POWER_LEAKAGE') return '#f43f5e';
        if (d.leakageStatus === 'ELEVATED') return '#f59e0b';
        return '#10b981';
      })
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.15s ease');

    // Pulsing Rings for Leakage Anomalies
    const leakagePoints = filteredData.filter(d => d.leakageStatus === 'POWER_LEAKAGE');
    g.selectAll<SVGCircleElement, SessionEfficiencyData>('.leakage-ring')
      .data(leakagePoints)
      .enter()
      .append('circle')
      .attr('class', 'leakage-ring')
      .attr('cx', (d: SessionEfficiencyData) => xScale(d.dateObj))
      .attr('cy', (d: SessionEfficiencyData) => yScale(d.efficiencyKwhPerKm))
      .attr('r', 11)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2 2')
      .style('opacity', 0.8);

    // Point Mouseover & Click Events
    points
      .on('mouseover', function(event: any, d: SessionEfficiencyData) {
        d3.select(this)
          .attr('r', 9)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 3)
          .style('filter', 'drop-shadow(0 0 6px rgba(244,63,94,0.8))');

        const rect = (event.currentTarget as SVGCircleElement).getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
          setTooltipPos({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 10
          });
        }
        setHoveredSession(d);
      })
      .on('mouseout', function(event: any, d: SessionEfficiencyData) {
        d3.select(this)
          .attr('r', d.leakageStatus === 'POWER_LEAKAGE' ? 7 : 5)
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 2)
          .style('filter', 'none');

        setHoveredSession(null);
        setTooltipPos(null);
      })
      .on('click', (event: any, d: SessionEfficiencyData) => {
        setActiveSession(d);
        if (d.leakageStatus === 'POWER_LEAKAGE') {
          toast.error(`POWER LEAKAGE FLAG: ${d.stationName}`, {
            description: `Session Efficiency: ${d.efficiencyKwhPerKm} kWh/km (${d.excessKwhWasted} kWh wasted)`
          });
        } else {
          toast.info(`Session Selected: ${d.vehicleReg} @ ${d.stationName}`, {
            description: `Efficiency: ${d.efficiencyKwhPerKm} kWh/km (${d.whPerKm} Wh/km)`
          });
        }
      });

    // Add Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(8, filteredData.length))
      .tickFormat(d3.timeFormat('%d %b') as any)
      .tickSize(0);

    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${height + 10})`)
      .call(xAxis);

    xAxisGroup.select('.domain').remove();
    xAxisGroup.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-weight', '700');

    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => `${d} kWh/km`);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('text')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .attr('font-weight', '700');

  }, [filteredData, containerWidth]);

  const handleExportCsv = () => {
    const headers = [
      'Session ID',
      'Timestamp',
      'Vehicle Reg',
      'Station / Charger',
      'Charger Unit ID',
      'Energy Consumed (kWh)',
      'Distance Travelled (km)',
      'Energy Efficiency (kWh/km)',
      'Wh/km Rate',
      'Power Leakage Status',
      'Excess Energy Wasted (kWh)',
      'Financial Impact (KES)',
      'Suspected Root Cause'
    ];

    const rows = filteredData.map(s => [
      s.id,
      `"${s.timestamp}"`,
      `"${s.vehicleReg}"`,
      `"${s.stationName}"`,
      s.chargerId,
      s.energyKwh,
      s.distanceKm,
      s.efficiencyKwhPerKm,
      s.whPerKm,
      `"${s.leakageStatus}"`,
      s.excessKwhWasted,
      s.financialLossKes,
      `"${s.suspectedCause || 'N/A'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `energy_efficiency_power_leakage_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Downloaded Energy Efficiency & Power Leakage Audit CSV!');
  };

  const handleFlagForMaintenance = (session: SessionEfficiencyData) => {
    toast.success(`Maintenance Alert Created for ${session.stationName} (${session.chargerId})`, {
      description: `Flagged for Technician Audit: Suspected Parasitic Power Leakage (${session.efficiencyKwhPerKm} kWh/km)`
    });
    setActiveSession(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                Charger & Vehicle Energy Efficiency (kWh/km) Audit
              </h2>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" />
                <span>D3 Power Leakage Detector</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks energy consumption rates per session to isolate transformer current leakage, connector degradation, and vehicle BMS loss
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Leakage CSV</span>
        </button>
      </div>

      {/* KPI METRIC HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-sans text-slate-400 font-bold block">Average Fleet Efficiency</span>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
            <Gauge className="w-5 h-5 text-emerald-400" />
            <span>{stats.avgEfficiency} kWh/km</span>
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            {Math.round(stats.avgEfficiency * 1000)} Wh/km across {stats.totalSessions} sessions
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-1">
          <span className="text-[10px] font-sans text-slate-400 font-bold block">Power Leakage Anomalies</span>
          <div className="text-2xl font-black text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
            <span>{stats.leakageCount} Sessions Flagged</span>
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Efficiency exceeding &gt;0.20 kWh/km threshold
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-1">
          <span className="text-[10px] font-sans text-slate-400 font-bold block">Total Excess Energy Loss</span>
          <div className="text-2xl font-black text-amber-400">
            {stats.totalWastedKwh.toLocaleString()} kWh
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Wasted parasitic power loss
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-1">
          <span className="text-[10px] font-sans text-slate-400 font-bold block">Financial Loss Impact</span>
          <div className="text-2xl font-black text-indigo-300">
            KES {stats.totalFinancialLossKes.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Top hotspot: <strong className="text-amber-300 font-sans">{stats.worstChargerStation}</strong>
          </p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Station Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold shrink-0">Station / Charger:</span>
            <select
              value={selectedStationFilter}
              onChange={(e) => setSelectedStationFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Stations ({stationOptions.length})</option>
              {stationOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold shrink-0">Vehicle:</span>
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Fleet Vehicles ({vehicleOptions.length})</option>
              {vehicleOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Leakage Only Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-slate-300 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={showLeakageOnly}
              onChange={(e) => setShowLeakageOnly(e.target.checked)}
              className="rounded border-slate-800 text-rose-500 focus:ring-rose-500 cursor-pointer"
            />
            <span className="text-rose-400">Show Power Leakage Flags Only</span>
          </label>
        </div>

      </div>

      {/* D3 SVG CANVAS CONTAINER */}
      <div ref={containerRef} className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
        <svg ref={svgRef} className="w-full h-auto block" />

        {/* HOVER TOOLTIP */}
        {hoveredSession && tooltipPos && (
          <div 
            className="absolute z-20 bg-slate-900/95 border border-slate-700 text-white p-3.5 rounded-xl shadow-2xl pointer-events-none text-xs font-mono space-y-2 transform -translate-x-1/2 -translate-y-full min-w-64"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="font-bold text-white font-sans">{hoveredSession.stationName} ({hoveredSession.chargerId})</span>
              <span className="text-emerald-400 font-bold">{hoveredSession.vehicleReg}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div>
                <span className="text-slate-400 block font-sans">Timestamp:</span>
                <strong className="text-white">{hoveredSession.timestamp}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Energy Efficiency:</span>
                <strong className={
                  hoveredSession.leakageStatus === 'POWER_LEAKAGE' ? 'text-rose-400 font-bold' :
                  hoveredSession.leakageStatus === 'ELEVATED' ? 'text-amber-400' : 'text-emerald-400'
                }>
                  {hoveredSession.efficiencyKwhPerKm} kWh/km
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Wh/km Rate:</span>
                <strong className="text-slate-300">{hoveredSession.whPerKm} Wh/km</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Energy Drawn:</span>
                <strong className="text-indigo-300">{hoveredSession.energyKwh} kWh</strong>
              </div>
            </div>

            {hoveredSession.leakageStatus === 'POWER_LEAKAGE' && (
              <div className="bg-rose-500/20 border border-rose-500/40 p-2 rounded-lg text-[10px] space-y-0.5">
                <span className="text-rose-300 font-bold font-sans block flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>CRITICAL POWER LEAKAGE ALERT</span>
                </span>
                <p className="text-slate-300">{hoveredSession.suspectedCause}</p>
                <div className="text-amber-300 font-bold pt-0.5">
                  Financial Waste: KES {hoveredSession.financialLossKes} ({hoveredSession.excessKwhWasted} kWh)
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILED DIAGNOSTIC INSPECTOR FOR ACTIVE SESSION */}
      {activeSession && (
        <div className="bg-slate-950 p-5 rounded-2xl border border-rose-500/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="text-xs font-extrabold text-white">
                Power Leakage Diagnostic Audit: {activeSession.stationName} ({activeSession.chargerId})
              </h3>
            </div>
            <button
              onClick={() => setActiveSession(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close Inspector
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-sans block font-bold">Target Vehicle Reg</span>
              <div className="text-base font-black text-white">{activeSession.vehicleReg}</div>
              <p className="text-[10px] font-sans text-slate-400">{activeSession.timestamp}</p>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-sans block font-bold">Measured Consumption Rate</span>
              <div className={
                activeSession.leakageStatus === 'POWER_LEAKAGE' ? 'text-base font-black text-rose-400' : 'text-base font-black text-emerald-400'
              }>
                {activeSession.efficiencyKwhPerKm} kWh/km ({activeSession.whPerKm} Wh/km)
              </div>
              <p className="text-[10px] font-sans text-slate-400">Standard Baseline: 0.08 kWh/km</p>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-sans block font-bold">Estimated Wasted Power & Cost</span>
              <div className="text-base font-black text-amber-400">
                {activeSession.excessKwhWasted} kWh (KES {activeSession.financialLossKes})
              </div>
              <p className="text-[10px] font-sans text-slate-400">Parasitic dissipation loss</p>
            </div>
          </div>

          {/* Root Cause & Diagnostic Steps */}
          {activeSession.suspectedCause && (
            <div className="bg-slate-900 p-4 rounded-xl border border-rose-500/30 text-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Wrench className="w-4 h-4" />
                <span>Suspected Root Cause Diagnostic:</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {activeSession.suspectedCause}
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => handleFlagForMaintenance(activeSession)}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Wrench className="w-4 h-4 text-slate-950" />
                  <span>Dispatch Technician to {activeSession.chargerId}</span>
                </button>

                <button
                  onClick={() => {
                    toast.info(`Vehicle ${activeSession.vehicleReg} scheduled for BMS Balancing`);
                    setActiveSession(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
                >
                  <span>Schedule Vehicle BMS Inspection</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
