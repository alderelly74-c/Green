import React, { useState, useEffect, useMemo } from 'react';
import { WifiOff, HardDrive, RefreshCw } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { LiveFleetMap } from './components/LiveFleetMap';
import { VehiclesModule } from './components/VehiclesModule';
import { DriversModule } from './components/DriversModule';
import { EvBatteryModule } from './components/EvBatteryModule';
import { FuelModule } from './components/FuelModule';
import { MaintenanceModule } from './components/MaintenanceModule';
import { FinancialsModule } from './components/FinancialsModule';
import { DocumentsModule } from './components/DocumentsModule';
import { IncidentsModule } from './components/IncidentsModule';
import { AiFleetAssistant } from './components/AiFleetAssistant';
import { ReportsModule } from './components/ReportsModule';
import { AuditLogsModule } from './components/AuditLogsModule';

import { MessagesModule } from './components/MessagesModule';
import { SecurityAlertsDashboard } from './components/SecurityAlertsDashboard';

import { NewVehicleModal } from './components/modals/NewVehicleModal';
import { RecordFuelModal } from './components/modals/RecordFuelModal';
import { RecordEvModal } from './components/modals/RecordEvModal';
import { WorkOrderModal } from './components/modals/WorkOrderModal';
import { MpesaPayoutModal } from './components/modals/MpesaPayoutModal';

import { 
  Vehicle, Driver, Trip, EvBatterySession, BatterySwapRecord, FuelTransaction, 
  MaintenanceWorkOrder, SparePartItem, VehicleDocument, IncidentReport, 
  MpesaPayoutRequest, AuditLogEntry, FleetSummaryStats, CityRegion, UserRole,
  DispatcherMessage
} from './types';
import { loadFleetCache, saveFleetCache } from './lib/offlineCache';

export default function App() {
  const initialCache = useMemo(() => loadFleetCache(), []);

  // Offline network status tracking
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => initialCache?.lastSyncedAt || 'Loaded from cache');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global View Navigation & Filters
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCity, setSelectedCity] = useState<CityRegion | 'All Cities'>('All Cities');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Super Admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessageDriver, setSelectedMessageDriver] = useState<Driver | null>(null);

  const handleOpenMessageComposerForDriver = (driver?: Driver) => {
    if (driver) {
      setSelectedMessageDriver(driver);
    } else {
      setSelectedMessageDriver(null);
    }
    setActiveTab('messages');
  };

  // Modals state
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [isRecordFuelModalOpen, setIsRecordFuelModalOpen] = useState(false);
  const [selectedVehicleForFuel, setSelectedVehicleForFuel] = useState<Vehicle | null>(null);
  const [selectedDriverForFuel, setSelectedDriverForFuel] = useState<Driver | null>(null);

  const [isRecordEvModalOpen, setIsRecordEvModalOpen] = useState(false);
  const [selectedVehicleForEv, setSelectedVehicleForEv] = useState<Vehicle | null>(null);

  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [selectedVehicleForWorkOrder, setSelectedVehicleForWorkOrder] = useState<Vehicle | null>(null);

  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [selectedDriverForMpesa, setSelectedDriverForMpesa] = useState<Driver | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  const handleOpenMpesaModalForDriver = (driver?: Driver | null) => {
    setSelectedDriverForMpesa(driver || null);
    setIsMpesaModalOpen(true);
  };

  const handleOpenWorkOrderForVehicle = (vehicle?: Vehicle | null) => {
    setSelectedVehicleForWorkOrder(vehicle || null);
    setIsWorkOrderModalOpen(true);
  };

  const handleOpenRecordFuelForVehicle = (vehicle?: Vehicle | null, driver?: Driver | null) => {
    setSelectedVehicleForFuel(vehicle || null);
    setSelectedDriverForFuel(driver || null);
    setIsRecordFuelModalOpen(true);
  };

  const handleOpenRecordEvForVehicle = (vehicle?: Vehicle | null) => {
    setSelectedVehicleForEv(vehicle || null);
    setIsRecordEvModalOpen(true);
  };

  // --- Initial Mock Data Seeding (With Local Storage Fallback) ---

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => initialCache?.vehicles ?? [
    {
      id: 'v-1',
      registrationNumber: 'KMG 482E',
      make: 'Roam',
      model: 'Air EV Boda',
      year: 2024,
      type: 'Electric Motorcycle',
      category: 'Electric',
      color: 'Emerald Green',
      vin: 'ROAM2024KE91823',
      batteryId: 'BATT-RM-8821',
      batteryCapacityKwh: 6.4,
      currentSoCPercent: 88,
      batteryHealthPercent: 98,
      odometerKm: 14250,
      purchaseDate: '2024-01-15',
      purchasePriceKes: 260000,
      currentEstimatedValueKes: 240000,
      ownershipType: 'Purchased',
      city: 'Nairobi',
      assignedDriverId: 'd-1',
      assignedDriverName: 'Juma Omondi',
      assignedDriverPhone: '+254712345678',
      currentLocation: {
        lat: -1.286389,
        lng: 36.817223,
        heading: 45,
        speedKmh: 38,
        lastUpdated: '1 min ago',
        address: 'Mwai Kibaki Way, Westlands, Nairobi'
      },
      status: 'On Trip',
      insurancePolicyNumber: 'APA-POL-9921',
      insuranceExpiry: '2026-11-20',
      ntsaInspectionExpiry: '2026-08-11',
      nextServiceOdometerKm: 14500,
      totalTripsCount: 412,
      totalRevenueGeneratedKes: 184000,
      totalFuelSpentKes: 0,
      totalChargingSpentKes: 14200,
      totalMaintenanceSpentKes: 3500,
      netProfitKes: 166300
    },
    {
      id: 'v-2',
      registrationNumber: 'KDH 109G',
      make: 'Spiro',
      model: 'Equator Bike',
      year: 2023,
      type: 'Electric Motorcycle',
      category: 'Electric',
      color: 'Matte Blue',
      vin: 'SPIR2023KE30192',
      batteryId: 'BATT-SP-4412',
      batteryCapacityKwh: 4.8,
      currentSoCPercent: 34,
      batteryHealthPercent: 92,
      odometerKm: 28900,
      purchaseDate: '2023-08-10',
      purchasePriceKes: 220000,
      currentEstimatedValueKes: 180000,
      ownershipType: 'Financed',
      city: 'Nairobi',
      assignedDriverId: 'd-2',
      assignedDriverName: 'Wanjiku Mwangi',
      assignedDriverPhone: '+254722987654',
      currentLocation: {
        lat: -1.2921,
        lng: 36.8219,
        heading: 180,
        speedKmh: 0,
        lastUpdated: '2 mins ago',
        address: 'Argwings Kodhek Rd, Kilimani, Nairobi'
      },
      status: 'Charging',
      insurancePolicyNumber: 'BRITAM-INS-1049',
      insuranceExpiry: '2026-09-15',
      ntsaInspectionExpiry: '2026-08-05',
      nextServiceOdometerKm: 29000,
      totalTripsCount: 680,
      totalRevenueGeneratedKes: 290000,
      totalFuelSpentKes: 0,
      totalChargingSpentKes: 22000,
      totalMaintenanceSpentKes: 8200,
      netProfitKes: 259800
    },
    {
      id: 'v-3',
      registrationNumber: 'KCY 882P',
      make: 'TVS',
      model: 'HLX 150 Petrol',
      year: 2022,
      type: 'Fuel Motorcycle',
      category: 'Fuel',
      color: 'Flame Red',
      vin: 'TVS150KE88219',
      currentFuelLiters: 1.8,
      fuelCapacityLiters: 11.0,
      odometerKm: 52100,
      purchaseDate: '2022-04-05',
      purchasePriceKes: 180000,
      currentEstimatedValueKes: 120000,
      ownershipType: 'Purchased',
      city: 'Mombasa',
      assignedDriverId: 'd-3',
      assignedDriverName: 'Brian Kipchirchir',
      assignedDriverPhone: '+254733112233',
      currentLocation: {
        lat: -4.0435,
        lng: 39.6682,
        heading: 90,
        speedKmh: 42,
        lastUpdated: 'Just now',
        address: 'Moi Avenue, Mombasa Island'
      },
      status: 'On Trip',
      insurancePolicyNumber: 'CIC-POL-4410',
      insuranceExpiry: '2026-06-10',
      ntsaInspectionExpiry: '2026-08-14',
      nextServiceOdometerKm: 52000,
      totalTripsCount: 940,
      totalRevenueGeneratedKes: 380000,
      totalFuelSpentKes: 118000,
      totalChargingSpentKes: 0,
      totalMaintenanceSpentKes: 19500,
      netProfitKes: 242500
    },
    {
      id: 'v-4',
      registrationNumber: 'KDD 301A',
      make: 'BYD',
      model: 'Atto 3 EV Car',
      year: 2024,
      type: 'Electric Car',
      category: 'Electric',
      color: 'Glacier White',
      vin: 'BYD2024EV00192',
      batteryId: 'BATT-BYD-9910',
      batteryCapacityKwh: 60.4,
      currentSoCPercent: 91,
      batteryHealthPercent: 100,
      odometerKm: 8200,
      purchaseDate: '2024-03-01',
      purchasePriceKes: 4200000,
      currentEstimatedValueKes: 3950000,
      ownershipType: 'Leased',
      city: 'Nairobi',
      assignedDriverId: 'd-4',
      assignedDriverName: 'Hassan Ali',
      assignedDriverPhone: '+254701887766',
      currentLocation: {
        lat: -1.3197,
        lng: 36.9275,
        heading: 270,
        speedKmh: 65,
        lastUpdated: '3 mins ago',
        address: 'JKIA Airport Expressway, Nairobi'
      },
      status: 'On Trip',
      insurancePolicyNumber: 'JUBILEE-CAR-3012',
      insuranceExpiry: '2026-12-01',
      ntsaInspectionExpiry: '2026-12-01',
      nextServiceOdometerKm: 15000,
      totalTripsCount: 290,
      totalRevenueGeneratedKes: 480000,
      totalFuelSpentKes: 0,
      totalChargingSpentKes: 32000,
      totalMaintenanceSpentKes: 4200,
      netProfitKes: 443800
    },
    {
      id: 'v-5',
      registrationNumber: 'KCB 910X',
      make: 'Toyota',
      model: 'Fielder Petrol',
      year: 2019,
      type: 'Petrol Car',
      category: 'Fuel',
      color: 'Silver Metallic',
      vin: 'TOY2019NZE1419',
      currentFuelLiters: 12.5,
      fuelCapacityLiters: 42.0,
      odometerKm: 112000,
      purchaseDate: '2020-02-14',
      purchasePriceKes: 1450000,
      currentEstimatedValueKes: 980000,
      ownershipType: 'Purchased',
      city: 'Kisumu',
      assignedDriverId: 'd-5',
      assignedDriverName: 'Mercy Chebet',
      assignedDriverPhone: '+254711998877',
      currentLocation: {
        lat: -0.0917,
        lng: 34.768,
        heading: 10,
        speedKmh: 0,
        lastUpdated: '10 mins ago',
        address: 'Oginga Odinga St, Kisumu CBD'
      },
      status: 'Online',
      insurancePolicyNumber: 'GA-INS-8812',
      insuranceExpiry: '2026-08-18',
      ntsaInspectionExpiry: '2026-08-10',
      nextServiceOdometerKm: 112200,
      totalTripsCount: 1210,
      totalRevenueGeneratedKes: 890000,
      totalFuelSpentKes: 380000,
      totalChargingSpentKes: 0,
      totalMaintenanceSpentKes: 48000,
      netProfitKes: 462000
    },
    {
      id: 'v-6',
      registrationNumber: 'KCM 110T',
      make: 'Bajaj',
      model: 'Boxer BM150 Petrol',
      year: 2023,
      type: 'Fuel Motorcycle',
      category: 'Fuel',
      color: 'Midnight Black',
      vin: 'BAJ150BM99201',
      currentFuelLiters: 1.1,
      fuelCapacityLiters: 11.0,
      odometerKm: 38400,
      purchaseDate: '2023-03-20',
      purchasePriceKes: 165000,
      currentEstimatedValueKes: 125000,
      ownershipType: 'Purchased',
      city: 'Nairobi',
      assignedDriverId: 'd-1',
      assignedDriverName: 'Juma Omondi',
      assignedDriverPhone: '+254712345678',
      currentLocation: {
        lat: -1.2683,
        lng: 36.8111,
        heading: 120,
        speedKmh: 28,
        lastUpdated: 'Just now',
        address: 'Parklands Road, Westlands, Nairobi'
      },
      status: 'On Trip',
      insurancePolicyNumber: 'APA-POL-8812',
      insuranceExpiry: '2026-10-15',
      ntsaInspectionExpiry: '2026-09-01',
      nextServiceOdometerKm: 39000,
      totalTripsCount: 710,
      totalRevenueGeneratedKes: 310000,
      totalFuelSpentKes: 92000,
      totalChargingSpentKes: 0,
      totalMaintenanceSpentKes: 14200,
      netProfitKes: 203800
    }
  ]);

  const [drivers, setDrivers] = useState<Driver[]>(() => initialCache?.drivers ?? [
    {
      id: 'd-1',
      fullName: 'Juma Omondi',
      phone: '+254712345678',
      nationalId: '30192847',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      drivingLicenseNumber: 'DL-KE-99201',
      licenseExpiry: '2026-08-20',
      psvBadgeNumber: 'PSV-2024-881',
      psvExpiry: '2026-09-02',
      city: 'Nairobi',
      assignedVehicleId: 'v-1',
      assignedVehicleReg: 'KMG 482E',
      employmentType: 'Daily Target',
      dateJoined: '2023-05-10',
      status: 'On Trip',
      currentShift: 'Morning',
      rating: 4.92,
      totalTrips: 840,
      completedTrips: 832,
      cancelledTrips: 8,
      acceptanceRatePercent: 98,
      grossEarningsKes: 380000,
      companyCommissionKes: 57000,
      netEarningsKes: 323000,
      outstandingBalanceKes: 14500,
      loanBalanceKes: 25000,
      safetyScorePercent: 96,
      mpesaPhoneNumber: '254712345678'
    },
    {
      id: 'd-2',
      fullName: 'Wanjiku Mwangi',
      phone: '+254722987654',
      nationalId: '28491029',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      drivingLicenseNumber: 'DL-KE-44102',
      licenseExpiry: '2027-01-20',
      psvBadgeNumber: 'PSV-2024-102',
      psvExpiry: '2026-08-03',
      city: 'Nairobi',
      assignedVehicleId: 'v-2',
      assignedVehicleReg: 'KDH 109G',
      employmentType: 'Weekly Rental',
      dateJoined: '2023-09-01',
      status: 'Online',
      currentShift: 'Full Day',
      rating: 4.88,
      totalTrips: 680,
      completedTrips: 671,
      cancelledTrips: 9,
      acceptanceRatePercent: 96,
      grossEarningsKes: 290000,
      companyCommissionKes: 43500,
      netEarningsKes: 246500,
      outstandingBalanceKes: 8200,
      loanBalanceKes: 0,
      safetyScorePercent: 94,
      mpesaPhoneNumber: '254722987654'
    },
    {
      id: 'd-3',
      fullName: 'Brian Kipchirchir',
      phone: '+254733112233',
      nationalId: '32091823',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      drivingLicenseNumber: 'DL-KE-10928',
      licenseExpiry: '2026-08-28',
      psvBadgeNumber: 'PSV-2023-501',
      psvExpiry: '2027-06-30',
      city: 'Mombasa',
      assignedVehicleId: 'v-3',
      assignedVehicleReg: 'KCY 882P',
      employmentType: 'Commission',
      dateJoined: '2022-11-15',
      status: 'On Trip',
      currentShift: 'Morning',
      rating: 4.81,
      totalTrips: 1120,
      completedTrips: 1098,
      cancelledTrips: 22,
      acceptanceRatePercent: 92,
      grossEarningsKes: 450000,
      companyCommissionKes: 67500,
      netEarningsKes: 382500,
      outstandingBalanceKes: -3200,
      loanBalanceKes: 12000,
      safetyScorePercent: 88,
      mpesaPhoneNumber: '254733112233'
    },
    {
      id: 'd-4',
      fullName: 'Hassan Ali',
      phone: '+254701887766',
      nationalId: '31092812',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      drivingLicenseNumber: 'DL-KE-77210',
      licenseExpiry: '2026-11-12',
      psvBadgeNumber: 'PSV-2024-301',
      psvExpiry: '2026-08-16',
      city: 'Nairobi',
      assignedVehicleId: 'v-4',
      assignedVehicleReg: 'KDD 301A',
      employmentType: 'Daily Target',
      dateJoined: '2024-02-01',
      status: 'On Trip',
      currentShift: 'Morning',
      rating: 4.62,
      totalTrips: 290,
      completedTrips: 282,
      cancelledTrips: 8,
      acceptanceRatePercent: 91,
      grossEarningsKes: 240000,
      companyCommissionKes: 36000,
      netEarningsKes: 204000,
      outstandingBalanceKes: 12000,
      loanBalanceKes: 15000,
      safetyScorePercent: 74, // Critical < 80% threshold!
      mpesaPhoneNumber: '254701887766'
    },
    {
      id: 'd-5',
      fullName: 'Mercy Chebet',
      phone: '+254711998877',
      nationalId: '29812039',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      drivingLicenseNumber: 'DL-KE-33109',
      licenseExpiry: '2027-08-19',
      psvBadgeNumber: 'PSV-2023-812',
      psvExpiry: '2027-12-15',
      city: 'Kisumu',
      assignedVehicleId: 'v-5',
      assignedVehicleReg: 'KCB 910X',
      employmentType: 'Commission',
      dateJoined: '2021-09-10',
      status: 'Online',
      currentShift: 'Full Day',
      rating: 4.95,
      totalTrips: 1210,
      completedTrips: 1200,
      cancelledTrips: 10,
      acceptanceRatePercent: 99,
      grossEarningsKes: 510000,
      companyCommissionKes: 76500,
      netEarningsKes: 433500,
      outstandingBalanceKes: 18000,
      loanBalanceKes: 0,
      safetyScorePercent: 91,
      mpesaPhoneNumber: '254711998877'
    }
  ]);

  const [trips, setTrips] = useState<Trip[]>(() => initialCache?.trips?.length ? initialCache.trips : [
    {
      id: 'trip-101',
      tripCode: 'TRP-2026-901',
      driverId: 'd-1',
      driverName: 'Juma Omondi',
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
      driverName: 'Mercy Chebet',
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
      driverName: 'Brian Kipchirchir',
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
      driverName: 'Kevin Ndung\'u',
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
      driverName: 'Hassan Ali',
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
  ]);

  const [incidents, setIncidents] = useState<IncidentReport[]>(() => initialCache?.incidents ?? [
    {
      id: 'inc-1',
      incidentCode: 'SOS-2025-0812',
      vehicleId: 'v-1',
      vehicleReg: 'KMG 482E',
      driverId: 'd-1',
      driverName: 'Juma Omondi',
      driverPhone: '+254712345678',
      incidentType: 'Emergency SOS',
      severity: 'Moderate',
      locationName: 'Westlands roundabout near Sarit Centre',
      lat: -1.2612,
      lng: 36.8044,
      timestamp: '2025-08-08 11:20 EAT',
      description: 'Driver triggered SOS panic button due to aggressive motorist dispute.',
      status: 'Under Investigation',
      assignedOfficer: 'Inspector Nderitu (Nairobi Central)'
    }
  ]);

  const [documents, setDocuments] = useState<VehicleDocument[]>(() => initialCache?.documents ?? [
    {
      id: 'doc-1',
      entityType: 'Vehicle',
      entityId: 'v-1',
      entityName: 'KMG 482E',
      documentType: 'Comprehensive Insurance',
      documentNumber: 'GA-POL-88120',
      issueDate: '2025-08-16',
      expiryDate: '2026-08-16',
      fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=60',
      verificationStatus: 'Verified',
      daysUntilExpiry: 3,
      reminderEnabled: true,
      reminderDaysBefore: 30,
      reminderChannel: 'BOTH',
      recipientRole: 'BOTH',
      ownerName: 'Peter Kamau (Fleet Owner)',
      ownerEmail: 'p.kamau@greenshiftfleet.co.ke',
      ownerPhone: '+254 722 450 123',
      driverName: 'Juma Omondi',
      driverEmail: 'j.omondi@greenshiftfleet.co.ke',
      driverPhone: '+254 712 345 678',
      reminderStatus: 'SCHEDULED'
    },
    {
      id: 'doc-2',
      entityType: 'Vehicle',
      entityId: 'v-2',
      entityName: 'KDH 109G',
      documentType: 'NTSA Inspection',
      documentNumber: 'NTSA-INS-4491',
      issueDate: '2025-08-15',
      expiryDate: '2026-08-15',
      fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60',
      verificationStatus: 'Verified',
      daysUntilExpiry: 2,
      reminderEnabled: true,
      reminderDaysBefore: 30,
      reminderChannel: 'SMS',
      recipientRole: 'OWNER',
      ownerName: 'GreenShift Fleet Admin',
      ownerEmail: 'admin@greenshiftfleet.co.ke',
      ownerPhone: '+254 733 900 111',
      driverName: 'Wanjiku Mwangi',
      driverEmail: 'w.mwangi@greenshiftfleet.co.ke',
      driverPhone: '+254 720 987 654',
      reminderStatus: 'SCHEDULED'
    },
    {
      id: 'doc-3',
      entityType: 'Driver',
      entityId: 'd-1',
      entityName: 'Juma Omondi',
      documentType: 'Driving License',
      documentNumber: 'DL-KE-99201',
      issueDate: '2023-08-17',
      expiryDate: '2026-08-17',
      fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
      verificationStatus: 'Verified',
      daysUntilExpiry: 4,
      reminderEnabled: true,
      reminderDaysBefore: 30,
      reminderChannel: 'EMAIL',
      recipientRole: 'DRIVER',
      driverName: 'Juma Omondi',
      driverEmail: 'j.omondi@greenshiftfleet.co.ke',
      driverPhone: '+254 712 345 678',
      reminderStatus: 'SCHEDULED'
    },
    {
      id: 'doc-4',
      entityType: 'Driver',
      entityId: 'd-2',
      entityName: 'Wanjiku Mwangi',
      documentType: 'PSV Badge',
      documentNumber: 'PSV-2024-102',
      issueDate: '2025-08-14',
      expiryDate: '2026-08-14',
      fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60',
      verificationStatus: 'Verified',
      daysUntilExpiry: 1,
      reminderEnabled: true,
      reminderDaysBefore: 30,
      reminderChannel: 'BOTH',
      recipientRole: 'DRIVER',
      driverName: 'Wanjiku Mwangi',
      driverEmail: 'w.mwangi@greenshiftfleet.co.ke',
      driverPhone: '+254 720 987 654',
      reminderStatus: 'SCHEDULED'
    },
    {
      id: 'doc-5',
      entityType: 'Vehicle',
      entityId: 'v-3',
      entityName: 'KCY 882P',
      documentType: 'Comprehensive Insurance',
      documentNumber: 'JUB-POL-3019',
      issueDate: '2025-08-18',
      expiryDate: '2026-08-18',
      fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=60',
      verificationStatus: 'Verified',
      daysUntilExpiry: 5,
      reminderEnabled: true,
      reminderDaysBefore: 30,
      reminderChannel: 'BOTH',
      recipientRole: 'BOTH',
      ownerName: 'GreenShift Operations',
      ownerEmail: 'ops@greenshiftfleet.co.ke',
      ownerPhone: '+254 711 222 333',
      driverName: 'Brian Kipchirchir',
      driverEmail: 'b.kipchirchir@greenshiftfleet.co.ke',
      driverPhone: '+254 701 444 555',
      reminderStatus: 'SCHEDULED'
    },
    {
      id: 'doc-6',
      entityType: 'Vehicle',
      entityId: 'v-4',
      entityName: 'KDD 301A',
      documentType: 'NTSA Inspection',
      documentNumber: 'NTSA-INS-9081',
      issueDate: '2025-08-19',
      expiryDate: '2026-08-19',
      fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60',
      verificationStatus: 'Verified',
      daysUntilExpiry: 6,
      reminderEnabled: true,
      reminderDaysBefore: 30,
      reminderChannel: 'SMS',
      recipientRole: 'BOTH',
      ownerName: 'GreenShift Fleet Admin',
      ownerEmail: 'admin@greenshiftfleet.co.ke',
      ownerPhone: '+254 733 900 111',
      driverName: 'Hassan Ali',
      driverEmail: 'h.ali@greenshiftfleet.co.ke',
      driverPhone: '+254 722 666 777',
      reminderStatus: 'SCHEDULED'
    },
    {
      id: 'doc-7',
      entityType: 'Vehicle',
      entityId: 'v-5',
      entityName: 'KCB 910X',
      documentType: 'Logbook',
      documentNumber: 'NTSA-LOG-11029',
      issueDate: '2022-01-10',
      expiryDate: '2032-01-10',
      fileUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=60',
      verificationStatus: 'Verified',
      daysUntilExpiry: 1975,
      reminderEnabled: false,
      reminderDaysBefore: 30,
      reminderChannel: 'EMAIL',
      recipientRole: 'OWNER',
      reminderStatus: 'MUTED'
    }
  ]);

  const [fuelTxns, setFuelTxns] = useState<FuelTransaction[]>(() => initialCache?.fuelTxns ?? [
    {
      id: 'f-1',
      vehicleId: 'v-3',
      vehicleReg: 'KCY 882P',
      driverId: 'd-3',
      driverName: 'Brian Kipchirchir',
      fuelType: 'Super Petrol',
      stationName: 'Shell Westlands Nairobi',
      liters: 8.5,
      pricePerLiterKes: 188.50,
      totalCostKes: 1602.25,
      odometerReadingKm: 52100,
      calculatedKmPerLiter: 37.5,
      receiptNumber: 'SHL-991029',
      timestamp: '2025-08-08 08:30 EAT',
      isFlaggedAnomaly: false
    },
    {
      id: 'f-2',
      vehicleId: 'v-3',
      vehicleReg: 'KCY 882P',
      driverId: 'd-3',
      driverName: 'Brian Kipchirchir',
      fuelType: 'Super Petrol',
      stationName: 'TotalEnergies Kilimani',
      liters: 9.2,
      pricePerLiterKes: 198.50,
      totalCostKes: 1826.20,
      odometerReadingKm: 52298,
      calculatedKmPerLiter: 21.5, // 21.5 vs 36.0 avg = -40.3% DROP (>20% deviation)
      receiptNumber: 'TOT-881204',
      timestamp: '2025-08-08 14:15 EAT',
      isFlaggedAnomaly: true,
      anomalyReason: 'Efficiency dropped to 21.5 km/L (-40.3% vs 36.0 km/L historical avg). Fuel siphoning or tank leak suspected.'
    },
    {
      id: 'f-3',
      vehicleId: 'v-5',
      vehicleReg: 'KCB 910X',
      driverId: 'd-5',
      driverName: 'Mercy Chebet',
      fuelType: 'Super Petrol',
      stationName: 'Rubis Lavington',
      liters: 22.0,
      pricePerLiterKes: 198.50,
      totalCostKes: 4367.00,
      odometerReadingKm: 114200,
      calculatedKmPerLiter: 18.8, // 18.8 vs 12.5 avg = +50.4% SPIKE (>20% deviation)
      receiptNumber: 'RUB-992182',
      timestamp: '2025-08-07 17:40 EAT',
      isFlaggedAnomaly: true,
      anomalyReason: 'Unrealistic efficiency spike to 18.8 km/L (+50.4% vs 12.5 km/L historical avg). Odometer discrepancy or false receipt.'
    },
    {
      id: 'f-4',
      vehicleId: 'v-5',
      vehicleReg: 'KCB 910X',
      driverId: 'd-5',
      driverName: 'Mercy Chebet',
      fuelType: 'Super Petrol',
      stationName: 'Ola Energy Mombasa Rd',
      liters: 25.0,
      pricePerLiterKes: 198.50,
      totalCostKes: 4962.50,
      odometerReadingKm: 114512,
      calculatedKmPerLiter: 12.4, // 12.4 vs 12.5 avg = -0.8% (Normal)
      receiptNumber: 'OLA-104928',
      timestamp: '2025-08-06 09:10 EAT',
      isFlaggedAnomaly: false
    }
  ]);

  const [evSessions, setEvSessions] = useState<EvBatterySession[]>(() => initialCache?.evSessions ?? [
    {
      id: 'ev-1',
      vehicleId: 'v-1',
      vehicleReg: 'KMG 482E',
      batteryId: 'BATT-RM-8821',
      stationName: 'Roam Hub Kilimani',
      locationAddress: 'Argwings Kodhek Rd, Nairobi',
      startTime: '2025-08-08 06:00 EAT',
      endTime: '2025-08-08 06:25 EAT',
      durationMinutes: 25,
      startSoCPercent: 12,
      endSoCPercent: 95,
      energyKwhConsumed: 5.3,
      costKes: 320,
      costPerKwhKes: 60.37,
      operatorName: 'Roam Motors',
      paymentMethod: 'M-Pesa',
      healthImpactScore: 'Normal'
    }
  ]);

  const [batterySwapRecords, setBatterySwapRecords] = useState<BatterySwapRecord[]>(() => [
    {
      id: 'swap-1',
      swapCode: 'SWAP-2025-08101',
      timestamp: '2025-08-08 14:15 EAT',
      vehicleId: 'v-1',
      vehicleReg: 'KMG 482E',
      driverName: 'Juma Omondi',
      stationName: 'Roam Hub Kilimani',
      stationLocation: 'Argwings Kodhek Rd, Kilimani, Nairobi',
      removedBatteryId: 'BATT-RM-8821',
      removedBatterySoC: 14,
      removedBatterySoh: 96,
      installedBatteryId: 'BATT-RM-9014',
      installedBatterySoC: 99,
      installedBatterySoh: 98,
      swapDurationMinutes: 2.5,
      costKes: 350,
      operatorName: 'Roam Swap Attendant #04',
      notes: 'Depleted battery placed in Hub Charging Bay 3. Installed fresh pack.'
    },
    {
      id: 'swap-2',
      swapCode: 'SWAP-2025-08102',
      timestamp: '2025-08-08 11:30 EAT',
      vehicleId: 'v-2',
      vehicleReg: 'KDH 109G',
      driverName: 'David Njuguna',
      stationName: 'Spiro Station Westlands',
      stationLocation: 'Muthangari Drive, Westlands, Nairobi',
      removedBatteryId: 'BATT-SP-4091',
      removedBatterySoC: 8,
      removedBatterySoh: 94,
      installedBatteryId: 'BATT-SP-4410',
      installedBatterySoC: 100,
      installedBatterySoh: 97,
      swapDurationMinutes: 3.0,
      costKes: 300,
      operatorName: 'Spiro Automated Swap Cabinet',
      notes: 'Automated cabinet swap. Removed pack flagged for routine impedance check.'
    },
    {
      id: 'swap-3',
      swapCode: 'SWAP-2025-08103',
      timestamp: '2025-08-07 18:45 EAT',
      vehicleId: 'v-1',
      vehicleReg: 'KMG 482E',
      driverName: 'Juma Omondi',
      stationName: 'ARC Ride Lavington',
      stationLocation: 'James Gichuru Rd, Lavington, Nairobi',
      removedBatteryId: 'BATT-RM-9014',
      removedBatterySoC: 19,
      removedBatterySoh: 98,
      installedBatteryId: 'BATT-RM-8821',
      installedBatterySoC: 98,
      installedBatterySoh: 96,
      swapDurationMinutes: 2.8,
      costKes: 350,
      operatorName: 'ARC Ride Tech',
      notes: 'Re-installed fast-charged BATT-RM-8821 pack after full balance.'
    },
    {
      id: 'swap-4',
      swapCode: 'SWAP-2025-08104',
      timestamp: '2025-08-07 10:15 EAT',
      vehicleId: 'v-4',
      vehicleReg: 'KDF 319S',
      driverName: 'Eunice Wambui',
      stationName: 'Ampersand Industrial Area Hub',
      stationLocation: 'Enterprise Rd, Industrial Area, Nairobi',
      removedBatteryId: 'BATT-AMP-102',
      removedBatterySoC: 11,
      removedBatterySoh: 93,
      installedBatteryId: 'BATT-AMP-118',
      installedBatterySoC: 96,
      installedBatterySoh: 99,
      swapDurationMinutes: 3.2,
      costKes: 400,
      operatorName: 'Ampersand Swap Operator',
      notes: 'High demand morning swap. Both packs in optimal operational range.'
    },
    {
      id: 'swap-5',
      swapCode: 'SWAP-2025-08105',
      timestamp: '2025-08-08 16:20 EAT',
      vehicleId: 'v-2',
      vehicleReg: 'KDH 109G',
      driverName: 'David Njuguna',
      stationName: 'Spiro Station Westlands',
      stationLocation: 'Muthangari Drive, Westlands, Nairobi',
      removedBatteryId: 'BATT-SP-4410',
      removedBatterySoC: 5,
      removedBatterySoh: 92,
      installedBatteryId: 'BATT-SP-5012',
      installedBatterySoC: 100,
      installedBatterySoh: 98,
      swapDurationMinutes: 14.5,
      costKes: 300,
      operatorName: 'Spiro Attendant #02',
      notes: 'Swap exceeded 10m target. Cabinet locking mechanism jammed during eject process requiring manual override pin reset.',
      isDelayed: true,
      delayReason: 'Cabinet Lock Ejection Mechanical Failure',
      delayResolved: false
    },
    {
      id: 'swap-6',
      swapCode: 'SWAP-2025-08106',
      timestamp: '2025-08-06 17:10 EAT',
      vehicleId: 'v-1',
      vehicleReg: 'KMG 482E',
      driverName: 'Juma Omondi',
      stationName: 'Roam Hub Kilimani',
      stationLocation: 'Argwings Kodhek Rd, Kilimani, Nairobi',
      removedBatteryId: 'BATT-RM-8821',
      removedBatterySoC: 12,
      removedBatterySoh: 96,
      installedBatteryId: 'BATT-RM-9088',
      installedBatterySoC: 98,
      installedBatterySoh: 95,
      swapDurationMinutes: 11.8,
      costKes: 350,
      operatorName: 'Roam Operator #01',
      notes: 'Peak rush hour queue congestion and driver payment validation delay at cabinet terminal.',
      isDelayed: true,
      delayReason: 'Staff Shift Handover & Station Queue',
      delayResolved: false
    }
  ]);

  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>(() => initialCache?.workOrders ?? [
    {
      id: 'wo-1',
      workOrderCode: 'WO-2025-104',
      vehicleId: 'v-2',
      vehicleReg: 'KDH 109G',
      vehicleModel: 'Spiro Equator Bike',
      serviceType: 'Brake Pad Replacement',
      priority: 'Medium',
      status: 'Completed',
      odometerKmAtService: 28500,
      partsUsed: [
        { partName: 'Spiro Ceramic Brake Pads Front', quantity: 1, unitCostKes: 1800 },
        { partName: 'Brake Fluid 250ml', quantity: 1, unitCostKes: 400 }
      ],
      laborCostKes: 800,
      totalCostKes: 3000,
      workshopName: 'GreenShift Central Garage Westlands',
      mechanicName: 'Peter Kamau',
      downtimeHours: 2.5,
      startDate: '2025-08-05',
      completionDate: '2025-08-05',
      notes: 'Front brake pads worn below 2mm threshold.'
    }
  ]);

  const [spareParts, setSpareParts] = useState<SparePartItem[]>(() => initialCache?.spareParts ?? [
    {
      id: 'sp-1',
      partName: 'Roam Air Battery Cell Module 3.2V',
      partNumber: 'RM-CELL-32V',
      compatibleVehicleTypes: ['Electric Motorcycle'],
      quantityInStock: 28,
      minimumStockLevel: 10,
      unitCostKes: 4200,
      supplierName: 'Roam Motors Kenya Ltd',
      locationBin: 'BIN-EV-01'
    },
    {
      id: 'sp-2',
      partName: 'TVS HLX 150 Clutch Plate Kit',
      partNumber: 'TVS-CLUTCH-150',
      compatibleVehicleTypes: ['Fuel Motorcycle'],
      quantityInStock: 8,
      minimumStockLevel: 12,
      unitCostKes: 2200,
      supplierName: 'Car & General Kenya',
      locationBin: 'BIN-FUEL-04'
    },
    {
      id: 'sp-3',
      partName: 'Heavy-Duty Tubeless Tire 17" Front/Rear',
      partNumber: 'TIRE-EV-17',
      compatibleVehicleTypes: ['Electric Motorcycle', 'Fuel Motorcycle'],
      quantityInStock: 3,
      minimumStockLevel: 15,
      unitCostKes: 3800,
      supplierName: 'Sameer Africa / Yana Kenya',
      locationBin: 'BIN-TIRE-02'
    },
    {
      id: 'sp-4',
      partName: 'Spiro Equator Ceramic Brake Pads Set',
      partNumber: 'SP-PAD-440',
      compatibleVehicleTypes: ['Electric Motorcycle'],
      quantityInStock: 2,
      minimumStockLevel: 10,
      unitCostKes: 1800,
      supplierName: 'Spiro Mobility Kenya',
      locationBin: 'BIN-EV-08'
    },
    {
      id: 'sp-5',
      partName: 'Synthetic Engine Oil 10W-40 (1 Liter)',
      partNumber: 'OIL-10W40-1L',
      compatibleVehicleTypes: ['Petrol Car', 'Fuel Motorcycle'],
      quantityInStock: 22,
      minimumStockLevel: 15,
      unitCostKes: 1100,
      supplierName: 'TotalEnergies Kenya',
      locationBin: 'BIN-LUBE-01'
    }
  ]);

  const [mpesaPayouts, setMpesaPayouts] = useState<MpesaPayoutRequest[]>(() => initialCache?.mpesaPayouts ?? [
    {
      id: 'p-1',
      transactionRef: 'MPESA-B2C-99182',
      driverId: 'd-1',
      driverName: 'Juma Omondi',
      phoneNumber: '254712345678',
      amountKes: 8500,
      payoutReason: 'Weekly Earnings Payout',
      status: 'Success',
      mpesaReceiptNo: 'RGK9182903',
      timestamp: '2025-08-07 18:00 EAT',
      initiatedByRole: 'Finance Manager'
    },
    {
      id: 'p-2',
      transactionRef: 'MPESA-B2C-99185',
      driverId: 'd-3',
      driverName: 'Brian Kipchirchir',
      phoneNumber: '254733990011',
      amountKes: 12000,
      payoutReason: 'Daily Target Surplus',
      status: 'Success',
      mpesaReceiptNo: 'RGK9182903', // DUPLICATE receipt reference with p-1 for reconciliation warning
      timestamp: '2025-08-08 09:30 EAT',
      initiatedByRole: 'Operations Manager'
    },
    {
      id: 'p-3',
      transactionRef: 'MPESA-B2C-99188',
      driverId: 'd-5',
      driverName: 'Mercy Chebet',
      phoneNumber: '254722114455',
      amountKes: 6500,
      payoutReason: 'Expense Reimbursement',
      status: 'Success',
      mpesaReceiptNo: '', // MISSING receipt reference for reconciliation warning
      timestamp: '2025-08-08 14:10 EAT',
      initiatedByRole: 'Accountant'
    },
    {
      id: 'p-4',
      transactionRef: 'MPESA-B2C-99192',
      driverId: 'd-2',
      driverName: 'Kevin Ndung\'u',
      phoneNumber: '254711882233',
      amountKes: 15000,
      payoutReason: 'Weekly Earnings Payout',
      status: 'Success',
      mpesaReceiptNo: 'QHK402910M',
      timestamp: '2025-08-08 16:45 EAT',
      initiatedByRole: 'Finance Manager'
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => initialCache?.auditLogs ?? [
    {
      id: 'log-1',
      timestamp: '2026-08-08 10:15:22 EAT',
      userName: 'Grace Mutua (Finance)',
      userRole: 'Finance Manager',
      action: 'M-Pesa B2C Payout Executed',
      targetEntity: 'Driver Juma Omondi (KES 8,500)',
      ipAddress: '197.232.14.92'
    }
  ]);

  const [driverMessages, setDriverMessages] = useState<DispatcherMessage[]>(() => initialCache?.driverMessages ?? [
    {
      id: 'msg-1',
      messageCode: 'MSG-2026-0801',
      senderRole: 'Dispatch Command Unit',
      targetType: 'Individual',
      recipientDriverId: 'd-1',
      recipientDriverName: 'Juma Omondi',
      recipientDriverPhone: '+254712345678',
      recipientVehicleReg: 'KMG 482E',
      category: 'EV & Battery Swap',
      priority: 'Urgent',
      subject: 'Urgent Battery Swap Recall',
      content: 'Your EV battery level is below 20%. Please head immediately to GreenShift Swapping Station B-04 (Kilimani) for a fresh battery swap.',
      quickReplyOptions: ['Heading to Station Now', 'Swapping in 10 mins', 'Need Towing / Support'],
      driverReply: {
        choice: 'Heading to Station Now',
        note: 'Approaching Kilimani swapping station in 4 mins.',
        timestamp: '2026-08-08 14:10 EAT'
      },
      deliveryStatus: 'Replied',
      timestamp: '2026-08-08 14:05 EAT',
      requiresAck: true
    },
    {
      id: 'msg-2',
      messageCode: 'MSG-2026-0802',
      senderRole: 'Safety Operations',
      targetType: 'Broadcast Group',
      recipientGroup: 'All Online Drivers',
      category: 'Safety & Speed',
      priority: 'Critical Flash',
      subject: 'Speed Limit Warning (>80 km/h)',
      content: 'Telematics detected speed exceeding 80 km/h on Waiyaki Way. Please reduce speed immediately to maintain your Weekly Safety Bonus eligibility.',
      quickReplyOptions: ['Acknowledged - Slowing Down', 'Traffic Flow Safe', 'Spurious Alert'],
      deliveryStatus: 'Delivered',
      timestamp: '2026-08-08 14:45 EAT',
      requiresAck: true
    }
  ]);

  // --- Persistent Local Storage Cache Sync ---
  useEffect(() => {
    const syncedAt = saveFleetCache({
      vehicles,
      drivers,
      trips,
      evSessions,
      fuelTxns,
      workOrders,
      spareParts,
      documents,
      incidents,
      mpesaPayouts,
      auditLogs,
      driverMessages
    });
    setLastSyncedAt(syncedAt);
  }, [
    vehicles, drivers, trips, evSessions, fuelTxns, 
    workOrders, spareParts, documents, incidents, 
    mpesaPayouts, auditLogs, driverMessages
  ]);

  const handleForceSyncCache = () => {
    const syncedAt = saveFleetCache({
      vehicles,
      drivers,
      trips,
      evSessions,
      fuelTxns,
      workOrders,
      spareParts,
      documents,
      incidents,
      mpesaPayouts,
      auditLogs,
      driverMessages
    });
    setLastSyncedAt(syncedAt);
  };

  // --- Filtered Datasets Based on City & Global Search ---

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchCity = selectedCity === 'All Cities' || v.city === selectedCity;
      const matchSearch = searchQuery === '' || 
        v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCity && matchSearch;
    });
  }, [vehicles, selectedCity, searchQuery]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchCity = selectedCity === 'All Cities' || d.city === selectedCity;
      const matchSearch = searchQuery === '' || 
        d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phone.includes(searchQuery) ||
        (d.assignedVehicleReg && d.assignedVehicleReg.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCity && matchSearch;
    });
  }, [drivers, selectedCity, searchQuery]);

  // Calculated Stats
  const stats: FleetSummaryStats = useMemo(() => {
    const totalV = vehicles.length;
    const evCount = vehicles.filter(v => v.category === 'Electric').length;
    const fuelCount = vehicles.filter(v => v.category === 'Fuel').length;
    
    const onTrip = vehicles.filter(v => v.status === 'On Trip').length;
    const online = vehicles.filter(v => v.status === 'Online').length;
    const idle = vehicles.filter(v => v.status === 'Idle').length;
    const charging = vehicles.filter(v => v.status === 'Charging').length;
    const maint = vehicles.filter(v => v.status === 'Under Maintenance').length;
    const offline = vehicles.filter(v => v.status === 'Available' || v.status === 'Inactive').length;

    const totalRev = vehicles.reduce((acc, v) => acc + v.totalRevenueGeneratedKes, 0);
    const fuelExp = vehicles.reduce((acc, v) => acc + v.totalFuelSpentKes, 0);
    const evExp = vehicles.reduce((acc, v) => acc + v.totalChargingSpentKes, 0);
    const maintExp = vehicles.reduce((acc, v) => acc + v.totalMaintenanceSpentKes, 0);

    const openIncs = incidents.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length;
    const expDocs = documents.filter(d => d.daysUntilExpiry <= 30).length;
    const maintDue = vehicles.filter(v => v.nextServiceOdometerKm != null && v.odometerKm >= v.nextServiceOdometerKm).length;

    return {
      totalVehicles: totalV,
      electricVehiclesCount: evCount,
      fuelVehiclesCount: fuelCount,
      activeVehiclesCount: onTrip + online + charging,
      onlineCount: online,
      onTripCount: onTrip,
      idleCount: idle,
      chargingCount: charging,
      maintenanceCount: maint,
      offlineCount: offline,

      totalDriversCount: drivers.length,
      activeDriversCount: drivers.filter(d => d.status === 'Active' || d.status === 'On Trip' || d.status === 'Online').length,
      onlineDriversCount: drivers.filter(d => d.status === 'Online' || d.status === 'On Trip').length,

      todayGrossRevenueKes: 520000,
      todayCompanyProfitKes: 410000,
      todayDriverPayoutsKes: 78000,
      todayFuelExpensesKes: 18500,
      todayChargingExpensesKes: 13500,
      todayMaintenanceExpensesKes: 9500,

      evVsFuelProfitMarginPercent: {
        evMarginPercent: 88,
        fuelMarginPercent: 54
      },

      averageBatteryHealthPercent: 96,
      expiringDocsAlertCount: expDocs,
      openIncidentsCount: openIncs,
      maintenanceDueCount: maintDue
    };
  }, [vehicles, drivers, incidents, documents]);

  // --- Handler Callbacks ---

  const handleAddVehicle = (newVehicle: Vehicle) => {
    setVehicles(prev => [newVehicle, ...prev]);
    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString() + ' EAT',
        userName: selectedRole,
        userRole: selectedRole,
        action: 'New Vehicle Registered',
        targetEntity: `Vehicle ${newVehicle.registrationNumber} (${newVehicle.make} ${newVehicle.model})`,
        ipAddress: '197.232.10.11'
      },
      ...prev
    ]);
  };

  const handleRecordFuel = (newFuel: FuelTransaction) => {
    setFuelTxns(prev => [newFuel, ...prev]);
    // update vehicle odometer and fuel cost
    setVehicles(prev => prev.map(v => {
      if (v.id === newFuel.vehicleId) {
        return {
          ...v,
          odometerKm: Math.max(v.odometerKm, newFuel.odometerReadingKm),
          totalFuelSpentKes: v.totalFuelSpentKes + newFuel.totalCostKes,
          netProfitKes: v.netProfitKes - newFuel.totalCostKes
        };
      }
      return v;
    }));
  };

  const handleRecordEv = (newEv: EvBatterySession) => {
    setEvSessions(prev => [newEv, ...prev]);
    setVehicles(prev => prev.map(v => {
      if (v.id === newEv.vehicleId) {
        return {
          ...v,
          currentSoCPercent: newEv.endSoCPercent,
          totalChargingSpentKes: v.totalChargingSpentKes + newEv.costKes,
          netProfitKes: v.netProfitKes - newEv.costKes
        };
      }
      return v;
    }));
  };

  const handleAddWorkOrder = (newWo: MaintenanceWorkOrder) => {
    setWorkOrders(prev => [newWo, ...prev]);
    setVehicles(prev => prev.map(v => {
      if (v.id === newWo.vehicleId) {
        return {
          ...v,
          status: newWo.status === 'In Progress' ? 'Under Maintenance' : v.status,
          totalMaintenanceSpentKes: v.totalMaintenanceSpentKes + newWo.totalCostKes,
          netProfitKes: v.netProfitKes - newWo.totalCostKes
        };
      }
      return v;
    }));
  };

  const handleExecutePayout = (driverId: string, amount: number, reason: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const newPayout: MpesaPayoutRequest = {
      id: `p-${Date.now()}`,
      transactionRef: `MPESA-B2C-${Math.floor(100000 + Math.random() * 900000)}`,
      driverId: driver.id,
      driverName: driver.fullName,
      phoneNumber: driver.mpesaPhoneNumber || driver.phone,
      amountKes: amount,
      payoutReason: reason as any,
      status: 'Success',
      mpesaReceiptNo: `RGK${Math.floor(10000000 + Math.random() * 90000000)}`,
      timestamp: new Date().toLocaleString() + ' EAT',
      initiatedByRole: selectedRole
    };

    setMpesaPayouts(prev => [newPayout, ...prev]);
    // Adjust driver balance
    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        return {
          ...d,
          outstandingBalanceKes: d.outstandingBalanceKes - amount
        };
      }
      return d;
    }));

    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString() + ' EAT',
        userName: selectedRole,
        userRole: selectedRole,
        action: 'M-Pesa B2C Payout Processed',
        targetEntity: `Driver ${driver.fullName} (KES ${amount.toLocaleString()})`,
        ipAddress: '197.232.10.11'
      },
      ...prev
    ]);
  };

  const handleExecuteBulkPayouts = (payouts: Array<{ driverId: string; amountKes: number; reason: string }>) => {
    if (payouts.length === 0) return;

    const newPayouts: MpesaPayoutRequest[] = [];
    const amountMap: Record<string, number> = {};
    let totalGross = 0;

    payouts.forEach((p, idx) => {
      const driver = drivers.find(d => d.id === p.driverId);
      if (driver) {
        amountMap[p.driverId] = (amountMap[p.driverId] || 0) + p.amountKes;
        totalGross += p.amountKes;

        newPayouts.push({
          id: `p-${Date.now()}-${idx}`,
          transactionRef: `MPESA-B2C-${Math.floor(100000 + Math.random() * 900000)}`,
          driverId: driver.id,
          driverName: driver.fullName,
          phoneNumber: driver.mpesaPhoneNumber || driver.phone,
          amountKes: p.amountKes,
          payoutReason: p.reason as any,
          status: 'Success',
          mpesaReceiptNo: `RGK${Math.floor(10000000 + Math.random() * 90000000)}`,
          timestamp: new Date().toLocaleString() + ' EAT',
          initiatedByRole: selectedRole
        });
      }
    });

    setMpesaPayouts(prev => [...newPayouts, ...prev]);

    // Adjust driver balances
    setDrivers(prev => prev.map(d => {
      if (amountMap[d.id]) {
        return {
          ...d,
          outstandingBalanceKes: Math.max(0, d.outstandingBalanceKes - amountMap[d.id])
        };
      }
      return d;
    }));

    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString() + ' EAT',
        userName: selectedRole,
        userRole: selectedRole,
        action: 'M-Pesa Bulk B2C Batch Dispatched',
        targetEntity: `${payouts.length} Drivers Batch (Total KES ${totalGross.toLocaleString()})`,
        ipAddress: '197.232.10.11'
      },
      ...prev
    ]);
  };

  const handleReportIncident = (vehicleId: string, driverId: string, type: string, severity: string, description: string, location: string) => {
    const v = vehicles.find(veh => veh.id === vehicleId);
    const d = drivers.find(drv => drv.id === driverId);

    const newIncident: IncidentReport = {
      id: `inc-${Date.now()}`,
      incidentCode: `SOS-2025-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleId: vehicleId,
      vehicleReg: v ? v.registrationNumber : 'Unknown Reg',
      driverId: driverId,
      driverName: d ? d.fullName : 'Unknown Driver',
      driverPhone: d ? d.phone : '+254700000000',
      incidentType: type as any,
      severity: severity as any,
      locationName: location,
      lat: -1.286389,
      lng: 36.817223,
      timestamp: new Date().toLocaleString() + ' EAT',
      description,
      status: 'Open',
      assignedOfficer: 'Dispatch Command Unit'
    };

    setIncidents(prev => [newIncident, ...prev]);
  };

  const handleUpdateVehicleStatus = (vehicleId: string, status: any) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status } : v));
  };

  const handleBulkUpdateVehicleStatus = (vehicleIds: string[], status: any) => {
    if (!vehicleIds || vehicleIds.length === 0) return;
    setVehicles(prev => prev.map(v => vehicleIds.includes(v.id) ? { ...v, status } : v));
    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString() + ' EAT',
        userName: selectedRole,
        userRole: selectedRole,
        action: 'Bulk Vehicle Status Changed',
        targetEntity: `${vehicleIds.length} Vehicles updated to '${status}'`,
        ipAddress: '197.232.10.11'
      },
      ...prev
    ]);
  };

  const handleUpdateDriverStatus = (driverId: string, status: any) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status } : d));
  };

  const handleUpdateDriverSafetyScore = (driverId: string, score: number) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, safetyScorePercent: score } : d));
  };

  const handleAssignDriver = (vehicleId: string, driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, assignedDriverId: driverId, assignedDriverName: driver?.fullName, assignedDriverPhone: driver?.phone } : v));
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, assignedVehicleId: vehicleId, assignedVehicleReg: vehicles.find(v => v.id === vehicleId)?.registrationNumber } : d));
  };

  const handleSendMessage = (msgData: Omit<DispatcherMessage, 'id' | 'messageCode' | 'timestamp' | 'deliveryStatus'>) => {
    const newMsg: DispatcherMessage = {
      ...msgData,
      id: `msg-${Date.now()}`,
      messageCode: `MSG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      deliveryStatus: 'Delivered',
      timestamp: new Date().toLocaleString() + ' EAT'
    };

    setDriverMessages(prev => [newMsg, ...prev]);

    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString() + ' EAT',
        userName: selectedRole,
        userRole: selectedRole,
        action: 'Driver Mobile App Instruction Dispatched',
        targetEntity: msgData.targetType === 'Individual' 
          ? `Driver ${msgData.recipientDriverName} (${msgData.subject})` 
          : `Group ${msgData.recipientGroup} (${msgData.subject})`,
        ipAddress: '197.232.10.11'
      },
      ...prev
    ]);
  };

  const handleSimulateDriverReply = (messageId: string, replyChoice: string, note?: string) => {
    setDriverMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          deliveryStatus: 'Replied',
          driverReply: {
            choice: replyChoice,
            note: note || `Driver replied: "${replyChoice}" from GreenShift Mobile App`,
            timestamp: new Date().toLocaleString() + ' EAT'
          }
        };
      }
      return m;
    }));
  };

  const handleBulkAcknowledgeMessages = (messageIds: string[]) => {
    setDriverMessages(prev => prev.map(m => {
      if (messageIds.includes(m.id)) {
        return {
          ...m,
          deliveryStatus: 'Replied',
          driverReply: m.driverReply || {
            choice: 'Acknowledged by Dispatch Command',
            note: 'Bulk acknowledged and resolved by dispatcher',
            timestamp: new Date().toLocaleString() + ' EAT'
          }
        };
      }
      return m;
    }));

    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString() + ' EAT',
        userName: selectedRole,
        userRole: selectedRole,
        action: 'Bulk Message Acknowledgement',
        targetEntity: `${messageIds.length} Driver Messages Bulk Acknowledged`,
        ipAddress: '197.232.10.11'
      },
      ...prev
    ]);
  };

  const handleLogBatterySwap = (swapData: {
    vehicleId: string;
    vehicleReg: string;
    removedBatteryId: string;
    removedBatterySoC: number;
    installedBatteryId: string;
    installedBatterySoC: number;
    stationName: string;
    technicianName: string;
    notes?: string;
  }) => {
    const newSwapRecord: BatterySwapRecord = {
      id: `swap-${Date.now()}`,
      swapCode: `SWP-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleString() + ' EAT',
      vehicleId: swapData.vehicleId,
      vehicleReg: swapData.vehicleReg,
      driverName: vehicles.find(v => v.id === swapData.vehicleId)?.assignedDriverName || 'Field Technician Swap',
      stationName: swapData.stationName,
      stationLocation: swapData.stationName,
      removedBatteryId: swapData.removedBatteryId,
      removedBatterySoC: swapData.removedBatterySoC,
      removedBatterySoh: 96,
      installedBatteryId: swapData.installedBatteryId,
      installedBatterySoC: swapData.installedBatterySoC,
      installedBatterySoh: 100,
      swapDurationMinutes: 3,
      costKes: 350,
      operatorName: swapData.technicianName,
      notes: swapData.notes || 'Logged via QR sticker fast scan'
    };

    setBatterySwapRecords(prev => [newSwapRecord, ...prev]);

    setVehicles(prev => prev.map(v => {
      if (v.id === swapData.vehicleId) {
        return {
          ...v,
          batteryId: swapData.installedBatteryId,
          currentSoCPercent: swapData.installedBatterySoC,
          status: 'Available'
        };
      }
      return v;
    }));

    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString() + ' EAT',
        userName: swapData.technicianName,
        userRole: 'Maintenance Manager',
        action: 'Field QR Battery Swap Logged',
        targetEntity: `Vehicle ${swapData.vehicleReg} (New Pack: ${swapData.installedBatteryId})`,
        ipAddress: '197.232.10.15'
      },
      ...prev
    ]);
  };

  // Render Module Switcher
  const renderModuleContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardOverview
            stats={stats}
            vehicles={filteredVehicles}
            drivers={filteredDrivers}
            incidents={incidents}
            trips={trips}
            onNavigateTab={setActiveTab}
            onOpenNewVehicleModal={() => setIsNewVehicleModalOpen(true)}
            onOpenFuelModal={() => setIsRecordFuelModalOpen(true)}
            onOpenEvModal={() => setIsRecordEvModalOpen(true)}
            onOpenMpesaModal={() => handleOpenMpesaModalForDriver(null)}
            onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
          />
        );
      case 'map':
        return (
          <LiveFleetMap 
            vehicles={filteredVehicles} 
            incidents={incidents}
            selectedCity={selectedCity} 
            onSelectVehicle={() => {}}
            onUpdateStatus={handleUpdateVehicleStatus}
          />
        );
      case 'vehicles':
        return (
          <VehiclesModule 
            vehicles={filteredVehicles} 
            drivers={drivers}
            selectedCity={selectedCity}
            onUpdateVehicleStatus={handleUpdateVehicleStatus}
            onBulkUpdateVehicleStatus={handleBulkUpdateVehicleStatus}
            onAssignDriver={handleAssignDriver}
            onOpenNewVehicleModal={() => setIsNewVehicleModalOpen(true)}
            onLogBatterySwap={handleLogBatterySwap}
          />
        );
      case 'drivers':
        return (
          <DriversModule 
            drivers={filteredDrivers} 
            vehicles={vehicles}
            mpesaPayouts={mpesaPayouts}
            selectedCity={selectedCity}
            onUpdateDriverStatus={handleUpdateDriverStatus}
            onUpdateDriverSafetyScore={handleUpdateDriverSafetyScore}
            onOpenMpesaModalForDriver={(driver) => handleOpenMpesaModalForDriver(driver)}
            onNavigateToMessages={(driver) => handleOpenMessageComposerForDriver(driver)}
          />
        );
      case 'messages':
        return (
          <MessagesModule
            messages={driverMessages}
            drivers={drivers}
            vehicles={vehicles}
            prefilledDriver={selectedMessageDriver}
            onSendMessage={handleSendMessage}
            onSimulateDriverReply={handleSimulateDriverReply}
            onBulkAcknowledgeMessages={handleBulkAcknowledgeMessages}
          />
        );
      case 'security':
        return (
          <SecurityAlertsDashboard
            vehicles={vehicles}
            drivers={drivers}
            incidents={incidents}
            fuelLogs={fuelTxns}
            onAddIncident={(newInc) => setIncidents(prev => [newInc, ...prev])}
            onNavigateTab={setActiveTab}
            onOpenMessageComposer={handleOpenMessageComposerForDriver}
          />
        );
      case 'ev':
        return (
          <EvBatteryModule 
            vehicles={vehicles.filter(v => v.category === 'Electric')} 
            evSessions={evSessions}
            swapRecords={batterySwapRecords}
            drivers={drivers}
            onOpenEvModal={() => setIsRecordEvModalOpen(true)}
            onRecordBatterySwap={(newSwap) => setBatterySwapRecords(prev => [newSwap, ...prev])}
            onOpenWorkOrder={(vehicle) => handleOpenWorkOrderForVehicle(vehicle)}
          />
        );
      case 'fuel':
        return (
          <FuelModule 
            fuelLogs={fuelTxns} 
            vehicles={vehicles}
            onOpenFuelModal={() => setIsRecordFuelModalOpen(true)}
          />
        );
      case 'maintenance':
        return (
          <MaintenanceModule 
            workOrders={workOrders} 
            inventory={spareParts}
            vehicles={vehicles}
            onOpenWorkOrderModal={() => setIsWorkOrderModalOpen(true)}
          />
        );
      case 'finance':
        return (
          <FinancialsModule 
            stats={stats}
            drivers={drivers}
            vehicles={vehicles}
            mpesaPayouts={mpesaPayouts} 
            onSendMpesaPayout={handleExecutePayout}
          />
        );
      case 'documents':
        return <DocumentsModule documents={documents} />;
      case 'incidents':
        return (
          <IncidentsModule 
            incidents={incidents} 
            onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
          />
        );
      case 'ai':
        return (
          <AiFleetAssistant
            drivers={drivers}
            vehicles={vehicles}
            onOpenMpesaPayoutModal={handleOpenMpesaModalForDriver}
            onOpenWorkOrderModal={handleOpenWorkOrderForVehicle}
            onOpenRecordFuelModal={handleOpenRecordFuelForVehicle}
            onOpenRecordEvModal={handleOpenRecordEvForVehicle}
            onOpenNewVehicleModal={() => setIsNewVehicleModalOpen(true)}
            onOpenMessageComposer={handleOpenMessageComposerForDriver}
          />
        );
      case 'reports':
        return <ReportsModule stats={stats} vehicles={vehicles} />;
      case 'audit':
        return <AuditLogsModule auditLogs={auditLogs} currentRole={selectedRole} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans antialiased h-screen flex flex-col overflow-hidden">
      
      {/* Professional Top Navigation */}
      <Navbar 
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onOpenAiAssistant={() => setActiveTab('ai')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        alertCount={stats.openIncidentsCount + stats.expiringDocsAlertCount}
        isOnline={isOnline}
        lastSyncedAt={lastSyncedAt}
        onForceSyncCache={handleForceSyncCache}
        documents={documents}
        vehicles={vehicles}
        drivers={drivers}
        onNavigateTab={(tab) => setActiveTab(tab as any)}
      />

      {/* Offline Mode Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-amber-600 shadow-xs animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> Internet connection temporarily lost. Critical fleet dashboards and operational modules remain viewable using local storage cache.
            </span>
          </div>
          <div className="text-[11px] font-mono bg-amber-600 text-slate-950 px-2 py-0.5 rounded font-black">
            Last Cached: {lastSyncedAt}
          </div>
        </div>
      )}

      {/* Main Body Shell */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Professional Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          openIncidentsCount={stats.openIncidentsCount}
          expiringDocsCount={stats.expiringDocsAlertCount}
          pendingMessagesCount={driverMessages.filter(m => m.deliveryStatus !== 'Replied').length}
          maintenanceDueCount={stats.maintenanceDueCount}
        />

        {/* Scrollable Main Operations Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {renderModuleContent()}
        </main>

      </div>

      {/* Interactive Operational Modals */}
      <NewVehicleModal 
        isOpen={isNewVehicleModalOpen}
        onClose={() => setIsNewVehicleModalOpen(false)}
        drivers={drivers}
        onAddVehicle={handleAddVehicle}
      />

      <RecordFuelModal 
        isOpen={isRecordFuelModalOpen}
        onClose={() => setIsRecordFuelModalOpen(false)}
        vehicles={vehicles}
        drivers={drivers}
        preselectedVehicle={selectedVehicleForFuel}
        preselectedDriver={selectedDriverForFuel}
        onSubmit={handleRecordFuel}
      />

      <RecordEvModal 
        isOpen={isRecordEvModalOpen}
        onClose={() => setIsRecordEvModalOpen(false)}
        vehicles={vehicles}
        preselectedVehicle={selectedVehicleForEv}
        onSubmit={handleRecordEv}
      />

      <WorkOrderModal 
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
        vehicles={vehicles}
        preselectedVehicle={selectedVehicleForWorkOrder}
        onSubmit={handleAddWorkOrder}
      />

      <MpesaPayoutModal
        isOpen={isMpesaModalOpen}
        onClose={() => setIsMpesaModalOpen(false)}
        drivers={drivers}
        preselectedDriver={selectedDriverForMpesa}
        onSendMpesaPayout={handleExecutePayout}
        onSendBulkMpesaPayouts={handleExecuteBulkPayouts}
      />

    </div>
  );
}
