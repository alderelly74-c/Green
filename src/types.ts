/**
 * GreenShift Fleet Command - Global Data Types
 */

export type VehicleType = 
  | 'Electric Motorcycle'
  | 'Fuel Motorcycle'
  | 'Electric Bicycle'
  | 'Electric Scooter'
  | 'Electric Car'
  | 'Petrol Car'
  | 'Diesel Car'
  | 'SUV'
  | 'Van'
  | 'Commercial Truck';

export type VehicleCategory = 'Electric' | 'Fuel';

export type VehicleStatus = 
  | 'Available'
  | 'Online'
  | 'On Trip'
  | 'Idle'
  | 'Charging'
  | 'Refueling'
  | 'Under Maintenance'
  | 'Accident'
  | 'Inactive'
  | 'Suspended'
  | 'Lost/Stolen'
  | 'Decommissioned';

export type DriverStatus = 
  | 'Active'
  | 'Online'
  | 'Offline'
  | 'On Trip'
  | 'Suspended'
  | 'On Leave'
  | 'Under Review'
  | 'Inactive'
  | 'Terminated';

export type ShiftType = 'Morning' | 'Evening' | 'Night' | 'Full Day' | 'Custom';

export type CityRegion = 'Nairobi' | 'Mombasa' | 'Kisumu' | 'Nakuru' | 'Kiambu';

export type UserRole = 
  | 'Super Admin'
  | 'Fleet Manager'
  | 'Finance Manager'
  | 'Operations Manager'
  | 'Maintenance Manager'
  | 'HR / Admin'
  | 'Accountant'
  | 'Support Agent'
  | 'Analyst';

export interface Vehicle {
  id: string;
  registrationNumber: string; // e.g. KMG 482E
  make: string; // e.g. Roam, Spiro, BYD, TVS, Toyota
  model: string; // e.g. Air, Equator, Atto 3, HLX 150, Fielder
  year: number;
  type: VehicleType;
  category: VehicleCategory;
  color: string;
  vin: string;
  engineNumber?: string;
  batteryId?: string;
  batteryCapacityKwh?: number;
  currentSoCPercent?: number; // 0 - 100%
  batteryHealthPercent?: number; // 0 - 100%
  currentFuelLiters?: number;
  fuelCapacityLiters?: number;
  odometerKm: number;
  purchaseDate: string;
  purchasePriceKes: number;
  currentEstimatedValueKes: number;
  ownershipType: 'Purchased' | 'Financed' | 'Leased' | 'Rental';
  city: CityRegion;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  currentLocation: {
    lat: number;
    lng: number;
    heading: number;
    speedKmh: number;
    lastUpdated: string;
    address: string;
  };
  breadcrumbs?: Array<{
    id: string;
    lat: number;
    lng: number;
    timestamp: string;
    speedKmh: number;
    address?: string;
  }>;
  status: VehicleStatus;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  ntsaInspectionExpiry: string;
  nextServiceOdometerKm?: number;
  totalTripsCount: number;
  totalRevenueGeneratedKes: number;
  totalFuelSpentKes: number;
  totalChargingSpentKes: number;
  totalMaintenanceSpentKes: number;
  netProfitKes: number;
}

export interface Driver {
  id: string;
  fullName: string;
  phone: string; // +254...
  nationalId: string;
  profilePhotoUrl: string;
  drivingLicenseNumber: string;
  licenseExpiry: string;
  psvBadgeNumber?: string;
  psvExpiry?: string;
  city: CityRegion;
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  employmentType: 'Commission' | 'Daily Target' | 'Weekly Rental' | 'Salary + Commission' | 'Hybrid';
  dateJoined: string;
  status: DriverStatus;
  currentShift?: ShiftType;
  rating: number; // e.g. 4.85
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  acceptanceRatePercent: number;
  grossEarningsKes: number;
  companyCommissionKes: number;
  netEarningsKes: number;
  outstandingBalanceKes: number; // positive = company owes driver, negative = driver owes company
  loanBalanceKes: number;
  safetyScorePercent: number;
  mpesaPhoneNumber: string;
}

export interface DriverCheckInRecord {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleReg?: string;
  checkInTime: string;
  startLocation: string;
  shiftStatus: 'On Duty' | 'En Route to Shift' | 'On Break' | 'Off Duty';
  energyStartLevel?: string;
  odometerReadingKm?: number;
  helmetGearVerified: boolean;
  psvBadgeVerified: boolean;
  notes?: string;
}

export interface DriverShiftLog {
  id: string;
  driverId: string;
  date: string; // e.g. '2026-08-09' or '09 Aug 2026'
  dayOfWeek: string; // e.g. 'Sun', 'Mon'
  startTime: string; // e.g. '06:30 EAT'
  endTime: string; // e.g. '17:45 EAT' or 'In Progress'
  totalHours: number; // e.g. 11.25
  shiftType: ShiftType;
  vehicleReg?: string;
  tripsCompleted: number;
  revenueKes: number;
  status: 'Completed' | 'In Progress' | 'Off Duty' | 'Rest Day';
  startOdometerKm?: number;
  endOdometerKm?: number;
  overtimeHours?: number;
}

export interface Trip {
  id: string;
  tripCode: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleType: VehicleType;
  customerName: string;
  customerPhone: string;
  pickupLocationName: string;
  pickupLat: number;
  pickupLng: number;
  destinationLocationName: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  durationMinutes: number;
  fareKes: number;
  platformFeeKes: number;
  companyRevenueKes: number;
  driverEarningsKes: number;
  paymentMethod: 'M-Pesa' | 'Cash' | 'Card' | 'Corporate Voucher';
  paymentStatus: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  mpesaReceiptNumber?: string;
  tripStatus: 'Completed' | 'In Progress' | 'Cancelled' | 'Disputed';
  cancellationReason?: string;
  rating?: number;
  customerFeedback?: string;
  startTime: string;
  endTime?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface EvBatterySession {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  batteryId: string;
  stationName: string; // e.g. Roam Hub Kilimani, Spiro Station Westlands
  locationAddress: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  startSoCPercent: number;
  endSoCPercent: number;
  energyKwhConsumed: number;
  costKes: number;
  costPerKwhKes: number;
  operatorName: string;
  paymentMethod: 'M-Pesa' | 'Corporate Account' | 'Cash';
  healthImpactScore: 'Normal' | 'Fast Charge Stress' | 'High Temp Alert';
}

export interface BatterySwapRecord {
  id: string;
  swapCode: string;
  timestamp: string;
  vehicleId: string;
  vehicleReg: string;
  driverName: string;
  stationName: string;
  stationLocation: string;
  removedBatteryId: string;
  removedBatterySoC: number;
  removedBatterySoh: number;
  installedBatteryId: string;
  installedBatterySoC: number;
  installedBatterySoh: number;
  swapDurationMinutes: number;
  costKes: number;
  operatorName: string;
  notes?: string;
  isDelayed?: boolean;
  delayReason?: string;
  delayResolved?: boolean;
  delayResolutionNotes?: string;
}

export interface FuelTransaction {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  driverId: string;
  driverName: string;
  fuelType: 'Super Petrol' | 'Diesel';
  stationName: string; // e.g. Shell Westlands, Total Energies Kilimani
  liters: number;
  pricePerLiterKes: number;
  totalCostKes: number;
  odometerReadingKm: number;
  calculatedKmPerLiter?: number;
  receiptNumber: string;
  timestamp: string;
  isFlaggedAnomaly: boolean;
  anomalyReason?: string; // e.g., 'Unusual high consumption rate (>45km/L anomaly)', 'Purchase while vehicle reported offline'
}

export interface MaintenanceWorkOrder {
  id: string;
  workOrderCode: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleModel: string;
  serviceType: 'Routine Service' | 'Brake Pad Replacement' | 'Tire Replacement' | 'Battery Swap Check' | 'Motor & Controller Repair' | 'Oil Change' | 'Body & Frame Repair' | 'Electrical Fix';
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  odometerKmAtService: number;
  partsUsed: { partName: string; quantity: number; unitCostKes: number }[];
  laborCostKes: number;
  totalCostKes: number;
  workshopName: string;
  mechanicName: string;
  downtimeHours: number;
  startDate: string;
  completionDate?: string;
  notes: string;
}

export interface SparePartItem {
  id: string;
  partName: string;
  partNumber: string;
  compatibleVehicleTypes: VehicleType[];
  quantityInStock: number;
  minimumStockLevel: number;
  unitCostKes: number;
  supplierName: string;
  locationBin: string;
}

export interface PurchaseOrderSuggestion {
  id: string;
  poNumber: string;
  partId: string;
  partName: string;
  partNumber: string;
  supplierName: string;
  currentStock: number;
  minimumStock: number;
  suggestedQuantity: number;
  unitCostKes: number;
  totalEstimatedCostKes: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'Suggested' | 'Approved' | 'Sent to Supplier' | 'Fulfilled';
  triggeredAt: string;
  approvedAt?: string;
  notes?: string;
}

export interface VehicleDocument {
  id: string;
  entityType: 'Vehicle' | 'Driver';
  entityId: string;
  entityName: string; // Reg or Driver Name
  documentType: 'Logbook' | 'Comprehensive Insurance' | 'NTSA Inspection' | 'National ID' | 'Driving License' | 'PSV Badge' | 'Good Conduct Certificate';
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUrl?: string;
  verificationStatus: 'Verified' | 'Pending Verification' | 'Expired' | 'Rejected';
  daysUntilExpiry: number;

  // Automated 30-Day Expiry Notification Reminder Settings
  reminderEnabled?: boolean;
  reminderDaysBefore?: number; // default 30
  reminderChannel?: 'EMAIL' | 'SMS' | 'BOTH';
  recipientRole?: 'OWNER' | 'DRIVER' | 'BOTH';
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  driverName?: string;
  driverEmail?: string;
  driverPhone?: string;
  lastReminderSentAt?: string;
  reminderStatus?: 'SCHEDULED' | 'SENT' | 'FAILED' | 'MUTED';
}

export interface IncidentReport {
  id: string;
  incidentCode: string;
  vehicleId: string;
  vehicleReg: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  incidentType: 'Accident' | 'Breakdown' | 'Theft Alert' | 'Geofence Violation' | 'Emergency SOS' | 'Customer Dispute';
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Critical SOS';
  locationName: string;
  lat: number;
  lng: number;
  timestamp: string;
  description: string;
  policeObNumber?: string;
  estimatedDamageKes?: number;
  status: 'Open' | 'Under Investigation' | 'Resolved' | 'Closed';
  assignedOfficer: string;
}

export interface MpesaPayoutRequest {
  id: string;
  transactionRef: string;
  driverId: string;
  driverName: string;
  phoneNumber: string;
  amountKes: number;
  payoutReason: 'Weekly Earnings Payout' | 'Daily Target Surplus' | 'Expense Reimbursement' | 'Bonus Incentive';
  status: 'Initiated' | 'Processing' | 'Success' | 'Failed';
  mpesaReceiptNo?: string;
  timestamp: string;
  initiatedByRole: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. 'Driver Suspended', 'Vehicle Assigned', 'Payout Approved', 'Maintenance Completed'
  targetEntity: string; // e.g. 'Vehicle KMG 482E', 'Driver Juma Omondi'
  beforeState?: string;
  afterState?: string;
  ipAddress: string;
}

export interface QuickReplyPreset {
  id: string;
  category: 'Operational Dispatch' | 'EV & Battery Swap' | 'Safety & Speed' | 'Financial & Targets' | 'Route & Traffic' | 'Maintenance Recall';
  title: string;
  messageContent: string;
  defaultQuickReplies: string[];
  defaultPriority: 'Info' | 'Normal' | 'Urgent' | 'Critical Flash';
}

export interface DispatcherMessage {
  id: string;
  messageCode: string;
  senderRole: string;
  targetType: 'Individual' | 'Broadcast Group';
  recipientDriverId?: string;
  recipientDriverName?: string;
  recipientDriverPhone?: string;
  recipientVehicleReg?: string;
  recipientGroup?: string;
  category: 'Operational Dispatch' | 'EV & Battery Swap' | 'Safety & Speed' | 'Financial & Targets' | 'Route & Traffic' | 'Maintenance Recall';
  priority: 'Info' | 'Normal' | 'Urgent' | 'Critical Flash';
  subject: string;
  content: string;
  quickReplyOptions: string[];
  driverReply?: {
    choice: string;
    note?: string;
    timestamp: string;
  };
  deliveryStatus: 'Sent' | 'Delivered' | 'Read' | 'Replied' | 'Failed';
  timestamp: string;
  requiresAck: boolean;
}

export interface FleetSummaryStats {
  totalVehicles: number;
  electricVehiclesCount: number;
  fuelVehiclesCount: number;
  activeVehiclesCount: number;
  onlineCount: number;
  onTripCount: number;
  idleCount: number;
  chargingCount: number;
  maintenanceCount: number;
  offlineCount: number;
  
  totalDriversCount: number;
  activeDriversCount: number;
  onlineDriversCount: number;
  
  todayGrossRevenueKes: number;
  todayCompanyProfitKes: number;
  todayDriverPayoutsKes: number;
  todayFuelExpensesKes: number;
  todayChargingExpensesKes: number;
  todayMaintenanceExpensesKes: number;
  
  evVsFuelProfitMarginPercent: {
    evMarginPercent: number;
    fuelMarginPercent: number;
  };
  
  averageBatteryHealthPercent: number;
  expiringDocsAlertCount: number;
  openIncidentsCount: number;
  maintenanceDueCount?: number;
}

export type GeofenceType = 'Authorized Area' | 'Restricted Zone';

export interface GeofenceZone {
  id: string;
  name: string;
  type: GeofenceType;
  city: CityRegion;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  assignedVehicleIds: string[]; // ['all'] or array of vehicle IDs
  active: boolean;
  colorHex: string;
  description?: string;
  createdAt: string;
}

export interface GeofenceViolationAlert {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  driverName?: string;
  driverPhone?: string;
  geofenceId: string;
  geofenceName: string;
  geofenceType: GeofenceType;
  violationType: 'Exited Authorized Area' | 'Entered Restricted Zone';
  lat: number;
  lng: number;
  locationAddress: string;
  distanceOffsetMeters: number;
  timestamp: string;
  acknowledged: boolean;
}
