import React, { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, ShieldAlert, Wrench, Battery, Zap, 
  CheckCircle2, X, Play, Filter, Clock, ChevronRight, MapPin, Radio, ShieldCheck
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { IncidentReport, Vehicle } from '../types';

export interface AlertFeedItem {
  id: string;
  title: string;
  type: 'Critical SOS' | 'Maintenance Alert' | 'Low Battery' | 'Geofence Violation' | 'Operational Warning';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  vehicleReg?: string;
  vehicleId?: string;
  driverName?: string;
  locationName?: string;
  timestamp: string;
  details: string;
  acknowledged: boolean;
  actionRequired?: string;
}

interface AlertsFeedProps {
  incidents: IncidentReport[];
  vehicles: Vehicle[];
  onNavigateTab?: (tab: string) => void;
  onOpenIncidentModal?: () => void;
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({
  incidents = [],
  vehicles = [],
  onNavigateTab,
  onOpenIncidentModal
}) => {
  const [filterType, setFilterType] = useState<string>('All');
  
  // Transform initial incidents & vehicles into live alert feed items
  const [alerts, setAlerts] = useState<AlertFeedItem[]>(() => {
    const initialList: AlertFeedItem[] = [];

    // Map existing incident reports
    incidents.forEach((inc, idx) => {
      initialList.push({
        id: `alert-inc-${inc.id}`,
        title: `${inc.incidentType}: ${inc.vehicleReg}`,
        type: inc.severity === 'Critical SOS' ? 'Critical SOS' : 'Operational Warning',
        severity: inc.severity === 'Critical SOS' ? 'Critical' : inc.severity === 'Severe' ? 'High' : 'Medium',
        vehicleReg: inc.vehicleReg,
        vehicleId: inc.vehicleId,
        driverName: inc.driverName,
        locationName: inc.locationName,
        timestamp: inc.timestamp,
        details: inc.description,
        acknowledged: inc.status === 'Resolved' || inc.status === 'Closed',
        actionRequired: inc.status === 'Open' ? 'Immediate Dispatcher Attention Required' : undefined
      });
    });

    // Check for low battery EV vehicles (<20% SoC)
    vehicles.filter(v => v.category === 'Electric' && v.currentSoCPercent < 25).forEach(v => {
      initialList.push({
        id: `alert-batt-${v.id}`,
        title: `Low Battery Warning: ${v.registrationNumber}`,
        type: 'Low Battery',
        severity: v.currentSoCPercent < 15 ? 'Critical' : 'High',
        vehicleReg: v.registrationNumber,
        vehicleId: v.id,
        driverName: v.assignedDriverName || 'Unassigned',
        locationName: v.currentLocation.address,
        timestamp: '15 mins ago',
        details: `Battery state of charge dropped to ${v.currentSoCPercent}%. Nearby swap station recommended.`,
        acknowledged: false,
        actionRequired: 'Route to Battery Swap Station'
      });
    });

    // Check for maintenance flags
    vehicles.filter(v => v.status === 'Under Maintenance' || (v.odometerKm > 45000)).slice(0, 2).forEach(v => {
      initialList.push({
        id: `alert-maint-${v.id}`,
        title: `Scheduled Maintenance Due: ${v.registrationNumber}`,
        type: 'Maintenance Alert',
        severity: 'Medium',
        vehicleReg: v.registrationNumber,
        vehicleId: v.id,
        driverName: v.assignedDriverName || 'Unassigned',
        locationName: v.currentLocation.address,
        timestamp: '1 hour ago',
        details: `Vehicle reached ${v.odometerKm.toLocaleString()} km. Brake pad & tire inspection required.`,
        acknowledged: false,
        actionRequired: 'Open Maintenance Work Order'
      });
    });

    return initialList;
  });

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  // Function to simulate a new incoming real-time alert with sonner toast
  const triggerSimulatedAlert = () => {
    const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)] || {
      id: 'v-demo',
      registrationNumber: 'KMG 902E',
      assignedDriverName: 'Kevin Wafula',
      currentLocation: { address: 'Mombasa Road, Nairobi' }
    };

    const alertTypes: Array<{
      title: string;
      type: AlertFeedItem['type'];
      severity: AlertFeedItem['severity'];
      details: string;
      toastMethod: 'error' | 'warning' | 'info';
    }> = [
      {
        title: `🚨 CRITICAL SOS: Rapid Brake Pressure Loss on ${randomVehicle.registrationNumber}`,
        type: 'Critical SOS',
        severity: 'Critical',
        details: `Rider ${randomVehicle.assignedDriverName || 'Driver'} triggered emergency alert near ${randomVehicle.currentLocation.address}`,
        toastMethod: 'error'
      },
      {
        title: `⚡ BATTERY CRITICAL: 12% SoC remaining on ${randomVehicle.registrationNumber}`,
        type: 'Low Battery',
        severity: 'Critical',
        details: `Battery pack rapidly depleting. Dispatching nearest swap hub location.`,
        toastMethod: 'warning'
      },
      {
        title: `⛔ GEOFENCE BREACH: ${randomVehicle.registrationNumber} exited Nairobi CBD zone`,
        type: 'Geofence Violation',
        severity: 'High',
        details: `Vehicle location detected 1.2km outside authorized delivery boundary.`,
        toastMethod: 'warning'
      },
      {
        title: `🔧 ENGINE TELEMETRY: High Temperature Sensor Alert on ${randomVehicle.registrationNumber}`,
        type: 'Maintenance Alert',
        severity: 'Medium',
        details: `Coolant thermal warning flagged by OBD-II telemetry sensor.`,
        toastMethod: 'info'
      }
    ];

    const chosen = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const newAlertItem: AlertFeedItem = {
      id: `live-alert-${Date.now()}`,
      title: chosen.title,
      type: chosen.type,
      severity: chosen.severity,
      vehicleReg: randomVehicle.registrationNumber,
      vehicleId: randomVehicle.id,
      driverName: randomVehicle.assignedDriverName || 'Rider',
      locationName: randomVehicle.currentLocation.address,
      timestamp: 'Just now',
      details: chosen.details,
      acknowledged: false,
      actionRequired: chosen.severity === 'Critical' ? 'Immediate Dispatch Action' : 'Monitor Vehicle Telemetry'
    };

    // Update state
    setAlerts(prev => [newAlertItem, ...prev]);

    // Dispatch Sonner Toast Notification
    if (chosen.toastMethod === 'error') {
      toast.error(chosen.title, {
        description: chosen.details,
        duration: 6000,
        action: {
          label: 'Inspect',
          onClick: () => onNavigateTab && onNavigateTab('incidents')
        }
      });
    } else if (chosen.toastMethod === 'warning') {
      toast.warning(chosen.title, {
        description: chosen.details,
        duration: 5000,
        action: {
          label: 'Acknowledge',
          onClick: () => handleAcknowledge(newAlertItem.id)
        }
      });
    } else {
      toast.info(chosen.title, {
        description: chosen.details,
        duration: 4000
      });
    }
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    toast.success('Alert acknowledged by dispatcher.');
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterType === 'All') return true;
    if (filterType === 'Critical') return a.severity === 'Critical' || a.type === 'Critical SOS';
    if (filterType === 'Maintenance') return a.type === 'Maintenance Alert';
    if (filterType === 'Battery') return a.type === 'Low Battery';
    if (filterType === 'Geofence') return a.type === 'Geofence Violation';
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Toast Notification Container */}
      <Toaster position="top-right" richColors expand closeButton />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-red-600" />
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Real-Time Fleet Incident &amp; Maintenance Alerts Feed
            </h3>
            {unacknowledgedCount > 0 ? (
              <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                {unacknowledgedCount} Action Required
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> All Systems Nominal
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Live telemetry stream announcing driver SOS triggers, low battery thresholds, and maintenance work orders.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={triggerSimulatedAlert}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs transition shadow-xs"
            title="Simulate an incoming live crash/SOS/telemetry toast alert"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Simulate Live Alert</span>
          </button>

          {onOpenIncidentModal && (
            <button
              onClick={onOpenIncidentModal}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Log Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold text-[11px]">Filter Feed:</span>
        <button
          onClick={() => setFilterType('All')}
          className={`px-2.5 py-1 rounded-lg font-bold transition ${
            filterType === 'All' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setFilterType('Critical')}
          className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
            filterType === 'Critical' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <span>Critical SOS</span>
          <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.2 rounded-full">
            {alerts.filter(a => a.severity === 'Critical').length}
          </span>
        </button>
        <button
          onClick={() => setFilterType('Battery')}
          className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
            filterType === 'Battery' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <span>Low Battery</span>
          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-full">
            {alerts.filter(a => a.type === 'Low Battery').length}
          </span>
        </button>
        <button
          onClick={() => setFilterType('Maintenance')}
          className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
            filterType === 'Maintenance' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <span>Maintenance</span>
          <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
            {alerts.filter(a => a.type === 'Maintenance Alert').length}
          </span>
        </button>
      </div>

      {/* Alerts Feed Items Stream */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No active alerts matching selected filter criteria.
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isCritical = alert.severity === 'Critical';
            const isHigh = alert.severity === 'High';

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  alert.acknowledged
                    ? 'bg-slate-50 border-slate-200 opacity-70'
                    : isCritical
                    ? 'bg-red-50/70 border-red-300 shadow-xs'
                    : isHigh
                    ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                    : 'bg-indigo-50/40 border-indigo-200'
                }`}
              >
                {/* Left side info */}
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isCritical ? 'bg-red-600 text-white' :
                    alert.type === 'Low Battery' ? 'bg-emerald-600 text-white' :
                    alert.type === 'Maintenance Alert' ? 'bg-amber-600 text-white' :
                    'bg-indigo-600 text-white'
                  }`}>
                    {alert.type === 'Low Battery' ? <Battery className="w-4 h-4" /> :
                     alert.type === 'Maintenance Alert' ? <Wrench className="w-4 h-4" /> :
                     <AlertTriangle className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900">{alert.title}</h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        isCritical ? 'bg-red-200 text-red-900' :
                        isHigh ? 'bg-amber-200 text-amber-900' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {alert.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">{alert.details}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                      {alert.driverName && (
                        <span>Driver: <strong className="text-slate-800">{alert.driverName}</strong></span>
                      )}
                      {alert.locationName && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          <span>{alert.locationName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg transition shadow-2xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Acknowledged
                    </span>
                  )}

                  {onNavigateTab && alert.type === 'Critical SOS' && (
                    <button
                      onClick={() => onNavigateTab('incidents')}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition shadow-2xs flex items-center gap-1"
                    >
                      <span>Dispatch</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
