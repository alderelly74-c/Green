import React, { useState } from 'react';
import { 
  X, Shield, ShieldAlert, ShieldCheck, MapPin, 
  Plus, Trash2, Edit3, CheckCircle2, AlertTriangle, 
  Radio, Zap, Layers, Bell, Eye, EyeOff, Play, RefreshCw
} from 'lucide-react';
import { GeofenceZone, GeofenceType, Vehicle, CityRegion, GeofenceViolationAlert } from '../../types';

interface GeofenceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  geofences: GeofenceZone[];
  vehicles: Vehicle[];
  onSaveGeofence: (zone: GeofenceZone) => void;
  onDeleteGeofence: (id: string) => void;
  onToggleGeofenceActive: (id: string) => void;
  onSimulateViolation: (alert: GeofenceViolationAlert) => void;
}

// Preset Location Coords in Kenya
const LOCATION_PRESETS: Record<string, { lat: number; lng: number; city: CityRegion }> = {
  'Nairobi CBD Operations Area': { lat: -1.286389, lng: 36.817223, city: 'Nairobi' },
  'Westlands Commercial Hub': { lat: -1.2672, lng: 36.8080, city: 'Nairobi' },
  'Kilimani High-Density Delivery Zone': { lat: -1.2921, lng: 36.8219, city: 'Nairobi' },
  'Industrial Area Restricted Depot': { lat: -1.3120, lng: 36.8450, city: 'Nairobi' },
  'JKIA Airport Cargo Perimeter': { lat: -1.3192, lng: 36.9275, city: 'Nairobi' },
  'Mombasa Port Logistics Depot': { lat: -4.043477, lng: 39.668206, city: 'Mombasa' },
  'Kisumu Lake Basin Hub': { lat: -0.091702, lng: 34.767956, city: 'Kisumu' },
  'Nakuru Town Commercial Area': { lat: -0.303099, lng: 36.080025, city: 'Nakuru' },
};

export const GeofenceManagerModal: React.FC<GeofenceManagerModalProps> = ({
  isOpen,
  onClose,
  geofences,
  vehicles,
  onSaveGeofence,
  onDeleteGeofence,
  onToggleGeofenceActive,
  onSimulateViolation
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'simulate'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State for Create / Edit
  const [name, setName] = useState('');
  const [type, setType] = useState<GeofenceType>('Authorized Area');
  const [city, setCity] = useState<CityRegion>('Nairobi');
  const [centerLat, setCenterLat] = useState<number>(-1.286389);
  const [centerLng, setCenterLng] = useState<number>(36.817223);
  const [radiusMeters, setRadiusMeters] = useState<number>(1500);
  const [assignedVehicleIds, setAssignedVehicleIds] = useState<string[]>(['all']);
  const [colorHex, setColorHex] = useState<string>('#10b981');
  const [description, setDescription] = useState<string>('');

  // Simulation Form State
  const [simVehicleId, setSimVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [simGeofenceId, setSimGeofenceId] = useState<string>(geofences[0]?.id || '');

  const handleSelectPreset = (presetName: string) => {
    const preset = LOCATION_PRESETS[presetName];
    if (preset) {
      setCenterLat(preset.lat);
      setCenterLng(preset.lng);
      setCity(preset.city);
      if (!name) setName(presetName);
    }
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setName('Nairobi Central Fleet Zone');
    setType('Authorized Area');
    setCity('Nairobi');
    setCenterLat(-1.286389);
    setCenterLng(36.817223);
    setRadiusMeters(1500);
    setAssignedVehicleIds(['all']);
    setColorHex('#10b981');
    setDescription('Primary authorized delivery and dispatch perimeter.');
    setActiveTab('create');
  };

  const handleStartEdit = (g: GeofenceZone) => {
    setEditingId(g.id);
    setName(g.name);
    setType(g.type);
    setCity(g.city);
    setCenterLat(g.centerLat);
    setCenterLng(g.centerLng);
    setRadiusMeters(g.radiusMeters);
    setAssignedVehicleIds(g.assignedVehicleIds || ['all']);
    setColorHex(g.colorHex);
    setDescription(g.description || '');
    setActiveTab('create');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newZone: GeofenceZone = {
      id: editingId || `gf-${Date.now()}`,
      name,
      type,
      city,
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      radiusMeters: Number(radiusMeters),
      assignedVehicleIds,
      active: true,
      colorHex: type === 'Restricted Zone' ? '#ef4444' : colorHex,
      description,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onSaveGeofence(newZone);
    setActiveTab('list');
  };

  const handleRunSimulation = () => {
    const targetVehicle = vehicles.find(v => v.id === simVehicleId) || vehicles[0];
    const targetZone = geofences.find(g => g.id === simGeofenceId) || geofences[0];

    if (!targetVehicle || !targetZone) return;

    const violationType = targetZone.type === 'Authorized Area' 
      ? 'Exited Authorized Area' 
      : 'Entered Restricted Zone';

    const simAlert: GeofenceViolationAlert = {
      id: `geo-alert-${Date.now()}`,
      vehicleId: targetVehicle.id,
      vehicleReg: targetVehicle.registrationNumber,
      driverName: targetVehicle.assignedDriverName || 'Juma Omondi',
      driverPhone: targetVehicle.assignedDriverPhone || '+254712345678',
      geofenceId: targetZone.id,
      geofenceName: targetZone.name,
      geofenceType: targetZone.type,
      violationType,
      lat: targetZone.centerLat + (targetZone.type === 'Authorized Area' ? 0.015 : 0.001),
      lng: targetZone.centerLng + (targetZone.type === 'Authorized Area' ? 0.015 : 0.001),
      locationAddress: `${targetZone.name} Boundary (${targetZone.city})`,
      distanceOffsetMeters: targetZone.radiusMeters + 450,
      timestamp: 'Just now (Simulated Test)',
      acknowledged: false
    };

    onSimulateViolation(simAlert);
    onClose();
  };

  const activeGeofenceCount = geofences.filter(g => g.active).length;
  const authorizedCount = geofences.filter(g => g.type === 'Authorized Area' && g.active).length;
  const restrictedCount = geofences.filter(g => g.type === 'Restricted Zone' && g.active).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 space-y-0">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Virtual Geofence Configuration</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                  GPS Perimeter Enforcement
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Define authorized boundary polygons &amp; restricted security zones with instant breach notifications.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'list' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Configured Zones ({geofences.length})</span>
            </button>

            <button
              onClick={handleStartCreate}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'create' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Edit Geofence' : 'Create New Geofence'}</span>
            </button>

            <button
              onClick={() => setActiveTab('simulate')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'simulate' 
                  ? 'bg-amber-500 text-slate-950 font-black shadow' 
                  : 'bg-slate-900 text-amber-300 hover:text-amber-200 border border-amber-500/40'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Breach Alert</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-400 font-bold">🛡️ {authorizedCount} Authorized</span>
            <span className="text-red-400 font-bold">⛔ {restrictedCount} Restricted</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">

          {/* TAB 1: LIST GEOFENCE ZONES */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Virtual Geofences ({activeGeofenceCount} Enabled)
                </h4>
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Geofence</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {geofences.map(g => (
                  <div 
                    key={g.id}
                    className={`p-4 rounded-xl border transition space-y-3 relative overflow-hidden ${
                      g.active 
                        ? g.type === 'Authorized Area'
                          ? 'bg-slate-950/80 border-emerald-500/40'
                          : 'bg-slate-950/80 border-red-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    {/* Top Accent Strip */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1" 
                      style={{ backgroundColor: g.active ? (g.type === 'Restricted Zone' ? '#ef4444' : g.colorHex) : '#475569' }} 
                    />

                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-white text-sm">{g.name}</h5>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                            g.type === 'Authorized Area'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {g.type === 'Authorized Area' ? '🛡️ Authorized Area' : '⛔ Restricted Zone'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{g.description || 'Geofence perimeter monitor.'}</p>
                      </div>

                      <button
                        onClick={() => onToggleGeofenceActive(g.id)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                          g.active 
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title={g.active ? 'Disable Geofence' : 'Enable Geofence'}
                      >
                        {g.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{g.active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </div>

                    {/* Technical details grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">City &amp; Radius</span>
                        <span className="text-slate-200 font-bold">{g.city} • {g.radiusMeters}m</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Center GPS</span>
                        <span className="text-slate-300 text-[11px]">{g.centerLat.toFixed(4)}, {g.centerLng.toFixed(4)}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Assigned Vehicles</span>
                        <span className="text-indigo-300 font-sans font-semibold text-[11px]">
                          {g.assignedVehicleIds.includes('all') 
                            ? '🌐 Applies to All Fleet Vehicles' 
                            : `🚗 ${g.assignedVehicleIds.length} Selected Vehicles`}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleStartEdit(g)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteGeofence(g.id)}
                        className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE / EDIT GEOFENCE FORM */}
          {activeTab === 'create' && (
            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>{editingId ? 'Edit Geofence Properties' : 'Configure New Geofence Perimeter'}</span>
                </h4>

                {/* Preset Quick Loader */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Quick Location Presets (Kenya Operations):</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(LOCATION_PRESETS).map(presetName => (
                      <button
                        key={presetName}
                        type="button"
                        onClick={() => handleSelectPreset(presetName)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs transition"
                      >
                        📍 {presetName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Geofence Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Nairobi CBD Authorized Perimeter"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Enforcement Zone Type *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setType('Authorized Area');
                          setColorHex('#10b981');
                        }}
                        className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          type === 'Authorized Area'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorized Area</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setType('Restricted Zone');
                          setColorHex('#ef4444');
                        }}
                        className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          type === 'Restricted Zone'
                            ? 'bg-red-500 text-slate-950 border-red-400 font-black'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Restricted Zone</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">City Region</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value as CityRegion)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Nairobi">Nairobi</option>
                      <option value="Mombasa">Mombasa</option>
                      <option value="Kisumu">Kisumu</option>
                      <option value="Nakuru">Nakuru</option>
                      <option value="Kiambu">Kiambu</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Perimeter Radius: <span className="text-emerald-400 font-mono font-bold">{radiusMeters} meters</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={200}
                        max={10000}
                        step={100}
                        value={radiusMeters}
                        onChange={(e) => setRadiusMeters(Number(e.target.value))}
                        className="w-full accent-emerald-500"
                      />
                      <input
                        type="number"
                        min={100}
                        max={20000}
                        value={radiusMeters}
                        onChange={(e) => setRadiusMeters(Number(e.target.value))}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Center Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={centerLat}
                      onChange={(e) => setCenterLat(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Center Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={centerLng}
                      onChange={(e) => setCenterLng(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Assigned Fleet Vehicles</label>
                  <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-300">
                      <input
                        type="checkbox"
                        checked={assignedVehicleIds.includes('all')}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedVehicleIds(['all']);
                          else setAssignedVehicleIds([]);
                        }}
                        className="accent-indigo-500 w-4 h-4"
                      />
                      <span>Enforce Across All Fleet Assets ({vehicles.length} Vehicles)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Zone Notes / Dispatch Instructions</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Authorized delivery area for Nairobi central hub riders. Exiting triggers level-2 security alert."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg"
                >
                  {editingId ? 'Save Geofence Changes' : 'Activate Geofence Zone'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SIMULATE BREACH ALERT TESTER */}
          {activeTab === 'simulate' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-amber-500/40 space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300 uppercase">Geofence Violation Simulator &amp; Notification Tester</h4>
                  <p className="text-xs text-slate-400">
                    Test the real-time in-app notification engine by simulating an immediate perimeter breach event.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Vehicle / Rider</label>
                  <select
                    value={simVehicleId}
                    onChange={(e) => setSimVehicleId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.make}) - Driver: {v.assignedDriverName || 'Unassigned'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Geofence Zone Breach Target</label>
                  <select
                    value={simGeofenceId}
                    onChange={(e) => setSimGeofenceId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                  >
                    {geofences.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.type} - {g.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                ⚡ Clicking "Trigger Test Geofence Alert" will immediately generate an instant floating notification banner on the Live Fleet Map screen and add an alert entry to the dispatcher incident queue.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition shadow-lg flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>Trigger Test Geofence Alert Now</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
