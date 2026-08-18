import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Fuel, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Search, 
  RefreshCw, 
  Radio, 
  Lock, 
  Unlock, 
  Plus, 
  ArrowRight, 
  Filter, 
  Clock, 
  Activity, 
  Sliders, 
  Eye, 
  BellRing,
  BatteryWarning,
  TrendingDown,
  PhoneCall,
  MessageSquare,
  Check,
  XCircle,
  RotateCcw,
  HelpCircle,
  FileCheck2,
  AlertOctagon,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { Vehicle, Driver, IncidentReport, FuelTransaction } from '../types';
import { toast } from 'sonner';

export type AnomalyWorkflowStatus = 'Active Anomaly' | 'Incident Auto-Created' | 'Investigating' | 'Resolved' | 'False Positive';

export interface SecurityAnomaly {
  id: string;
  anomalyCode: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleModel: string;
  vehicleType: string;
  category: 'Fuel' | 'EV Battery' | 'Geofence / Security';
  driverId?: string;
  driverName: string;
  driverPhone: string;
  severity: 'Critical' | 'Severe' | 'Moderate';
  anomalyTitle: string;
  telemetryMetric: string;
  expectedValue: string;
  actualObserved: string;
  timestamp: string;
  locationName: string;
  lat: number;
  lng: number;
  status: AnomalyWorkflowStatus;
  autoIncidentId?: string;
  financialRiskKes: number;
  aiDiagnosticSummary: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface SecurityAlertsDashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  incidents: IncidentReport[];
  fuelLogs: FuelTransaction[];
  onAddIncident: (newIncident: IncidentReport) => void;
  onNavigateTab: (tab: any) => void;
  onOpenMessageComposer?: (driver: Driver) => void;
}

export type MainTabType = 'active' | 'resolved' | 'all';

export const SecurityAlertsDashboard: React.FC<SecurityAlertsDashboardProps> = ({
  vehicles,
  drivers,
  incidents,
  fuelLogs,
  onAddIncident,
  onNavigateTab,
  onOpenMessageComposer
}) => {
  // Primary Workflow Tab State
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<MainTabType>('active');
  
  // Search & Sub-filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubFilter, setActiveSubFilter] = useState<'all' | 'critical' | 'investigating' | 'incident_created'>('all');
  const [resolvedSubFilter, setResolvedSubFilter] = useState<'all' | 'resolved' | 'false_positive'>('all');

  // Configurable Security Sensitivity Thresholds
  const [fuelDropThreshold, setFuelDropThreshold] = useState<number>(15); // % or Liters drop
  const [batteryDischargeThreshold, setBatteryDischargeThreshold] = useState<number>(20); // % SoC drop per 5km
  const [thermalTempThreshold, setThermalTempThreshold] = useState<number>(50); // °C

  const [autoCreateIncident, setAutoCreateIncident] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Fuel' | 'EV Battery' | 'Geofence / Security'>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'Severe' | 'Moderate'>('All');
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);

  // Resolution Notes Modal State
  const [resolvingAnomaly, setResolvingAnomaly] = useState<SecurityAnomaly | null>(null);
  const [resolutionNoteInput, setResolutionNoteInput] = useState<string>('');
  const [resolutionActionType, setResolutionActionType] = useState<'Resolved' | 'False Positive'>('Resolved');

  // Immobilized vehicles tracking
  const [immobilizedVehicles, setImmobilizedVehicles] = useState<Record<string, boolean>>({
    'v-3': false
  });

  // Sample seed anomalies
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([
    {
      id: 'anom-1',
      anomalyCode: 'ANOM-2026-901',
      vehicleId: 'v-3',
      vehicleReg: 'KCY 882P',
      vehicleModel: 'TVS HLX 150 Petrol',
      vehicleType: 'Fuel Motorcycle',
      category: 'Fuel',
      driverId: 'd-3',
      driverName: 'Brian Kipchirchir',
      driverPhone: '+254733112233',
      severity: 'Critical',
      anomalyTitle: 'Rapid Fuel Siphoning & Sudden Fuel Level Drop',
      telemetryMetric: '14.2 Liters dropped in 8 mins while Engine OFF',
      expectedValue: '0.0 L/hr idle loss',
      actualObserved: '106.5 L/hr drop rate',
      timestamp: '12 mins ago (Today 14:32 EAT)',
      locationName: 'Moi Avenue Fuel Rest Stop, Mombasa',
      lat: -4.0435,
      lng: 39.6682,
      status: 'Active Anomaly',
      financialRiskKes: 2800,
      aiDiagnosticSummary: 'Fuel level dropped from 16.0L to 1.8L while vehicle was parked offline. High probability of manual siphoning or fuel tank drain plug breach.'
    },
    {
      id: 'anom-2',
      anomalyCode: 'ANOM-2026-902',
      vehicleId: 'v-2',
      vehicleReg: 'KDH 109G',
      vehicleModel: 'Spiro Equator Bike',
      vehicleType: 'Electric Motorcycle',
      category: 'EV Battery',
      driverId: 'd-2',
      driverName: 'Wanjiku Mwangi',
      driverPhone: '+254722987654',
      severity: 'Severe',
      anomalyTitle: 'Sudden Battery SoC Discharge Spike & Thermal Elevation',
      telemetryMetric: '32% SoC discharge over 3.2 km distance',
      expectedValue: '2.5% SoC per 3.2 km',
      actualObserved: '32.0% SoC drop (12.8x normal rate)',
      timestamp: '28 mins ago (Today 14:16 EAT)',
      locationName: 'Argwings Kodhek Rd, Kilimani, Nairobi',
      lat: -1.2921,
      lng: 36.8219,
      status: 'Active Anomaly',
      financialRiskKes: 14500,
      aiDiagnosticSummary: 'Extreme rapid battery depletion detected alongside cell temperature spike to 54.8°C. Potential short circuit, cell isolation fault, or unauthorized high-load inverter bypass.'
    },
    {
      id: 'anom-3',
      anomalyCode: 'ANOM-2026-903',
      vehicleId: 'v-5',
      vehicleReg: 'KCB 910X',
      vehicleModel: 'Toyota Fielder Petrol',
      vehicleType: 'Petrol Car',
      category: 'Fuel',
      driverId: 'd-5',
      driverName: 'Mercy Chebet',
      driverPhone: '+254722114455',
      severity: 'Moderate',
      anomalyTitle: 'Fuel Efficiency Anomaly (-40.3% Historical Deviation)',
      telemetryMetric: '21.5 km/L calculated vs 36.0 km/L fleet baseline',
      expectedValue: '36.0 km/L avg',
      actualObserved: '21.5 km/L (-40.3% drop)',
      timestamp: '2 hours ago (Today 12:40 EAT)',
      locationName: 'TotalEnergies Kilimani Station',
      lat: -1.2880,
      lng: 36.7880,
      status: 'Incident Auto-Created',
      autoIncidentId: 'INC-SEC-8802',
      financialRiskKes: 4200,
      aiDiagnosticSummary: 'Consecutive fuel purchases recorded with abnormal consumption. Telematics indicates potential off-market fuel resale or injector leakage.'
    },
    {
      id: 'anom-4',
      anomalyCode: 'ANOM-2026-904',
      vehicleId: 'v-1',
      vehicleReg: 'KMG 482E',
      vehicleModel: 'Roam Air EV Boda',
      vehicleType: 'Electric Motorcycle',
      category: 'EV Battery',
      driverId: 'd-1',
      driverName: 'Juma Omondi',
      driverPhone: '+254712345678',
      severity: 'Moderate',
      anomalyTitle: 'Unregistered Pack Removal & Cell Voltage Imbalance',
      telemetryMetric: 'BMS disconnected for 4.5 mins during active ride',
      expectedValue: 'Continuous BMS Heartbeat',
      actualObserved: '4.5m Heartbeat Gap + 85mV cell imbalance',
      timestamp: '4 hours ago (Today 10:15 EAT)',
      locationName: 'Mwai Kibaki Way, Westlands, Nairobi',
      lat: -1.286389,
      lng: 36.817223,
      status: 'Resolved',
      financialRiskKes: 8000,
      aiDiagnosticSummary: 'Battery pack connector unlatched briefly during operation. Inspection revealed loose wiring harness latch, now secured by technician.',
      resolutionNotes: 'Technician Kamau secured battery bracket clip and cleared BMS latch fault code.',
      resolvedAt: 'Today 11:30 EAT',
      resolvedBy: 'Duty Dispatcher'
    },
    {
      id: 'anom-5',
      anomalyCode: 'ANOM-2026-905',
      vehicleId: 'v-4',
      vehicleReg: 'KDD 301A',
      vehicleModel: 'BYD Atto 3 EV Car',
      vehicleType: 'Electric Car',
      category: 'EV Battery',
      driverId: 'd-4',
      driverName: 'Erick Mutua',
      driverPhone: '+254722889900',
      severity: 'Moderate',
      anomalyTitle: 'High Ambient Temperature BMS Throttling Alert',
      telemetryMetric: 'Thermal probe 47.5°C during Fast Charge cycle',
      expectedValue: '<45.0°C ceiling',
      actualObserved: '47.5°C temporary rise',
      timestamp: 'Yesterday 17:10 EAT',
      locationName: 'GreenShift EV Superhub, Upper Hill',
      lat: -1.2985,
      lng: 36.8180,
      status: 'False Positive',
      financialRiskKes: 0,
      aiDiagnosticSummary: 'Active liquid cooling activated normally during 60kW DC fast charging on a hot afternoon. No cell degradation detected.',
      resolutionNotes: 'Confirmed normal cooling loop cycle under direct sunlight ambient load. Verified sensor calibrated.',
      resolvedAt: 'Yesterday 17:45 EAT',
      resolvedBy: 'Security Lead'
    }
  ]);

  // Trigger auto-incident creation
  const handleTriggerIncidentForAnomaly = (anomaly: SecurityAnomaly) => {
    const incCode = `INC-SEC-${Math.floor(1000 + Math.random() * 9000)}`;
    const isFuel = anomaly.category === 'Fuel';
    
    const newIncident: IncidentReport = {
      id: `inc-${Date.now()}`,
      incidentCode: incCode,
      vehicleId: anomaly.vehicleId,
      vehicleReg: anomaly.vehicleReg,
      driverId: anomaly.driverId || 'd-unk',
      driverName: anomaly.driverName,
      driverPhone: anomaly.driverPhone,
      incidentType: isFuel ? 'Theft Alert' : 'Breakdown',
      severity: anomaly.severity === 'Critical' ? 'Critical SOS' : anomaly.severity === 'Severe' ? 'Severe' : 'Moderate',
      locationName: anomaly.locationName,
      lat: anomaly.lat,
      lng: anomaly.lng,
      timestamp: new Date().toLocaleString() + ' EAT',
      description: `AUTOMATED SECURITY ALERT [${anomaly.anomalyCode}]: ${anomaly.anomalyTitle}. Observed: ${anomaly.telemetryMetric} (Expected: ${anomaly.expectedValue}). ${anomaly.aiDiagnosticSummary}`,
      status: 'Open',
      assignedOfficer: 'Automated Security AI System'
    };

    onAddIncident(newIncident);

    // Update anomaly status locally
    setAnomalies(prev => prev.map(a => a.id === anomaly.id ? {
      ...a,
      status: 'Incident Auto-Created',
      autoIncidentId: incCode
    } : a));

    toast.error(`Security Incident ${incCode} Auto-Dispatched!`, {
      description: `Logged in Incident Report System for ${anomaly.vehicleReg} (${anomaly.driverName}). Dispatch team notified.`,
      duration: 6000
    });
  };

  // Run Real-time Fleet Telemetry Scan
  const handleRunFleetScan = () => {
    setIsScanning(true);
    toast.info('Scanning live IoT telemetry across all fleet vehicles...', {
      description: 'Checking fuel pressure sensors, battery BMS telemetry, thermal probes, and geofence boundaries.',
      duration: 3000
    });

    setTimeout(() => {
      setIsScanning(false);
      
      // Pick a random vehicle
      const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)] || vehicles[0];
      const isEv = randomVehicle.category === 'Electric';
      const driverName = randomVehicle.assignedDriverName || 'Assigned Driver';
      const driverPhone = randomVehicle.assignedDriverPhone || '+254700000000';

      const newAnom: SecurityAnomaly = {
        id: `anom-${Date.now()}`,
        anomalyCode: `ANOM-2026-${Math.floor(100 + Math.random() * 900)}`,
        vehicleId: randomVehicle.id,
        vehicleReg: randomVehicle.registrationNumber,
        vehicleModel: `${randomVehicle.make} ${randomVehicle.model}`,
        vehicleType: randomVehicle.type,
        category: isEv ? 'EV Battery' : 'Fuel',
        driverId: randomVehicle.assignedDriverId,
        driverName,
        driverPhone,
        severity: 'Critical',
        anomalyTitle: isEv 
          ? `Sudden Battery SoC Collapse & Discharge Spike (${randomVehicle.registrationNumber})`
          : `Unusual Fuel Loss / Siphoning Telemetry (${randomVehicle.registrationNumber})`,
        telemetryMetric: isEv 
          ? '24% SoC drop detected in 2.1 km' 
          : '8.4 Liters missing during 15m idle stop',
        expectedValue: isEv ? '1.8% SoC per 2km' : '0.1L idle consumption',
        actualObserved: isEv ? '24.0% SoC discharge' : '8.4L rapid loss',
        timestamp: 'Just now (Live Scan)',
        locationName: randomVehicle.currentLocation.address || 'Nairobi Central Corridor',
        lat: randomVehicle.currentLocation.lat || -1.286389,
        lng: randomVehicle.currentLocation.lng || 36.817223,
        status: 'Active Anomaly',
        financialRiskKes: isEv ? 18000 : 3200,
        aiDiagnosticSummary: isEv 
          ? 'Live telemetry scan detected abnormal current draw spike. Battery BMS reported high cell temperature variance.'
          : 'Fuel level telemetry reported sharp downward step while vehicle speed was 0 km/h.'
      };

      setAnomalies(prev => [newAnom, ...prev]);

      if (autoCreateIncident) {
        handleTriggerIncidentForAnomaly(newAnom);
      } else {
        toast.warning(`New Anomaly Detected: ${newAnom.vehicleReg}!`, {
          description: newAnom.anomalyTitle
        });
      }

    }, 1800);
  };

  // Toggle Immobilizer
  const handleToggleImmobilizer = (vehicleId: string, vehicleReg: string) => {
    const isCurrentlyImmobilized = immobilizedVehicles[vehicleId];
    setImmobilizedVehicles(prev => ({
      ...prev,
      [vehicleId]: !isCurrentlyImmobilized
    }));

    if (!isCurrentlyImmobilized) {
      toast.error(`🔒 VEHICLE IMMOBILIZED: ${vehicleReg}`, {
        description: `Remote ECU shutdown signal transmitted to ${vehicleReg}. Fuel pump / EV motor power cut successfully.`,
        duration: 5000
      });
    } else {
      toast.success(`🔓 VEHICLE UNLOCKED: ${vehicleReg}`, {
        description: `Remote ECU immobilization cleared for ${vehicleReg}. Vehicle restored to operational state.`,
        duration: 4000
      });
    }
  };

  // Start Investigation
  const handleStartInvestigation = (anomalyId: string) => {
    setAnomalies(prev => prev.map(a => a.id === anomalyId ? {
      ...a,
      status: 'Investigating'
    } : a));
    toast.info('Status updated: Under Investigation', {
      description: 'Security dispatcher has claimed this incident for active investigation.'
    });
  };

  // Open Resolution Modal
  const handleOpenResolveModal = (anomaly: SecurityAnomaly, actionType: 'Resolved' | 'False Positive' = 'Resolved') => {
    setResolvingAnomaly(anomaly);
    setResolutionActionType(actionType);
    setResolutionNoteInput(
      actionType === 'Resolved' 
        ? 'Inspected by dispatcher. Hardware connection verified and secured.' 
        : 'Confirmed false alarm from transient sensor reading.'
    );
  };

  // Submit Resolution
  const handleSubmitResolution = () => {
    if (!resolvingAnomaly) return;

    setAnomalies(prev => prev.map(a => a.id === resolvingAnomaly.id ? {
      ...a,
      status: resolutionActionType,
      resolutionNotes: resolutionNoteInput.trim() || `${resolutionActionType} by dispatcher`,
      resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' EAT',
      resolvedBy: 'Duty Dispatcher'
    } : a));

    toast.success(
      resolutionActionType === 'Resolved' 
        ? `Anomaly ${resolvingAnomaly.anomalyCode} Marked as Resolved` 
        : `Anomaly ${resolvingAnomaly.anomalyCode} Flagged as False Positive`, 
      {
        description: `Archived into Closed & Resolved tab.`
      }
    );

    setResolvingAnomaly(null);
    setResolutionNoteInput('');
  };

  // Re-open Anomaly
  const handleReopenAnomaly = (anomalyId: string) => {
    setAnomalies(prev => prev.map(a => a.id === anomalyId ? {
      ...a,
      status: 'Active Anomaly',
      resolvedAt: undefined,
      resolvedBy: undefined
    } : a));
    toast.warning('Incident Re-opened', {
      description: 'Item returned to Active & Actionable queue.'
    });
  };

  // Filtering Calculations
  const activeAnomalies = anomalies.filter(a => a.status === 'Active Anomaly' || a.status === 'Incident Auto-Created' || a.status === 'Investigating');
  const closedAnomalies = anomalies.filter(a => a.status === 'Resolved' || a.status === 'False Positive');

  const filteredAnomalies = anomalies.filter(a => {
    // 1. Tab workflow filter
    if (activeWorkflowTab === 'active') {
      if (a.status !== 'Active Anomaly' && a.status !== 'Incident Auto-Created' && a.status !== 'Investigating') {
        return false;
      }
      // Sub-filter inside active
      if (activeSubFilter === 'critical' && a.severity !== 'Critical') return false;
      if (activeSubFilter === 'investigating' && a.status !== 'Investigating') return false;
      if (activeSubFilter === 'incident_created' && a.status !== 'Incident Auto-Created' && !a.autoIncidentId) return false;
    } else if (activeWorkflowTab === 'resolved') {
      if (a.status !== 'Resolved' && a.status !== 'False Positive') {
        return false;
      }
      // Sub-filter inside resolved
      if (resolvedSubFilter === 'resolved' && a.status !== 'Resolved') return false;
      if (resolvedSubFilter === 'false_positive' && a.status !== 'False Positive') return false;
    }

    // 2. Category Filter
    if (categoryFilter !== 'All' && a.category !== categoryFilter) return false;

    // 3. Severity Filter
    if (severityFilter !== 'All' && a.severity !== severityFilter) return false;

    // 4. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReg = a.vehicleReg.toLowerCase().includes(q);
      const matchDriver = a.driverName.toLowerCase().includes(q);
      const matchCode = a.anomalyCode.toLowerCase().includes(q);
      const matchTitle = a.anomalyTitle.toLowerCase().includes(q);
      const matchLocation = a.locationName.toLowerCase().includes(q);
      if (!matchReg && !matchDriver && !matchCode && !matchTitle && !matchLocation) {
        return false;
      }
    }

    return true;
  });

  // Active counts for badges
  const activeCount = activeAnomalies.length;
  const closedCount = closedAnomalies.length;
  const criticalActiveCount = activeAnomalies.filter(a => a.severity === 'Critical').length;
  const autoCreatedIncidentsCount = anomalies.filter(a => a.status === 'Incident Auto-Created' || a.autoIncidentId).length;
  const totalFinancialRiskKes = activeAnomalies.reduce((sum, a) => sum + a.financialRiskKes, 0);

  return (
    <div id="security-alerts-dashboard-container" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER BANNER */}
      <div id="security-header-banner" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  Security &amp; Telemetry Anomaly Alerts
                </h2>
                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Live Dispatch Guard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time surveillance for fuel siphoning, EV battery SoC collapse, high thermal spikes &amp; automatic incident dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Scan & Auto-Incident Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 cursor-pointer hover:bg-slate-900 transition">
            <input
              type="checkbox"
              id="auto-create-incident-checkbox"
              checked={autoCreateIncident}
              onChange={(e) => setAutoCreateIncident(e.target.checked)}
              className="w-4 h-4 text-red-500 rounded border-slate-700 bg-slate-900 focus:ring-red-500"
            />
            <span className="whitespace-nowrap">Auto-Dispatch Incident</span>
          </label>

          <button
            id="threshold-toggle-button"
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 cursor-pointer ${
              showThresholdConfig 
                ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sensitivity</span>
          </button>

          <button
            id="run-fleet-scan-button"
            onClick={handleRunFleetScan}
            disabled={isScanning}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition shadow-lg shadow-red-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Telemetry...' : 'Run Live Fleet Scan'}</span>
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div id="security-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div id="metric-active-stream" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Actionable Stream</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono">{activeCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <span className="text-red-400 font-bold">{criticalActiveCount} Critical</span> require immediate dispatch
          </div>
        </div>

        <div id="metric-incidents-created" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Incidents Auto-Created</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1 font-mono">{autoCreatedIncidentsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Auto-populated into Incident Logbook
          </div>
        </div>

        <div id="metric-financial-risk" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Financial Exposure</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            KES {totalFinancialRiskKes.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Fuel drain &amp; battery damage risk</div>
        </div>

        <div id="metric-resolved-count" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Resolved &amp; Cleared</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{closedCount}</div>
          <div className="text-[10px] text-indigo-400 font-bold mt-0.5">Safely resolved or false positives</div>
        </div>

      </div>

      {/* SENSITIVITY THRESHOLD CONTROLS (COLLAPSIBLE) */}
      {showThresholdConfig && (
        <div id="threshold-config-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Automated Anomaly Threshold Settings
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">
              Evaluates live IoT CAN-bus signals against baseline models
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Fuel Threshold */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fuel Drop Spike Sensitivity</span>
                </span>
                <span className="font-mono font-bold text-amber-400">{fuelDropThreshold}% / 10m</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={fuelDropThreshold}
                onChange={(e) => setFuelDropThreshold(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Triggers if fuel drops &gt;{fuelDropThreshold}% while parked/idle</p>
            </div>

            {/* EV Battery Threshold */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>EV SoC Discharge Spike</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">{batteryDischargeThreshold}% / 5km</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={batteryDischargeThreshold}
                onChange={(e) => setBatteryDischargeThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Triggers if SoC drops &gt;{batteryDischargeThreshold}% per 5 km ride</p>
            </div>

            {/* Thermal Temp Threshold */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Battery Thermal Ceiling</span>
                </span>
                <span className="font-mono font-bold text-red-400">{thermalTempThreshold}°C</span>
              </div>
              <input
                type="range"
                min="40"
                max="75"
                value={thermalTempThreshold}
                onChange={(e) => setThermalTempThreshold(Number(e.target.value))}
                className="w-full accent-red-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Triggers when cell temperature exceeds {thermalTempThreshold}°C</p>
            </div>
          </div>
        </div>
      )}

      {/* PRIMARY WORKFLOW TAB NAVIGATION */}
      <div id="workflow-tab-bar" className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-lg space-y-3">
        
        {/* Main Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            
            {/* TAB: ACTIVE INCIDENTS & ANOMALIES */}
            <button
              id="tab-active-incidents"
              onClick={() => setActiveWorkflowTab('active')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                activeWorkflowTab === 'active'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${activeCount > 0 ? 'text-amber-300 animate-pulse' : ''}`} />
              <span>Active Incidents &amp; Anomalies</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeWorkflowTab === 'active'
                  ? 'bg-red-900/80 text-white border border-red-400/40'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {activeCount}
              </span>
            </button>

            {/* TAB: CLOSED & RESOLVED */}
            <button
              id="tab-closed-resolved"
              onClick={() => setActiveWorkflowTab('resolved')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                activeWorkflowTab === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Closed &amp; Resolved</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeWorkflowTab === 'resolved'
                  ? 'bg-emerald-900/80 text-white border border-emerald-400/40'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {closedCount}
              </span>
            </button>

            {/* TAB: ALL EVENTS */}
            <button
              id="tab-all-history"
              onClick={() => setActiveWorkflowTab('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeWorkflowTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>All ({anomalies.length})</span>
            </button>

          </div>

          {/* Quick link to Emergency Incident Logbook */}
          <button
            id="view-all-incidents-nav-button"
            onClick={() => onNavigateTab('incidents')}
            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition cursor-pointer self-end sm:self-auto"
          >
            <span>Emergency SOS Logbook ({incidents.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SEARCH & SECONDARY FILTER BAR */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              id="security-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reg plate (e.g. KCY 882P), driver, or code..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sub-Filters / Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            
            {/* Active Tab Sub-filters */}
            {activeWorkflowTab === 'active' && (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-black px-1.5">Action:</span>
                <button
                  onClick={() => setActiveSubFilter('all')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    activeSubFilter === 'all' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Active ({activeCount})
                </button>
                <button
                  onClick={() => setActiveSubFilter('critical')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    activeSubFilter === 'critical' ? 'bg-red-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Critical SOS ({criticalActiveCount})
                </button>
                <button
                  onClick={() => setActiveSubFilter('investigating')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    activeSubFilter === 'investigating' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  In Investigation ({anomalies.filter(a => a.status === 'Investigating').length})
                </button>
              </div>
            )}

            {/* Resolved Tab Sub-filters */}
            {activeWorkflowTab === 'resolved' && (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-black px-1.5">Resolution:</span>
                <button
                  onClick={() => setResolvedSubFilter('all')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    resolvedSubFilter === 'all' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Closed ({closedCount})
                </button>
                <button
                  onClick={() => setResolvedSubFilter('resolved')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    resolvedSubFilter === 'resolved' ? 'bg-emerald-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Resolved ({anomalies.filter(a => a.status === 'Resolved').length})
                </button>
                <button
                  onClick={() => setResolvedSubFilter('false_positive')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    resolvedSubFilter === 'false_positive' ? 'bg-amber-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  False Positives ({anomalies.filter(a => a.status === 'False Positive').length})
                </button>
              </div>
            )}

            {/* Category Dropdown/Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-black px-1">Type:</span>
              {(['All', 'Fuel', 'EV Battery'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    categoryFilter === cat 
                      ? 'bg-red-600 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

          </div>

        </div>

      </div>

      {/* ACTIVE WORKFLOW CONTEXT HEADER */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {activeWorkflowTab === 'active' && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
          {activeWorkflowTab === 'resolved' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {activeWorkflowTab === 'all' && <Activity className="w-4 h-4 text-indigo-400" />}
          
          <h3 className="text-sm font-bold text-white">
            {activeWorkflowTab === 'active' && 'Actionable Incidents & Active Anomalies'}
            {activeWorkflowTab === 'resolved' && 'Closed & Resolved History'}
            {activeWorkflowTab === 'all' && 'Comprehensive Telemetry History'}
          </h3>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
            {filteredAnomalies.length} items
          </span>
        </div>

        {activeWorkflowTab === 'active' && activeCount > 0 && (
          <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Dispatchers: Address active items before closing shifts
          </span>
        )}
      </div>

      {/* ANOMALY CARDS STREAM */}
      <div id="anomalies-list-container" className="space-y-4">
        
        {/* EMPTY STATE */}
        {filteredAnomalies.length === 0 && (
          <div id="empty-anomalies-state" className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
              {activeWorkflowTab === 'active' ? (
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-slate-400" />
              )}
            </div>
            
            <div className="max-w-md mx-auto">
              <h4 className="text-base font-bold text-white">
                {activeWorkflowTab === 'active' 
                  ? 'All Clear — No Active Security Anomalies' 
                  : activeWorkflowTab === 'resolved'
                  ? 'No Closed or Resolved Incidents Found'
                  : 'No Security Events Matching Criteria'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {activeWorkflowTab === 'active'
                  ? 'All connected EV battery BMS sensors, fuel gauges, and GPS geofences are currently reporting within normal baseline thresholds.'
                  : 'Adjust your search queries or category filters to see other telemetry records.'}
              </p>
            </div>

            {activeWorkflowTab === 'active' && (
              <button
                onClick={handleRunFleetScan}
                disabled={isScanning}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Run Telemetry Re-Scan
              </button>
            )}
          </div>
        )}

        {/* LIST OF CARDS */}
        {filteredAnomalies.map((anomaly) => {
          const isImmobilized = immobilizedVehicles[anomaly.vehicleId];
          const isIncidentCreated = anomaly.status === 'Incident Auto-Created' || Boolean(anomaly.autoIncidentId);
          const isResolved = anomaly.status === 'Resolved';
          const isFalsePositive = anomaly.status === 'False Positive';
          const isInvestigating = anomaly.status === 'Investigating';

          return (
            <div 
              key={anomaly.id}
              id={`anomaly-card-${anomaly.id}`}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition space-y-4 ${
                anomaly.status === 'Resolved' ? 'border-emerald-900/40 bg-emerald-950/5 opacity-90' :
                anomaly.status === 'False Positive' ? 'border-slate-800 bg-slate-950/40 opacity-75' :
                anomaly.severity === 'Critical' ? 'border-red-500/50 bg-red-950/10' :
                anomaly.severity === 'Severe' ? 'border-amber-500/40 bg-amber-950/10' :
                'border-slate-800'
              }`}
            >
              {/* CARD HEADER */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isResolved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    isFalsePositive ? 'bg-slate-800 border-slate-700 text-slate-400' :
                    anomaly.category === 'Fuel' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
                    'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {isResolved ? <CheckCircle2 className="w-5 h-5" /> :
                     anomaly.category === 'Fuel' ? <Fuel className="w-5 h-5" /> : 
                     <BatteryWarning className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black font-mono text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {anomaly.vehicleReg}
                      </span>
                      <span className="text-[10px] text-slate-400">({anomaly.vehicleModel})</span>
                      <span className="text-[10px] font-mono text-slate-500">{anomaly.anomalyCode}</span>
                      
                      {/* Severity Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        anomaly.severity === 'Critical' ? 'bg-red-500 text-white' :
                        anomaly.severity === 'Severe' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white mt-1">{anomaly.anomalyTitle}</h4>
                  </div>
                </div>

                {/* Workflow Status Badge */}
                <div className="flex items-center gap-2">
                  {isResolved ? (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Resolved</span>
                    </span>
                  ) : isFalsePositive ? (
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>False Positive</span>
                    </span>
                  ) : isInvestigating ? (
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Under Investigation</span>
                    </span>
                  ) : isIncidentCreated ? (
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Incident Logged ({anomaly.autoIncidentId || 'Dispatched'})</span>
                    </span>
                  ) : (
                    <span className="bg-red-950 text-red-400 border border-red-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span>Action Required</span>
                    </span>
                  )}
                </div>
              </div>

              {/* TELEMETRY SPECS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Observed Telemetry Metric</span>
                  <div className="font-mono font-black text-red-400 mt-0.5 text-sm">{anomaly.telemetryMetric}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Fleet Baseline Expectation</span>
                  <div className="font-mono font-bold text-slate-300 mt-0.5">{anomaly.expectedValue}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Last Position &amp; Time</span>
                  <div className="font-bold text-white mt-0.5 truncate">{anomaly.locationName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{anomaly.timestamp}</div>
                </div>
              </div>

              {/* AI DIAGNOSTIC REPORT */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>AI Security Diagnostic Report:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{anomaly.aiDiagnosticSummary}</p>
                <div className="text-[10px] text-slate-400 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-900">
                  <span>Assigned Driver: <strong className="text-white">{anomaly.driverName}</strong> ({anomaly.driverPhone})</span>
                  <span>Estimated Impact: <strong className="text-amber-400 font-mono">KES {anomaly.financialRiskKes.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* RESOLUTION AUDIT BOX (IF RESOLVED OR FALSE POSITIVE) */}
              {(anomaly.resolutionNotes || isResolved || isFalsePositive) && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl text-xs space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolution Audit Trail:</span>
                    </span>
                    {anomaly.resolvedAt && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {anomaly.resolvedAt} by {anomaly.resolvedBy || 'Dispatcher'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 italic">
                    "{anomaly.resolutionNotes || (isFalsePositive ? 'Marked as false positive' : 'Incident verified and resolved')}"
                  </p>
                </div>
              )}

              {/* ACTION BUTTONS BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
                
                {/* Left Actions: Dispatch & Communications */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Active Tab Actions */}
                  {!isResolved && !isFalsePositive && (
                    <>
                      {/* Auto-Trigger Incident Button */}
                      {!isIncidentCreated ? (
                        <button
                          onClick={() => handleTriggerIncidentForAnomaly(anomaly)}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Dispatch Incident</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateTab('incidents')}
                          className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold rounded-lg hover:bg-emerald-900 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View in Logbook</span>
                        </button>
                      )}

                      {/* Investigate State Button */}
                      {!isInvestigating && (
                        <button
                          onClick={() => handleStartInvestigation(anomaly.id)}
                          className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Claim / Investigate</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Contact Driver */}
                  {onOpenMessageComposer && (
                    <button
                      onClick={() => {
                        const driver = drivers.find(d => d.id === anomaly.driverId) || {
                          id: anomaly.driverId || 'd-unk',
                          fullName: anomaly.driverName,
                          phone: anomaly.driverPhone
                        } as Driver;
                        onOpenMessageComposer(driver);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Send Alert</span>
                    </button>
                  )}

                  <a
                    href={`tel:${anomaly.driverPhone}`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Call Driver</span>
                  </a>
                </div>

                {/* Right Actions: Immobilizer & Status Transitions */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Remote Immobilizer */}
                  <button
                    onClick={() => handleToggleImmobilizer(anomaly.vehicleId, anomaly.vehicleReg)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isImmobilized
                        ? 'bg-red-950 text-red-400 border border-red-500/50 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isImmobilized ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-red-400" />
                        <span>Immobilized (Cut Power)</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Remote ECU Immobilize</span>
                      </>
                    )}
                  </button>

                  {/* Mark Resolved / False Positive or Re-open */}
                  {!isResolved && !isFalsePositive ? (
                    <>
                      <button
                        onClick={() => handleOpenResolveModal(anomaly, 'Resolved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>

                      <button
                        onClick={() => handleOpenResolveModal(anomaly, 'False Positive')}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg font-bold border border-slate-700 transition cursor-pointer"
                        title="Mark as false positive"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleReopenAnomaly(anomaly.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-open Alert</span>
                    </button>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* RESOLUTION MODAL / DIALOG */}
      {resolvingAnomaly && (
        <div 
          id="resolution-dialog-overlay"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div 
            id="resolution-dialog-box"
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {resolutionActionType === 'Resolved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400" />
                )}
                <h3 className="text-base font-bold text-white">
                  {resolutionActionType === 'Resolved' ? 'Close & Resolve Anomaly' : 'Mark as False Positive'}
                </h3>
              </div>
              <button 
                onClick={() => setResolvingAnomaly(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-bold">Vehicle / Anomaly Code:</div>
                <div className="text-white font-mono font-bold mt-0.5">
                  {resolvingAnomaly.vehicleReg} ({resolvingAnomaly.anomalyCode})
                </div>
                <div className="text-slate-400 mt-1">{resolvingAnomaly.anomalyTitle}</div>
              </div>

              {/* Action Type Toggle in Modal */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionActionType('Resolved')}
                  className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    resolutionActionType === 'Resolved' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Mark Resolved</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResolutionActionType('False Positive')}
                  className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    resolutionActionType === 'False Positive' 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>False Alarm</span>
                </button>
              </div>

              {/* Preset Note Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400">Quick Resolution Presets:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Technician inspected & secured connector',
                    'Driver confirmed authorized fuel transfer',
                    'Temporary sensor glitch during wash',
                    'Police report filed (OB tracked)',
                    'Re-calibrated BMS sensor'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setResolutionNoteInput(preset)}
                      className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 transition text-left cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Resolution / Audit Log Notes:</label>
                <textarea
                  value={resolutionNoteInput}
                  onChange={(e) => setResolutionNoteInput(e.target.value)}
                  rows={3}
                  placeholder="Enter details of action taken, technician dispatch, or cause..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResolvingAnomaly(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-950 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
