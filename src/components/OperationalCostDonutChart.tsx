import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Vehicle, MpesaPayoutRequest } from '../types';
import { 
  Fuel, Zap, Wrench, Building2, PieChart as PieChartIcon, 
  Download, Calendar, ShieldCheck, DollarSign, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react';
import { toast } from 'sonner';

interface OperationalCostDonutChartProps {
  vehicles?: Vehicle[];
  mpesaPayouts?: MpesaPayoutRequest[];
}

export type MonthPeriod = 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'YTD_2026';

export interface CostCategoryItem {
  key: 'fuel' | 'electricity' | 'maintenance' | 'admin';
  name: string;
  valueKes: number;
  color: string;
  hoverColor: string;
  icon: React.ElementType;
  description: string;
  prevMonthValueKes: number;
}

export const OperationalCostDonutChart: React.FC<OperationalCostDonutChartProps> = ({
  vehicles = [],
  mpesaPayouts = []
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedMonth, setSelectedMonth] = useState<MonthPeriod>('CURRENT_MONTH');
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<CostCategoryItem | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Calculate actual costs for Fuel, Electricity, Maintenance, and Administrative fees for Current Month & historic
  const costBreakdownData = useMemo(() => {
    // Current live fleet totals from props
    const rawFuel = vehicles.reduce((sum, v) => sum + (v.totalFuelSpentKes || 0), 0);
    const rawCharging = vehicles.reduce((sum, v) => sum + (v.totalChargingSpentKes || 0), 0);
    const rawMaint = vehicles.reduce((sum, v) => sum + (v.totalMaintenanceSpentKes || 0), 0);
    
    // Baseline numbers for August 2026 (Current Month)
    const fuelCurrent = rawFuel > 0 ? Math.round(rawFuel * 0.35) : 920000;
    const electricityCurrent = rawCharging > 0 ? Math.round(rawCharging * 0.38) : 480000;
    const maintCurrent = rawMaint > 0 ? Math.round(rawMaint * 0.32) : 650000;
    const adminCurrent = 800000; // Administrative fees (Platform licensing, insurance, permits, driver admin)

    // Baseline numbers for Previous Month (July 2026)
    const fuelPrev = 880000;
    const electricityPrev = 420000;
    const maintPrev = 710000;
    const adminPrev = 780000;

    // Baseline YTD 2026
    const fuelYtd = rawFuel > 0 ? rawFuel : 5800000;
    const electricityYtd = rawCharging > 0 ? rawCharging : 3100000;
    const maintYtd = rawMaint > 0 ? rawMaint : 4200000;
    const adminYtd = 5100000;

    let fuelVal = fuelCurrent;
    let elecVal = electricityCurrent;
    let maintVal = maintCurrent;
    let adminVal = adminCurrent;

    if (selectedMonth === 'PREVIOUS_MONTH') {
      fuelVal = fuelPrev;
      elecVal = electricityPrev;
      maintVal = maintPrev;
      adminVal = adminPrev;
    } else if (selectedMonth === 'YTD_2026') {
      fuelVal = fuelYtd;
      elecVal = electricityYtd;
      maintVal = maintYtd;
      adminVal = adminYtd;
    }

    const categories: CostCategoryItem[] = [
      {
        key: 'fuel',
        name: 'Fuel',
        valueKes: fuelVal,
        color: '#f59e0b', // Amber
        hoverColor: '#fbbf24',
        icon: Fuel,
        description: 'Diesel & petrol fleet refueling expenses',
        prevMonthValueKes: fuelPrev
      },
      {
        key: 'electricity',
        name: 'Electricity',
        valueKes: elecVal,
        color: '#10b981', // Emerald EV Green
        hoverColor: '#34d399',
        icon: Zap,
        description: 'EV battery rapid charging & grid power',
        prevMonthValueKes: electricityPrev
      },
      {
        key: 'maintenance',
        name: 'Maintenance',
        valueKes: maintVal,
        color: '#38bdf8', // Sky Blue
        hoverColor: '#7dd3fc',
        icon: Wrench,
        description: 'Vehicle servicing, spare parts & battery care',
        prevMonthValueKes: maintPrev
      },
      {
        key: 'admin',
        name: 'Administrative fees',
        valueKes: adminVal,
        color: '#8b5cf6', // Purple
        hoverColor: '#a78bfa',
        icon: Building2,
        description: 'Platform licensing, insurance, permits & admin',
        prevMonthValueKes: adminPrev
      }
    ];

    const totalOpex = categories.reduce((sum, item) => sum + item.valueKes, 0);

    return {
      categories,
      totalOpex
    };
  }, [vehicles, mpesaPayouts, selectedMonth]);

  // --- D3 RENDERING ENGINE FOR DONUT CHART ---
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svgElement = d3.select(svgRef.current);
    const width = 320;
    const height = 320;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.65; // Donut hole size

    svgElement
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    let mainG = svgElement.select<SVGGElement>('g.donut-main');
    if (mainG.empty()) {
      mainG = svgElement.append('g')
        .attr('class', 'donut-main')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
    }

    // Pie Layout Generator
    const pie = d3.pie<CostCategoryItem>()
      .value(d => d.valueKes)
      .sort(null)
      .padAngle(0.03);

    // Normal Arc Generator
    const arc = d3.arc<d3.PieArcDatum<CostCategoryItem>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(6);

    // Hover Arc Generator (Expands outwards)
    const arcHover = d3.arc<d3.PieArcDatum<CostCategoryItem>>()
      .innerRadius(innerRadius - 4)
      .outerRadius(radius + 10)
      .cornerRadius(8);

    const pieData = pie(costBreakdownData.categories);

    // Join Slices
    const paths = mainG.selectAll<SVGPathElement, d3.PieArcDatum<CostCategoryItem>>('path.donut-slice')
      .data(pieData, (d: any) => d.data.key);

    // EXIT
    paths.exit().remove();

    // ENTER + UPDATE
    paths.enter()
      .append('path')
      .attr('class', 'donut-slice')
      .attr('fill', d => d.data.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .each(function(d) { (this as any)._current = d; }) // Store current angles for smooth interpolation
      .merge(paths as any)
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover as any)
          .attr('fill', d.data.hoverColor)
          .style('filter', 'drop-shadow(0px 0px 10px rgba(255, 255, 255, 0.3))');

        setActiveCategoryKey(d.data.key);
        setHoveredData(d.data);

        const [mx, my] = d3.pointer(event, containerRef.current);
        setHoverCoords({ x: mx, y: my });
      })
      .on('mousemove', function(event) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setHoverCoords({ x: mx, y: my });
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any)
          .attr('fill', d.data.color)
          .style('filter', 'none');

        setActiveCategoryKey(null);
        setHoveredData(null);
        setHoverCoords(null);
      })
      .transition()
      .duration(750)
      .attrTween('d', function(d) {
        const i = d3.interpolate((this as any)._current || d, d);
        (this as any)._current = i(1);
        return function(t) {
          return arc(i(t)) || '';
        };
      });

  }, [costBreakdownData]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const periodName = selectedMonth === 'CURRENT_MONTH' ? 'Current Month (August 2026)' : selectedMonth === 'PREVIOUS_MONTH' ? 'July 2026' : 'YTD 2026';
    const headers = ['Category Key', 'Category Name', 'Period', 'Amount (KES)', 'Share of OPEX (%)', 'Description'];
    const rows = costBreakdownData.categories.map(c => [
      c.key,
      `"${c.name}"`,
      `"${periodName}"`,
      c.valueKes,
      ((c.valueKes / costBreakdownData.totalOpex) * 100).toFixed(1) + '%',
      `"${c.description}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fleet_Operating_Cost_Breakdown_D3_${selectedMonth}.csv`;
    link.click();

    toast.success('D3 Operating Cost CSV Exported', {
      description: `Downloaded breakdown for ${periodName}.`
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">
                Fleet Operating Costs Breakdown
              </h3>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span>D3.js Donut Engine</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Operating costs allocated across Fuel, Electricity, Maintenance, and Administrative fees for the current month
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setSelectedMonth('CURRENT_MONTH')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedMonth === 'CURRENT_MONTH'
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => setSelectedMonth('PREVIOUS_MONTH')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedMonth === 'PREVIOUS_MONTH'
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              July 2026
            </button>
            <button
              onClick={() => setSelectedMonth('YTD_2026')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedMonth === 'YTD_2026'
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              YTD 2026
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* CHART & LEGEND CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* D3 Donut SVG Canvas */}
        <div ref={containerRef} className="lg:col-span-5 relative flex items-center justify-center p-2 min-h-[300px]">
          <svg ref={svgRef} className="overflow-visible"></svg>

          {/* Center Donut Overlay Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {selectedMonth === 'CURRENT_MONTH' ? 'August 2026 OPEX' : selectedMonth === 'PREVIOUS_MONTH' ? 'July 2026 OPEX' : 'YTD 2026 OPEX'}
            </span>
            <span className="text-xl font-black text-white font-mono mt-1">
              KES {costBreakdownData.totalOpex.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold mt-0.5">
              4 Cost Pillars
            </span>
          </div>

          {/* Floating Hover Tooltip */}
          {hoveredData && hoverCoords && (
            <div 
              className="absolute z-30 pointer-events-none transition-all duration-75 ease-out"
              style={{
                left: `${hoverCoords.x + 15}px`,
                top: `${hoverCoords.y - 45}px`
              }}
            >
              <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-3 text-xs space-y-1.5 min-w-[200px] text-slate-100 ring-1 ring-white/10">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hoveredData.color }}></div>
                  <span className="font-extrabold text-white">{hoveredData.name}</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Cost:</span>
                    <strong className="text-emerald-400 font-bold">KES {hoveredData.valueKes.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">OPEX Share:</span>
                    <strong className="text-indigo-300 font-bold">
                      {((hoveredData.valueKes / costBreakdownData.totalOpex) * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  {hoveredData.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend & Breakdown Category Cards */}
        <div className="lg:col-span-7 space-y-2.5">
          {costBreakdownData.categories.map((cat) => {
            const percent = ((cat.valueKes / costBreakdownData.totalOpex) * 100).toFixed(1);
            const IconComponent = cat.icon;
            const isHovered = activeCategoryKey === cat.key;

            // Calculate MoM trend vs previous month
            const diffPrev = cat.valueKes - cat.prevMonthValueKes;
            const pctChange = cat.prevMonthValueKes > 0 ? ((diffPrev / cat.prevMonthValueKes) * 100).toFixed(1) : '0';
            const isIncrease = diffPrev > 0;

            return (
              <div
                key={cat.key}
                onMouseEnter={() => setActiveCategoryKey(cat.key)}
                onMouseLeave={() => setActiveCategoryKey(null)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isHovered 
                    ? 'bg-slate-800 border-slate-600 shadow-lg scale-[1.01]' 
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-md"
                    style={{ backgroundColor: cat.color }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-xs">{cat.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-900 border border-slate-700 text-slate-300">
                        {percent}% of OPEX
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div className="text-sm font-black text-emerald-400">
                    KES {cat.valueKes.toLocaleString()}
                  </div>
                  {selectedMonth === 'CURRENT_MONTH' && (
                    <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                      isIncrease ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {isIncrease ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{isIncrease ? `+${pctChange}% MoM` : `${pctChange}% MoM`}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
