import React, { useEffect, useState, useRef } from 'react';
import { Vehicle } from '../../types';
import { generateVehicleQrDataUrl } from '../../lib/qrCodeGenerator';
import { Zap, Fuel, Shield, Battery, Wrench, AlertTriangle, QrCode, Phone, CheckCircle2 } from 'lucide-react';

export type StickerTemplate = 'industrial-rugged' | 'clean-eco' | 'battery-hatch' | 'monochrome-thermal';
export type StickerSize = 'standard' | 'compact' | 'square';

interface VehicleStickerCardProps {
  vehicle: Vehicle;
  template?: StickerTemplate;
  size?: StickerSize;
  showChecklist?: boolean;
  showDriver?: boolean;
  showVin?: boolean;
  showEmergencyContact?: boolean;
  showBarcode?: boolean;
  customNotes?: string;
  onScanSimulate?: (vehicle: Vehicle) => void;
}

export const VehicleStickerCard: React.FC<VehicleStickerCardProps> = ({
  vehicle,
  template = 'industrial-rugged',
  size = 'standard',
  showChecklist = true,
  showDriver = true,
  showVin = true,
  showEmergencyContact = true,
  showBarcode = true,
  customNotes,
  onScanSimulate
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const themeMap: Record<StickerTemplate, 'emerald' | 'amber' | 'carbon' | 'monochrome'> = {
      'industrial-rugged': 'amber',
      'clean-eco': 'emerald',
      'battery-hatch': 'carbon',
      'monochrome-thermal': 'monochrome'
    };

    generateVehicleQrDataUrl(vehicle, themeMap[template])
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR for sticker:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [vehicle, template]);

  const isEv = vehicle.category === 'Electric';
  const batteryId = vehicle.batteryId || (isEv ? `BATT-${vehicle.registrationNumber.replace(/[^A-Z0-9]/gi, '')}-01` : 'N/A');
  const batteryCapacity = vehicle.batteryCapacityKwh ? `${vehicle.batteryCapacityKwh} kWh` : isEv ? '3.2 kWh' : 'N/A';

  // Sizing Styles
  const sizeClasses = {
    standard: 'w-full max-w-[460px] min-h-[290px]',
    compact: 'w-full max-w-[380px] min-h-[240px]',
    square: 'w-full max-w-[340px] aspect-square'
  }[size];

  // Template Styles
  const getTemplateContainerStyles = () => {
    switch (template) {
      case 'industrial-rugged':
        return 'bg-gradient-to-b from-slate-900 via-slate-900 to-black text-slate-100 border-2 border-amber-500/80 shadow-2xl shadow-amber-950/40';
      case 'clean-eco':
        return 'bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/40';
      case 'battery-hatch':
        return 'bg-slate-950 text-slate-100 border-2 border-cyan-500/80 shadow-2xl shadow-cyan-950/40';
      case 'monochrome-thermal':
        return 'bg-white text-slate-950 border-2 border-black shadow-lg';
    }
  };

  const isMono = template === 'monochrome-thermal';

  return (
    <div 
      className={`relative rounded-xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none font-sans print:border-black print:text-black print:bg-white print:shadow-none print:break-inside-avoid ${sizeClasses} ${getTemplateContainerStyles()}`}
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      {/* Industrial Hazard Caution Stripes Top Bar (if Rugged) */}
      {template === 'industrial-rugged' && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_10px,#0f172a_10px,#0f172a_20px)] border-b border-amber-500/50" />
      )}

      {template === 'clean-eco' && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
      )}

      {template === 'battery-hatch' && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />
      )}

      {/* Header Tag Bar */}
      <div className="flex items-center justify-between border-b pb-2 pt-1 border-slate-700/60 print:border-slate-400">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
            isMono ? 'bg-black text-white' : isEv ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
          }`}>
            {isEv ? <Zap className="w-3.5 h-3.5 fill-current" /> : <Fuel className="w-3.5 h-3.5 fill-current" />}
          </div>
          <div>
            <span className={`text-[10px] font-black tracking-wider uppercase block leading-none ${
              isMono ? 'text-black' : 'text-emerald-400'
            }`}>
              GREENSHIFT FLEET
            </span>
            <span className={`text-[8px] font-mono uppercase tracking-widest ${
              isMono ? 'text-slate-600' : 'text-slate-400'
            }`}>
              COMMERCIAL ASSET TAG • {vehicle.city}
            </span>
          </div>
        </div>

        {/* Security / Tamper Badge */}
        <div className="text-right">
          <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
            isMono 
              ? 'bg-slate-100 text-black border-black' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            <Shield className="w-2.5 h-2.5" />
            <span>TAMPER SEAL</span>
          </span>
        </div>
      </div>

      {/* Core Asset Details & QR Code Grid */}
      <div className="grid grid-cols-12 gap-3 items-center my-2.5">
        
        {/* Left Column: Huge Registration, Model & Specs (7 or 8 cols) */}
        <div className="col-span-7 sm:col-span-8 space-y-1.5">
          <div>
            <span className={`text-[9px] uppercase tracking-wider font-bold block ${
              isMono ? 'text-slate-600' : 'text-slate-400'
            }`}>
              Asset Registration No.
            </span>
            <div className="flex items-center gap-2">
              <h3 className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
                isMono ? 'text-black' : 'text-white'
              }`}>
                {vehicle.registrationNumber}
              </h3>
            </div>
            <p className={`text-xs font-semibold ${
              isMono ? 'text-slate-800' : 'text-slate-300'
            }`}>
              {vehicle.make} {vehicle.model} ({vehicle.year}) • {vehicle.color}
            </p>
          </div>

          {/* EV Battery Spec Badge or Fuel Tank */}
          <div className={`p-2 rounded-lg border text-[11px] space-y-0.5 ${
            isMono 
              ? 'bg-slate-50 border-slate-300 text-black' 
              : isEv 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
              : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-center justify-between font-mono font-bold">
              <span className="flex items-center gap-1">
                {isEv ? <Battery className="w-3 h-3 text-emerald-400 shrink-0" /> : <Fuel className="w-3 h-3 text-amber-400 shrink-0" />}
                <span>{isEv ? 'BATTERY PACK ID' : 'FUEL TANK'}:</span>
              </span>
              <span className={isMono ? 'text-black' : 'text-white'}>
                {isEv ? batteryId : `${vehicle.fuelCapacityLiters || 45}L Tank`}
              </span>
            </div>

            {isEv && (
              <div className="flex items-center justify-between text-[10px] opacity-90">
                <span>Pack Rating: {batteryCapacity}</span>
                <span className="font-mono">SoC: {vehicle.currentSoCPercent ?? 90}%</span>
              </div>
            )}
          </div>

          {/* VIN Number */}
          {showVin && (
            <div className="text-[10px] font-mono truncate">
              <span className={isMono ? 'text-slate-500' : 'text-slate-400'}>VIN: </span>
              <span className={`font-bold ${isMono ? 'text-black' : 'text-slate-200'}`}>{vehicle.vin}</span>
            </div>
          )}

          {/* Assigned Driver if enabled */}
          {showDriver && vehicle.assignedDriverName && (
            <div className="text-[10px] truncate">
              <span className={isMono ? 'text-slate-500' : 'text-slate-400'}>Operator: </span>
              <span className={`font-bold ${isMono ? 'text-black' : 'text-slate-200'}`}>👤 {vehicle.assignedDriverName}</span>
            </div>
          )}
        </div>

        {/* Right Column: High Resolution QR Code Matrix (5 or 4 cols) */}
        <div className="col-span-5 sm:col-span-4 flex flex-col items-center justify-center text-center">
          <div className={`p-1.5 rounded-lg border flex flex-col items-center justify-center bg-white ${
            isMono ? 'border-black' : 'border-slate-700 shadow-md'
          }`}>
            {isGenerating || !qrDataUrl ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center text-slate-400 bg-slate-100 rounded">
                <QrCode className="w-8 h-8 animate-pulse text-slate-600" />
                <span className="text-[9px] font-bold mt-1">Generating QR...</span>
              </div>
            ) : (
              <img 
                src={qrDataUrl} 
                alt={`QR Code for ${vehicle.registrationNumber}`}
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-900 mt-0.5 font-mono">
              SCAN TO SWAP / LOG
            </span>
          </div>

          {onScanSimulate && (
            <button
              onClick={() => onScanSimulate(vehicle)}
              className="mt-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline print:hidden cursor-pointer flex items-center gap-0.5"
              title="Test scan this QR code"
            >
              <span>Simulate Scan</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>

      </div>

      {/* Field Technician Instructions Protocol Strip */}
      {showChecklist && (
        <div className={`pt-2 pb-1.5 px-2 rounded border text-[9px] space-y-0.5 my-1 ${
          isMono 
            ? 'bg-slate-100 border-slate-300 text-slate-800' 
            : 'bg-slate-900/80 border-slate-800 text-slate-300'
        }`}>
          <span className={`font-black uppercase tracking-wider block text-[8px] ${
            isMono ? 'text-black' : 'text-amber-400'
          }`}>
            FIELD TECHNICIAN LOGGING INSTRUCTIONS:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[8.5px] leading-tight">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              <span>1. Scan QR matrix</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              <span>2. Check battery lock</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              <span>3. Confirm swap log</span>
            </span>
          </div>
        </div>
      )}

      {/* Barcode representation line */}
      {showBarcode && (
        <div className="py-1 flex flex-col items-center justify-center opacity-85">
          <div className={`w-full h-4 flex items-center justify-center gap-0.5 overflow-hidden ${
            isMono ? 'text-black' : 'text-slate-300'
          }`}>
            {/* Simulated clean 1D vector barcode bars */}
            {[2, 1, 3, 1, 4, 2, 1, 3, 2, 1, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2, 3, 2, 1, 4, 2, 1, 3, 1, 2].map((w, idx) => (
              <span 
                key={idx} 
                className={`inline-block h-4 ${isMono ? 'bg-black' : 'bg-slate-300'}`} 
                style={{ width: `${w * 1.5}px` }} 
              />
            ))}
          </div>
          <span className={`text-[8px] font-mono tracking-widest uppercase ${
            isMono ? 'text-slate-600' : 'text-slate-400'
          }`}>
            *{vehicle.registrationNumber.replace(/\s+/g, '')}*
          </span>
        </div>
      )}

      {/* Footer Hotline & High Voltage Safety Warning */}
      <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[8px] font-mono print:border-slate-400">
        <div className="flex items-center gap-1">
          <Phone className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span className={isMono ? 'text-slate-700' : 'text-slate-400'}>
            Tech Support: +254 700 890 120
          </span>
        </div>

        <span className={`font-bold ${isMono ? 'text-red-700' : 'text-amber-400'}`}>
          {isEv ? '⚡ 72V HIGH VOLTAGE SYSTEM' : '⛽ FUEL FLAMMABLE HAZARD'}
        </span>
      </div>

    </div>
  );
};
