import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Vehicle } from '../types';
import { 
  Zap, Fuel, MapPin, AlertTriangle, TrendingUp, TrendingDown, 
  Info, Sparkles, Filter, Download, ExternalLink, RefreshCw, Layers
} from 'lucide-react';
import { toast } from 'sonner';

export interface EfficiencyCellData {
  city: string;
  categoryOrType: string;
  vehicleCategory: 'Electric' | 'Fuel';
  avgEfficiency: number; // km/kWh for EV, km/L for Fuel
  unit: 'km/kWh' | 'km/L';
  targetBenchmark: number; // target efficiency
  efficiencyPctOfTarget: number; // (avg / target) * 100
  costPerKmKes: number; // KES spent per km
  totalDistanceKm: number;
  totalEnergyOrFuelConsumed: number; // kWh or Liters
  vehicleCount: number;
  underperformingCount: number;
  underperformingVehiclesList: string[]; // reg numbers
  regionalFactorNotes: string;
  status: 'Optimal' | 'Moderate' | 'Underperforming';
}

interface CityEfficiencyD3HeatmapProps {
  vehicles?: Vehicle[];
  onSelectVehicle?: (registrationNumber: string) => void;
}

export const CityEfficiencyD3Heatmap: React.FC<CityEfficiencyD3HeatmapProps> = ({
  vehicles = [],
  onSelectVehicle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter States
  const [metricMode, setMetricMode] = useState<'efficiency' | 'costPerKm' | 'targetPct'>('efficiency');
  const [viewGroup, setViewGroup] = useState<'category' | 'detailedType'>('category');
  const [highlightUnderperformingOnly, setHighlightUnderperformingOnly] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<EfficiencyCellData | null>(null);

  // Cities & Categories
  const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu'];
  const categories = ['Electric', 'Fuel'];
  const detailedTypes = [
    'Electric Motorcycle',
    'Fuel Motorcycle',
    'Electric Car / Delivery Van',
    'Petrol / Diesel Vehicle'
  ];

  // Build structured dataset combining vehicle props + rich default regional benchmark metrics
  const heatmapData: EfficiencyCellData[] = useMemo(() => {
    // Standard baseline datasets for robust visualization
    const baseCellMap: Record<string, EfficiencyCellData> = {
      // Nairobi
      'Nairobi_Electric': {
        city: 'Nairobi',
        categoryOrType: 'Electric',
        vehicleCategory: 'Electric',
        avgEfficiency: 21.8,
        unit: 'km/kWh',
        targetBenchmark: 22.0,
        efficiencyPctOfTarget: 99.1,
        costPerKmKes: 2.8,
        totalDistanceKm: 142500,
        totalEnergyOrFuelConsumed: 6536,
        vehicleCount: 18,
        underperformingCount: 1,
        underperformingVehiclesList: ['KMG 482E'],
        regionalFactorNotes: 'Optimal urban charging network density & mild climate.',
        status: 'Optimal'
      },
      'Nairobi_Fuel': {
        city: 'Nairobi',
        categoryOrType: 'Fuel',
        vehicleCategory: 'Fuel',
        avgEfficiency: 31.4,
        unit: 'km/L',
        targetBenchmark: 35.0,
        efficiencyPctOfTarget: 89.7,
        costPerKmKes: 6.8,
        totalDistanceKm: 98400,
        totalEnergyOrFuelConsumed: 3133,
        vehicleCount: 12,
        underperformingCount: 3,
        underperformingVehiclesList: ['KDH 102B', 'KDA 882L'],
        regionalFactorNotes: 'Peak hours traffic congestion on Thika Road reduces km/L efficiency.',
        status: 'Moderate'
      },
      'Nairobi_Electric Motorcycle': {
        city: 'Nairobi',
        categoryOrType: 'Electric Motorcycle',
        vehicleCategory: 'Electric',
        avgEfficiency: 23.5,
        unit: 'km/kWh',
        targetBenchmark: 24.0,
        efficiencyPctOfTarget: 97.9,
        costPerKmKes: 2.5,
        totalDistanceKm: 112000,
        totalEnergyOrFuelConsumed: 4765,
        vehicleCount: 14,
        underperformingCount: 1,
        underperformingVehiclesList: ['KMG 482E'],
        regionalFactorNotes: 'Fast battery swap station availability at Westlands & Kilimani hubs.',
        status: 'Optimal'
      },
      'Nairobi_Fuel Motorcycle': {
        city: 'Nairobi',
        categoryOrType: 'Fuel Motorcycle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 36.2,
        unit: 'km/L',
        targetBenchmark: 38.0,
        efficiencyPctOfTarget: 95.2,
        costPerKmKes: 5.9,
        totalDistanceKm: 65000,
        totalEnergyOrFuelConsumed: 1795,
        vehicleCount: 8,
        underperformingCount: 1,
        underperformingVehiclesList: ['KDH 102B'],
        regionalFactorNotes: 'Standard delivery routes across CBD & Eastlands.',
        status: 'Optimal'
      },
      'Nairobi_Electric Car / Delivery Van': {
        city: 'Nairobi',
        categoryOrType: 'Electric Car / Delivery Van',
        vehicleCategory: 'Electric',
        avgEfficiency: 7.2,
        unit: 'km/kWh',
        targetBenchmark: 7.5,
        efficiencyPctOfTarget: 96.0,
        costPerKmKes: 4.8,
        totalDistanceKm: 30500,
        totalEnergyOrFuelConsumed: 4236,
        vehicleCount: 4,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Regenerative braking in stop-and-go city traffic recovers 14% energy.',
        status: 'Optimal'
      },
      'Nairobi_Petrol / Diesel Vehicle': {
        city: 'Nairobi',
        categoryOrType: 'Petrol / Diesel Vehicle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 13.8,
        unit: 'km/L',
        targetBenchmark: 15.0,
        efficiencyPctOfTarget: 92.0,
        costPerKmKes: 12.8,
        totalDistanceKm: 33400,
        totalEnergyOrFuelConsumed: 2420,
        vehicleCount: 4,
        underperformingCount: 1,
        underperformingVehiclesList: ['KCJ 554C'],
        regionalFactorNotes: 'Idling during peak hour rush on Momba Road increases fuel burn.',
        status: 'Moderate'
      },

      // Mombasa
      'Mombasa_Electric': {
        city: 'Mombasa',
        categoryOrType: 'Electric',
        vehicleCategory: 'Electric',
        avgEfficiency: 16.4,
        unit: 'km/kWh',
        targetBenchmark: 21.0,
        efficiencyPctOfTarget: 78.1,
        costPerKmKes: 3.6,
        totalDistanceKm: 62000,
        totalEnergyOrFuelConsumed: 3780,
        vehicleCount: 8,
        underperformingCount: 3,
        underperformingVehiclesList: ['KMC 319P'],
        regionalFactorNotes: 'High coastal humidity & AC/fan cooling load reduces battery efficiency.',
        status: 'Underperforming'
      },
      'Mombasa_Fuel': {
        city: 'Mombasa',
        categoryOrType: 'Fuel',
        vehicleCategory: 'Fuel',
        avgEfficiency: 24.8,
        unit: 'km/L',
        targetBenchmark: 34.0,
        efficiencyPctOfTarget: 72.9,
        costPerKmKes: 8.5,
        totalDistanceKm: 58000,
        totalEnergyOrFuelConsumed: 2338,
        vehicleCount: 7,
        underperformingCount: 4,
        underperformingVehiclesList: ['KCF 810M', 'KCB 904X'],
        regionalFactorNotes: 'Ferry delays, salty air filter clogging & heavy stop-and-go idling.',
        status: 'Underperforming'
      },
      'Mombasa_Electric Motorcycle': {
        city: 'Mombasa',
        categoryOrType: 'Electric Motorcycle',
        vehicleCategory: 'Electric',
        avgEfficiency: 17.5,
        unit: 'km/kWh',
        targetBenchmark: 23.0,
        efficiencyPctOfTarget: 76.1,
        costPerKmKes: 3.4,
        totalDistanceKm: 45000,
        totalEnergyOrFuelConsumed: 2571,
        vehicleCount: 6,
        underperformingCount: 2,
        underperformingVehiclesList: ['KMC 319P'],
        regionalFactorNotes: 'Likoni ferry waiting time thermal losses & sandy road tire drag.',
        status: 'Underperforming'
      },
      'Mombasa_Fuel Motorcycle': {
        city: 'Mombasa',
        categoryOrType: 'Fuel Motorcycle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 28.2,
        unit: 'km/L',
        targetBenchmark: 37.0,
        efficiencyPctOfTarget: 76.2,
        costPerKmKes: 7.5,
        totalDistanceKm: 38000,
        totalEnergyOrFuelConsumed: 1347,
        vehicleCount: 5,
        underperformingCount: 2,
        underperformingVehiclesList: ['KCF 810M'],
        regionalFactorNotes: 'High ambient temperature causes fuel evaporation loss in tanks.',
        status: 'Underperforming'
      },
      'Mombasa_Electric Car / Delivery Van': {
        city: 'Mombasa',
        categoryOrType: 'Electric Car / Delivery Van',
        vehicleCategory: 'Electric',
        avgEfficiency: 5.8,
        unit: 'km/kWh',
        targetBenchmark: 7.2,
        efficiencyPctOfTarget: 80.5,
        costPerKmKes: 5.9,
        totalDistanceKm: 17000,
        totalEnergyOrFuelConsumed: 2931,
        vehicleCount: 2,
        underperformingCount: 1,
        underperformingVehiclesList: ['KDF 201E'],
        regionalFactorNotes: 'Continuous high cabin AC usage consumes up to 22% total battery power.',
        status: 'Moderate'
      },
      'Mombasa_Petrol / Diesel Vehicle': {
        city: 'Mombasa',
        categoryOrType: 'Petrol / Diesel Vehicle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 11.2,
        unit: 'km/L',
        targetBenchmark: 14.5,
        efficiencyPctOfTarget: 77.2,
        costPerKmKes: 15.6,
        totalDistanceKm: 20000,
        totalEnergyOrFuelConsumed: 1785,
        vehicleCount: 2,
        underperformingCount: 2,
        underperformingVehiclesList: ['KCB 904X'],
        regionalFactorNotes: 'Severe port traffic delays and extreme idling fuel consumption.',
        status: 'Underperforming'
      },

      // Kisumu
      'Kisumu_Electric': {
        city: 'Kisumu',
        categoryOrType: 'Electric',
        vehicleCategory: 'Electric',
        avgEfficiency: 19.8,
        unit: 'km/kWh',
        targetBenchmark: 21.5,
        efficiencyPctOfTarget: 92.1,
        costPerKmKes: 3.1,
        totalDistanceKm: 48000,
        totalEnergyOrFuelConsumed: 2424,
        vehicleCount: 6,
        underperformingCount: 1,
        underperformingVehiclesList: ['KMD 501S'],
        regionalFactorNotes: 'Flat terrain around Lake Victoria basin ideal for smooth EV cruising.',
        status: 'Moderate'
      },
      'Kisumu_Fuel': {
        city: 'Kisumu',
        categoryOrType: 'Fuel',
        vehicleCategory: 'Fuel',
        avgEfficiency: 33.1,
        unit: 'km/L',
        targetBenchmark: 35.0,
        efficiencyPctOfTarget: 94.6,
        costPerKmKes: 6.4,
        totalDistanceKm: 41000,
        totalEnergyOrFuelConsumed: 1238,
        vehicleCount: 5,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Steady traffic speeds along Kondele & Kakamega highway corridor.',
        status: 'Optimal'
      },
      'Kisumu_Electric Motorcycle': {
        city: 'Kisumu',
        categoryOrType: 'Electric Motorcycle',
        vehicleCategory: 'Electric',
        avgEfficiency: 21.2,
        unit: 'km/kWh',
        targetBenchmark: 22.5,
        efficiencyPctOfTarget: 94.2,
        costPerKmKes: 2.9,
        totalDistanceKm: 38000,
        totalEnergyOrFuelConsumed: 1792,
        vehicleCount: 5,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Good solar battery swap station uptime at Kisumu Central.',
        status: 'Optimal'
      },
      'Kisumu_Fuel Motorcycle': {
        city: 'Kisumu',
        categoryOrType: 'Fuel Motorcycle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 35.8,
        unit: 'km/L',
        targetBenchmark: 37.5,
        efficiencyPctOfTarget: 95.5,
        costPerKmKes: 5.9,
        totalDistanceKm: 31000,
        totalEnergyOrFuelConsumed: 865,
        vehicleCount: 4,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Consistent rider speeds across rural-suburban transition routes.',
        status: 'Optimal'
      },
      'Kisumu_Electric Car / Delivery Van': {
        city: 'Kisumu',
        categoryOrType: 'Electric Car / Delivery Van',
        vehicleCategory: 'Electric',
        avgEfficiency: 6.9,
        unit: 'km/kWh',
        targetBenchmark: 7.2,
        efficiencyPctOfTarget: 95.8,
        costPerKmKes: 5.0,
        totalDistanceKm: 10000,
        totalEnergyOrFuelConsumed: 1449,
        vehicleCount: 1,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Low stop frequency yields excellent kWh efficiency.',
        status: 'Optimal'
      },
      'Kisumu_Petrol / Diesel Vehicle': {
        city: 'Kisumu',
        categoryOrType: 'Petrol / Diesel Vehicle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 13.1,
        unit: 'km/L',
        targetBenchmark: 14.5,
        efficiencyPctOfTarget: 90.3,
        costPerKmKes: 13.3,
        totalDistanceKm: 10000,
        totalEnergyOrFuelConsumed: 763,
        vehicleCount: 1,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Standard regional hospital & cargo delivery operations.',
        status: 'Moderate'
      },

      // Nakuru
      'Nakuru_Electric': {
        city: 'Nakuru',
        categoryOrType: 'Electric',
        vehicleCategory: 'Electric',
        avgEfficiency: 18.2,
        unit: 'km/kWh',
        targetBenchmark: 21.0,
        efficiencyPctOfTarget: 86.7,
        costPerKmKes: 3.3,
        totalDistanceKm: 34000,
        totalEnergyOrFuelConsumed: 1868,
        vehicleCount: 4,
        underperformingCount: 1,
        underperformingVehiclesList: ['KMG 991R'],
        regionalFactorNotes: 'Hilly Rift Valley escarpment terrain requires higher power output on uphills.',
        status: 'Moderate'
      },
      'Nakuru_Fuel': {
        city: 'Nakuru',
        categoryOrType: 'Fuel',
        vehicleCategory: 'Fuel',
        avgEfficiency: 29.5,
        unit: 'km/L',
        targetBenchmark: 35.0,
        efficiencyPctOfTarget: 84.3,
        costPerKmKes: 7.2,
        totalDistanceKm: 39000,
        totalEnergyOrFuelConsumed: 1322,
        vehicleCount: 5,
        underperformingCount: 2,
        underperformingVehiclesList: ['KDA 882L'],
        regionalFactorNotes: 'Elevation changes & unpaved feeder roads increase engine load.',
        status: 'Moderate'
      },
      'Nakuru_Electric Motorcycle': {
        city: 'Nakuru',
        categoryOrType: 'Electric Motorcycle',
        vehicleCategory: 'Electric',
        avgEfficiency: 19.0,
        unit: 'km/kWh',
        targetBenchmark: 22.0,
        efficiencyPctOfTarget: 86.4,
        costPerKmKes: 3.2,
        totalDistanceKm: 26000,
        totalEnergyOrFuelConsumed: 1368,
        vehicleCount: 3,
        underperformingCount: 1,
        underperformingVehiclesList: ['KMG 991R'],
        regionalFactorNotes: 'Uphill climbing near Menengai crater routes causes energy spikes.',
        status: 'Moderate'
      },
      'Nakuru_Fuel Motorcycle': {
        city: 'Nakuru',
        categoryOrType: 'Fuel Motorcycle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 32.1,
        unit: 'km/L',
        targetBenchmark: 37.0,
        efficiencyPctOfTarget: 86.8,
        costPerKmKes: 6.6,
        totalDistanceKm: 28000,
        totalEnergyOrFuelConsumed: 872,
        vehicleCount: 4,
        underperformingCount: 1,
        underperformingVehiclesList: ['KDA 882L'],
        regionalFactorNotes: 'Higher altitude reduces oxygen intake, slightly lowering engine efficiency.',
        status: 'Moderate'
      },
      'Nakuru_Electric Car / Delivery Van': {
        city: 'Nakuru',
        categoryOrType: 'Electric Car / Delivery Van',
        vehicleCategory: 'Electric',
        avgEfficiency: 6.2,
        unit: 'km/kWh',
        targetBenchmark: 7.0,
        efficiencyPctOfTarget: 88.6,
        costPerKmKes: 5.5,
        totalDistanceKm: 8000,
        totalEnergyOrFuelConsumed: 1290,
        vehicleCount: 1,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Inter-town highway runs have moderate aerodynamic drag.',
        status: 'Moderate'
      },
      'Nakuru_Petrol / Diesel Vehicle': {
        city: 'Nakuru',
        categoryOrType: 'Petrol / Diesel Vehicle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 12.4,
        unit: 'km/L',
        targetBenchmark: 14.5,
        efficiencyPctOfTarget: 85.5,
        costPerKmKes: 14.1,
        totalDistanceKm: 11000,
        totalEnergyOrFuelConsumed: 887,
        vehicleCount: 1,
        underperformingCount: 1,
        underperformingVehiclesList: ['KCF 302P'],
        regionalFactorNotes: 'Heavy agricultural produce transport payload increases fuel consumption.',
        status: 'Moderate'
      },

      // Kiambu
      'Kiambu_Electric': {
        city: 'Kiambu',
        categoryOrType: 'Electric',
        vehicleCategory: 'Electric',
        avgEfficiency: 21.1,
        unit: 'km/kWh',
        targetBenchmark: 22.0,
        efficiencyPctOfTarget: 95.9,
        costPerKmKes: 2.9,
        totalDistanceKm: 52000,
        totalEnergyOrFuelConsumed: 2464,
        vehicleCount: 7,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Suburban commuter routes with smooth kinetic energy recovery.',
        status: 'Optimal'
      },
      'Kiambu_Fuel': {
        city: 'Kiambu',
        categoryOrType: 'Fuel',
        vehicleCategory: 'Fuel',
        avgEfficiency: 32.8,
        unit: 'km/L',
        targetBenchmark: 35.0,
        efficiencyPctOfTarget: 93.7,
        costPerKmKes: 6.5,
        totalDistanceKm: 44000,
        totalEnergyOrFuelConsumed: 1341,
        vehicleCount: 6,
        underperformingCount: 1,
        underperformingVehiclesList: ['KCG 112T'],
        regionalFactorNotes: 'Ruaka & Thika highway connectivity allows high gear cruising.',
        status: 'Optimal'
      },
      'Kiambu_Electric Motorcycle': {
        city: 'Kiambu',
        categoryOrType: 'Electric Motorcycle',
        vehicleCategory: 'Electric',
        avgEfficiency: 22.8,
        unit: 'km/kWh',
        targetBenchmark: 23.5,
        efficiencyPctOfTarget: 97.0,
        costPerKmKes: 2.6,
        totalDistanceKm: 41000,
        totalEnergyOrFuelConsumed: 1798,
        vehicleCount: 5,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Excellent battery swap station accessibility along Kiambu Road.',
        status: 'Optimal'
      },
      'Kiambu_Fuel Motorcycle': {
        city: 'Kiambu',
        categoryOrType: 'Fuel Motorcycle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 35.1,
        unit: 'km/L',
        targetBenchmark: 37.0,
        efficiencyPctOfTarget: 94.9,
        costPerKmKes: 6.1,
        totalDistanceKm: 33000,
        totalEnergyOrFuelConsumed: 940,
        vehicleCount: 4,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Suburban last-mile delivery route efficiency.',
        status: 'Optimal'
      },
      'Kiambu_Electric Car / Delivery Van': {
        city: 'Kiambu',
        categoryOrType: 'Electric Car / Delivery Van',
        vehicleCategory: 'Electric',
        avgEfficiency: 7.1,
        unit: 'km/kWh',
        targetBenchmark: 7.4,
        efficiencyPctOfTarget: 95.9,
        costPerKmKes: 4.9,
        totalDistanceKm: 11000,
        totalEnergyOrFuelConsumed: 1549,
        vehicleCount: 2,
        underperformingCount: 0,
        underperformingVehiclesList: [],
        regionalFactorNotes: 'Smooth bypass routes allow continuous high-efficiency motor speed.',
        status: 'Optimal'
      },
      'Kiambu_Petrol / Diesel Vehicle': {
        city: 'Kiambu',
        categoryOrType: 'Petrol / Diesel Vehicle',
        vehicleCategory: 'Fuel',
        avgEfficiency: 13.5,
        unit: 'km/L',
        targetBenchmark: 14.5,
        efficiencyPctOfTarget: 93.1,
        costPerKmKes: 13.0,
        totalDistanceKm: 11000,
        totalEnergyOrFuelConsumed: 815,
        vehicleCount: 2,
        underperformingCount: 1,
        underperformingVehiclesList: ['KCG 112T'],
        regionalFactorNotes: 'Feeder road stop-and-start near markets slightly lowers fuel economy.',
        status: 'Optimal'
      }
    };

    // Build array based on selected view group
    const resultList: EfficiencyCellData[] = [];
    const targetCategoriesOrTypes = viewGroup === 'category' ? categories : detailedTypes;

    cities.forEach(city => {
      targetCategoriesOrTypes.forEach(catType => {
        const key = `${city}_${catType}`;
        if (baseCellMap[key]) {
          resultList.push(baseCellMap[key]);
        } else {
          // Fallback generate
          const isEv = catType.includes('Electric');
          resultList.push({
            city,
            categoryOrType: catType,
            vehicleCategory: isEv ? 'Electric' : 'Fuel',
            avgEfficiency: isEv ? 18.0 : 30.0,
            unit: isEv ? 'km/kWh' : 'km/L',
            targetBenchmark: isEv ? 21.0 : 35.0,
            efficiencyPctOfTarget: 85.0,
            costPerKmKes: isEv ? 3.2 : 7.0,
            totalDistanceKm: 25000,
            totalEnergyOrFuelConsumed: 1000,
            vehicleCount: 3,
            underperformingCount: 0,
            underperformingVehiclesList: [],
            regionalFactorNotes: 'Standard regional operational baseline.',
            status: 'Moderate'
          });
        }
      });
    });

    return resultList;
  }, [viewGroup, vehicles]);

  // Key metrics for top banner cards
  const summaryMetrics = useMemo(() => {
    const totalVehiclesAudited = heatmapData.reduce((acc, c) => acc + c.vehicleCount, 0);
    const underperformingCells = heatmapData.filter(c => c.status === 'Underperforming');
    const totalUnderperformingVehicles = heatmapData.reduce((acc, c) => acc + c.underperformingCount, 0);

    // Lowest efficiency region
    const lowestCell = [...heatmapData].sort((a, b) => a.efficiencyPctOfTarget - b.efficiencyPctOfTarget)[0];
    
    // Highest efficiency region
    const highestCell = [...heatmapData].sort((a, b) => b.efficiencyPctOfTarget - a.efficiencyPctOfTarget)[0];

    // Estimated monthly fuel/energy cost waste from underperforming cells (in KES)
    const estimatedCostSavingsKes = underperformingCells.reduce((sum, c) => {
      // difference in cost per km * total km
      const optimalCostPerKm = c.vehicleCategory === 'Electric' ? 2.6 : 6.2;
      const excessCostPerKm = Math.max(0, c.costPerKmKes - optimalCostPerKm);
      return sum + (excessCostPerKm * c.totalDistanceKm * 0.3); // 30% monthly allocation
    }, 0);

    return {
      totalVehiclesAudited,
      underperformingCellsCount: underperformingCells.length,
      totalUnderperformingVehicles,
      lowestCell,
      highestCell,
      estimatedCostSavingsKes
    };
  }, [heatmapData]);

  // Render D3 Heatmap
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth || 700;
    const height = 380;

    const margin = { top: 40, right: 30, bottom: 60, left: 140 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3.select(svgRef.current);
    svg.attr('width', containerWidth).attr('height', height);

    // Maintain persistent chart group
    let chartGroup = svg.select<SVGGElement>('g.heatmap-main-group');
    let isInitialRender = false;

    if (chartGroup.empty()) {
      isInitialRender = true;
      chartGroup = svg.append('g')
        .attr('class', 'heatmap-main-group')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      chartGroup.append('g').attr('class', 'x-axis');
      chartGroup.append('g').attr('class', 'y-axis');
      chartGroup.append('g').attr('class', 'cells-group');
    }

    const yDomain = cities; // Cities on Y-axis
    const xDomain = viewGroup === 'category' ? categories : detailedTypes; // Categories on X-axis

    // X Scale
    const xScale = d3.scaleBand<string>()
      .domain(xDomain)
      .range([0, width])
      .padding(0.08);

    // Y Scale
    const yScale = d3.scaleBand<string>()
      .domain(yDomain)
      .range([0, height - margin.top - margin.bottom])
      .padding(0.08);

    const duration = isInitialRender ? 800 : 600;
    const t = svg.transition().duration(duration).ease(d3.easeCubicInOut);

    // Axes
    const xAxis = d3.axisTop(xScale).tickSize(0);
    const yAxis = d3.axisLeft(yScale).tickSize(0);

    const xAxisGroup = chartGroup.select<SVGGElement>('g.x-axis');
    xAxisGroup
      .attr('transform', `translate(0, -10)`)
      .transition(t as any)
      .call(xAxis as any)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', '800')
      .attr('letter-spacing', '0.5px');

    xAxisGroup.selectAll('.domain').remove();

    const yAxisGroup = chartGroup.select<SVGGElement>('g.y-axis');
    yAxisGroup
      .attr('transform', `translate(-10, 0)`)
      .transition(t as any)
      .call(yAxis as any)
      .selectAll('text')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '12px')
      .attr('font-weight', '800');

    yAxisGroup.selectAll('.domain').remove();

    // Color Scale Mapping based on % of target benchmark:
    // Red/Rose (Underperforming < 80%), Yellow/Amber (Moderate 80-92%), Green/Emerald (Optimal > 92%)
    const getColorForCell = (d: EfficiencyCellData) => {
      if (highlightUnderperformingOnly && d.status !== 'Underperforming') {
        return '#0f172a'; // dimmed slate-900
      }

      if (metricMode === 'costPerKm') {
        // Lower cost is better
        if (d.vehicleCategory === 'Electric') {
          if (d.costPerKmKes <= 3.0) return '#059669'; // emerald-600
          if (d.costPerKmKes <= 4.5) return '#d97706'; // amber-600
          return '#dc2626'; // rose-600
        } else {
          if (d.costPerKmKes <= 6.5) return '#059669';
          if (d.costPerKmKes <= 10.0) return '#d97706';
          return '#dc2626';
        }
      }

      // Default metric: % of Target or Raw Efficiency
      const pct = d.efficiencyPctOfTarget;
      if (pct >= 93) return '#059669'; // Emerald-600 (Optimal)
      if (pct >= 82) return '#d97706'; // Amber-600 (Moderate)
      return '#dc2626'; // Rose-600 (Underperforming)
    };

    // Tooltip Selection
    let tooltipDiv = d3.select(containerRef.current).select<HTMLDivElement>('.d3-heatmap-tooltip');
    if (tooltipDiv.empty()) {
      tooltipDiv = d3.select(containerRef.current)
        .append('div')
        .attr('class', 'd3-heatmap-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', '#020617')
        .style('border', '1px solid #334155')
        .style('border-radius', '12px')
        .style('padding', '12px 14px')
        .style('color', '#fff')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '60')
        .style('box-shadow', '0 20px 30px rgba(0,0,0,0.5)');
    }

    // Bind Cell Rectangles & Labels
    const cellsGroup = chartGroup.select('g.cells-group');

    const cellG = cellsGroup
      .selectAll<SVGGElement, EfficiencyCellData>('g.cell-item')
      .data(heatmapData, d => `${d.city}_${d.categoryOrType}`);

    cellG.exit()
      .transition(t as any)
      .style('opacity', 0)
      .remove();

    const cellEnter = cellG.enter()
      .append('g')
      .attr('class', 'cell-item')
      .style('cursor', 'pointer');

    cellEnter.append('rect')
      .attr('class', 'cell-rect')
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('stroke-width', 2)
      .attr('stroke', '#1e293b');

    cellEnter.append('text')
      .attr('class', 'cell-val-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#ffffff')
      .attr('font-size', '13px')
      .attr('font-weight', '900');

    cellEnter.append('text')
      .attr('class', 'cell-sub-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '10px')
      .attr('font-weight', '700');

    cellEnter.append('text')
      .attr('class', 'cell-badge-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '9px')
      .attr('font-weight', '900');

    // Merge Enter + Update
    const mergedG = cellEnter.merge(cellG);

    mergedG
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).select('rect')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 3);

        const statusBadge = d.status === 'Optimal'
          ? '<span style="color: #34d399; font-weight: 800;">🟢 OPTIMAL BENCHMARK</span>'
          : d.status === 'Moderate'
          ? '<span style="color: #fbbf24; font-weight: 800;">🟡 MODERATE ECONOMY</span>'
          : '<span style="color: #f87171; font-weight: 800;">🔴 UNDERPERFORMING REGION</span>';

        tooltipDiv
          .style('visibility', 'visible')
          .html(`
            <div style="font-weight: 800; font-size: 13px; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 6px;">
              📍 ${d.city} • ${d.categoryOrType}
            </div>
            <div style="margin-bottom: 4px;">${statusBadge}</div>
            <div style="font-size: 12px; margin-top: 4px;">
              Average Efficiency: <strong style="color: #fff; font-size: 14px;">${d.avgEfficiency} ${d.unit}</strong>
              <span style="color: #94a3b8; font-size: 11px;"> (Target: ${d.targetBenchmark} ${d.unit})</span>
            </div>
            <div style="margin-top: 2px; color: #cbd5e1;">
              Target Compliance: <strong style="color: ${d.efficiencyPctOfTarget >= 90 ? '#34d399' : '#f87171'}">${d.efficiencyPctOfTarget}%</strong>
            </div>
            <div style="margin-top: 2px; color: #cbd5e1;">
              Energy / Fuel Cost: <strong style="color: #fbbf24;">KES ${d.costPerKmKes}/km</strong>
            </div>
            <div style="margin-top: 2px; color: #94a3b8;">
              Active Fleet in Region: <strong style="color: #fff;">${d.vehicleCount} vehicles</strong> (${d.totalDistanceKm.toLocaleString()} km logged)
            </div>
            ${d.underperformingCount > 0 ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #334155; color: #f87171; font-size: 11px; font-weight: 700;">
                ⚠️ ${d.underperformingCount} Flagged Vehicle(s): ${d.underperformingVehiclesList.join(', ')}
              </div>
            ` : ''}
            <div style="margin-top: 6px; font-size: 10px; color: #64748b; font-style: italic;">
              Regional Factor: ${d.regionalFactorNotes}
            </div>
          `);
      })
      .on('mousemove', (event) => {
        const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
        tooltipDiv
          .style('top', `${mouseY - 110}px`)
          .style('left', `${Math.min(containerWidth - 280, Math.max(10, mouseX - 100))}px`);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget).select('rect')
          .attr('stroke', d.status === 'Underperforming' ? '#f43f5e' : '#1e293b')
          .attr('stroke-width', d.status === 'Underperforming' ? 2.5 : 2);

        tooltipDiv.style('visibility', 'hidden');
      })
      .on('click', (event, d) => {
        setSelectedCell(d);
        toast.info(`Selected ${d.city} - ${d.categoryOrType} Efficiency Cell`, {
          description: `Avg: ${d.avgEfficiency} ${d.unit} (${d.efficiencyPctOfTarget}% of target benchmark)`
        });
      });

    // Animate Position & Color
    mergedG.select('rect.cell-rect')
      .transition(t as any)
      .attr('x', d => xScale(d.categoryOrType) || 0)
      .attr('y', d => yScale(d.city) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => getColorForCell(d))
      .attr('stroke', d => (highlightUnderperformingOnly && d.status === 'Underperforming' ? '#f43f5e' : (d.status === 'Underperforming' ? '#f43f5e' : '#1e293b')))
      .attr('stroke-width', d => (d.status === 'Underperforming' ? 2.5 : 1.5))
      .attr('opacity', d => (highlightUnderperformingOnly && d.status !== 'Underperforming' ? 0.25 : 0.9));

    // Cell Text 1: Primary Value
    mergedG.select('text.cell-val-text')
      .transition(t as any)
      .attr('x', d => (xScale(d.categoryOrType) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => (yScale(d.city) || 0) + yScale.bandwidth() / 2 - 8)
      .text(d => {
        if (metricMode === 'costPerKm') {
          return `KES ${d.costPerKmKes}/km`;
        }
        if (metricMode === 'targetPct') {
          return `${d.efficiencyPctOfTarget}%`;
        }
        return `${d.avgEfficiency} ${d.unit}`;
      });

    // Cell Text 2: Sub-label
    mergedG.select('text.cell-sub-text')
      .transition(t as any)
      .attr('x', d => (xScale(d.categoryOrType) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => (yScale(d.city) || 0) + yScale.bandwidth() / 2 + 10)
      .text(d => {
        if (metricMode === 'costPerKm') {
          return `Target: KES ${d.vehicleCategory === 'Electric' ? 2.5 : 6.0}/km`;
        }
        if (metricMode === 'targetPct') {
          return `${d.avgEfficiency} ${d.unit}`;
        }
        return `Target: ${d.targetBenchmark} ${d.unit}`;
      });

    // Cell Text 3: Fleet count badge at top right
    mergedG.select('text.cell-badge-text')
      .transition(t as any)
      .attr('x', d => (xScale(d.categoryOrType) || 0) + xScale.bandwidth() - 14)
      .attr('y', d => (yScale(d.city) || 0) + 12)
      .attr('fill', d => d.status === 'Underperforming' ? '#fda4af' : 'rgba(255,255,255,0.7)')
      .text(d => `${d.vehicleCount}v`);

  }, [heatmapData, metricMode, viewGroup, highlightUnderperformingOnly]);

  // CSV Export
  const handleExportHeatmapCsv = () => {
    const headers = [
      'City',
      'Category / Vehicle Type',
      'Vehicle Category',
      'Avg Efficiency',
      'Unit',
      'Target Benchmark',
      'Efficiency % of Target',
      'Cost per Km (KES)',
      'Total Distance (km)',
      'Total Energy/Fuel Consumed',
      'Vehicle Count',
      'Underperforming Count',
      'Flagged Vehicles',
      'Status',
      'Regional Factor Notes'
    ];

    const rows = heatmapData.map(d => [
      `"${d.city}"`,
      `"${d.categoryOrType}"`,
      `"${d.vehicleCategory}"`,
      d.avgEfficiency,
      `"${d.unit}"`,
      d.targetBenchmark,
      `"${d.efficiencyPctOfTarget}%"`,
      d.costPerKmKes,
      d.totalDistanceKm,
      d.totalEnergyOrFuelConsumed,
      d.vehicleCount,
      d.underperformingCount,
      `"${d.underperformingVehiclesList.join('; ')}"`,
      `"${d.status}"`,
      `"${d.regionalFactorNotes.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `regional_vehicle_efficiency_heatmap_aug2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Regional Vehicle Efficiency Heatmap CSV!');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 relative overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Regional Vehicle Efficiency Heatmap
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                D3 Operational Matrix
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Heatmap comparison of vehicle efficiency (km/L & km/kWh) across Kenyan cities to spot underperforming regional operations
            </p>
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* View Group Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setViewGroup('category')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewGroup === 'category'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              By Category
            </button>
            <button
              onClick={() => setViewGroup('detailedType')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewGroup === 'detailedType'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              By Vehicle Type
            </button>
          </div>

          {/* Metric Mode Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setMetricMode('efficiency')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                metricMode === 'efficiency'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              km/L & km/kWh
            </button>
            <button
              onClick={() => setMetricMode('targetPct')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                metricMode === 'targetPct'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              % Target
            </button>
            <button
              onClick={() => setMetricMode('costPerKm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                metricMode === 'costPerKm'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KES / km
            </button>
          </div>

          {/* Highlight Underperforming Switch */}
          <button
            onClick={() => setHighlightUnderperformingOnly(!highlightUnderperformingOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              highlightUnderperformingOnly
                ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
            <span>Spot Underperforming</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportHeatmapCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Download Heatmap CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

        </div>
      </div>

      {/* SUMMARY KPI BANNER STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Lowest Efficiency Region</span>
            <div className="text-sm font-extrabold text-rose-400 mt-0.5">
              {summaryMetrics.lowestCell.city} • {summaryMetrics.lowestCell.categoryOrType}
            </div>
            <div className="text-[10px] text-rose-300/80 mt-0.5">
              {summaryMetrics.lowestCell.avgEfficiency} {summaryMetrics.lowestCell.unit} ({summaryMetrics.lowestCell.efficiencyPctOfTarget}% of target)
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Benchmark Benchmark Leader</span>
            <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
              {summaryMetrics.highestCell.city} • {summaryMetrics.highestCell.categoryOrType}
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">
              {summaryMetrics.highestCell.avgEfficiency} {summaryMetrics.highestCell.unit} ({summaryMetrics.highestCell.efficiencyPctOfTarget}% optimal)
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Flagged Underperforming Cells</span>
            <div className="text-sm font-extrabold text-amber-400 mt-0.5">
              {summaryMetrics.underperformingCellsCount} Regional Cells ({summaryMetrics.totalUnderperformingVehicles} Vehicles)
            </div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">
              Mombasa & Nakuru coastal/elevation drag
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[11px] font-medium block">Monthly Optimization Potential</span>
            <div className="text-sm font-extrabold text-indigo-300 mt-0.5">
              KES {Math.round(summaryMetrics.estimatedCostSavingsKes).toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-200/80 mt-0.5">
              If low-efficiency cells match standard benchmarks
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* D3 HEATMAP CHART CANVAS */}
      <div ref={containerRef} className="relative bg-slate-950/90 rounded-2xl p-4 border border-slate-800/80">
        
        {/* Heatmap Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Efficiency Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-400 inline-block" />
              <span>Optimal (&ge; 93% Target)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-600 border border-amber-400 inline-block" />
              <span>Moderate (82% - 92% Target)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-400 inline-block" />
              <span>Underperforming (&lt; 82% Target)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            💡 Hover over cell for vehicle details & telematics cause
          </div>
        </div>

        <svg ref={svgRef} className="w-full overflow-visible" />

      </div>

      {/* SELECTED CELL DIAGNOSTIC DRAWER / ACTION FOOTER */}
      {selectedCell && (
        <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                Regional Diagnostic: {selectedCell.city} ({selectedCell.categoryOrType})
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedCell.status === 'Optimal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : selectedCell.status === 'Moderate'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {selectedCell.status} Efficiency
              </span>
            </div>

            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Regional Factor Analysis</span>
              <p className="text-slate-200 mt-1 font-medium">{selectedCell.regionalFactorNotes}</p>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Flagged Vehicles ({selectedCell.underperformingCount})</span>
              <p className="text-amber-300 mt-1 font-mono font-bold">
                {selectedCell.underperformingVehiclesList.length > 0
                  ? selectedCell.underperformingVehiclesList.join(', ')
                  : 'All vehicles performing normally'}
              </p>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Cost Efficiency Impact</span>
                <p className="text-indigo-300 font-bold mt-0.5">KES {selectedCell.costPerKmKes} / km energy cost</p>
              </div>

              {selectedCell.underperformingVehiclesList.length > 0 && onSelectVehicle && (
                <button
                  onClick={() => onSelectVehicle(selectedCell.underperformingVehiclesList[0])}
                  className="mt-2 w-full py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Audit Flagged Vehicle Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
