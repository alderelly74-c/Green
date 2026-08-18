import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Gauge, TrendingUp, Calendar, Info, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';

interface FleetUtilizationChartProps {
  totalVehicles: number;
}

interface UtilizationDataPoint {
  dayIndex: number; // 0..29
  dateStr: string; // e.g., 'Jul 10'
  fullDate: Date;
  dayOfWeek: string; // 'Mon', 'Tue', etc.
  utilizationRate: number; // e.g. 84%
  activeVehicles: number;
  isPeak: boolean;
  isTrough: boolean;
}

export const FleetUtilizationChart: React.FC<FleetUtilizationChartProps> = ({ totalVehicles }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [timeRange, setTimeRange] = useState<30 | 14 | 7>(30);

  // Generate deterministic 30-day utilization timeline anchored to today (2026-08-08)
  const generate30DayData = (): UtilizationDataPoint[] => {
    const data: UtilizationDataPoint[] = [];
    const baseTotal = totalVehicles > 0 ? totalVehicles : 24;

    const today = new Date('2026-08-08');

    // Pseudo-random seeded pattern based on day offset for consistent UI rendering
    const basePattern = [
      78, 82, 85, 89, 94, 91, 68, // Week 1 (Mon-Sun)
      76, 84, 87, 91, 96, 92, 65, // Week 2
      80, 83, 88, 92, 98, 89, 70, // Week 3
      81, 85, 86, 90, 95, 88, 64, // Week 4
      83, 87                     // Last 2 days
    ];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const dayIndex = 29 - i;
      const rateRaw = basePattern[dayIndex % basePattern.length];
      // Add slight variance
      const rate = Math.min(99, Math.max(55, rateRaw));
      const activeCount = Math.round((rate / 100) * baseTotal);

      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });

      data.push({
        dayIndex,
        dateStr,
        fullDate: d,
        dayOfWeek,
        utilizationRate: rate,
        activeVehicles: activeCount,
        isPeak: false,
        isTrough: false
      });
    }

    // Identify global max and min within generated data
    let maxRate = -1;
    let minRate = 101;
    data.forEach(dp => {
      if (dp.utilizationRate > maxRate) maxRate = dp.utilizationRate;
      if (dp.utilizationRate < minRate) minRate = dp.utilizationRate;
    });

    data.forEach(dp => {
      if (dp.utilizationRate === maxRate) dp.isPeak = true;
      if (dp.utilizationRate === minRate) dp.isTrough = true;
    });

    return data;
  };

  const fullData = generate30DayData();
  const filteredData = fullData.slice(30 - timeRange);

  // Key metrics for badges
  const avgUtilization = Math.round(filteredData.reduce((acc, d) => acc + d.utilizationRate, 0) / filteredData.length);
  const peakDay = filteredData.reduce((max, d) => d.utilizationRate > max.utilizationRate ? d : max, filteredData[0]);
  const troughDay = filteredData.reduce((min, d) => d.utilizationRate < min.utilizationRate ? d : min, filteredData[0]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous D3 renders
    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth || 750;
    const height = 320;
    const margin = { top: 35, right: 35, bottom: 45, left: 45 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3.select(svgRef.current);
    svg.attr('width', containerWidth).attr('height', height);

    // Check or append persistent main chart group
    let chartGroup = svg.select<SVGGElement>('g.main-chart-group');
    let isInitialRender = false;

    if (chartGroup.empty()) {
      isInitialRender = true;
      chartGroup = svg.append('g')
        .attr('class', 'main-chart-group')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', 'utilization-gradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#4f46e5')
        .attr('stop-opacity', 0.3);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#4f46e5')
        .attr('stop-opacity', 0.0);

      chartGroup.append('g').attr('class', 'grid-y');
      chartGroup.append('path').attr('class', 'area-path').attr('fill', 'url(#utilization-gradient)');
      chartGroup.append('path').attr('class', 'line-path').attr('fill', 'none').attr('stroke', '#4f46e5').attr('stroke-width', 3);
      
      const benchGroup = chartGroup.append('g').attr('class', 'benchmark-group');
      benchGroup.append('line').attr('class', 'bench-line').attr('stroke', '#10b981').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,4');
      benchGroup.append('text').attr('class', 'bench-text').attr('fill', '#059669').attr('font-size', '10px').attr('font-weight', '700').text('Target Peak Utilization (85%)');

      chartGroup.append('g').attr('class', 'points-group');
      chartGroup.append('g').attr('class', 'x-axis');
      chartGroup.append('g').attr('class', 'y-axis');
    }

    // X Scale
    const xScale = d3.scalePoint<string>()
      .domain(filteredData.map(d => d.dateStr))
      .range([0, width])
      .padding(0.3);

    // Y Scale (50% to 100%)
    const yScale = d3.scaleLinear()
      .domain([50, 100])
      .range([height - margin.top - margin.bottom, 0]);

    const duration = isInitialRender ? 800 : 700;
    const t = svg.transition().duration(duration).ease(d3.easeCubicInOut);

    // Horizontal Grid Lines
    const yGrid = d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => '');

    const gridGroup = chartGroup.select<SVGGElement>('g.grid-y');
    gridGroup.transition(t as any).call(yGrid as any);
    gridGroup.selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,3');
    gridGroup.selectAll('.domain').remove();

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${d}%`);

    const xAxisGroup = chartGroup.select<SVGGElement>('g.x-axis');
    xAxisGroup
      .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
      .transition(t as any)
      .call(xAxis as any)
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', timeRange === 30 ? '9px' : '11px')
      .attr('font-weight', '600')
      .attr('dy', '1.2em')
      .attr('transform', timeRange === 30 ? 'rotate(-25)' : 'rotate(0)')
      .style('text-anchor', timeRange === 30 ? 'end' : 'middle');

    const yAxisGroup = chartGroup.select<SVGGElement>('g.y-axis');
    yAxisGroup
      .transition(t as any)
      .call(yAxis as any)
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .attr('font-weight', '600');

    chartGroup.selectAll('.domain').attr('stroke', '#cbd5e1');

    // D3 Line Generator
    const lineGen = d3.line<UtilizationDataPoint>()
      .x(d => xScale(d.dateStr) || 0)
      .y(d => yScale(d.utilizationRate))
      .curve(d3.curveMonotoneX);

    // D3 Gradient Area Generator
    const areaGen = d3.area<UtilizationDataPoint>()
      .x(d => xScale(d.dateStr) || 0)
      .y0(height - margin.top - margin.bottom)
      .y1(d => yScale(d.utilizationRate))
      .curve(d3.curveMonotoneX);

    // Smooth Path Transitions
    chartGroup.select('path.area-path')
      .datum(filteredData)
      .transition(t as any)
      .attr('d', areaGen);

    chartGroup.select('path.line-path')
      .datum(filteredData)
      .transition(t as any)
      .attr('d', lineGen);

    // 85% Benchmark Line
    const benchY = yScale(85);
    chartGroup.select('line.bench-line')
      .transition(t as any)
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', benchY)
      .attr('y2', benchY);

    chartGroup.select('text.bench-text')
      .transition(t as any)
      .attr('x', width - 5)
      .attr('y', benchY - 5)
      .attr('text-anchor', 'end');

    // Tooltip Selection
    let tooltipDiv = d3.select(containerRef.current).select<HTMLDivElement>('.d3-util-tooltip');
    if (tooltipDiv.empty()) {
      tooltipDiv = d3.select(containerRef.current)
        .append('div')
        .attr('class', 'd3-util-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', '#0f172a')
        .style('border', '1px solid #4f46e5')
        .style('padding', '8px 12px')
        .style('border-radius', '8px')
        .style('color', '#fff')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '100')
        .style('box-shadow', '0 10px 25px rgba(0,0,0,0.3)');
    }

    // Render Data Circles
    const circles = chartGroup.select('g.points-group')
      .selectAll<SVGCircleElement, UtilizationDataPoint>('circle')
      .data(filteredData, d => d.dateStr);

    circles.exit()
      .transition(t as any)
      .attr('r', 0)
      .attr('opacity', 0)
      .remove();

    circles.enter()
      .append('circle')
      .attr('cx', d => xScale(d.dateStr) || 0)
      .attr('cy', d => yScale(d.utilizationRate))
      .attr('r', 0)
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .merge(circles)
      .attr('fill', d => d.isPeak ? '#059669' : (d.isTrough ? '#dc2626' : '#4f46e5'))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', d => (d.isPeak || d.isTrough ? 2.5 : 1.5))
      .on('mouseover', (event, d) => {
        tooltipDiv
          .style('visibility', 'visible')
          .html(`
            <div class="font-extrabold text-indigo-300 text-xs pb-1 mb-1 border-b border-slate-700">${d.dateStr} (${d.dayOfWeek})</div>
            <div>Fleet Utilization: <strong class="text-emerald-400 font-bold">${d.utilizationRate}%</strong></div>
            <div>Active Fleet: <strong class="text-white">${d.activeVehicles} / ${totalVehicles} units</strong></div>
            ${d.isPeak ? '<div class="text-[10px] text-emerald-400 font-bold mt-1">🔥 Peak Monthly Operational Volume</div>' : ''}
            ${d.isTrough ? '<div class="text-[10px] text-rose-400 font-bold mt-1">⚠️ Low Demand Trough</div>' : ''}
          `);
      })
      .on('mousemove', (event) => {
        tooltipDiv
          .style('top', `${event.offsetY - 70}px`)
          .style('left', `${Math.min(event.offsetX, containerWidth - 180)}px`);
      })
      .on('mouseout', () => {
        tooltipDiv.style('visibility', 'hidden');
      })
      .transition(t as any)
      .attr('cx', d => xScale(d.dateStr) || 0)
      .attr('cy', d => yScale(d.utilizationRate))
      .attr('r', d => (d.isPeak || d.isTrough ? 6 : 4))
      .attr('opacity', 1);

  }, [filteredData, timeRange, totalVehicles]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4" ref={containerRef}>
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Fleet Utilization Rate Trend (D3.js Visualization)
            </h3>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-full">
              30-Day Dispatch Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identifies daily delivery peaks and idle troughs to optimize shift schedules and fleet availability.
          </p>
        </div>

        {/* Time Window Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-stretch sm:self-auto">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
              timeRange === 7 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange(14)}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
              timeRange === 14 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            14 Days
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
              timeRange === 30 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Analytics KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Fleet Utilization</span>
            <span className="text-lg font-black text-indigo-700">{avgUtilization}%</span>
          </div>
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
            <Gauge className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">30-Day Peak Demand</span>
            <span className="text-lg font-black text-emerald-700">
              {peakDay.utilizationRate}% <span className="text-xs font-medium text-emerald-800">({peakDay.dateStr})</span>
            </span>
          </div>
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 p-3 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-800 block">30-Day Trough / Low</span>
            <span className="text-lg font-black text-rose-700">
              {troughDay.utilizationRate}% <span className="text-xs font-medium text-rose-800">({troughDay.dateStr})</span>
            </span>
          </div>
          <div className="p-2 bg-rose-100 rounded-lg text-rose-800">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* D3 SVG Canvas */}
      <div className="relative w-full bg-slate-50/50 rounded-xl p-2 border border-slate-200 overflow-hidden">
        <svg ref={svgRef} className="w-full h-auto" />
      </div>

      {/* Legend & Dispatch Tip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-indigo-600 rounded-full" />
            <span className="font-medium text-slate-700">Active Utilization Line</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 border-b-2 border-dashed border-emerald-600" />
            <span className="font-medium text-emerald-700">85% Target Benchmark</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>Dispatch Insight: Friday &amp; Saturday display consistent peak demand across Kenya operations.</span>
        </div>
      </div>

    </div>
  );
};
