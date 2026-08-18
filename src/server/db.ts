/**
 * GreenShift Fleet Command - In-Memory & File Persistent Database Engine
 * Real, Kenya-First Fleet Data with Live Updates, Calculations & Telemetry
 */

import { 
  Vehicle, Driver, Trip, EvBatterySession, FuelTransaction, 
  MaintenanceWorkOrder, SparePartItem, VehicleDocument, IncidentReport, 
  MpesaPayoutRequest, AuditLogEntry, FleetSummaryStats, CityRegion, VehicleStatus, DriverStatus 
} from '../types';

class FleetDatabase {
  private vehicles: Vehicle[] = [];
  private drivers: Driver[] = [];
  private trips: Trip[] = [];
  private evSessions: EvBatterySession[] = [];
  private fuelLogs: FuelTransaction[] = [];
  private workOrders: MaintenanceWorkOrder[] = [];
  private inventory: SparePartItem[] = [];
  private documents: VehicleDocument[] = [];
  private incidents: IncidentReport[] = [];
  private mpesaPayouts: MpesaPayoutRequest[] = [];
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.seedDatabase();
    this.startSimulationInterval();
  }

  private seedDatabase() {
    // 1. SEED VEHICLES (Mixed Kenya Fleet: Electric Bikes, Fuel Boda Bodas, EV Cars, Fuel Cars, SUVs, Vans)
    this.vehicles = [
      {
        id: 'v-01',
        registrationNumber: 'KMG 482E',
        make: 'Roam',
        model: 'Air Electric Motorcycle',
        year: 2025,
        type: 'Electric Motorcycle',
        category: 'Electric',
        color: 'Electric Emerald',
        vin: 'RM2025KE984001',
        batteryId: 'BAT-RM-908',
        batteryCapacityKwh: 3.2,
        currentSoCPercent: 88,
        batteryHealthPercent: 96,
        odometerKm: 14280,
        purchaseDate: '2025-01-15',
        purchasePriceKes: 280000,
        currentEstimatedValueKes: 250000,
        ownershipType: 'Purchased',
        city: 'Nairobi',
        assignedDriverId: 'd-01',
        assignedDriverName: 'Juma Omondi',
        assignedDriverPhone: '+254712345678',
        currentLocation: {
          lat: -1.2683,
          lng: 36.8111,
          heading: 140,
          speedKmh: 42,
          lastUpdated: new Date().toISOString(),
          address: 'Westlands Commercial Center, Nairobi'
        },
        status: 'On Trip',
        insurancePolicyNumber: 'APA-COM-99201',
        insuranceExpiry: '2027-02-15',
        ntsaInspectionExpiry: '2026-11-20',
        totalTripsCount: 1240,
        totalRevenueGeneratedKes: 348000,
        totalFuelSpentKes: 0,
        totalChargingSpentKes: 38400,
        totalMaintenanceSpentKes: 14500,
        netProfitKes: 295100
      },
      {
        id: 'v-02',
        registrationNumber: 'KDC 719X',
        make: 'TVS',
        model: 'HLX 150 Fuel Boda',
        year: 2024,
        type: 'Fuel Motorcycle',
        category: 'Fuel',
        color: 'Midnight Black',
        vin: 'TVS2024KE11283',
        engineNumber: 'ENG-TVS-88301',
        currentFuelLiters: 8.5,
        fuelCapacityLiters: 11,
        odometerKm: 32150,
        purchaseDate: '2024-03-10',
        purchasePriceKes: 185000,
        currentEstimatedValueKes: 140000,
        ownershipType: 'Purchased',
        city: 'Nairobi',
        assignedDriverId: 'd-02',
        assignedDriverName: 'Samuel Kamau',
        assignedDriverPhone: '+254722987654',
        currentLocation: {
          lat: -1.2864,
          lng: 36.8232,
          heading: 210,
          speedKmh: 0,
          lastUpdated: new Date().toISOString(),
          address: 'Nairobi CBD, Kenyatta Avenue'
        },
        status: 'Idle',
        insurancePolicyNumber: 'CIC-MOT-88319',
        insuranceExpiry: '2026-09-10',
        ntsaInspectionExpiry: '2026-08-30',
        totalTripsCount: 1980,
        totalRevenueGeneratedKes: 485000,
        totalFuelSpentKes: 142000,
        totalChargingSpentKes: 0,
        totalMaintenanceSpentKes: 36000,
        netProfitKes: 307000
      },
      {
        id: 'v-03',
        registrationNumber: 'KDG 104E',
        make: 'Spiro',
        model: 'Equator EV Bike',
        year: 2025,
        type: 'Electric Motorcycle',
        category: 'Electric',
        color: 'Yellow Volt',
        vin: 'SPR2025KE33100',
        batteryId: 'BAT-SPR-204',
        batteryCapacityKwh: 2.8,
        currentSoCPercent: 34,
        batteryHealthPercent: 91,
        odometerKm: 9800,
        purchaseDate: '2025-02-01',
        purchasePriceKes: 260000,
        currentEstimatedValueKes: 235000,
        ownershipType: 'Leased',
        city: 'Nairobi',
        assignedDriverId: 'd-03',
        assignedDriverName: 'Kipchumba Bett',
        assignedDriverPhone: '+254733445566',
        currentLocation: {
          lat: -1.2921,
          lng: 36.7822,
          heading: 90,
          speedKmh: 18,
          lastUpdated: new Date().toISOString(),
          address: 'Kilimani, Argwings Kodhek Rd'
        },
        status: 'Charging',
        insurancePolicyNumber: 'BRITAM-EV-11029',
        insuranceExpiry: '2027-01-10',
        ntsaInspectionExpiry: '2026-10-15',
        totalTripsCount: 890,
        totalRevenueGeneratedKes: 245000,
        totalFuelSpentKes: 0,
        totalChargingSpentKes: 24000,
        totalMaintenanceSpentKes: 9800,
        netProfitKes: 211200
      },
      {
        id: 'v-04',
        registrationNumber: 'KDF 901E',
        make: 'BYD',
        model: 'Atto 3 Electric SUV',
        year: 2025,
        type: 'Electric Car',
        category: 'Electric',
        color: 'Pearl White',
        vin: 'BYD2025EV009821',
        batteryId: 'BAT-BYD-60KWH',
        batteryCapacityKwh: 60.4,
        currentSoCPercent: 72,
        batteryHealthPercent: 98,
        odometerKm: 18400,
        purchaseDate: '2025-01-05',
        purchasePriceKes: 4200000,
        currentEstimatedValueKes: 3900000,
        ownershipType: 'Financed',
        city: 'Nairobi',
        assignedDriverId: 'd-04',
        assignedDriverName: 'Mercy Njeri',
        assignedDriverPhone: '+254701234567',
        currentLocation: {
          lat: -1.3197,
          lng: 36.9275,
          heading: 30,
          speedKmh: 68,
          lastUpdated: new Date().toISOString(),
          address: 'JKIA Airport Expressway, Nairobi'
        },
        status: 'On Trip',
        insurancePolicyNumber: 'HERITAGE-AUT-55410',
        insuranceExpiry: '2027-01-05',
        ntsaInspectionExpiry: '2027-01-05',
        totalTripsCount: 620,
        totalRevenueGeneratedKes: 890000,
        totalFuelSpentKes: 0,
        totalChargingSpentKes: 72000,
        totalMaintenanceSpentKes: 18000,
        netProfitKes: 800000
      },
      {
        id: 'v-05',
        registrationNumber: 'KCT 302Y',
        make: 'Toyota',
        model: 'Fielder 1.5L Petrol',
        year: 2022,
        type: 'Petrol Car',
        category: 'Fuel',
        color: 'Silver Metallic',
        vin: 'NZE141-8092102',
        engineNumber: '1NZ-FE-77401',
        currentFuelLiters: 14.2,
        fuelCapacityLiters: 42,
        odometerKm: 78200,
        purchaseDate: '2023-06-12',
        purchasePriceKes: 1450000,
        currentEstimatedValueKes: 1150000,
        ownershipType: 'Purchased',
        city: 'Mombasa',
        assignedDriverId: 'd-05',
        assignedDriverName: 'Hassan Ali',
        assignedDriverPhone: '+254720112233',
        currentLocation: {
          lat: -4.0435,
          lng: 39.6682,
          heading: 180,
          speedKmh: 35,
          lastUpdated: new Date().toISOString(),
          address: 'Mombasa Nyali Bridge Crossing'
        },
        status: 'Online',
        insurancePolicyNumber: 'JUBILEE-PSV-90112',
        insuranceExpiry: '2026-08-25', // Alert soon
        ntsaInspectionExpiry: '2026-08-18', // Alert soon
        totalTripsCount: 2840,
        totalRevenueGeneratedKes: 1980000,
        totalFuelSpentKes: 680000,
        totalChargingSpentKes: 0,
        totalMaintenanceSpentKes: 112000,
        netProfitKes: 1188000
      },
      {
        id: 'v-06',
        registrationNumber: 'KDH 331E',
        make: 'Opibus / Roam',
        model: 'Electric Shuttle Van',
        year: 2025,
        type: 'Van',
        category: 'Electric',
        color: 'GreenShift Signature',
        vin: 'VAN2025EV99011',
        batteryId: 'BAT-VAN-80KWH',
        batteryCapacityKwh: 80,
        currentSoCPercent: 92,
        batteryHealthPercent: 99,
        odometerKm: 8200,
        purchaseDate: '2025-03-20',
        purchasePriceKes: 5500000,
        currentEstimatedValueKes: 5200000,
        ownershipType: 'Purchased',
        city: 'Nairobi',
        assignedDriverId: 'd-06',
        assignedDriverName: 'David Kiprono',
        assignedDriverPhone: '+254711889900',
        currentLocation: {
          lat: -1.2990,
          lng: 36.8155,
          heading: 0,
          speedKmh: 0,
          lastUpdated: new Date().toISOString(),
          address: 'GreenShift Central Depot, Upper Hill'
        },
        status: 'Available',
        insurancePolicyNumber: 'GA-INS-88102',
        insuranceExpiry: '2027-03-20',
        ntsaInspectionExpiry: '2027-03-20',
        totalTripsCount: 310,
        totalRevenueGeneratedKes: 640000,
        totalFuelSpentKes: 0,
        totalChargingSpentKes: 51000,
        totalMaintenanceSpentKes: 12000,
        netProfitKes: 577000
      },
      {
        id: 'v-07',
        registrationNumber: 'KCY 884P',
        make: 'Bajaj',
        model: 'Boxer BM 150 Boda',
        year: 2023,
        type: 'Fuel Motorcycle',
        category: 'Fuel',
        color: 'Cherry Red',
        vin: 'BJ2023BM1500293',
        engineNumber: 'ENG-BJ-90112',
        currentFuelLiters: 3.1,
        fuelCapacityLiters: 12,
        odometerKm: 44100,
        purchaseDate: '2023-11-01',
        purchasePriceKes: 175000,
        currentEstimatedValueKes: 125000,
        ownershipType: 'Purchased',
        city: 'Kisumu',
        assignedDriverId: 'd-07',
        assignedDriverName: 'Otieno Washington',
        assignedDriverPhone: '+254722334455',
        currentLocation: {
          lat: -0.0917,
          lng: 34.7680,
          heading: 270,
          speedKmh: 0,
          lastUpdated: new Date().toISOString(),
          address: 'Kisumu Bus Park, Oginga Odinga St'
        },
        status: 'Under Maintenance',
        insurancePolicyNumber: 'MADISON-MOT-33210',
        insuranceExpiry: '2026-11-01',
        ntsaInspectionExpiry: '2026-11-01',
        totalTripsCount: 2210,
        totalRevenueGeneratedKes: 520000,
        totalFuelSpentKes: 165000,
        totalChargingSpentKes: 0,
        totalMaintenanceSpentKes: 42000,
        netProfitKes: 313000
      }
    ];

    // 2. SEED DRIVERS
    this.drivers = [
      {
        id: 'd-01',
        fullName: 'Juma Omondi',
        phone: '+254712345678',
        nationalId: '32098412',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        drivingLicenseNumber: 'DL-KE-889012',
        licenseExpiry: '2028-05-12',
        psvBadgeNumber: 'PSV-2024-8890',
        psvExpiry: '2027-05-12',
        city: 'Nairobi',
        assignedVehicleId: 'v-01',
        assignedVehicleReg: 'KMG 482E',
        employmentType: 'Commission',
        dateJoined: '2024-06-01',
        status: 'On Trip',
        currentShift: 'Morning',
        rating: 4.92,
        totalTrips: 1240,
        completedTrips: 1220,
        cancelledTrips: 20,
        acceptanceRatePercent: 98,
        grossEarningsKes: 348000,
        companyCommissionKes: 52200, // 15%
        netEarningsKes: 295800,
        outstandingBalanceKes: 14500, // Payable to Juma
        loanBalanceKes: 0,
        safetyScorePercent: 97,
        mpesaPhoneNumber: '254712345678'
      },
      {
        id: 'd-02',
        fullName: 'Samuel Kamau',
        phone: '+254722987654',
        nationalId: '29881023',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
        drivingLicenseNumber: 'DL-KE-772109',
        licenseExpiry: '2027-09-20',
        psvBadgeNumber: 'PSV-2023-1102',
        psvExpiry: '2026-09-20',
        city: 'Nairobi',
        assignedVehicleId: 'v-02',
        assignedVehicleReg: 'KDC 719X',
        employmentType: 'Daily Target',
        dateJoined: '2024-02-15',
        status: 'Online',
        currentShift: 'Full Day',
        rating: 4.78,
        totalTrips: 1980,
        completedTrips: 1910,
        cancelledTrips: 70,
        acceptanceRatePercent: 94,
        grossEarningsKes: 485000,
        companyCommissionKes: 72750,
        netEarningsKes: 412250,
        outstandingBalanceKes: -2500, // Owed to company for fuel advance
        loanBalanceKes: 12000,
        safetyScorePercent: 92,
        mpesaPhoneNumber: '254722987654'
      },
      {
        id: 'd-03',
        fullName: 'Kipchumba Bett',
        phone: '+254733445566',
        nationalId: '34102931',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
        drivingLicenseNumber: 'DL-KE-990182',
        licenseExpiry: '2028-01-15',
        city: 'Nairobi',
        assignedVehicleId: 'v-03',
        assignedVehicleReg: 'KDG 104E',
        employmentType: 'Commission',
        dateJoined: '2025-02-01',
        status: 'Active',
        currentShift: 'Morning',
        rating: 4.88,
        totalTrips: 890,
        completedTrips: 875,
        cancelledTrips: 15,
        acceptanceRatePercent: 96,
        grossEarningsKes: 245000,
        companyCommissionKes: 36750,
        netEarningsKes: 208250,
        outstandingBalanceKes: 18200,
        loanBalanceKes: 0,
        safetyScorePercent: 99,
        mpesaPhoneNumber: '254733445566'
      },
      {
        id: 'd-04',
        fullName: 'Mercy Njeri',
        phone: '+254701234567',
        nationalId: '31092811',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
        drivingLicenseNumber: 'DL-KE-554102',
        licenseExpiry: '2028-11-10',
        psvBadgeNumber: 'PSV-2025-0012',
        psvExpiry: '2028-11-10',
        city: 'Nairobi',
        assignedVehicleId: 'v-04',
        assignedVehicleReg: 'KDF 901E',
        employmentType: 'Salary + Commission',
        dateJoined: '2025-01-05',
        status: 'On Trip',
        currentShift: 'Morning',
        rating: 4.96,
        totalTrips: 620,
        completedTrips: 615,
        cancelledTrips: 5,
        acceptanceRatePercent: 99,
        grossEarningsKes: 890000,
        companyCommissionKes: 133500,
        netEarningsKes: 756500,
        outstandingBalanceKes: 38000,
        loanBalanceKes: 0,
        safetyScorePercent: 98,
        mpesaPhoneNumber: '254701234567'
      },
      {
        id: 'd-05',
        fullName: 'Hassan Ali',
        phone: '+254720112233',
        nationalId: '27610922',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
        drivingLicenseNumber: 'DL-KE-331029',
        licenseExpiry: '2026-10-05',
        psvBadgeNumber: 'PSV-2023-8819',
        psvExpiry: '2026-10-05',
        city: 'Mombasa',
        assignedVehicleId: 'v-05',
        assignedVehicleReg: 'KCT 302Y',
        employmentType: 'Weekly Rental',
        dateJoined: '2023-06-12',
        status: 'Online',
        currentShift: 'Full Day',
        rating: 4.82,
        totalTrips: 2840,
        completedTrips: 2790,
        cancelledTrips: 50,
        acceptanceRatePercent: 95,
        grossEarningsKes: 1980000,
        companyCommissionKes: 297000,
        netEarningsKes: 1683000,
        outstandingBalanceKes: 22000,
        loanBalanceKes: 5000,
        safetyScorePercent: 94,
        mpesaPhoneNumber: '254720112233'
      }
    ];

    // 3. SEED RECENT TRIPS
    this.trips = [
      {
        id: 't-1001',
        tripCode: 'GS-TRIP-88401',
        driverId: 'd-01',
        driverName: 'Juma Omondi',
        driverPhone: '+254712345678',
        vehicleId: 'v-01',
        vehicleReg: 'KMG 482E',
        vehicleType: 'Electric Motorcycle',
        customerName: 'Amina Wanjiku',
        customerPhone: '+254790112233',
        pickupLocationName: 'Sarit Centre, Westlands',
        pickupLat: -1.2612,
        pickupLng: 36.8041,
        destinationLocationName: 'KICC, Nairobi CBD',
        destinationLat: -1.2882,
        destinationLng: 36.8227,
        distanceKm: 6.8,
        durationMinutes: 18,
        fareKes: 420,
        platformFeeKes: 63,
        companyRevenueKes: 63,
        driverEarningsKes: 357,
        paymentMethod: 'M-Pesa',
        paymentStatus: 'Paid',
        mpesaReceiptNumber: 'SFG882910K',
        tripStatus: 'In Progress',
        startTime: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      },
      {
        id: 't-1002',
        tripCode: 'GS-TRIP-88402',
        driverId: 'd-04',
        driverName: 'Mercy Njeri',
        driverPhone: '+254701234567',
        vehicleId: 'v-04',
        vehicleReg: 'KDF 901E',
        vehicleType: 'Electric Car',
        customerName: 'Dr. Brian Mutua',
        customerPhone: '+254711998877',
        pickupLocationName: 'Radisson Blu, Upper Hill',
        pickupLat: -1.2988,
        pickupLng: 36.8182,
        destinationLocationName: 'JKIA Terminal 1A',
        destinationLat: -1.3197,
        destinationLng: 36.9275,
        distanceKm: 16.4,
        durationMinutes: 32,
        fareKes: 1850,
        platformFeeKes: 277.5,
        companyRevenueKes: 277.5,
        driverEarningsKes: 1572.5,
        paymentMethod: 'M-Pesa',
        paymentStatus: 'Paid',
        mpesaReceiptNumber: 'SFG991024L',
        tripStatus: 'In Progress',
        startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString()
      },
      {
        id: 't-1003',
        tripCode: 'GS-TRIP-88399',
        driverId: 'd-02',
        driverName: 'Samuel Kamau',
        driverPhone: '+254722987654',
        vehicleId: 'v-02',
        vehicleReg: 'KDC 719X',
        vehicleType: 'Fuel Motorcycle',
        customerName: 'Kevin Otieno',
        customerPhone: '+254733123123',
        pickupLocationName: 'Yaya Centre, Kilimani',
        pickupLat: -1.2912,
        pickupLng: 36.7865,
        destinationLocationName: 'Gikomba Market',
        destinationLat: -1.2855,
        destinationLng: 36.8390,
        distanceKm: 8.2,
        durationMinutes: 24,
        fareKes: 380,
        platformFeeKes: 57,
        companyRevenueKes: 57,
        driverEarningsKes: 323,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        tripStatus: 'Completed',
        rating: 5,
        customerFeedback: 'Fast and safe riding!',
        startTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 66 * 60 * 1000).toISOString()
      }
    ];

    // 4. SEED EV BATTERY SESSIONS
    this.evSessions = [
      {
        id: 'evs-01',
        vehicleId: 'v-03',
        vehicleReg: 'KDG 104E',
        batteryId: 'BAT-SPR-204',
        stationName: 'Spiro Swap Hub Kilimani',
        locationAddress: 'Argwings Kodhek Road, Kilimani, Nairobi',
        startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        durationMinutes: 30,
        startSoCPercent: 12,
        endSoCPercent: 100,
        energyKwhConsumed: 2.5,
        costKes: 250, // Swap fee flat
        costPerKwhKes: 100,
        operatorName: 'Spiro Kenya Energy Ltd',
        paymentMethod: 'Corporate Account',
        healthImpactScore: 'Normal'
      },
      {
        id: 'evs-02',
        vehicleId: 'v-01',
        vehicleReg: 'KMG 482E',
        batteryId: 'BAT-RM-908',
        stationName: 'Roam Hub Westlands',
        locationAddress: 'Mwanzi Road, Westlands, Nairobi',
        startTime: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
        durationMinutes: 30,
        startSoCPercent: 18,
        endSoCPercent: 98,
        energyKwhConsumed: 2.9,
        costKes: 220,
        costPerKwhKes: 75.8,
        operatorName: 'Roam Motors Kenya',
        paymentMethod: 'Corporate Account',
        healthImpactScore: 'Normal'
      }
    ];

    // 5. SEED FUEL TRANSACTIONS
    this.fuelLogs = [
      {
        id: 'ft-01',
        vehicleId: 'v-02',
        vehicleReg: 'KDC 719X',
        driverId: 'd-02',
        driverName: 'Samuel Kamau',
        fuelType: 'Super Petrol',
        stationName: 'Shell Westlands',
        liters: 7.5,
        pricePerLiterKes: 198.5,
        totalCostKes: 1488.75,
        odometerReadingKm: 32150,
        calculatedKmPerLiter: 38.2,
        receiptNumber: 'SH-88291-NBI',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        isFlaggedAnomaly: false
      },
      {
        id: 'ft-02',
        vehicleId: 'v-05',
        vehicleReg: 'KCT 302Y',
        driverId: 'd-05',
        driverName: 'Hassan Ali',
        fuelType: 'Super Petrol',
        stationName: 'TotalEnergies Nyali',
        liters: 22.0,
        pricePerLiterKes: 196.0,
        totalCostKes: 4312.0,
        odometerReadingKm: 78200,
        calculatedKmPerLiter: 14.1,
        receiptNumber: 'TOT-MBS-00918',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        isFlaggedAnomaly: false
      }
    ];

    // 6. SEED WORK ORDERS
    this.workOrders = [
      {
        id: 'wo-01',
        workOrderCode: 'WO-2026-081',
        vehicleId: 'v-07',
        vehicleReg: 'KCY 884P',
        vehicleModel: 'Bajaj Boxer BM 150',
        serviceType: 'Routine Service',
        priority: 'Medium',
        status: 'In Progress',
        odometerKmAtService: 44100,
        partsUsed: [
          { partName: 'Engine Oil 15W-40 1L', quantity: 1, unitCostKes: 1200 },
          { partName: 'Oil Filter Boxer BM150', quantity: 1, unitCostKes: 450 },
          { partName: 'Spark Plug NGK', quantity: 1, unitCostKes: 350 }
        ],
        laborCostKes: 1500,
        totalCostKes: 3500,
        workshopName: 'Kisumu Central Mobility Workshop',
        mechanicName: 'Peter Ochieng',
        downtimeHours: 4,
        startDate: new Date().toISOString(),
        notes: '30,000km scheduled service and chain tension adjustment.'
      }
    ];

    // 7. SEED INVENTORY
    this.inventory = [
      {
        id: 'sp-01',
        partName: 'Roam Air EV Heavy Duty Brake Pads',
        partNumber: 'RM-BP-401',
        compatibleVehicleTypes: ['Electric Motorcycle'],
        quantityInStock: 24,
        minimumStockLevel: 10,
        unitCostKes: 1800,
        supplierName: 'Roam Motors Kenya',
        locationBin: 'BIN-A1'
      },
      {
        id: 'sp-02',
        partName: 'TVS HLX 150 Clutch Cable',
        partNumber: 'TVS-CC-992',
        compatibleVehicleTypes: ['Fuel Motorcycle'],
        quantityInStock: 5, // LOW STOCK ALERT
        minimumStockLevel: 12,
        unitCostKes: 650,
        supplierName: 'Car & General Kenya',
        locationBin: 'BIN-B4'
      },
      {
        id: 'sp-03',
        partName: 'Spiro Smart Battery Swap Connector Pins',
        partNumber: 'SPR-PIN-02',
        compatibleVehicleTypes: ['Electric Motorcycle'],
        quantityInStock: 18,
        minimumStockLevel: 8,
        unitCostKes: 2400,
        supplierName: 'Spiro EV Parts Ltd',
        locationBin: 'BIN-C2'
      }
    ];

    // 8. SEED DOCUMENTS
    this.documents = [
      {
        id: 'doc-01',
        entityType: 'Vehicle',
        entityId: 'v-05',
        entityName: 'KCT 302Y (Toyota Fielder)',
        documentType: 'Comprehensive Insurance',
        documentNumber: 'POL-JUB-88910',
        issueDate: '2025-08-25',
        expiryDate: '2026-08-25', // Expiring in 17 days
        verificationStatus: 'Verified',
        daysUntilExpiry: 17
      },
      {
        id: 'doc-02',
        entityType: 'Vehicle',
        entityId: 'v-05',
        entityName: 'KCT 302Y (Toyota Fielder)',
        documentType: 'NTSA Inspection',
        documentNumber: 'NTSA-INS-2025-99',
        issueDate: '2025-08-18',
        expiryDate: '2026-08-18', // Expiring in 10 days
        verificationStatus: 'Verified',
        daysUntilExpiry: 10
      },
      {
        id: 'doc-03',
        entityType: 'Driver',
        entityId: 'd-05',
        entityName: 'Hassan Ali',
        documentType: 'PSV Badge',
        documentNumber: 'PSV-2023-8819',
        issueDate: '2023-10-05',
        expiryDate: '2026-10-05',
        verificationStatus: 'Verified',
        daysUntilExpiry: 58
      }
    ];

    // 9. SEED INCIDENTS
    this.incidents = [
      {
        id: 'inc-01',
        incidentCode: 'INC-2026-042',
        vehicleId: 'v-02',
        vehicleReg: 'KDC 719X',
        driverId: 'd-02',
        driverName: 'Samuel Kamau',
        driverPhone: '+254722987654',
        incidentType: 'Geofence Violation',
        severity: 'Minor',
        locationName: 'Thika Superhighway Exit 8',
        lat: -1.2180,
        lng: 36.8890,
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        description: 'Vehicle briefly operated 3km outside agreed Nairobi Metropolitan geofence bound.',
        status: 'Resolved',
        assignedOfficer: 'Fleet Ops Controller - Eric Kimani'
      }
    ];

    // 10. SEED MPESA PAYOUTS
    this.mpesaPayouts = [
      {
        id: 'mp-01',
        transactionRef: 'GS-PAY-90182',
        driverId: 'd-01',
        driverName: 'Juma Omondi',
        phoneNumber: '+254712345678',
        amountKes: 18500,
        payoutReason: 'Weekly Earnings Payout',
        status: 'Success',
        mpesaReceiptNo: 'SFG771920M',
        timestamp: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
        initiatedByRole: 'Finance Manager'
      }
    ];

    // 11. SEED AUDIT LOGS
    this.auditLogs = [
      {
        id: 'aud-01',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        userName: 'Wanjiru Njuguna',
        userRole: 'Super Admin',
        action: 'Assigned Driver to Vehicle',
        targetEntity: 'Vehicle KMG 482E -> Driver Juma Omondi',
        ipAddress: '197.248.12.98'
      },
      {
        id: 'aud-02',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        userName: 'Daniel Mwangi',
        userRole: 'Finance Manager',
        action: 'M-Pesa Payout Approved',
        targetEntity: 'Driver Juma Omondi (KES 18,500)',
        ipAddress: '41.212.89.14'
      }
    ];
  }

  private startSimulationInterval() {
    // Periodically update active vehicles' coordinates slightly to give a real-time live map experience
    setInterval(() => {
      this.vehicles.forEach(v => {
        if (v.status === 'On Trip' || v.status === 'Online') {
          // Add small GPS drift
          const latDelta = (Math.random() - 0.5) * 0.002;
          const lngDelta = (Math.random() - 0.5) * 0.002;
          v.currentLocation.lat += latDelta;
          v.currentLocation.lng += lngDelta;
          v.currentLocation.heading = Math.floor(Math.random() * 360);
          v.currentLocation.lastUpdated = new Date().toISOString();

          // Discharge EV batteries slightly if on trip
          if (v.category === 'Electric' && v.currentSoCPercent && v.currentSoCPercent > 5) {
            v.currentSoCPercent = Math.max(1, v.currentSoCPercent - 0.1);
          }
        }
      });
    }, 10000);
  }

  // --- PUBLIC API METHODS ---

  public getSummaryStats(): FleetSummaryStats {
    const totalVehicles = this.vehicles.length;
    const electricVehiclesCount = this.vehicles.filter(v => v.category === 'Electric').length;
    const fuelVehiclesCount = this.vehicles.filter(v => v.category === 'Fuel').length;
    const activeVehiclesCount = this.vehicles.filter(v => v.status !== 'Decommissioned' && v.status !== 'Inactive').length;
    const onlineCount = this.vehicles.filter(v => v.status === 'Online').length;
    const onTripCount = this.vehicles.filter(v => v.status === 'On Trip').length;
    const idleCount = this.vehicles.filter(v => v.status === 'Idle' || v.status === 'Available').length;
    const chargingCount = this.vehicles.filter(v => v.status === 'Charging').length;
    const maintenanceCount = this.vehicles.filter(v => v.status === 'Under Maintenance').length;
    const offlineCount = this.vehicles.filter(v => v.status === 'Inactive' || v.status === 'Suspended').length;

    const totalDriversCount = this.drivers.length;
    const activeDriversCount = this.drivers.filter(d => d.status === 'Active' || d.status === 'Online' || d.status === 'On Trip').length;
    const onlineDriversCount = this.drivers.filter(d => d.status === 'Online' || d.status === 'On Trip').length;

    const todayGrossRevenueKes = this.trips.reduce((acc, t) => acc + t.fareKes, 0);
    const todayCompanyProfitKes = this.trips.reduce((acc, t) => acc + t.companyRevenueKes, 0);
    const todayDriverPayoutsKes = this.trips.reduce((acc, t) => acc + t.driverEarningsKes, 0);
    
    const todayFuelExpensesKes = this.fuelLogs.reduce((acc, f) => acc + f.totalCostKes, 0);
    const todayChargingExpensesKes = this.evSessions.reduce((acc, e) => acc + e.costKes, 0);
    const todayMaintenanceExpensesKes = this.workOrders.reduce((acc, w) => acc + w.totalCostKes, 0);

    // EV vs Fuel Profit margin calculation
    const evVehicles = this.vehicles.filter(v => v.category === 'Electric');
    const fuelVehicles = this.vehicles.filter(v => v.category === 'Fuel');

    const evRevenue = evVehicles.reduce((acc, v) => acc + v.totalRevenueGeneratedKes, 0);
    const evExpenses = evVehicles.reduce((acc, v) => acc + v.totalChargingSpentKes + v.totalMaintenanceSpentKes, 0);
    const evMarginPercent = evRevenue > 0 ? Math.round(((evRevenue - evExpenses) / evRevenue) * 100) : 85;

    const fuelRevenue = fuelVehicles.reduce((acc, v) => acc + v.totalRevenueGeneratedKes, 0);
    const fuelExpenses = fuelVehicles.reduce((acc, v) => acc + v.totalFuelSpentKes + v.totalMaintenanceSpentKes, 0);
    const fuelMarginPercent = fuelRevenue > 0 ? Math.round(((fuelRevenue - fuelExpenses) / fuelRevenue) * 100) : 58;

    const evBatteries = this.vehicles.filter(v => v.batteryHealthPercent).map(v => v.batteryHealthPercent || 100);
    const avgBatteryHealth = evBatteries.length > 0 ? Math.round(evBatteries.reduce((a, b) => a + b, 0) / evBatteries.length) : 95;

    return {
      totalVehicles,
      electricVehiclesCount,
      fuelVehiclesCount,
      activeVehiclesCount,
      onlineCount,
      onTripCount,
      idleCount,
      chargingCount,
      maintenanceCount,
      offlineCount,
      totalDriversCount,
      activeDriversCount,
      onlineDriversCount,
      todayGrossRevenueKes,
      todayCompanyProfitKes,
      todayDriverPayoutsKes,
      todayFuelExpensesKes,
      todayChargingExpensesKes,
      todayMaintenanceExpensesKes,
      evVsFuelProfitMarginPercent: {
        evMarginPercent,
        fuelMarginPercent
      },
      averageBatteryHealthPercent: avgBatteryHealth,
      expiringDocsAlertCount: this.documents.filter(d => d.daysUntilExpiry <= 30).length,
      openIncidentsCount: this.incidents.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length
    };
  }

  // Vehicles
  public getAllVehicles(): Vehicle[] { return this.vehicles; }
  public getVehicleById(id: string): Vehicle | undefined { return this.vehicles.find(v => v.id === id); }
  public updateVehicleStatus(id: string, status: VehicleStatus, adminUser: string): Vehicle | undefined {
    const v = this.getVehicleById(id);
    if (v) {
      const prevStatus = v.status;
      v.status = status;
      this.logAudit(adminUser, 'Fleet Manager', `Changed vehicle status to ${status}`, `Vehicle ${v.registrationNumber}`, prevStatus, status);
    }
    return v;
  }
  public assignDriverToVehicle(vehicleId: string, driverId: string, adminUser: string) {
    const vehicle = this.getVehicleById(vehicleId);
    const driver = this.drivers.find(d => d.id === driverId);
    if (vehicle && driver) {
      vehicle.assignedDriverId = driver.id;
      vehicle.assignedDriverName = driver.fullName;
      vehicle.assignedDriverPhone = driver.phone;
      
      driver.assignedVehicleId = vehicle.id;
      driver.assignedVehicleReg = vehicle.registrationNumber;

      this.logAudit(adminUser, 'Fleet Manager', 'Assigned Driver to Vehicle', `${vehicle.registrationNumber} -> ${driver.fullName}`);
      return { vehicle, driver };
    }
    return null;
  }

  public createVehicle(newVeh: Omit<Vehicle, 'id' | 'totalTripsCount' | 'totalRevenueGeneratedKes' | 'totalFuelSpentKes' | 'totalChargingSpentKes' | 'totalMaintenanceSpentKes' | 'netProfitKes'>, adminUser: string): Vehicle {
    const id = `v-${String(this.vehicles.length + 1).padStart(2, '0')}`;
    const vehicle: Vehicle = {
      ...newVeh,
      id,
      totalTripsCount: 0,
      totalRevenueGeneratedKes: 0,
      totalFuelSpentKes: 0,
      totalChargingSpentKes: 0,
      totalMaintenanceSpentKes: 0,
      netProfitKes: 0
    };
    this.vehicles.push(vehicle);
    this.logAudit(adminUser, 'Fleet Manager', 'Created New Vehicle', `Vehicle ${vehicle.registrationNumber}`);
    return vehicle;
  }

  // Drivers
  public getAllDrivers(): Driver[] { return this.drivers; }
  public getDriverById(id: string): Driver | undefined { return this.drivers.find(d => d.id === id); }
  public updateDriverStatus(id: string, status: DriverStatus, adminUser: string): Driver | undefined {
    const d = this.getDriverById(id);
    if (d) {
      const prev = d.status;
      d.status = status;
      this.logAudit(adminUser, 'HR / Admin', `Changed driver status to ${status}`, `Driver ${d.fullName}`, prev, status);
    }
    return d;
  }

  // Trips & GPS
  public getAllTrips(): Trip[] { return this.trips; }
  public getGpsLocations() {
    return this.vehicles.map(v => ({
      id: v.id,
      reg: v.registrationNumber,
      type: v.type,
      category: v.category,
      driverName: v.assignedDriverName || 'Unassigned',
      status: v.status,
      lat: v.currentLocation.lat,
      lng: v.currentLocation.lng,
      speedKmh: v.currentLocation.speedKmh,
      heading: v.currentLocation.heading,
      soc: v.currentSoCPercent,
      fuelLiters: v.currentFuelLiters,
      address: v.currentLocation.address,
      lastUpdated: v.currentLocation.lastUpdated
    }));
  }

  // EV Sessions
  public getEvSessions(): EvBatterySession[] { return this.evSessions; }
  public recordEvSession(session: Omit<EvBatterySession, 'id'>, adminUser: string): EvBatterySession {
    const id = `evs-${String(this.evSessions.length + 1).padStart(2, '0')}`;
    const newSession = { ...session, id };
    this.evSessions.unshift(newSession);

    // Update vehicle battery info
    const vehicle = this.getVehicleById(session.vehicleId);
    if (vehicle) {
      vehicle.currentSoCPercent = session.endSoCPercent;
      vehicle.totalChargingSpentKes += session.costKes;
    }
    this.logAudit(adminUser, 'Fleet Manager', 'Recorded Battery Charging Session', `Vehicle ${session.vehicleReg}`);
    return newSession;
  }

  // Fuel Logs
  public getFuelLogs(): FuelTransaction[] { return this.fuelLogs; }
  public recordFuelLog(log: Omit<FuelTransaction, 'id' | 'isFlaggedAnomaly'>, adminUser: string): FuelTransaction {
    const id = `ft-${String(this.fuelLogs.length + 1).padStart(2, '0')}`;
    
    // Anomaly detection: if km/L is abnormally low (<5km/L or >50km/L)
    const isFlaggedAnomaly = (log.calculatedKmPerLiter && (log.calculatedKmPerLiter < 5 || log.calculatedKmPerLiter > 50)) || log.liters > 60;
    const anomalyReason = isFlaggedAnomaly ? 'Fuel quantity/mileage consumption rate anomaly detected' : undefined;

    const newLog: FuelTransaction = { ...log, id, isFlaggedAnomaly: Boolean(isFlaggedAnomaly), anomalyReason };
    this.fuelLogs.unshift(newLog);

    const vehicle = this.getVehicleById(log.vehicleId);
    if (vehicle) {
      vehicle.currentFuelLiters = log.liters;
      vehicle.totalFuelSpentKes += log.totalCostKes;
    }
    this.logAudit(adminUser, 'Operations Manager', 'Recorded Fuel Purchase', `Vehicle ${log.vehicleReg}`);
    return newLog;
  }

  // Maintenance & Work Orders
  public getWorkOrders(): MaintenanceWorkOrder[] { return this.workOrders; }
  public createWorkOrder(wo: Omit<MaintenanceWorkOrder, 'id' | 'workOrderCode'>, adminUser: string): MaintenanceWorkOrder {
    const id = `wo-${String(this.workOrders.length + 1).padStart(2, '0')}`;
    const workOrderCode = `WO-2026-${String(this.workOrders.length + 101)}`;
    const newWo: MaintenanceWorkOrder = { ...wo, id, workOrderCode };
    this.workOrders.unshift(newWo);

    const vehicle = this.getVehicleById(wo.vehicleId);
    if (vehicle) {
      vehicle.status = 'Under Maintenance';
      vehicle.totalMaintenanceSpentKes += wo.totalCostKes;
    }
    this.logAudit(adminUser, 'Maintenance Manager', 'Created Maintenance Work Order', `${workOrderCode} for ${wo.vehicleReg}`);
    return newWo;
  }

  public getInventory(): SparePartItem[] { return this.inventory; }

  // Documents
  public getDocuments(): VehicleDocument[] { return this.documents; }

  // Incidents
  public getIncidents(): IncidentReport[] { return this.incidents; }
  public reportIncident(inc: Omit<IncidentReport, 'id' | 'incidentCode'>, adminUser: string): IncidentReport {
    const id = `inc-${String(this.incidents.length + 1).padStart(2, '0')}`;
    const incidentCode = `INC-2026-${String(this.incidents.length + 101)}`;
    const newInc: IncidentReport = { ...inc, id, incidentCode };
    this.incidents.unshift(newInc);

    if (inc.incidentType === 'Accident' || inc.incidentType === 'Breakdown') {
      const v = this.getVehicleById(inc.vehicleId);
      if (v) v.status = inc.incidentType === 'Accident' ? 'Accident' : 'Under Maintenance';
    }

    this.logAudit(adminUser, 'Operations Manager', `Reported Incident: ${inc.incidentType}`, `${incidentCode} - ${inc.vehicleReg}`);
    return newInc;
  }

  // Financials & M-Pesa
  public getMpesaPayouts(): MpesaPayoutRequest[] { return this.mpesaPayouts; }
  public initiateMpesaPayout(payout: Omit<MpesaPayoutRequest, 'id' | 'transactionRef' | 'status' | 'timestamp'>, adminUser: string): MpesaPayoutRequest {
    const id = `mp-${String(this.mpesaPayouts.length + 1).padStart(2, '0')}`;
    const transactionRef = `GS-PAY-${Math.floor(10000 + Math.random() * 90000)}`;
    const mpesaReceiptNo = `SFG${Math.floor(100000000 + Math.random() * 900000000)}K`;

    const newPayout: MpesaPayoutRequest = {
      ...payout,
      id,
      transactionRef,
      status: 'Success',
      mpesaReceiptNo,
      timestamp: new Date().toISOString()
    };

    this.mpesaPayouts.unshift(newPayout);

    // Deduct from driver outstanding balance
    const driver = this.getDriverById(payout.driverId);
    if (driver) {
      driver.outstandingBalanceKes = Math.max(0, driver.outstandingBalanceKes - payout.amountKes);
    }

    this.logAudit(adminUser, 'Finance Manager', 'Initiated M-Pesa B2C Driver Payout', `${payout.driverName} (KES ${payout.amountKes.toLocaleString()})`);
    return newPayout;
  }

  // Audit Logging
  public getAuditLogs(): AuditLogEntry[] { return this.auditLogs; }
  private logAudit(userName: string, userRole: any, action: string, targetEntity: string, beforeState?: string, afterState?: string) {
    const entry: AuditLogEntry = {
      id: `aud-${String(this.auditLogs.length + 1).padStart(2, '0')}`,
      timestamp: new Date().toISOString(),
      userName: userName || 'Fleet System',
      userRole: userRole || 'Super Admin',
      action,
      targetEntity,
      beforeState,
      afterState,
      ipAddress: '197.248.12.1'
    };
    this.auditLogs.unshift(entry);
  }
}

export const db = new FleetDatabase();
