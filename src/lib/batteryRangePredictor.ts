import { Vehicle, EvBatterySession } from '../types';

export type TerrainType = 'Flat Urban' | 'Hilly / Elevation' | 'Highway High Speed' | 'Dense Traffic Stop-and-Go';
export type PayloadType = 'Unladen / Solo Rider' | 'Standard Delivery Load' | 'Heavy Cargo / Pillion';
export type DrivingModeType = 'Eco (Max Regen)' | 'Standard Normal' | 'Sport / Fast Throttle';
export type HvacModeType = 'Off' | 'Fan Only' | 'AC Active' | 'Max Climate';

export interface PredictiveRangeParams {
  batteryCapacityKwh: number;
  sohPercent: number; // 0 - 100
  socPercent: number; // 0 - 100
  temperatureC: number; // Celsius (e.g. 15 to 45°C)
  historicalAvgWhPerKm: number; // e.g. 48 Wh/km (0.048 kWh/km)
  terrain?: TerrainType;
  payload?: PayloadType;
  drivingMode?: DrivingModeType;
  hvac?: HvacModeType;
}

export interface SwapStationDistance {
  id: string;
  name: string;
  distanceKm: number;
  location: string;
  availablePacks: number;
  fastChargers: number;
  isReachable: boolean;
  isSafeWithBuffer: boolean;
  energyNeededKwh: number;
  estimatedArrivalSocPercent: number;
}

export interface PredictiveRangeResult {
  usableEnergyKwh: number;
  totalCurrentCapacityKwh: number;
  nominalCapacityKwh: number;
  effectiveWhPerKm: number;
  effectiveKwhPerKm: number;
  estimatedRangeRemainingKm: number;
  safeBufferRangeKm: number; // Range before hitting 10% reserve SoC
  idealConditionRangeKm: number; // Baseline at 24°C, 100% SOH, 100% SoC, flat terrain
  sohLostRangeKm: number; // Lost range purely due to SOH degradation
  temperatureImpactRangeDeltaKm: number; // Impact of temperature (+ or - km vs 24°C)
  temperaturePenaltyFactor: number;
  terrainFactor: number;
  payloadFactor: number;
  drivingModeFactor: number;
  hvacFactor: number;
  confidenceScorePercent: number; // 92% - 98%
  urgencyLevel: 'optimal' | 'moderate' | 'warning' | 'critical';
  statusMessage: string;
  actionGuidance: string;
  nearbyStations: SwapStationDistance[];
}

/**
 * Standard baseline consumption rates by vehicle category / make
 */
export const DEFAULT_VEHICLE_BASELINES: Record<string, { baselineWhPerKm: number; defaultCapacityKwh: number }> = {
  'Roam Air 2W': { baselineWhPerKm: 48, defaultCapacityKwh: 3.24 },
  'Spiro e-Moto': { baselineWhPerKm: 52, defaultCapacityKwh: 3.10 },
  'Ampersand e-Boda': { baselineWhPerKm: 50, defaultCapacityKwh: 3.20 },
  'BYD T3 Cargo Van': { baselineWhPerKm: 142, defaultCapacityKwh: 44.9 },
  'BYD T3 Express': { baselineWhPerKm: 145, defaultCapacityKwh: 44.9 },
  'GreenShift Shuttle': { baselineWhPerKm: 110, defaultCapacityKwh: 32.0 },
  'Opibus e-Bus': { baselineWhPerKm: 185, defaultCapacityKwh: 105.0 },
  'Opibus Electric Bus': { baselineWhPerKm: 185, defaultCapacityKwh: 105.0 },
  'Electric Motorcycle': { baselineWhPerKm: 49, defaultCapacityKwh: 3.20 },
  'Electric Van': { baselineWhPerKm: 145, defaultCapacityKwh: 45.0 },
  'Electric Car': { baselineWhPerKm: 125, defaultCapacityKwh: 38.0 },
  'Commercial Truck': { baselineWhPerKm: 190, defaultCapacityKwh: 110.0 },
};

/**
 * Default Nairobi & Regional EV Swap Hubs for route reachability checking
 */
export const POPULAR_SWAP_STATIONS: Array<{
  id: string;
  name: string;
  distanceKm: number;
  location: string;
  availablePacks: number;
  fastChargers: number;
}> = [
  { id: 'st-01', name: 'Roam Hub Kilimani', distanceKm: 4.8, location: 'Argwings Kodhek Rd, Nairobi', availablePacks: 18, fastChargers: 4 },
  { id: 'st-02', name: 'Spiro Station Westlands', distanceKm: 7.2, location: 'Mpaka Rd, Westlands', availablePacks: 24, fastChargers: 6 },
  { id: 'st-03', name: 'TotalEnergies CBD Solar Swap', distanceKm: 3.1, location: 'Kenyatta Ave, CBD', availablePacks: 12, fastChargers: 2 },
  { id: 'st-04', name: 'Eastleigh Commercial Hub', distanceKm: 9.6, location: '1st Avenue, Eastleigh', availablePacks: 16, fastChargers: 4 },
  { id: 'st-05', name: 'Mombasa Road Logistics Depot', distanceKm: 15.4, location: 'Cabanas, Mombasa Rd', availablePacks: 30, fastChargers: 8 },
  { id: 'st-06', name: 'Thika Road Garden City Hub', distanceKm: 14.1, location: 'Exit 7, Thika Superhighway', availablePacks: 14, fastChargers: 4 },
  { id: 'st-07', name: 'Ngong Road Junction Station', distanceKm: 8.9, location: 'Dagoretti Corner, Ngong Rd', availablePacks: 15, fastChargers: 3 },
  { id: 'st-08', name: 'Industrial Area Enterprise Rd', distanceKm: 6.4, location: 'Enterprise Rd, Ind Area', availablePacks: 22, fastChargers: 6 }
];

/**
 * Extract or compute historical average Wh/km from sessions or vehicle model
 */
export const getVehicleHistoricalWhPerKm = (vehicle: Vehicle, evSessions: EvBatterySession[] = []): number => {
  // Check if vehicle has recent session telemetry
  const vehicleSessions = evSessions.filter(s => s.vehicleId === vehicle.id || s.vehicleReg === vehicle.registrationNumber);
  
  if (vehicleSessions.length > 0) {
    const totalKwh = vehicleSessions.reduce((sum, s) => sum + (s.energyKwhConsumed || 0), 0);
    // Estimate distance driven based on session count and duration (~25km/session avg in city)
    const estimatedDistanceKm = vehicleSessions.reduce((sum, s) => sum + Math.max(10, (s.durationMinutes || 20) * 0.8), 0);
    if (estimatedDistanceKm > 0 && totalKwh > 0) {
      const derivedWhKm = (totalKwh / estimatedDistanceKm) * 1000;
      if (derivedWhKm >= 30 && derivedWhKm <= 350) {
        return Math.round(derivedWhKm);
      }
    }
  }

  // Lookup in default dictionary by model or vehicle type
  const matchKey = Object.keys(DEFAULT_VEHICLE_BASELINES).find(key => 
    `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(key.toLowerCase()) ||
    vehicle.type.toLowerCase().includes(key.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(key.toLowerCase())
  );

  if (matchKey && DEFAULT_VEHICLE_BASELINES[matchKey]) {
    return DEFAULT_VEHICLE_BASELINES[matchKey].baselineWhPerKm;
  }

  // Fallback depending on vehicle category / type
  if (vehicle.type.includes('Motorcycle') || vehicle.type.includes('Bicycle') || vehicle.type.includes('Scooter')) {
    return 48; // Wh/km for 2W
  }
  if (vehicle.type.includes('Van') || vehicle.type.includes('Car')) {
    return 140; // Wh/km for EV Van/Car
  }
  if (vehicle.type.includes('Truck') || vehicle.type.includes('Bus')) {
    return 185; // Wh/km for Heavy EV
  }

  return 50;
};

/**
 * Get nominal battery capacity (kWh)
 */
export const getVehicleNominalCapacityKwh = (vehicle: Vehicle): number => {
  if (vehicle.batteryCapacityKwh && vehicle.batteryCapacityKwh > 0) {
    return vehicle.batteryCapacityKwh;
  }

  const matchKey = Object.keys(DEFAULT_VEHICLE_BASELINES).find(key => 
    `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(key.toLowerCase()) ||
    vehicle.type.toLowerCase().includes(key.toLowerCase())
  );

  if (matchKey && DEFAULT_VEHICLE_BASELINES[matchKey]) {
    return DEFAULT_VEHICLE_BASELINES[matchKey].defaultCapacityKwh;
  }

  if (vehicle.type.includes('Motorcycle')) return 3.24;
  if (vehicle.type.includes('Van')) return 44.9;
  if (vehicle.type.includes('Truck')) return 105.0;
  return 3.5;
};

/**
 * Core Predictive Range Remaining Engine
 * Computes exact usable energy and non-linear multi-factor consumption:
 * Range (km) = [Nominal kWh * (SOH / 100) * (SoC / 100)] / [Historical Wh/km * eta_temp * eta_terrain * eta_payload * eta_style * eta_hvac / 1000]
 */
export const calculatePredictiveRange = (params: PredictiveRangeParams): PredictiveRangeResult => {
  const {
    batteryCapacityKwh,
    sohPercent,
    socPercent,
    temperatureC,
    historicalAvgWhPerKm,
    terrain = 'Flat Urban',
    payload = 'Standard Delivery Load',
    drivingMode = 'Standard Normal',
    hvac = 'Off'
  } = params;

  // 1. Usable Battery Energy Calculation
  const clampedSoh = Math.min(100, Math.max(10, sohPercent));
  const clampedSoc = Math.min(100, Math.max(0, socPercent));
  const nominalCapacityKwh = Math.max(0.5, batteryCapacityKwh);
  
  const totalCurrentCapacityKwh = nominalCapacityKwh * (clampedSoh / 100);
  const usableEnergyKwh = totalCurrentCapacityKwh * (clampedSoc / 100);

  // 2. Temperature Penalty Factor (Electrochemical kinetics + Thermal Management)
  // Optimal battery temperature band is 21°C - 26°C.
  let temperaturePenaltyFactor = 1.0;
  if (temperatureC < 21) {
    // Low temperatures increase electrolyte viscosity and internal cell resistance
    // ~2.2% consumption penalty per degree below 21°C
    temperaturePenaltyFactor = 1.0 + (21 - temperatureC) * 0.022;
  } else if (temperatureC > 26) {
    // High temperatures trigger BMS cooling fans, thermal throttling, and battery cooling circuits
    // Exponential increase beyond 26°C
    temperaturePenaltyFactor = 1.0 + Math.pow(temperatureC - 26, 1.35) * 0.021;
  }

  // 3. Terrain Factor
  let terrainFactor = 1.0;
  switch (terrain) {
    case 'Flat Urban':
      terrainFactor = 1.0;
      break;
    case 'Hilly / Elevation':
      terrainFactor = 1.22; // +22% consumption climbing gradients (e.g. Upper Hill, Limuru)
      break;
    case 'Highway High Speed':
      terrainFactor = 0.93; // -7% consumption at steady cruise, though aerodynamic drag increases at >75 km/h
      break;
    case 'Dense Traffic Stop-and-Go':
      terrainFactor = 1.15; // +15% repeated acceleration inertia
      break;
  }

  // 4. Payload Factor
  let payloadFactor = 1.0;
  switch (payload) {
    case 'Unladen / Solo Rider':
      payloadFactor = 0.94; // Light weight saves ~6%
      break;
    case 'Standard Delivery Load':
      payloadFactor = 1.0;
      break;
    case 'Heavy Cargo / Pillion':
      payloadFactor = 1.18; // Heavy load increases rolling resistance and acceleration torque
      break;
  }

  // 5. Driving Mode / Regenerative Braking Factor
  let drivingModeFactor = 1.0;
  switch (drivingMode) {
    case 'Eco (Max Regen)':
      drivingModeFactor = 0.91; // Regen braking captures ~9% kinetic energy
      break;
    case 'Standard Normal':
      drivingModeFactor = 1.0;
      break;
    case 'Sport / Fast Throttle':
      drivingModeFactor = 1.20; // High peak acceleration draws high C-rates with I^2*R copper losses
      break;
  }

  // 6. HVAC / Climate Control Factor
  let hvacFactor = 1.0;
  switch (hvac) {
    case 'Off':
      hvacFactor = 1.0;
      break;
    case 'Fan Only':
      hvacFactor = 1.02; // Small 12V blower power
      break;
    case 'AC Active':
      hvacFactor = 1.12; // High-voltage compressor draw
      break;
    case 'Max Climate':
      hvacFactor = 1.22; // Extreme cooling in heatwave
      break;
  }

  // 7. Calculate Effective Energy Consumption
  const effectiveWhPerKm = historicalAvgWhPerKm * temperaturePenaltyFactor * terrainFactor * payloadFactor * drivingModeFactor * hvacFactor;
  const effectiveKwhPerKm = effectiveWhPerKm / 1000;

  // 8. Calculate Estimated Range Remaining
  const estimatedRangeRemainingKm = effectiveKwhPerKm > 0 
    ? Math.round((usableEnergyKwh / effectiveKwhPerKm) * 10) / 10
    : 0;

  // 9. Safe Buffer Range (Reserving 10% SoC to avoid stranding the driver)
  const reserveEnergyKwh = totalCurrentCapacityKwh * 0.10;
  const safeUsableEnergyKwh = Math.max(0, usableEnergyKwh - reserveEnergyKwh);
  const safeBufferRangeKm = effectiveKwhPerKm > 0
    ? Math.round((safeUsableEnergyKwh / effectiveKwhPerKm) * 10) / 10
    : 0;

  // 10. Baseline Comparison Calculations (Ideal 24°C, 100% SOH, 100% SoC)
  const idealWhPerKm = historicalAvgWhPerKm;
  const idealFullRangeKm = Math.round((nominalCapacityKwh / (idealWhPerKm / 1000)) * 10) / 10;
  
  // SOH lost range (What range would be with 100% SOH at current SoC and conditions vs actual)
  const theoretical100SohUsableKwh = nominalCapacityKwh * (clampedSoc / 100);
  const theoretical100SohRangeKm = Math.round((theoretical100SohUsableKwh / effectiveKwhPerKm) * 10) / 10;
  const sohLostRangeKm = Math.max(0, Math.round((theoretical100SohRangeKm - estimatedRangeRemainingKm) * 10) / 10);

  // Temperature impact delta vs 24°C ideal
  const effectiveWhWithoutTemp = historicalAvgWhPerKm * terrainFactor * payloadFactor * drivingModeFactor * hvacFactor;
  const rangeWithoutTempKm = (usableEnergyKwh / (effectiveWhWithoutTemp / 1000));
  const temperatureImpactRangeDeltaKm = Math.round((estimatedRangeRemainingKm - rangeWithoutTempKm) * 10) / 10;

  // 11. Urgency Level and Status Guidance
  let urgencyLevel: 'optimal' | 'moderate' | 'warning' | 'critical' = 'optimal';
  let statusMessage = 'Excellent Range';
  let actionGuidance = 'Sufficient battery for scheduled deliveries. No immediate swap required.';

  if (clampedSoc <= 15 || estimatedRangeRemainingKm <= 8) {
    urgencyLevel = 'critical';
    statusMessage = 'Critical Low Energy';
    actionGuidance = 'Proceed immediately to the nearest battery swap hub. Avoid steep gradients.';
  } else if (clampedSoc <= 30 || estimatedRangeRemainingKm <= 18) {
    urgencyLevel = 'warning';
    statusMessage = 'Low Range Warning';
    actionGuidance = 'Enable Eco Mode with max regenerative braking. Plan route towards a swap station.';
  } else if (clampedSoc <= 55 || estimatedRangeRemainingKm <= 35) {
    urgencyLevel = 'moderate';
    statusMessage = 'Moderate Range';
    actionGuidance = 'Comfortable for local zone trips. Consider swapping before afternoon cross-town jobs.';
  }

  // 12. Station Reachability Analysis
  const nearbyStations: SwapStationDistance[] = POPULAR_SWAP_STATIONS.map(station => {
    const energyNeededKwh = (station.distanceKm * effectiveWhPerKm) / 1000;
    const remainingAfterTripKwh = usableEnergyKwh - energyNeededKwh;
    const estimatedArrivalSocPercent = totalCurrentCapacityKwh > 0
      ? Math.max(0, Math.round((remainingAfterTripKwh / totalCurrentCapacityKwh) * 100))
      : 0;

    const isReachable = estimatedRangeRemainingKm >= station.distanceKm;
    const isSafeWithBuffer = safeBufferRangeKm >= station.distanceKm;

    return {
      ...station,
      isReachable,
      isSafeWithBuffer,
      energyNeededKwh: Math.round(energyNeededKwh * 100) / 100,
      estimatedArrivalSocPercent
    };
  });

  return {
    usableEnergyKwh: Math.round(usableEnergyKwh * 100) / 100,
    totalCurrentCapacityKwh: Math.round(totalCurrentCapacityKwh * 100) / 100,
    nominalCapacityKwh: Math.round(nominalCapacityKwh * 100) / 100,
    effectiveWhPerKm: Math.round(effectiveWhPerKm),
    effectiveKwhPerKm: Math.round(effectiveKwhPerKm * 1000) / 1000,
    estimatedRangeRemainingKm,
    safeBufferRangeKm,
    idealConditionRangeKm: idealFullRangeKm,
    sohLostRangeKm,
    temperatureImpactRangeDeltaKm,
    temperaturePenaltyFactor: Math.round(temperaturePenaltyFactor * 100) / 100,
    terrainFactor: Math.round(terrainFactor * 100) / 100,
    payloadFactor: Math.round(payloadFactor * 100) / 100,
    drivingModeFactor: Math.round(drivingModeFactor * 100) / 100,
    hvacFactor: Math.round(hvacFactor * 100) / 100,
    confidenceScorePercent: 95,
    urgencyLevel,
    statusMessage,
    actionGuidance,
    nearbyStations
  };
};
