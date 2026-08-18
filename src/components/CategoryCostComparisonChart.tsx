import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Vehicle } from '../types';
import { 
  BarChart3, Zap, Fuel, DollarSign, Shield, Wrench, ArrowRightLeft, 
  TrendingDown, TrendingUp, Sparkles, Sliders, Layers, RefreshCw, CheckCircle2,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';

interface CategoryCostComparisonChartProps {
  vehicles?: Vehicle[];
}

export type CategoryOption = 
  | 'Electric (EV)'
  | 'Fuel (ICE)'
  | 'Hybrid / Dual-Fuel'
  | 'Commercial Cargo / Van'
  | 'Motorcycle Fleet';

export type TimeFrameOption = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type ViewMetricOption = 'PER_VEHICLE_AVG' | 'TOTAL_FLEET';

export interface CostBreakdownItem {
  costType: 'Maintenance' | 'Energy / Fuel' | 'Insurance' | 'Total Operational Cost';
  categoryAAmount: number;
  categoryBAmount: number;
  varianceKes: number;
  variancePct: number; // positive means Cat A is higher, negative means Cat A is lower (savings)
}

export const CategoryCostComparisonChart: React.FC<CategoryCostComparisonChartProps> = ({
  vehicles = []
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Category Selections
  const [categoryA, setCategoryA] = useState<CategoryOption>('Electric (EV)');
  const [categoryB, setCategoryB] = useState<CategoryOption>('Fuel (ICE)');

  // Time Frame & Metric Toggles
  const [timeFrame, setTimeFrame] = useState<TimeFrameOption>('MONTHLY');
  const [metricOption, setMetricOption] = useState<ViewMetricOption>('PER_VEHICLE_AVG');

  // Hover Tooltip State
  const [tooltipData, setTooltipData] = useState<{
    costType: string;
    category: string;
    amount: number;
    otherCategory: string;
    otherAmount: number;
    x: number;
    y: number;
  } | null>(null);

  // Category List
  const categoryOptions: CategoryOption[] = [
    'Electric (EV)',
    'Fuel (ICE)',
    'Hybrid / Dual-Fuel',
    'Commercial Cargo / Van',
    'Motorcycle Fleet'
  ];

  // Multiplier based on TimeFrame
  const timeMultiplier = useMemo(() => {
    switch (timeFrame) {
      case 'QUARTERLY': return 3;
      case 'ANNUAL': return 12;
      default: return 1;
    }
  }, [timeFrame]);

  // Compute Cost Metrics for a specific Category Selection
  const getCategoryMetrics = (cat: CategoryOption) => {
    // Filter actual vehicles if available
    const isEvCat = cat === 'Electric (EV)';
    const isFuelCat = cat === 'Fuel (ICE)';
    const isHybridCat = cat === 'Hybrid / Dual-Fuel';
    const isCargoCat = cat === 'Commercial Cargo / Van';

    let matchingVehicles = vehicles.filter(v => {
      if (isEvCat) return v.category === 'Electric';
      if (isFuelCat) return v.category === 'Fuel';
      if (isHybridCat) return v.type === 'Petrol Car' || v.type === 'SUV';
      if (isCargoCat) return v.type === 'Van' || v.type === 'Commercial Truck';
      return v.type.includes('Motorcycle') || v.type.includes('Bicycle');
    });

    const vehicleCount = Math.max(1, matchingVehicles.length || (isEvCat ? 18 : isFuelCat ? 14 : 8));

    // Base Monthly per-vehicle metrics (KES)
    let monthlyMaintPerVehicle = 0;
    let monthlyEnergyPerVehicle = 0;
    let monthlyInsurancePerVehicle = 0;

    if (isEvCat) {
      monthlyMaintPerVehicle = 4500;       // Regenerative braking, zero oil change
      monthlyEnergyPerVehicle = 8200;      // Off-peak KPLC tariffs / Battery Swap
      monthlyInsurancePerVehicle = 3500;   // Comprehensive commercial EV policy
    } else if (isFuelCat) {
      monthlyMaintPerVehicle = 14200;      // Engine servicing, filters, spark plugs
      monthlyEnergyPerVehicle = 28500;     // Super Petrol / Diesel at EPRA tariffs
      monthlyInsurancePerVehicle = 4800;   // High risk ICE insurance
    } else if (isHybridCat) {
      monthlyMaintPerVehicle = 9800;
      monthlyEnergyPerVehicle = 18400;
      monthlyInsurancePerVehicle = 4200;
    } else if (isCargoCat) {
      monthlyMaintPerVehicle = 22000;
      monthlyEnergyPerVehicle = 45000;
      monthlyInsurancePerVehicle = 8500;
    } else {
      monthlyMaintPerVehicle = 3200;
      monthlyEnergyPerVehicle = 11000;
      monthlyInsurancePerVehicle = 2800;
    }

    // Scale by metric type & time frame
    const scaleFactor = (metricOption === 'TOTAL_FLEET' ? vehicleCount : 1) * timeMultiplier;

    const maintenance = Math.round(monthlyMaintPerVehicle * scaleFactor);
    const energyFuel = Math.round(monthlyEnergyPerVehicle * scaleFactor);
    const insurance = Math.round(monthlyInsurancePerVehicle * scaleFactor);
    const total = maintenance + energyFuel + insurance;

    return {
      vehicleCount,
      maintenance,
      energyFuel,
      insurance,
      total
    };
  };

  // Compute breakdown dataset comparing Category A vs Category B
  const breakdownData: CostBreakdownItem[] = useMemo(() => {
    const metricsA = getCategoryMetrics(categoryA);
    const metricsB = getCategoryMetrics(categoryB);

    const items: Array<{
      costType: CostBreakdownItem['costType'];
      a: number;
      b: number;
    }> = [
      { costType: 'Maintenance', a: metricsA.maintenance, b: metricsB.maintenance },
      { costType: 'Energy / Fuel', a: metricsA.energyFuel, b: metricsB.energyFuel },
      { costType: 'Insurance', a: metricsA.insurance, b: metricsB.insurance },
      { costType: 'Total Operational Cost', a: metricsA.total, b: metricsB.total }
    ];

    return items.map(item => {
      const varianceKes = item.a - item.b;
      const variancePct = item.b === 0 ? 0 : Math.round(((item.a - item.b) / item.b) * 1000) / 10;
      return {
        costType: item.costType,
        categoryAAmount: item.a,
        categoryBAmount: item.b,
        varianceKes,
        variancePct
      };
    });
  }, [categoryA, categoryB, timeFrame, metricOption, vehicles]);

  // Overall Totals for Header KPI
  const totals = useMemo(() => {
    const totalA = breakdownData.find(d => d.costType === 'Total Operational Cost')?.categoryAAmount || 0;
    const totalB = breakdownData.find(d => d.costType === 'Total Operational Cost')?.categoryBAmount || 0;
    const diffKes = totalA - totalB;
    const savingsPct = totalB === 0 ? 0 : Math.abs(Math.round(((totalA - totalB) / totalB) * 1000) / 10);
    const isASchemeCheaper = totalA < totalB;

    return {
      totalA,
      totalB,
      diffKes,
      savingsPct,
      isASchemeCheaper
    };
  }, [breakdownData]);

  // Render D3 Comparative Bar Chart
  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 40, right: 30, bottom: 50, left: 90 };
    const width = 800 - margin.left - margin.right;
    const height = 340 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Group X Scale (Cost Types)
    const x0Scale = d3.scaleBand()
      .domain(breakdownData.map(d => d.costType))
      .range([0, width])
      .padding(0.22);

    // Sub-bar X Scale (Category A vs Category B)
    const x1Scale = d3.scaleBand()
      .domain(['CategoryA', 'CategoryB'])
      .range([0, x0Scale.bandwidth()])
      .padding(0.12);

    // Y Scale (KES Amount)
    const maxVal = d3.max(breakdownData, d => Math.max(d.categoryAAmount, d.categoryBAmount)) || 10000;
    const yScale = d3.scaleLinear()
      .domain([0, maxVal * 1.18])
      .range([height, 0]);

    // Color Scales
    const colorA = '#10b981'; // Emerald Green
    const colorB = '#f43f5e'; // Rose / Coral Red

    // Draw Grid Lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', '#1e293b')
      .style('stroke-dasharray', '3,3');

    // Draw X-Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x0Scale))
      .selectAll('text')
      .style('fill', '#cbd5e1')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('font-family', 'sans-serif');

    // Draw Y-Axis
    g.append('g')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat(d => `KES ${d3.format(',.0f')(d)}`)
      )
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '10px')
      .style('font-family', 'monospace');

    // Remove domain stroke lines for clean layout
    g.selectAll('.domain').style('stroke', '#334155');
    g.selectAll('.tick line').style('stroke', '#334155');

    // Render Grouped Bars
    const costGroups = g.selectAll('.cost-group')
      .data(breakdownData)
      .enter()
      .append('g')
      .attr('class', 'cost-group')
      .attr('transform', d => `translate(${x0Scale(d.costType)},0)`);

    // BAR A (Category A)
    costGroups.append('rect')
      .attr('class', 'bar-a')
      .attr('x', x1Scale('CategoryA') || 0)
      .attr('y', d => yScale(d.categoryAAmount))
      .attr('width', x1Scale.bandwidth())
      .attr('height', d => height - yScale(d.categoryAAmount))
      .attr('rx', 5)
      .attr('ry', 5)
      .style('fill', colorA)
      .style('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).style('opacity', 1).style('stroke', '#ffffff').style('stroke-width', '2px');
        setTooltipData({
          costType: d.costType,
          category: categoryA,
          amount: d.categoryAAmount,
          otherCategory: categoryB,
          otherAmount: d.categoryBAmount,
          x: event.clientX,
          y: event.clientY
        });
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).style('opacity', 0.9).style('stroke', 'none');
        setTooltipData(null);
      });

    // BAR A Label (Top Value)
    costGroups.append('text')
      .attr('x', (x1Scale('CategoryA') || 0) + x1Scale.bandwidth() / 2)
      .attr('y', d => yScale(d.categoryAAmount) - 6)
      .attr('text-anchor', 'middle')
      .style('fill', '#34d399')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('font-family', 'monospace')
      .text(d => `KES ${d.categoryAAmount >= 1000 ? Math.round(d.categoryAAmount / 1000) + 'k' : d.categoryAAmount}`);

    // BAR B (Category B)
    costGroups.append('rect')
      .attr('class', 'bar-b')
      .attr('x', x1Scale('CategoryB') || 0)
      .attr('y', d => yScale(d.categoryBAmount))
      .attr('width', x1Scale.bandwidth())
      .attr('height', d => height - yScale(d.categoryBAmount))
      .attr('rx', 5)
      .attr('ry', 5)
      .style('fill', colorB)
      .style('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).style('opacity', 1).style('stroke', '#ffffff').style('stroke-width', '2px');
        setTooltipData({
          costType: d.costType,
          category: categoryB,
          amount: d.categoryBAmount,
          otherCategory: categoryA,
          otherAmount: d.categoryAAmount,
          x: event.clientX,
          y: event.clientY
        });
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).style('opacity', 0.9).style('stroke', 'none');
        setTooltipData(null);
      });

    // BAR B Label (Top Value)
    costGroups.append('text')
      .attr('x', (x1Scale('CategoryB') || 0) + x1Scale.bandwidth() / 2)
      .attr('y', d => yScale(d.categoryBAmount) - 6)
      .attr('text-anchor', 'middle')
      .style('fill', '#fb7185')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('font-family', 'monospace')
      .text(d => `KES ${d.categoryBAmount >= 1000 ? Math.round(d.categoryBAmount / 1000) + 'k' : d.categoryBAmount}`);

    // Draw Savings / Premium Percentage Badge on top of each group
    costGroups.append('g')
      .attr('transform', d => {
        const higherBarY = Math.min(yScale(d.categoryAAmount), yScale(d.categoryBAmount));
        const groupCenterX = x0Scale.bandwidth() / 2;
        return `translate(${groupCenterX}, ${higherBarY - 22})`;
      })
      .each(function(d) {
        const group = d3.select(this);
        if (d.categoryBAmount === 0) return;
        const pct = Math.abs(d.variancePct);
        const isACheaper = d.varianceKes < 0;

        group.append('rect')
          .attr('x', -28)
          .attr('y', -8)
          .attr('width', 56)
          .attr('height', 16)
          .attr('rx', 8)
          .style('fill', isACheaper ? '#064e3b' : '#881337')
          .style('stroke', isACheaper ? '#10b981' : '#f43f5e')
          .style('stroke-width', '1px');

        group.append('text')
          .attr('x', 0)
          .attr('y', 3)
          .attr('text-anchor', 'middle')
          .style('fill', isACheaper ? '#6ee7b7' : '#fca5a5')
          .style('font-size', '9px')
          .style('font-weight', 'bold')
          .style('font-family', 'monospace')
          .text(`${isACheaper ? '-' : '+'}${pct.toFixed(0)}%`);
      });

  }, [breakdownData, categoryA, categoryB]);

  // Swap Category Selections
  const handleSwapCategories = () => {
    const temp = categoryA;
    setCategoryA(categoryB);
    setCategoryB(temp);
    toast.info('Swapped Comparison Categories', {
      description: `Comparing ${categoryB} vs ${categoryA}`
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                Comparative Vehicle Category Operational Cost Breakdown (D3)
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Side-by-Side TCO Analysis</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side comparative analysis of maintenance, energy/fuel, and insurance expenses between fleet vehicle categories
            </p>
          </div>
        </div>

        {/* TIME & METRIC CONTROLS */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Time Frame Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            {(['MONTHLY', 'QUARTERLY', 'ANNUAL'] as TimeFrameOption[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  timeFrame === tf ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf === 'MONTHLY' ? 'Monthly' : tf === 'QUARTERLY' ? 'Quarterly' : 'Annualized'}
              </button>
            ))}
          </div>

          {/* Metric View Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setMetricOption('PER_VEHICLE_AVG')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                metricOption === 'PER_VEHICLE_AVG' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Per-Vehicle Avg
            </button>
            <button
              onClick={() => setMetricOption('TOTAL_FLEET')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                metricOption === 'TOTAL_FLEET' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Total Fleet Opex
            </button>
          </div>

        </div>

      </div>

      {/* CATEGORY SELECTOR TOOLBAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
        
        {/* Category A Selector */}
        <div className="md:col-span-5 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/50" />
          <span className="text-xs font-bold text-slate-300 uppercase shrink-0">Category A:</span>
          <select
            value={categoryA}
            onChange={(e) => {
              const val = e.target.value as CategoryOption;
              setCategoryA(val);
              toast.success(`Selected Category A: ${val}`);
            }}
            className="w-full bg-slate-900 border border-slate-700 text-emerald-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {categoryOptions.map(cat => (
              <option key={cat} value={cat} disabled={cat === categoryB}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-2 text-center">
          <button
            onClick={handleSwapCategories}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow"
            title="Swap Category A and Category B"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>VS</span>
          </button>
        </div>

        {/* Category B Selector */}
        <div className="md:col-span-5 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 shadow-sm shadow-rose-500/50" />
          <span className="text-xs font-bold text-slate-300 uppercase shrink-0">Category B:</span>
          <select
            value={categoryB}
            onChange={(e) => {
              const val = e.target.value as CategoryOption;
              setCategoryB(val);
              toast.success(`Selected Category B: ${val}`);
            }}
            className="w-full bg-slate-900 border border-slate-700 text-rose-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
          >
            {categoryOptions.map(cat => (
              <option key={cat} value={cat} disabled={cat === categoryA}>
                {cat}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* COMPARATIVE SUMMARY HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        
        {/* Category A Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {categoryA}
            </span>
            <span>{timeFrame.toLowerCase()}</span>
          </div>
          <div className="text-xl font-black text-white">
            KES {totals.totalA.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Total Operational Expense (Maintenance + Energy + Insurance)
          </p>
        </div>

        {/* Category B Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-500/30 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span className="font-bold text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {categoryB}
            </span>
            <span>{timeFrame.toLowerCase()}</span>
          </div>
          <div className="text-xl font-black text-white">
            KES {totals.totalB.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Total Operational Expense (Maintenance + Energy + Insurance)
          </p>
        </div>

        {/* Variance / Cost Advantage Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span className="font-bold text-indigo-300">Cost Variance Delta</span>
            <span className="text-emerald-400 font-bold">{totals.savingsPct}% {totals.isASchemeCheaper ? 'Lower Opex' : 'Higher Opex'}</span>
          </div>
          <div className={`text-xl font-black flex items-center gap-1.5 ${totals.isASchemeCheaper ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totals.isASchemeCheaper ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            <span>KES {Math.abs(totals.diffKes).toLocaleString()}</span>
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            {totals.isASchemeCheaper 
              ? `${categoryA} saves KES ${Math.abs(totals.diffKes).toLocaleString()} (${totals.savingsPct}%) vs ${categoryB}`
              : `${categoryA} carries KES ${Math.abs(totals.diffKes).toLocaleString()} (+${totals.savingsPct}%) higher opex vs ${categoryB}`}
          </p>
        </div>

      </div>

      {/* D3 COMPARATIVE BAR CHART SVG DISPLAY */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-x-auto shadow-inner">
        
        {/* Legend */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Grouped Operational Cost Comparison Matrix (KES)</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              <span className="text-emerald-300">{categoryA}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
              <span className="text-rose-300">{categoryB}</span>
            </div>
          </div>
        </div>

        <svg 
          ref={svgRef} 
          width={800} 
          height={340} 
          className="mx-auto select-none"
        />

      </div>

      {/* ITEMIZED COST BREAKDOWN TABLE */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 font-mono">
            <tr>
              <th className="px-4 py-3">Operational Cost Component</th>
              <th className="px-4 py-3 text-emerald-400 font-bold">{categoryA}</th>
              <th className="px-4 py-3 text-rose-400 font-bold">{categoryB}</th>
              <th className="px-4 py-3">Delta Variance (KES)</th>
              <th className="px-4 py-3 text-right">Variance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {breakdownData.map((item) => {
              const isTotalRow = item.costType === 'Total Operational Cost';
              const isACheaper = item.varianceKes < 0;

              return (
                <tr 
                  key={item.costType} 
                  className={`hover:bg-slate-900/50 transition ${isTotalRow ? 'bg-slate-900/80 font-black text-white' : ''}`}
                >
                  {/* Cost Type */}
                  <td className="px-4 py-3 font-sans font-bold flex items-center gap-2">
                    {item.costType === 'Maintenance' && <Wrench className="w-4 h-4 text-amber-400" />}
                    {item.costType === 'Energy / Fuel' && <Zap className="w-4 h-4 text-indigo-400" />}
                    {item.costType === 'Insurance' && <Shield className="w-4 h-4 text-emerald-400" />}
                    {item.costType === 'Total Operational Cost' && <DollarSign className="w-4 h-4 text-teal-400" />}
                    <span>{item.costType}</span>
                  </td>

                  {/* Category A Amount */}
                  <td className="px-4 py-3 text-emerald-400 font-bold">
                    KES {item.categoryAAmount.toLocaleString()}
                  </td>

                  {/* Category B Amount */}
                  <td className="px-4 py-3 text-rose-400 font-bold">
                    KES {item.categoryBAmount.toLocaleString()}
                  </td>

                  {/* Delta Variance KES */}
                  <td className="px-4 py-3">
                    <span className={isACheaper ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {isACheaper ? '-' : '+'}{Math.abs(item.varianceKes).toLocaleString()} KES
                    </span>
                  </td>

                  {/* Variance % */}
                  <td className="px-4 py-3 text-right font-bold">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                      isACheaper 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {isACheaper ? '' : '+'}{item.variancePct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
