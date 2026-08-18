import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { EvBatterySession, Vehicle, BatterySwapRecord } from '../types';
import { 
  Zap, Thermometer, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  Filter, Download, RefreshCw, Info, Sparkles, Activity, Layers, ArrowUpRight,
  Compass, Navigation, Sun, Flame, Wind, Gauge, HelpCircle, AlertCircle, BarChart2
} from 'lucide-react';
import { toast } from 'sonner';

interface EvEfficiencyComparisonD3ChartProps {
  evSessions?: EvBatterySession[];
  vehicles?: Vehicle[];
  swapRecords?: BatterySwapRecord[];
}

export interface EvTripEfficiencyRecord {
  id: string;
  vehicleReg: string;
  vehicleType: string; // 'Roam Air 2W' | 'Spiro e-Moto' | 'BYD T3 Cargo Van' | 'Opibus e-Bus' | 'GreenShift Shuttle'
  ambientTempC: number; // e.g. 16°C to 40°C
  tripDistanceKm: number; // e.g. 4.5 km to 78.0 km
  energyConsumedKwh: number;
  efficiencyKwhPerKm: number; // kWh/km
  whPerKm: number; // Wh/km
  hvacUsage: 'OFF' | 'FAN_ONLY' | 'AC_COOLING' | 'MAX_COOLING_35C';
  batteryStartSoC: number;
  batteryEndSoC: number;
  batteryTempC: number;
  terrain: 'Flat Urban' | 'Hilly Terrain' | 'Highway Corridor' | 'Dense Traffic';
  payloadWeightKg: number;
  timestamp: string;
  dateObj: Date;
  rangePenaltyPercent: number; // Range impact % vs optimal baseline (22°C)
}

export const EvEfficiencyComparisonD3Chart: React.FC<EvEfficiencyComparisonD3ChartProps> = ({
  evSessions = [],
  vehicles = [],
  swapRecords = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Responsive Width
  const [containerWidth, setContainerWidth] = useState<number>(850);

  // Filter & Toggle States
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('ALL');
  const [selectedDistanceRange, setSelectedDistanceRange] = useState<string>('ALL');
  const [colorByDimension, setColorByDimension] = useState<'vehicleType' | 'hvacUsage' | 'terrain' | 'efficiencyLevel'>('vehicleType');
  const [showThermalZone, setShowThermalZone] = useState<boolean>(true);
  const [showTrendlines, setShowTrendlines] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<EvTripEfficiencyRecord | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<EvTripEfficiencyRecord | null>(null);
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

  // Generate / Derived EV Trip Efficiency dataset
  const tripEfficiencyData: EvTripEfficiencyRecord[] = useMemo(() => {
    const list: EvTripEfficiencyRecord[] = [];

    // Base seed vehicles
    const vehicleModels = [
      { reg: 'KMG 482E', type: 'Roam Air 2W', baseKwhKm: 0.048, weight: 120 },
      { reg: 'KDH 109G', type: 'Spiro e-Moto', baseKwhKm: 0.052, weight: 135 },
      { reg: 'KDJ 883P', type: 'BYD T3 Cargo Van', baseKwhKm: 0.145, weight: 1450 },
      { reg: 'KBZ 772M', type: 'GreenShift Shuttle', baseKwhKm: 0.110, weight: 890 },
      { reg: 'KDK 302A', type: 'Opibus e-Bus', baseKwhKm: 0.185, weight: 3200 },
      { reg: 'KDM 512L', type: 'Roam Air 2W', baseKwhKm: 0.046, weight: 110 },
      { reg: 'KCX 901D', type: 'BYD T3 Cargo Van', baseKwhKm: 0.140, weight: 1380 },
    ];

    const terrains: ('Flat Urban' | 'Hilly Terrain' | 'Highway Corridor' | 'Dense Traffic')[] = [
      'Flat Urban', 'Hilly Terrain', 'Highway Corridor', 'Dense Traffic'
    ];

    // Generate 42 realistic trip points across temperatures (16°C to 40°C) and distances (4 km to 82 km)
    const totalPoints = 42;
    for (let i = 0; i < totalPoints; i++) {
      const v = vehicleModels[i % vehicleModels.length];
      
      // Temperature distribution (Nairobi morning 17°C to afternoon 38°C peak)
      const ambientTempC = Math.round(16 + (i / totalPoints) * 23 + (Math.sin(i * 1.5) * 2.5));
      
      // Distance distribution (4km to 80km)
      const tripDistanceKm = Math.round(4 + ((i * 7) % 76) + (Math.cos(i) * 3));
      const distanceClamped = Math.max(3.5, tripDistanceKm);

      // Temperature penalty curve (Ideal range 20°C - 26°C)
      let tempPenaltyFactor = 1.0;
      if (ambientTempC < 20) {
        tempPenaltyFactor = 1.0 + (20 - ambientTempC) * 0.025; // Cold battery resistance
      } else if (ambientTempC > 26) {
        tempPenaltyFactor = 1.0 + Math.pow(ambientTempC - 26, 1.4) * 0.018; // Heat + AC cooling draw
      }

      // Distance penalty factor: Short trips (<12km) consume more Wh/km due to thermal initialization & stop-and-go
      let distancePenaltyFactor = 1.0;
      if (distanceClamped < 12) {
        distancePenaltyFactor = 1.0 + (12 - distanceClamped) * 0.018;
      } else if (distanceClamped > 45) {
        distancePenaltyFactor = 0.94; // Cruise efficiency on highways
      }

      // Terrain factor
      const terrain = terrains[i % terrains.length];
      let terrainFactor = 1.0;
      if (terrain === 'Hilly Terrain') terrainFactor = 1.22;
      if (terrain === 'Dense Traffic') terrainFactor = 1.15;
      if (terrain === 'Highway Corridor') terrainFactor = 0.92;

      // Determine HVAC usage based on temperature
      let hvacUsage: 'OFF' | 'FAN_ONLY' | 'AC_COOLING' | 'MAX_COOLING_35C' = 'OFF';
      if (ambientTempC >= 24 && ambientTempC < 29) hvacUsage = 'FAN_ONLY';
      else if (ambientTempC >= 29 && ambientTempC < 34) hvacUsage = 'AC_COOLING';
      else if (ambientTempC >= 34) hvacUsage = 'MAX_COOLING_35C';

      // Total calculated efficiency (kWh / km)
      const rawEfficiency = v.baseKwhKm * tempPenaltyFactor * distancePenaltyFactor * terrainFactor;
      const efficiencyKwhPerKm = Math.round(rawEfficiency * 1000) / 1000;
      const whPerKm = Math.round(efficiencyKwhPerKm * 1000);
      const energyConsumedKwh = Math.round(efficiencyKwhPerKm * distanceClamped * 10) / 10;

      // Range penalty vs optimal 22°C baseline
      const optimalBaseline = v.baseKwhKm;
      const rangePenaltyPercent = Math.round(((efficiencyKwhPerKm - optimalBaseline) / optimalBaseline) * 100);

      // Battery Temp
      const batteryTempC = Math.round(ambientTempC + 6 + (energyConsumedKwh * 0.8));

      // Timestamps across last 14 days
      const d = new Date();
      d.setDate(d.getDate() - (i % 14));
      d.setHours(8 + (i % 11), (i * 17) % 60);

      list.push({
        id: `trip-${i + 1}`,
        vehicleReg: v.reg,
        vehicleType: v.type,
        ambientTempC,
        tripDistanceKm: distanceClamped,
        energyConsumedKwh,
        efficiencyKwhPerKm,
        whPerKm,
        hvacUsage,
        batteryStartSoC: Math.min(100, 85 + (i % 15)),
        batteryEndSoC: Math.max(10, 85 + (i % 15) - Math.round(energyConsumedKwh * 4)),
        batteryTempC,
        terrain,
        payloadWeightKg: v.weight + ((i * 15) % 180),
        timestamp: `${d.toLocaleDateString('en-KE')} ${d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`,
        dateObj: d,
        rangePenaltyPercent
      });
    }

    return list;
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return tripEfficiencyData.filter(d => {
      // Vehicle type filter
      const matchesType = selectedVehicleType === 'ALL' || d.vehicleType === selectedVehicleType;

      // Distance range filter
      let matchesDist = true;
      if (selectedDistanceRange === 'SHORT') matchesDist = d.tripDistanceKm < 15;
      else if (selectedDistanceRange === 'MEDIUM') matchesDist = d.tripDistanceKm >= 15 && d.tripDistanceKm <= 40;
      else if (selectedDistanceRange === 'LONG') matchesDist = d.tripDistanceKm > 40;

      return matchesType && matchesDist;
    });
  }, [tripEfficiencyData, selectedVehicleType, selectedDistanceRange]);

  // Aggregate Key Statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { avgEff: 0, optimalAvg: 0, highHeatAvg: 0, heatPenalty: 0, shortTripFactor: 0 };
    }

    const avgEff = d3.mean(filteredData, (d: EvTripEfficiencyRecord) => d.efficiencyKwhPerKm) || 0;
    
    // Optimal zone (20°C - 26°C)
    const optimalPoints = filteredData.filter(d => d.ambientTempC >= 20 && d.ambientTempC <= 26);
    const optimalAvg = d3.mean(optimalPoints, (d: EvTripEfficiencyRecord) => d.efficiencyKwhPerKm) || avgEff;

    // High heat zone (>32°C)
    const highHeatPoints = filteredData.filter(d => d.ambientTempC > 32);
    const highHeatAvg = d3.mean(highHeatPoints, (d: EvTripEfficiencyRecord) => d.efficiencyKwhPerKm) || (optimalAvg * 1.25);

    // Heat penalty %
    const heatPenalty = optimalAvg > 0 ? Math.round(((highHeatAvg - optimalAvg) / optimalAvg) * 100) : 0;

    // Short trip vs Long trip factor
    const shortTrips = filteredData.filter(d => d.tripDistanceKm < 15);
    const longTrips = filteredData.filter(d => d.tripDistanceKm > 35);
    const shortAvg = d3.mean(shortTrips, (d: EvTripEfficiencyRecord) => d.efficiencyKwhPerKm) || avgEff;
    const longAvg = d3.mean(longTrips, (d: EvTripEfficiencyRecord) => d.efficiencyKwhPerKm) || avgEff;
    const shortTripFactor = longAvg > 0 ? Math.round(((shortAvg - longAvg) / longAvg) * 100) : 0;

    return {
      avgEff: Math.round(avgEff * 1000) / 1000,
      optimalAvg: Math.round(optimalAvg * 1000) / 1000,
      highHeatAvg: Math.round(highHeatAvg * 1000) / 1000,
      heatPenalty,
      shortTripFactor
    };
  }, [filteredData]);

  // Color Mapping Helper
  const getColorForPoint = (d: EvTripEfficiencyRecord) => {
    if (colorByDimension === 'vehicleType') {
      switch (d.vehicleType) {
        case 'Roam Air 2W': return '#10b981'; // Emerald
        case 'Spiro e-Moto': return '#06b6d4'; // Cyan
        case 'BYD T3 Cargo Van': return '#f59e0b'; // Amber
        case 'Opibus e-Bus': return '#ef4444'; // Red
        case 'GreenShift Shuttle': return '#8b5cf6'; // Purple
        default: return '#3b82f6';
      }
    } else if (colorByDimension === 'hvacUsage') {
      switch (d.hvacUsage) {
        case 'OFF': return '#10b981';
        case 'FAN_ONLY': return '#06b6d4';
        case 'AC_COOLING': return '#f59e0b';
        case 'MAX_COOLING_35C': return '#f43f5e';
      }
    } else if (colorByDimension === 'terrain') {
      switch (d.terrain) {
        case 'Flat Urban': return '#10b981';
        case 'Highway Corridor': return '#3b82f6';
        case 'Dense Traffic': return '#f59e0b';
        case 'Hilly Terrain': return '#f43f5e';
      }
    } else if (colorByDimension === 'efficiencyLevel') {
      if (d.efficiencyKwhPerKm <= 0.08) return '#10b981'; // Highly Efficient
      if (d.efficiencyKwhPerKm <= 0.15) return '#f59e0b'; // Moderate
      return '#f43f5e'; // High Energy Drain
    }
    return '#10b981';
  };

  // Render D3 Scatter & Trendline Visualization
  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Chart Dimensions
    const margin = { top: 35, right: 40, bottom: 55, left: 65 };
    const width = Math.max(300, containerWidth - margin.left - margin.right);
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Ambient Temperature (°C)
    const minTemp = Math.min(15, (d3.min(filteredData, (d: EvTripEfficiencyRecord) => d.ambientTempC) || 16) - 1);
    const maxTemp = Math.max(42, (d3.max(filteredData, (d: EvTripEfficiencyRecord) => d.ambientTempC) || 38) + 2);

    const xScale = d3.scaleLinear()
      .domain([minTemp, maxTemp])
      .range([0, width]);

    // Y Scale: Energy Consumption (kWh/km)
    const maxEffVal = d3.max(filteredData, (d: EvTripEfficiencyRecord) => d.efficiencyKwhPerKm) || 0.20;
    const minEffVal = d3.min(filteredData, (d: EvTripEfficiencyRecord) => d.efficiencyKwhPerKm) || 0.03;

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(0.24, maxEffVal * 1.15)])
      .range([height, 0]);

    // Bubble Radius Scale: Trip Distance (km)
    const distExtent = d3.extent(filteredData, (d: EvTripEfficiencyRecord) => d.tripDistanceKm) as [number, number];
    const rScale = d3.scaleSqrt()
      .domain([distExtent[0] || 4, distExtent[1] || 80])
      .range([5, 14]);

    // 1. BACKGROUND HIGHLIGHT ZONES
    if (showThermalZone) {
      // Optimal Thermal Zone Band (20°C to 26°C)
      const xOptStart = xScale(20);
      const xOptEnd = xScale(26);

      g.append('rect')
        .attr('x', xOptStart)
        .attr('y', 0)
        .attr('width', Math.max(0, xOptEnd - xOptStart))
        .attr('height', height)
        .attr('fill', '#10b981')
        .attr('fill-opacity', 0.07)
        .attr('stroke', '#10b981')
        .attr('stroke-opacity', 0.25)
        .attr('stroke-dasharray', '3,3');

      g.append('text')
        .attr('x', xOptStart + (xOptEnd - xOptStart) / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#34d399')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('Optimal Battery Operating Zone (20°C - 26°C)');

      // High Heat Degradation Zone Band (> 32°C)
      const xHeatStart = xScale(32);
      const xHeatEnd = xScale(maxTemp);

      g.append('rect')
        .attr('x', xHeatStart)
        .attr('y', 0)
        .attr('width', Math.max(0, xHeatEnd - xHeatStart))
        .attr('height', height)
        .attr('fill', '#f43f5e')
        .attr('fill-opacity', 0.06)
        .attr('stroke', '#f43f5e')
        .attr('stroke-opacity', 0.2)
        .attr('stroke-dasharray', '3,3');

      g.append('text')
        .attr('x', xHeatStart + (xHeatEnd - xHeatStart) / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f87171')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('High Ambient Heat Range Penalty Zone (>32°C)');
    }

    // 2. GRID LINES
    const xGrid = d3.axisBottom(xScale).ticks(8).tickSize(-height).tickFormat(() => '');
    const yGrid = d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(xGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.4);

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.4);

    // Remove domain path on grid
    g.selectAll('.grid .domain').remove();

    // 3. AXES
    const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d}°C`);
    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d => `${d} kWh`);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .attr('color', '#94a3b8')
      .selectAll('text')
      .style('font-size', '11px')
      .style('font-family', 'monospace');

    // X Axis Label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 42)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text('Ambient Air Temperature (°C)');

    // Y Axis
    g.append('g')
      .call(yAxis)
      .attr('color', '#94a3b8')
      .selectAll('text')
      .style('font-size', '11px')
      .style('font-family', 'monospace');

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text('Energy Consumption (kWh / km)');

    // 4. POLYNOMIAL / SMOOTH REGRESSION TRENDLINE
    if (showTrendlines && filteredData.length > 4) {
      // Calculate binned averages for smooth curve fitting across ambient temp
      const tempBins = d3.group(filteredData, (d: EvTripEfficiencyRecord) => Math.round(d.ambientTempC / 2) * 2);
      const binnedPoints = Array.from(tempBins, ([temp, points]) => ({
        temp: Number(temp),
        avgEff: d3.mean(points, (p: EvTripEfficiencyRecord) => p.efficiencyKwhPerKm) || 0
      })).sort((a, b) => a.temp - b.temp);

      const lineGenerator = d3.line<{ temp: number; avgEff: number }>()
        .x(d => xScale(d.temp))
        .y(d => yScale(d.avgEff))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(binnedPoints)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '5,4')
        .attr('d', lineGenerator);

      // Trendline Legend / Label
      const lastPoint = binnedPoints[binnedPoints.length - 1];
      if (lastPoint) {
        g.append('text')
          .attr('x', Math.min(width - 10, xScale(lastPoint.temp) + 6))
          .attr('y', yScale(lastPoint.avgEff) - 6)
          .attr('fill', '#f59e0b')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text('Efficiency Trend Curve');
      }
    }

    // 5. DATA POINTS (BUBBLES)
    const dotsGroup = g.append('g').attr('class', 'data-points');

    const circles = dotsGroup.selectAll<SVGCircleElement, EvTripEfficiencyRecord>('circle')
      .data(filteredData, (d: any) => d.id)
      .enter()
      .append('circle')
      .attr('cx', (d: EvTripEfficiencyRecord) => xScale(d.ambientTempC))
      .attr('cy', (d: EvTripEfficiencyRecord) => yScale(d.efficiencyKwhPerKm))
      .attr('r', (d: EvTripEfficiencyRecord) => rScale(d.tripDistanceKm))
      .attr('fill', (d: EvTripEfficiencyRecord) => getColorForPoint(d))
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', (d: EvTripEfficiencyRecord) => selectedPoint?.id === d.id ? 2.5 : 1)
      .attr('stroke-opacity', (d: EvTripEfficiencyRecord) => selectedPoint?.id === d.id ? 1 : 0.6)
      .style('cursor', 'pointer');

    // Interactive Hover & Click Events
    circles
      .on('mouseover', function(event: any, d: EvTripEfficiencyRecord) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', rScale(d.tripDistanceKm) + 4)
          .attr('fill-opacity', 0.95)
          .attr('stroke-width', 2.5)
          .attr('stroke', '#ffffff');

        const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
        setHoveredPoint(d);
        setTooltipPos({ x: mouseX, y: mouseY });
      })
      .on('mouseout', function(event: any, d: EvTripEfficiencyRecord) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', rScale(d.tripDistanceKm))
          .attr('fill-opacity', 0.7)
          .attr('stroke-width', selectedPoint?.id === d.id ? 2.5 : 1)
          .attr('stroke', '#ffffff');

        setHoveredPoint(null);
        setTooltipPos(null);
      })
      .on('click', (event: any, d: EvTripEfficiencyRecord) => {
        setSelectedPoint(d);
        toast.info(`Selected Trip: ${d.vehicleReg} (${d.vehicleType})`, {
          description: `${d.ambientTempC}°C | ${d.tripDistanceKm}km | ${d.efficiencyKwhPerKm} kWh/km (${d.whPerKm} Wh/km)`
        });
      });

  }, [filteredData, containerWidth, colorByDimension, showThermalZone, showTrendlines, selectedPoint]);

  // Download CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Trip ID', 'Vehicle Reg', 'Vehicle Type', 'Ambient Temp (°C)', 'Trip Distance (km)',
      'Energy Consumed (kWh)', 'Efficiency (kWh/km)', 'Wh/km', 'HVAC Usage', 'Terrain',
      'Start SoC (%)', 'End SoC (%)', 'Battery Temp (°C)', 'Range Penalty (%)', 'Timestamp'
    ];

    const rows = filteredData.map(d => [
      d.id, d.vehicleReg, d.vehicleType, d.ambientTempC, d.tripDistanceKm,
      d.energyConsumedKwh, d.efficiencyKwhPerKm, d.whPerKm, d.hvacUsage, d.terrain,
      d.batteryStartSoC, d.batteryEndSoC, d.batteryTempC, d.rangePenaltyPercent, `"${d.timestamp}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EV_Efficiency_Temperature_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('EV Efficiency & Ambient Temperature CSV Exported!');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner & Insight Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">EV Efficiency vs Ambient Temperature & Distance</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                D3 Multivariable Plot
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Plots energy consumption (<strong className="text-white">kWh/km</strong>) against ambient air temperature (°C) and trip distance (km bubble scale). Identifies battery range penalties caused by thermal stress, AC cooling load, and short-trip initialization friction.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Analytic Impact Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Optimal Operating Temp</span>
              <Sun className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">20°C - 26°C</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Avg: <strong className="text-white">{stats.optimalAvg} kWh/km</strong> (lowest drain)
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>High Heat Range Penalty</span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-black text-rose-400 mt-0.5">+{stats.heatPenalty}% Energy Drain</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Above 32°C: <strong className="text-white">{stats.highHeatAvg} kWh/km</strong>
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Short Trip Factor (&lt;15km)</span>
              <Compass className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-400 mt-0.5">+{stats.shortTripFactor}% Wh/km</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Thermal warmup & stop-and-go friction
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Filtered Fleet Average</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-cyan-300 mt-0.5">{stats.avgEff} kWh/km</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ({Math.round(stats.avgEff * 1000)} Wh/km) across {filteredData.length} trips
            </p>
          </div>

        </div>

      </div>

      {/* Interactive Controls & Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Filter Options */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Vehicle Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-300 font-medium">Vehicle Category:</span>
            <select
              value={selectedVehicleType}
              onChange={(e) => setSelectedVehicleType(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-lg text-xs px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Vehicles ({tripEfficiencyData.length})</option>
              <option value="Roam Air 2W">Roam Air 2W Motorcycles</option>
              <option value="Spiro e-Moto">Spiro e-Moto 2W</option>
              <option value="BYD T3 Cargo Van">BYD T3 Cargo Vans</option>
              <option value="GreenShift Shuttle">GreenShift Passenger Shuttles</option>
              <option value="Opibus e-Bus">Opibus Electric Buses</option>
            </select>
          </div>

          {/* Distance Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-300 font-medium">Trip Distance:</span>
            <select
              value={selectedDistanceRange}
              onChange={(e) => setSelectedDistanceRange(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-lg text-xs px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Distances</option>
              <option value="SHORT">Short Urban (&lt; 15 km)</option>
              <option value="MEDIUM">Regional Corridor (15 - 40 km)</option>
              <option value="LONG">Long Range (&gt; 40 km)</option>
            </select>
          </div>

          {/* Color Dimension Selector */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-300 font-medium">Color By:</span>
            <select
              value={colorByDimension}
              onChange={(e) => setColorByDimension(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-white rounded-lg text-xs px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
            >
              <option value="vehicleType">Vehicle Type / Model</option>
              <option value="hvacUsage">HVAC / AC Cooling Load</option>
              <option value="terrain">Route Terrain Profile</option>
              <option value="efficiencyLevel">Efficiency Tier (kWh/km)</option>
            </select>
          </div>

        </div>

        {/* Right Feature Toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showThermalZone}
              onChange={(e) => setShowThermalZone(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
            />
            <span>Highlight Thermal Zones</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showTrendlines}
              onChange={(e) => setShowTrendlines(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
            />
            <span>Show Trend Curve</span>
          </label>
        </div>

      </div>

      {/* Main D3 Chart Display Container */}
      <div ref={containerRef} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative min-h-[440px]">
        
        {/* Dynamic Legend Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-800/80 text-xs">
          
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Legend ({colorByDimension}):</span>
            
            {colorByDimension === 'vehicleType' && (
              <>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Roam Air 2W</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Spiro e-Moto</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> BYD T3 Cargo</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> GreenShift Shuttle</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Opibus e-Bus</span>
              </>
            )}

            {colorByDimension === 'hvacUsage' && (
              <>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> HVAC Off</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Fan Only</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> AC Cooling</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Max AC (35°C+)</span>
              </>
            )}

            {colorByDimension === 'terrain' && (
              <>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Flat Urban</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Highway Corridor</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Dense Traffic</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Hilly Terrain</span>
              </>
            )}

            {colorByDimension === 'efficiencyLevel' && (
              <>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Optimal (&le;0.08 kWh/km)</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Moderate (0.08-0.15)</span>
                <span className="flex items-center gap-1 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> High Drain (&gt;0.15)</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
            <span>Bubble Radius = Trip Distance (km)</span>
          </div>

        </div>

        {/* SVG Render Area */}
        <svg
          ref={svgRef}
          width={containerWidth}
          height={380}
          className="w-full overflow-visible"
        />

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && tooltipPos && (
          <div
            className="absolute z-30 bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl pointer-events-none text-xs w-64 space-y-2"
            style={{
              left: Math.min(containerWidth - 270, Math.max(10, tooltipPos.x + 12)),
              top: Math.max(10, tooltipPos.y - 120)
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>{hoveredPoint.vehicleReg}</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">
                {hoveredPoint.vehicleType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px]">Ambient Air Temp</span>
                <span className="font-bold text-amber-300 font-mono">{hoveredPoint.ambientTempC}°C</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Trip Distance</span>
                <span className="font-bold text-cyan-300 font-mono">{hoveredPoint.tripDistanceKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Efficiency Rate</span>
                <span className="font-bold text-emerald-400 font-mono">{hoveredPoint.efficiencyKwhPerKm} kWh/km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Wh / km Drain</span>
                <span className="font-bold text-white font-mono">{hoveredPoint.whPerKm} Wh/km</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-300">
              <span>HVAC: <strong className="text-amber-300">{hoveredPoint.hvacUsage}</strong></span>
              <span>Range Penalty: <strong className={hoveredPoint.rangePenaltyPercent > 15 ? 'text-rose-400' : 'text-emerald-400'}>+{hoveredPoint.rangePenaltyPercent}%</strong></span>
            </div>
          </div>
        )}

      </div>

      {/* Selected Trip Detail Card Inspector */}
      {selectedPoint && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 shadow-xl space-y-4 relative">
          
          <button
            onClick={() => setSelectedPoint(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Trip Inspector Analysis</span>
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  {selectedPoint.timestamp}
                </span>
              </div>
              <h4 className="text-base font-black text-white mt-0.5">
                {selectedPoint.vehicleReg} ({selectedPoint.vehicleType})
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400 block font-sans text-[10px]">Ambient Temp</span>
              <span className="text-amber-300 font-bold text-sm">{selectedPoint.ambientTempC}°C</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[10px]">Trip Distance</span>
              <span className="text-cyan-300 font-bold text-sm">{selectedPoint.tripDistanceKm} km</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[10px]">Efficiency (kWh/km)</span>
              <span className="text-emerald-400 font-bold text-sm">{selectedPoint.efficiencyKwhPerKm}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[10px]">Energy Consumed</span>
              <span className="text-white font-bold text-sm">{selectedPoint.energyConsumedKwh} kWh</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[10px]">Battery Temp</span>
              <span className="text-rose-400 font-bold text-sm">{selectedPoint.batteryTempC}°C</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block font-bold text-[10px] uppercase">HVAC & Auxiliary Load</span>
              <div className="text-amber-300 font-bold mt-1">{selectedPoint.hvacUsage}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Air conditioning compressor draw during trip</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Terrain & Payload</span>
              <div className="text-white font-bold mt-1">{selectedPoint.terrain} ({selectedPoint.payloadWeightKg} kg)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Road elevation incline and cargo loading</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Calculated Range Penalty</span>
              <div className={`font-bold mt-1 text-sm ${selectedPoint.rangePenaltyPercent > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                +{selectedPoint.rangePenaltyPercent}% Energy Drain
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Compared to 22°C ambient thermal baseline</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
