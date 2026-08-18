import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TrendingUp, Zap, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RevenueVelocityGaugeProps {
  currentRevenueKes: number;
  targetRevenueKes: number;
  size?: 'sm' | 'md' | 'lg';
  driverName?: string;
  showLabels?: boolean;
  hoursElapsed?: number; // e.g. 6 hours into a 10-hour shift
}

export const RevenueVelocityGauge: React.FC<RevenueVelocityGaugeProps> = ({
  currentRevenueKes,
  targetRevenueKes = 4500,
  size = 'md',
  driverName,
  showLabels = true,
  hoursElapsed = 6
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const velocityRatio = Math.min(1.5, Math.max(0, currentRevenueKes / Math.max(1, targetRevenueKes)));
  const velocityPercent = Math.round((currentRevenueKes / Math.max(1, targetRevenueKes)) * 100);

  // Projected end-of-day revenue based on hourly run-rate (assuming 10-hr standard shift)
  const shiftLengthHours = 10;
  const currentHourlyRate = hoursElapsed > 0 ? currentRevenueKes / hoursElapsed : 0;
  const projectedEodRevenueKes = Math.round(currentHourlyRate * shiftLengthHours);

  // Status classification
  let statusColor = '#3b82f6'; // blue
  let statusLabel = 'On Track';
  let badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/30';

  if (velocityPercent < 50) {
    statusColor = '#f59e0b'; // amber
    statusLabel = 'Behind Pace';
    badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  } else if (velocityPercent < 85) {
    statusColor = '#06b6d4'; // cyan
    statusLabel = 'Steady Pace';
    badgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  } else if (velocityPercent < 100) {
    statusColor = '#10b981'; // emerald
    statusLabel = 'Near Target';
    badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  } else {
    statusColor = '#eab308'; // gold
    statusLabel = 'Target Met 🏆';
    badgeClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  }

  // Dimensions based on size
  const width = size === 'sm' ? 100 : size === 'lg' ? 180 : 130;
  const height = size === 'sm' ? 58 : size === 'lg' ? 105 : 76;
  const outerRadius = width / 2 - 4;
  const innerRadius = outerRadius - (size === 'sm' ? 10 : size === 'lg' ? 18 : 14);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${outerRadius + 4})`);

    // Angles from -90 degrees (-PI/2) to +90 degrees (+PI/2)
    const minAngle = -Math.PI / 2;
    const maxAngle = Math.PI / 2;

    const angleScale = d3.scaleLinear()
      .domain([0, 1]) // 0% to 100%
      .range([minAngle, maxAngle])
      .clamp(true);

    const activeAngle = angleScale(Math.min(1, velocityRatio));

    // D3 Arc generator for Background
    const backgroundArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(minAngle)
      .endAngle(maxAngle)
      .cornerRadius(4);

    // Draw background track
    g.append('path')
      .attr('d', backgroundArc as any)
      .attr('fill', '#1e293b'); // slate-800

    // Gradient definitions
    const defs = svg.append('defs');
    const gradientId = `gauge-grad-${Math.random().toString(36).substring(2, 7)}`;
    const linearGrad = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    linearGrad.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f59e0b'); // amber

    linearGrad.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#06b6d4'); // cyan

    linearGrad.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', statusColor);

    // Active Arc generator
    const activeArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(minAngle)
      .endAngle(activeAngle)
      .cornerRadius(4);

    // Draw active arc path
    g.append('path')
      .attr('d', activeArc as any)
      .attr('fill', `url(#${gradientId})`);

    // Needle indicator
    const needleAngle = activeAngle - Math.PI / 2;
    const needleLength = outerRadius - 2;

    const needleX = needleLength * Math.cos(needleAngle);
    const needleY = needleLength * Math.sin(needleAngle);

    // Needle line
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', needleX)
      .attr('y2', needleY)
      .attr('stroke', '#f8fafc')
      .attr('stroke-width', size === 'sm' ? 2 : 2.5)
      .attr('stroke-linecap', 'round');

    // Needle pivot circle
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', size === 'sm' ? 3 : 4)
      .attr('fill', '#f8fafc')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5);

  }, [currentRevenueKes, targetRevenueKes, size, velocityRatio, statusColor, width, height, outerRadius, innerRadius]);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative flex justify-center items-center">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height} 
          className="overflow-visible"
        />
        
        {/* Center Percentage Display */}
        <div 
          className="absolute text-center"
          style={{ bottom: size === 'sm' ? '0px' : size === 'lg' ? '6px' : '2px' }}
        >
          <span className={`font-black font-mono text-white ${
            size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-lg' : 'text-sm'
          }`}>
            {velocityPercent}%
          </span>
        </div>
      </div>

      {showLabels && (
        <div className="text-center mt-1 space-y-0.5">
          <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border inline-flex items-center gap-1 ${badgeClass}`}>
            <TrendingUp className="w-2.5 h-2.5" />
            <span>{statusLabel}</span>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            <span className="text-emerald-400 font-bold">KES {Math.round(currentRevenueKes / 1000 * 10) / 10}k</span>
            <span className="text-slate-500"> / {Math.round(targetRevenueKes / 1000 * 10) / 10}k goal</span>
          </div>

          {size !== 'sm' && (
            <div className="text-[9px] text-slate-500 font-mono">
              Proj. EOD: <span className="text-indigo-300 font-bold">KES {projectedEodRevenueKes.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
