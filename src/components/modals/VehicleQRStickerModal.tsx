import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle, Driver, VehicleStatus, BatterySwapRecord } from '../../types';
import { VehicleStickerCard, StickerTemplate, StickerSize } from '../stickers/VehicleStickerCard';
import { 
  Printer, Download, QrCode, X, Layers, CheckSquare, Sparkles, 
  Settings2, Wrench, Battery, Zap, Shield, CheckCircle2, ChevronRight, 
  ChevronLeft, FileText, Camera, RefreshCw, AlertTriangle, ArrowRight,
  SlidersHorizontal, Check, Copy
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface VehicleQRStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  initialSelectedVehicleIds?: string[];
  onUpdateVehicleStatus: (vehicleId: string, status: any) => void;
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

export const VehicleQRStickerModal: React.FC<VehicleQRStickerModalProps> = ({
  isOpen,
  onClose,
  vehicles = [],
  drivers = [],
  initialSelectedVehicleIds = [],
  onUpdateVehicleStatus,
  onLogBatterySwap
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'sheet' | 'scanner'>('preview');
  
  // Selected vehicles to print
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(() => {
    if (initialSelectedVehicleIds.length > 0) return initialSelectedVehicleIds;
    return vehicles.map(v => v.id);
  });

  // Sticker Customization Options
  const [template, setTemplate] = useState<StickerTemplate>('industrial-rugged');
  const [size, setSize] = useState<StickerSize>('standard');
  const [showChecklist, setShowChecklist] = useState<boolean>(true);
  const [showDriver, setShowDriver] = useState<boolean>(true);
  const [showVin, setShowVin] = useState<boolean>(true);
  const [showEmergencyContact, setShowEmergencyContact] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);

  // Carousel current index for Preview tab
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Field Technician Quick Action / Simulator State
  const [scanningVehicleId, setScanningVehicleId] = useState<string>(() => {
    if (initialSelectedVehicleIds.length > 0) return initialSelectedVehicleIds[0];
    return vehicles[0]?.id || '';
  });

  const [techActionType, setTechActionType] = useState<'battery-swap' | 'maintenance' | 'status-update'>('battery-swap');
  
  // Battery Swap Form
  const [swapStation, setSwapStation] = useState<string>('Roam Hub Kilimani #2');
  const [removedSoC, setRemovedSoC] = useState<number>(18);
  const [newBatteryId, setNewBatteryId] = useState<string>(`BATT-NBI-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newSoC, setNewSoC] = useState<number>(100);
  const [techName, setTechName] = useState<string>('David Ochieng (Senior Tech)');
  const [swapNotes, setSwapNotes] = useState<string>('Standard rapid swap during shift change. Terminal pins cleaned.');

  // Maintenance Form
  const [maintenanceReason, setMaintenanceReason] = useState<string>('Brake Inspection & Chain Lube');
  const [maintenanceStatus, setMaintenanceStatus] = useState<VehicleStatus>('Under Maintenance');
  const [maintenanceOdometer, setMaintenanceOdometer] = useState<number>(0);
  const [techActionSuccess, setTechActionSuccess] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const printSheetRef = useRef<HTMLDivElement>(null);
  const singlePreviewRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const targetVehicles = vehicles.filter(v => selectedVehicleIds.includes(v.id));
  const currentPreviewVehicle = targetVehicles[previewIndex] || targetVehicles[0] || vehicles[0];
  const activeScannedVehicle = vehicles.find(v => v.id === scanningVehicleId) || currentPreviewVehicle;

  const handleToggleSelectVehicle = (id: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(id) 
        ? prev.filter(vId => vId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedVehicleIds.length === vehicles.length) {
      setSelectedVehicleIds([]);
    } else {
      setSelectedVehicleIds(vehicles.map(v => v.id));
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleDownloadSingleStickerImage = async () => {
    if (!singlePreviewRef.current) return;
    try {
      const canvas = await html2canvas(singlePreviewRef.current, {
        scale: 3, // High DPI for crisp printing
        useCORS: true,
        backgroundColor: '#000000'
      });
      const link = document.createElement('a');
      link.download = `GreenShift_Sticker_${currentPreviewVehicle.registrationNumber.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export sticker image:', err);
    }
  };

  const handleExportPdfSheet = async () => {
    if (!printSheetRef.current) return;
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(printSheetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`GreenShift_Fleet_QR_Sticker_Sheet_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF sticker sheet:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExecuteSimulatedSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScannedVehicle) return;

    if (onLogBatterySwap) {
      onLogBatterySwap({
        vehicleId: activeScannedVehicle.id,
        vehicleReg: activeScannedVehicle.registrationNumber,
        removedBatteryId: activeScannedVehicle.batteryId || 'BATT-OLD-01',
        removedBatterySoC: removedSoC,
        installedBatteryId: newBatteryId,
        installedBatterySoC: newSoC,
        stationName: swapStation,
        technicianName: techName,
        notes: swapNotes
      });
    }

    // Update vehicle state to Available / 100% SoC
    onUpdateVehicleStatus(activeScannedVehicle.id, 'Available');
    activeScannedVehicle.currentSoCPercent = newSoC;
    activeScannedVehicle.batteryId = newBatteryId;

    setTechActionSuccess(`Battery Swap successfully logged for ${activeScannedVehicle.registrationNumber}! New Pack ${newBatteryId} assigned with ${newSoC}% SoC.`);
    setTimeout(() => setTechActionSuccess(null), 5000);
  };

  const handleExecuteSimulatedMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScannedVehicle) return;

    onUpdateVehicleStatus(activeScannedVehicle.id, maintenanceStatus);

    setTechActionSuccess(`Maintenance order updated for ${activeScannedVehicle.registrationNumber}! Status changed to '${maintenanceStatus}'.`);
    setTimeout(() => setTechActionSuccess(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      
      {/* Printable Sheet Container hidden from regular screen, formatted exclusively for @media print */}
      <div className="hidden print:block print:w-full print:p-0">
        <div className="grid grid-cols-2 gap-4 p-4">
          {targetVehicles.map(v => (
            <div key={v.id} className="break-inside-avoid page-break-inside-avoid">
              <VehicleStickerCard 
                vehicle={v} 
                template={template} 
                size="compact"
                showChecklist={showChecklist}
                showDriver={showDriver}
                showVin={showVin}
                showEmergencyContact={showEmergencyContact}
                showBarcode={showBarcode}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:hidden"
      >
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Vehicle QR Sticker Generator & Field Scanner</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  Print & Swap System
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate high-resolution printable asset tag stickers for battery swaps, maintenance telemetry, and technician field logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs transition shadow-md shadow-emerald-950 cursor-pointer"
              title="Print stickers using browser print dialog"
            >
              <Printer className="w-4 h-4" />
              <span>Print Stickers</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 bg-slate-900 border-b border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'preview' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sticker Designer & Single Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'sheet' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Sticker Sheet Grid ({targetVehicles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'scanner' 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Field Tech Fast-Scanner & Action Simulator</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Sticker Designer & Single Preview */}
          {activeTab === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Customization Controls (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-emerald-400" />
                    <span>Sticker Template & Styling</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">300 DPI Vector</span>
                </div>

                {/* Template Preset Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">Sticker Design Archetype</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTemplate('industrial-rugged')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        template === 'industrial-rugged'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/50'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1">
                        <span>⚠️ Rugged Asset</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">High-contrast hazard border</span>
                    </button>

                    <button
                      onClick={() => setTemplate('clean-eco')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        template === 'clean-eco'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/50'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1">
                        <span>⚡ Eco Green EV</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Vibrant EV branding</span>
                    </button>

                    <button
                      onClick={() => setTemplate('battery-hatch')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        template === 'battery-hatch'
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/50'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1">
                        <span>🔋 Battery Bay Tag</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Compact battery hatch badge</span>
                    </button>

                    <button
                      onClick={() => setTemplate('monochrome-thermal')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        template === 'monochrome-thermal'
                          ? 'border-slate-200 bg-white text-slate-950 ring-1 ring-white/50'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1">
                        <span>🖨️ Thermal Black/White</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Label printer friendly</span>
                    </button>
                  </div>
                </div>

                {/* Sticker Sizing */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <label className="text-[11px] font-semibold text-slate-300 block">Sticker Size Standard</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['standard', 'compact', 'square'] as StickerSize[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`py-1.5 rounded-lg border font-semibold capitalize transition cursor-pointer ${
                          size === s
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visible Sections Toggle Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <label className="text-[11px] font-semibold text-slate-300 block">Include Information Elements</label>
                  
                  <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showChecklist}
                      onChange={(e) => setShowChecklist(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Technician 3-Step Swap Protocol</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showVin}
                      onChange={(e) => setShowVin(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Chassis VIN Number</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showBarcode}
                      onChange={(e) => setShowBarcode(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>1D Optical Barcode Strip</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showDriver}
                      onChange={(e) => setShowDriver(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Assigned Operator / Driver Name</span>
                  </label>
                </div>

                {/* Vehicle Selector Carousel Controller */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Selected Vehicle:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {previewIndex + 1} of {targetVehicles.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                      disabled={previewIndex === 0}
                      className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <select
                      value={currentPreviewVehicle.id}
                      onChange={(e) => {
                        const idx = targetVehicles.findIndex(v => v.id === e.target.value);
                        if (idx !== -1) setPreviewIndex(idx);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      {targetVehicles.map((v, idx) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} ({v.make} {v.model}) - {v.category}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setPreviewIndex(prev => Math.min(targetVehicles.length - 1, prev + 1))}
                      disabled={previewIndex === targetVehicles.length - 1}
                      className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Live High-Resolution Sticker Preview (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center space-y-4">
                
                <div className="w-full flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Live Asset Badge Preview:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadSingleStickerImage}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PNG</span>
                    </button>
                  </div>
                </div>

                {/* Single Sticker Card Container */}
                <div 
                  ref={singlePreviewRef}
                  className="w-full flex items-center justify-center p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-inner"
                >
                  <VehicleStickerCard
                    vehicle={currentPreviewVehicle}
                    template={template}
                    size={size}
                    showChecklist={showChecklist}
                    showDriver={showDriver}
                    showVin={showVin}
                    showEmergencyContact={showEmergencyContact}
                    showBarcode={showBarcode}
                    onScanSimulate={(v) => {
                      setScanningVehicleId(v.id);
                      setActiveTab('scanner');
                    }}
                  />
                </div>

                {/* Quick Helper Tips */}
                <div className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    Field Tech Installation Guidelines
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Mount this weatherproof vinyl label on the EV battery compartment hatch or steering column. Technicians scan this QR matrix with the GreenShift Tech mobile terminal to authenticate packs and log swaps in under 15 seconds.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Multi-Sticker Sheet Grid (Print Layout) */}
          {activeTab === 'sheet' && (
            <div className="space-y-4">
              
              {/* Sheet Toolbar & Batch Selection Header */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Multi-Sticker Printable Sheet</span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono">
                      {targetVehicles.length} of {vehicles.length} Selected
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Optimized for standard A4 / US Letter adhesive label sheets with printable cut marks
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 cursor-pointer"
                  >
                    {selectedVehicleIds.length === vehicles.length ? 'Deselect All' : 'Select All Fleet'}
                  </button>

                  <button
                    onClick={handleExportPdfSheet}
                    disabled={isExportingPdf || targetVehicles.length === 0}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingPdf ? 'Exporting PDF...' : 'Export PDF Sheet'}</span>
                  </button>

                  <button
                    onClick={handleTriggerPrint}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Sheet</span>
                  </button>
                </div>
              </div>

              {/* Sheet Grid Preview Container */}
              <div 
                ref={printSheetRef}
                className="bg-slate-950 p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[58vh] overflow-y-auto"
              >
                {targetVehicles.map(v => (
                  <div key={v.id} className="relative group">
                    <VehicleStickerCard
                      vehicle={v}
                      template={template}
                      size="compact"
                      showChecklist={showChecklist}
                      showDriver={showDriver}
                      showVin={showVin}
                      showEmergencyContact={showEmergencyContact}
                      showBarcode={showBarcode}
                      onScanSimulate={(scanned) => {
                        setScanningVehicleId(scanned.id);
                        setActiveTab('scanner');
                      }}
                    />
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: Field Tech Fast-Scanner & Action Simulator */}
          {activeTab === 'scanner' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Simulated QR Scan Terminal (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Technician Mobile Terminal</h4>
                      <span className="text-[9px] text-emerald-400 font-mono">SCANNER ACTIVE</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                    Live Telemetry Link
                  </span>
                </div>

                {/* Vehicle Selection for Scanner */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Scanned Vehicle Asset:
                  </label>
                  <select
                    value={scanningVehicleId}
                    onChange={(e) => setScanningVehicleId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} • {v.make} {v.model} ({v.category} - {v.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scanned Vehicle Telemetry Snapshot Card */}
                {activeScannedVehicle && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-lg font-black font-mono text-white block">
                          {activeScannedVehicle.registrationNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {activeScannedVehicle.make} {activeScannedVehicle.model} ({activeScannedVehicle.year})
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        activeScannedVehicle.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                        activeScannedVehicle.status === 'On Trip' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                        activeScannedVehicle.status === 'Under Maintenance' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {activeScannedVehicle.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px]">Current Battery SoC</span>
                        <div className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Battery className="w-3.5 h-3.5" />
                          <span>{activeScannedVehicle.currentSoCPercent ?? 88}%</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px]">Battery Serial ID</span>
                        <span className="font-mono font-bold text-slate-200 mt-0.5 block truncate">
                          {activeScannedVehicle.batteryId || 'BATT-NBI-8942'}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px]">Odometer Reading</span>
                        <span className="font-mono font-bold text-slate-200 mt-0.5 block">
                          {activeScannedVehicle.odometerKm.toLocaleString()} km
                        </span>
                      </div>

                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px]">Assigned Rider</span>
                        <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                          {activeScannedVehicle.assignedDriverName || 'No Driver'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Field Technician Logging Actions (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                
                {/* Action Mode Toggle */}
                <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setTechActionType('battery-swap')}
                    className={`flex-1 py-2 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      techActionType === 'battery-swap'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Battery className="w-3.5 h-3.5" />
                    <span>Log Battery Swap</span>
                  </button>

                  <button
                    onClick={() => setTechActionType('maintenance')}
                    className={`flex-1 py-2 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      techActionType === 'maintenance'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Log Maintenance</span>
                  </button>

                  <button
                    onClick={() => setTechActionType('status-update')}
                    className={`flex-1 py-2 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      techActionType === 'status-update'
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Fast Status Change</span>
                  </button>
                </div>

                {/* Success Feedback Alert */}
                <AnimatePresence>
                  {techActionSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-emerald-950 border border-emerald-500/60 rounded-xl p-3 text-xs text-emerald-200 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{techActionSuccess}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ACTION FORM 1: Battery Swap Form */}
                {techActionType === 'battery-swap' && (
                  <form onSubmit={handleExecuteSimulatedSwap} className="space-y-3.5 text-xs">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Swap Hub Station:</label>
                        <select
                          value={swapStation}
                          onChange={(e) => setSwapStation(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                        >
                          <option value="Roam Hub Kilimani #2">Roam Hub Kilimani #2</option>
                          <option value="Spiro Station Westlands">Spiro Station Westlands</option>
                          <option value="Ampersand Depot Industrial Area">Ampersand Depot Industrial Area</option>
                          <option value="GreenShift Central Hub Nairobi">GreenShift Central Hub Nairobi</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Technician Name / ID:</label>
                        <input
                          type="text"
                          value={techName}
                          onChange={(e) => setTechName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                          placeholder="e.g. David Ochieng (Tech #402)"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Depleted Battery SoC (%):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={removedSoC}
                          onChange={(e) => setRemovedSoC(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-amber-400 font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Fresh Installed Pack ID:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newBatteryId}
                            onChange={(e) => setNewBatteryId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-emerald-400 font-mono font-bold"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setNewBatteryId(`BATT-NBI-${Math.floor(1000 + Math.random() * 9000)}`)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Generate random pack ID"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">Swap Notes & Verification:</label>
                      <textarea
                        value={swapNotes}
                        onChange={(e) => setSwapNotes(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                        placeholder="Pack locked into bay, high-voltage terminals inspected..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Complete & Authenticate Battery Swap</span>
                    </button>
                  </form>
                )}

                {/* ACTION FORM 2: Maintenance Work Order Form */}
                {techActionType === 'maintenance' && (
                  <form onSubmit={handleExecuteSimulatedMaintenance} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">Maintenance Work Done / Reason:</label>
                      <input
                        type="text"
                        value={maintenanceReason}
                        onChange={(e) => setMaintenanceReason(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                        placeholder="e.g. Brake pad renewal, Chain lube, Firmware calibration"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Target Vehicle Status:</label>
                        <select
                          value={maintenanceStatus}
                          onChange={(e) => setMaintenanceStatus(e.target.value as VehicleStatus)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                        >
                          <option value="Under Maintenance">Under Maintenance (Ground Vehicle)</option>
                          <option value="Available">Available (Cleared for Trip)</option>
                          <option value="Idle">Idle (Depot Storage)</option>
                          <option value="Charging">Charging (Plugged in at Depot)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Signing Technician:</label>
                        <input
                          type="text"
                          value={techName}
                          onChange={(e) => setTechName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Submit Maintenance Work Order</span>
                    </button>
                  </form>
                )}

                {/* ACTION FORM 3: Fast Status Change */}
                {techActionType === 'status-update' && (
                  <div className="space-y-3 text-xs">
                    <label className="text-slate-300 font-semibold block">
                      Fast 1-Touch Status Dispatch:
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { status: 'Available', label: '✅ Available', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' },
                        { status: 'Under Maintenance', label: '🛠️ Maintenance', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' },
                        { status: 'Charging', label: '⚡ Charging', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30' },
                        { status: 'Idle', label: '⏸️ Idle', color: 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' },
                        { status: 'On Trip', label: '🚀 On Trip', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30' },
                        { status: 'Inactive', label: '🛑 Inactive', color: 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30' }
                      ].map((item) => (
                        <button
                          key={item.status}
                          onClick={() => {
                            if (!activeScannedVehicle) return;
                            onUpdateVehicleStatus(activeScannedVehicle.id, item.status);
                            setTechActionSuccess(`Status of ${activeScannedVehicle.registrationNumber} updated to '${item.status}'.`);
                            setTimeout(() => setTechActionSuccess(null), 4000);
                          }}
                          className={`p-3 rounded-xl border text-center font-bold transition shadow-xs cursor-pointer ${item.color}`}
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>GreenShift Asset Tag Specification v4.2 • ISO-27001 Tamper-Evident Standard</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
