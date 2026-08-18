import { 
  Vehicle, Driver, Trip, EvBatterySession, FuelTransaction, 
  MaintenanceWorkOrder, SparePartItem, VehicleDocument, IncidentReport, 
  MpesaPayoutRequest, AuditLogEntry, DispatcherMessage 
} from '../types';

const CACHE_KEY = 'greenshift_fleet_cache_v1';

export interface FleetCacheData {
  lastSyncedAt: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  evSessions: EvBatterySession[];
  fuelTxns: FuelTransaction[];
  workOrders: MaintenanceWorkOrder[];
  spareParts: SparePartItem[];
  documents: VehicleDocument[];
  incidents: IncidentReport[];
  mpesaPayouts: MpesaPayoutRequest[];
  auditLogs: AuditLogEntry[];
  driverMessages: DispatcherMessage[];
}

export const loadFleetCache = (): FleetCacheData | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FleetCacheData;
    if (parsed && Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse cached fleet data from localStorage:', err);
  }
  return null;
};

export const saveFleetCache = (data: Omit<FleetCacheData, 'lastSyncedAt'>): string => {
  const timestamp = new Date().toLocaleString('en-KE', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  }) + ' EAT';

  const cachePayload: FleetCacheData = {
    ...data,
    lastSyncedAt: timestamp
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
  } catch (err) {
    console.warn('Failed to save fleet data to localStorage cache:', err);
  }

  return timestamp;
};

export const clearFleetCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn('Failed to clear fleet localStorage cache:', err);
  }
};
