import { Vehicle } from '../types';

export interface ComponentWearPrediction {
  componentId: string;
  componentName: string;
  category: string;
  intervalKm: number;
  remainingKm: number;
  dailyRateKm: number;
  projectedDaysRemaining: number;
  estimatedCostKes: number;
  isPredictiveWarning: boolean; // true if remainingKm <= 500
}

export interface VehicleComponentPrediction {
  vehicleId: string;
  registrationNumber: string;
  makeModel: string;
  assignedDriver?: string;
  dailyRateKm: number;
  odometerKm: number;
  components: ComponentWearPrediction[];
  warningComponents: ComponentWearPrediction[];
  hasPredictiveWarning: boolean;
}

export const calculateVehicleComponentPredictions = (vehicle: Vehicle): VehicleComponentPrediction => {
  const isEv = vehicle.category === 'Electric';
  
  // Hash seed from vehicle registration number or VIN to give unique, stable values
  let charSeed = 7;
  const regStr = vehicle.registrationNumber || vehicle.id || 'KMG100A';
  for (let i = 0; i < regStr.length; i++) {
    charSeed += regStr.charCodeAt(i);
  }

  // Daily rate: ~85-130 km/day
  const dailyRateKm = Math.round((isEv ? 95 : 115) + (charSeed % 25) - 10);

  const configs = [
    {
      id: 'brake_pads',
      name: 'Brake Pads (Front & Rear)',
      category: 'Braking System',
      intervalKm: isEv ? 10000 : 8000,
      costKes: 3800,
      prime: 7
    },
    {
      id: 'tires',
      name: 'Tires (Front & Rear Tread)',
      category: 'Tires & Wheels',
      intervalKm: isEv ? 18000 : 20000,
      costKes: 8500,
      prime: 13
    },
    {
      id: 'drive_belt',
      name: 'Drive Belt / Chain & Sprocket',
      category: 'Drivetrain',
      intervalKm: 12000,
      costKes: 4800,
      prime: 19
    },
    {
      id: 'coolant_spark',
      name: isEv ? 'EV Battery Coolant & Thermal Loop' : 'Spark Plugs & Fuel Filters',
      category: isEv ? 'Battery Thermal' : 'Engine System',
      intervalKm: 10000,
      costKes: 5500,
      prime: 23
    },
    {
      id: 'suspension',
      name: 'Suspension Bushings & Shock Absorbers',
      category: 'Suspension',
      intervalKm: 22000,
      costKes: 13000,
      prime: 31
    }
  ];

  const components: ComponentWearPrediction[] = configs.map(c => {
    // Generate deterministic remaining km for this vehicle and component
    const pseudoVal = (vehicle.odometerKm * c.prime + charSeed * 137) % c.intervalKm;
    let remainingKm = c.intervalKm - pseudoVal;

    // Ensure roughly 30-40% of vehicles trigger predictive component warnings (<500km)
    if ((charSeed + c.prime) % 3 === 0) {
      remainingKm = 90 + ((vehicle.odometerKm + c.prime * 41) % 390); // 90km to 480km (strictly <= 500km)
    }

    const isPredictiveWarning = remainingKm <= 500;
    const projectedDaysRemaining = Math.max(1, Math.round(remainingKm / dailyRateKm));

    return {
      componentId: c.id,
      componentName: c.name,
      category: c.category,
      intervalKm: c.intervalKm,
      remainingKm,
      dailyRateKm,
      projectedDaysRemaining,
      estimatedCostKes: c.costKes,
      isPredictiveWarning
    };
  });

  const warningComponents = components.filter(c => c.isPredictiveWarning);

  return {
    vehicleId: vehicle.id,
    registrationNumber: vehicle.registrationNumber,
    makeModel: `${vehicle.make} ${vehicle.model}`,
    assignedDriver: vehicle.assignedDriverName || 'Unassigned',
    dailyRateKm,
    odometerKm: vehicle.odometerKm,
    components,
    warningComponents,
    hasPredictiveWarning: warningComponents.length > 0
  };
};
