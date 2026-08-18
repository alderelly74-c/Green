import QRCode from 'qrcode';
import { Vehicle } from '../types';

export interface VehicleQrPayload {
  vId: string;
  reg: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  category: 'Electric' | 'Fuel';
  batteryId?: string;
  batteryCapacityKwh?: number;
  currentSoCPercent?: number;
  fuelCapacityLiters?: number;
  odometerKm: number;
  status: string;
  city: string;
  assignedDriver?: string;
  technicianActionUrl: string;
  generatedAt: string;
}

/**
 * Build a structured payload string for vehicle field technician scanning
 */
export function buildVehicleQrPayload(vehicle: Vehicle): string {
  const payload: VehicleQrPayload = {
    vId: vehicle.id,
    reg: vehicle.registrationNumber,
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    category: vehicle.category,
    batteryId: vehicle.batteryId || (vehicle.category === 'Electric' ? `BATT-${vehicle.registrationNumber.replace(/\s+/g, '')}-01` : undefined),
    batteryCapacityKwh: vehicle.batteryCapacityKwh || (vehicle.category === 'Electric' ? 3.2 : undefined),
    currentSoCPercent: vehicle.currentSoCPercent,
    fuelCapacityLiters: vehicle.fuelCapacityLiters,
    odometerKm: vehicle.odometerKm,
    status: vehicle.status,
    city: vehicle.city,
    assignedDriver: vehicle.assignedDriverName,
    technicianActionUrl: `https://greenshift.fleet.ke/scan?v=${encodeURIComponent(vehicle.id)}&reg=${encodeURIComponent(vehicle.registrationNumber)}&action=inspect`,
    generatedAt: new Date().toISOString()
  };

  return JSON.stringify(payload);
}

/**
 * Generate high-resolution Data URL for QR Code
 */
export async function generateVehicleQrDataUrl(
  vehicle: Vehicle, 
  theme: 'emerald' | 'amber' | 'carbon' | 'monochrome' = 'monochrome'
): Promise<string> {
  const payloadText = buildVehicleQrPayload(vehicle);

  let darkColor = '#000000';
  let lightColor = '#ffffff';

  if (theme === 'emerald') {
    darkColor = '#064e3b'; // deep forest emerald
    lightColor = '#ffffff';
  } else if (theme === 'amber') {
    darkColor = '#78350f'; // deep amber brown
    lightColor = '#ffffff';
  } else if (theme === 'carbon') {
    darkColor = '#0f172a';
    lightColor = '#f8fafc';
  }

  try {
    const dataUrl = await QRCode.toDataURL(payloadText, {
      width: 480,
      margin: 1.5,
      errorCorrectionLevel: 'H', // High error correction for outdoor dirty/scratched stickers
      color: {
        dark: darkColor,
        light: lightColor
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR Code Data URL:', error);
    // Fallback simple QR
    return QRCode.toDataURL(`GREENSHIFT:${vehicle.registrationNumber}:${vehicle.vin}:${vehicle.id}`);
  }
}

/**
 * Generate SVG string for vector printing
 */
export async function generateVehicleQrSvg(
  vehicle: Vehicle,
  theme: 'emerald' | 'amber' | 'carbon' | 'monochrome' = 'monochrome'
): Promise<string> {
  const payloadText = buildVehicleQrPayload(vehicle);

  let darkColor = '#000000';
  let lightColor = '#ffffff';

  if (theme === 'emerald') {
    darkColor = '#064e3b';
  } else if (theme === 'amber') {
    darkColor = '#78350f';
  } else if (theme === 'carbon') {
    darkColor = '#0f172a';
  }

  try {
    return await QRCode.toString(payloadText, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: darkColor,
        light: lightColor
      }
    });
  } catch (error) {
    console.error('Failed to generate QR Code SVG:', error);
    return '';
  }
}
