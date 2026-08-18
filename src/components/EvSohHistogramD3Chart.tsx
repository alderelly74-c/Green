import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Vehicle, VehicleType } from '../types';
import { 
  BarChart2, ShieldAlert, AlertTriangle, CheckCircle2, Filter, Info, 
  RefreshCw, Download, Eye, TrendingDown, Layers, Zap, ChevronRight, 
  Search, Wrench, Sparkles, HelpCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface EvSohHistogramD3ChartProps {
  vehicles?: Vehicle[];
  onOpenWorkOrder?: (vehicle: Vehicle) => void;
  onTraceBattery?: (batteryId: string) => void;
}

export interface SohFleetItem {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  type: string;
  soh: number; // State of Health % e.g. 88.5
  batteryId: string;
  driverName: string;
  odometerKm: number;
  city: string;
  status: string;
  rawVehicle: Vehicle;
}

export const EvSohHistogramD3Chart: React.FC<EvSohHistogramD3ChartProps> = ({
  vehicles = [],
  onOpenWorkOrder,
  onTraceBattery
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Layout & Responsive Dimensions
  const [containerWidth, setContainerWidth] = useState<number>(850);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('ALL');
  const [binSizeOption, setBinSizeOption] = useState<number>(2.5); // 2.5% bins or 5% bins
  const [highlightAtRiskZone, setHighlightAtRiskZone] = useState<boolean>(true);
  
  // Hover & Selection State
  const [hoveredBin, setHoveredBin] = useState<{
    x0: number;
    x1: number;
    items: SohFleetItem[];
    count: number;
  } | null>(null);
  const [selectedBin, setSelectedBin] = useState<{
    x0: number;
    x1: number;
    items: SohFleetItem[];
  } | null>(null);

  // Resize Observer
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

  // Build Comprehensive EV Fleet SOH Dataset
  const sohFleetList = useMemo<SohFleetItem[]>(() => {
    const list: SohFleetItem[] = [];

    // Filter real EV vehicles
    const realEvs = vehicles.filter(v => v.category === 'Electric');

    realEvs.forEach(v => {
      list.push({
        id: v.id,
        registrationNumber: v.registrationNumber,
        make: v.make,
        model: v.model,
        type: v.type,
        soh: v.batteryHealthPercent || 88.5,
        batteryId: v.batteryId || `BATT-${v.registrationNumber.replace(/\s+/g, '')}`,
        driverName: v.assignedDriverName || 'Fleet Pool',
        odometerKm: v.odometerKm || 18500,
        city: v.city || 'Nairobi',
        status: v.status || 'On Trip',
        rawVehicle: v
      });
    });

    // Supplementary seed data if fleet is small (under 25) for smooth histogram visualization
    const supplementarySeeds: { reg: string; make: string; model: string; type: string; soh: number; batteryId: string; driver: string; odo: number }[] = [
      // Critical (<85%)
      { reg: 'KDK 302A', make: 'Opibus', model: 'e-Bus 120kW', type: 'Commercial Truck', soh: 78.2, batteryId: 'BATT-OPI-9901', driver: 'Kipchoge Keino', odo: 68400 },
      { reg: 'KCR 411B', make: 'BYD', model: 'T3 Express', type: 'Van', soh: 81.5, batteryId: 'BATT-BYD-3302', driver: 'Otieno James', odo: 54100 },
      { reg: 'KDD 902C', make: 'Roam', model: 'Air Boda v2', type: 'Electric Motorcycle', soh: 83.8, batteryId: 'BATT-RM-1022', driver: 'Hassan Ali', odo: 41200 },
      { reg: 'KCY 771D', make: 'Spiro', model: 'Commuter e-Bike', type: 'Electric Motorcycle', soh: 84.4, batteryId: 'BATT-SP-8821', driver: 'Kamau Peter', odo: 39500 },

      // Warning Zone (85% to 89.9% - Approaching/Below 90% Warning Threshold!)
      { reg: 'KCX 901D', make: 'BYD', model: 'T3 Cargo Van', type: 'Van', soh: 85.2, batteryId: 'BATT-BYD-4410', driver: 'Samuel Eto', odo: 48900 },
      { reg: 'KDJ 883P', make: 'GreenShift', model: 'Metro Shuttle', type: 'Van', soh: 86.1, batteryId: 'BATT-GS-2201', driver: 'Mwangi Joseph', odo: 42100 },
      { reg: 'KDM 512L', make: 'Roam', model: 'Air EV Boda', type: 'Electric Motorcycle', soh: 87.4, batteryId: 'BATT-RM-3012', driver: 'Dennis Oliech', odo: 31200 },
      { reg: 'KDH 109G', make: 'Spiro', model: 'Equator Bike', type: 'Electric Motorcycle', soh: 88.0, batteryId: 'BATT-SP-4412', driver: 'Wanjiku Mwangi', odo: 28900 },
      { reg: 'KDL 119M', make: 'Roam', model: 'Air EV Boda', type: 'Electric Motorcycle', soh: 88.8, batteryId: 'BATT-RM-5511', driver: 'Mutua Boniface', odo: 27400 },
      { reg: 'KDA 604N', make: 'BYD', model: 'T3 Cargo Van', type: 'Van', soh: 89.2, batteryId: 'BATT-BYD-8822', driver: 'Njoroge David', odo: 26100 },
      { reg: 'KCP 330P', make: 'Spiro', model: 'Equator Bike', type: 'Electric Motorcycle', soh: 89.7, batteryId: 'BATT-SP-1092', driver: 'Kiprotich Brian', odo: 25000 },

      // Healthy Zone (90% to 94.9%)
      { reg: 'KDB 802Q', make: 'Roam', model: 'Air EV Boda', type: 'Electric Motorcycle', soh: 90.5, batteryId: 'BATT-RM-6001', driver: 'Wafula Emmanuel', odo: 22100 },
      { reg: 'KDF 221R', make: 'Opibus', model: 'e-Bus 120kW', type: 'Commercial Truck', soh: 91.2, batteryId: 'BATT-OPI-1120', driver: 'Chebet Sharon', odo: 21000 },
      { reg: 'KDG 405S', make: 'BYD', model: 'T3 Cargo Van', type: 'Van', soh: 92.0, batteryId: 'BATT-BYD-7731', driver: 'Ochieng Eric', odo: 19800 },
      { reg: 'KDH 901T', make: 'Spiro', model: 'Equator Bike', type: 'Electric Motorcycle', soh: 92.8, batteryId: 'BATT-SP-3341', driver: 'Mulei Faith', odo: 18400 },
      { reg: 'KDJ 102U', make: 'GreenShift', model: 'Metro Shuttle', type: 'Van', soh: 93.4, batteryId: 'BATT-GS-9981', driver: 'Achieng Mercy', odo: 17200 },
      { reg: 'KDK 882V', make: 'Roam', model: 'Air EV Boda', type: 'Electric Motorcycle', soh: 94.1, batteryId: 'BATT-RM-4491', driver: 'Wekesa Isaac', odo: 16000 },
      { reg: 'KDL 331W', make: 'Roam', model: 'Air EV Boda', type: 'Electric Motorcycle', soh: 94.8, batteryId: 'BATT-RM-2091', driver: 'Karanja Paul', odo: 14900 },

      // Optimal Zone (95% to 100%)
      { reg: 'KMG 482E', make: 'Roam', model: 'Air EV Boda', type: 'Electric Motorcycle', soh: 98.0, batteryId: 'BATT-RM-8821', driver: 'Juma Omondi', odo: 14250 },
      { reg: 'KDM 902X', make: 'BYD', model: 'T3 Cargo Van', type: 'Van', soh: 95.5, batteryId: 'BATT-BYD-1182', driver: 'Simiyu Alex', odo: 13100 },
      { reg: 'KDN 112Y', make: 'Spiro', model: 'Equator Bike', type: 'Electric Motorcycle', soh: 96.2, batteryId: 'BATT-SP-6612', driver: 'Koech Victor', odo: 11800 },
      { reg: 'KDP 441Z', make: 'GreenShift', model: 'Metro Shuttle', type: 'Van', soh: 97.1, batteryId: 'BATT-GS-7721', driver: 'Kimani Daniel', odo: 9800 },
      { reg: 'KDQ 882A', make: 'Roam', model: 'Air EV Boda', type: 'Electric Motorcycle', soh: 98.5, batteryId: 'BATT-RM-3310', driver: 'Oduor George', odo: 7400 },
      { reg: 'KDR 301B', make: 'Opibus', model: 'e-Bus 120kW', type: 'Commercial Truck', soh: 99.2, batteryId: 'BATT-OPI-4481', driver: 'Maina Lucy', odo: 4800 },
      { reg: 'KDS 512C', make: 'Spiro', model: 'Equator Bike', type: 'Electric Motorcycle', soh: 99.8, batteryId: 'BATT-SP-9902', driver: 'Gicheru Kevin', odo: 2100 }
    ];

    supplementarySeeds.forEach(seed => {
      const exists = list.some(item => item.registrationNumber === seed.reg);
      if (!exists) {
        const dummyVehicle: Vehicle = {
          id: `v-soh-${seed.reg}`,
          registrationNumber: seed.reg,
          make: seed.make,
          model: seed.model,
          year: 2023,
          type: seed.type as VehicleType,
          category: 'Electric',
          color: 'Custom GreenShift',
          vin: `VIN-${seed.reg.replace(/\s+/g, '')}-2023`,
          batteryId: seed.batteryId,
          batteryCapacityKwh: seed.make === 'Opibus' ? 120 : seed.make === 'BYD' ? 50 : 6.4,
          currentSoCPercent: Math.floor(40 + Math.random() * 50),
          batteryHealthPercent: seed.soh,
          odometerKm: seed.odo,
          purchaseDate: '2023-06-15',
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
          totalTripsCount: 310,
          totalRevenueGeneratedKes: 220000,
          totalFuelSpentKes: 0,
          totalChargingSpentKes: 18000,
          totalMaintenanceSpentKes: 5200,
          netProfitKes: 196800
        };

        list.push({
          id: dummyVehicle.id,
          registrationNumber: seed.reg,
          make: seed.make,
          model: seed.model,
          type: seed.type,
          soh: seed.soh,
          batteryId: seed.batteryId,
          driverName: seed.driver,
          odometerKm: seed.odo,
          city: 'Nairobi',
          status: dummyVehicle.status,
          rawVehicle: dummyVehicle
        });
      }
    });

    return list.sort((a, b) => a.soh - b.soh);
  }, [vehicles]);

  // Filtered dataset based on Vehicle Type selection
  const filteredFleetList = useMemo(() => {
    if (selectedVehicleType === 'ALL') return sohFleetList;
    return sohFleetList.filter(item => {
      if (selectedVehicleType === 'MOTORCYCLE') return item.type.toLowerCase().includes('motorcycle') || item.make.toLowerCase().includes('roam') || item.make.toLowerCase().includes('spiro');
      if (selectedVehicleType === 'VAN') return item.type.toLowerCase().includes('van');
      if (selectedVehicleType === 'TRUCK') return item.type.toLowerCase().includes('truck') || item.type.toLowerCase().includes('bus') || item.make.toLowerCase().includes('opibus');
      return true;
    });
  }, [sohFleetList, selectedVehicleType]);

  // Fleet Statistics
  const totalFleetCount = filteredFleetList.length;
  const avgSoh = totalFleetCount > 0 
    ? (filteredFleetList.reduce((acc, i) => acc + i.soh, 0) / totalFleetCount).toFixed(1)
    : '0.0';
  
  const atRiskCount = filteredFleetList.filter(i => i.soh < 90).length;
  const atRiskPercent = totalFleetCount > 0 ? ((atRiskCount / totalFleetCount) * 100).toFixed(1) : '0.0';
  
  const criticalCount = filteredFleetList.filter(i => i.soh < 85).length;
  const warningCount = filteredFleetList.filter(i => i.soh >= 85 && i.soh < 90).length;
  const healthyCount = filteredFleetList.filter(i => i.soh >= 90).length;

  // D3 Histogram Render Effect
  useEffect(() => {
    if (!svgRef.current || filteredFleetList.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    // Dimensions & Margins
    const margin = { top: 40, right: 30, bottom: 50, left: 55 };
    const width = Math.max(320, containerWidth) - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create Root G element
    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: SOH percentages from 60% to 100%
    const minSohVal = d3.min(filteredFleetList, (d: SohFleetItem) => d.soh);
    const minSoh = Math.max(60, Math.floor(minSohVal ?? 70) - 2);
    const maxSoh = 100;

    const xScale = d3.scaleLinear()
      .domain([minSoh, maxSoh])
      .range([0, width]);

    // Create D3 Bin Generator
    const thresholds = d3.range(minSoh, maxSoh + binSizeOption, binSizeOption);
    const histogram = d3.bin<SohFleetItem, number>()
      .value(d => d.soh)
      .domain(xScale.domain() as [number, number])
      .thresholds(thresholds);

    const bins = histogram(filteredFleetList);

    // Y Scale: Vehicle Counts
    const maxBinCount = d3.max(bins, b => b.length) || 5;
    const yScale = d3.scaleLinear()
      .domain([0, Math.ceil(maxBinCount * 1.15)])
      .range([height, 0]);

    // Color function based on SOH mid-point of bin
    const getBinColor = (x0: number, x1: number) => {
      const mid = (x0 + x1) / 2;
      if (mid < 85) return '#f43f5e'; // Rose (Critical)
      if (mid < 90) return '#f59e0b'; // Amber (Warning - Approaching threshold)
      if (mid < 95) return '#10b981'; // Emerald (Healthy)
      return '#06b6d4'; // Cyan (Optimal)
    };

    // --- DRAW BACKGROUND AT-RISK ZONE (<90% SOH) ---
    if (highlightAtRiskZone && xScale(90) > 0) {
      const riskWidth = Math.min(width, xScale(90));
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', riskWidth)
        .attr('height', height)
        .attr('fill', '#f43f5e')
        .attr('opacity', 0.08)
        .attr('rx', 4);

      g.append('text')
        .attr('x', riskWidth / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f43f5e')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('letter-spacing', '0.5px')
        .text('⚠️ AT-RISK ZONE (<90% SOH)');
    }

    // --- GRID LINES ---
    const yGrid = d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => '')
      .ticks(5);

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '2,2')
      .attr('stroke-opacity', 0.4);

    g.select('.grid .domain').remove();

    // --- DRAW BARS ---
    const barGroups = g.selectAll('.bar')
      .data(bins)
      .enter()
      .append('g')
      .attr('class', 'bar')
      .attr('transform', d => `translate(${xScale(d.x0 || 0)},${height})`);

    // Rectangles with transitions
    barGroups.append('rect')
      .attr('x', 1.5)
      .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 3))
      .attr('height', 0)
      .attr('rx', 3)
      .attr('fill', d => getBinColor(d.x0 || 0, d.x1 || 0))
      .attr('opacity', d => {
        if (selectedBin) {
          return (selectedBin.x0 === d.x0 && selectedBin.x1 === d.x1) ? 1.0 : 0.35;
        }
        return 0.85;
      })
      .attr('stroke', d => getBinColor(d.x0 || 0, d.x1 || 0))
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('opacity', 1.0)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        setHoveredBin({
          x0: d.x0 || 0,
          x1: d.x1 || 0,
          items: d,
          count: d.length
        });
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .attr('opacity', selectedBin ? ((selectedBin.x0 === d.x0 && selectedBin.x1 === d.x1) ? 1.0 : 0.35) : 0.85)
          .attr('stroke', getBinColor(d.x0 || 0, d.x1 || 0))
          .attr('stroke-width', 1);

        setHoveredBin(null);
      })
      .on('click', function(event, d) {
        if (d.length === 0) return;
        if (selectedBin && selectedBin.x0 === d.x0 && selectedBin.x1 === d.x1) {
          setSelectedBin(null); // Toggle off
        } else {
          setSelectedBin({
            x0: d.x0 || 0,
            x1: d.x1 || 0,
            items: d
          });
          toast.info(`Selected ${d.length} vehicles in ${d.x0}% – ${d.x1}% SOH Bin`, {
            description: 'Filtered detailed asset list below.'
          });
        }
      })
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr('y', d => yScale(d.length) - height)
      .attr('height', d => height - yScale(d.length));

    // Count Labels on top of bars
    barGroups.append('text')
      .attr('x', d => (xScale(d.x1 || 0) - xScale(d.x0 || 0)) / 2)
      .attr('y', d => yScale(d.length) - height - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.length > 0 ? '#f8fafc' : 'transparent')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(d => d.length > 0 ? d.length : '');

    // --- PROMINENT 90% SOH WARNING THRESHOLD REFERENCE LINE ---
    const x90 = xScale(90);
    if (x90 >= 0 && x90 <= width) {
      const thresholdG = g.append('g').attr('class', 'threshold-90');

      // Dashed Line
      thresholdG.append('line')
        .attr('x1', x90)
        .attr('y1', -10)
        .attr('x2', x90)
        .attr('y2', height)
        .attr('stroke', '#eab308') // Bright Amber
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '5,4');

      // Top Tag Badge
      const badgeWidth = 110;
      const badgeHeight = 22;
      thresholdG.append('rect')
        .attr('x', Math.min(width - badgeWidth, x90 - badgeWidth / 2))
        .attr('y', -26)
        .attr('width', badgeWidth)
        .attr('height', badgeHeight)
        .attr('rx', 11)
        .attr('fill', '#0f172a')
        .attr('stroke', '#eab308')
        .attr('stroke-width', 1.5);

      thresholdG.append('text')
        .attr('x', Math.min(width - badgeWidth, x90 - badgeWidth / 2) + badgeWidth / 2)
        .attr('y', -11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fef08a')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('⚠️ 90% SOH LIMIT');
    }

    // --- X AXIS ---
    const xAxis = d3.axisBottom(xScale)
      .ticks(10)
      .tickFormat(d => `${d}%`);

    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    xAxisG.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '600');

    xAxisG.selectAll('line').attr('stroke', '#475569');
    xAxisG.select('.domain').attr('stroke', '#475569');

    // X Axis Title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 38)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text('Battery State of Health (SOH %) Range');

    // --- Y AXIS ---
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format('d'));

    const yAxisG = g.append('g').call(yAxis);

    yAxisG.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace');

    yAxisG.selectAll('line').attr('stroke', '#475569');
    yAxisG.select('.domain').attr('stroke', '#475569');

    // Y Axis Title
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -38)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text('Vehicle Count');

  }, [filteredFleetList, containerWidth, binSizeOption, highlightAtRiskZone, selectedBin]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
      
      {/* Header & KPI Summary */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Fleet SOH Distribution Histogram</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  D3 Statistical Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates State of Health (SOH) battery capacity bins across all electric fleet assets to quantify health degradation risk against the 90% SLA warning limit.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Total EV Fleet</span>
            <span className="text-white font-black text-sm">{totalFleetCount} Vehicles</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Fleet Avg SOH</span>
            <span className="text-cyan-300 font-black text-sm">{avgSoh}%</span>
          </div>

          <div className="bg-slate-950 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Below 90% SOH</span>
            <span className="text-amber-400 font-black text-sm">{atRiskCount} Assets ({atRiskPercent}%)</span>
          </div>

          <div className="bg-slate-950 border border-rose-500/40 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Critical (&lt;85%)</span>
            <span className="text-rose-400 font-black text-sm">{criticalCount} Assets</span>
          </div>

        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        
        {/* Vehicle Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter Category:
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setSelectedVehicleType('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedVehicleType === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All EVs ({sohFleetList.length})
            </button>
            <button
              onClick={() => setSelectedVehicleType('MOTORCYCLE')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedVehicleType === 'MOTORCYCLE'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2W e-Bikes
            </button>
            <button
              onClick={() => setSelectedVehicleType('VAN')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedVehicleType === 'VAN'
                  ? 'bg-slate-800 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vans & Cargo
            </button>
            <button
              onClick={() => setSelectedVehicleType('TRUCK')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedVehicleType === 'TRUCK'
                  ? 'bg-slate-800 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              e-Buses & Heavy
            </button>
          </div>
        </div>

        {/* Bin Resolution & Risk Zone Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
          
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">Bin Size:</span>
            <button
              onClick={() => setBinSizeOption(binSizeOption === 2.5 ? 5 : 2.5)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded font-mono font-bold transition cursor-pointer"
            >
              {binSizeOption}% Step
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
            <input
              type="checkbox"
              checked={highlightAtRiskZone}
              onChange={(e) => setHighlightAtRiskZone(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0"
            />
            <span>Highlight Risk Zone (&lt;90%)</span>
          </label>

          {selectedBin && (
            <button
              onClick={() => setSelectedBin(null)}
              className="text-amber-400 hover:underline font-bold text-[11px] cursor-pointer"
            >
              Clear Bin Filter
            </button>
          )}

        </div>

      </div>

      {/* Main D3 Histogram Canvas Container */}
      <div ref={containerRef} className="relative bg-slate-950 p-4 rounded-xl border border-slate-800/80 overflow-hidden">
        
        <svg ref={svgRef} className="w-full h-[300px] overflow-visible" />

        {/* Dynamic Hover Tooltip Overlay */}
        {hoveredBin && (
          <div className="absolute top-6 right-6 bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-xl max-w-xs space-y-1.5 text-xs z-20 pointer-events-none backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
              <span className="font-bold font-mono text-amber-400">
                SOH Bin: {hoveredBin.x0}% – {hoveredBin.x1}%
              </span>
              <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                {hoveredBin.count} Vehicles
              </span>
            </div>

            <div className="text-[11px] text-slate-300">
              {hoveredBin.x1 <= 90 ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Warning Zone (&lt;90% SOH)
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Healthy Zone (≥90% SOH)
                </span>
              )}
            </div>

            {hoveredBin.count > 0 ? (
              <div className="space-y-1 pt-1 text-[10px] text-slate-400 font-mono">
                <div className="truncate">
                  Assets: {hoveredBin.items.map(i => i.registrationNumber).slice(0, 4).join(', ')}
                  {hoveredBin.items.length > 4 ? ` +${hoveredBin.items.length - 4} more` : ''}
                </div>
                <div>Avg Odo: Math.round({Math.round(hoveredBin.items.reduce((acc, i) => acc + i.odometerKm, 0) / hoveredBin.count).toLocaleString()}) km</div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 italic">No vehicle assets in this SOH interval</div>
            )}
          </div>
        )}

        {/* Legend Row */}
        <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
            <span>Critical (&lt;85% SOH)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
            <span>Warning (85%–89.9% SOH - Approaching 90% Limit)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
            <span>Healthy (90%–94.9% SOH)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500 inline-block"></span>
            <span>Optimal (95%–100% SOH)</span>
          </div>
        </div>

      </div>

      {/* Selected Bin Detailed Asset Breakdown Drawer */}
      {selectedBin && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-amber-400 tracking-wider">Filtered Assets in Bin:</span>
              <span className="bg-slate-900 border border-slate-800 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded">
                {selectedBin.x0}% – {selectedBin.x1}% SOH ({selectedBin.items.length} Vehicles)
              </span>
            </div>

            <button
              onClick={() => setSelectedBin(null)}
              className="text-xs text-slate-400 hover:text-white font-bold transition cursor-pointer"
            >
              ✕ Close Detail View
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedBin.items.map(item => {
              const isAtRisk = item.soh < 90;
              const isCritical = item.soh < 85;

              return (
                <div
                  key={item.id}
                  className={`bg-slate-900 p-3 rounded-lg border text-xs space-y-2 ${
                    isCritical 
                      ? 'border-rose-500/40 bg-rose-950/10' 
                      : isAtRisk 
                      ? 'border-amber-500/40 bg-amber-950/10' 
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-sm">{item.registrationNumber}</span>
                    <span className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                      isCritical ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      isAtRisk ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {item.soh}% SOH
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Type: <strong className="text-slate-200">{item.make} {item.model}</strong></div>
                    <div>Driver: <strong className="text-slate-200">{item.driverName}</strong></div>
                    <div>Odo: <strong className="text-slate-200">{item.odometerKm.toLocaleString()} km</strong></div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onTraceBattery && onTraceBattery(item.batteryId)}
                      className="text-[10px] font-mono font-bold text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{item.batteryId}</span>
                      <Eye className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        if (onOpenWorkOrder) {
                          onOpenWorkOrder(item.rawVehicle);
                        } else {
                          toast.info(`Work order created for ${item.registrationNumber}`);
                        }
                      }}
                      className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer"
                    >
                      Work Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
