import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { MpesaPayoutRequest, Driver } from '../types';
import { 
  CreditCard, Sparkles, AlertTriangle, TrendingUp, DollarSign, 
  PieChart, Sliders, RefreshCw, CheckCircle2, Layers, ArrowUpRight,
  Zap, Filter, Info, ChevronRight, Scale
} from 'lucide-react';
import { toast } from 'sonner';

interface MpesaFeeTreemapProps {
  mpesaPayouts?: MpesaPayoutRequest[];
  drivers?: Driver[];
}

export interface PayoutCategoryFeeNode {
  name: string;
  category: 'Earnings' | 'Bonuses' | 'Reimbursements' | 'Target Surplus';
  subCategory?: string;
  value: number; // Size metric (Fees KES or Volume KES or Count)
  payoutVolumeKes: number;
  mpesaFeeKes: number;
  transactionCount: number;
  avgFeePerTxKes: number;
  feeOverheadPct: number; // (mpesaFeeKes / payoutVolumeKes) * 100
  children?: PayoutCategoryFeeNode[];
}

export type TreemapMetricOption = 'FEES_KES' | 'VOLUME_KES' | 'TX_COUNT';

// Helper to calculate Safaricom B2C M-Pesa Fee for a disbursement amount
export const calculateMpesaB2CFee = (amountKes: number): number => {
  if (amountKes <= 100) return 0;
  if (amountKes <= 500) return 15;
  if (amountKes <= 1000) return 16;
  if (amountKes <= 2500) return 23;
  if (amountKes <= 5000) return 34;
  if (amountKes <= 10000) return 55;
  if (amountKes <= 20000) return 76;
  if (amountKes <= 35000) return 92;
  if (amountKes <= 50000) return 108;
  return 115;
};

export const MpesaFeeTreemap: React.FC<MpesaFeeTreemapProps> = ({
  mpesaPayouts = [],
  drivers = []
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // State
  const [metricOption, setMetricOption] = useState<TreemapMetricOption>('FEES_KES');
  const [isBatchedSimulation, setIsBatchedSimulation] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'Earnings' | 'Bonuses' | 'Reimbursements' | 'Target Surplus'>('ALL');
  const [hoveredNode, setHoveredNode] = useState<PayoutCategoryFeeNode | null>(null);

  // Process data & construct hierarchical dataset for D3 treemap
  const treemapHierarchyData = useMemo(() => {
    // Standard mock payouts if list is short
    const sourcePayouts: MpesaPayoutRequest[] = mpesaPayouts.length > 5 ? mpesaPayouts : [
      { id: 'p1', transactionRef: 'MP-89201', driverId: 'd1', driverName: 'Juma Omondi', phoneNumber: '+254712345678', amountKes: 18500, payoutReason: 'Weekly Earnings Payout', status: 'Success', timestamp: '2026-08-11' },
      { id: 'p2', transactionRef: 'MP-89202', driverId: 'd2', driverName: 'Mary Wanjiku', phoneNumber: '+254722334455', amountKes: 14200, payoutReason: 'Weekly Earnings Payout', status: 'Success', timestamp: '2026-08-11' },
      { id: 'p3', transactionRef: 'MP-89203', driverId: 'd3', driverName: 'David Kamau', phoneNumber: '+254733445566', amountKes: 1200, payoutReason: 'Expense Reimbursement', status: 'Success', timestamp: '2026-08-10' },
      { id: 'p4', transactionRef: 'MP-89204', driverId: 'd4', driverName: 'Grace Mutua', phoneNumber: '+254744556677', amountKes: 800, payoutReason: 'Expense Reimbursement', status: 'Success', timestamp: '2026-08-10' },
      { id: 'p5', transactionRef: 'MP-89205', driverId: 'd5', driverName: 'Hassan Ali', phoneNumber: '+254755667788', amountKes: 2500, payoutReason: 'Bonus Incentive', status: 'Success', timestamp: '2026-08-09' },
      { id: 'p6', transactionRef: 'MP-89206', driverId: 'd1', driverName: 'Juma Omondi', phoneNumber: '+254712345678', amountKes: 1500, payoutReason: 'Daily Target Surplus', status: 'Success', timestamp: '2026-08-09' },
      { id: 'p7', transactionRef: 'MP-89207', driverId: 'd2', driverName: 'Mary Wanjiku', phoneNumber: '+254722334455', amountKes: 950, payoutReason: 'Expense Reimbursement', status: 'Success', timestamp: '2026-08-08' },
      { id: 'p8', transactionRef: 'MP-89208', driverId: 'd3', driverName: 'David Kamau', phoneNumber: '+254733445566', amountKes: 3000, payoutReason: 'Bonus Incentive', status: 'Success', timestamp: '2026-08-08' },
      { id: 'p9', transactionRef: 'MP-89209', driverId: 'd4', driverName: 'Grace Mutua', phoneNumber: '+254744556677', amountKes: 22000, payoutReason: 'Weekly Earnings Payout', status: 'Success', timestamp: '2026-08-07' },
      { id: 'p10', transactionRef: 'MP-89210', driverId: 'd5', driverName: 'Hassan Ali', phoneNumber: '+254755667788', amountKes: 1100, payoutReason: 'Expense Reimbursement', status: 'Success', timestamp: '2026-08-07' },
    ] as any[];

    // Expand dataset with historical simulation if needed to populate rich categories
    const categories: Array<{
      category: PayoutCategoryFeeNode['category'];
      subTypes: string[];
      baseVolumeKes: number;
      txCount: number;
      avgTxAmount: number;
    }> = [
      {
        category: 'Earnings',
        subTypes: ['Weekly Driver Earnings', 'Guaranteed Hourly Pay', 'Trip Rider Settlements'],
        baseVolumeKes: 485000,
        txCount: 32,
        avgTxAmount: 15156
      },
      {
        category: 'Bonuses',
        subTypes: ['Safety Milestone Bonuses', 'Peak Hours Quest Bonus', 'Driver Referral Rewards'],
        baseVolumeKes: 62000,
        txCount: 28,
        avgTxAmount: 2214
      },
      {
        category: 'Reimbursements',
        subTypes: ['Emergency Tire Repairs', 'Tool & Helmet Claims', 'Charging & Fuel Overages', 'Toll Fees Reimbursement'],
        baseVolumeKes: 34500,
        txCount: 42,
        avgTxAmount: 821
      },
      {
        category: 'Target Surplus',
        subTypes: ['Daily Ride Goal Surplus', 'EV Energy Saving Rebate', 'High Customer Rating Tip'],
        baseVolumeKes: 41000,
        txCount: 26,
        avgTxAmount: 1576
      }
    ];

    const categoryChildren: PayoutCategoryFeeNode[] = categories
      .filter(c => selectedCategoryFilter === 'ALL' || c.category === selectedCategoryFilter)
      .map(cat => {
        // Sub-nodes for each subtype
        const subNodes: PayoutCategoryFeeNode[] = cat.subTypes.map((subName, idx) => {
          const subTxCount = Math.max(1, Math.round(cat.txCount / cat.subTypes.length) + (idx % 2 === 0 ? 3 : -2));
          let subVolume = Math.round(cat.baseVolumeKes / cat.subTypes.length) + (idx * 2500);
          
          let subAvgAmount = Math.round(subVolume / subTxCount);

          // Calculate fees
          let unitFee = calculateMpesaB2CFee(subAvgAmount);
          
          // Apply batching simulation savings if enabled (batching small transfers reduces fee per tx)
          if (isBatchedSimulation && (cat.category === 'Reimbursements' || cat.category === 'Bonuses')) {
            unitFee = Math.round(unitFee * 0.45); // 55% reduction from batching
          }

          const totalMpesaFee = unitFee * subTxCount;
          const feeOverheadPct = subVolume > 0 ? (totalMpesaFee / subVolume) * 100 : 0;

          // Determine node size metric
          let nodeValue = totalMpesaFee;
          if (metricOption === 'VOLUME_KES') nodeValue = subVolume;
          if (metricOption === 'TX_COUNT') nodeValue = subTxCount;

          return {
            name: subName,
            category: cat.category,
            subCategory: subName,
            value: Math.max(1, nodeValue),
            payoutVolumeKes: subVolume,
            mpesaFeeKes: totalMpesaFee,
            transactionCount: subTxCount,
            avgFeePerTxKes: Math.round(totalMpesaFee / subTxCount),
            feeOverheadPct: Math.round(feeOverheadPct * 100) / 100
          };
        });

        const categoryVolume = subNodes.reduce((acc, curr) => acc + curr.payoutVolumeKes, 0);
        const categoryFees = subNodes.reduce((acc, curr) => acc + curr.mpesaFeeKes, 0);
        const categoryTxCount = subNodes.reduce((acc, curr) => acc + curr.transactionCount, 0);
        const categoryOverheadPct = categoryVolume > 0 ? (categoryFees / categoryVolume) * 100 : 0;

        let categoryNodeValue = categoryFees;
        if (metricOption === 'VOLUME_KES') categoryNodeValue = categoryVolume;
        if (metricOption === 'TX_COUNT') categoryNodeValue = categoryTxCount;

        return {
          name: cat.category,
          category: cat.category,
          value: Math.max(1, categoryNodeValue),
          payoutVolumeKes: categoryVolume,
          mpesaFeeKes: categoryFees,
          transactionCount: categoryTxCount,
          avgFeePerTxKes: Math.round(categoryFees / Math.max(1, categoryTxCount)),
          feeOverheadPct: Math.round(categoryOverheadPct * 100) / 100,
          children: subNodes
        };
      });

    const root: PayoutCategoryFeeNode = {
      name: 'All M-Pesa Disbursements',
      category: 'Earnings',
      value: categoryChildren.reduce((acc, curr) => acc + curr.value, 0),
      payoutVolumeKes: categoryChildren.reduce((acc, curr) => acc + curr.payoutVolumeKes, 0),
      mpesaFeeKes: categoryChildren.reduce((acc, curr) => acc + curr.mpesaFeeKes, 0),
      transactionCount: categoryChildren.reduce((acc, curr) => acc + curr.transactionCount, 0),
      avgFeePerTxKes: 0,
      feeOverheadPct: 0,
      children: categoryChildren
    };

    return root;
  }, [mpesaPayouts, metricOption, isBatchedSimulation, selectedCategoryFilter]);

  // Global KPI Metrics
  const summaryKPIs = useMemo(() => {
    const totalVolume = treemapHierarchyData.payoutVolumeKes;
    const totalFees = treemapHierarchyData.mpesaFeeKes;
    const totalTx = treemapHierarchyData.transactionCount;
    const overallOverheadPct = totalVolume > 0 ? (totalFees / totalVolume) * 100 : 0;

    // Identify highest overhead category
    const categories = treemapHierarchyData.children || [];
    let highestOverheadCat = categories[0];
    categories.forEach(c => {
      if (c.feeOverheadPct > (highestOverheadCat?.feeOverheadPct || 0)) {
        highestOverheadCat = c;
      }
    });

    // Potential savings if Reimbursements & Bonuses are batched weekly
    const unbatchedFees = categories.reduce((acc, curr) => acc + curr.mpesaFeeKes, 0);
    const potentialSavingsKes = isBatchedSimulation ? Math.round(unbatchedFees * 0.42) : Math.round(totalFees * 0.38);

    return {
      totalVolume,
      totalFees,
      totalTx,
      overallOverheadPct: Math.round(overallOverheadPct * 100) / 100,
      highestOverheadCategoryName: highestOverheadCat?.name || 'Reimbursements',
      highestOverheadPct: highestOverheadCat?.feeOverheadPct || 0,
      highestOverheadFeesKes: highestOverheadCat?.mpesaFeeKes || 0,
      potentialSavingsKes
    };
  }, [treemapHierarchyData, isBatchedSimulation]);

  // Color Mapping by Category
  const getCategoryColor = (categoryName: string, opacity: number = 0.85) => {
    switch (categoryName) {
      case 'Earnings':
        return `rgba(16, 185, 129, ${opacity})`; // Emerald
      case 'Bonuses':
        return `rgba(99, 102, 241, ${opacity})`; // Indigo
      case 'Reimbursements':
        return `rgba(244, 63, 94, ${opacity})`;  // Rose Red (Highest Overhead)
      case 'Target Surplus':
        return `rgba(245, 158, 11, ${opacity})`; // Amber
      default:
        return `rgba(14, 165, 233, ${opacity})`; // Sky Blue
    }
  };

  // Render D3 Treemap
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 360;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Construct Hierarchy
    const d3Hierarchy = d3.hierarchy<PayoutCategoryFeeNode>(treemapHierarchyData)
      .sum(d => d.children ? 0 : d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Layout
    const treemapLayout = d3.treemap<PayoutCategoryFeeNode>()
      .size([width, height])
      .paddingOuter(6)
      .paddingTop(24)
      .paddingInner(3)
      .round(true);

    treemapLayout(d3Hierarchy);

    const mainGroup = svg.append('g');

    // Category Header Group Containers
    const categoryNodes = (d3Hierarchy.children || []) as unknown as d3.HierarchyRectangularNode<PayoutCategoryFeeNode>[];

    const categoryGroups = mainGroup.selectAll('.category-group')
      .data(categoryNodes)
      .enter()
      .append('g')
      .attr('class', 'category-group');

    // Category Container Border & Label
    categoryGroups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('rx', 8)
      .attr('ry', 8)
      .style('fill', d => getCategoryColor(d.data.name, 0.08))
      .style('stroke', d => getCategoryColor(d.data.name, 0.4))
      .style('stroke-width', '1.5px');

    // Category Group Title Bar Text
    categoryGroups.append('text')
      .attr('x', d => d.x0 + 8)
      .attr('y', d => d.y0 + 16)
      .style('fill', d => getCategoryColor(d.data.name, 1.0))
      .style('font-size', '11px')
      .style('font-weight', '900')
      .style('font-family', 'sans-serif')
      .text(d => {
        const catFees = d.data.mpesaFeeKes;
        const catOverhead = d.data.feeOverheadPct;
        const boxWidth = d.x1 - d.x0;
        if (boxWidth < 80) return d.data.name.slice(0, 3);
        return `${d.data.name.toUpperCase()} (Fees: KES ${catFees.toLocaleString()} | ${catOverhead}% Overhead)`;
      });

    // Sub-Leaf Cells
    const leafNodes = d3Hierarchy.leaves() as unknown as d3.HierarchyRectangularNode<PayoutCategoryFeeNode>[];

    const cells = mainGroup.selectAll('.leaf-cell')
      .data(leafNodes)
      .enter()
      .append('g')
      .attr('class', 'leaf-cell')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    cells.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 5)
      .attr('ry', 5)
      .style('fill', d => getCategoryColor(d.data.category, d.data.feeOverheadPct > 2.5 ? 0.95 : 0.75))
      .style('stroke', '#0f172a')
      .style('stroke-width', '1.5px')
      .style('cursor', 'pointer')
      .style('opacity', 0.9)
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .style('opacity', 1)
          .style('stroke', '#ffffff')
          .style('stroke-width', '2.5px');
        setHoveredNode(d.data);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .style('opacity', 0.9)
          .style('stroke', '#0f172a')
          .style('stroke-width', '1.5px');
        setHoveredNode(null);
      });

    // Sub-Leaf Text Label (Name & Fees)
    cells.append('text')
      .attr('x', 6)
      .attr('y', 16)
      .style('fill', '#ffffff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('font-family', 'sans-serif')
      .style('pointer-events', 'none')
      .text(d => {
        const cellW = d.x1 - d.x0;
        if (cellW < 55) return '';
        if (cellW < 100) return d.data.name.slice(0, 10) + '...';
        return d.data.name;
      });

    // Sub-Leaf Value Text (Fees & Overhead %)
    cells.append('text')
      .attr('x', 6)
      .attr('y', 30)
      .style('fill', '#f1f5f9')
      .style('font-size', '10px')
      .style('font-weight', '900')
      .style('font-family', 'monospace')
      .style('pointer-events', 'none')
      .text(d => {
        const cellW = d.x1 - d.x0;
        const cellH = d.y1 - d.y0;
        if (cellW < 65 || cellH < 35) return '';
        return `KES ${d.data.mpesaFeeKes.toLocaleString()} (${d.data.feeOverheadPct}%)`;
      });

  }, [treemapHierarchyData, metricOption]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                D3 M-Pesa Transaction Fee Overhead Treemap
              </h2>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>B2C Tariff Cost Allocation</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Maps Safaricom M-Pesa disbursement fees relative to payout volume across Earnings, Bonuses, and Reimbursements to pinpoint high-overhead categories
            </p>
          </div>
        </div>

        {/* METRIC OPTION TOGGLES */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setMetricOption('FEES_KES')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                metricOption === 'FEES_KES' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Size by Fee (KES)
            </button>

            <button
              onClick={() => setMetricOption('VOLUME_KES')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                metricOption === 'VOLUME_KES' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Size by Volume (KES)
            </button>

            <button
              onClick={() => setMetricOption('TX_COUNT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                metricOption === 'TX_COUNT' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Size by Transfer Count
            </button>
          </div>
        </div>

      </div>

      {/* HIGHLIGHT KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        
        {/* Total M-Pesa Fees Paid */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span>Total M-Pesa B2C Fees</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white">
            KES {summaryKPIs.totalFees.toLocaleString()}
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Across KES {summaryKPIs.totalVolume.toLocaleString()} payout volume ({summaryKPIs.totalTx} transfers)
          </p>
        </div>

        {/* Overall Fee Overhead Ratio % */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span>Fleet Fee Overhead Ratio</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            {summaryKPIs.overallOverheadPct}%
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Total fees as percentage of total disbursed value
          </p>
        </div>

        {/* Highest Overhead Category Alert Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-500/30 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Highest Overhead Category
            </span>
          </div>
          <div className="text-lg font-black text-rose-300">
            {summaryKPIs.highestOverheadCategoryName} ({summaryKPIs.highestOverheadPct}%)
          </div>
          <p className="text-[10px] font-sans text-slate-400">
            Incurs KES {summaryKPIs.highestOverheadFeesKes.toLocaleString()} fees due to high-frequency small transfers
          </p>
        </div>

        {/* Batching Optimization Simulator Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
            <span className="text-amber-400 font-bold">Weekly Batching Savings</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-300">
            Save ~KES {summaryKPIs.potentialSavingsKes.toLocaleString()} / mo
          </div>
          <button
            onClick={() => {
              const nextVal = !isBatchedSimulation;
              setIsBatchedSimulation(nextVal);
              toast.success(nextVal ? 'Weekly Batching Simulation ACTIVE' : 'Restored Baseline M-Pesa Tariffs', {
                description: nextVal 
                  ? 'Consolidates small daily reimbursements into weekly payouts, reducing fee overhead by ~42%.' 
                  : 'Displaying standard Safaricom per-transaction B2C fees.'
              });
            }}
            className="mt-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition cursor-pointer font-sans w-full text-center"
          >
            {isBatchedSimulation ? '✅ Batching Active (-42% Fees)' : '⚡ Simulate Weekly Batching'}
          </button>
        </div>

      </div>

      {/* FILTER BUTTONS */}
      <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400 font-bold text-[11px] uppercase">Filter Category:</span>
          {(['ALL', 'Earnings', 'Bonuses', 'Reimbursements', 'Target Surplus'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedCategoryFilter === cat ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Earnings (Low Overhead)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" /> Bonuses</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Reimbursements (High Overhead)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Target Surplus</span>
        </div>
      </div>

      {/* D3 TREEMAP DISPLAY */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto relative shadow-inner">
        <svg 
          ref={svgRef} 
          width={800} 
          height={360} 
          className="mx-auto select-none"
        />

        {/* Hover Inspector Banner */}
        {hoveredNode ? (
          <div className="mt-3 bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(hoveredNode.category, 1) }} />
              <div>
                <span className="text-slate-400 block text-[10px]">Payout Sub-Category</span>
                <strong className="text-white font-sans">{hoveredNode.name}</strong>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">Payout Volume</span>
              <strong className="text-emerald-400">KES {hoveredNode.payoutVolumeKes.toLocaleString()}</strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">M-Pesa Fees Paid</span>
              <strong className="text-rose-400">KES {hoveredNode.mpesaFeeKes.toLocaleString()}</strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">Overhead Fee Ratio</span>
              <strong className={hoveredNode.feeOverheadPct > 2.5 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {hoveredNode.feeOverheadPct}%
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">Transfers</span>
              <strong className="text-slate-200">{hoveredNode.transactionCount} txs (Avg KES {hoveredNode.avgFeePerTxKes}/tx)</strong>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-center text-[11px] text-slate-500 py-1 font-mono">
            💡 Hover over any treemap block to inspect payout volume, Safaricom B2C transfer fees, and fee overhead ratios
          </div>
        )}
      </div>

      {/* DETAILED CATEGORY OVERHEAD COMPARISON TABLE */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 font-mono">
            <tr>
              <th className="px-4 py-3">Payout Category</th>
              <th className="px-4 py-3">Disbursement Volume (KES)</th>
              <th className="px-4 py-3">M-Pesa B2C Fees (KES)</th>
              <th className="px-4 py-3">Transfer Count</th>
              <th className="px-4 py-3">Avg Fee per Tx</th>
              <th className="px-4 py-3 text-right">Fee Overhead %</th>
              <th className="px-4 py-3 text-right">Optimization Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {(treemapHierarchyData.children || []).map((cat) => {
              const isHighOverhead = cat.feeOverheadPct > 2.0;

              return (
                <tr key={cat.name} className="hover:bg-slate-900/50 transition">
                  {/* Category Name */}
                  <td className="px-4 py-3 font-sans font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor(cat.name, 1) }} />
                    <span className="text-white">{cat.name}</span>
                  </td>

                  {/* Volume */}
                  <td className="px-4 py-3 text-slate-300 font-bold">
                    KES {cat.payoutVolumeKes.toLocaleString()}
                  </td>

                  {/* M-Pesa Fees */}
                  <td className="px-4 py-3 text-rose-400 font-bold">
                    KES {cat.mpesaFeeKes.toLocaleString()}
                  </td>

                  {/* Transfers Count */}
                  <td className="px-4 py-3 text-slate-400">
                    {cat.transactionCount} payouts
                  </td>

                  {/* Avg Fee */}
                  <td className="px-4 py-3 text-slate-300">
                    KES {cat.avgFeePerTxKes}
                  </td>

                  {/* Fee Overhead % */}
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      isHighOverhead 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {cat.feeOverheadPct.toFixed(2)}%
                    </span>
                  </td>

                  {/* Recommendation */}
                  <td className="px-4 py-3 text-right font-sans">
                    <span className="text-[11px] text-slate-400">
                      {cat.name === 'Reimbursements' && 'Batch small daily receipts into weekly payouts (-42% fees)'}
                      {cat.name === 'Bonuses' && 'Consolidate performance milestones to monthly disbursements'}
                      {cat.name === 'Earnings' && 'Optimal volume efficiency via bulk M-Pesa B2C file'}
                      {cat.name === 'Target Surplus' && 'Threshold minimum KES 2,000 for payout eligibility'}
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
