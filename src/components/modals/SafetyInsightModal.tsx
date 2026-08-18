import React, { useState } from 'react';
import { Driver, Vehicle } from '../../types';
import { 
  X, ShieldAlert, AlertTriangle, Zap, MapPin, 
  Clock, Gauge, Flame, CheckCircle2, AlertCircle, 
  ArrowDownRight, ExternalLink, Activity, Send, BookOpen, 
  Sparkles, RefreshCw, ChevronRight, ChevronDown, Compass
} from 'lucide-react';
import { toast } from 'sonner';

export interface TelematicsViolationEvent {
  id: string;
  type: 'Speeding' | 'Harsh Braking' | 'Harsh Acceleration' | 'Sharp Cornering' | 'Fatigue Warning';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  timestamp: string;
  locationName: string;
  lat: number;
  lng: number;
  vehicleReg: string;
  recordedValue: string;
  speedLimitKmh?: number;
  actualSpeedKmh?: number;
  gForce?: number;
  pointsDeducted: number;
  description: string;
}

interface SafetyInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  vehicle?: Vehicle | null;
  onAssignTraining?: (driverId: string, moduleName: string) => void;
  onNavigateToMessages?: () => void;
  onUpdateDriverSafetyScore?: (driverId: string, newScore: number) => void;
}

// Helper to generate deterministic telematics events based on driver ID & score
const generateDriverTelematicsEvents = (driver: Driver): TelematicsViolationEvent[] => {
  const events: TelematicsViolationEvent[] = [];
  const score = driver.safetyScorePercent;
  const reg = driver.assignedVehicleReg || 'KMG 482E';

  if (score < 80) {
    events.push({
      id: `TEL-EVT-${driver.id}-01`,
      type: 'Speeding',
      severity: 'Critical',
      timestamp: 'Today, 11:24 EAT',
      locationName: 'Thika Superhighway near Roysambu Interchange',
      lat: -1.2185,
      lng: 36.8872,
      vehicleReg: reg,
      recordedValue: '86 km/h in 50 km/h Zone',
      speedLimitKmh: 50,
      actualSpeedKmh: 86,
      pointsDeducted: 12,
      description: 'Sustained overspeeding (+36 km/h over zone limit) for 4.2 continuous kilometers.'
    });

    events.push({
      id: `TEL-EVT-${driver.id}-02`,
      type: 'Harsh Braking',
      severity: 'High',
      timestamp: 'Yesterday, 16:42 EAT',
      locationName: 'Mombasa Road near City Cabanas Junction',
      lat: -1.3321,
      lng: 36.8791,
      vehicleReg: reg,
      recordedValue: '-0.58g Rapid Deceleration',
      gForce: -0.58,
      pointsDeducted: 8,
      description: 'Abrupt panic stop from 62 km/h to 0 km/h in 1.8 seconds due to late obstacle detection.'
    });

    events.push({
      id: `TEL-EVT-${driver.id}-03`,
      type: 'Sharp Cornering',
      severity: 'Medium',
      timestamp: '07 Aug 2026, 14:15 EAT',
      locationName: 'Waiyaki Way near Westlands Flyover',
      lat: -1.2642,
      lng: 36.8021,
      vehicleReg: reg,
      recordedValue: '0.44g Lateral Acceleration',
      gForce: 0.44,
      pointsDeducted: 5,
      description: 'High-speed lane weaving without indicator signaling on heavy urban gradient.'
    });

    if (score < 72) {
      events.push({
        id: `TEL-EVT-${driver.id}-04`,
        type: 'Fatigue Warning',
        severity: 'High',
        timestamp: '05 Aug 2026, 23:10 EAT',
        locationName: 'Ngong Road near Adams Arcade',
        lat: -1.3011,
        lng: 36.7842,
        vehicleReg: reg,
        recordedValue: '5.2 Hrs Continuous Driving',
        pointsDeducted: 6,
        description: 'Driver exceeded maximum 4-hour uninterrupted night shift safety window without rest check-in.'
      });
    }
  } else if (score < 90) {
    events.push({
      id: `TEL-EVT-${driver.id}-01`,
      type: 'Speeding',
      severity: 'Medium',
      timestamp: 'Yesterday, 10:15 EAT',
      locationName: 'Outer Ring Road near Donholm Flyover',
      lat: -1.2912,
      lng: 36.8920,
      vehicleReg: reg,
      recordedValue: '68 km/h in 50 km/h Zone',
      speedLimitKmh: 50,
      actualSpeedKmh: 68,
      pointsDeducted: 6,
      description: 'Minor speed exceedance during mid-day delivery transit.'
    });

    events.push({
      id: `TEL-EVT-${driver.id}-02`,
      type: 'Harsh Braking',
      severity: 'Low',
      timestamp: '06 Aug 2026, 15:30 EAT',
      locationName: 'Kilimani Argwings Kodhek Rd',
      lat: -1.2950,
      lng: 36.7911,
      vehicleReg: reg,
      recordedValue: '-0.38g Deceleration',
      gForce: -0.38,
      pointsDeducted: 4,
      description: 'Braking at pedestrian crossing.'
    });
  } else {
    events.push({
      id: `TEL-EVT-${driver.id}-01`,
      type: 'Harsh Braking',
      severity: 'Low',
      timestamp: '04 Aug 2026, 09:20 EAT',
      locationName: 'Lavington James Gichuru Road',
      lat: -1.2721,
      lng: 36.7720,
      vehicleReg: reg,
      recordedValue: '-0.32g Minor Deceleration',
      gForce: -0.32,
      pointsDeducted: 2,
      description: 'Controlled defensive slowdown for sudden speed bump.'
    });
  }

  return events;
};

export const SafetyInsightModal: React.FC<SafetyInsightModalProps> = ({
  isOpen,
  onClose,
  driver,
  vehicle,
  onAssignTraining,
  onNavigateToMessages,
  onUpdateDriverSafetyScore
}) => {
  if (!isOpen || !driver) return null;

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const events = generateDriverTelematicsEvents(driver);
  const totalDeductions = events.reduce((sum, e) => sum + e.pointsDeducted, 0);
  const baselineScore = 100;
  const calculatedScore = Math.max(0, baselineScore - totalDeductions);

  const speedEvents = events.filter(e => e.type === 'Speeding');
  const brakingEvents = events.filter(e => e.type === 'Harsh Braking');
  const corneringEvents = events.filter(e => e.type === 'Sharp Cornering');
  const fatigueEvents = events.filter(e => e.type === 'Fatigue Warning');

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', text: 'Low Risk • Champion' };
    if (score >= 80) return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40', text: 'Moderate • Compliant' };
    if (score >= 70) return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', text: 'High Risk • Needs Attention' };
    return { bg: 'bg-red-500/20 text-red-400 border-red-500/40', text: 'Critical Risk • Telemetry Flagged' };
  };

  const badgeInfo = getScoreBadgeColor(driver.safetyScorePercent);

  const toggleExpandEvent = (id: string) => {
    setExpandedEventId(prev => prev === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto space-y-0">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${driver.safetyScorePercent < 80 ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Driver Safety Score Telematics Insight</h2>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeInfo.bg}`}>
                  {badgeInfo.text}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Root cause telemetry analysis and point deduction audit for <strong className="text-white">{driver.fullName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* DRIVER SUMMARY & SCORECARD STRIP */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            <div className="flex items-center gap-3 md:col-span-1 border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 pr-0 md:pr-4">
              <img 
                src={driver.profilePhotoUrl} 
                alt={driver.fullName} 
                className="w-12 h-12 rounded-xl object-cover border-2 border-slate-700 shrink-0"
              />
              <div>
                <h3 className="font-bold text-white text-sm">{driver.fullName}</h3>
                <p className="text-[11px] text-slate-400 font-mono">{driver.assignedVehicleReg || vehicle?.registrationNumber || 'No Vehicle'}</p>
                <p className="text-[10px] text-slate-500">{driver.city} • DL: {driver.drivingLicenseNumber}</p>
              </div>
            </div>

            {/* Current Score */}
            <div className="text-center md:border-r border-slate-800 pr-0 md:pr-4">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Safety Score</span>
              <div className="text-3xl font-black font-mono mt-0.5 flex items-center justify-center gap-1">
                <span className={driver.safetyScorePercent >= 80 ? 'text-emerald-400' : 'text-red-400'}>
                  {driver.safetyScorePercent}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Target: &ge;80% Minimum</span>
            </div>

            {/* Total Telematics Deductions */}
            <div className="text-center md:border-r border-slate-800 pr-0 md:pr-4">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Telemetry Point Deductions</span>
              <div className="text-2xl font-black text-red-400 font-mono mt-0.5">
                -{totalDeductions} PTS
              </div>
              <span className="text-[10px] text-slate-500">From 100% Baseline</span>
            </div>

            {/* Total Violations Count */}
            <div className="text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Telematics Violations</span>
              <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                {events.length} Events
              </div>
              <span className="text-[10px] text-slate-500">Captured by IoT Telematics</span>
            </div>

          </div>

          {/* DEDUCTION BREAKDOWN BY CATEGORY */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Safety Score Impact Breakdown</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-lg border border-red-500/30">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-red-400" />
                    <span>Speeding</span>
                  </span>
                  <span className="text-red-400 font-mono font-bold">-{speedEvents.reduce((a, b) => a + b.pointsDeducted, 0)} pts</span>
                </div>
                <div className="text-base font-black text-white mt-1 font-mono">
                  {speedEvents.length} Alerts
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-lg border border-amber-500/30">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Harsh Braking</span>
                  </span>
                  <span className="text-amber-400 font-mono font-bold">-{brakingEvents.reduce((a, b) => a + b.pointsDeducted, 0)} pts</span>
                </div>
                <div className="text-base font-black text-white mt-1 font-mono">
                  {brakingEvents.length} Alerts
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-lg border border-indigo-500/30">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cornering</span>
                  </span>
                  <span className="text-indigo-300 font-mono font-bold">-{corneringEvents.reduce((a, b) => a + b.pointsDeducted, 0)} pts</span>
                </div>
                <div className="text-base font-black text-white mt-1 font-mono">
                  {corneringEvents.length} Alerts
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Fatigue Shift</span>
                  </span>
                  <span className="text-blue-300 font-mono font-bold">-{fatigueEvents.reduce((a, b) => a + b.pointsDeducted, 0)} pts</span>
                </div>
                <div className="text-base font-black text-white mt-1 font-mono">
                  {fatigueEvents.length} Alerts
                </div>
              </div>
            </div>
          </div>

          {/* SPECIFIC TELEMATICS VIOLATION EVENTS LOG */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" />
                <span>Captured Telematics Violation Events ({events.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">Click event row to expand telematics data & route location</span>
            </div>

            <div className="space-y-3">
              {events.map((evt) => {
                const isExpanded = expandedEventId === evt.id;
                return (
                  <div 
                    key={evt.id}
                    className={`rounded-xl border transition overflow-hidden ${
                      evt.severity === 'Critical' ? 'bg-red-950/20 border-red-500/50 hover:border-red-400' :
                      evt.severity === 'High' ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400' :
                      'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Event Row Header */}
                    <div 
                      onClick={() => toggleExpandEvent(evt.id)}
                      className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          evt.type === 'Speeding' ? 'bg-red-500/20 text-red-400' :
                          evt.type === 'Harsh Braking' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {evt.type === 'Speeding' ? <Gauge className="w-4 h-4" /> :
                           evt.type === 'Harsh Braking' ? <AlertTriangle className="w-4 h-4" /> :
                           <Activity className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs">{evt.type} Alert</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              evt.severity === 'Critical' ? 'bg-red-500 text-slate-950 font-black' :
                              evt.severity === 'High' ? 'bg-amber-500 text-slate-950 font-bold' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {evt.severity} Severity
                            </span>
                            <span className="text-[11px] text-slate-400">• {evt.timestamp}</span>
                          </div>

                          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{evt.locationName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-red-400 block">-{evt.pointsDeducted} PTS</span>
                          <span className="text-[11px] font-mono text-slate-300">{evt.recordedValue}</span>
                        </div>

                        <div className="p-1 bg-slate-900 rounded text-slate-400 border border-slate-800">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3 text-xs">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-1.5">
                            <span className="text-emerald-400 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5" />
                              <span>Telematics Sensor Data ({evt.id})</span>
                            </span>
                            <span className="font-mono text-slate-400">Vehicle: {evt.vehicleReg}</span>
                          </div>

                          <p className="text-slate-300 leading-relaxed text-[11px]">
                            {evt.description}
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">GPS Coordinates</span>
                              <span className="text-slate-200">{evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}</span>
                            </div>

                            {evt.speedLimitKmh && (
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Zone Speed Limit</span>
                                <span className="text-emerald-400 font-bold">{evt.speedLimitKmh} km/h</span>
                              </div>
                            )}

                            {evt.actualSpeedKmh && (
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Peak Recorded Speed</span>
                                <span className="text-red-400 font-bold">{evt.actualSpeedKmh} km/h</span>
                              </div>
                            )}

                            {evt.gForce && (
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Deceleration G-Force</span>
                                <span className="text-amber-400 font-bold">{evt.gForce} g</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <a
                            href={`https://maps.google.com/?q=${evt.lat},${evt.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-lg text-xs transition border border-slate-700 flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View GPS Location on Google Maps</span>
                          </a>

                          <button
                            onClick={() => {
                              toast.info(`Telematics alert #${evt.id} flagged for dispatcher review`);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition border border-slate-700"
                          >
                            Flag for Driver Hearing
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DISPATCH ACTION & REMEDIATION BAR */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Recommended Dispatcher Interventions</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (onAssignTraining) {
                    onAssignTraining(driver.id, 'Defensive Driving & Speed Control 101');
                  }
                  toast.success(`Assigned Defensive Driving & Speed Control course to ${driver.fullName}!`);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Assign Remedial Training</span>
              </button>

              <button
                onClick={() => {
                  if (onNavigateToMessages) {
                    onNavigateToMessages();
                    toast.info(`Navigated to Messages dispatch module for ${driver.fullName}`);
                  } else {
                    toast.success(`Dispatched automated safety warning SMS to ${driver.fullName} (${driver.phone})`);
                  }
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Dispatch Speed Warning Message</span>
              </button>

              {onUpdateDriverSafetyScore && (
                <button
                  onClick={() => {
                    onUpdateDriverSafetyScore(driver.id, 85);
                    toast.success(`Recalibrated & updated ${driver.fullName}'s safety score to 85%!`);
                  }}
                  className="px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>Override / Recalibrate Score (Set 85%)</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500">Connected to GreenShift Telematics Platform v2.4</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition"
          >
            Close Insight
          </button>
        </div>

      </div>
    </div>
  );
};
