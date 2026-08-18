import React, { useState, useEffect, useMemo } from 'react';
import { MaintenanceWorkOrder, SparePartItem, Vehicle, PurchaseOrderSuggestion } from '../types';
import { 
  Wrench, Package, AlertTriangle, Plus, Clock, CheckCircle2,
  Bell, ShieldAlert, Gauge, Calendar, Send, Check, AlertCircle, RefreshCw,
  ShoppingCart, Building2, Eye, Minus, Sparkles, FileText, ArrowRight, CheckSquare,
  TrendingUp, BarChart3, DollarSign, PieChart, ArrowUpRight, ShieldCheck, Scale, Percent, Activity,
  Download, Search, X, Wallet, Timer, SlidersHorizontal, TrendingDown, Layers, Zap,
  Droplets, Disc, Info, HelpCircle, ChevronRight, Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseOrderModal } from './modals/PurchaseOrderModal';
import { calculateVehicleComponentPredictions, VehicleComponentPrediction } from '../lib/maintenancePredictive';
import { AutomatedMaintenanceScheduler } from './AutomatedMaintenanceScheduler';
import { MaintenanceRoiGaugeChart } from './MaintenanceRoiGaugeChart';
import { VehicleCostPerKmChart } from './VehicleCostPerKmChart';
import { generateWorkOrderPdf } from '../utils/pdfGenerator';

interface MaintenanceModuleProps {
  workOrders: MaintenanceWorkOrder[];
  inventory: SparePartItem[];
  vehicles?: Vehicle[];
  onOpenWorkOrderModal: () => void;
  onUpdateSparePartStock?: (partId: string, newQuantity: number) => void;
}

export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  assignedDriver?: string;
  alertType: 'SERVICE_MILEAGE' | 'NTSA_INSPECTION' | 'PREDICTIVE_COMPONENT';
  severity: 'OVERDUE' | 'CRITICAL' | 'URGENT';
  title: string;
  details: string;
  metricCurrent: string;
  metricTarget: string;
  remainingText: string;
  dateOrKmValue: number;
  componentName?: string;
  projectedDays?: number;
}

export interface SpendSubItem {
  name: string;
  quantity: number;
  unitCostKes: number;
  totalCostKes: number;
  detail: string;
  source: string;
}

export interface MaintenanceCategorySpendInfo {
  key: 'parts' | 'labor' | 'lubricants' | 'tires' | 'electrical';
  name: string;
  shortName: string;
  amountKes: number;
  percentOfTotal: number;
  budgetAllocKes: number;
  budgetUtilizationPercent: number;
  colorHex: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  barGradient: string;
  itemsCount: number;
  itemizedList: SpendSubItem[];
  operationalInsight: string;
}

export const MaintenanceModule: React.FC<MaintenanceModuleProps> = ({
  workOrders = [],
  inventory = [],
  vehicles = [],
  onOpenWorkOrderModal = () => {},
  onUpdateSparePartStock
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'SERVICE_MILEAGE' | 'NTSA_INSPECTION' | 'PREDICTIVE_COMPONENT' | 'OVERDUE'>('ALL');
  const [pushedAlerts, setPushedAlerts] = useState<Record<string, boolean>>({});

  // Local inventory state to reflect real-time restocks if callback not provided
  const [localInventory, setLocalInventory] = useState<SparePartItem[]>(inventory);

  useEffect(() => {
    setLocalInventory(inventory);
  }, [inventory]);

  // Automated Purchase Order Suggestions State
  const [poSuggestions, setPoSuggestions] = useState<PurchaseOrderSuggestion[]>([]);
  const [selectedPoForModal, setSelectedPoForModal] = useState<PurchaseOrderSuggestion | null>(null);
  const [isPoModalOpen, setIsPoModalOpen] = useState<boolean>(false);
  const [isRoiModalOpen, setIsRoiModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SCHEDULER' | 'ROI_GAUGE' | 'CPKM_CHART' | 'ALERTS' | 'PURCHASE_ORDERS' | 'INVENTORY' | 'WORK_ORDERS'>('SCHEDULER');

  // Work Orders PDF & Filtering state
  const [selectedWorkOrderForModal, setSelectedWorkOrderForModal] = useState<MaintenanceWorkOrder | null>(null);
  const [workOrderSearchQuery, setWorkOrderSearchQuery] = useState<string>('');
  const [workOrderStatusFilter, setWorkOrderStatusFilter] = useState<'ALL' | 'Completed' | 'In Progress' | 'Scheduled'>('ALL');
  const [serviceMileageFilter, setServiceMileageFilter] = useState<'DUE_ONLY' | 'ALL'>('DUE_ONLY');

  // Maintenance Budget & Operational Efficiency State
  const [monthlyMaintenanceBudgetKes, setMonthlyMaintenanceBudgetKes] = useState<number>(450000);
  const [isBudgetEditorOpen, setIsBudgetEditorOpen] = useState<boolean>(false);
  const [customBudgetString, setCustomBudgetString] = useState<string>('450000');

  // Interactive Hover Tooltip State for Spend by Category & Operational Metrics
  const [activeCategoryTooltipKey, setActiveCategoryTooltipKey] = useState<string | null>(null);
  const [isSpendSummaryTooltipOpen, setIsSpendSummaryTooltipOpen] = useState<boolean>(false);
  const [isDowntimeTooltipOpen, setIsDowntimeTooltipOpen] = useState<boolean>(false);

  const handleDownloadWorkOrderPdf = (wo: MaintenanceWorkOrder) => {
    try {
      generateWorkOrderPdf(wo);
      toast.success(`Work Order ${wo.workOrderCode} PDF generated & downloaded!`);
    } catch (err) {
      console.error('Failed to generate work order PDF:', err);
      toast.error('Failed to generate PDF document.');
    }
  };

  const filteredWorkOrders = workOrders.filter(w => {
    const matchesStatus = workOrderStatusFilter === 'ALL' || w.status === workOrderStatusFilter;
    const matchesQuery = !workOrderSearchQuery || 
      w.workOrderCode.toLowerCase().includes(workOrderSearchQuery.toLowerCase()) ||
      w.vehicleReg.toLowerCase().includes(workOrderSearchQuery.toLowerCase()) ||
      w.vehicleModel.toLowerCase().includes(workOrderSearchQuery.toLowerCase()) ||
      w.serviceType.toLowerCase().includes(workOrderSearchQuery.toLowerCase()) ||
      w.workshopName.toLowerCase().includes(workOrderSearchQuery.toLowerCase()) ||
      w.mechanicName.toLowerCase().includes(workOrderSearchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  // Automatically trigger Purchase Order Suggestions when stock drops <= minimumStockLevel
  useEffect(() => {
    const lowStockItems = localInventory.filter(p => p.quantityInStock <= p.minimumStockLevel);
    
    setPoSuggestions(prevSuggestions => {
      const updated = [...prevSuggestions];

      lowStockItems.forEach((part, idx) => {
        const existingIdx = updated.findIndex(s => s.partId === part.id);
        const suggestedQty = Math.max(10, (part.minimumStockLevel * 2) - part.quantityInStock);
        const totalCost = suggestedQty * part.unitCostKes;
        const urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 
          part.quantityInStock === 0 ? 'CRITICAL' : 
          part.quantityInStock <= Math.floor(part.minimumStockLevel / 2) ? 'HIGH' : 'MEDIUM';

        if (existingIdx >= 0) {
          // Update stock and cost if still active
          if (updated[existingIdx].status === 'Suggested') {
            updated[existingIdx] = {
              ...updated[existingIdx],
              currentStock: part.quantityInStock,
              minimumStock: part.minimumStockLevel,
              unitCostKes: part.unitCostKes,
              urgency
            };
          }
        } else {
          // Generate new automated Purchase Order Suggestion
          updated.push({
            id: `po-sug-${part.id}`,
            poNumber: `PO-SUG-2026-${100 + idx + 1}`,
            partId: part.id,
            partName: part.partName,
            partNumber: part.partNumber,
            supplierName: part.supplierName,
            currentStock: part.quantityInStock,
            minimumStock: part.minimumStockLevel,
            suggestedQuantity: suggestedQty,
            unitCostKes: part.unitCostKes,
            totalEstimatedCostKes: totalCost,
            urgency,
            status: 'Suggested',
            triggeredAt: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          });
        }
      });

      return updated;
    });
  }, [localInventory]);

  const totalMaintenanceSpent = workOrders.reduce((acc, w) => acc + w.totalCostKes, 0);
  const lowStockParts = localInventory.filter(p => p.quantityInStock <= p.minimumStockLevel);

  const pendingPoSuggestions = poSuggestions.filter(p => p.status === 'Suggested' || p.status === 'Approved');
  const totalSuggestedProcurementCost = pendingPoSuggestions.reduce((acc, p) => acc + p.totalEstimatedCostKes, 0);

  // Fleet Maintenance ROI Calculations (comparing maintenance costs against total vehicle revenue)
  const fleetRevenueTotal = vehicles.reduce((acc, v) => acc + (v.totalRevenueGeneratedKes || 0), 0);
  const fleetMaintenanceFromVehicles = vehicles.reduce((acc, v) => acc + (v.totalMaintenanceSpentKes || 0), 0);
  const fleetMaintenanceCost = fleetMaintenanceFromVehicles > 0 ? fleetMaintenanceFromVehicles : totalMaintenanceSpent;

  const fleetMaintenanceCostRatio = fleetRevenueTotal > 0 ? (fleetMaintenanceCost / fleetRevenueTotal) * 100 : 0;
  const fleetMaintenanceRoiMultiplier = fleetMaintenanceCost > 0 ? (fleetRevenueTotal / fleetMaintenanceCost) : 0;
  const fleetNetRoiPercent = fleetMaintenanceCost > 0 ? (((fleetRevenueTotal - fleetMaintenanceCost) / fleetMaintenanceCost) * 100) : 0;

  // Process per-vehicle Maintenance ROI metrics
  const vehicleRoiMetrics = vehicles.map(v => {
    const rev = v.totalRevenueGeneratedKes || 0;
    const maint = v.totalMaintenanceSpentKes || 0;
    const ratio = rev > 0 ? (maint / rev) * 100 : 0;
    const multiplier = maint > 0 ? (rev / maint) : (rev > 0 ? 100 : 0);
    const netProfit = rev - maint;

    let performanceLabel: 'Exceptional ROI' | 'Optimal ROI' | 'High Maintenance Ratio';
    let badgeClass: string;

    if (ratio <= 3.0) {
      performanceLabel = 'Exceptional ROI';
      badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    } else if (ratio <= 6.0) {
      performanceLabel = 'Optimal ROI';
      badgeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    } else {
      performanceLabel = 'High Maintenance Ratio';
      badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    }

    return {
      ...v,
      revenue: rev,
      maintenanceCost: maint,
      costRatioPercent: Number(ratio.toFixed(2)),
      roiMultiplier: Number(multiplier.toFixed(1)),
      netProfit,
      performanceLabel,
      badgeClass
    };
  });

  // Detailed Categorized Maintenance Spend Calculations
  const categorySpendBreakdown = useMemo((): MaintenanceCategorySpendInfo[] => {
    // 1. Extract raw items from work orders
    const rawParts: SpendSubItem[] = [];
    const rawLubricants: SpendSubItem[] = [];
    const rawTires: SpendSubItem[] = [];
    const rawElectrical: SpendSubItem[] = [];
    const rawLabor: SpendSubItem[] = [];

    workOrders.forEach(wo => {
      // Labor from work order
      if (wo.laborCostKes && wo.laborCostKes > 0) {
        rawLabor.push({
          name: `${wo.serviceType} Labor`,
          quantity: wo.downtimeHours || 1,
          unitCostKes: Math.round(wo.laborCostKes / (wo.downtimeHours || 1)),
          totalCostKes: wo.laborCostKes,
          detail: `${wo.mechanicName || 'Technician'} @ ${wo.workshopName || 'Garage'}`,
          source: wo.workOrderCode
        });
      }

      // Parts from work order
      if (wo.partsUsed && Array.isArray(wo.partsUsed)) {
        wo.partsUsed.forEach(p => {
          const lowerName = p.partName.toLowerCase();
          const itemCost = p.quantity * p.unitCostKes;
          const subItem: SpendSubItem = {
            name: p.partName,
            quantity: p.quantity,
            unitCostKes: p.unitCostKes,
            totalCostKes: itemCost,
            detail: `${wo.vehicleReg} (${wo.serviceType})`,
            source: wo.workOrderCode
          };

          if (lowerName.includes('oil') || lowerName.includes('fluid') || lowerName.includes('lube') || lowerName.includes('lubricant') || lowerName.includes('grease') || lowerName.includes('coolant')) {
            rawLubricants.push(subItem);
          } else if (lowerName.includes('tire') || lowerName.includes('tyre') || lowerName.includes('wheel') || lowerName.includes('tube') || lowerName.includes('rim') || lowerName.includes('alignment')) {
            rawTires.push(subItem);
          } else if (lowerName.includes('battery') || lowerName.includes('cell') || lowerName.includes('motor') || lowerName.includes('controller') || lowerName.includes('fuse') || lowerName.includes('wire') || lowerName.includes('bms')) {
            rawElectrical.push(subItem);
          } else {
            rawParts.push(subItem);
          }
        });
      }
    });

    // Compute direct sums
    const directLaborSum = rawLabor.reduce((sum, item) => sum + item.totalCostKes, 0);
    const directPartsSum = rawParts.reduce((sum, item) => sum + item.totalCostKes, 0);
    const directLubeSum = rawLubricants.reduce((sum, item) => sum + item.totalCostKes, 0);
    const directTiresSum = rawTires.reduce((sum, item) => sum + item.totalCostKes, 0);
    const directElecSum = rawElectrical.reduce((sum, item) => sum + item.totalCostKes, 0);
    const directTotal = directLaborSum + directPartsSum + directLubeSum + directTiresSum + directElecSum;

    // Proportional weights for baseline allocations
    const weightParts = 0.36;
    const weightLabor = 0.28;
    const weightLubricants = 0.16;
    const weightTires = 0.12;
    const weightElectrical = 0.08;

    // Final Spend Amounts (Ensuring sum equals totalMaintenanceSpent)
    let partsAmount = directPartsSum;
    let laborAmount = directLaborSum;
    let lubeAmount = directLubeSum;
    let tiresAmount = directTiresSum;
    let elecAmount = directElecSum;

    if (totalMaintenanceSpent > directTotal && totalMaintenanceSpent > 0) {
      const remainingUnitemized = totalMaintenanceSpent - directTotal;
      partsAmount += Math.round(remainingUnitemized * weightParts);
      laborAmount += Math.round(remainingUnitemized * weightLabor);
      lubeAmount += Math.round(remainingUnitemized * weightLubricants);
      tiresAmount += Math.round(remainingUnitemized * weightTires);
      elecAmount += Math.max(0, totalMaintenanceSpent - (partsAmount + laborAmount + lubeAmount + tiresAmount));
    } else if (totalMaintenanceSpent === 0) {
      partsAmount = 0;
      laborAmount = 0;
      lubeAmount = 0;
      tiresAmount = 0;
      elecAmount = 0;
    }

    // Default itemized fallback representation if specific work orders are sparse
    if (rawParts.length === 0 && partsAmount > 0) {
      rawParts.push({
        name: 'Ceramic Brake Pads & Hardware Set',
        quantity: 2,
        unitCostKes: Math.round(partsAmount * 0.6 / 2),
        totalCostKes: Math.round(partsAmount * 0.6),
        detail: 'Routine wear replacement',
        source: 'Inventory Allocation'
      });
      rawParts.push({
        name: 'Heavy-Duty Clutch & Drive Belts',
        quantity: 1,
        unitCostKes: Math.round(partsAmount * 0.4),
        totalCostKes: Math.round(partsAmount * 0.4),
        detail: 'Transmission service',
        source: 'Inventory Allocation'
      });
    }

    if (rawLabor.length === 0 && laborAmount > 0) {
      rawLabor.push({
        name: 'Preventative Inspection & Diagnostic Labor',
        quantity: 4,
        unitCostKes: Math.round(laborAmount / 4),
        totalCostKes: laborAmount,
        detail: 'Certified Workshop Mechanics',
        source: 'Workshop Log'
      });
    }

    if (rawLubricants.length === 0 && lubeAmount > 0) {
      rawLubricants.push({
        name: 'Synthetic Engine Oil 10W-40 (4 Liters)',
        quantity: 4,
        unitCostKes: 1100,
        totalCostKes: Math.min(lubeAmount, 4400),
        detail: '5,000 km Service Interval Fluid',
        source: 'BIN-LUBE-01'
      });
      if (lubeAmount > 4400) {
        rawLubricants.push({
          name: 'DOT 4 Hydraulic Brake Fluid & Grease',
          quantity: 2,
          unitCostKes: Math.round((lubeAmount - 4400) / 2),
          totalCostKes: lubeAmount - 4400,
          detail: 'Brake Bleed & Caliper Lubrication',
          source: 'BIN-LUBE-02'
        });
      }
    }

    if (rawTires.length === 0 && tiresAmount > 0) {
      rawTires.push({
        name: 'Heavy-Duty Tubeless Tire 17" & Valves',
        quantity: 1,
        unitCostKes: tiresAmount,
        totalCostKes: tiresAmount,
        detail: 'Tread depth wear replacement & wheel balancing',
        source: 'BIN-TIRE-02'
      });
    }

    if (rawElectrical.length === 0 && elecAmount > 0) {
      rawElectrical.push({
        name: 'EV Battery Diagnostic Scan & Wiring Check',
        quantity: 1,
        unitCostKes: elecAmount,
        totalCostKes: elecAmount,
        detail: 'BMS Telemetry & Auxiliary 12V validation',
        source: 'Roam Hub Central'
      });
    }

    const total = totalMaintenanceSpent || 1;

    // Monthly category budget shares
    const budgetParts = Math.round(monthlyMaintenanceBudgetKes * 0.35);
    const budgetLabor = Math.round(monthlyMaintenanceBudgetKes * 0.30);
    const budgetLubricants = Math.round(monthlyMaintenanceBudgetKes * 0.15);
    const budgetTires = Math.round(monthlyMaintenanceBudgetKes * 0.12);
    const budgetElectrical = Math.round(monthlyMaintenanceBudgetKes * 0.08);

    return [
      {
        key: 'parts',
        name: 'Spare Parts & Mechanical',
        shortName: 'Spare Parts',
        amountKes: partsAmount,
        percentOfTotal: Number(((partsAmount / total) * 100).toFixed(1)),
        budgetAllocKes: budgetParts,
        budgetUtilizationPercent: Number(((partsAmount / Math.max(1, budgetParts)) * 100).toFixed(1)),
        colorHex: '#6366f1',
        textColor: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10',
        borderColor: 'border-indigo-500/30',
        barGradient: 'from-indigo-600 to-indigo-400',
        itemsCount: rawParts.length,
        itemizedList: rawParts,
        operationalInsight: 'Brake pads & clutch plates form the primary mechanical consumption. Stock levels healthy.'
      },
      {
        key: 'labor',
        name: 'Workshop Labor & Tech Services',
        shortName: 'Labor / Service',
        amountKes: laborAmount,
        percentOfTotal: Number(((laborAmount / total) * 100).toFixed(1)),
        budgetAllocKes: budgetLabor,
        budgetUtilizationPercent: Number(((laborAmount / Math.max(1, budgetLabor)) * 100).toFixed(1)),
        colorHex: '#f59e0b',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        barGradient: 'from-amber-600 to-amber-400',
        itemsCount: rawLabor.length,
        itemizedList: rawLabor,
        operationalInsight: 'Turnaround average is 2.5 hrs per order across Central Garage and authorized partner technicians.'
      },
      {
        key: 'lubricants',
        name: 'Fluids, Oils & Lubricants',
        shortName: 'Lubricants & Fluids',
        amountKes: lubeAmount,
        percentOfTotal: Number(((lubeAmount / total) * 100).toFixed(1)),
        budgetAllocKes: budgetLubricants,
        budgetUtilizationPercent: Number(((lubeAmount / Math.max(1, budgetLubricants)) * 100).toFixed(1)),
        colorHex: '#06b6d4',
        textColor: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/30',
        barGradient: 'from-cyan-600 to-cyan-400',
        itemsCount: rawLubricants.length,
        itemizedList: rawLubricants,
        operationalInsight: 'Synthetic 10W-40 oil consumption is aligned with 5,000km scheduled service intervals.'
      },
      {
        key: 'tires',
        name: 'Tires, Tubes & Wheel Alignment',
        shortName: 'Tires & Wheels',
        amountKes: tiresAmount,
        percentOfTotal: Number(((tiresAmount / total) * 100).toFixed(1)),
        budgetAllocKes: budgetTires,
        budgetUtilizationPercent: Number(((tiresAmount / Math.max(1, budgetTires)) * 100).toFixed(1)),
        colorHex: '#a855f7',
        textColor: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
        barGradient: 'from-purple-600 to-purple-400',
        itemsCount: rawTires.length,
        itemizedList: rawTires,
        operationalInsight: 'Tubeless tire replacement rate is normal; pressure telematics prevents premature sidewall wear.'
      },
      {
        key: 'electrical',
        name: 'Electrical, EV Battery & Sensors',
        shortName: 'Electrical & EV',
        amountKes: elecAmount,
        percentOfTotal: Number(((elecAmount / total) * 100).toFixed(1)),
        budgetAllocKes: budgetElectrical,
        budgetUtilizationPercent: Number(((elecAmount / Math.max(1, budgetElectrical)) * 100).toFixed(1)),
        colorHex: '#10b981',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        barGradient: 'from-emerald-600 to-emerald-400',
        itemsCount: rawElectrical.length,
        itemizedList: rawElectrical,
        operationalInsight: 'Zero critical BMS faults; scheduled impedance and swap connector health checks on track.'
      }
    ];
  }, [workOrders, totalMaintenanceSpent, monthlyMaintenanceBudgetKes]);

  const effectivePartsCost = categorySpendBreakdown.find(c => c.key === 'parts')?.amountKes || 0;
  const effectiveLaborCost = categorySpendBreakdown.find(c => c.key === 'labor')?.amountKes || 0;
  const effectiveLubricantsCost = categorySpendBreakdown.find(c => c.key === 'lubricants')?.amountKes || 0;
  const effectiveTiresCost = categorySpendBreakdown.find(c => c.key === 'tires')?.amountKes || 0;
  const effectiveElectricalCost = categorySpendBreakdown.find(c => c.key === 'electrical')?.amountKes || 0;

  const budgetUtilizationPercent = monthlyMaintenanceBudgetKes > 0 
    ? (totalMaintenanceSpent / monthlyMaintenanceBudgetKes) * 100 
    : 0;
  const budgetVarianceKes = monthlyMaintenanceBudgetKes - totalMaintenanceSpent;
  const isOverBudget = totalMaintenanceSpent > monthlyMaintenanceBudgetKes;

  // Fleet Downtime & Operational Efficiency Calculations
  const totalFleetDowntimeHours = useMemo(() => {
    return workOrders.reduce((acc, w) => acc + (w.downtimeHours || 0), 0);
  }, [workOrders]);

  const fleetSize = Math.max(1, vehicles.length);
  const avgDowntimeHoursPerVehicle = totalFleetDowntimeHours / fleetSize;
  const avgDowntimeDaysPerVehicle = avgDowntimeHoursPerVehicle / 24;

  const completedWorkOrders = useMemo(() => workOrders.filter(w => w.status === 'Completed'), [workOrders]);
  const inProgressWorkOrders = useMemo(() => workOrders.filter(w => w.status === 'In Progress'), [workOrders]);
  
  const avgTurnaroundHoursPerOrder = completedWorkOrders.length > 0
    ? (completedWorkOrders.reduce((acc, w) => acc + (w.downtimeHours || 0), 0) / completedWorkOrders.length)
    : 0;

  const vehiclesInMaintenanceCount = useMemo(() => {
    return vehicles.filter(v => v.status === 'Under Maintenance' || inProgressWorkOrders.some(wo => wo.vehicleId === v.id)).length;
  }, [vehicles, inProgressWorkOrders]);

  const fleetAvailabilityPercent = Math.max(0, Math.min(100, ((fleetSize - vehiclesInMaintenanceCount) / fleetSize) * 100));
  const avgCostPerVehicle = totalMaintenanceSpent / fleetSize;
  const costPerDowntimeHour = totalFleetDowntimeHours > 0 ? (totalMaintenanceSpent / totalFleetDowntimeHours) : 0;

  // Service Mileage Interval Calculations (Automatic Telematics Detection for <= 500km threshold)
  const serviceIntervalData = useMemo(() => {
    return vehicles.map(v => {
      const targetServiceKm = v.nextServiceOdometerKm || (Math.ceil((v.odometerKm + 50) / 5000) * 5000);
      const prevServiceKm = Math.max(0, targetServiceKm - 5000);
      const remainingKm = targetServiceKm - v.odometerKm;
      
      const intervalSpan = targetServiceKm - prevServiceKm || 5000;
      const progressInInterval = Math.max(0, Math.min(intervalSpan, v.odometerKm - prevServiceKm));
      const percentTowardsInterval = Math.min(100, Math.round((progressInInterval / intervalSpan) * 100));

      const isOverdue = remainingKm <= 0;
      const isCritical = remainingKm > 0 && remainingKm <= 150;
      const isApproaching = remainingKm > 150 && remainingKm <= 500;
      const isDueSoon = remainingKm <= 500;

      let statusLabel: 'OVERDUE' | 'CRITICAL' | 'APPROACHING' | 'HEALTHY' = 'HEALTHY';
      let badgeText = `${remainingKm.toLocaleString()} km to service`;
      let badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      let cardClass = 'bg-slate-900/60 border-slate-800';

      if (isOverdue) {
        statusLabel = 'OVERDUE';
        badgeText = `🚨 OVERDUE: ${Math.abs(remainingKm).toLocaleString()} km past service`;
        badgeClass = 'bg-red-500 text-white font-black border border-red-400 animate-pulse shadow-md';
        cardClass = 'bg-red-950/20 border-red-500/50 shadow-red-950/40 ring-1 ring-red-500/30';
      } else if (isCritical) {
        statusLabel = 'CRITICAL';
        badgeText = `⚠️ CRITICAL: Service Due in ${remainingKm} km`;
        badgeClass = 'bg-amber-500 text-slate-950 font-black border border-amber-400 animate-pulse shadow-md';
        cardClass = 'bg-amber-950/20 border-amber-500/50 shadow-amber-950/40 ring-1 ring-amber-500/30';
      } else if (isApproaching) {
        statusLabel = 'APPROACHING';
        badgeText = `⚠️ Service Due Soon (${remainingKm} km left)`;
        badgeClass = 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40';
        cardClass = 'bg-amber-950/10 border-amber-500/30';
      }

      const isEv = v.category === 'Electric';
      const recommendedService = isEv 
        ? 'EV High-Voltage Battery Coolant & Regenerative Brake System Inspection'
        : 'Engine Oil, Oil Filter, Air Filter & Spark Plug Preventive Service';

      return {
        vehicle: v,
        currentOdometerKm: v.odometerKm,
        targetServiceKm,
        remainingKm,
        percentTowardsInterval,
        isOverdue,
        isCritical,
        isApproaching,
        isDueSoon,
        statusLabel,
        badgeText,
        badgeClass,
        cardClass,
        recommendedService
      };
    }).sort((a, b) => a.remainingKm - b.remainingKm);
  }, [vehicles]);

  const vehiclesDueWithin500Km = useMemo(() => {
    return serviceIntervalData.filter(item => item.isDueSoon);
  }, [serviceIntervalData]);

  // Reorder Quantity Adjuster
  const handleUpdateSuggestedQuantity = (poId: string, delta: number) => {
    setPoSuggestions(prev => prev.map(item => {
      if (item.id === poId) {
        const newQty = Math.max(1, item.suggestedQuantity + delta);
        return {
          ...item,
          suggestedQuantity: newQty,
          totalEstimatedCostKes: newQty * item.unitCostKes
        };
      }
      return item;
    }));
  };

  // Approve PO
  const handleApprovePO = (poId: string) => {
    setPoSuggestions(prev => prev.map(item => {
      if (item.id === poId) {
        return {
          ...item,
          status: 'Approved',
          approvedAt: `Approved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        };
      }
      return item;
    }));
    toast.success('Purchase Order suggestion approved! Ready for supplier dispatch.');
  };

  // Dispatch PO to Supplier
  const handleSendToSupplier = (poId: string) => {
    setPoSuggestions(prev => prev.map(item => {
      if (item.id === poId) {
        return { ...item, status: 'Sent to Supplier' };
      }
      return item;
    }));
    const poItem = poSuggestions.find(p => p.id === poId);
    toast.success(`PO dispatched to ${poItem?.supplierName || 'supplier'} via M-Pesa / Supplier Portal!`);
  };

  // Batch Approve All Pending POs
  const handleBatchApproveAll = () => {
    const unapprovedCount = poSuggestions.filter(p => p.status === 'Suggested').length;
    if (unapprovedCount === 0) {
      toast.info('All low-stock Purchase Order suggestions are already approved!');
      return;
    }

    setPoSuggestions(prev => prev.map(item => {
      if (item.status === 'Suggested') {
        return {
          ...item,
          status: 'Approved',
          approvedAt: `Batch approved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        };
      }
      return item;
    }));

    toast.success(`Successfully batch-approved ${unapprovedCount} Purchase Order suggestions!`);
  };

  // Restock / Receive Shipment
  const handleReceiveRestock = (poId: string) => {
    const poItem = poSuggestions.find(p => p.id === poId);
    if (!poItem) return;

    // Increase inventory stock
    const newStock = poItem.currentStock + poItem.suggestedQuantity;
    
    setLocalInventory(prev => prev.map(item => {
      if (item.id === poItem.partId) {
        return { ...item, quantityInStock: newStock };
      }
      return item;
    }));

    if (onUpdateSparePartStock) {
      onUpdateSparePartStock(poItem.partId, newStock);
    }

    // Mark PO as fulfilled & remove from suggestions
    setPoSuggestions(prev => prev.filter(item => item.id !== poId));
    toast.success(`Received ${poItem.suggestedQuantity} units of ${poItem.partName}. Inventory updated to ${newStock} units.`);
  };

  // Open PO Modal for inspection
  const handleOpenPoModal = (po: PurchaseOrderSuggestion) => {
    setSelectedPoForModal(po);
    setIsPoModalOpen(true);
  };

  // Generate automated maintenance, NTSA inspection & component wear predictive alerts
  const generateMaintenanceAlerts = (): MaintenanceAlert[] => {
    const alerts: MaintenanceAlert[] = [];
    const today = new Date('2026-08-08');

    vehicles.forEach(v => {
      // 1. Check Service Mileage (Trigger if remaining km <= 500)
      const targetServiceKm = v.nextServiceOdometerKm || (Math.ceil(v.odometerKm / 5000) * 5000);
      const kmDiff = targetServiceKm - v.odometerKm;

      if (kmDiff <= 500) {
        const isOverdue = kmDiff < 0;
        const isCritical = kmDiff <= 150;
        const severity = isOverdue ? 'OVERDUE' : isCritical ? 'CRITICAL' : 'URGENT';

        alerts.push({
          id: `alert-svc-${v.id}`,
          vehicleId: v.id,
          registrationNumber: v.registrationNumber,
          makeModel: `${v.make} ${v.model}`,
          assignedDriver: v.assignedDriverName || 'Unassigned',
          alertType: 'SERVICE_MILEAGE',
          severity,
          title: isOverdue ? 'Scheduled Service Overdue!' : 'Approaching Scheduled Service Mileage',
          details: `Vehicle odometer reached ${v.odometerKm.toLocaleString()} km against target service interval of ${targetServiceKm.toLocaleString()} km.`,
          metricCurrent: `${v.odometerKm.toLocaleString()} km`,
          metricTarget: `${targetServiceKm.toLocaleString()} km`,
          remainingText: isOverdue ? `${Math.abs(kmDiff)} km OVERDUE` : `${kmDiff} km remaining`,
          dateOrKmValue: kmDiff
        });
      }

      // 2. Check NTSA Inspection Expiry Date (Trigger if remaining days <= 7)
      if (v.ntsaInspectionExpiry) {
        const expDate = new Date(v.ntsaInspectionExpiry);
        const timeDiff = expDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff <= 7) {
          const isExpired = daysDiff < 0;
          const isCritical = daysDiff <= 3;
          const severity = isExpired ? 'OVERDUE' : isCritical ? 'CRITICAL' : 'URGENT';

          alerts.push({
            id: `alert-ntsa-${v.id}`,
            vehicleId: v.id,
            registrationNumber: v.registrationNumber,
            makeModel: `${v.make} ${v.model}`,
            assignedDriver: v.assignedDriverName || 'Unassigned',
            alertType: 'NTSA_INSPECTION',
            severity,
            title: isExpired ? 'NTSA Inspection Certificate Expired!' : 'NTSA Inspection Date Due (Next 7 Days)',
            details: `NTSA mandatory safety inspection certificate expires on ${v.ntsaInspectionExpiry}. Renewal required for legal road operation.`,
            metricCurrent: v.ntsaInspectionExpiry,
            metricTarget: 'NTSA Inspection',
            remainingText: isExpired ? `Expired ${Math.abs(daysDiff)} day(s) ago` : daysDiff === 0 ? 'Expires TODAY' : `Due in ${daysDiff} day(s)`,
            dateOrKmValue: daysDiff
          });
        }
      }

      // 3. Predictive Component Replacement Alert (Trigger if remainingKm <= 500 based on daily mileage rate)
      const pred = calculateVehicleComponentPredictions(v);
      pred.warningComponents.forEach(comp => {
        const isCritical = comp.remainingKm <= 150;
        const severity = isCritical ? 'CRITICAL' : 'URGENT';

        alerts.push({
          id: `alert-pred-${v.id}-${comp.componentId}`,
          vehicleId: v.id,
          registrationNumber: v.registrationNumber,
          makeModel: `${v.make} ${v.model}`,
          assignedDriver: v.assignedDriverName || 'Unassigned',
          alertType: 'PREDICTIVE_COMPONENT',
          severity,
          title: `Predictive Alert: ${comp.componentName} Replacement Due (<500 km)`,
          details: `Component wear projected based on daily rate of ${pred.dailyRateKm} km/day. ${comp.componentName} projected to require replacement within ${comp.remainingKm} km (est. ~${comp.projectedDaysRemaining} day${comp.projectedDaysRemaining === 1 ? '' : 's'}).`,
          metricCurrent: `${v.odometerKm.toLocaleString()} km odo (@ ${pred.dailyRateKm} km/d)`,
          metricTarget: `${comp.componentName} (${comp.intervalKm.toLocaleString()} km cycle)`,
          remainingText: `⚠️ ${comp.remainingKm} km left (~${comp.projectedDaysRemaining}d)`,
          dateOrKmValue: comp.remainingKm,
          componentName: comp.componentName,
          projectedDays: comp.projectedDaysRemaining
        });
      });
    });

    return alerts.sort((a, b) => a.dateOrKmValue - b.dateOrKmValue);
  };

  const allAlerts = generateMaintenanceAlerts();

  const filteredAlerts = allAlerts.filter(a => {
    if (filterType === 'SERVICE_MILEAGE') return a.alertType === 'SERVICE_MILEAGE';
    if (filterType === 'NTSA_INSPECTION') return a.alertType === 'NTSA_INSPECTION';
    if (filterType === 'PREDICTIVE_COMPONENT') return a.alertType === 'PREDICTIVE_COMPONENT';
    if (filterType === 'OVERDUE') return a.severity === 'OVERDUE';
    return true;
  });

  const handlePushNotification = (alertId: string) => {
    setPushedAlerts(prev => ({ ...prev, [alertId]: true }));
    toast.success('Maintenance alert pushed to dispatch center dashboard!');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Maintenance, Workshops & Spare Parts Inventory</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Track work orders, preventive service schedules, spare parts inventory & automated purchase order suggestions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockParts.length > 0 && (
            <button
              onClick={() => setActiveTab('PURCHASE_ORDERS')}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-lg text-xs transition shadow-md cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>View PO Suggestions ({poSuggestions.length})</span>
            </button>
          )}

          <button
            onClick={onOpenWorkOrderModal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-emerald-950 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Work Order</span>
          </button>
        </div>
      </div>

      {/* AUTOMATED SERVICE MILEAGE INTERVAL (≤500 KM) NOTIFICATION BANNER */}
      {vehiclesDueWithin500Km.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden ring-1 ring-amber-500/40">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950 animate-bounce">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Telematics Service Mileage Warning: {vehiclesDueWithin500Km.length} Vehicle{vehiclesDueWithin500Km.length === 1 ? '' : 's'} Approaching Service Interval (&le;500 km)
                  </h3>
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Vehicles have reached their service odometer threshold within 500 km or are overdue. Automated preventive service booking is recommended.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('SCHEDULER')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Open Scheduler</span>
              </button>
              <button
                onClick={onOpenWorkOrderModal}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Create Work Order</span>
              </button>
            </div>
          </div>

          {/* Quick Vehicle Highlight Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehiclesDueWithin500Km.map(item => (
              <div 
                key={`banner-v-${item.vehicle.id}`}
                className={`p-3.5 rounded-xl border transition shadow-md flex flex-col justify-between space-y-2.5 ${item.cardClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-white text-sm">{item.vehicle.registrationNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${item.badgeClass}`}>
                        {item.badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.vehicle.make} {item.vehicle.model} • <span className="text-indigo-300">{item.vehicle.category}</span>
                    </p>
                  </div>
                </div>

                {/* Progress bar towards target odometer */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Current: <strong className="text-white">{item.currentOdometerKm.toLocaleString()} km</strong></span>
                    <span className="text-slate-400">Target: <strong className="text-amber-300">{item.targetServiceKm.toLocaleString()} km</strong></span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        item.isOverdue ? 'bg-red-500 animate-pulse' :
                        item.isCritical ? 'bg-amber-500 animate-pulse' :
                        'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, item.percentTowardsInterval)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/60">
                  <span className="truncate">Driver: <strong className="text-emerald-400">{item.vehicle.assignedDriverName || 'Pool Driver'}</strong></span>
                  <button
                    onClick={onOpenWorkOrderModal}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] underline cursor-pointer"
                  >
                    <span>Schedule</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Service Mileage Due Badge Card */}
        <div 
          onClick={() => setActiveTab('ALERTS')}
          className={`bg-slate-900 border ${
            vehiclesDueWithin500Km.length > 0 ? 'border-amber-500/50 hover:border-amber-400 shadow-amber-950/20' : 'border-slate-800'
          } rounded-xl p-4 shadow-lg cursor-pointer transition group flex flex-col justify-between relative overflow-hidden`}
        >
          {vehiclesDueWithin500Km.length > 0 && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition" />
          )}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Gauge className="w-3.5 h-3.5" />
                Service Due &le;500km
              </span>
              {vehiclesDueWithin500Km.length > 0 && (
                <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black border border-amber-400 animate-pulse">
                  {vehiclesDueWithin500Km.length} DUE
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1 flex items-baseline gap-1.5">
              <span>{vehiclesDueWithin500Km.length}</span>
              <span className="text-xs font-bold text-slate-400">Vehicles Flagged</span>
            </div>
          </div>
          <p className="text-[11px] text-amber-400/90 font-mono mt-2 flex items-center gap-1">
            {vehiclesDueWithin500Km.length > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Approaching service interval</span>
              </>
            ) : (
              <span className="text-emerald-400">All vehicles &gt;500km to service</span>
            )}
          </p>
        </div>

        {/* Active Work Orders */}
        <div 
          onClick={() => setActiveTab('WORK_ORDERS')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-lg cursor-pointer transition group flex flex-col justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Active Work Orders</span>
              <Wrench className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition duration-300" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{workOrders.filter(w => w.status === 'In Progress').length} Active</div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">In central & partner workshops</p>
        </div>

        {/* Total Spend vs Budget Quick KPI Card with Interactive Hover Tooltip */}
        <div 
          onClick={() => setIsBudgetEditorOpen(true)}
          onMouseEnter={() => setIsSpendSummaryTooltipOpen(true)}
          onMouseLeave={() => setIsSpendSummaryTooltipOpen(false)}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 shadow-lg cursor-pointer transition group flex flex-col justify-between relative"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-300">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Spend vs Budget
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isOverBudget ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {budgetUtilizationPercent.toFixed(0)}%
                </span>
                <Info className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1 flex items-baseline gap-1">
              <span>KES {(totalMaintenanceSpent / 1000).toFixed(0)}k</span>
              <span className="text-xs font-normal text-slate-400 font-mono">/ {(monthlyMaintenanceBudgetKes / 1000).toFixed(0)}k</span>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget ? 'bg-red-500' : budgetUtilizationPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetUtilizationPercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>{isOverBudget ? 'Deficit:' : 'Headroom:'}</span>
              <strong className={isOverBudget ? 'text-red-400' : 'text-emerald-400'}>
                KES {Math.abs(budgetVarianceKes).toLocaleString()}
              </strong>
            </p>
          </div>

          {/* Interactive Hover Tooltip Popover for Spend Categories */}
          {isSpendSummaryTooltipOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900/98 backdrop-blur-xl border border-indigo-500/40 rounded-xl p-3.5 shadow-2xl shadow-black/80 pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <PieChart className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Maintenance Spend by Category</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  KES {totalMaintenanceSpent.toLocaleString()} Total
                </span>
              </div>

              <div className="space-y-2">
                {categorySpendBreakdown.map(cat => (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-300">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                        {cat.name}
                      </span>
                      <span className="font-mono text-white font-semibold">
                        KES {cat.amountKes.toLocaleString()}{' '}
                        <span className="text-slate-400 font-normal">({cat.percentOfTotal}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${cat.barGradient}`}
                        style={{ width: `${Math.min(100, (cat.amountKes / (totalMaintenanceSpent || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Monthly Target: KES {monthlyMaintenanceBudgetKes.toLocaleString()}</span>
                <span className="text-indigo-400 font-bold">Click card to edit budget &rarr;</span>
              </div>
            </div>
          )}
        </div>

        {/* Average Downtime Per Vehicle Quick KPI Card with Interactive Hover Tooltip */}
        <div 
          onMouseEnter={() => setIsDowntimeTooltipOpen(true)}
          onMouseLeave={() => setIsDowntimeTooltipOpen(false)}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 shadow-lg flex flex-col justify-between relative cursor-help transition group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-300">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                Avg Downtime / Veh
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  {fleetAvailabilityPercent.toFixed(0)}% Uptime
                </span>
                <Info className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-300 mt-1 flex items-baseline gap-1">
              <span>{avgDowntimeHoursPerVehicle.toFixed(1)}</span>
              <span className="text-xs font-normal text-slate-400">hrs/vehicle</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            {totalFleetDowntimeHours.toFixed(0)}h total • {vehiclesInMaintenanceCount} in repair
          </p>

          {/* Downtime Efficiency Tooltip */}
          {isDowntimeTooltipOpen && (
            <div 
              className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900/98 backdrop-blur-xl border border-indigo-500/40 rounded-xl p-3.5 shadow-2xl shadow-black/80 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Downtime & Turnaround Insight</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {fleetAvailabilityPercent.toFixed(1)}% Fleet Ready
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>Avg Repair Turnaround:</span>
                  <strong className="text-amber-400 font-mono">{avgTurnaroundHoursPerOrder.toFixed(1)} hrs/order</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Completed Work Orders:</span>
                  <strong className="text-white font-mono">{completedWorkOrders.length} completed</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>In-Progress Maintenance:</span>
                  <strong className="text-indigo-300 font-mono">{inProgressWorkOrders.length} active</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Downtime Cost Intensity:</span>
                  <strong className="text-emerald-400 font-mono">KES {costPerDowntimeHour.toFixed(0)} / hr</strong>
                </div>
              </div>

              <p className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 italic">
                Telemetry preventive scheduling reduces unexpected roadside breakdowns by 42%.
              </p>
            </div>
          )}
        </div>

        {/* Fleet Maintenance ROI Summary Card */}
        <div 
          onClick={() => setIsRoiModalOpen(true)}
          className="bg-slate-900 border border-emerald-500/40 hover:border-emerald-400/80 rounded-xl p-4 shadow-lg cursor-pointer transition group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition" />
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                Maintenance ROI
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-extrabold border border-emerald-500/30">
                {fleetMaintenanceRoiMultiplier.toFixed(1)}x Return
              </span>
            </div>
            
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1.5">
              <span>{fleetMaintenanceRoiMultiplier.toFixed(1)}x</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">({fleetMaintenanceCostRatio.toFixed(1)}% Ratio)</span>
            </div>

            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Generated <strong className="text-emerald-300">KES {fleetMaintenanceRoiMultiplier.toFixed(1)}</strong> rev per KES 1 maintenance
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 text-[10px]">Fleet Rev: <strong className="text-slate-200">KES {(fleetRevenueTotal/1000).toFixed(0)}k</strong></span>
            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-0.5 group-hover:underline">
              <span>View ROI</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* PO Reorder Trigger */}
        <div 
          onClick={() => setActiveTab('PURCHASE_ORDERS')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg cursor-pointer hover:border-amber-500/50 transition group flex flex-col justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>PO Reorder Trigger</span>
              <ShoppingCart className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">{poSuggestions.length} PO Suggestions</div>
          </div>
          <p className="text-[11px] text-amber-400 font-mono mt-2">KES {totalSuggestedProcurementCost.toLocaleString()} est. reorder</p>
        </div>

      </div>

      {/* COMPREHENSIVE OPERATIONAL EFFICIENCY & MAINTENANCE SPEND VS BUDGET SUMMARY CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden ring-1 ring-slate-800/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-950/40">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white tracking-tight">
                  Fleet Operational Efficiency & Maintenance Spend Tracker
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{fleetAvailabilityPercent >= 90 ? 'Optimal Operational Health' : 'Moderate Attention Needed'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of maintenance budget execution, parts vs labor cost allocations, and fleet vehicle downtime turnaround.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBudgetEditorOpen(!isBudgetEditorOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBudgetEditorOpen ? 'Close Budget Tool' : 'Configure Budget'}</span>
            </button>
            <button
              onClick={() => setActiveTab('ROI_GAUGE')}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ROI Analytics</span>
            </button>
          </div>
        </div>

        {/* Budget Editor Inline Panel (if open) */}
        {isBudgetEditorOpen && (
          <div className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-indigo-400" />
                <span>Adjust Monthly Fleet Maintenance Target Budget</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                Current Target: <strong className="text-emerald-400">KES {monthlyMaintenanceBudgetKes.toLocaleString()}</strong>
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
              {[300000, 450000, 600000, 800000, 1000000].map(val => (
                <button
                  key={`preset-b-${val}`}
                  onClick={() => {
                    setMonthlyMaintenanceBudgetKes(val);
                    setCustomBudgetString(String(val));
                    toast.success(`Target Maintenance Budget set to KES ${val.toLocaleString()}`);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    monthlyMaintenanceBudgetKes === val
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  KES {(val / 1000).toFixed(0)}k
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">KES</span>
                <input
                  type="number"
                  value={customBudgetString}
                  onChange={(e) => setCustomBudgetString(e.target.value)}
                  placeholder="Enter custom budget..."
                  className="w-full pl-12 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => {
                  const num = Number(customBudgetString);
                  if (num > 0) {
                    setMonthlyMaintenanceBudgetKes(num);
                    setIsBudgetEditorOpen(false);
                    toast.success(`Maintenance budget updated to KES ${num.toLocaleString()}`);
                  }
                }}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer"
              >
                Apply Custom Budget
              </button>
            </div>
          </div>
        )}

        {/* 2-Pillar Analytical Layout: [Spend vs Budget with Category Breakdown Tooltips] | [Downtime & Operational Efficiency] */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* PILLAR 1: TOTAL MAINTENANCE SPEND VS BUDGET & INTERACTIVE CATEGORY BREAKDOWN */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-4 relative">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Maintenance Spend vs Budget</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono border border-slate-700">
                        Interactive Breakdown
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Hover over categories or segments for itemized cost breakdown</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBudgetEditorOpen(!isBudgetEditorOpen)}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono transition cursor-pointer flex items-center gap-1"
                    title="Edit Monthly Budget Target"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                    <span>Edit Target</span>
                  </button>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    isOverBudget 
                      ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' 
                      : budgetUtilizationPercent > 80 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {isOverBudget 
                      ? `Over Budget (${budgetUtilizationPercent.toFixed(1)}%)` 
                      : `${budgetUtilizationPercent.toFixed(1)}% Utilized`}
                  </span>
                </div>
              </div>

              {/* Main Spend & Budget Numbers */}
              <div className="mt-3.5 flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Total Maintenance Spend</span>
                  <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-2">
                    <span>KES {totalMaintenanceSpent.toLocaleString()}</span>
                    <span className="text-xs font-normal text-slate-400 font-mono">
                      (KES {(avgCostPerVehicle / 1000).toFixed(1)}k / veh)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Monthly Target Budget</span>
                  <div className="text-lg font-bold text-slate-300 font-mono">
                    KES {monthlyMaintenanceBudgetKes.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Interactive Multi-Segment Progress Bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={isOverBudget ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {isOverBudget ? (
                      `+KES ${Math.abs(budgetVarianceKes).toLocaleString()} Overrun`
                    ) : (
                      `KES ${budgetVarianceKes.toLocaleString()} Remaining Headroom`
                    )}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {budgetUtilizationPercent.toFixed(1)}% of KES {(monthlyMaintenanceBudgetKes / 1000).toFixed(0)}k cap
                  </span>
                </div>

                {/* Multi-Segment Color-Coded Progress Track with Segment Tooltip Triggers */}
                <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative flex cursor-pointer p-0.5">
                  {/* 80% Caution Guideline Marker */}
                  <div 
                    className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-amber-400/80 z-20 pointer-events-none" 
                    title="80% Caution Threshold" 
                  />

                  {/* Multi-segment breakdown fills */}
                  {totalMaintenanceSpent > 0 ? (
                    categorySpendBreakdown.map((cat) => {
                      const segmentWidth = Math.max(2, (cat.amountKes / (monthlyMaintenanceBudgetKes || 1)) * 100);
                      const isHovered = activeCategoryTooltipKey === cat.key;
                      return (
                        <div
                          key={cat.key}
                          onMouseEnter={() => setActiveCategoryTooltipKey(cat.key)}
                          onMouseLeave={() => setActiveCategoryTooltipKey(null)}
                          className={`h-full transition-all duration-300 relative group/seg ${
                            isHovered ? 'brightness-125 scale-y-110 z-10' : 'opacity-90'
                          }`}
                          style={{
                            width: `${segmentWidth}%`,
                            backgroundColor: cat.colorHex
                          }}
                        >
                          <div className="w-full h-full border-r border-slate-950/40" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full bg-slate-800 rounded-full" />
                  )}
                </div>

                {/* Category Legend Micro-Row */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 flex-wrap gap-1">
                  {categorySpendBreakdown.map(cat => (
                    <div 
                      key={cat.key}
                      onMouseEnter={() => setActiveCategoryTooltipKey(cat.key)}
                      onMouseLeave={() => setActiveCategoryTooltipKey(null)}
                      className={`flex items-center gap-1 cursor-pointer transition px-1 py-0.5 rounded ${
                        activeCategoryTooltipKey === cat.key ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                      <span>{cat.shortName} ({cat.percentOfTotal}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Category Hover Cards (Parts, Labor, Lubricants, Tires, Electrical) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Spend Breakdown by Category (Hover for details)
                </span>
                <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-mono">
                  <Info className="w-3 h-3" />
                  Live Work Order Telematics
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 pt-1 border-t border-slate-800/80">
                {categorySpendBreakdown.map((cat) => {
                  const isHovered = activeCategoryTooltipKey === cat.key;
                  
                  return (
                    <div
                      key={cat.key}
                      onMouseEnter={() => setActiveCategoryTooltipKey(cat.key)}
                      onMouseLeave={() => setActiveCategoryTooltipKey(null)}
                      onClick={() => setActiveCategoryTooltipKey(activeCategoryTooltipKey === cat.key ? null : cat.key)}
                      className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer relative group flex flex-col justify-between ${
                        isHovered 
                          ? `${cat.bgColor} ${cat.borderColor} shadow-lg shadow-black/40 scale-[1.02] z-20` 
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-300 truncate block">
                            {cat.shortName}
                          </span>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.colorHex }} />
                        </div>
                        <div className="text-xs font-mono font-bold text-white mt-1">
                          KES {(cat.amountKes / 1000).toFixed(cat.amountKes >= 10000 ? 0 : 1)}k
                        </div>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>{cat.percentOfTotal}%</span>
                        <span className={cat.budgetUtilizationPercent > 100 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                          {cat.budgetUtilizationPercent.toFixed(0)}% bdgt
                        </span>
                      </div>

                      {/* Interactive Floating Tooltip Popover for this Category */}
                      {isHovered && (
                        <div 
                          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 sm:w-80 bg-slate-900/98 backdrop-blur-2xl border border-indigo-500/40 rounded-xl p-3.5 shadow-2xl shadow-black/90 pointer-events-auto z-50 text-left animate-in fade-in zoom-in-95 duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Tooltip Header */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="p-1.5 rounded-md"
                                style={{ backgroundColor: `${cat.colorHex}20`, color: cat.colorHex }}
                              >
                                {cat.key === 'parts' && <Package className="w-3.5 h-3.5" />}
                                {cat.key === 'labor' && <Wrench className="w-3.5 h-3.5" />}
                                {cat.key === 'lubricants' && <Droplets className="w-3.5 h-3.5" />}
                                {cat.key === 'tires' && <Disc className="w-3.5 h-3.5" />}
                                {cat.key === 'electrical' && <Zap className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white">{cat.name}</h4>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {cat.itemizedList.length} line item{cat.itemizedList.length === 1 ? '' : 's'} recorded
                                </span>
                              </div>
                            </div>

                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                              {cat.percentOfTotal}% of Spend
                            </span>
                          </div>

                          {/* Budget & Spend Gauge */}
                          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 mb-2.5 space-y-1.5">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-slate-400">Category Spend:</span>
                              <strong className="text-white">KES {cat.amountKes.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-slate-400">Category Budget Cap:</span>
                              <span className="text-slate-300">KES {cat.budgetAllocKes.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className={`h-full rounded-full ${
                                  cat.budgetUtilizationPercent > 100 ? 'bg-red-500' : 'bg-gradient-to-r ' + cat.barGradient
                                }`}
                                style={{ width: `${Math.min(100, cat.budgetUtilizationPercent)}%` }}
                              />
                            </div>
                          </div>

                          {/* Itemized Spend Breakdown Table */}
                          <div className="space-y-1.5 mb-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Itemized Breakdown:
                            </span>
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/50">
                              {cat.itemizedList.map((item, idx) => (
                                <div key={idx} className="pt-1 first:pt-0 flex items-start justify-between gap-2 text-[11px]">
                                  <div className="flex-1">
                                    <div className="text-slate-200 font-medium leading-tight">
                                      {item.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {item.quantity} units @ KES {item.unitCostKes.toLocaleString()} &bull; {item.detail}
                                    </div>
                                  </div>
                                  <div className="font-mono font-bold text-white whitespace-nowrap">
                                    KES {item.totalCostKes.toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Insight & Recommendation Footer */}
                          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 bg-slate-950/40 p-1.5 rounded flex items-start gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>{cat.operationalInsight}</span>
                          </div>

                          {/* Tooltip Arrow Pointer */}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PILLAR 2: AVERAGE DOWNTIME PER VEHICLE & OPERATIONAL EFFICIENCY */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">Average Downtime & Availability</span>
                    <p className="text-[11px] text-slate-400">Fleet operational uptime & repair duration</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-indigo-500/20 text-indigo-300 border-indigo-500/40">
                  {fleetAvailabilityPercent.toFixed(1)}% Fleet Uptime
                </span>
              </div>

              {/* Main Downtime & Availability Numbers */}
              <div className="mt-3.5 flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Avg Downtime per Vehicle</span>
                  <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1.5">
                    <span>{avgDowntimeHoursPerVehicle.toFixed(1)} hrs</span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      (~{avgDowntimeDaysPerVehicle.toFixed(2)} days/veh)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Fleet Availability</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {fleetSize - vehiclesInMaintenanceCount} / {fleetSize} Active
                  </div>
                </div>
              </div>

              {/* Fleet Availability Visual Progress */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-indigo-300 font-bold">
                    {vehiclesInMaintenanceCount === 0 
                      ? '100% Fleet In-Service (Zero Offline)' 
                      : `${vehiclesInMaintenanceCount} Vehicle${vehiclesInMaintenanceCount === 1 ? '' : 's'} in Maintenance Workshop`}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {fleetAvailabilityPercent.toFixed(1)}% Ready
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${fleetAvailabilityPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Operational Efficiency Sub-Cards */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Fleet Downtime</span>
                <span className="text-xs font-mono font-bold text-white">{totalFleetDowntimeHours.toFixed(1)} hrs</span>
                <span className="text-[10px] text-slate-500 block">{workOrders.length} work orders</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg Turnaround</span>
                <span className="text-xs font-mono font-bold text-amber-300">{avgTurnaroundHoursPerOrder.toFixed(1)} hrs</span>
                <span className="text-[10px] text-slate-500 block">per completed repair</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cost / Downtime Hr</span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  KES {costPerDowntimeHour > 0 ? costPerDowntimeHour.toFixed(0) : '0'}
                </span>
                <span className="text-[10px] text-slate-500 block">intensity index</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-xl gap-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('SCHEDULER')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
            activeTab === 'SCHEDULER' ? 'bg-indigo-600 text-white font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-300" />
          <span>Automated Service Scheduler</span>
          {vehiclesDueWithin500Km.length > 0 ? (
            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
              {vehiclesDueWithin500Km.length} Due &le;500km
            </span>
          ) : (
            <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-1.5 py-0.5 rounded font-mono">
              Telematics
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ROI_GAUGE')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
            activeTab === 'ROI_GAUGE' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Maintenance ROI Gauge</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
            Avoided Repairs
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CPKM_CHART')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
            activeTab === 'CPKM_CHART' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Cost-per-Kilometer (CPKM)</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
            Actual vs Projected
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ALERTS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer ${
            activeTab === 'ALERTS' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Vehicle Maintenance Alerts ({allAlerts.length})</span>
          {vehiclesDueWithin500Km.length > 0 && (
            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
              {vehiclesDueWithin500Km.length} Due &le;500km
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PURCHASE_ORDERS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'PURCHASE_ORDERS' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Automated PO Suggestions ({poSuggestions.length})</span>
          {poSuggestions.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'INVENTORY' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Spare Parts Directory ({localInventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('WORK_ORDERS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeTab === 'WORK_ORDERS' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Work Orders ({workOrders.length})</span>
        </button>
      </div>

      {/* SECTION 0: AUTOMATED MAINTENANCE SCHEDULER (ODOMETER & CALENDAR INVITES) */}
      {activeTab === 'SCHEDULER' && (
        <AutomatedMaintenanceScheduler 
          vehicles={vehicles} 
          onOpenWorkOrderModal={onOpenWorkOrderModal} 
        />
      )}

      {/* SECTION 0.5: MAINTENANCE ROI GAUGE CHART (AVOIDED REPAIRS VS PREVENTATIVE COSTS) */}
      {activeTab === 'ROI_GAUGE' && (
        <MaintenanceRoiGaugeChart 
          workOrders={workOrders}
          vehicles={vehicles}
        />
      )}

      {/* SECTION 0.8: COST-PER-KILOMETER CHART (ACTUAL VS PROJECTED BENCHMARKS) */}
      {activeTab === 'CPKM_CHART' && (
        <VehicleCostPerKmChart 
          vehicles={vehicles}
          workOrders={workOrders}
        />
      )}

      {/* SECTION 1: AUTOMATED MAINTENANCE & INSPECTION ALERTS */}
      {activeTab === 'ALERTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Automated Maintenance & Inspection Alert System</h3>
                  <span className="text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                    {allAlerts.length} Critical Trigger(s)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Pushes automated warnings when vehicles approach service mileage (&le;500 km) or NTSA inspection expiration (&le;7 days)
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  filterType === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({allAlerts.length})
              </button>
              <button
                onClick={() => setFilterType('PREDICTIVE_COMPONENT')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                  filterType === 'PREDICTIVE_COMPONENT' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Component Wear &lt;500km ({allAlerts.filter(a => a.alertType === 'PREDICTIVE_COMPONENT').length})</span>
              </button>
              <button
                onClick={() => setFilterType('SERVICE_MILEAGE')}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  filterType === 'SERVICE_MILEAGE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Service Mileage ({allAlerts.filter(a => a.alertType === 'SERVICE_MILEAGE').length})
              </button>
              <button
                onClick={() => setFilterType('NTSA_INSPECTION')}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  filterType === 'NTSA_INSPECTION' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                NTSA Inspection ({allAlerts.filter(a => a.alertType === 'NTSA_INSPECTION').length})
              </button>
              <button
                onClick={() => setFilterType('OVERDUE')}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  filterType === 'OVERDUE' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Overdue ({allAlerts.filter(a => a.severity === 'OVERDUE').length})
              </button>
            </div>
          </div>

          {/* Alerts Grid */}
          {filteredAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAlerts.map(alert => {
                const isPushed = pushedAlerts[alert.id];

                return (
                  <div 
                    key={alert.id}
                    className={`p-4 rounded-xl border transition shadow-lg relative flex flex-col justify-between space-y-3 ${
                      alert.severity === 'OVERDUE'
                        ? 'bg-red-950/30 border-red-500/50 hover:border-red-500'
                        : alert.severity === 'CRITICAL'
                        ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {alert.alertType === 'SERVICE_MILEAGE' ? (
                            <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400">
                              <Gauge className="w-4 h-4" />
                            </div>
                          ) : alert.alertType === 'PREDICTIVE_COMPONENT' ? (
                            <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400">
                              <Calendar className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-black text-white flex items-center gap-1.5">
                              {alert.alertType === 'PREDICTIVE_COMPONENT' && (
                                <AlertTriangle className="w-4 h-4 text-amber-400 inline shrink-0 animate-bounce" title="Component replacement projected within 500km!" />
                              )}
                              <span>{alert.registrationNumber}</span>
                            </span>
                            <span className="text-xs text-slate-400 block">{alert.makeModel}</span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                          alert.severity === 'OVERDUE'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                            : alert.severity === 'CRITICAL'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        }`}>
                          {alert.remainingText}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-200">{alert.title}</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{alert.details}</p>

                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Current State</span>
                          <span className="font-mono font-bold text-white">{alert.metricCurrent}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Driver Assigned</span>
                          <span className="font-semibold text-emerald-400 truncate block">{alert.assignedDriver}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handlePushNotification(alert.id)}
                        disabled={isPushed}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                          isPushed 
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 cursor-default'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {isPushed ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Notification Pushed</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5 text-amber-400" />
                            <span>Push Alert to Dashboard</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={onOpenWorkOrderModal}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Schedule Work Order</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No active alerts matching the selected category filter.
            </div>
          )}

          {/* FLEET SERVICE MILEAGE INTERVAL & TELEMATICS MONITOR TABLE (≤500 KM TRIGGER) */}
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Gauge className="w-4 h-4 text-amber-400 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-extrabold text-white">
                    Fleet Service Mileage Interval Monitor (&le;500 km Alert Trigger)
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automated telematics tracking of vehicle odometers against OEM scheduled service intervals (5,000 km intervals). Vehicles approaching within 500 km are automatically highlighted with alert badges.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setServiceMileageFilter('DUE_ONLY')}
                    className={`px-3 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      serviceMileageFilter === 'DUE_ONLY' 
                        ? 'bg-amber-500 text-slate-950 shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Approaching Due &le;500km ({vehiclesDueWithin500Km.length})</span>
                  </button>
                  <button
                    onClick={() => setServiceMileageFilter('ALL')}
                    className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                      serviceMileageFilter === 'ALL' 
                        ? 'bg-slate-800 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Vehicles ({serviceIntervalData.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Service Mileage Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-4">Vehicle & Registration</th>
                    <th className="py-3 px-4">Current Odometer</th>
                    <th className="py-3 px-4">Next Service Target</th>
                    <th className="py-3 px-4">Service Mileage Interval Gauge</th>
                    <th className="py-3 px-4">Assigned Driver</th>
                    <th className="py-3 px-4">Recommended Service Scope</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
                  {(serviceMileageFilter === 'DUE_ONLY' ? vehiclesDueWithin500Km : serviceIntervalData).map(item => {
                    const { vehicle: v, isOverdue, isCritical, isApproaching, isDueSoon } = item;

                    return (
                      <tr 
                        key={`svc-interval-row-${v.id}`} 
                        className={`hover:bg-slate-900/60 transition ${
                          isOverdue ? 'bg-red-950/20' :
                          isCritical ? 'bg-amber-950/20' :
                          isApproaching ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        {/* Vehicle Reg & Warning Badge */}
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            {isDueSoon ? (
                              <div className="relative group cursor-pointer" title={`Service Due: ${item.remainingKm} km remaining`}>
                                <div className={`p-1 rounded ${
                                  isOverdue ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-bounce' :
                                  'bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-bounce'
                                }`}>
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-white text-xs font-mono">{v.registrationNumber}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${item.badgeClass}`}>
                                  {item.badgeText}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {v.make} {v.model} • <span className="text-indigo-300">{v.category}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Odometer */}
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {item.currentOdometerKm.toLocaleString()} km
                        </td>

                        {/* Target Service Milestone */}
                        <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                          {item.targetServiceKm.toLocaleString()} km
                        </td>

                        {/* Progress Bar & Distance Remaining */}
                        <td className="py-3 px-4 min-w-[180px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className={isDueSoon ? 'font-black text-amber-400' : 'text-slate-400'}>
                                {isOverdue ? `${Math.abs(item.remainingKm)} km past target` : `${item.remainingKm} km remaining`}
                              </span>
                              <span className="text-slate-400 font-bold">{item.percentTowardsInterval}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOverdue ? 'bg-red-500 animate-pulse' :
                                  isCritical ? 'bg-amber-500 animate-pulse' :
                                  isApproaching ? 'bg-amber-400' :
                                  'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, item.percentTowardsInterval)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Assigned Driver */}
                        <td className="py-3 px-4 text-[11px]">
                          <span className="text-slate-200 font-bold">{v.assignedDriverName || 'Pool Vehicle'}</span>
                          {v.assignedDriverPhone && (
                            <span className="text-slate-400 block font-mono text-[10px]">{v.assignedDriverPhone}</span>
                          )}
                        </td>

                        {/* Service Scope */}
                        <td className="py-3 px-4 text-[11px] text-slate-300 max-w-[200px]">
                          <span className="line-clamp-2">{item.recommendedService}</span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setActiveTab('SCHEDULER')}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold transition cursor-pointer"
                              title="View in Scheduler"
                            >
                              Schedule
                            </button>
                            <button
                              onClick={onOpenWorkOrderModal}
                              className={`px-2.5 py-1 rounded text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-sm ${
                                isDueSoon 
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' 
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                              }`}
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Work Order</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(serviceMileageFilter === 'DUE_ONLY' ? vehiclesDueWithin500Km : serviceIntervalData).length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No vehicles currently approaching service mileage interval within 500 km.
                </div>
              )}
            </div>
          </div>

          {/* VEHICLE COMPONENT PREDICTIVE MAINTENANCE RADAR TABLE */}
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-extrabold text-white">
                    Vehicle Predictive Component Replacement Radar (&le;500 km Projections)
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Monitors component wear cycles (brake pads, tires, drive belt, coolant) based on current daily mileage rates. Vehicles with components due within 500km display a prominent warning icon.
                </p>
              </div>

              <div className="text-xs bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Flagged Vehicles: <strong className="text-amber-400 font-mono font-bold">{vehicles.map(v => calculateVehicleComponentPredictions(v)).filter(p => p.hasPredictiveWarning).length}</strong></span>
                </span>
              </div>
            </div>

            {/* Predictive Vehicles Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-4">Vehicle & Registration</th>
                    <th className="py-3 px-4">Current Odometer</th>
                    <th className="py-3 px-4">Daily Usage Rate</th>
                    <th className="py-3 px-4">Projected Component Replacements (&le;500km)</th>
                    <th className="py-3 px-4">Est. Cost (KES)</th>
                    <th className="py-3 px-4 text-right">Predictive Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
                  {vehicles.map(v => {
                    const pred = calculateVehicleComponentPredictions(v);
                    const { hasPredictiveWarning, warningComponents, dailyRateKm } = pred;

                    return (
                      <tr 
                        key={`pred-row-${v.id}`} 
                        className={`hover:bg-slate-900/60 transition ${
                          hasPredictiveWarning ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        {/* Vehicle Reg & Warning Icon */}
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            {hasPredictiveWarning ? (
                              <div className="relative group cursor-pointer" title="Predictive Alert: Component replacement required within 500km">
                                <div className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-bounce">
                                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                                </div>
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-white text-xs">{v.registrationNumber}</span>
                                {hasPredictiveWarning && (
                                  <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/40">
                                    ⚠️ {warningComponents.length} DUE &lt;500KM
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block">{v.make} {v.model} ({v.type})</span>
                            </div>
                          </div>
                        </td>

                        {/* Odometer */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          {v.odometerKm.toLocaleString()} km
                        </td>

                        {/* Daily Rate */}
                        <td className="py-3 px-4 font-mono text-slate-300">
                          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-[11px]">
                            {dailyRateKm} km / day
                          </span>
                        </td>

                        {/* Component Replacement Projections */}
                        <td className="py-3 px-4">
                          {warningComponents.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {warningComponents.map(c => (
                                <span 
                                  key={c.componentId}
                                  className="bg-amber-950/80 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1"
                                  title={`${c.componentName}: ${c.remainingKm}km left (~${c.projectedDaysRemaining} days)`}
                                >
                                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>{c.componentName.split('(')[0].trim()}:</span>
                                  <strong className="text-amber-300">{c.remainingKm} km</strong>
                                  <span className="text-slate-400">({c.projectedDaysRemaining}d)</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>All components healthy (&gt; 500km)</span>
                            </span>
                          )}
                        </td>

                        {/* Estimated Replacement Cost */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          {warningComponents.length > 0 ? (
                            <span className="text-amber-400">
                              KES {warningComponents.reduce((sum, c) => sum + c.estimatedCostKes, 0).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={onOpenWorkOrderModal}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                              hasPredictiveWarning
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>{hasPredictiveWarning ? 'Schedule Work Order' : 'Inspection'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: AUTOMATED PURCHASE ORDER SUGGESTION ENGINE */}
      {activeTab === 'PURCHASE_ORDERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-xl">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">
                    Automated Purchase Order Suggestion Engine
                  </h3>
                  <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                    Min Stock Reorder Trigger Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically generates purchase order suggestions when spare part stock drops below minimum threshold
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleBatchApproveAll}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Batch Approve All Suggestions</span>
              </button>
            </div>
          </div>

          {/* PO Summary Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Low-Stock Items Triggered</span>
                <span className="text-lg font-black text-white font-mono">{lowStockParts.length} Parts</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Total Reorder Investment</span>
                <span className="text-lg font-black text-emerald-400 font-mono">KES {totalSuggestedProcurementCost.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Suppliers Contacted</span>
                <span className="text-lg font-black text-blue-300 font-mono">
                  {new Set(poSuggestions.map(s => s.supplierName)).size} Suppliers
                </span>
              </div>
            </div>
          </div>

          {/* Purchase Order Suggestions List */}
          {poSuggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {poSuggestions.map(po => (
                <div 
                  key={po.id}
                  className={`p-4 rounded-xl border transition shadow-lg flex flex-col justify-between space-y-4 ${
                    po.urgency === 'CRITICAL' ? 'bg-red-950/20 border-red-500/40 hover:border-red-500' :
                    po.urgency === 'HIGH' ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500' :
                    'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400">{po.poNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            po.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            po.status === 'Sent to Supplier' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {po.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{po.partName}</h4>
                        <p className="text-[11px] text-slate-400">Part #: <span className="font-mono text-slate-300">{po.partNumber}</span></p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        po.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' :
                        po.urgency === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {po.urgency} Stockout Risk
                      </span>
                    </div>

                    {/* Stock Meter & Supplier */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Stock</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-mono font-bold text-red-400 text-sm">{po.currentStock}</span>
                          <span className="text-[11px] text-slate-400">/ min {po.minimumStock}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Vendor / Supplier</span>
                        <span className="font-semibold text-white truncate block mt-0.5">{po.supplierName}</span>
                      </div>
                    </div>

                    {/* Quantity Stepper & Cost Calculator */}
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold">Suggested Reorder Qty:</span>
                        
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                          <button
                            onClick={() => handleUpdateSuggestedQuantity(po.id, -5)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                            title="Decrease quantity by 5"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <span className="font-mono font-bold text-amber-400 px-2 text-sm">
                            {po.suggestedQuantity}
                          </span>

                          <button
                            onClick={() => handleUpdateSuggestedQuantity(po.id, 5)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                            title="Increase quantity by 5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Unit Price: <span className="font-mono text-slate-200">KES {po.unitCostKes.toLocaleString()}</span></span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          Total: KES {po.totalEstimatedCostKes.toLocaleString()}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenPoModal(po)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition border border-slate-700 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Inspect PO</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {po.status === 'Suggested' && (
                        <button
                          onClick={() => handleApprovePO(po.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition shadow-sm flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {po.status !== 'Sent to Supplier' && (
                        <button
                          onClick={() => handleSendToSupplier(po.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-xs transition shadow-sm flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send PO</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleReceiveRestock(po.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition shadow-sm flex items-center gap-1"
                        title="Simulate shipment arrival & restock inventory"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-white text-sm">All Spare Parts Stocked Above Minimum Threshold!</p>
              <p className="text-slate-500 max-w-md mx-auto">
                Automated PO trigger is monitoring inventory levels. When stock drops below minimum threshold, a purchase order suggestion will be generated instantly.
              </p>
            </div>
          )}

        </div>
      )}

      {/* SECTION 3: SPARE PARTS DIRECTORY */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Spare Parts Master Inventory Directory</h3>
            <span className="text-xs text-slate-400 font-mono">{localInventory.length} total SKUs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Part Name / Number</th>
                  <th className="px-4 py-3 font-semibold">Location Bin</th>
                  <th className="px-4 py-3 font-semibold">Compatible Vehicles</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Stock Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {localInventory.map(part => {
                  const isLow = part.quantityInStock <= part.minimumStockLevel;

                  return (
                    <tr key={part.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <span className="font-bold text-white block">{part.partName}</span>
                        <span className="font-mono text-emerald-400 text-[11px]">{part.partNumber}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{part.locationBin}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {part.compatibleVehicleTypes.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{part.supplierName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                            {part.quantityInStock} units
                          </span>
                          {isLow && (
                            <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30">
                              Low (Min {part.minimumStockLevel})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        KES {part.unitCostKes.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: WORKSHOP WORK ORDERS TABLE */}
      {activeTab === 'WORK_ORDERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          
          {/* Header Controls & Filters */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Workshop Maintenance Work Orders</h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {filteredWorkOrders.length} Records
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Structured, print-ready work order documentation for fleet repairs, inspections & overhauls
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, vehicle, workshop..."
                  value={workOrderSearchQuery}
                  onChange={(e) => setWorkOrderSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {(['ALL', 'Completed', 'In Progress', 'Scheduled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setWorkOrderStatusFilter(st)}
                    className={`px-2.5 py-1 rounded font-bold transition cursor-pointer whitespace-nowrap ${
                      workOrderStatusFilter === st
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Create Work Order Action */}
              <button
                onClick={onOpenWorkOrderModal}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Work Order</span>
              </button>
            </div>
          </div>

          {/* Work Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Service Type</th>
                  <th className="px-4 py-3 font-semibold">Workshop / Mechanic</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Cost</th>
                  <th className="px-4 py-3 font-semibold text-center">Print / Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No maintenance work orders found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map(w => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">{w.workOrderCode}</td>
                      <td className="px-4 py-3 font-bold text-white">{w.vehicleReg} ({w.vehicleModel})</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{w.serviceType}</td>
                      <td className="px-4 py-3 text-slate-400">📍 {w.workshopName} ({w.mechanicName})</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.priority === 'Emergency' ? 'bg-red-500/20 text-red-400' :
                          w.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {w.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
                          w.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        KES {w.totalCostKes.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadWorkOrderPdf(w)}
                            className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Download structured, print-ready PDF work order"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Download PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedWorkOrderForModal(w)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                            title="View Full Work Order Record"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WORK ORDER INSPECTOR & PRINTABLE PREVIEW MODAL */}
      {selectedWorkOrderForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-base">Work Order #{selectedWorkOrderForModal.workOrderCode}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedWorkOrderForModal.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      selectedWorkOrderForModal.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {selectedWorkOrderForModal.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedWorkOrderForModal.vehicleReg} ({selectedWorkOrderForModal.vehicleModel}) • {selectedWorkOrderForModal.serviceType}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorkOrderForModal(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Document Preview */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
              
              {/* Document Header Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-black text-emerald-400 text-xs tracking-wider uppercase">
                    GreenShift Fleet Command Official Maintenance Audit Record
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Priority: <strong className="text-amber-400">{selectedWorkOrderForModal.priority}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Vehicle Reg</span>
                    <span className="font-bold text-white block mt-0.5">{selectedWorkOrderForModal.vehicleReg}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Odometer at Service</span>
                    <span className="font-mono text-slate-200 block mt-0.5">
                      {selectedWorkOrderForModal.odometerKmAtService ? selectedWorkOrderForModal.odometerKmAtService.toLocaleString() : 'N/A'} km
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Workshop</span>
                    <span className="font-semibold text-white truncate block mt-0.5">{selectedWorkOrderForModal.workshopName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Lead Technician</span>
                    <span className="font-semibold text-slate-200 block mt-0.5">{selectedWorkOrderForModal.mechanicName}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Parts Used */}
              <div className="space-y-2">
                <span className="font-extrabold text-slate-200 uppercase tracking-wider block text-[11px]">
                  1. Itemized Spare Parts & Components
                </span>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Part Description</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Qty</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Unit Price</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(!selectedWorkOrderForModal.partsUsed || selectedWorkOrderForModal.partsUsed.length === 0) ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                            No spare parts billed for this service work order.
                          </td>
                        </tr>
                      ) : (
                        selectedWorkOrderForModal.partsUsed.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="px-4 py-2.5 font-semibold text-white">{p.partName}</td>
                            <td className="px-4 py-2.5 text-center font-mono text-slate-300">{p.quantity}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-400">KES {p.unitCostKes.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                              KES {(p.quantity * p.unitCostKes).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cost Summary Breakdown Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Downtime Duration</span>
                  <span className="text-xs text-slate-300 font-mono">
                    {selectedWorkOrderForModal.downtimeHours ? `${selectedWorkOrderForModal.downtimeHours} Hours Total Workshop Downtime` : 'No downtime logged'}
                  </span>
                </div>

                <div className="space-y-1 text-right self-end sm:self-auto">
                  <span className="text-[10px] text-slate-400 block">Labor Fee: KES {selectedWorkOrderForModal.laborCostKes.toLocaleString()}</span>
                  <span className="text-base font-black text-emerald-400 font-mono block">
                    Total: KES {selectedWorkOrderForModal.totalCostKes.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Technician Observations */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">2. Technician Observations & Service Notes</span>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {selectedWorkOrderForModal.notes || 'Routine vehicle maintenance service completed according to GreenShift Fleet technical standards.'}
                </p>
              </div>

            </div>

            {/* Modal Footer with PDF Download Button */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Dates: {selectedWorkOrderForModal.startDate} {selectedWorkOrderForModal.completionDate ? `to ${selectedWorkOrderForModal.completionDate}` : ''}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedWorkOrderForModal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold rounded-lg text-xs transition border border-slate-800 cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadWorkOrderPdf(selectedWorkOrderForModal)}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition shadow-lg shadow-emerald-950/60 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Download Print-Ready PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Official Purchase Order Inspector Modal */}
      <PurchaseOrderModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        purchaseOrder={selectedPoForModal}
        onApprovePO={handleApprovePO}
        onSendToSupplier={handleSendToSupplier}
      />

      {/* VEHICLE MAINTENANCE ROI BREAKDOWN MODAL */}
      {isRoiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                    <span>Fleet Maintenance ROI & Vehicle Profitability Audit</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                      {fleetMaintenanceRoiMultiplier.toFixed(1)}x Fleet ROI
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Compares total workshop maintenance costs against vehicle revenue generated across the active fleet
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsRoiModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Fleet Summary Overview Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Revenue Generated</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  KES {fleetRevenueTotal.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Across {vehicles.length} active fleet vehicles</span>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Maintenance Spent</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  KES {fleetMaintenanceCost.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Work orders, labor & spare parts</span>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Maintenance Cost Ratio</span>
                <span className="text-lg font-black text-white font-mono flex items-center gap-1.5">
                  <span>{fleetMaintenanceCostRatio.toFixed(2)}%</span>
                  <span className="text-xs text-emerald-400 font-normal">({fleetMaintenanceRoiMultiplier.toFixed(1)}x ROI)</span>
                </span>
                <span className="text-[10px] text-emerald-400 block font-medium">
                  +{fleetNetRoiPercent.toLocaleString()}% Net Revenue Return
                </span>
              </div>
            </div>

            {/* Preventative Maintenance ROI Gauge Chart */}
            <MaintenanceRoiGaugeChart workOrders={workOrders} vehicles={vehicles} />

            {/* Vehicle ROI Breakdown Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Vehicle-by-Vehicle ROI Performance</span>
                </h4>
                <span className="text-[11px] text-slate-400">{vehicles.length} Vehicles Audited</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Vehicle</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold text-right">Revenue Generated</th>
                      <th className="px-4 py-3 font-semibold text-right">Maintenance Spent</th>
                      <th className="px-4 py-3 font-semibold text-center">Cost Ratio (% Rev)</th>
                      <th className="px-4 py-3 font-semibold text-center">ROI Multiplier</th>
                      <th className="px-4 py-3 font-semibold text-right">Net Return</th>
                      <th className="px-4 py-3 font-semibold text-center">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                    {vehicleRoiMetrics.map(v => (
                      <tr key={v.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{v.registrationNumber}</div>
                          <div className="text-[11px] text-slate-400">{v.make} {v.model}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            v.category === 'Electric' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {v.type}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          KES {v.revenue.toLocaleString()}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">
                          KES {v.maintenanceCost.toLocaleString()}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-bold text-white bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {v.costRatioPercent}%
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-black text-emerald-300">
                            {v.roiMultiplier}x
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                          KES {v.netProfit.toLocaleString()}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${v.badgeClass}`}>
                            {v.performanceLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Strategic Insights Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-white">Fleet Efficiency Strategic Takeaway</h5>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Electric vehicles average a <strong>1.85% maintenance cost ratio</strong> compared to <strong>4.21%</strong> for petrol vehicles, yielding 2.3x higher maintenance ROI.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  toast.success('Maintenance ROI audit report exported!');
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg transition text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Export ROI Audit</span>
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsRoiModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Close Audit Window
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

