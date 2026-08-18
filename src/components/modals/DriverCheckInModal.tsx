import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Clock, ShieldCheck, CheckCircle2, User, Phone, 
  Bike, AlertCircle, FileText, Zap, Fuel, Navigation, UserCheck, History, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Driver, Vehicle, DriverCheckInRecord } from '../../types';

interface DriverCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  preselectedDriver?: Driver | null;
  onCheckInSubmit: (record: DriverCheckInRecord) => void;
  existingCheckIns?: DriverCheckInRecord[];
}

// Initial demo check-ins
const DEMO_CHECK_INS: DriverCheckInRecord[] = [
  {
    id: 'chk-1',
    driverId: 'drv-1',
    driverName: 'Juma Omondi',
    driverPhone: '+254712345678',
    vehicleReg: 'KMG 482E',
    checkInTime: 'Today, 06:45 AM',
    startLocation: 'Nairobi CBD Electric Depot, Enterprise Rd',
    shiftStatus: 'On Duty',
    energyStartLevel: '94% SoC (Battery)',
    odometerReadingKm: 18420,
    helmetGearVerified: true,
    psvBadgeVerified: true,
    notes: 'Morning shift check-in. Vehicle clean and battery fully charged at depot station.'
  },
  {
    id: 'chk-2',
    driverId: 'drv-2',
    driverName: 'Grace Wambui',
    driverPhone: '+254723456789',
    vehicleReg: 'KCD 119M',
    checkInTime: 'Today, 07:15 AM',
    startLocation: 'Westlands Commercial Hub, Nairobi',
    shiftStatus: 'On Duty',
    energyStartLevel: '12 Liters (Fuel)',
    odometerReadingKm: 42100,
    helmetGearVerified: true,
    psvBadgeVerified: true,
    notes: 'Shift started on time. Pre-trip inspection passed.'
  }
];

export const DriverCheckInModal: React.FC<DriverCheckInModalProps> = ({
  isOpen,
  onClose,
  drivers = [],
  vehicles = [],
  preselectedDriver,
  onCheckInSubmit,
  existingCheckIns = []
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [startLocation, setStartLocation] = useState<string>('Nairobi CBD Depot');
  const [shiftStatus, setShiftStatus] = useState<DriverCheckInRecord['shiftStatus']>('On Duty');
  const [energyStartLevel, setEnergyStartLevel] = useState<string>('88% SoC');
  const [odometerReadingKm, setOdometerReadingKm] = useState<string>('18450');
  const [helmetGearVerified, setHelmetGearVerified] = useState<boolean>(true);
  const [psvBadgeVerified, setPsvBadgeVerified] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  const [checkInsList, setCheckInsList] = useState<DriverCheckInRecord[]>(() => {
    return existingCheckIns.length > 0 ? existingCheckIns : DEMO_CHECK_INS;
  });

  // Sync driver selection when preselectedDriver changes
  useEffect(() => {
    if (preselectedDriver) {
      setSelectedDriverId(preselectedDriver.id);
    } else if (drivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [preselectedDriver, drivers]);

  const activeDriver = drivers.find(d => d.id === selectedDriverId) || drivers[0] || null;
  const assignedVehicle = activeDriver 
    ? vehicles.find(v => v.id === activeDriver.assignedVehicleId || v.registrationNumber === activeDriver.assignedVehicleReg)
    : null;

  // Auto fill energy & odometer when driver is selected
  useEffect(() => {
    if (assignedVehicle) {
      if (assignedVehicle.category === 'Electric') {
        setEnergyStartLevel(`${assignedVehicle.currentSoCPercent}% SoC (Battery)`);
      } else {
        setEnergyStartLevel(`${assignedVehicle.currentFuelLiters} L (Fuel)`);
      }
      setOdometerReadingKm(assignedVehicle.odometerKm.toString());
    }
  }, [selectedDriverId]);

  if (!isOpen) return null;

  const handleUseCurrentGPS = () => {
    if (activeDriver) {
      setStartLocation(`${activeDriver.city} Operations Hub (GPS Verified)`);
      toast.success('GPS Location verified and loaded into check-in.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeDriver) {
      toast.error('Please select a driver to complete check-in.');
      return;
    }

    if (!startLocation.trim()) {
      toast.error('Please enter or select a start-of-day location.');
      return;
    }

    const newRecord: DriverCheckInRecord = {
      id: `chk-${Date.now()}`,
      driverId: activeDriver.id,
      driverName: activeDriver.fullName,
      driverPhone: activeDriver.phone,
      vehicleReg: activeDriver.assignedVehicleReg || assignedVehicle?.registrationNumber,
      checkInTime: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      startLocation: startLocation.trim(),
      shiftStatus: shiftStatus,
      energyStartLevel: energyStartLevel,
      odometerReadingKm: parseInt(odometerReadingKm) || 0,
      helmetGearVerified: helmetGearVerified,
      psvBadgeVerified: psvBadgeVerified,
      notes: notes.trim()
    };

    // Callback
    onCheckInSubmit(newRecord);
    setCheckInsList(prev => [newRecord, ...prev]);

    toast.success(`Check-in logged for ${activeDriver.fullName}! Shift status updated to '${shiftStatus}'.`);

    // Reset form & switch to history tab or close
    setActiveTab('history');
  };

  const QUICK_LOCATIONS = [
    'Nairobi CBD Depot',
    'Westlands Hub',
    'Industrial Area Yard',
    'Kilimani Station',
    'Mombasa Port Gate A',
    'Kisumu Main Depot'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Rider Shift System
                </span>
                <span className="text-xs text-slate-400 font-mono">Daily Attendance</span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Driver Start-of-Day Check-in
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2 gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'form'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>New Check-in Entry</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Check-in Logs Today ({checkInsList.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Driver Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Select Commercial Driver / Rider:
                </label>
                <div className="relative">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.phone}) — {d.assignedVehicleReg ? `Assigned: ${d.assignedVehicleReg}` : 'No Vehicle'} [{d.city}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Driver & Assigned Asset Card Preview */}
              {activeDriver && (
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img 
                      src={activeDriver.profilePhotoUrl} 
                      alt={activeDriver.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-500/40"
                    />
                    <div>
                      <div className="font-bold text-white text-sm">{activeDriver.fullName}</div>
                      <div className="text-slate-400 text-[11px]">{activeDriver.phone} • License: <span className="font-mono text-slate-300">{activeDriver.drivingLicenseNumber}</span></div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Current Shift Status</div>
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
                      {activeDriver.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Start-of-Day Location & Quick Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Start-of-Day Dispatch Location:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentGPS}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>GPS Auto-Detect</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="e.g. Enterprise Road Fleet Depot, Nairobi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />

                {/* Quick location chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_LOCATIONS.map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setStartLocation(loc)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium transition"
                    >
                      + {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift Status & Start Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Shift Status Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Shift Status:
                  </label>
                  <select
                    value={shiftStatus}
                    onChange={(e) => setShiftStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="On Duty">🟢 On Duty (Active Shift)</option>
                    <option value="En Route to Shift">🟡 En Route to Shift / Depot</option>
                    <option value="On Break">⏸️ On Break</option>
                    <option value="Off Duty">🔴 Off Duty</option>
                  </select>
                </div>

                {/* Energy / Fuel Start Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Start Energy / Fuel Level:
                  </label>
                  <input
                    type="text"
                    value={energyStartLevel}
                    onChange={(e) => setEnergyStartLevel(e.target.value)}
                    placeholder="e.g. 92% SoC or 14 L Fuel"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

              </div>

              {/* Odometer Reading */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Current Odometer Reading (km):
                </label>
                <input
                  type="number"
                  value={odometerReadingKm}
                  onChange={(e) => setOdometerReadingKm(e.target.value)}
                  placeholder="e.g. 18450"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Pre-Shift Compliance Checkbox Checklist */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pre-Trip Safety & Compliance Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={helmetGearVerified}
                      onChange={(e) => setHelmetGearVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-slate-200 font-medium">Helmet / Reflective Vest On</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={psvBadgeVerified}
                      onChange={(e) => setPsvBadgeVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-slate-200 font-medium">Valid PSV Badge &amp; License Carried</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Check-in Notes / Comments (Optional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Pre-shift inspection completed. All tires inflated properly."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Start-of-Day Check-in</span>
                </button>
              </div>

            </form>
          ) : (
            /* HISTORY TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Driver Check-in Records Log Today
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {checkInsList.length} total entries
                </span>
              </div>

              <div className="space-y-3">
                {checkInsList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <strong className="text-white text-sm">{item.driverName}</strong>
                        <span className="text-slate-400 font-mono">({item.driverPhone})</span>
                      </div>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        item.shiftStatus === 'On Duty' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        item.shiftStatus === 'En Route to Shift' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {item.shiftStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                      <div>
                        📍 Location: <strong className="text-white">{item.startLocation}</strong>
                      </div>
                      <div>
                        🕒 Time: <strong className="text-slate-200">{item.checkInTime}</strong>
                      </div>
                      {item.vehicleReg && (
                        <div>
                          🚲 Vehicle: <strong className="text-emerald-400 font-mono">{item.vehicleReg}</strong>
                        </div>
                      )}
                      {item.energyStartLevel && (
                        <div>
                          ⚡ Start Level: <strong className="text-teal-300">{item.energyStartLevel}</strong>
                        </div>
                      )}
                    </div>

                    {(item.helmetGearVerified || item.psvBadgeVerified) && (
                      <div className="flex items-center gap-3 text-[11px] text-emerald-400 pt-1">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Helmet Verified
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> PSV Badge Verified
                        </span>
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-slate-400 text-[11px] italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
