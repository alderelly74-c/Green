import React, { useState, useMemo } from 'react';
import { Vehicle } from '../types';
import { 
  Calendar, Clock, Wrench, ShieldAlert, CheckCircle2, Send, 
  Download, Filter, Sparkles, MapPin, User, Mail, Plus,
  FileText, ExternalLink, RefreshCw, AlertTriangle, Building2, CheckSquare
} from 'lucide-react';
import { calculateVehicleComponentPredictions } from '../lib/maintenancePredictive';
import { toast } from 'sonner';

interface AutomatedMaintenanceSchedulerProps {
  vehicles?: Vehicle[];
  onOpenWorkOrderModal?: () => void;
}

export interface ProposedServiceSchedule {
  id: string;
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  category: 'Electric' | 'Fuel';
  assignedDriver: string;
  assignedDriverPhone: string;
  currentOdometerKm: number;
  dailyMileageRateKm: number;
  targetServiceOdometerKm: number;
  remainingKm: number;
  daysToService: number;
  proposedDateIso: string;
  proposedDateFormatted: string;
  urgency: 'OVERDUE' | 'CRITICAL' | 'SCHEDULED' | 'PLANNED';
  serviceType: string;
  recommendedWorkshop: string;
  assignedMechanic: string;
  estimatedDurationHours: number;
  inviteSent: boolean;
  inviteSentAt?: string;
  inviteRecipients?: string[];
}

export const AutomatedMaintenanceScheduler: React.FC<AutomatedMaintenanceSchedulerProps> = ({
  vehicles = [],
  onOpenWorkOrderModal
}) => {
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'DUE_7_DAYS' | 'OVERDUE' | 'ELECTRIC_EV'>('ALL');
  const [selectedSchedule, setSelectedSchedule] = useState<ProposedServiceSchedule | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);

  // Invite Form State
  const [inviteTimeSlot, setInviteTimeSlot] = useState<string>('09:00 AM');
  const [inviteDurationHours, setInviteDurationHours] = useState<number>(2);
  const [additionalRecipientEmail, setAdditionalRecipientEmail] = useState<string>('');
  const [inviteRecipientsList, setInviteRecipientsList] = useState<string[]>([
    'fleet.manager@greenshift.co.ke',
    'workshop.lead@greenshift.co.ke'
  ]);
  const [customInviteNotes, setCustomInviteNotes] = useState<string>('');

  // Track dispatched invites state
  const [dispatchedInvites, setDispatchedInvites] = useState<Record<string, { sentAt: string; recipients: string[] }>>({});

  // Compute 2026 Today Baseline
  const today = useMemo(() => new Date('2026-08-12'), []);

  // Generate Proposed Service Schedules based on Odometer Data
  const proposedSchedules = useMemo(() => {
    const activeVehicles = vehicles.length > 0 ? vehicles : [
      { id: 'v1', registrationNumber: 'KMG 482E', make: 'Roam', model: 'Air EV', category: 'Electric', odometerKm: 14850, assignedDriverName: 'Juma Omondi', assignedDriverPhone: '+254 722 104 889' },
      { id: 'v2', registrationNumber: 'KMC 102B', make: 'TVS', model: 'HLX 150', category: 'Fuel', odometerKm: 29900, assignedDriverName: 'Mary Wanjiku', assignedDriverPhone: '+254 733 902 114' },
      { id: 'v3', registrationNumber: 'KMD 903C', make: 'Spiro', model: 'Commuter EV', category: 'Electric', odometerKm: 9800, assignedDriverName: 'David Kamau', assignedDriverPhone: '+254 710 448 901' },
      { id: 'v4', registrationNumber: 'KMH 551F', make: 'BYD', model: 'Atto 3 EV', category: 'Electric', odometerKm: 24600, assignedDriverName: 'Grace Mutua', assignedDriverPhone: '+254 705 112 334' },
      { id: 'v5', registrationNumber: 'KMB 339A', make: 'Toyota', model: 'Fielder', category: 'Fuel', odometerKm: 44950, assignedDriverName: 'Hassan Ali', assignedDriverPhone: '+254 721 556 702' }
    ] as any[];

    return activeVehicles.map((v, idx) => {
      const pred = calculateVehicleComponentPredictions(v);
      const dailyRate = pred.dailyRateKm || 105;

      // Target service interval (every 5000 km)
      const intervalKm = 5000;
      const targetOdo = Math.ceil((v.odometerKm + 50) / intervalKm) * intervalKm;
      const remainingKm = targetOdo - v.odometerKm;

      // Calculate days to service
      const daysToService = Math.max(0, Math.ceil(remainingKm / dailyRate));

      const proposedDate = new Date(today);
      proposedDate.setDate(today.getDate() + daysToService);

      const proposedDateIso = proposedDate.toISOString().split('T')[0];
      const proposedDateFormatted = proposedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      let urgency: ProposedServiceSchedule['urgency'] = 'PLANNED';
      if (remainingKm <= 0 || daysToService === 0) {
        urgency = 'OVERDUE';
      } else if (daysToService <= 3) {
        urgency = 'CRITICAL';
      } else if (daysToService <= 10) {
        urgency = 'SCHEDULED';
      }

      // Service types
      const isEv = v.category === 'Electric';
      let serviceType = `${intervalKm.toLocaleString()} km Standard Preventive Inspection`;
      if (isEv) {
        serviceType = remainingKm <= 300 
          ? 'EV Battery Thermal Loop & Regenerative Braking Service'
          : 'EV Motor Coolant & Suspension Alignment Service';
      } else {
        serviceType = remainingKm <= 300 
          ? 'Engine Oil, Filter Replacement & Spark Plugs Servicing'
          : 'Drivetrain Chain & Brake Pad Maintenance';
      }

      const workshops = [
        'GreenShift EV Hub - Westlands, Nairobi',
        'Nairobi Central Fleet Workshop - Industrial Area',
        'Mombasa Road Depot & Charging Hub'
      ];

      const mechanics = [
        'Eng. Brian Kiprop (EV Specialist)',
        'Tech. Mercy Mwangi (Lead Mechanic)',
        'Eng. Peter Ochieng (Drivetrain Master)'
      ];

      const isDispatched = !!dispatchedInvites[v.id];

      return {
        id: `sched-${v.id}`,
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        makeModel: `${v.make} ${v.model}`,
        category: v.category,
        assignedDriver: v.assignedDriverName || 'Fleet Pool Driver',
        assignedDriverPhone: v.assignedDriverPhone || '+254 700 000 000',
        currentOdometerKm: v.odometerKm,
        dailyMileageRateKm: dailyRate,
        targetServiceOdometerKm: targetOdo,
        remainingKm,
        daysToService,
        proposedDateIso,
        proposedDateFormatted,
        urgency,
        serviceType,
        recommendedWorkshop: workshops[idx % workshops.length],
        assignedMechanic: mechanics[idx % mechanics.length],
        estimatedDurationHours: isEv ? 2 : 3,
        inviteSent: isDispatched,
        inviteSentAt: dispatchedInvites[v.id]?.sentAt,
        inviteRecipients: dispatchedInvites[v.id]?.recipients
      };
    }).sort((a, b) => a.daysToService - b.daysToService);
  }, [vehicles, today, dispatchedInvites]);

  // Filtered List
  const filteredSchedules = useMemo(() => {
    return proposedSchedules.filter(s => {
      if (filterUrgency === 'DUE_7_DAYS') return s.daysToService <= 7;
      if (filterUrgency === 'OVERDUE') return s.urgency === 'OVERDUE';
      if (filterUrgency === 'ELECTRIC_EV') return s.category === 'Electric';
      return true;
    });
  }, [proposedSchedules, filterUrgency]);

  // Helper: Download iCalendar (.ICS) File
  const handleDownloadIcs = (item: ProposedServiceSchedule) => {
    const startDateFormatted = item.proposedDateIso.replace(/-/g, '');
    const startTimeStr = '090000';
    const endTimeStr = '110000';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GreenShift Fleet Command//Automated Maintenance Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `SUMMARY:Fleet Service: ${item.registrationNumber} - ${item.serviceType}`,
      `DESCRIPTION:Automated Maintenance Booking\\nVehicle: ${item.makeModel} (${item.registrationNumber})\\nOdometer: ${item.currentOdometerKm.toLocaleString()} km\\nAssigned Driver: ${item.assignedDriver}\\nWorkshop: ${item.recommendedWorkshop}\\nAssigned Tech: ${item.assignedMechanic}\\nGenerated via GreenShift Telematics Scheduler.`,
      `LOCATION:${item.recommendedWorkshop}`,
      `DTSTART:${startDateFormatted}T${startTimeStr}`,
      `DTEND:${startDateFormatted}T${endTimeStr}`,
      'STATUS:CONFIRMED',
      'ORGANIZER;CN=GreenShift Fleet Team:mailto:maintenance@greenshift.co.ke',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Maintenance_Invite_${item.registrationNumber}_${item.proposedDateIso}.ics`;
    link.click();

    toast.success(`Calendar Invite (.ics) Downloaded for ${item.registrationNumber}`);
  };

  // Helper: Open Google Calendar Web Link
  const handleOpenGoogleCalendarLink = (item: ProposedServiceSchedule) => {
    const title = encodeURIComponent(`Fleet Service: ${item.registrationNumber} (${item.serviceType})`);
    const details = encodeURIComponent(`Automated Maintenance Service Schedule\nVehicle: ${item.makeModel} (${item.registrationNumber})\nCurrent Odometer: ${item.currentOdometerKm.toLocaleString()} km\nDriver: ${item.assignedDriver}\nAssigned Tech: ${item.assignedMechanic}\nLocation: ${item.recommendedWorkshop}`);
    const location = encodeURIComponent(item.recommendedWorkshop);
    
    // Dates format: YYYYMMDDTHHMMSSZ
    const dateFormatted = item.proposedDateIso.replace(/-/g, '');
    const dates = `${dateFormatted}T090000Z/${dateFormatted}T110000Z`;

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
    window.open(gcalUrl, '_blank');
  };

  // Open Modal to Dispatch Calendar Invites
  const handleOpenInviteModal = (item: ProposedServiceSchedule) => {
    setSelectedSchedule(item);
    // Include driver's email dynamically if available
    const driverEmail = `driver.${item.assignedDriver.toLowerCase().replace(/\s+/g, '.')}@greenshift.co.ke`;
    setInviteRecipientsList([
      'fleet.manager@greenshift.co.ke',
      'workshop.lead@greenshift.co.ke',
      driverEmail
    ]);
    setIsInviteModalOpen(true);
  };

  const handleAddRecipientEmail = () => {
    if (!additionalRecipientEmail.trim()) return;
    if (inviteRecipientsList.includes(additionalRecipientEmail.trim())) {
      toast.info('Recipient email already in list');
      return;
    }
    setInviteRecipientsList([...inviteRecipientsList, additionalRecipientEmail.trim()]);
    setAdditionalRecipientEmail('');
  };

  const handleRemoveRecipientEmail = (email: string) => {
    setInviteRecipientsList(inviteRecipientsList.filter(e => e !== email));
  };

  // Dispatch Calendar Invites to Fleet Team
  const handleDispatchCalendarInvites = () => {
    if (!selectedSchedule) return;

    const sentTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDispatchedInvites(prev => ({
      ...prev,
      [selectedSchedule.vehicleId]: {
        sentAt: `Today, ${sentTimestamp}`,
        recipients: [...inviteRecipientsList]
      }
    }));

    setIsInviteModalOpen(false);
    toast.success(`Calendar Invites Dispatched for ${selectedSchedule.registrationNumber}!`, {
      description: `Sent iCal invites to ${inviteRecipientsList.length} fleet team members for ${selectedSchedule.proposedDateFormatted}.`
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                Automated Odometer Maintenance Scheduler
              </h2>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Telematics Predictive Booking Engine</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Proposes optimal service dates using real-time daily odometer accumulation rates & dispatches calendar invites to fleet mechanics and drivers
            </p>
          </div>
        </div>

        {/* QUICK ACTION BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              filteredSchedules.forEach(item => handleDownloadIcs(item));
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download All .ICS Calendar Invites</span>
          </button>
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <span className="text-slate-400 text-[11px] font-bold uppercase">Filter Schedule:</span>
          
          <button
            onClick={() => setFilterUrgency('ALL')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
              filterUrgency === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Vehicles ({proposedSchedules.length})
          </button>

          <button
            onClick={() => setFilterUrgency('DUE_7_DAYS')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
              filterUrgency === 'DUE_7_DAYS' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Due Next 7 Days ({proposedSchedules.filter(s => s.daysToService <= 7).length})</span>
          </button>

          <button
            onClick={() => setFilterUrgency('OVERDUE')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
              filterUrgency === 'OVERDUE' ? 'bg-red-600 text-white shadow-md' : 'text-red-400 hover:text-red-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue ({proposedSchedules.filter(s => s.urgency === 'OVERDUE').length})</span>
          </button>

          <button
            onClick={() => setFilterUrgency('ELECTRIC_EV')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
              filterUrgency === 'ELECTRIC_EV' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>EV Vehicles ({proposedSchedules.filter(s => s.category === 'Electric').length})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono pr-2">
          Telematics Rate: <span className="text-white font-bold">85 - 130 km/day</span>
        </div>
      </div>

      {/* SCHEDULED PROPOSED MAINTENANCE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchedules.map((item) => {
          let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
          let borderHighlight = 'border-slate-800';

          if (item.urgency === 'OVERDUE' || item.remainingKm <= 0) {
            badgeColor = 'bg-red-500 text-white border-red-400 animate-pulse shadow-xs';
            borderHighlight = 'border-red-500/60 bg-red-950/20 ring-1 ring-red-500/30';
          } else if (item.urgency === 'CRITICAL' || item.remainingKm <= 150) {
            badgeColor = 'bg-amber-500 text-slate-950 font-black border-amber-400 animate-pulse shadow-xs';
            borderHighlight = 'border-amber-500/60 bg-amber-950/20 ring-1 ring-amber-500/30';
          } else if (item.remainingKm <= 500) {
            badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            borderHighlight = 'border-amber-500/40 bg-amber-950/10';
          } else if (item.urgency === 'SCHEDULED') {
            badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
            borderHighlight = 'border-indigo-500/30';
          }

          const isApproachingService = item.remainingKm <= 500;

          return (
            <div 
              key={item.id} 
              className={`bg-slate-950 p-4 rounded-xl border ${borderHighlight} flex flex-col justify-between space-y-4 shadow-lg relative`}
            >
              <div className="space-y-3">
                
                {/* Vehicle Title & Urgency Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-white font-mono">{item.registrationNumber}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                        {item.urgency}
                      </span>
                      {isApproachingService && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 border border-amber-400 animate-pulse flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>&le;500km</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.makeModel} • <span className="text-indigo-300">{item.category}</span></p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Proposed Date</div>
                    <div className="text-xs font-black text-emerald-400 font-mono">{item.proposedDateFormatted}</div>
                  </div>
                </div>

                {/* Service Details */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{item.serviceType}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1">
                      <span>Odometer: <strong className="text-white">{item.currentOdometerKm.toLocaleString()} km</strong></span>
                      <span>Target: <strong className="text-indigo-300">{item.targetServiceOdometerKm.toLocaleString()} km</strong></span>
                    </div>
                    {/* Service Interval Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 mt-1.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.remainingKm <= 0 ? 'bg-red-500 animate-pulse' :
                          item.remainingKm <= 150 ? 'bg-amber-500 animate-pulse' :
                          item.remainingKm <= 500 ? 'bg-amber-400' :
                          'bg-indigo-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.max(5, Math.round(((item.currentOdometerKm % 5000) / 5000) * 100)))}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Telematics Run Rate & Days Remaining */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase">Daily Mileage</span>
                      <strong className="text-slate-200">~{item.dailyMileageRateKm} km/day</strong>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[9px] uppercase">Est. Remaining</span>
                      <strong className={item.daysToService <= 3 ? 'text-amber-400' : 'text-emerald-400'}>
                        {item.remainingKm <= 0 ? '0 km (DUE NOW)' : `${item.remainingKm} km (~${item.daysToService}d)`}
                      </strong>
                    </div>
                  </div>

                  {/* Driver & Workshop */}
                  <div className="space-y-1 text-[11px] text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Driver: <strong>{item.assignedDriver}</strong> ({item.assignedDriverPhone})</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.recommendedWorkshop}</span>
                    </div>
                  </div>
                </div>

                {/* Calendar Invite Status */}
                {item.inviteSent && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg text-[11px] text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Calendar Invite Dispatched</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.inviteSentAt}</span>
                  </div>
                )}

              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                <button
                  onClick={() => handleDownloadIcs(item)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Download .ICS file"
                >
                  <Download className="w-3 h-3 text-indigo-400" />
                  <span>.ICS</span>
                </button>

                <button
                  onClick={() => handleOpenGoogleCalendarLink(item)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Open Google Calendar"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                  <span>Google Cal</span>
                </button>

                <button
                  onClick={() => handleOpenInviteModal(item)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black transition flex items-center gap-1 cursor-pointer shadow-md ml-auto"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Invites</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* DISPATCH TEAM CALENDAR INVITE MODAL */}
      {isInviteModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white">
                  Dispatch Maintenance Calendar Invites
                </h3>
              </div>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Service Summary Card */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-white text-sm">{selectedSchedule.registrationNumber}</span>
                <span className="text-emerald-400 font-bold font-mono">{selectedSchedule.proposedDateFormatted}</span>
              </div>
              <p className="text-slate-300 font-bold">{selectedSchedule.serviceType}</p>
              <p className="text-slate-400 text-[11px]">{selectedSchedule.recommendedWorkshop}</p>
            </div>

            {/* Time Slot & Duration */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Time Slot</label>
                <select
                  value={inviteTimeSlot}
                  onChange={(e) => setInviteTimeSlot(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 font-mono text-xs focus:border-indigo-500"
                >
                  <option value="08:30 AM">08:30 AM (Morning Shift)</option>
                  <option value="11:00 AM">11:00 AM (Midday Slot)</option>
                  <option value="02:00 PM">02:00 PM (Afternoon Shift)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Estimated Duration</label>
                <select
                  value={inviteDurationHours}
                  onChange={(e) => setInviteDurationHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 font-mono text-xs focus:border-indigo-500"
                >
                  <option value={1}>1 Hour (Quick Check)</option>
                  <option value={2}>2 Hours (Standard Service)</option>
                  <option value={4}>4 Hours (Full Overhaul)</option>
                </select>
              </div>
            </div>

            {/* Recipients List */}
            <div className="space-y-2 text-xs">
              <label className="block text-slate-400 font-bold">Fleet Team Invitees (Email)</label>

              <div className="flex items-center gap-2">
                <input 
                  type="email"
                  placeholder="e.g. mechanic.lead@greenshift.co.ke"
                  value={additionalRecipientEmail}
                  onChange={(e) => setAdditionalRecipientEmail(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2 focus:border-indigo-500"
                />
                <button
                  onClick={handleAddRecipientEmail}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Add Email
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {inviteRecipientsList.map(email => (
                  <span key={email} className="bg-slate-950 text-indigo-300 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{email}</span>
                    <button 
                      onClick={() => handleRemoveRecipientEmail(email)}
                      className="text-slate-500 hover:text-red-400 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="text-xs">
              <label className="block text-slate-400 font-bold mb-1">Custom Notes for Calendar Invite</label>
              <textarea
                rows={2}
                placeholder="Include workshop entry code or special spare part instructions..."
                value={customInviteNotes}
                onChange={(e) => setCustomInviteNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-xs focus:border-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchCalendarInvites}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch {inviteRecipientsList.length} Calendar Invites</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
