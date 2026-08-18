import React, { useState } from 'react';
import { DispatcherMessage, QuickReplyPreset, Driver, Vehicle } from '../types';
import { 
  Send, MessageSquare, Bell, Smartphone, ShieldAlert, CheckCheck, 
  Clock, Zap, Gauge, Users, Filter, Plus, Radio, Check, 
  AlertCircle, Sparkles, Navigation, RotateCcw, Search, ChevronRight, X, PhoneCall,
  UserCheck, CheckSquare, Square, Wifi, WifiOff
} from 'lucide-react';

interface MessagesModuleProps {
  messages: DispatcherMessage[];
  drivers: Driver[];
  vehicles: Vehicle[];
  prefilledDriver?: Driver | null;
  onSendMessage: (msg: Omit<DispatcherMessage, 'id' | 'messageCode' | 'timestamp' | 'deliveryStatus'>) => void;
  onSimulateDriverReply?: (messageId: string, replyChoice: string, note?: string) => void;
  onBulkAcknowledgeMessages?: (messageIds: string[]) => void;
}

// Built-in Default Quick Reply Templates for Fleet Dispatchers
export const DEFAULT_PRESETS: QuickReplyPreset[] = [
  {
    id: 'preset-1',
    category: 'EV & Battery Swap',
    title: 'Urgent Battery Swap Recall',
    messageContent: 'Your EV battery level is below 20%. Please head immediately to GreenShift Swapping Station B-04 (Kilimani) for a fresh battery swap.',
    defaultQuickReplies: ['Heading to Station Now', 'Swapping in 10 mins', 'Need Towing / Support'],
    defaultPriority: 'Urgent'
  },
  {
    id: 'preset-2',
    category: 'Safety & Speed',
    title: 'Speed Limit Warning (>80 km/h)',
    messageContent: 'Telematics detected speed exceeding 80 km/h on Waiyaki Way. Please reduce speed immediately to maintain your Weekly Safety Bonus eligibility.',
    defaultQuickReplies: ['Acknowledged - Slowing Down', 'Traffic Flow Safe', 'Spurious Alert'],
    defaultPriority: 'Critical Flash'
  },
  {
    id: 'preset-3',
    category: 'Operational Dispatch',
    title: 'Priority Customer Pickup Request',
    messageContent: 'High-value priority parcel pickup available near your location (Westlands Commercial Hub). Accept job via driver app or acknowledge.',
    defaultQuickReplies: ['Accept Job & Proceeding', 'On Current Trip - Decline', '5 mins Away'],
    defaultPriority: 'Normal'
  },
  {
    id: 'preset-4',
    category: 'Route & Traffic',
    title: 'Mombasa Road Traffic Reroute',
    messageContent: 'Heavy congestion reported along Mombasa Road near JKIA junction. Reroute via Southern Bypass / Expressway to avoid delivery delay.',
    defaultQuickReplies: ['Rerouting via Expressway', 'Already Past Congestion', 'Acknowledged'],
    defaultPriority: 'Info'
  },
  {
    id: 'preset-5',
    category: 'Financial & Targets',
    title: 'Daily Target Milestone Unlocked',
    messageContent: 'Congratulations! You have completed 12 trips today and reached your Daily Target. A KES 300 incentive bonus has been credited to your M-Pesa ledger.',
    defaultQuickReplies: ['Thank You Dispatch!', 'Claiming Bonus', 'Continuing Shift'],
    defaultPriority: 'Info'
  },
  {
    id: 'preset-6',
    category: 'Maintenance Recall',
    title: 'Mandatory Service & NTSA Inspection',
    messageContent: 'Your assigned vehicle is due for 10,000 km routine maintenance and NTSA safety inspection. Report to Central Workshop before 17:00 EAT.',
    defaultQuickReplies: ['Reporting at 16:00', 'Vehicle in Workshop', 'Request Extension'],
    defaultPriority: 'Urgent'
  }
];

export const MessagesModule: React.FC<MessagesModuleProps> = ({
  messages = [],
  drivers = [],
  vehicles = [],
  prefilledDriver = null,
  onSendMessage,
  onSimulateDriverReply,
  onBulkAcknowledgeMessages
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'LOGS' | 'PRESETS'>('DISPATCH');

  // Bulk Selection State for Outbox Log Messages
  const [selectedLogMessageIds, setSelectedLogMessageIds] = useState<string[]>([]);

  // Automatically select prefilled driver if passed
  React.useEffect(() => {
    if (prefilledDriver) {
      setActiveTab('DISPATCH');
      setTargetType('Individual');
      setSelectedDriverId(prefilledDriver.id);
    }
  }, [prefilledDriver]);

  const handleToggleLogMessageSelect = (msgId: string) => {
    setSelectedLogMessageIds(prev =>
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const handleSelectAllFilteredLogMessages = (filteredMsgs: DispatcherMessage[]) => {
    setSelectedLogMessageIds(filteredMsgs.map(m => m.id));
  };

  const handleSelectUnacknowledgedLogMessages = (filteredMsgs: DispatcherMessage[]) => {
    const unackIds = filteredMsgs
      .filter(m => m.deliveryStatus !== 'Replied' && !m.driverReply)
      .map(m => m.id);
    setSelectedLogMessageIds(unackIds);
  };

  const handleClearLogMessageSelection = () => {
    setSelectedLogMessageIds([]);
  };

  const handleExecuteBulkAcknowledge = () => {
    if (selectedLogMessageIds.length === 0) return;

    if (onBulkAcknowledgeMessages) {
      onBulkAcknowledgeMessages(selectedLogMessageIds);
    } else if (onSimulateDriverReply) {
      selectedLogMessageIds.forEach(id => {
        onSimulateDriverReply(id, 'Acknowledged by Dispatcher', 'Bulk Acknowledged');
      });
    }

    setSuccessToast(`${selectedLogMessageIds.length} message(s) bulk acknowledged and status updated to 'Replied'!`);
    setSelectedLogMessageIds([]);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // New Message Form State
  const [targetType, setTargetType] = useState<'Individual' | 'Multi-Select' | 'Broadcast Group'>('Individual');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>(
    drivers.length > 0 ? [drivers[0].id] : []
  );
  const [driverPickerSearch, setDriverPickerSearch] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All Online Drivers');
  const [category, setCategory] = useState<DispatcherMessage['category']>('Operational Dispatch');
  const [priority, setPriority] = useState<DispatcherMessage['priority']>('Normal');
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [quickReplyOptions, setQuickReplyOptions] = useState<string[]>(['Acknowledge', 'On My Way', 'Need Help']);
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [requiresAck, setRequiresAck] = useState<boolean>(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper function to check if a driver is currently online
  const isDriverOnline = (d?: Driver) => {
    if (!d) return false;
    return d.status === 'Online' || d.status === 'On Trip' || d.status === 'Active';
  };

  // Helper function to filter group drivers
  const getGroupMatchingDrivers = (groupName: string) => {
    switch (groupName) {
      case 'All Online Drivers':
        return drivers.filter(isDriverOnline);
      case 'Electric Vehicle Drivers Only':
        return drivers.filter(d => {
          const v = vehicles.find(veh => veh.id === d.assignedVehicleId);
          return v?.category === 'Electric';
        });
      case 'Fuel Motorbike Fleet':
        return drivers.filter(d => {
          const v = vehicles.find(veh => veh.id === d.assignedVehicleId);
          return v?.category === 'Fuel';
        });
      case 'Nairobi Region Fleet':
        return drivers.filter(d => d.city === 'Nairobi');
      case 'Mombasa Region Fleet':
        return drivers.filter(d => d.city === 'Mombasa');
      case 'Drivers with Low Battery (<20%)':
        return drivers.filter(d => {
          const v = vehicles.find(veh => veh.id === d.assignedVehicleId);
          return v?.category === 'Electric' && (v.currentSoCPercent || 0) < 20;
        });
      case 'Over Speed Limit Drivers (>80 km/h)':
        return drivers.filter(d => {
          const v = vehicles.find(veh => veh.id === d.assignedVehicleId);
          return (v?.currentLocation?.speedKmh || 0) > 80;
        });
      default:
        return drivers;
    }
  };

  // Dynamic Recipient & Online Counter Computations
  let targetRecipientsList: Driver[] = [];
  if (targetType === 'Individual') {
    const sel = drivers.find(d => d.id === selectedDriverId);
    if (sel) targetRecipientsList = [sel];
  } else if (targetType === 'Multi-Select') {
    targetRecipientsList = drivers.filter(d => selectedDriverIds.includes(d.id));
  } else {
    targetRecipientsList = getGroupMatchingDrivers(selectedGroup);
  }

  const totalRecipientsCount = targetRecipientsList.length;
  const onlineRecipientsCount = targetRecipientsList.filter(isDriverOnline).length;

  // Multi-select actions
  const handleToggleDriverSelect = (driverId: string) => {
    setSelectedDriverIds(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const handleSelectAllOnline = () => {
    const onlineIds = drivers.filter(isDriverOnline).map(d => d.id);
    setSelectedDriverIds(onlineIds);
  };

  const handleSelectAllDrivers = () => {
    setSelectedDriverIds(drivers.map(d => d.id));
  };

  const handleClearDriverSelection = () => {
    setSelectedDriverIds([]);
  };

  // Selected preset for Quick Dispatch
  const [activePreset, setActivePreset] = useState<QuickReplyPreset | null>(null);

  // Apply Quick Reply Preset into form
  const handleApplyPreset = (preset: QuickReplyPreset) => {
    setActivePreset(preset);
    setCategory(preset.category);
    setSubject(preset.title);
    setContent(preset.messageContent);
    setQuickReplyOptions([...preset.defaultQuickReplies]);
    setPriority(preset.defaultPriority);
  };

  const handleAddQuickReplyOption = () => {
    if (!newOptionInput.trim()) return;
    if (quickReplyOptions.length >= 4) return;
    setQuickReplyOptions(prev => [...prev, newOptionInput.trim()]);
    setNewOptionInput('');
  };

  const handleRemoveOption = (index: number) => {
    setQuickReplyOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    if (targetType === 'Individual') {
      const selDriver = drivers.find(d => d.id === selectedDriverId);
      if (!selDriver) return;

      onSendMessage({
        senderRole: 'Dispatch Command',
        targetType: 'Individual',
        recipientDriverId: selDriver.id,
        recipientDriverName: selDriver.fullName,
        recipientDriverPhone: selDriver.phone,
        recipientVehicleReg: selDriver.assignedVehicleReg,
        category,
        priority,
        subject,
        content,
        quickReplyOptions,
        requiresAck
      });

      setSuccessToast(`Instruction dispatched to ${selDriver.fullName} (${isDriverOnline(selDriver) ? 'Online' : 'Offline'})!`);
    } else if (targetType === 'Multi-Select') {
      if (selectedDriverIds.length === 0) {
        alert('Please select at least one driver recipient.');
        return;
      }

      const selectedDriversList = drivers.filter(d => selectedDriverIds.includes(d.id));
      const onlineCount = selectedDriversList.filter(isDriverOnline).length;

      // Dispatch individual messages to each selected driver
      selectedDriversList.forEach(d => {
        onSendMessage({
          senderRole: 'Dispatch Command',
          targetType: 'Individual',
          recipientDriverId: d.id,
          recipientDriverName: d.fullName,
          recipientDriverPhone: d.phone,
          recipientVehicleReg: d.assignedVehicleReg,
          category,
          priority,
          subject,
          content,
          quickReplyOptions,
          requiresAck
        });
      });

      setSuccessToast(`Broadcast instruction dispatched to ${selectedDriversList.length} selected drivers (${onlineCount} currently online)!`);
    } else {
      // Broadcast Group
      const groupDriversList = getGroupMatchingDrivers(selectedGroup);
      const onlineCount = groupDriversList.filter(isDriverOnline).length;

      onSendMessage({
        senderRole: 'Dispatch Command',
        targetType: 'Broadcast Group',
        recipientGroup: `${selectedGroup} (${groupDriversList.length} drivers, ${onlineCount} online)`,
        category,
        priority,
        subject,
        content,
        quickReplyOptions,
        requiresAck
      });

      setSuccessToast(`Group Broadcast dispatched to ${selectedGroup} (${groupDriversList.length} drivers, ${onlineCount} online)!`);
    }

    setTimeout(() => setSuccessToast(null), 4000);

    // Reset some fields
    setSubject('');
    setContent('');
    setActivePreset(null);
  };

  // Filter messages list
  const filteredMessages = messages.filter(m => {
    const matchesCat = selectedCategoryFilter === 'All' || m.category === selectedCategoryFilter;
    const matchesPri = selectedPriorityFilter === 'All' || m.priority === selectedPriorityFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || 
      m.subject.toLowerCase().includes(q) || 
      m.content.toLowerCase().includes(q) || 
      (m.recipientDriverName && m.recipientDriverName.toLowerCase().includes(q)) ||
      (m.recipientGroup && m.recipientGroup.toLowerCase().includes(q));

    return matchesCat && matchesPri && matchesQuery;
  });

  const totalSent = messages.length;
  const totalReplied = messages.filter(m => m.deliveryStatus === 'Replied' || m.driverReply).length;
  const responseRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 100;
  const criticalCount = messages.filter(m => m.priority === 'Critical Flash' || m.priority === 'Urgent').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-slate-950 px-5 py-3 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-emerald-400 animate-bounce">
          <CheckCheck className="w-5 h-5 text-slate-950" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Driver Mobile App Dispatcher Messaging & Quick-Reply System</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Push real-time pre-defined instructions, route alerts, battery recall warnings, and quick-reply action cards directly to driver mobile apps.
          </p>
        </div>

        {/* Tab Switchers */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
              activeTab === 'DISPATCH' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Center</span>
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
              activeTab === 'LOGS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Outbox & Driver Replies ({messages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PRESETS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
              activeTab === 'PRESETS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick-Reply Templates</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Dispatched Alerts</span>
            <Send className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{totalSent} Messages</div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCheck className="w-3 h-3" />
            <span>99.8% Pushed to Driver Mobile Apps</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Driver Quick-Reply Rate</span>
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{responseRate}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Avg response time: 1m 24s</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Critical & Urgent Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">{criticalCount} Active</div>
          <p className="text-[11px] text-red-300 mt-1">Includes Battery & Speeding Flashes</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Pre-defined Presets</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{DEFAULT_PRESETS.length} Templates</div>
          <p className="text-[11px] text-amber-200 mt-1">Instant 1-click dispatching</p>
        </div>
      </div>

      {/* TAB 1: DISPATCH CENTER & LIVE DRIVER MOBILE APP PREVIEW */}
      {activeTab === 'DISPATCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Quick Reply Presets Bar & Dispatch Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Quick Presets Picker */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>1-Click Pre-Defined Quick-Reply Presets</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Select to Auto-fill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEFAULT_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    type="button"
                    className={`p-3 rounded-xl border text-left transition relative group hover:border-indigo-500/70 ${
                      activePreset?.id === preset.id
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                        {preset.category}
                      </span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                        preset.defaultPriority === 'Critical Flash' ? 'bg-red-500/20 text-red-400' :
                        preset.defaultPriority === 'Urgent' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {preset.defaultPriority}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {preset.messageContent}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dispatch Form */}
            <form onSubmit={handleSubmitDispatch} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-400" />
                  <span>Compose Driver Mobile Instruction & Quick-Reply Card</span>
                </h3>
                {activePreset && (
                  <button
                    type="button"
                    onClick={() => setActivePreset(null)}
                    className="text-[11px] text-amber-400 hover:underline font-mono"
                  >
                    Clear Preset
                  </button>
                )}
              </div>

              {/* Target Type & Recipient Selector */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Target Dispatch Mode</label>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs gap-1">
                    <button
                      type="button"
                      onClick={() => setTargetType('Individual')}
                      className={`flex-1 py-1.5 font-bold rounded-md transition ${
                        targetType === 'Individual' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Individual Driver
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('Multi-Select')}
                      className={`flex-1 py-1.5 font-bold rounded-md transition flex items-center justify-center gap-1.5 ${
                        targetType === 'Multi-Select' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Multi-Select ({selectedDriverIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('Broadcast Group')}
                      className={`flex-1 py-1.5 font-bold rounded-md transition ${
                        targetType === 'Broadcast Group' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fleet Group
                    </button>
                  </div>
                </div>

                {/* Target Recipient Picker based on mode */}
                {targetType === 'Individual' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1">Select Single Driver Recipient</label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.phone}) • {d.assignedVehicleReg || 'No Vehicle'} [{isDriverOnline(d) ? 'Online 🟢' : 'Offline ⚪'}]
                        </option>
                      ))}
                    </select>

                    {/* Pre-filled Driver & Phone Confirmation Card */}
                    {targetRecipientsList[0] && (
                      <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center shrink-0">
                            <Smartphone className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{targetRecipientsList[0].fullName}</span>
                              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                Pre-filled Recipient
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                              Phone Number: <strong className="text-emerald-400 font-bold">{targetRecipientsList[0].phone}</strong> • DL: {targetRecipientsList[0].drivingLicenseNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : targetType === 'Multi-Select' ? (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Select Multiple Driver Recipients ({selectedDriverIds.length} Selected)</span>
                      </span>

                      {/* Quick Select Actions */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={handleSelectAllOnline}
                          className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold rounded border border-emerald-500/40 transition"
                        >
                          Select Online Only ({drivers.filter(isDriverOnline).length})
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectAllDrivers}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded border border-slate-700 transition"
                        >
                          Select All ({drivers.length})
                        </button>
                        <button
                          type="button"
                          onClick={handleClearDriverSelection}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded border border-slate-800 transition"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Filter search bar inside picker */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter drivers by name, phone, or vehicle reg..."
                        value={driverPickerSearch}
                        onChange={(e) => setDriverPickerSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Checkbox driver list */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-900">
                      {drivers
                        .filter(d => {
                          const q = driverPickerSearch.toLowerCase();
                          return !q || d.fullName.toLowerCase().includes(q) || d.phone.includes(q) || (d.assignedVehicleReg && d.assignedVehicleReg.toLowerCase().includes(q));
                        })
                        .map(d => {
                          const isSelected = selectedDriverIds.includes(d.id);
                          const online = isDriverOnline(d);
                          return (
                            <label
                              key={d.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                                isSelected ? 'bg-indigo-950/60 border border-indigo-500/40 text-white' : 'hover:bg-slate-900/80 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleDriverSelect(d.id)}
                                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                                />
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{d.fullName}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">({d.phone})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Vehicle: <span className="text-slate-300 font-mono">{d.assignedVehicleReg || 'Unassigned'}</span> • {d.city}
                                  </div>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                                online ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                <span>{online ? 'Online' : 'Offline'}</span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Select Target Fleet Group</label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="All Online Drivers">All Online Drivers ({drivers.filter(isDriverOnline).length} drivers)</option>
                      <option value="Electric Vehicle Drivers Only">Electric Vehicle (EV) Drivers Only</option>
                      <option value="Fuel Motorbike Fleet">Fuel Motorbike Fleet</option>
                      <option value="Nairobi Region Fleet">Nairobi Region Fleet</option>
                      <option value="Mombasa Region Fleet">Mombasa Region Fleet</option>
                      <option value="Drivers with Low Battery (<20%)">Drivers with Low Battery (&lt;20%)</option>
                      <option value="Over Speed Limit Drivers (>80 km/h)">Over Speed Limit Drivers (&gt;80 km/h)</option>
                    </select>
                  </div>
                )}

                {/* Real-time Recipient Visual Counter Badge */}
                <div className="bg-slate-950 p-3 rounded-xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 text-xs shadow-inner">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                    <span className="text-slate-400 font-medium">Target Recipients:</span>
                    <span className="font-extrabold text-white font-mono bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
                      {totalRecipientsCount} {totalRecipientsCount === 1 ? 'Driver' : 'Drivers'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Currently Online:</span>
                    <span className="font-black text-emerald-400 font-mono bg-emerald-950/80 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span>{onlineRecipientsCount} Online</span>
                      <span className="text-[10px] text-emerald-400/70">
                        ({totalRecipientsCount > 0 ? Math.round((onlineRecipientsCount / totalRecipientsCount) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Instruction Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Operational Dispatch">Operational Dispatch</option>
                    <option value="EV & Battery Swap">EV & Battery Swap</option>
                    <option value="Safety & Speed">Safety & Speed</option>
                    <option value="Financial & Targets">Financial & Targets</option>
                    <option value="Route & Traffic">Route & Traffic</option>
                    <option value="Maintenance Recall">Maintenance Recall</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Alert Priority & Flash Mode</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Info">Info (Standard Notification)</option>
                    <option value="Normal">Normal Dispatch</option>
                    <option value="Urgent">Urgent (High Banner)</option>
                    <option value="Critical Flash">Critical Flash (Full Screen SOS Overlay)</option>
                  </select>
                </div>
              </div>

              {/* Subject Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Instruction Subject / Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swapping Station Recall or Speeding Warning"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Instruction Details / Driver Message Body</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide explicit instructions or guidance to driver..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Pre-defined Quick Reply Choices attached to message */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span>Pre-defined Driver Quick-Reply Action Buttons</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Max 4 options</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  These quick-response buttons will appear directly on the driver's mobile phone screen for 1-tap responses.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {quickReplyOptions.map((opt, idx) => (
                    <span 
                      key={idx}
                      className="bg-indigo-950 text-indigo-200 border border-indigo-500/40 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>{opt}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {quickReplyOptions.length < 4 && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add custom quick reply option (e.g. 'Delayed by Traffic')"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuickReplyOption(); } }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuickReplyOption}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition border border-slate-700"
                    >
                      Add Option
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Dispatch */}
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl text-xs transition shadow-lg shadow-indigo-950/80 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>PUSH INSTRUCTION CARD TO DRIVER MOBILE APP</span>
              </button>
            </form>

          </div>

          {/* Right Column: Live Driver Smartphone Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Driver Mobile App Live Preview</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  GreenShift Mobile v3.2
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mb-4">
                Interactive preview of how the notification &amp; quick-reply action card renders on the driver's mobile device screen.
              </p>

              {/* Smartphone Frame */}
              <div className="mx-auto w-[280px] bg-slate-950 border-4 border-slate-800 rounded-[36px] p-3 shadow-2xl relative overflow-hidden text-white font-sans">
                
                {/* Phone Notch / Speaker */}
                <div className="w-24 h-4 bg-slate-900 mx-auto rounded-b-xl mb-3 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Phone Status Bar */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 px-2 mb-2 font-mono">
                  <span>15:32</span>
                  <span>5G • 89%</span>
                </div>

                {/* Mobile App Header */}
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                      GS
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-white leading-tight">GreenShift Driver App</div>
                      <div className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Recipients: {totalRecipientsCount} ({onlineRecipientsCount} Online)</span>
                      </div>
                    </div>
                  </div>
                  <Bell className="w-3.5 h-3.5 text-slate-400 animate-bounce" />
                </div>

                {/* Driver Notification Card */}
                <div className={`p-3.5 rounded-2xl border space-y-2.5 transition shadow-xl ${
                  priority === 'Critical Flash' ? 'bg-red-950/80 border-red-500 animate-pulse' :
                  priority === 'Urgent' ? 'bg-amber-950/60 border-amber-500' :
                  'bg-slate-900 border-indigo-500/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 font-mono">
                      {category}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                      priority === 'Critical Flash' ? 'bg-red-500 text-slate-950' : 'bg-indigo-500 text-white'
                    }`}>
                      {priority}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-white leading-tight">
                      {subject || 'Instruction Subject Preview'}
                    </h4>
                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                      {content || 'Enter message content on the left form or select a quick preset to preview here.'}
                    </p>
                  </div>

                  {/* Quick-reply interactive buttons on mobile */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                      Quick Action Reply (1-Tap):
                    </div>
                    {quickReplyOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => alert(`Simulated Driver click: "${opt}" sent back to Dispatcher!`)}
                        className="w-full bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition text-center shadow-xs border border-indigo-400/40"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <div className="text-[8px] text-slate-500 text-center font-mono pt-1">
                    Dispatched via GreenShift Fleet Command
                  </div>
                </div>

                {/* Phone Bottom Home Bar */}
                <div className="w-16 h-1 bg-slate-800 mx-auto rounded-full mt-4" />
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: OUTBOX & DRIVER REPLIES LOG */}
      {activeTab === 'LOGS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Dispatched Instructions & Driver Reply Thread Log</h3>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search subject or driver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs p-1.5 rounded-lg"
              >
                <option value="All">All Categories</option>
                <option value="Operational Dispatch">Operational Dispatch</option>
                <option value="EV & Battery Swap">EV & Battery Swap</option>
                <option value="Safety & Speed">Safety & Speed</option>
                <option value="Financial & Targets">Financial & Targets</option>
                <option value="Route & Traffic">Route & Traffic</option>
                <option value="Maintenance Recall">Maintenance Recall</option>
              </select>

              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs p-1.5 rounded-lg"
              >
                <option value="All">All Priorities</option>
                <option value="Info">Info</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical Flash">Critical Flash</option>
              </select>
            </div>
          </div>

          {/* Multi-Select & Bulk Action Toolbar */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>Multi-Select Dispatch Messages:</span>
              </span>

              <button
                type="button"
                onClick={() => handleSelectUnacknowledgedLogMessages(filteredMessages)}
                className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 font-bold rounded border border-amber-500/40 transition text-[11px] cursor-pointer"
              >
                Select Unacknowledged ({filteredMessages.filter(m => m.deliveryStatus !== 'Replied' && !m.driverReply).length})
              </button>

              <button
                type="button"
                onClick={() => handleSelectAllFilteredLogMessages(filteredMessages)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded border border-slate-700 transition text-[11px] cursor-pointer"
              >
                Select All ({filteredMessages.length})
              </button>

              {selectedLogMessageIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogMessageSelection}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded border border-slate-800 transition text-[11px] cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {selectedLogMessageIds.length > 0 && (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                <span className="font-bold text-emerald-400 font-mono">
                  {selectedLogMessageIds.length} Selected
                </span>
                <button
                  type="button"
                  onClick={handleExecuteBulkAcknowledge}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-1.5 rounded-lg text-xs transition shadow-lg shadow-emerald-950/80 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Bulk Acknowledge ({selectedLogMessageIds.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Outbox List */}
          {filteredMessages.length > 0 ? (
            <div className="space-y-3">
              {filteredMessages.map(msg => {
                const isSelected = selectedLogMessageIds.includes(msg.id);
                return (
                  <div 
                    key={msg.id}
                    className={`rounded-xl p-4 shadow-md space-y-3 transition border ${
                      isSelected 
                        ? 'bg-emerald-950/30 border-emerald-500/80 shadow-emerald-950/50' 
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleLogMessageSelect(msg.id)}
                          className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
                        />
                        <span className="font-mono text-xs font-bold text-indigo-400">{msg.messageCode}</span>
                        <span className="text-xs text-slate-400">• {msg.timestamp}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {msg.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          msg.priority === 'Critical Flash' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                          msg.priority === 'Urgent' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {msg.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Target:</span>
                        <span className="text-xs font-bold text-white bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                          {msg.targetType === 'Individual' ? `${msg.recipientDriverName} (${msg.recipientVehicleReg || 'Vehicle'})` : msg.recipientGroup}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          msg.deliveryStatus === 'Replied' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          <CheckCheck className="w-3 h-3" />
                          <span>{msg.deliveryStatus}</span>
                        </span>
                      </div>
                    </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{msg.subject}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Quick reply options attached */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                    <span className="text-[11px] text-slate-500 font-bold uppercase">Pre-defined Options Sent:</span>
                    {msg.quickReplyOptions.map((opt, i) => (
                      <span key={i} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                        {opt}
                      </span>
                    ))}
                  </div>

                  {/* Driver Response or Interactive Quick Reply Simulator */}
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {msg.driverReply ? (
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-lg shrink-0">
                          <CheckCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                            <span>Driver Quick Reply Received: "{msg.driverReply.choice}"</span>
                            <span className="text-[10px] text-slate-400 font-normal">at {msg.driverReply.timestamp}</span>
                          </div>
                          {msg.driverReply.note && (
                            <p className="text-[11px] text-slate-300 italic mt-0.5">"{msg.driverReply.note}"</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="text-xs text-amber-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Awaiting Driver Mobile App Quick-Reply...</span>
                        </div>

                        {/* Interactive Simulation Buttons for Dispatcher Testing */}
                        {onSimulateDriverReply && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-mono">Test Driver Click:</span>
                            {msg.quickReplyOptions.map((opt, idx) => (
                              <button
                                key={idx}
                                onClick={() => onSimulateDriverReply(msg.id, opt)}
                                className="bg-emerald-950/80 hover:bg-emerald-600 hover:text-slate-950 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md text-[11px] font-bold transition"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              No dispatched messages found matching the selected filters.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRESETS TEMPLATES MANAGER */}
      {activeTab === 'PRESETS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Pre-defined Dispatcher Quick-Reply Templates</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard operational quick reply templates used by GreenShift dispatchers for instant response.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_PRESETS.map(preset => (
              <div 
                key={preset.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {preset.category}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {preset.defaultPriority}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">{preset.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {preset.messageContent}
                </p>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Attached Quick Replies:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.defaultQuickReplies.map((r, i) => (
                      <span key={i} className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleApplyPreset(preset);
                    setActiveTab('DISPATCH');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Use Template in Dispatcher</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
