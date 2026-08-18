import React, { useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Zap, Fuel, DollarSign, TrendingUp, Users, 
  Bike, AlertTriangle, Battery, ShieldAlert, ArrowUpRight, 
  PlusCircle, Wallet, Wrench, Activity, Gauge,
  Route, MapPin, Navigation, CheckCircle2, Clock, CreditCard,
  Smartphone, ArrowRight, Star, Archive, Sparkles
} from 'lucide-react';
import { FleetSummaryStats, Vehicle, Driver, IncidentReport, Trip } from '../types';
import { 
  ResponsiveContainer, AreaChart, Area, LineChart, Line, 
  XAxis, YAxis, Tooltip, BarChart, Bar, Cell, CartesianGrid, Legend 
} from 'recharts';
import { FleetUtilizationChart } from './FleetUtilizationChart';
import { AlertsFeed } from './AlertsFeed';
import { TripsHistoryModal } from './modals/TripsHistoryModal';

interface TripMapThumbnailProps {
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  tripId: string;
}

const TripMapThumbnail: React.FC<TripMapThumbnailProps> = ({
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  tripId
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Standard Nairobi coordinates as fallback if lat/lng missing
    const startLat = (pickupLat && !isNaN(pickupLat)) ? pickupLat : -1.286389;
    const startLng = (pickupLng && !isNaN(pickupLng)) ? pickupLng : 36.817223;
    const endLat = (destinationLat && !isNaN(destinationLat)) ? destinationLat : -1.2985;
    const endLng = (destinationLng && !isNaN(destinationLng)) ? destinationLng : 36.8180;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    const pickupPos: [number, number] = [startLat, startLng];
    const dropoffPos: [number, number] = [endLat, endLng];

    // Pickup marker (Emerald green circle)
    const pickupIcon = L.divIcon({
      className: 'custom-trip-thumbnail-pin',
      html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    // Dropoff marker (Red/Rose circle)
    const dropoffIcon = L.divIcon({
      className: 'custom-trip-thumbnail-pin',
      html: `<div style="background-color: #f43f5e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    L.marker(pickupPos, { icon: pickupIcon }).addTo(map);
    L.marker(dropoffPos, { icon: dropoffIcon }).addTo(map);

    // Polyline connecting route
    const polyline = L.polyline([pickupPos, dropoffPos], {
      color: '#059669',
      weight: 3.5,
      opacity: 0.95,
      dashArray: '5, 5'
    }).addTo(map);

    // Fit map bounds to show route nicely inside thumbnail
    const bounds = L.latLngBounds([pickupPos, dropoffPos]);
    map.fitBounds(bounds, { padding: [14, 14] });

    return () => {
      map.remove();
    };
  }, [pickupLat, pickupLng, destinationLat, destinationLng, tripId]);

  return (
    <div className="relative shrink-0">
      <div 
        ref={mapContainerRef} 
        className="w-28 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-2xs bg-slate-100 z-0 pointer-events-none"
      />
      <div className="absolute bottom-1 left-1 bg-slate-900/80 backdrop-blur-xs text-[9px] font-bold text-white px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>Route</span>
      </div>
    </div>
  );
};

interface DashboardOverviewProps {
  stats: FleetSummaryStats | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  incidents: IncidentReport[];
  trips?: Trip[];
  onArchiveTrips?: (tripIds: string[]) => void;
  onRestoreTrip?: (tripId: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenNewVehicleModal: () => void;
  onOpenFuelModal: () => void;
  onOpenEvModal: () => void;
  onOpenMpesaModal: () => void;
  onOpenIncidentModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  vehicles = [],
  drivers = [],
  incidents = [],
  trips = [],
  onArchiveTrips = () => {},
  onRestoreTrip = () => {},
  onNavigateTab = (_tab?: any) => {},
  onOpenNewVehicleModal = () => {},
  onOpenFuelModal = () => {},
  onOpenEvModal = () => {},
  onOpenMpesaModal = () => {},
  onOpenIncidentModal = () => {}
}) => {
  const [isTripsVaultOpen, setIsTripsVaultOpen] = React.useState(false);
  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
        Loading GreenShift Fleet Command Center...
      </div>
    );
  }

  // Simulated 7-day revenue vs expense trend data (KES)
  const financialTrendData = [
    { day: 'Mon', revenue: 410000, fuel: 82000, evCharging: 12000, netProfit: 316000 },
    { day: 'Tue', revenue: 450000, fuel: 88000, evCharging: 13500, netProfit: 348500 },
    { day: 'Wed', revenue: 490000, fuel: 92000, evCharging: 14200, netProfit: 383800 },
    { day: 'Thu', revenue: 520000, fuel: 95000, evCharging: 15100, netProfit: 409900 },
    { day: 'Fri', revenue: 610000, fuel: 105000, evCharging: 18000, netProfit: 487000 },
    { day: 'Sat', revenue: 680000, fuel: 112000, evCharging: 21000, netProfit: 547000 },
    { day: 'Sun (Today)', revenue: stats.todayGrossRevenueKes, fuel: stats.todayFuelExpensesKes, evCharging: stats.todayChargingExpensesKes, netProfit: stats.todayCompanyProfitKes }
  ];

  // Dedicated Last 7 Days Revenue Trend Dataset for Recharts Line Chart
  const last7DaysRevenueTrend = [
    { day: 'Mon', date: 'Aug 3', revenue: 410000, evRevenue: 285000, fuelRevenue: 125000, target: 400000 },
    { day: 'Tue', date: 'Aug 4', revenue: 450000, evRevenue: 315000, fuelRevenue: 135000, target: 400000 },
    { day: 'Wed', date: 'Aug 5', revenue: 490000, evRevenue: 345000, fuelRevenue: 145000, target: 450000 },
    { day: 'Thu', date: 'Aug 6', revenue: 520000, evRevenue: 370000, fuelRevenue: 150000, target: 450000 },
    { day: 'Fri', date: 'Aug 7', revenue: 610000, evRevenue: 435000, fuelRevenue: 175000, target: 500000 },
    { day: 'Sat', date: 'Aug 8', revenue: 680000, evRevenue: 490000, fuelRevenue: 190000, target: 500000 },
    { 
      day: 'Sun', 
      date: 'Today', 
      revenue: stats.todayGrossRevenueKes || 720000, 
      evRevenue: Math.round((stats.todayGrossRevenueKes || 720000) * 0.71), 
      fuelRevenue: Math.round((stats.todayGrossRevenueKes || 720000) * 0.29), 
      target: 500000 
    }
  ];

  const total7DayRevenue = last7DaysRevenueTrend.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = Math.round(total7DayRevenue / 7);
  const peakDayObj = last7DaysRevenueTrend.reduce((max, d) => d.revenue > max.revenue ? d : max, last7DaysRevenueTrend[0]);
  const totalEvSegmentRev = last7DaysRevenueTrend.reduce((sum, d) => sum + d.evRevenue, 0);
  const evRevSharePercent = Math.round((totalEvSegmentRev / total7DayRevenue) * 100);
  const revenueGrowthPercent = Math.round(((last7DaysRevenueTrend[6].revenue - last7DaysRevenueTrend[0].revenue) / last7DaysRevenueTrend[0].revenue) * 100);

  const vehicleCategoryChart = [
    { name: 'EV Boda / Bikes', count: vehicles.filter(v => v.type === 'Electric Motorcycle').length, fill: '#10b981' },
    { name: 'Fuel Boda', count: vehicles.filter(v => v.type === 'Fuel Motorcycle').length, fill: '#f59e0b' },
    { name: 'EV Cars', count: vehicles.filter(v => v.type === 'Electric Car').length, fill: '#3b82f6' },
    { name: 'Fuel Cars', count: vehicles.filter(v => v.type === 'Petrol Car' || v.type === 'Diesel Car').length, fill: '#a855f7' },
    { name: 'EV Vans', count: vehicles.filter(v => v.type === 'Van').length, fill: '#06b6d4' }
  ];

  const criticalVehiclesCount = vehicles.filter(v => {
    const d = drivers.find(drv => drv.id === v.assignedDriverId);
    return d && d.safetyScorePercent < 80;
  }).length;

  // Operational calculations from existing vehicle data
  const totalVehiclesCount = vehicles.length || 1;
  const activeVehiclesCount = vehicles.filter(v => 
    v.status === 'On Trip' || v.status === 'Online' || v.status === 'Charging' || v.status === 'Refueling'
  ).length;
  const fleetUtilizationRate = Math.round((activeVehiclesCount / totalVehiclesCount) * 100);
  const onTripVehiclesCount = vehicles.filter(v => v.status === 'On Trip').length;
  const idleMaintenanceCount = vehicles.filter(v => 
    v.status === 'Under Maintenance' || v.status === 'Idle' || v.status === 'Available'
  ).length;

  const totalFuelCostKes = vehicles.reduce((sum, v) => sum + (v.totalFuelSpentKes || 0), 0);
  const totalChargingCostKes = vehicles.reduce((sum, v) => sum + (v.totalChargingSpentKes || 0), 0);
  const totalMaintenanceCostKes = vehicles.reduce((sum, v) => sum + (v.totalMaintenanceSpentKes || 0), 0);
  const totalOperationalCostsKes = totalFuelCostKes + totalChargingCostKes + totalMaintenanceCostKes;

  // Automated maintenance alerts count (Service mileage <= 500 km or NTSA Inspection <= 7 days)
  const maintenanceAlertsCount = vehicles.filter(v => {
    const targetServiceKm = v.nextServiceOdometerKm || (Math.ceil(v.odometerKm / 5000) * 5000);
    const kmDiff = targetServiceKm - v.odometerKm;

    let ntsaAlert = false;
    if (v.ntsaInspectionExpiry) {
      const expDate = new Date(v.ntsaInspectionExpiry);
      const daysDiff = Math.ceil((expDate.getTime() - new Date('2026-08-08').getTime()) / (1000 * 3600 * 24));
      ntsaAlert = daysDiff <= 7;
    }

    return kmDiff <= 500 || ntsaAlert;
  }).length;

  // Derive completed trips for the Recent Trips card (last 5 completed trips)
  const completedTripsList = useMemo(() => {
    const fromProps = (trips || []).filter(t => t.tripStatus === 'Completed');
    if (fromProps.length >= 5) {
      return fromProps.slice(0, 5);
    }

    // Default fallback dataset referencing actual drivers and vehicles
    const defaults: Trip[] = [
      {
        id: 'trip-101',
        tripCode: 'TRP-2026-901',
        driverId: 'd-1',
        driverName: drivers.find(d => d.id === 'd-1')?.fullName || 'Juma Omondi',
        driverPhone: '+254712345678',
        vehicleId: 'v-1',
        vehicleReg: 'KMG 482E',
        vehicleType: 'Electric Motorcycle',
        customerName: 'Amina Hassan',
        customerPhone: '+254722001122',
        pickupLocationName: 'JKIA Terminal 1D',
        pickupLat: -1.3322,
        pickupLng: 36.9275,
        destinationLocationName: 'Villa Rosa Kempinski, Westlands',
        destinationLat: -1.2683,
        destinationLng: 36.8094,
        distanceKm: 18.5,
        durationMinutes: 32,
        fareKes: 2450,
        platformFeeKes: 490,
        companyRevenueKes: 490,
        driverEarningsKes: 1960,
        paymentMethod: 'M-Pesa',
        paymentStatus: 'Paid',
        mpesaReceiptNumber: 'QHK918204M',
        tripStatus: 'Completed',
        rating: 5.0,
        startTime: '2026-08-09 13:03 EAT',
        endTime: 'Today 13:35 EAT'
      },
      {
        id: 'trip-102',
        tripCode: 'TRP-2026-902',
        driverId: 'd-5',
        driverName: drivers.find(d => d.id === 'd-5')?.fullName || 'Mercy Chebet',
        driverPhone: '+254722114455',
        vehicleId: 'v-5',
        vehicleReg: 'KCB 910X',
        vehicleType: 'Fuel Motorcycle',
        customerName: 'David Ochieng',
        customerPhone: '+254733445566',
        pickupLocationName: 'Lavington Green Mall',
        pickupLat: -1.2801,
        pickupLng: 36.7682,
        destinationLocationName: 'Upper Hill Financial District',
        destinationLat: -1.2985,
        destinationLng: 36.8180,
        distanceKm: 7.2,
        durationMinutes: 18,
        fareKes: 850,
        platformFeeKes: 170,
        companyRevenueKes: 170,
        driverEarningsKes: 680,
        paymentMethod: 'M-Pesa',
        paymentStatus: 'Paid',
        mpesaReceiptNumber: 'QHK918112M',
        tripStatus: 'Completed',
        rating: 4.9,
        startTime: '2026-08-09 12:52 EAT',
        endTime: 'Today 13:10 EAT'
      },
      {
        id: 'trip-103',
        tripCode: 'TRP-2026-903',
        driverId: 'd-3',
        driverName: drivers.find(d => d.id === 'd-3')?.fullName || 'Brian Kipchirchir',
        driverPhone: '+254733112233',
        vehicleId: 'v-3',
        vehicleReg: 'KCY 882P',
        vehicleType: 'Fuel Motorcycle',
        customerName: 'Fatuma Mohammed',
        customerPhone: '+254701998877',
        pickupLocationName: 'Nyali Centre, Mombasa',
        pickupLat: -4.0321,
        pickupLng: 39.6912,
        destinationLocationName: 'Mombasa Port Gate 1',
        destinationLat: -4.0612,
        destinationLng: 39.6582,
        distanceKm: 11.4,
        durationMinutes: 24,
        fareKes: 1600,
        platformFeeKes: 320,
        companyRevenueKes: 320,
        driverEarningsKes: 1280,
        paymentMethod: 'Card',
        paymentStatus: 'Paid',
        tripStatus: 'Completed',
        rating: 4.8,
        startTime: '2026-08-09 12:21 EAT',
        endTime: 'Today 12:45 EAT'
      },
      {
        id: 'trip-104',
        tripCode: 'TRP-2026-904',
        driverId: 'd-2',
        driverName: drivers.find(d => d.id === 'd-2')?.fullName || 'Kevin Ndung\'u',
        driverPhone: '+254711882233',
        vehicleId: 'v-2',
        vehicleReg: 'KDH 109G',
        vehicleType: 'Electric Motorcycle',
        customerName: 'Peter Kamau',
        customerPhone: '+254712554433',
        pickupLocationName: 'Kilimani Argwings Kodhek Rd',
        pickupLat: -1.2891,
        pickupLng: 36.7882,
        destinationLocationName: 'Kencom House, CBD Nairobi',
        destinationLat: -1.2864,
        destinationLng: 36.8231,
        distanceKm: 5.8,
        durationMinutes: 14,
        fareKes: 650,
        platformFeeKes: 130,
        companyRevenueKes: 130,
        driverEarningsKes: 520,
        paymentMethod: 'M-Pesa',
        paymentStatus: 'Paid',
        mpesaReceiptNumber: 'QHK917990M',
        tripStatus: 'Completed',
        rating: 5.0,
        startTime: '2026-08-09 12:01 EAT',
        endTime: 'Today 12:15 EAT'
      },
      {
        id: 'trip-105',
        tripCode: 'TRP-2026-905',
        driverId: 'd-4',
        driverName: drivers.find(d => d.id === 'd-4')?.fullName || 'Hassan Ali',
        driverPhone: '+254701887766',
        vehicleId: 'v-4',
        vehicleReg: 'KDD 301A',
        vehicleType: 'Electric Car',
        customerName: 'UN Diplomatic Logistics',
        customerPhone: '+254720112233',
        pickupLocationName: 'Yaya Centre Kilimani',
        pickupLat: -1.2912,
        pickupLng: 36.7850,
        destinationLocationName: 'UN Avenue, Gigiri',
        destinationLat: -1.2330,
        destinationLng: 36.8170,
        distanceKm: 14.2,
        durationMinutes: 28,
        fareKes: 2100,
        platformFeeKes: 420,
        companyRevenueKes: 420,
        driverEarningsKes: 1680,
        paymentMethod: 'Corporate Voucher',
        paymentStatus: 'Paid',
        tripStatus: 'Completed',
        rating: 5.0,
        startTime: '2026-08-09 11:02 EAT',
        endTime: 'Today 11:30 EAT'
      }
    ];

    const combined = [...fromProps, ...defaults];
    const unique = combined.filter((trip, idx, self) => 
      idx === self.findIndex(t => t.id === trip.id || t.tripCode === trip.tripCode)
    );
    return unique.slice(0, 5);
  }, [trips, drivers]);

  const recentTripsTotalRevenue = useMemo(() => 
    completedTripsList.reduce((sum, t) => sum + (t.fareKes || 0), 0)
  , [completedTripsList]);

  const recentTripsAvgFare = useMemo(() => 
    Math.round(recentTripsTotalRevenue / (completedTripsList.length || 1))
  , [recentTripsTotalRevenue, completedTripsList]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Critical Safety Banner Alert */}
      {criticalVehiclesCount > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-800">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
                CRITICAL SAFETY FLAG DETECTED
                <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {criticalVehiclesCount} VEHICLE(S)
                </span>
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                {criticalVehiclesCount} vehicle(s) flagged as 'Critical' because assigned driver safety score dropped below 80%.
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateTab('vehicles')}
            className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0 shadow-xs"
          >
            Manage Critical Vehicles
          </button>
        </div>
      )}
      
      {/* Top Banner Alert (if open incident or document expiry) */}
      {(stats.openIncidentsCount > 0 || stats.expiringDocsAlertCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Attention Required in Fleet Operations</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {stats.openIncidentsCount} open safety/incident report(s) and {stats.expiringDocsAlertCount} document(s) expiring within 30 days.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigateTab('incidents')}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
            >
              Review Incidents
            </button>
            <button 
              onClick={() => onNavigateTab('documents')}
              className="bg-white hover:bg-amber-50 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 transition"
            >
              Check Documents
            </button>
          </div>
        </div>
      )}

      {/* Automated Maintenance & NTSA Inspection Alert Banner */}
      {maintenanceAlertsCount > 0 && (
        <div className="bg-indigo-950/80 border-2 border-indigo-500/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Wrench className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                AUTOMATED SERVICE & NTSA INSPECTION ALERTS
                <span className="bg-indigo-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px]">
                  {maintenanceAlertsCount} ACTIVE TRIGGER(S)
                </span>
              </h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                {maintenanceAlertsCount} vehicle(s) approaching scheduled service mileage (&le;500 km) or NTSA inspection expiry (&le;7 days).
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateTab('maintenance')}
            className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 px-4 py-2 rounded-lg text-xs font-black transition shrink-0 shadow-md flex items-center gap-1.5"
          >
            <span>Open Maintenance Alert Center</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Actions Dispatch Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Actions:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={onOpenNewVehicleModal}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Vehicle</span>
          </button>
          <button 
            onClick={onOpenMpesaModal}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Driver M-Pesa Payout</span>
          </button>
          <button 
            onClick={onOpenEvModal}
            className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Zap className="w-3.5 h-3.5 text-teal-600" />
            <span>Record EV Charging</span>
          </button>
          <button 
            onClick={onOpenFuelModal}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Fuel className="w-3.5 h-3.5 text-amber-600" />
            <span>Record Fuel Fill-up</span>
          </button>
          <button 
            onClick={onOpenIncidentModal}
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Report SOS / Incident</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Card 1: Total Fleet & Composition */}
        <div 
          onClick={() => onNavigateTab('vehicles')}
          className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-5 shadow-xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Fleet Vehicles</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
              <Bike className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalVehicles}</div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span className="text-emerald-700 font-bold">{stats.electricVehiclesCount} Electric (EV)</span>
            <span className="text-amber-700 font-bold">{stats.fuelVehiclesCount} Fuel</span>
          </div>
        </div>

        {/* Card 2: Fleet Utilization Rate */}
        <div 
          onClick={() => onNavigateTab('vehicles')}
          className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-5 shadow-xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fleet Utilization Rate</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{fleetUtilizationRate}%</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              {activeVehiclesCount} / {vehicles.length} Active
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, fleetUtilizationRate)}%` }} 
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{onTripVehiclesCount} On Trip</span>
            </span>
            <span className="text-slate-500">{idleMaintenanceCount} Idle / Maint</span>
          </div>

        </div>

        {/* Card 3: Today Gross Revenue KES */}
        <div 
          onClick={() => onNavigateTab('finance')}
          className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-5 shadow-xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue Today</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            KES {stats.todayGrossRevenueKes.toLocaleString()}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span>Payouts: KES {stats.todayDriverPayoutsKes.toLocaleString()}</span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              +14% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Total Operational Costs */}
        <div 
          onClick={() => onNavigateTab('finance')}
          className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-5 shadow-xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Operational Costs</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-105 transition">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            KES {totalOperationalCostsKes.toLocaleString()}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
            <div title="Fuel Expenses">
              <span className="text-slate-400 block text-[10px]">Fuel</span>
              <span className="font-bold text-amber-800">KES {(totalFuelCostKes / 1000).toFixed(1)}k</span>
            </div>
            <div title="EV Charging Expenses">
              <span className="text-slate-400 block text-[10px]">EV Charge</span>
              <span className="font-bold text-teal-700">KES {(totalChargingCostKes / 1000).toFixed(1)}k</span>
            </div>
            <div title="Maintenance Expenses">
              <span className="text-slate-400 block text-[10px]">Maint</span>
              <span className="font-bold text-slate-800">KES {(totalMaintenanceCostKes / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        {/* Card 5: Active Fleet & Drivers Online */}
        <div 
          onClick={() => onNavigateTab('map')}
          className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-5 shadow-xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">On-Road / Active</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.onTripCount + stats.onlineCount} <span className="text-xs font-normal text-slate-500">/ {stats.totalVehicles} vehicles</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{stats.onTripCount} On Trip</span>
            </span>
            <span className="text-teal-700 font-bold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span>{stats.chargingCount} Charging</span>
            </span>
          </div>

        </div>

        {/* Card 6: EV vs Fuel Profitability Margin */}
        <div 
          onClick={() => onNavigateTab('ev')}
          className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-5 shadow-xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">EV vs Fuel Margin</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats.evVsFuelProfitMarginPercent.evMarginPercent}%</span>
            <span className="text-xs font-semibold text-slate-500">EV</span>
            <span className="text-xs text-slate-400">vs</span>
            <span className="text-lg font-bold text-amber-600">{stats.evVsFuelProfitMarginPercent.fuelMarginPercent}%</span>
            <span className="text-xs font-semibold text-slate-500">Fuel</span>
          </div>
          <div className="mt-3 text-xs text-emerald-700 font-medium border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>⚡ EV outperforms by +{stats.evVsFuelProfitMarginPercent.evMarginPercent - stats.evVsFuelProfitMarginPercent.fuelMarginPercent}%</span>
          </div>
        </div>

      </div>

      {/* Recent Completed Trips Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 shrink-0">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">Recent Completed Trips</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Last 5 Rides
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Last 5 completed driver dispatch trips with routes, drivers, and total revenue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            <div className="text-right hidden md:block mr-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">5-Trip Total Revenue</span>
              <span className="text-sm font-black text-emerald-600 font-mono">KES {recentTripsTotalRevenue.toLocaleString()}</span>
            </div>

            <button 
              onClick={() => setIsTripsVaultOpen(true)}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <Archive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cleanup & Trips Vault</span>
            </button>

            <button 
              onClick={() => onNavigateTab('map')}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Live Fleet Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5 Completed Trips Cards / List */}
        <div className="space-y-2.5">
          {completedTripsList.map((trip, idx) => {
            const driverObj = drivers.find(d => d.id === trip.driverId || d.fullName === trip.driverName);
            const isEv = trip.vehicleType?.includes('Electric') || trip.vehicleReg?.startsWith('KMG') || trip.vehicleReg?.startsWith('KDH') || trip.vehicleReg?.startsWith('KDD');
            
            return (
              <div 
                key={trip.id || idx}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Driver info & vehicle badge */}
                <div className="flex items-center gap-3 shrink-0 min-w-[210px]">
                  {driverObj?.profilePhotoUrl ? (
                    <img 
                      src={driverObj.profilePhotoUrl} 
                      alt={trip.driverName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs border-2 border-white">
                      {trip.driverName.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs">{trip.driverName}</span>
                      {trip.rating && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                          <span>{trip.rating.toFixed(1)}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {trip.vehicleReg}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isEv 
                          ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {isEv ? '⚡ EV' : '⛽ Fuel'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Leaflet Map Thumbnail + Route (Pickup -> Destination) & Distance */}
                <div className="flex-1 min-w-0 w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <TripMapThumbnail 
                    pickupLat={trip.pickupLat}
                    pickupLng={trip.pickupLng}
                    destinationLat={trip.destinationLat}
                    destinationLng={trip.destinationLng}
                    tripId={trip.id}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 truncate">
                      <span className="flex items-center gap-1 text-slate-700 truncate" title={trip.pickupLocationName}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate max-w-[130px] sm:max-w-[170px]">{trip.pickupLocationName}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="flex items-center gap-1 text-slate-900 font-bold truncate" title={trip.destinationLocationName}>
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="truncate max-w-[130px] sm:max-w-[170px]">{trip.destinationLocationName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-slate-400" />
                        <span>{trip.distanceKm} km</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{trip.durationMinutes} mins</span>
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">{trip.endTime || 'Completed'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Total Revenue per trip & Payment badge */}
                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-200/60 pt-2 md:pt-0">
                  <div className="text-left md:text-right">
                    <div className="text-sm font-black text-emerald-600 font-mono">
                      KES {trip.fareKes.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Comm: <span className="font-semibold text-slate-600">KES {trip.companyRevenueKes.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      trip.paymentMethod === 'M-Pesa' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : trip.paymentMethod === 'Card'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                      {trip.paymentMethod === 'M-Pesa' && <Smartphone className="w-3 h-3 text-emerald-600" />}
                      {trip.paymentMethod === 'Card' && <CreditCard className="w-3 h-3 text-blue-600" />}
                      <span>{trip.paymentMethod}</span>
                    </span>

                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/70 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Completed</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Summary Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Average Revenue / Trip:</span>
            <span className="font-bold text-slate-900 font-mono">KES {recentTripsAvgFare.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            ⚡ All driver payouts & commissions automatically calculated and synced with M-Pesa ledger.
          </div>
        </div>
      </div>

      {/* Real-time Alerts Feed Component */}
      <AlertsFeed 
        incidents={incidents} 
        vehicles={vehicles} 
        onNavigateTab={onNavigateTab}
        onOpenIncidentModal={onOpenIncidentModal}
      />

      {/* LAST 7 DAYS REVENUE TREND - RECHARTS LINE CHART SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        
        {/* Header & Quick Stat Badges */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <span>Last 7 Days Revenue Trend</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    +{revenueGrowthPercent}% Growth
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily gross income performance across EV & Fuel fleet operations (KES)
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigateTab('finance')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Financial Module</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Summary KPIs Banner Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">7-Day Total Revenue</span>
            <span className="text-base font-black text-slate-900 font-mono">
              KES {total7DayRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold block">Cumulative gross income</span>
          </div>

          <div className="border-l border-slate-200/80 pl-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Daily Income</span>
            <span className="text-base font-black text-emerald-600 font-mono">
              KES {avgDailyRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block">Per active day</span>
          </div>

          <div className="border-l border-slate-200/80 pl-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Peak Performance Day</span>
            <span className="text-base font-black text-indigo-600 font-mono flex items-center gap-1">
              <span>KES {peakDayObj.revenue.toLocaleString()}</span>
            </span>
            <span className="text-[10px] text-indigo-700 font-bold block">{peakDayObj.day} ({peakDayObj.date})</span>
          </div>

          <div className="border-l border-slate-200/80 pl-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">EV Revenue Contribution</span>
            <span className="text-base font-black text-teal-600 font-mono">
              {evRevSharePercent}% Share
            </span>
            <span className="text-[10px] text-teal-700 font-medium block">
              KES {totalEvSegmentRev.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Recharts Line Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last7DaysRevenueTrend} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              <XAxis 
                dataKey="day" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
              />
              
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(val) => `KES ${val / 1000}k`} 
              />
              
              <Tooltip 
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-sans">
                        <div className="font-bold border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                          <span>{item.day} ({item.date})</span>
                          <span className="text-emerald-400 font-mono font-black">
                            KES {item.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1 pt-1 text-[11px]">
                          <div className="flex items-center justify-between gap-4 text-teal-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-teal-400" />
                              <span>EV Segment:</span>
                            </span>
                            <span className="font-mono font-bold">KES {item.evRevenue.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center justify-between gap-4 text-amber-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>Fuel Segment:</span>
                            </span>
                            <span className="font-mono font-bold">KES {item.fuelRevenue.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center justify-between gap-4 text-slate-400 border-t border-slate-800/80 pt-1">
                            <span>Daily Target:</span>
                            <span className="font-mono">KES {item.target.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend 
                verticalAlign="top" 
                align="right" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#475569' }}
              />

              {/* Line 1: Total Gross Revenue */}
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Total Gross Revenue" 
                stroke="#10b981" 
                strokeWidth={3.5}
                dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 8, strokeWidth: 2, stroke: '#ffffff' }}
              />

              {/* Line 2: EV Segment Revenue */}
              <Line 
                type="monotone" 
                dataKey="evRevenue" 
                name="EV Fleet Revenue" 
                stroke="#06b6d4" 
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#06b6d4' }}
              />

              {/* Line 3: Fuel Segment Revenue */}
              <Line 
                type="monotone" 
                dataKey="fuelRevenue" 
                name="Fuel Fleet Revenue" 
                stroke="#f59e0b" 
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#f59e0b' }}
              />

            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* 30-Day D3.js Fleet Utilization Rate Trend Chart */}
      <FleetUtilizationChart totalVehicles={vehicles.length} />

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 7-Day Financial Performance Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Financial Revenue & Operating Costs (KES)</h3>
              <p className="text-xs text-slate-500">7-Day Gross Revenue vs Fuel & EV Electricity Costs</p>
            </div>
            <button 
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Full Financial Report <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `KES ${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.5rem', color: '#0f172a', fontSize: '12px' }}
                  formatter={(val: any) => [`KES ${Number(val).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#059669" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="netProfit" name="Company Operating Profit" stroke="#2563eb" fillOpacity={1} fill="url(#colorNet)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span>Gross Revenue (KES)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span>Net Operating Profit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Fuel Cost Allocation</span>
            </div>
          </div>
        </div>

        {/* Mixed Fleet Composition Breakdown (1 col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Fleet Category Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">Active mixed vehicle assets across Kenyan cities</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleCategoryChart} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} width={90} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.5rem', color: '#0f172a', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {vehicleCategoryChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-700">
              <span>Avg Battery Health:</span>
              <span className="font-bold text-emerald-700">{stats.averageBatteryHealthPercent}%</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Avg EV Energy Cost:</span>
              <span className="font-bold text-emerald-700">KES 2.4 / km</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Avg Fuel Petrol Cost:</span>
              <span className="font-bold text-amber-700">KES 8.5 / km</span>
            </div>
          </div>
        </div>

      </div>

      {/* Live Fleet Operational Telemetry List */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Live Operational Status Feed</h3>
            <p className="text-xs text-slate-500">Real-time GPS updates, battery SoC, and driver assignment</p>
          </div>
          <button 
            onClick={() => onNavigateTab('vehicles')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All Vehicles <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Assigned Driver</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Energy / Fuel</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Profit Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${v.category === 'Electric' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {v.registrationNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.make} {v.model}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {v.assignedDriverName || <span className="text-slate-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                    📍 {v.currentLocation.address}
                  </td>
                  <td className="px-4 py-3">
                    {v.category === 'Electric' ? (
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <Battery className="w-3.5 h-3.5" />
                        <span>{v.currentSoCPercent}% SoC</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold text-amber-700">
                        <Fuel className="w-3.5 h-3.5" />
                        <span>{v.currentFuelLiters}L Petrol</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 w-fit ${
                      v.status === 'On Trip' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs animate-status-ontrip' :
                      v.status === 'Online' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      v.status === 'Charging' ? 'bg-teal-100 text-teal-800 border border-teal-300 shadow-xs animate-status-charging' :
                      v.status === 'Under Maintenance' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {v.status === 'On Trip' && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                        </span>
                      )}
                      {v.status === 'Charging' && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
                        </span>
                      )}
                      <span>{v.status}</span>
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                    KES {v.netProfitKes.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Trips History & Cleanup Vault Modal */}
      <TripsHistoryModal
        isOpen={isTripsVaultOpen}
        onClose={() => setIsTripsVaultOpen(false)}
        trips={trips}
        onArchiveTrips={onArchiveTrips}
        onRestoreTrip={onRestoreTrip}
      />

    </div>
  );
};
