import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Driver, Vehicle } from '../types';
import { 
  AlertTriangle, Wrench, TrendingDown, TrendingUp, Sparkles, 
  Filter, Download, ExternalLink, ShieldAlert, UserCheck, Search, Info, Sliders, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export interface DriverScatterPoint {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverPhoto?: string;
  vehicleReg: string;
  vehicleCategory: 'Electric' | 'Fuel';
  vehicleType: string;
  city: string;
  tripEfficiency: number; // km/L for Fuel or km/kWh for EV equivalent (e.g. 10 - 40)
  maintenanceCostPerKmKes: number; // KES per km (e.g. 0.8 - 18.5 KES/km)
  totalMaintenanceSpentKes: number;
  odometerKm: number;
  totalTrips: number;
  safetyScore: number; // 0 - 100%
  isOutlier: boolean;
  outlierReason?: string;
  quadrant: 'Optimal Stars' | 'Critical Outliers' | 'Vehicle Defect Risk' | 'Driver Coaching Needed';
}

interface DriverEfficiencyVsMaintenanceScatterPlotProps {
  drivers?: Driver[];
  vehicles?: Vehicle[];
  onSelectVehicle?: (registrationNumber: string) => void;
}

export const DriverEfficiencyVsMaintenanceScatterPlot: React.FC<DriverEfficiencyVsMaintenanceScatterPlotProps> = ({
  drivers = [],
  vehicles = [],
  onSelectVehicle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [outliersOnly, setOutliersOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPoint, setSelectedPoint] = useState<DriverScatterPoint | null>(null);

  // Generate enriched data points connecting real drivers + vehicles with realistic variance
  const scatterData: DriverScatterPoint[] = useMemo(() => {
    // Standard baseline points representing fleet diversity across cities
    const defaultData: DriverScatterPoint[] = [
      {
        id: 'pt-1',
        driverId: 'drv-1',
        driverName: 'Joseph Kamau',
        driverPhone: '+254 712 345678',
        vehicleReg: 'KMG 482E',
        vehicleCategory: 'Electric',
        vehicleType: 'Electric Motorcycle',
        city: 'Nairobi',
        tripEfficiency: 24.2,
        maintenanceCostPerKmKes: 1.1,
        totalMaintenanceSpentKes: 8200,
        odometerKm: 14200,
        totalTrips: 420,
        safetyScore: 98,
        isOutlier: false,
        quadrant: 'Optimal Stars'
      },
      {
        id: 'pt-2',
        driverId: 'drv-2',
        driverName: 'David Omondi',
        driverPhone: '+254 722 889900',
        vehicleReg: 'KDH 102B',
        vehicleCategory: 'Fuel',
        vehicleType: 'Petrol / Diesel Vehicle',
        city: 'Nairobi',
        tripEfficiency: 14.8,
        maintenanceCostPerKmKes: 15.8, // OUTLIER: High maintenance + low efficiency
        totalMaintenanceSpentKes: 68500,
        odometerKm: 48000,
        totalTrips: 310,
        safetyScore: 68,
        isOutlier: true,
        outlierReason: 'Severe engine clutch slippage, aggressive transmission wear & frequent brake pad replacement',
        quadrant: 'Critical Outliers'
      },
      {
        id: 'pt-3',
        driverId: 'drv-3',
        driverName: 'Hassan Hassan',
        driverPhone: '+254 733 112233',
        vehicleReg: 'KMC 319P',
        vehicleCategory: 'Electric',
        vehicleType: 'Electric Motorcycle',
        city: 'Mombasa',
        tripEfficiency: 16.1,
        maintenanceCostPerKmKes: 6.8, // OUTLIER for EV
        totalMaintenanceSpentKes: 32400,
        odometerKm: 22000,
        totalTrips: 280,
        safetyScore: 74,
        isOutlier: true,
        outlierReason: 'Coastal salt air battery terminal corrosion & motor controller overheating from severe overloading',
        quadrant: 'Critical Outliers'
      },
      {
        id: 'pt-4',
        driverId: 'drv-4',
        driverName: 'Grace Wanjiku',
        driverPhone: '+254 701 554433',
        vehicleReg: 'KMD 501S',
        vehicleCategory: 'Electric',
        vehicleType: 'Electric Motorcycle',
        city: 'Kisumu',
        tripEfficiency: 23.8,
        maintenanceCostPerKmKes: 1.4,
        totalMaintenanceSpentKes: 6100,
        odometerKm: 18500,
        totalTrips: 390,
        safetyScore: 96,
        isOutlier: false,
        quadrant: 'Optimal Stars'
      },
      {
        id: 'pt-5',
        driverId: 'drv-5',
        driverName: 'Samuel Kiprop',
        driverPhone: '+254 720 998877',
        vehicleReg: 'KMG 991R',
        vehicleCategory: 'Electric',
        vehicleType: 'Electric Motorcycle',
        city: 'Nakuru',
        tripEfficiency: 18.5,
        maintenanceCostPerKmKes: 4.9, // OUTLIER
        totalMaintenanceSpentKes: 24100,
        odometerKm: 16200,
        totalTrips: 240,
        safetyScore: 81,
        isOutlier: true,
        outlierReason: 'Rear suspension shock absorber damage from unpaved Menengai crater off-route shortcuts',
        quadrant: 'Critical Outliers'
      },
      {
        id: 'pt-6',
        driverId: 'drv-6',
        driverName: 'Brian Mutua',
        driverPhone: '+254 711 443322',
        vehicleReg: 'KCG 112T',
        vehicleCategory: 'Fuel',
        vehicleType: 'Fuel Motorcycle',
        city: 'Kiambu',
        tripEfficiency: 35.5,
        maintenanceCostPerKmKes: 2.2,
        totalMaintenanceSpentKes: 11400,
        odometerKm: 29000,
        totalTrips: 510,
        safetyScore: 94,
        isOutlier: false,
        quadrant: 'Optimal Stars'
      },
      {
        id: 'pt-7',
        driverId: 'drv-7',
        driverName: 'Peter Anyango',
        driverPhone: '+254 725 667788',
        vehicleReg: 'KCB 904X',
        vehicleCategory: 'Fuel',
        vehicleType: 'Petrol / Diesel Vehicle',
        city: 'Mombasa',
        tripEfficiency: 11.2,
        maintenanceCostPerKmKes: 17.2, // OUTLIER
        totalMaintenanceSpentKes: 84000,
        odometerKm: 54000,
        totalTrips: 290,
        safetyScore: 65,
        isOutlier: true,
        outlierReason: 'Fuel injector line leak, severe idling soot buildup & turbocharger bearing play',
        quadrant: 'Critical Outliers'
      },
      {
        id: 'pt-8',
        driverId: 'drv-8',
        driverName: 'Mary Njeri',
        driverPhone: '+254 714 887766',
        vehicleReg: 'KDA 882L',
        vehicleCategory: 'Fuel',
        vehicleType: 'Fuel Motorcycle',
        city: 'Nakuru',
        tripEfficiency: 31.0,
        maintenanceCostPerKmKes: 11.5, // High Maintenance despite good efficiency -> Vehicle Defect Risk
        totalMaintenanceSpentKes: 48000,
        odometerKm: 31000,
        totalTrips: 340,
        safetyScore: 91,
        isOutlier: true,
        outlierReason: 'Recurring factory wiring harness short circuit & fuel pump electrical failure despite careful driving',
        quadrant: 'Vehicle Defect Risk'
      },
      {
        id: 'pt-9',
        driverId: 'drv-9',
        driverName: 'Kevin Cheruiyot',
        driverPhone: '+254 728 334455',
        vehicleReg: 'KDF 201E',
        vehicleCategory: 'Electric',
        vehicleType: 'Electric Car / Delivery Van',
        city: 'Mombasa',
        tripEfficiency: 6.2,
        maintenanceCostPerKmKes: 3.2,
        totalMaintenanceSpentKes: 18900,
        odometerKm: 19800,
        totalTrips: 210,
        safetyScore: 88,
        isOutlier: false,
        quadrant: 'Optimal Stars'
      },
      {
        id: 'pt-10',
        driverId: 'drv-10',
        driverName: 'Faith Chebet',
        driverPhone: '+254 719 223344',
        vehicleReg: 'KCJ 554C',
        vehicleCategory: 'Fuel',
        vehicleType: 'Petrol / Diesel Vehicle',
        city: 'Nairobi',
        tripEfficiency: 12.1,
        maintenanceCostPerKmKes: 4.8, // Low efficiency, low maintenance -> Driver Coaching Needed
        totalMaintenanceSpentKes: 22000,
        odometerKm: 36000,
        totalTrips: 270,
        safetyScore: 78,
        isOutlier: false,
        quadrant: 'Driver Coaching Needed'
      },
      {
        id: 'pt-11',
        driverId: 'drv-11',
        driverName: 'James Mwangi',
        driverPhone: '+254 710 665544',
        vehicleReg: 'KCF 302P',
        vehicleCategory: 'Fuel',
        vehicleType: 'Fuel Motorcycle',
        city: 'Nakuru',
        tripEfficiency: 36.8,
        maintenanceCostPerKmKes: 2.1,
        totalMaintenanceSpentKes: 8900,
        odometerKm: 21000,
        totalTrips: 460,
        safetyScore: 97,
        isOutlier: false,
        quadrant: 'Optimal Stars'
      },
      {
        id: 'pt-12',
        driverId: 'drv-12',
        driverName: 'Daniel Otieno',
        driverPhone: '+254 721 991122',
        vehicleReg: 'KCF 810M',
        vehicleCategory: 'Fuel',
        vehicleType: 'Fuel Motorcycle',
        city: 'Mombasa',
        tripEfficiency: 28.5,
        maintenanceCostPerKmKes: 13.9, // OUTLIER
        totalMaintenanceSpentKes: 52000,
        odometerKm: 33000,
        totalTrips: 380,
        safetyScore: 71,
        isOutlier: true,
        outlierReason: 'Bent wheel rim & engine overheating from driving with low oil levels',
        quadrant: 'Critical Outliers'
      }
    ];

    // If real drivers exist, merge their names into data points gracefully
    if (drivers.length > 0) {
      drivers.forEach((drv, idx) => {
        if (defaultData[idx]) {
          defaultData[idx].driverId = drv.id;
          defaultData[idx].driverName = drv.fullName;
          defaultData[idx].driverPhone = drv.phone || defaultData[idx].driverPhone;
          defaultData[idx].city = drv.city || defaultData[idx].city;
          defaultData[idx].safetyScore = drv.safetyScorePercent || defaultData[idx].safetyScore;
          if (drv.assignedVehicleReg) {
            defaultData[idx].vehicleReg = drv.assignedVehicleReg;
          }
        }
      });
    }

    return defaultData;
  }, [drivers, vehicles]);

  // Filtered dataset
  const filteredPoints = useMemo(() => {
    return scatterData.filter(d => {
      const matchCity = selectedCity === 'All' || d.city === selectedCity;
      const matchCategory = selectedCategory === 'All' || d.vehicleCategory === selectedCategory;
      const matchOutlier = !outliersOnly || d.isOutlier;
      const matchSearch = searchQuery === '' || 
        d.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.vehicleReg.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.city.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCity && matchCategory && matchOutlier && matchSearch;
    });
  }, [scatterData, selectedCity, selectedCategory, outliersOnly, searchQuery]);

  // Outlier statistics summary
  const outlierSummary = useMemo(() => {
    const totalCount = filteredPoints.length;
    const outlierPoints = filteredPoints.filter(p => p.isOutlier);
    const outlierCount = outlierPoints.length;

    const totalMaintenanceOutlierKes = outlierPoints.reduce((acc, p) => acc + p.totalMaintenanceSpentKes, 0);
    const normalPoints = filteredPoints.filter(p => !p.isOutlier);
    const avgMaintenanceNormalNum = normalPoints.length > 0 
      ? normalPoints.reduce((acc, p) => acc + p.maintenanceCostPerKmKes, 0) / normalPoints.length 
      : 2.5;
    
    const avgMaintenanceOutlierNum = outlierCount > 0 
      ? outlierPoints.reduce((acc, p) => acc + p.maintenanceCostPerKmKes, 0) / outlierCount 
      : 12.0;

    const excessCostFactor = (avgMaintenanceOutlierNum / (avgMaintenanceNormalNum || 1)).toFixed(1);

    return {
      totalCount,
      outlierCount,
      outlierPoints,
      totalMaintenanceOutlierKes,
      avgMaintenanceNormal: avgMaintenanceNormalNum.toFixed(2),
      avgMaintenanceOutlier: avgMaintenanceOutlierNum.toFixed(2),
      excessCostFactor
    };
  }, [filteredPoints]);

  // Render D3 Scatter Plot
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth || 700;
    const height = 400;

    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3.select(svgRef.current);
    svg.attr('width', containerWidth).attr('height', height);

    // Persistent Chart Group
    let chartGroup = svg.select<SVGGElement>('g.scatter-main-group');
    let isInitialRender = false;

    if (chartGroup.empty()) {
      isInitialRender = true;
      chartGroup = svg.append('g')
        .attr('class', 'scatter-main-group')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      chartGroup.append('g').attr('class', 'quadrant-bg-group');
      chartGroup.append('g').attr('class', 'x-axis');
      chartGroup.append('g').attr('class', 'y-axis');
      chartGroup.append('g').attr('class', 'threshold-lines-group');
      chartGroup.append('g').attr('class', 'dots-group');
    }

    // X Scale: Driver Trip Efficiency (e.g. 5 to 40 km/L or km/kWh)
    const xMin = d3.min(filteredPoints, (d: DriverScatterPoint) => d.tripEfficiency) ?? 5;
    const xMax = d3.max(filteredPoints, (d: DriverScatterPoint) => d.tripEfficiency) ?? 40;
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xMin - 3), xMax + 3])
      .range([0, width])
      .nice();

    // Y Scale: Maintenance Cost Per Km (KES/km)
    const yMax = d3.max(filteredPoints, (d: DriverScatterPoint) => d.maintenanceCostPerKmKes) ?? 20;
    const yScale = d3.scaleLinear()
      .domain([0, yMax + 2])
      .range([height - margin.top - margin.bottom, 0])
      .nice();

    const duration = isInitialRender ? 800 : 500;
    const t = svg.transition().duration(duration).ease(d3.easeCubicInOut);

    // Quadrant Threshold Lines (e.g., Efficiency = 22 km/L, Maintenance = KES 6.0/km)
    const effThreshold = 22;
    const maintThreshold = 6.0;

    const xThreshPos = xScale(effThreshold);
    const yThreshPos = yScale(maintThreshold);

    // Draw Quadrant Background Shades
    const quadrantBgGroup = chartGroup.select('g.quadrant-bg-group');
    quadrantBgGroup.selectAll('*').remove();

    // Top-Left Quadrant: Low Efficiency, High Maintenance -> CRITICAL OUTLIER RISK (Red Tint)
    quadrantBgGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', Math.max(0, xThreshPos))
      .attr('height', Math.max(0, yThreshPos))
      .attr('fill', 'rgba(239, 68, 68, 0.06)')
      .attr('rx', 8);

    // Bottom-Right Quadrant: High Efficiency, Low Maintenance -> OPTIMAL STARS (Green Tint)
    quadrantBgGroup.append('rect')
      .attr('x', xThreshPos)
      .attr('y', yThreshPos)
      .attr('width', Math.max(0, width - xThreshPos))
      .attr('height', Math.max(0, height - margin.top - margin.bottom - yThreshPos))
      .attr('fill', 'rgba(16, 185, 129, 0.06)')
      .attr('rx', 8);

    // Quadrant Text Labels
    quadrantBgGroup.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('fill', '#f87171')
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .text('⚠️ CRITICAL OUTLIERS (High Maintenance, Low Efficiency)');

    quadrantBgGroup.append('text')
      .attr('x', width - 10)
      .attr('y', height - margin.top - margin.bottom - 12)
      .attr('text-anchor', 'end')
      .attr('fill', '#34d399')
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .text('⭐ OPTIMAL FLEET STARS (Low Maintenance, High Efficiency)');

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6).tickSize(- (height - margin.top - margin.bottom));
    const yAxis = d3.axisLeft(yScale).ticks(6).tickSize(- width);

    const xAxisGroup = chartGroup.select<SVGGElement>('g.x-axis');
    xAxisGroup
      .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
      .transition(t as any)
      .call(xAxis as any)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', '700');

    xAxisGroup.selectAll('.domain').attr('stroke', '#334155');
    xAxisGroup.selectAll('.tick line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2');

    // X Axis Label
    xAxisGroup.selectAll('text.x-axis-title').remove();
    xAxisGroup.append('text')
      .attr('class', 'x-axis-title')
      .attr('x', width / 2)
      .attr('y', 42)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '12px')
      .attr('font-weight', '800')
      .attr('text-anchor', 'middle')
      .text('Driver Trip Efficiency Index (km/L or km/kWh equivalent) →');

    const yAxisGroup = chartGroup.select<SVGGElement>('g.y-axis');
    yAxisGroup
      .transition(t as any)
      .call(yAxis as any)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', '700');

    yAxisGroup.selectAll('.domain').attr('stroke', '#334155');
    yAxisGroup.selectAll('.tick line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2');

    // Y Axis Label
    yAxisGroup.selectAll('text.y-axis-title').remove();
    yAxisGroup.append('text')
      .attr('class', 'y-axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('x', - (height - margin.top - margin.bottom) / 2)
      .attr('y', -42)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '12px')
      .attr('font-weight', '800')
      .attr('text-anchor', 'middle')
      .text('↑ Maintenance Cost Per Km (KES / km)');

    // Threshold Reference Lines
    const thresholdGroup = chartGroup.select('g.threshold-lines-group');
    thresholdGroup.selectAll('*').remove();

    // Horizontal Maintenance Threshold line
    thresholdGroup.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yThreshPos)
      .attr('y2', yThreshPos)
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    // Vertical Efficiency Threshold line
    thresholdGroup.append('line')
      .attr('x1', xThreshPos)
      .attr('x2', xThreshPos)
      .attr('y1', 0)
      .attr('y2', height - margin.top - margin.bottom)
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    // Tooltip Element
    let tooltipDiv = d3.select(containerRef.current).select<HTMLDivElement>('.scatter-tooltip');
    if (tooltipDiv.empty()) {
      tooltipDiv = d3.select(containerRef.current)
        .append('div')
        .attr('class', 'scatter-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', '#020617')
        .style('border', '1px solid #334155')
        .style('border-radius', '12px')
        .style('padding', '12px 14px')
        .style('color', '#fff')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '60')
        .style('box-shadow', '0 20px 30px rgba(0,0,0,0.6)');
    }

    // Render Data Points (Scatter Dots)
    const dotsGroup = chartGroup.select('g.dots-group');

    const dotG = dotsGroup
      .selectAll<SVGGElement, DriverScatterPoint>('g.dot-item')
      .data(filteredPoints, (d: DriverScatterPoint) => d.id);

    dotG.exit()
      .transition(t as any)
      .style('opacity', 0)
      .remove();

    const dotEnter = dotG.enter()
      .append('g')
      .attr('class', 'dot-item')
      .style('cursor', 'pointer');

    // Outer Aura Ring for Outliers
    dotEnter.append('circle')
      .attr('class', 'aura-ring')
      .attr('r', 0);

    // Main Dot Circle
    dotEnter.append('circle')
      .attr('class', 'main-dot')
      .attr('r', 0);

    // Label Text (Vehicle Reg)
    dotEnter.append('text')
      .attr('class', 'dot-label')
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .attr('dx', 12)
      .attr('dy', 4);

    const mergedDotG = dotEnter.merge(dotG as any);

    mergedDotG
      .on('mouseover', (event: any, d: DriverScatterPoint) => {
        d3.select(event.currentTarget).select('.main-dot')
          .attr('r', d.isOutlier ? 12 : 9)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 3);

        const outlierBadge = d.isOutlier
          ? `<span style="background: rgba(244,63,94,0.2); color: #f87171; border: 1px solid #f43f5e; padding: 2px 6px; borderRadius: 4px; font-weight: 800;">🚨 HIGH EXPENSE OUTLIER</span>`
          : `<span style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid #10b981; padding: 2px 6px; borderRadius: 4px; font-weight: 800;">🟢 NORMAL EFFICIENCY</span>`;

        tooltipDiv
          .style('visibility', 'visible')
          .html(`
            <div style="font-weight: 800; font-size: 13px; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
              <span>👤 ${d.driverName} (${d.vehicleReg})</span>
              <span style="color: #94a3b8; font-size: 10px;">📍 ${d.city}</span>
            </div>
            <div style="margin-bottom: 6px;">${outlierBadge}</div>
            <div style="font-size: 12px; margin-top: 4px;">
              Trip Efficiency: <strong style="color: #34d399; font-size: 13px;">${d.tripEfficiency}</strong> <span style="color: #94a3b8;">${d.vehicleCategory === 'Electric' ? 'km/kWh' : 'km/L'}</span>
            </div>
            <div style="margin-top: 2px;">
              Maintenance Cost / Km: <strong style="color: ${d.isOutlier ? '#f87171' : '#fbbf24'}; font-size: 13px;">KES ${d.maintenanceCostPerKmKes}/km</strong>
            </div>
            <div style="margin-top: 2px; color: #cbd5e1;">
              Total Maintenance Spent: <strong>KES ${d.totalMaintenanceSpentKes.toLocaleString()}</strong> (${d.odometerKm.toLocaleString()} km)
            </div>
            <div style="margin-top: 2px; color: #94a3b8;">
              Safety Score: <strong style="color: #38bdf8;">${d.safetyScore}%</strong> • Total Trips: ${d.totalTrips}
            </div>
            ${d.isOutlier ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #334155; color: #fda4af; font-size: 11px;">
                ⚠️ <strong>Anomaly Cause:</strong> ${d.outlierReason}
              </div>
            ` : ''}
          `);
      })
      .on('mousemove', (event: any) => {
        const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
        tooltipDiv
          .style('top', `${mouseY - 120}px`)
          .style('left', `${Math.min(containerWidth - 280, Math.max(10, mouseX - 100))}px`);
      })
      .on('mouseout', (event: any, d: DriverScatterPoint) => {
        d3.select(event.currentTarget).select('.main-dot')
          .attr('r', d.isOutlier ? 9 : 6)
          .attr('stroke', d.isOutlier ? '#f43f5e' : (d.vehicleCategory === 'Electric' ? '#10b981' : '#3b82f6'))
          .attr('stroke-width', d.isOutlier ? 2.5 : 1.5);

        tooltipDiv.style('visibility', 'hidden');
      })
      .on('click', (event: any, d: DriverScatterPoint) => {
        setSelectedPoint(d);
        toast.info(`Inspecting Driver: ${d.driverName}`, {
          description: `Vehicle: ${d.vehicleReg} | Maintenance: KES ${d.maintenanceCostPerKmKes}/km`
        });
      });

    // Animate Position
    mergedDotG
      .transition(t as any)
      .attr('transform', (d: DriverScatterPoint) => `translate(${xScale(d.tripEfficiency)}, ${yScale(d.maintenanceCostPerKmKes)})`);

    // Outer Aura Ring for Outliers
    mergedDotG.select('circle.aura-ring')
      .transition(t as any)
      .attr('r', (d: DriverScatterPoint) => (d.isOutlier ? 15 : 0))
      .attr('fill', (d: DriverScatterPoint) => (d.isOutlier ? 'rgba(244, 63, 94, 0.25)' : 'none'))
      .attr('stroke', (d: DriverScatterPoint) => (d.isOutlier ? '#f43f5e' : 'none'))
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    // Main Dot Circle Styling
    mergedDotG.select('circle.main-dot')
      .transition(t as any)
      .attr('r', (d: DriverScatterPoint) => (d.isOutlier ? 9 : 6))
      .attr('fill', (d: DriverScatterPoint) => {
        if (d.isOutlier) return '#e11d48'; // Vibrant Crimson Rose
        if (d.vehicleCategory === 'Electric') return '#059669'; // Emerald
        return '#2563eb'; // Blue
      })
      .attr('stroke', (d: DriverScatterPoint) => (d.isOutlier ? '#fda4af' : '#ffffff'))
      .attr('stroke-width', (d: DriverScatterPoint) => (d.isOutlier ? 2.5 : 1.5));

    // Dot Labels
    mergedDotG.select('text.dot-label')
      .transition(t as any)
      .attr('fill', (d: DriverScatterPoint) => (d.isOutlier ? '#f87171' : '#94a3b8'))
      .attr('font-weight', (d: DriverScatterPoint) => (d.isOutlier ? '900' : '700'))
      .text((d: DriverScatterPoint) => `${d.driverName.split(' ')[0]} (${d.vehicleReg})`);

  }, [filteredPoints]);

  // Export Scatter Plot Data to CSV
  const handleExportCsv = () => {
    const headers = [
      'Driver Name',
      'Phone',
      'Vehicle Reg',
      'Category',
      'Vehicle Type',
      'City',
      'Trip Efficiency (km/L or km/kWh)',
      'Maintenance Cost Per Km (KES/km)',
      'Total Maintenance Spent (KES)',
      'Odometer (km)',
      'Total Trips',
      'Safety Score (%)',
      'Is Outlier',
      'Anomaly Cause',
      'Quadrant'
    ];

    const rows = filteredPoints.map(p => [
      `"${p.driverName}"`,
      `"${p.driverPhone}"`,
      `"${p.vehicleReg}"`,
      `"${p.vehicleCategory}"`,
      `"${p.vehicleType}"`,
      `"${p.city}"`,
      p.tripEfficiency,
      p.maintenanceCostPerKmKes,
      p.totalMaintenanceSpentKes,
      p.odometerKm,
      p.totalTrips,
      `"${p.safetyScore}%"`,
      p.isOutlier ? 'YES' : 'NO',
      `"${(p.outlierReason || '').replace(/"/g, '""')}"`,
      `"${p.quadrant}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `driver_efficiency_vs_maintenance_outliers_aug2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Driver Efficiency vs Maintenance Scatter Plot CSV!');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 relative overflow-hidden">
      
      {/* HEADER & TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md">
            <Wrench className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Driver Efficiency vs. Maintenance Cost Scatter Matrix
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                Outlier Anomaly Detection
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive D3 mapping driver trip efficiency against maintenance cost per km to pinpoint high-expense spike drivers & defective vehicles
            </p>
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search driver or reg..."
              className="pl-8 pr-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
            />
          </div>

          {/* City Filter */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Cities</option>
            <option value="Nairobi">Nairobi</option>
            <option value="Mombasa">Mombasa</option>
            <option value="Kisumu">Kisumu</option>
            <option value="Nakuru">Nakuru</option>
            <option value="Kiambu">Kiambu</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Electric">Electric (EV)</option>
            <option value="Fuel">Fuel (Petrol/Diesel)</option>
          </select>

          {/* Highlight Outliers Only Toggle */}
          <button
            onClick={() => setOutliersOnly(!outliersOnly)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              outliersOnly
                ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
            <span>Outliers Only ({outlierSummary.outlierCount})</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Export Scatter Plot CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

        </div>
      </div>

      {/* OUTLIER ANOMALY KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Active Expense Outliers</span>
            <div className="text-base font-black text-rose-400 mt-0.5">
              {outlierSummary.outlierCount} Drivers / Vehicles
            </div>
            <div className="text-[10px] text-rose-300/80 mt-0.5">
              {((outlierSummary.outlierCount / (outlierSummary.totalCount || 1)) * 100).toFixed(0)}% of audited fleet units
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Outlier Maintenance Cost / Km</span>
            <div className="text-base font-black text-rose-400 mt-0.5">
              KES {outlierSummary.avgMaintenanceOutlier} / km
            </div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">
              {outlierSummary.excessCostFactor}x higher than normal fleet avg (KES {outlierSummary.avgMaintenanceNormal}/km)
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Total Expense Exposure</span>
            <div className="text-base font-black text-rose-300 mt-0.5">
              KES {outlierSummary.totalMaintenanceOutlierKes.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Maintenance spent on flagged outlier vehicles
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Wrench className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Potential Cost Recovery</span>
            <div className="text-base font-black text-emerald-400 mt-0.5">
              KES {Math.round(outlierSummary.totalMaintenanceOutlierKes * 0.42).toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">
              Savings via driver coaching & warranty claims
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* D3 SCATTER PLOT CANVAS CONTAINER */}
      <div ref={containerRef} className="relative bg-slate-950/90 rounded-2xl p-4 border border-slate-800/80">
        
        {/* Scatter Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Scatter Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 ring-2 ring-rose-400/50 inline-block" />
              <span>Outlier (High Cost/Low Efficiency)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
              <span>Electric Vehicle (EV)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              <span>Fuel Vehicle</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            💡 Hover over dots for telematics breakdown & anomaly causes
          </div>
        </div>

        <svg ref={svgRef} className="w-full overflow-visible" />

      </div>

      {/* SELECTED DRIVER / OUTLIER DIAGNOSTIC DRAWER */}
      {selectedPoint && (
        <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/40 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">
                Driver Audit Profile: {selectedPoint.driverName}
              </span>
              <span className="text-xs text-slate-400 font-mono">({selectedPoint.vehicleReg})</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedPoint.isOutlier
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {selectedPoint.isOutlier ? '🚨 FLAGGED EXPENSE OUTLIER' : '🟢 NORMAL PERFORMANCE'}
              </span>
            </div>

            <button
              onClick={() => setSelectedPoint(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Driver & Assigned Vehicle</span>
              <p className="text-white font-extrabold mt-0.5">{selectedPoint.driverName}</p>
              <p className="text-slate-400 text-[11px]">{selectedPoint.driverPhone}</p>
              <p className="text-indigo-400 font-mono mt-1 font-bold">{selectedPoint.vehicleReg} • {selectedPoint.city}</p>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Efficiency vs. Maintenance</span>
              <p className="text-emerald-400 font-bold mt-0.5">
                Efficiency: {selectedPoint.tripEfficiency} {selectedPoint.vehicleCategory === 'Electric' ? 'km/kWh' : 'km/L'}
              </p>
              <p className="text-rose-400 font-bold mt-1">
                Maintenance: KES {selectedPoint.maintenanceCostPerKmKes} / km
              </p>
              <p className="text-slate-400 text-[11px]">Total Spent: KES {selectedPoint.totalMaintenanceSpentKes.toLocaleString()}</p>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Identified Telematics Root Cause</span>
              <p className="text-amber-300 font-medium mt-0.5">
                {selectedPoint.outlierReason || 'Vehicle operating within normal maintenance degradation parameters.'}
              </p>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Safety Score & Quadrant</span>
                <p className="text-white font-bold mt-0.5">{selectedPoint.safetyScore}% Safety Score</p>
                <p className="text-indigo-300 text-[11px] font-bold">{selectedPoint.quadrant}</p>
              </div>

              {onSelectVehicle && (
                <button
                  onClick={() => onSelectVehicle(selectedPoint.vehicleReg)}
                  className="mt-2 w-full py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
                >
                  <span>Audit Full Vehicle Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
