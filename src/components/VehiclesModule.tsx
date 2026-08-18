import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle, Driver, VehicleType, VehicleCategory, CityRegion, VehicleStatus } from '../types';
import { 
  Bike, Fuel, Zap, Plus, Filter, Search, 
  DollarSign, Wrench, Shield, Battery, UserCheck, AlertTriangle,
  CheckSquare, Square, MinusSquare, Check, Layers, LayoutGrid, List,
  RotateCcw, Sparkles, X, ChevronDown, CheckCircle2, SlidersHorizontal, Info,
  QrCode, Printer
} from 'lucide-react';
import { calculateVehicleComponentPredictions } from '../lib/maintenancePredictive';
import { VehicleQRStickerModal } from './modals/VehicleQRStickerModal';

interface VehiclesModuleProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedCity: CityRegion | 'All Cities';
  onUpdateVehicleStatus: (vehicleId: string, status: any) => void;
  onBulkUpdateVehicleStatus?: (vehicleIds: string[], status: any) => void;
  onAssignDriver: (vehicleId: string, driverId: string) => void;
  onOpenNewVehicleModal: () => void;
  onLogBatterySwap?: (swapData: {
    vehicleId: string;
    vehicleReg: string;
    removedBatteryId: string;
    removedBatterySoC: number;
    installedBatteryId: string;
    installedBatterySoC: number;
    stationName: string;
    technicianName: string;
    notes?: string;
  }) => void;
}

export const VehiclesModule: React.FC<VehiclesModuleProps> = ({
  vehicles = [],
  drivers = [],
  selectedCity = 'All Cities',
  onUpdateVehicleStatus = (_vehicleId?: any, _status?: any) => {},
  onBulkUpdateVehicleStatus,
  onAssignDriver = (_vehicleId?: any, _driverId?: any) => {},
  onOpenNewVehicleModal = () => {},
  onLogBatterySwap
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Electric' | 'Fuel' | 'Critical'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // QR Sticker Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalTargetVehicleIds, setQrModalTargetVehicleIds] = useState<string[]>([]);

  // Bulk selection state
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<VehicleStatus>('Under Maintenance');
  const [bulkFeedbackMessage, setBulkFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const criticalVehiclesCount = vehicles.filter(v => {
    const d = drivers.find(drv => drv.id === v.assignedDriverId);
    return d && d.safetyScorePercent < 80;
  }).length;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (selectedCity !== 'All Cities' && v.city !== selectedCity) return false;
      if (selectedCategory === 'Critical') {
        const d = drivers.find(drv => drv.id === v.assignedDriverId);
        if (!d || d.safetyScorePercent >= 80) return false;
      } else if (selectedCategory !== 'All' && v.category !== selectedCategory) {
        return false;
      }
      if (statusFilter !== 'All' && v.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          v.registrationNumber.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.vin?.toLowerCase().includes(q) ||
          (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [vehicles, drivers, selectedCity, selectedCategory, statusFilter, searchQuery]);

  // Bulk Selection Handlers
  const isAllFilteredSelected = filteredVehicles.length > 0 && filteredVehicles.every(v => selectedVehicleIds.includes(v.id));
  const isSomeFilteredSelected = filteredVehicles.some(v => selectedVehicleIds.includes(v.id)) && !isAllFilteredSelected;

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Unselect all currently filtered
      const filteredIdSet = new Set(filteredVehicles.map(v => v.id));
      setSelectedVehicleIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      // Select all currently filtered
      const newIds = new Set([...selectedVehicleIds, ...filteredVehicles.map(v => v.id)]);
      setSelectedVehicleIds(Array.from(newIds));
    }
  };

  const toggleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleSelectPreset = (preset: 'idle' | 'electric' | 'fuel' | 'maintenance' | 'critical' | 'none') => {
    if (preset === 'none') {
      setSelectedVehicleIds([]);
      return;
    }

    let targetVehicles: Vehicle[] = [];
    if (preset === 'idle') {
      targetVehicles = filteredVehicles.filter(v => v.status === 'Idle' || v.status === 'Available');
    } else if (preset === 'electric') {
      targetVehicles = filteredVehicles.filter(v => v.category === 'Electric');
    } else if (preset === 'fuel') {
      targetVehicles = filteredVehicles.filter(v => v.category === 'Fuel');
    } else if (preset === 'maintenance') {
      targetVehicles = filteredVehicles.filter(v => v.status === 'Under Maintenance');
    } else if (preset === 'critical') {
      targetVehicles = filteredVehicles.filter(v => {
        const d = drivers.find(drv => drv.id === v.assignedDriverId);
        return d && d.safetyScorePercent < 80;
      });
    }

    setSelectedVehicleIds(targetVehicles.map(v => v.id));
  };

  const handleExecuteBulkStatusUpdate = (targetStatus: VehicleStatus) => {
    if (selectedVehicleIds.length === 0) return;

    if (onBulkUpdateVehicleStatus) {
      onBulkUpdateVehicleStatus(selectedVehicleIds, targetStatus);
    } else {
      selectedVehicleIds.forEach(id => {
        onUpdateVehicleStatus(id, targetStatus);
      });
    }

    const count = selectedVehicleIds.length;
    setBulkFeedbackMessage({
      text: `Successfully updated ${count} vehicle${count === 1 ? '' : 's'} to "${targetStatus}".`,
      type: 'success'
    });

    // Auto dismiss feedback after 4 seconds
    setTimeout(() => {
      setBulkFeedbackMessage(null);
    }, 4000);
  };

  const handleAssignSubmit = (vehicleId: string) => {
    if (selectedDriverId) {
      onAssignDriver(vehicleId, selectedDriverId);
      setAssigningVehicleId(null);
      setSelectedDriverId('');
    }
  };

  const handleOpenQrModal = (targetIds?: string[]) => {
    if (targetIds && targetIds.length > 0) {
      setQrModalTargetVehicleIds(targetIds);
    } else if (selectedVehicleIds.length > 0) {
      setQrModalTargetVehicleIds(selectedVehicleIds);
    } else {
      setQrModalTargetVehicleIds(filteredVehicles.map(v => v.id));
    }
    setIsQrModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* Top Critical Safety Banner Alert */}
      {criticalVehiclesCount > 0 && (
        <div className="bg-red-500/10 border-2 border-red-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                CRITICAL SAFETY ALERT NOTIFICATION
                <span className="bg-red-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px]">
                  {criticalVehiclesCount} FLAGGED
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Vehicles flagged with <strong className="text-red-400">'Critical'</strong> status due to assigned driver safety score dropping below 80%.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedCategory(selectedCategory === 'Critical' ? 'All' : 'Critical')}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{selectedCategory === 'Critical' ? 'Show All Vehicles' : `Filter Critical Vehicles (${criticalVehiclesCount})`}</span>
          </button>
        </div>
      )}

      {/* Top Header & Fleet Management Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Mixed Fleet Asset Directory</h2>
            <span className="text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
              {vehicles.length} Units
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin console for single & bulk vehicle status dispatch, driver allocation, and maintenance tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid Card View"
              className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Compact Table List View"
              className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* QR Stickers & Field Scanner Button */}
          <button
            onClick={() => handleOpenQrModal()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
            title="Generate Printable QR Code Stickers & Launch Field Technician Scanner"
          >
            <QrCode className="w-4 h-4" />
            <span>QR Stickers & Field Scanner</span>
          </button>

          {/* Add Vehicle Button */}
          <button
            onClick={onOpenNewVehicleModal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-950 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar with Bulk Select Master Controller */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by registration (e.g. KMG 482E), make, model, VIN, or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${selectedCategory === 'All' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              All Assets ({vehicles.length})
            </button>
            <button
              onClick={() => setSelectedCategory('Electric')}
              className={`px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${selectedCategory === 'Electric' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              ⚡ EVs ({vehicles.filter(v => v.category === 'Electric').length})
            </button>
            <button
              onClick={() => setSelectedCategory('Fuel')}
              className={`px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${selectedCategory === 'Fuel' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              ⛽ Fuel ({vehicles.filter(v => v.category === 'Fuel').length})
            </button>
            {criticalVehiclesCount > 0 && (
              <button
                onClick={() => setSelectedCategory('Critical')}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1 whitespace-nowrap ${selectedCategory === 'Critical' ? 'bg-red-600 text-white' : 'text-red-400 hover:text-red-300 bg-red-950/40'}`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Critical ({criticalVehiclesCount})</span>
              </button>
            )}
          </div>

          {/* Status Quick Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available / Idle</option>
              <option value="Idle">Idle</option>
              <option value="On Trip">On Trip</option>
              <option value="Charging">Charging</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Accident">Accident</option>
              <option value="Inactive">Inactive / Suspended</option>
            </select>
          </div>
        </div>

        {/* Master Checkbox & Quick Selection Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          
          <div className="flex items-center gap-3">
            {/* Master Select All Checkbox */}
            <label 
              id="bulk-select-all-label"
              onClick={toggleSelectAllFiltered}
              className="flex items-center gap-2 font-semibold text-slate-300 hover:text-white cursor-pointer select-none"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                isAllFilteredSelected 
                  ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                  : isSomeFilteredSelected 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-950 border-slate-700 text-transparent'
              }`}>
                {isAllFilteredSelected ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : isSomeFilteredSelected ? (
                  <MinusSquare className="w-3 h-3" />
                ) : null}
              </div>
              <span>
                {selectedVehicleIds.length > 0 ? (
                  <span className="text-emerald-400 font-bold">
                    {selectedVehicleIds.length} of {filteredVehicles.length} Selected
                  </span>
                ) : (
                  <span>Select All Filtered ({filteredVehicles.length})</span>
                )}
              </span>
            </label>

            {/* Quick Selection Presets */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 pl-3 border-l border-slate-800">
              <span className="text-slate-500 font-medium">Quick Select:</span>
              <button 
                onClick={() => handleSelectPreset('idle')}
                className="hover:text-emerald-400 hover:underline px-1 py-0.5 rounded cursor-pointer"
              >
                Idle
              </button>
              <span>&bull;</span>
              <button 
                onClick={() => handleSelectPreset('electric')}
                className="hover:text-emerald-400 hover:underline px-1 py-0.5 rounded cursor-pointer"
              >
                EVs
              </button>
              <span>&bull;</span>
              <button 
                onClick={() => handleSelectPreset('fuel')}
                className="hover:text-amber-400 hover:underline px-1 py-0.5 rounded cursor-pointer"
              >
                Fuel
              </button>
              <span>&bull;</span>
              <button 
                onClick={() => handleSelectPreset('maintenance')}
                className="hover:text-amber-400 hover:underline px-1 py-0.5 rounded cursor-pointer"
              >
                Maintenance
              </button>
            </div>
          </div>

          {/* Selection Clear Button */}
          {selectedVehicleIds.length > 0 && (
            <button
              onClick={() => setSelectedVehicleIds([])}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Selection ({selectedVehicleIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Status Update Feedback Banner */}
      <AnimatePresence>
        {bulkFeedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-200 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{bulkFeedbackMessage.text}</span>
            </div>
            <button 
              onClick={() => setBulkFeedbackMessage(null)}
              className="text-emerald-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW 1: Grid Cards View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => {
            const isSelected = selectedVehicleIds.includes(v.id);
            const assignedDriver = drivers.find(d => d.id === v.assignedDriverId);
            const isCriticalSafety = assignedDriver && assignedDriver.safetyScorePercent < 80;
            const pred = calculateVehicleComponentPredictions(v);
            const { hasPredictiveWarning, warningComponents } = pred;

            return (
              <div 
                key={v.id} 
                className={`bg-slate-900 border ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-slate-900/95 shadow-xl shadow-emerald-950/30'
                    : isCriticalSafety 
                    ? 'border-2 border-red-500/80 bg-red-950/20 shadow-red-950/30 ring-1 ring-red-500/50' 
                    : hasPredictiveWarning
                    ? 'border-amber-500/60 hover:border-amber-400 bg-amber-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                } rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all relative overflow-hidden`}
              >
                
                {/* Top Bar: Checkbox, Reg, Type, Category & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    
                    {/* Left: Selection Checkbox & Category Tag */}
                    <div className="flex items-center gap-2">
                      <button
                        id={`vehicle-checkbox-${v.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectVehicle(v.id);
                        }}
                        title={isSelected ? "Unselect Vehicle" : "Select Vehicle for Bulk Action"}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                          isSelected 
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm' 
                            : 'bg-slate-950 border-slate-700 hover:border-emerald-500/60 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        v.category === 'Electric' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {v.category === 'Electric' ? '⚡ EV' : '⛽ Fuel'} • {v.type}
                      </span>
                    </div>

                    {/* Right: Status Tag & Individual Switcher */}
                    <div className="flex items-center gap-1.5">
                      {isCriticalSafety && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3 h-3" />
                          CRITICAL
                        </span>
                      )}

                      {/* Animated Status Badge */}
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={v.status}
                          initial={{ opacity: 0, scale: 0.8, y: -6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 6 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                            v.status === 'On Trip' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-status-ontrip' :
                            v.status === 'Charging' ? 'bg-teal-500/20 text-teal-400 border-teal-500/40 animate-status-charging' :
                            v.status === 'Under Maintenance' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            v.status === 'On Trip' ? 'bg-emerald-400 animate-ping' :
                            v.status === 'Charging' ? 'bg-teal-400 animate-pulse' :
                            v.status === 'Under Maintenance' ? 'bg-amber-400' :
                            v.status === 'Available' ? 'bg-emerald-400' :
                            'bg-slate-400'
                          }`} />
                          {v.status}
                        </motion.span>
                      </AnimatePresence>

                      {/* Individual Quick Status Switcher */}
                      <select
                        value={v.status}
                        onChange={(e) => onUpdateVehicleStatus(v.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-bold rounded-md px-1 py-0.5 cursor-pointer focus:outline-none"
                        title="Update Vehicle Status"
                      >
                        <option value="Available">Available</option>
                        <option value="Idle">Idle</option>
                        <option value="On Trip">On Trip</option>
                        <option value="Charging">Charging</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                        <option value="Accident">Accident</option>
                        <option value="Inactive">Inactive</option>
                      </select>

                      {/* QR Sticker / Scan Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQrModal([v.id]);
                        }}
                        className="p-1 rounded-md bg-slate-950 border border-slate-800 hover:border-emerald-500/60 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                        title="Generate Printable QR Sticker / Simulate Field Scan"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <span>{v.registrationNumber}</span>
                        {hasPredictiveWarning && (
                          <span className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-bounce inline-flex items-center gap-1 text-[10px] font-bold" title="Maintenance Alert: Component replacement due within 500km!">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>&lt;500km</span>
                          </span>
                        )}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{v.make} {v.model} ({v.year}) • {v.color}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">VIN: {v.vin}</p>

                    {/* Component Wear Predictive Warning Banner */}
                    {hasPredictiveWarning && (
                      <div className="mt-2.5 p-2 bg-amber-950/60 border border-amber-500/40 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <span>Predictive Component Alert</span>
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">{pred.dailyRateKm} km/day</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {warningComponents.map(c => (
                            <span key={c.componentId} className="bg-amber-900/80 text-amber-200 text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
                              ⚠️ {c.componentName.split('(')[0].trim()}: {c.remainingKm}km left ({c.projectedDaysRemaining}d)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Critical Safety Notification Callout Box */}
                {isCriticalSafety && assignedDriver && (
                  <div className="bg-red-950/70 border border-red-500/60 rounded-lg p-3 text-xs text-red-200 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-red-400">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                        Critical Safety Flag
                      </span>
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        Safety: {assignedDriver.safetyScorePercent}%
                      </span>
                    </div>
                    <p className="text-[11px] text-red-300 leading-tight">
                      Driver <strong className="text-white">{assignedDriver.fullName}</strong> safety score ({assignedDriver.safetyScorePercent}%) is below the 80% safety threshold.
                    </p>
                    <div className="pt-1 flex items-center justify-between border-t border-red-500/30">
                      <span className="text-[10px] text-red-400 font-semibold">Action Required: Reassign driver</span>
                      <button
                        onClick={() => setAssigningVehicleId(v.id)}
                        className="text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded transition shadow-sm cursor-pointer"
                      >
                        Reassign Driver
                      </button>
                    </div>
                  </div>
                )}

                {/* Assigned Driver */}
                <div className={`p-3 rounded-lg border text-xs ${
                  isCriticalSafety ? 'bg-red-950/30 border-red-500/40' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Assigned Driver / Rider:</span>
                    <button 
                      onClick={() => setAssigningVehicleId(assigningVehicleId === v.id ? null : v.id)}
                      className="text-emerald-400 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      {v.assignedDriverName ? 'Change' : 'Assign'}
                    </button>
                  </div>
                  <div className="font-bold text-slate-100 text-sm mt-1 flex items-center justify-between">
                    <span>{v.assignedDriverName ? `👤 ${v.assignedDriverName}` : <span className="text-amber-400 italic">No driver assigned</span>}</span>
                    {assignedDriver && (
                      <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        assignedDriver.safetyScorePercent < 80 
                          ? 'bg-red-500/30 text-red-400 border border-red-500/50' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        Safety: {assignedDriver.safetyScorePercent}%
                      </span>
                    )}
                  </div>

                  {/* Inline Driver Assignment Dropdown */}
                  {assigningVehicleId === v.id && (
                    <div className="mt-3 pt-2 border-t border-slate-800 space-y-2">
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="">Select driver from directory...</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} (Safety: {d.safetyScorePercent}%) {d.safetyScorePercent < 80 ? '⚠️ LOW SAFETY' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignSubmit(v.id)}
                        className="w-full bg-emerald-600 text-slate-950 font-bold py-1 rounded text-xs cursor-pointer"
                      >
                        Confirm Assignment
                      </button>
                    </div>
                  )}
                </div>

                {/* Telemetry Bar (Battery or Fuel) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Energy / SoC</span>
                    {v.category === 'Electric' ? (
                      <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Battery className="w-3.5 h-3.5" />
                        <span>{v.currentSoCPercent}% SoC</span>
                      </div>
                    ) : (
                      <div className="font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                        <Fuel className="w-3.5 h-3.5" />
                        <span>{v.currentFuelLiters} L Petrol</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Current Odometer</span>
                    <span className="font-bold text-slate-200 mt-0.5 block">{v.odometerKm.toLocaleString()} km</span>
                  </div>
                </div>

                {/* Financial Profitability Footer */}
                <div className="pt-3 border-t border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Gross Generated:</span>
                    <span className="font-medium text-slate-200">KES {v.totalRevenueGeneratedKes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Fuel / Charging Cost:</span>
                    <span className="font-medium text-amber-400">
                      KES {(v.totalFuelSpentKes + v.totalChargingSpentKes).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-200 font-bold text-sm pt-1 border-t border-slate-800/60">
                    <span>Net Vehicle Profit:</span>
                    <span className="text-emerald-400 font-mono">KES {v.netProfitKes.toLocaleString()}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Compact High-Density Table View */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 w-10">
                    <button
                      onClick={toggleSelectAllFiltered}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer ${
                        isAllFilteredSelected 
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                          : isSomeFilteredSelected 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-900 border-slate-700 text-transparent'
                      }`}
                    >
                      {isAllFilteredSelected ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : isSomeFilteredSelected ? (
                        <MinusSquare className="w-3 h-3" />
                      ) : null}
                    </button>
                  </th>
                  <th className="p-3.5">Registration & Vehicle</th>
                  <th className="p-3.5">Category & Type</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned Driver</th>
                  <th className="p-3.5">SoC / Fuel</th>
                  <th className="p-3.5">Odometer</th>
                  <th className="p-3.5 text-right">Net Profit</th>
                  <th className="p-3.5 text-center">Quick Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredVehicles.map(v => {
                  const isSelected = selectedVehicleIds.includes(v.id);
                  const assignedDriver = drivers.find(d => d.id === v.assignedDriverId);
                  const isCriticalSafety = assignedDriver && assignedDriver.safetyScorePercent < 80;

                  return (
                    <tr 
                      key={v.id}
                      onClick={() => toggleSelectVehicle(v.id)}
                      className={`hover:bg-slate-800/50 transition cursor-pointer ${
                        isSelected ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectVehicle(v.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                              : 'bg-slate-950 border-slate-700 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{v.registrationNumber}</span>
                          {isCriticalSafety && (
                            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-bold">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{v.make} {v.model} ({v.year})</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.category === 'Electric' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {v.category === 'Electric' ? '⚡ EV' : '⛽ Fuel'}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{v.type}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          v.status === 'On Trip' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                          v.status === 'Charging' ? 'bg-teal-500/20 text-teal-400 border-teal-500/40' :
                          v.status === 'Under Maintenance' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            v.status === 'On Trip' ? 'bg-emerald-400' :
                            v.status === 'Charging' ? 'bg-teal-400' :
                            v.status === 'Under Maintenance' ? 'bg-amber-400' :
                            v.status === 'Available' ? 'bg-emerald-400' :
                            'bg-slate-400'
                          }`} />
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-200">{v.assignedDriverName || <span className="text-slate-500 italic">Unassigned</span>}</span>
                        {assignedDriver && (
                          <div className={`text-[10px] font-mono ${assignedDriver.safetyScorePercent < 80 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                            Safety: {assignedDriver.safetyScorePercent}%
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono">
                        {v.category === 'Electric' ? (
                          <span className="text-emerald-400 font-bold">{v.currentSoCPercent}% SoC</span>
                        ) : (
                          <span className="text-amber-400 font-bold">{v.currentFuelLiters} L</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {v.odometerKm.toLocaleString()} km
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        KES {v.netProfitKes.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <select
                            value={v.status}
                            onChange={(e) => onUpdateVehicleStatus(v.id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold rounded px-1.5 py-0.5 cursor-pointer"
                          >
                            <option value="Available">Available</option>
                            <option value="Idle">Idle</option>
                            <option value="On Trip">On Trip</option>
                            <option value="Charging">Charging</option>
                            <option value="Under Maintenance">Under Maintenance</option>
                            <option value="Accident">Accident</option>
                            <option value="Inactive">Inactive</option>
                          </select>

                          <button
                            onClick={() => handleOpenQrModal([v.id])}
                            className="p-1 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/60 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                            title="Generate QR Sticker / Field Scan"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Bottom Dock for Bulk Status Actions */}
      <AnimatePresence>
        {selectedVehicleIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl bg-slate-900/98 backdrop-blur-xl border-2 border-emerald-500/60 rounded-2xl p-3.5 shadow-2xl shadow-black/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs ring-4 ring-emerald-500/10"
          >
            {/* Left: Selected Assets Counter & Badge */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-white text-sm flex items-center gap-1.5">
                    <span>{selectedVehicleIds.length}</span>
                    <span className="text-slate-300 font-medium text-xs">Vehicles Selected</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Apply administrative status change or generate printable QR stickers
                  </span>
                </div>
              </div>

              {/* Clear button for mobile */}
              <button
                onClick={() => setSelectedVehicleIds([])}
                className="md:hidden text-slate-400 hover:text-white p-1"
                title="Deselect All"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Quick Action Status Buttons & Dropdown */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              
              {/* Batch QR Sticker Generator Button */}
              <button
                onClick={() => handleOpenQrModal(selectedVehicleIds)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs transition shadow-md shadow-emerald-950/50 cursor-pointer"
                title="Generate and print QR code stickers for all selected vehicles"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Stickers ({selectedVehicleIds.length})</span>
              </button>

              {/* Preset 1: Under Maintenance */}
              <button
                onClick={() => handleExecuteBulkStatusUpdate('Under Maintenance')}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
                title="Set all selected vehicles to 'Under Maintenance'"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Under Maintenance</span>
              </button>

              {/* Preset 2: Available / Idle */}
              <button
                onClick={() => handleExecuteBulkStatusUpdate('Available')}
                className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
                title="Set all selected vehicles to 'Available'"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Available</span>
              </button>

              {/* Preset 3: Charging */}
              <button
                onClick={() => handleExecuteBulkStatusUpdate('Charging')}
                className="flex items-center gap-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 px-3 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
                title="Set all selected vehicles to 'Charging'"
              >
                <Battery className="w-3.5 h-3.5 text-teal-400" />
                <span>Charging</span>
              </button>

              {/* Custom Status Dropdown & Apply */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <select
                  value={bulkTargetStatus}
                  onChange={(e) => setBulkTargetStatus(e.target.value as VehicleStatus)}
                  className="bg-transparent text-slate-300 text-xs px-2 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Available">Available</option>
                  <option value="Idle">Idle</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Charging">Charging</option>
                  <option value="Refueling">Refueling</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Accident">Accident</option>
                  <option value="Suspended">Suspended</option>
                </select>

                <button
                  onClick={() => handleExecuteBulkStatusUpdate(bulkTargetStatus)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded-md transition shadow-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {/* Clear Selection button */}
              <button
                onClick={() => setSelectedVehicleIds([])}
                className="hidden md:flex text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition hover:bg-slate-800"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vehicle QR Sticker Modal */}
      <VehicleQRStickerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        vehicles={vehicles}
        drivers={drivers}
        initialSelectedVehicleIds={qrModalTargetVehicleIds}
        onUpdateVehicleStatus={onUpdateVehicleStatus}
        onLogBatterySwap={onLogBatterySwap}
      />

    </div>
  );
};

