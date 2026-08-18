import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, 
  Filter, Download, RefreshCw, Calendar, Users, Info, Zap, ChevronRight,
  ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { Driver, MpesaPayoutRequest } from '../types';
import { toast } from 'sonner';

export type DriverGroupType = 'ALL' | 'Commission' | 'Daily Target' | 'Weekly Rental' | 'Salary + Commission';

export interface DailyCashFlowDataPoint {
  date: Date;
  dateStr: string;
  formattedDate: string;
  grossRevenueKes: number;
  mpesaPayoutsKes: number;
  netCashflowGapKes: number; // Revenue - Payouts
  isDeficit: boolean;
  deficitAmountKes: number;
  surplusAmountKes: number;
  driverGroup: DriverGroupType;
  payoutCount: number;
  topDriverPayoutName: string;
  notes: string;
}

interface MpesaCashFlowGapD3ChartProps {
  drivers?: Driver[];
  mpesaPayouts?: MpesaPayoutRequest[];
}

// Generate realistic 30-day historical data for driver groups
const generateHistoricalCashFlowData = (): Record<DriverGroupType, DailyCashFlowDataPoint[]> => {
  const groups: DriverGroupType[] = ['ALL', 'Commission', 'Daily Target', 'Weekly Rental', 'Salary + Commission'];
  const result: Record<DriverGroupType, DailyCashFlowDataPoint[]> = {
    'ALL': [],
    'Commission': [],
    'Daily Target': [],
    'Weekly Rental': [],
    'Salary + Commission': []
  };

  const baseDate = new Date(2026, 6, 13); // July 13, 2026 to August 12, 2026

  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);

    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const isFriday = currentDate.getDay() === 5; // Weekly payouts peak on Fridays
    const dayStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Base multiplier factors
    const weekendMultiplier = isWeekend ? 0.78 : 1.0;
    const FridayPayoutSpike = isFriday ? 1.65 : 1.0;

    // 1. Commission Group (High payout frequency on trip completions)
    const commRev = Math.round((145000 + (i % 5) * 12000 - (i % 3) * 8000) * weekendMultiplier);
    const commPayout = Math.round((112000 + (i % 4) * 15000 + (isFriday ? 45000 : 0)) * weekendMultiplier * FridayPayoutSpike);
    const commGap = commRev - commPayout;

    result['Commission'].push({
      date: currentDate,
      dateStr: dayStr,
      formattedDate: fullDate,
      grossRevenueKes: commRev,
      mpesaPayoutsKes: commPayout,
      netCashflowGapKes: commGap,
      isDeficit: commGap < 0,
      deficitAmountKes: commGap < 0 ? Math.abs(commGap) : 0,
      surplusAmountKes: commGap > 0 ? commGap : 0,
      driverGroup: 'Commission',
      payoutCount: Math.round(18 + (i % 7) * 3),
      topDriverPayoutName: i % 2 === 0 ? 'Kamau Otieno' : 'Juma Omondi',
      notes: commGap < 0 ? 'Friday earnings disbursement spike exceeded daily rider collections' : 'Healthy operating cash margin'
    });

    // 2. Daily Target Group (Strict daily targets, predictable cash flow)
    const targetRev = Math.round((120000 + (i % 6) * 9000) * weekendMultiplier);
    const targetPayout = Math.round((85000 + (i % 5) * 6000 + (i % 8 === 0 ? 32000 : 0)) * weekendMultiplier);
    const targetGap = targetRev - targetPayout;

    result['Daily Target'].push({
      date: currentDate,
      dateStr: dayStr,
      formattedDate: fullDate,
      grossRevenueKes: targetRev,
      mpesaPayoutsKes: targetPayout,
      netCashflowGapKes: targetGap,
      isDeficit: targetGap < 0,
      deficitAmountKes: targetGap < 0 ? Math.abs(targetGap) : 0,
      surplusAmountKes: targetGap > 0 ? targetGap : 0,
      driverGroup: 'Daily Target',
      payoutCount: Math.round(14 + (i % 5) * 2),
      topDriverPayoutName: i % 2 === 0 ? 'Benson Mutua' : 'Samuel Mwangi',
      notes: targetGap < 0 ? 'End-of-month target bonus payout generated transient gap' : 'Stable daily target remittance surplus'
    });

    // 3. Weekly Rental Group (Large upfront rental collections, weekly Friday disbursements)
    const rentalRev = Math.round((95000 + (i % 7) * 11000) * (isFriday ? 1.8 : weekendMultiplier));
    const rentalPayout = Math.round((60000 + (isFriday ? 88000 : (i % 4) * 4000)) * weekendMultiplier);
    const rentalGap = rentalRev - rentalPayout;

    result['Weekly Rental'].push({
      date: currentDate,
      dateStr: dayStr,
      formattedDate: fullDate,
      grossRevenueKes: rentalRev,
      mpesaPayoutsKes: rentalPayout,
      netCashflowGapKes: rentalGap,
      isDeficit: rentalGap < 0,
      deficitAmountKes: rentalGap < 0 ? Math.abs(rentalGap) : 0,
      surplusAmountKes: rentalGap > 0 ? rentalGap : 0,
      driverGroup: 'Weekly Rental',
      payoutCount: Math.round(10 + (i % 4) * 2),
      topDriverPayoutName: i % 2 === 0 ? 'Wanjiku Mwangi' : 'Hassan Ali',
      notes: rentalGap < 0 ? 'Weekly rental rebate dispatches temporarily exceeded daily fees' : 'Strong weekly rental cash accumulation'
    });

    // 4. Salary + Commission Group (Monthly base salary + daily commissions)
    const salaryRev = Math.round((80000 + (i % 4) * 7000) * weekendMultiplier);
    const salaryPayout = Math.round((55000 + (i % 3) * 5000 + (i === 15 || i === 29 ? 65000 : 0)) * weekendMultiplier);
    const salaryGap = salaryRev - salaryPayout;

    result['Salary + Commission'].push({
      date: currentDate,
      dateStr: dayStr,
      formattedDate: fullDate,
      grossRevenueKes: salaryRev,
      mpesaPayoutsKes: salaryPayout,
      netCashflowGapKes: salaryGap,
      isDeficit: salaryGap < 0,
      deficitAmountKes: salaryGap < 0 ? Math.abs(salaryGap) : 0,
      surplusAmountKes: salaryGap > 0 ? salaryGap : 0,
      driverGroup: 'Salary + Commission',
      payoutCount: Math.round(8 + (i % 3)),
      topDriverPayoutName: i % 2 === 0 ? 'David Ochieng' : 'Fatuma Hassan',
      notes: salaryGap < 0 ? 'Mid-month commission advance disbursement' : 'Consistent corporate fleet cash inflow'
    });

    // 5. ALL Groups Aggregate
    const allRev = commRev + targetRev + rentalRev + salaryRev;
    const allPayout = commPayout + targetPayout + rentalPayout + salaryPayout;
    const allGap = allRev - allPayout;

    result['ALL'].push({
      date: currentDate,
      dateStr: dayStr,
      formattedDate: fullDate,
      grossRevenueKes: allRev,
      mpesaPayoutsKes: allPayout,
      netCashflowGapKes: allGap,
      isDeficit: allGap < 0,
      deficitAmountKes: allGap < 0 ? Math.abs(allGap) : 0,
      surplusAmountKes: allGap > 0 ? allGap : 0,
      driverGroup: 'ALL',
      payoutCount: Math.round(50 + (i % 10) * 5),
      topDriverPayoutName: 'Juma Omondi (Commission Group)',
      notes: allGap < 0 ? 'Aggregate M-Pesa payout spike exceeds daily collections' : 'Healthy net fleet liquidity buffer'
    });
  }

  return result;
};

const historicalCashFlowMap = generateHistoricalCashFlowData();

export const MpesaCashFlowGapD3Chart: React.FC<MpesaCashFlowGapD3ChartProps> = ({
  drivers = [],
  mpesaPayouts = []
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedGroup, setSelectedGroup] = useState<DriverGroupType>('ALL');
  const [timeframe, setTimeframe] = useState<'14D' | '30D'>('30D');
  const [highlightGaps, setHighlightGaps] = useState<boolean>(true);

  // Selected tooltip data & coordinates
  const [hoveredData, setHoveredData] = useState<DailyCashFlowDataPoint | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number; svgWidth: number } | null>(null);

  // Raw dataset filtering
  const currentDataset = useMemo(() => {
    const rawGroupData = historicalCashFlowMap[selectedGroup] || historicalCashFlowMap['ALL'];
    if (timeframe === '14D') return rawGroupData.slice(-14);
    return rawGroupData;
  }, [selectedGroup, timeframe]);

  // Summary Metrics calculations
  const totalRevenue = useMemo(() => currentDataset.reduce((sum, d) => sum + d.grossRevenueKes, 0), [currentDataset]);
  const totalPayouts = useMemo(() => currentDataset.reduce((sum, d) => sum + d.mpesaPayoutsKes, 0), [currentDataset]);
  const netCashFlow = totalRevenue - totalPayouts;
  const netMarginPct = totalRevenue > 0 ? ((netCashFlow / totalRevenue) * 100).toFixed(1) : '0';

  const deficitDays = useMemo(() => currentDataset.filter(d => d.isDeficit), [currentDataset]);
  const totalDeficitKes = useMemo(() => deficitDays.reduce((sum, d) => sum + d.deficitAmountKes, 0), [deficitDays]);

  const cashFlowRiskLevel = useMemo(() => {
    const deficitRatio = deficitDays.length / currentDataset.length;
    if (deficitRatio >= 0.25 || totalDeficitKes > 100000) return 'HIGH RISK';
    if (deficitRatio >= 0.1 || totalDeficitKes > 30000) return 'MODERATE';
    return 'HEALTHY';
  }, [deficitDays, currentDataset, totalDeficitKes]);

  // --- D3 RENDERING ENGINE WITH SMOOTH TRANSITIONS ---
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svgElement = d3.select(svgRef.current);

    const width = containerRef.current.clientWidth || 800;
    const height = 340;
    const margin = { top: 25, right: 30, bottom: 40, left: 65 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svgElement
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Check or append persistent main group
    let mainGroup = svgElement.select<SVGGElement>('g.main-group');
    let isInitialRender = false;

    if (mainGroup.empty()) {
      isInitialRender = true;
      mainGroup = svgElement.append('g')
        .attr('class', 'main-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // 1. Defs & Gradients
      const defs = mainGroup.append('defs');

      // Deficit Gradient
      const deficitGradient = defs.append('linearGradient')
        .attr('id', 'deficit-grad')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      deficitGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#f43f5e')
        .attr('stop-opacity', 0.45);

      deficitGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#f43f5e')
        .attr('stop-opacity', 0.05);

      // Surplus Gradient
      const surplusGradient = defs.append('linearGradient')
        .attr('id', 'surplus-grad')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      surplusGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#10b981')
        .attr('stop-opacity', 0.25);

      surplusGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#10b981')
        .attr('stop-opacity', 0.02);

      // 2. Structural Layer Groups
      mainGroup.append('g').attr('class', 'grid-lines');
      
      const areasGroup = mainGroup.append('g').attr('class', 'areas-group');
      areasGroup.append('path').attr('class', 'surplus-area');
      areasGroup.append('path').attr('class', 'deficit-area');

      const linesGroup = mainGroup.append('g').attr('class', 'lines-group');
      linesGroup.append('path').attr('class', 'revenue-line')
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 3);

      linesGroup.append('path').attr('class', 'payout-line')
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 3);

      mainGroup.append('g').attr('class', 'points-rev-group');
      mainGroup.append('g').attr('class', 'points-payout-group');
      mainGroup.append('g').attr('class', 'points-deficit-group');

      mainGroup.append('g').attr('class', 'x-axis');
      mainGroup.append('g').attr('class', 'y-axis');

      // Overlay tracking group
      const overlayGroup = mainGroup.append('g').attr('class', 'overlay-group');
      
      overlayGroup.append('line')
        .attr('class', 'guide-line')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3')
        .style('opacity', 0);

      overlayGroup.append('circle')
        .attr('class', 'rev-hover-circle')
        .attr('r', 6)
        .attr('fill', '#10b981')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('opacity', 0);

      overlayGroup.append('circle')
        .attr('class', 'payout-hover-circle')
        .attr('r', 6)
        .attr('fill', '#f43f5e')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('opacity', 0);

      overlayGroup.append('rect')
        .attr('class', 'overlay')
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair');
    }

    // X Scale (Time)
    const xExtent = d3.extent(currentDataset, (d: DailyCashFlowDataPoint) => d.date);
    const xScale = d3.scaleTime()
      .domain([xExtent[0] || new Date(), xExtent[1] || new Date()])
      .range([0, innerWidth]);

    // Y Scale (Linear KES)
    const maxY = d3.max(currentDataset, (d: DailyCashFlowDataPoint) => Math.max(d.grossRevenueKes, d.mpesaPayoutsKes)) || 500000;
    const yScale = d3.scaleLinear()
      .domain([0, maxY * 1.15])
      .range([innerHeight, 0])
      .nice();

    // Transition Config
    const duration = isInitialRender ? 800 : 750;
    const t = svgElement.transition().duration(duration).ease(d3.easeCubicInOut);

    // 1. Gridlines
    const yGrid = d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    const gridGroup = mainGroup.select<SVGGElement>('g.grid-lines');
    gridGroup.transition(t as any).call(yGrid as any);
    gridGroup.selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '3,3');
    gridGroup.selectAll('.domain').remove();

    // 2. Generators for Areas & Lines
    const deficitArea = d3.area<DailyCashFlowDataPoint>()
      .x(d => xScale(d.date))
      .y0(d => yScale(d.grossRevenueKes))
      .y1(d => yScale(Math.max(d.grossRevenueKes, d.mpesaPayoutsKes)))
      .curve(d3.curveMonotoneX);

    const surplusArea = d3.area<DailyCashFlowDataPoint>()
      .x(d => xScale(d.date))
      .y0(d => yScale(d.mpesaPayoutsKes))
      .y1(d => yScale(Math.max(d.mpesaPayoutsKes, d.grossRevenueKes)))
      .curve(d3.curveMonotoneX);

    const revenueLine = d3.line<DailyCashFlowDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.grossRevenueKes))
      .curve(d3.curveMonotoneX);

    const payoutLine = d3.line<DailyCashFlowDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.mpesaPayoutsKes))
      .curve(d3.curveMonotoneX);

    // 3. Smooth Area Path Transitions
    mainGroup.select('path.surplus-area')
      .datum(currentDataset)
      .attr('fill', 'url(#surplus-grad)')
      .transition(t as any)
      .attr('opacity', highlightGaps ? 1 : 0)
      .attr('d', surplusArea);

    mainGroup.select('path.deficit-area')
      .datum(currentDataset)
      .attr('fill', 'url(#deficit-grad)')
      .transition(t as any)
      .attr('opacity', highlightGaps ? 1 : 0)
      .attr('d', deficitArea);

    // 4. Smooth Line Path Transitions
    mainGroup.select('path.revenue-line')
      .datum(currentDataset)
      .transition(t as any)
      .attr('d', revenueLine);

    mainGroup.select('path.payout-line')
      .datum(currentDataset)
      .attr('stroke-dasharray', selectedGroup === 'ALL' ? 'none' : '4,2')
      .transition(t as any)
      .attr('d', payoutLine);

    // 5. Data Points Enter/Update/Exit Transitions (Revenue)
    const revCircles = mainGroup.select('g.points-rev-group')
      .selectAll<SVGCircleElement, DailyCashFlowDataPoint>('circle')
      .data(currentDataset, (d: any) => d.dateStr);

    revCircles.exit()
      .transition(t as any)
      .attr('r', 0)
      .attr('opacity', 0)
      .remove();

    revCircles.enter()
      .append('circle')
      .attr('cx', (d: DailyCashFlowDataPoint) => xScale(d.date))
      .attr('cy', (d: DailyCashFlowDataPoint) => yScale(d.grossRevenueKes))
      .attr('r', 0)
      .attr('fill', '#10b981')
      .attr('stroke', '#022c22')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .attr('opacity', 0)
      .merge(revCircles as any)
      .transition(t as any)
      .attr('cx', (d: DailyCashFlowDataPoint) => xScale(d.date))
      .attr('cy', (d: DailyCashFlowDataPoint) => yScale(d.grossRevenueKes))
      .attr('r', 4)
      .attr('opacity', 1);

    // 6. Data Points Enter/Update/Exit Transitions (Payout)
    const payoutCircles = mainGroup.select('g.points-payout-group')
      .selectAll<SVGCircleElement, DailyCashFlowDataPoint>('circle')
      .data(currentDataset, (d: any) => d.dateStr);

    payoutCircles.exit()
      .transition(t as any)
      .attr('r', 0)
      .attr('opacity', 0)
      .remove();

    payoutCircles.enter()
      .append('circle')
      .attr('cx', (d: DailyCashFlowDataPoint) => xScale(d.date))
      .attr('cy', (d: DailyCashFlowDataPoint) => yScale(d.mpesaPayoutsKes))
      .attr('r', 0)
      .attr('fill', '#f43f5e')
      .attr('stroke', '#4c0519')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .attr('opacity', 0)
      .merge(payoutCircles as any)
      .transition(t as any)
      .attr('cx', (d: DailyCashFlowDataPoint) => xScale(d.date))
      .attr('cy', (d: DailyCashFlowDataPoint) => yScale(d.mpesaPayoutsKes))
      .attr('r', 4)
      .attr('opacity', 1);

    // 7. Deficit Indicator Pulsing Circles Enter/Update/Exit
    const deficitData = currentDataset.filter(d => d.isDeficit);
    const deficitCircles = mainGroup.select('g.points-deficit-group')
      .selectAll<SVGCircleElement, DailyCashFlowDataPoint>('circle')
      .data(deficitData, (d: any) => d.dateStr);

    deficitCircles.exit()
      .transition(t as any)
      .attr('r', 0)
      .attr('opacity', 0)
      .remove();

    const enterDeficit = deficitCircles.enter()
      .append('circle')
      .attr('cx', (d: DailyCashFlowDataPoint) => xScale(d.date))
      .attr('cy', (d: DailyCashFlowDataPoint) => yScale(d.mpesaPayoutsKes))
      .attr('r', 0)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0);

    enterDeficit.append('animate')
      .attr('attributeName', 'r')
      .attr('values', '6;12;6')
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite');

    enterDeficit.merge(deficitCircles as any)
      .transition(t as any)
      .attr('cx', (d: DailyCashFlowDataPoint) => xScale(d.date))
      .attr('cy', (d: DailyCashFlowDataPoint) => yScale(d.mpesaPayoutsKes))
      .attr('r', 8)
      .attr('opacity', 0.8);

    // 8. Axes Transition
    const xAxis = d3.axisBottom(xScale)
      .ticks(timeframe === '14D' ? 7 : 10)
      .tickFormat(d => d3.timeFormat('%b %d')(d as Date));

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `KES ${(Number(d) / 1000).toFixed(0)}k`);

    const xAxisGroup = mainGroup.select<SVGGElement>('g.x-axis');
    xAxisGroup
      .attr('transform', `translate(0,${innerHeight})`)
      .transition(t as any)
      .call(xAxis as any)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#94a3b8');

    const yAxisGroup = mainGroup.select<SVGGElement>('g.y-axis');
    yAxisGroup
      .transition(t as any)
      .call(yAxis as any)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#94a3b8');

    mainGroup.selectAll('.domain').attr('stroke', '#334155');

    // 9. Interactive Overlay Setup
    const guideLine = mainGroup.select('line.guide-line');
    const revHoverCircle = mainGroup.select('circle.rev-hover-circle');
    const payoutHoverCircle = mainGroup.select('circle.payout-hover-circle');
    const overlay = mainGroup.select('rect.overlay');

    overlay
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        const xDate = xScale.invert(mouseX);

        const bisect = d3.bisector((d: DailyCashFlowDataPoint) => d.date).center;
        const index = bisect(currentDataset, xDate);
        const closestPoint = currentDataset[index];

        if (closestPoint) {
          setHoveredData(closestPoint);

          const cx = xScale(closestPoint.date);
          const cyRev = yScale(closestPoint.grossRevenueKes);
          const cyPayout = yScale(closestPoint.mpesaPayoutsKes);

          guideLine
            .attr('x1', cx)
            .attr('x2', cx)
            .attr('y1', 0)
            .attr('y2', innerHeight)
            .style('opacity', 1);

          revHoverCircle
            .attr('cx', cx)
            .attr('cy', cyRev)
            .style('opacity', 1);

          payoutHoverCircle
            .attr('cx', cx)
            .attr('cy', cyPayout)
            .style('opacity', 1);

          setHoverCoords({
            x: cx + margin.left,
            y: Math.min(cyRev, cyPayout) + margin.top,
            svgWidth: width
          });
        }
      })
      .on('mouseleave', () => {
        guideLine.style('opacity', 0);
        revHoverCircle.style('opacity', 0);
        payoutHoverCircle.style('opacity', 0);
        setHoveredData(null);
        setHoverCoords(null);
      });

  }, [currentDataset, highlightGaps, timeframe, selectedGroup]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Driver Group',
      'Gross Revenue (KES)',
      'M-Pesa Dispatched Payouts (KES)',
      'Net Cash Flow Gap (KES)',
      'Cash Flow Status',
      'Deficit Amount (KES)',
      'Payout Dispatches Count',
      'Top Driver Paid',
      'Operational Notes'
    ];

    const rows = currentDataset.map(d => [
      `"${d.formattedDate}"`,
      `"${d.driverGroup}"`,
      d.grossRevenueKes,
      d.mpesaPayoutsKes,
      d.netCashflowGapKes,
      d.isDeficit ? 'DEFICIT GAP' : 'SURPLUS',
      d.deficitAmountKes,
      d.payoutCount,
      `"${d.topDriverPayoutName}"`,
      `"${d.notes.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mpesa_payout_vs_revenue_cashflow_gap_${selectedGroup.toLowerCase().replace(/\s+/g, '_')}_${timeframe}.csv`;
    link.click();
    toast.success(`Exported M-Pesa Cash-Flow Gap D3 Report CSV for ${selectedGroup}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Daily M-Pesa Payout Trends vs. Gross Revenue (D3 Engine)
              </h3>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 text-rose-400 fill-current" />
                Cash-Flow Gap Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              D3-powered dual time-series visualization identifying liquidity bottlenecks, payout spikes, and cash-flow deficits across driver employment models.
            </p>
          </div>
        </div>

        {/* CONTROLS TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Driver Group Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            {(['ALL', 'Commission', 'Daily Target', 'Weekly Rental', 'Salary + Commission'] as DriverGroupType[]).map(group => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedGroup === group
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {group === 'ALL' ? 'All Groups' : group}
              </button>
            ))}
          </div>

          {/* Timeframe Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setTimeframe('14D')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeframe === '14D' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setTimeframe('30D')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeframe === '30D' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Highlight Gap Toggle */}
          <button
            onClick={() => setHighlightGaps(!highlightGaps)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 cursor-pointer ${
              highlightGaps
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{highlightGaps ? 'Gaps Highlighted' : 'Show Gap Fills'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export D3 CSV</span>
          </button>

        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        
        {/* Total Gross Revenue Collected */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Gross Driver Revenue</span>
            </span>
            <span className="text-emerald-400 text-[10px] bg-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
              Group: {selectedGroup}
            </span>
          </div>
          <div className="text-xl font-black text-emerald-400 mt-1.5">
            KES {totalRevenue.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">Total trip collections ({timeframe})</p>
        </div>

        {/* Total M-Pesa Dispatches */}
        <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <span>M-Pesa Dispatched</span>
            </span>
            <span className="text-rose-400 text-[10px] bg-rose-500/20 font-bold px-1.5 py-0.5 rounded">
              Outflow
            </span>
          </div>
          <div className="text-xl font-black text-rose-400 mt-1.5">
            KES {totalPayouts.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">Total B2C payout dispatches ({timeframe})</p>
        </div>

        {/* Net Cash Flow Surplus / Deficit */}
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Net Liquidity Margin</span>
            </span>
            <span className="text-cyan-300 text-[10px] bg-cyan-500/20 font-bold px-1.5 py-0.5 rounded">
              {netMarginPct}% Margin
            </span>
          </div>
          <div className={`text-xl font-black mt-1.5 ${netCashFlow >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
            {netCashFlow >= 0 ? `+KES ${netCashFlow.toLocaleString()}` : `-KES ${Math.abs(netCashFlow).toLocaleString()}`}
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">Retained platform cash cushion</p>
        </div>

        {/* Cash-Flow Deficit Risk Assessment */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 font-sans font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Cash-Flow Risk Level</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              cashFlowRiskLevel === 'HIGH RISK'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : cashFlowRiskLevel === 'MODERATE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {cashFlowRiskLevel}
            </span>
          </div>
          <div className="text-xl font-black text-amber-300 mt-1.5 flex items-center gap-1.5">
            <span>{deficitDays.length} Deficit Days</span>
          </div>
          <p className="text-[10px] font-sans text-slate-400 mt-0.5">
            {deficitDays.length > 0 ? `KES ${totalDeficitKes.toLocaleString()} temporary gap` : 'Zero liquidity gaps recorded'}
          </p>
        </div>

      </div>

      {/* D3 SVG CANVAS CONTAINER */}
      <div className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-inner">
        
        {/* Custom D3 Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-2 pb-2 border-b border-slate-800/80 font-medium">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              Gross Revenue Collections (KES)
            </span>

            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-3 h-1 bg-rose-500 rounded"></span>
              M-Pesa Dispatched Payouts (KES)
            </span>

            {highlightGaps && (
              <>
                <span className="flex items-center gap-1 text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded text-[11px]">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/60 inline-block"></span>
                  Cash-Flow Deficit Area (Payouts &gt; Revenue)
                </span>

                <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 inline-block"></span>
                  Cash-Flow Surplus Buffer
                </span>
              </>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Interactive D3 Tooltip: Hover over chart nodes to inspect daily breakdown
          </span>
        </div>

        {/* SVG Node */}
        <div ref={containerRef} className="w-full relative">
          <svg ref={svgRef} className="w-full overflow-visible"></svg>

          {/* FLOATING HOVER TOOLTIP OVER D3 CANVAS */}
          {hoveredData && hoverCoords && (
            <div 
              className="absolute z-30 pointer-events-none transition-all duration-75 ease-out"
              style={{
                left: `${Math.min(Math.max(hoverCoords.x, 140), hoverCoords.svgWidth - 140)}px`,
                top: `${Math.max(hoverCoords.y - 12, 35)}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-3 text-xs w-64 space-y-2 font-sans text-slate-100 ring-1 ring-white/10">
                
                {/* Date & Status Pill */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-white text-xs tracking-tight">{hoveredData.formattedDate}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    hoveredData.isDeficit 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {hoveredData.isDeficit ? 'Deficit Gap' : 'Surplus Buffer'}
                  </span>
                </div>

                {/* Metrics Rows */}
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 font-sans text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Gross Revenue:
                    </span>
                    <strong className="text-emerald-400 font-extrabold">KES {hoveredData.grossRevenueKes.toLocaleString()}</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 font-sans text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      M-Pesa Payouts:
                    </span>
                    <strong className="text-rose-400 font-extrabold">KES {hoveredData.mpesaPayoutsKes.toLocaleString()}</strong>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="font-sans text-slate-400">Net Cash Gap:</span>
                    <strong className={`font-black ${
                      (hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes) >= 0 ? 'text-cyan-300' : 'text-rose-400'
                    }`}>
                      {(hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes) >= 0 
                        ? `+KES ${(hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes).toLocaleString()}` 
                        : `-KES ${Math.abs(hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes).toLocaleString()}`}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-sans text-slate-400">Net Margin %:</span>
                    {(() => {
                      const gap = hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes;
                      const marginPct = hoveredData.grossRevenueKes > 0 
                        ? ((gap / hoveredData.grossRevenueKes) * 100).toFixed(1) 
                        : '0.0';
                      const isPos = Number(marginPct) >= 0;
                      return (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          isPos 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {isPos ? `+${marginPct}%` : `${marginPct}%`} Margin
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Group & Dispatch Details */}
                <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-sans leading-tight">
                  <div>Driver Group: <strong className="text-slate-200">{hoveredData.driverGroup}</strong></div>
                  <div className="mt-0.5">M-Pesa Dispatches: <strong className="text-slate-200">{hoveredData.payoutCount} payouts</strong> (Top: {hoveredData.topDriverPayoutName})</div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* HOVERED DATA TOOLTIP CARD BELOW CHART */}
        {hoveredData && (
          <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                hoveredData.isDeficit ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {hoveredData.isDeficit ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm">{hoveredData.formattedDate}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    hoveredData.isDeficit ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {hoveredData.isDeficit ? `KES ${hoveredData.deficitAmountKes.toLocaleString()} DEFICIT GAP` : `KES ${hoveredData.surplusAmountKes.toLocaleString()} SURPLUS`}
                  </span>
                  {(() => {
                    const gap = hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes;
                    const marginPct = hoveredData.grossRevenueKes > 0 
                      ? ((gap / hoveredData.grossRevenueKes) * 100).toFixed(1) 
                      : '0.0';
                    const isPos = Number(marginPct) >= 0;
                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        isPos ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {isPos ? `+${marginPct}% Net Margin` : `${marginPct}% Net Margin`}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Group: <strong className="text-slate-200">{hoveredData.driverGroup}</strong> | Dispatches: <strong className="text-slate-200">{hoveredData.payoutCount} payouts sent</strong> (Top: {hoveredData.topDriverPayoutName})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right self-end sm:self-center font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans">Gross Revenue</span>
                <span className="text-sm font-bold text-emerald-400">KES {hoveredData.grossRevenueKes.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans">M-Pesa Payouts</span>
                <span className="text-sm font-bold text-rose-400">KES {hoveredData.mpesaPayoutsKes.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans">Net Cash Flow</span>
                <span className={`text-sm font-bold ${(hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes) >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {(hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes) >= 0 
                    ? `+KES ${(hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes).toLocaleString()}` 
                    : `-KES ${Math.abs(hoveredData.grossRevenueKes - hoveredData.mpesaPayoutsKes).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* DRIVER GROUP CASH-FLOW PROFILE BREAKDOWN MATRIX */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Driver Group Cash-Flow Vulnerability & Liquidity Profiles</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Commission Drivers */}
          <div className={`p-3.5 rounded-xl border transition ${
            selectedGroup === 'Commission'
              ? 'bg-slate-900 border-rose-500/60 shadow-lg'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white">Commission Drivers</span>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                Friday Spike Risk
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Immediate per-trip payout requests cause weekly Friday cash spikes where driver disbursements temporarily exceed daily platform earnings.
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Recommended Action:</span>
              <span className="text-emerald-400 font-bold">Stagger Friday Payout Windows</span>
            </div>
          </div>

          {/* Daily Target Riders */}
          <div className={`p-3.5 rounded-xl border transition ${
            selectedGroup === 'Daily Target'
              ? 'bg-slate-900 border-emerald-500/60 shadow-lg'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white">Daily Target Riders</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                High Liquidity
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Predictable fixed daily target payments create steady cash inflows. Minimal deficit occurrence except on end-of-month target bonus distributions.
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Cash Flow Health:</span>
              <span className="text-emerald-400 font-bold">Strong Inflow Anchor</span>
            </div>
          </div>

          {/* Weekly Rental Riders */}
          <div className={`p-3.5 rounded-xl border transition ${
            selectedGroup === 'Weekly Rental'
              ? 'bg-slate-900 border-amber-500/60 shadow-lg'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white">Weekly Rental Riders</span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                Cyclical Inflow
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Large upfront weekly rental fee collections provide significant working capital cash buffers, with scheduled rebate payouts on Mondays.
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Cash Buffer:</span>
              <span className="text-amber-300 font-bold">+28% Working Capital</span>
            </div>
          </div>

          {/* Salary + Commission */}
          <div className={`p-3.5 rounded-xl border transition ${
            selectedGroup === 'Salary + Commission'
              ? 'bg-slate-900 border-indigo-500/60 shadow-lg'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white">Salary + Commission</span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                Corporate Fleet
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Corporate delivery contracts ensure guaranteed client invoicing, with mid-month commission advances handled automatically via M-Pesa.
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Predictability:</span>
              <span className="text-indigo-300 font-bold">98% Invoicing Match</span>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER ADVISORY */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            D3 cash-flow gap calculations automatically cross-reference M-Pesa B2C payout logs against real-time trip fare revenue to prevent liquidity shortfalls.
          </span>
        </div>
      </div>

    </div>
  );
};
