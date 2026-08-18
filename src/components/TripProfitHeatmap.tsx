import React, { useEffect, useRef, useState } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  Pin, 
  useMap, 
  useMapsLibrary 
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import { 
  MapPin, 
  TrendingUp, 
  Zap, 
  Fuel, 
  DollarSign, 
  Layers, 
  Filter, 
  Sparkles, 
  Key, 
  ExternalLink, 
  Route, 
  BarChart2, 
  ArrowUpRight, 
  CheckCircle2, 
  ShieldAlert,
  Search,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';

// Google Maps API Key Resolution
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export interface ClusterPoint {
  id: string;
  name: string;
  city: 'Nairobi' | 'Mombasa' | 'Kisumu' | 'Nakuru' | 'Kiambu';
  type: 'Commercial Hub' | 'Airport Shuttles' | 'Industrial Freight' | 'Suburban Commuter' | 'Port & Shipping';
  centerLat: number;
  centerLng: number;
  avgProfitPerTripKes: number;
  avgRevenuePerTripKes: number;
  totalTrips30d: number;
  totalNetProfitKes: number;
  evMarginPct: number;
  fuelMarginPct: number;
  topCorridors: string[];
  peakHours: string;
  heatPoints: { lat: number; lng: number; profitKes: number; name: string }[];
}

// Master Kenya Trip Pickup & Drop-Off Clusters Dataset
export const ClusterData: ClusterPoint[] = [
  {
    id: 'cluster-jkia',
    name: 'JKIA Airport Express & Freight Corridor',
    city: 'Nairobi',
    type: 'Airport Shuttles',
    centerLat: -1.3323,
    centerLng: 36.9211,
    avgProfitPerTripKes: 2850,
    avgRevenuePerTripKes: 3900,
    totalTrips30d: 3120,
    totalNetProfitKes: 8892000,
    evMarginPct: 78.5,
    fuelMarginPct: 58.2,
    topCorridors: ['JKIA Cargo Terminal ➔ Westlands Hotel District', 'JKIA ➔ Nairobi CBD Financial Square', 'JKIA ➔ Gigiri UN Complex'],
    peakHours: '05:00 - 09:30 & 17:00 - 22:30',
    heatPoints: [
      { lat: -1.3323, lng: 36.9211, profitKes: 3100, name: 'JKIA Terminal 1A Pickup' },
      { lat: -1.3380, lng: 36.9280, profitKes: 2900, name: 'Air Cargo Logistics Hub' },
      { lat: -1.3200, lng: 36.8950, profitKes: 2750, name: 'Mombasa Road Junction Drop' },
      { lat: -1.3410, lng: 36.9150, profitKes: 2650, name: 'Airport Hotel & Shuttle Hub' },
      { lat: -1.3260, lng: 36.9080, profitKes: 2800, name: 'Eka / Ole Sereni Corridor' }
    ]
  },
  {
    id: 'cluster-westlands',
    name: 'Westlands & Kilimani Tech Commercial Hub',
    city: 'Nairobi',
    type: 'Commercial Hub',
    centerLat: -1.2683,
    centerLng: 36.8083,
    avgProfitPerTripKes: 1820,
    avgRevenuePerTripKes: 2450,
    totalTrips30d: 4850,
    totalNetProfitKes: 8827000,
    evMarginPct: 76.2,
    fuelMarginPct: 54.1,
    topCorridors: ['Sarit Center ➔ Kilimani Yaya Center', 'Westlands Delta Corner ➔ Upperhill Financial District', 'Lavington ➔ CBD Courier Express'],
    peakHours: '07:30 - 11:00 & 16:00 - 20:00',
    heatPoints: [
      { lat: -1.2683, lng: 36.8083, profitKes: 1950, name: 'Westlands Square Pickup' },
      { lat: -1.2720, lng: 36.8020, profitKes: 1880, name: 'Muthangari Commercial Hub' },
      { lat: -1.2880, lng: 36.7880, profitKes: 1750, name: 'Yaya Center Kilimani Hub' },
      { lat: -1.2620, lng: 36.8150, profitKes: 1810, name: 'Parklands Avenue Drop Zone' },
      { lat: -1.2780, lng: 36.7950, profitKes: 1710, name: 'Lavington Mall Gateway' }
    ]
  },
  {
    id: 'cluster-cbd-upperhill',
    name: 'Nairobi CBD & Upperhill Banking Square',
    city: 'Nairobi',
    type: 'Commercial Hub',
    centerLat: -1.2863,
    centerLng: 36.8172,
    avgProfitPerTripKes: 1450,
    avgRevenuePerTripKes: 1980,
    totalTrips30d: 5200,
    totalNetProfitKes: 7540000,
    evMarginPct: 74.8,
    fuelMarginPct: 52.6,
    topCorridors: ['Kenyatta Ave ➔ Upperhill Hospital Ridge', 'City Hall ➔ Industrial Area Depot', 'CBD ➔ Westlands Express'],
    peakHours: '07:00 - 10:00 & 16:30 - 19:30',
    heatPoints: [
      { lat: -1.2863, lng: 36.8172, profitKes: 1520, name: 'City Hall Way Pickup' },
      { lat: -1.2950, lng: 36.8180, profitKes: 1490, name: 'Upperhill Britam Tower Hub' },
      { lat: -1.2820, lng: 36.8250, profitKes: 1380, name: 'Haile Selassie Avenue Transit' },
      { lat: -1.2910, lng: 36.8120, profitKes: 1410, name: 'KNH Medical Zone Drop' }
    ]
  },
  {
    id: 'cluster-industrial-area',
    name: 'Industrial Area Enterprise Freight Logistics',
    city: 'Nairobi',
    type: 'Industrial Freight',
    centerLat: -1.3120,
    centerLng: 36.8450,
    avgProfitPerTripKes: 2150,
    avgRevenuePerTripKes: 2950,
    totalTrips30d: 2890,
    totalNetProfitKes: 6213500,
    evMarginPct: 75.0,
    fuelMarginPct: 51.8,
    topCorridors: ['Enterprise Rd Depot ➔ Inland Container Depot (ICD)', 'Likoni Rd ➔ Thika Superhighway Logistics', 'Industrial Area ➔ CBD B2B Parcel'],
    peakHours: '08:00 - 17:00 Continuous',
    heatPoints: [
      { lat: -1.3120, lng: 36.8450, profitKes: 2300, name: 'Enterprise Road Depot' },
      { lat: -1.3190, lng: 36.8520, profitKes: 2180, name: 'Likoni Road Heavy Industrial' },
      { lat: -1.3250, lng: 36.8610, profitKes: 2050, name: 'ICD Embakasi Freight Link' }
    ]
  },
  {
    id: 'cluster-ruaka-kiambu',
    name: 'Ruaka & Two Rivers Tech Corridor',
    city: 'Kiambu',
    type: 'Suburban Commuter',
    centerLat: -1.2010,
    centerLng: 36.7820,
    avgProfitPerTripKes: 1320,
    avgRevenuePerTripKes: 1850,
    totalTrips30d: 2150,
    totalNetProfitKes: 2838000,
    evMarginPct: 73.5,
    fuelMarginPct: 50.2,
    topCorridors: ['Two Rivers Mall ➔ Westlands Tech Hub', 'Ruaka Town ➔ Gigiri Diplomatic Zone', 'Kiambu Town ➔ Mutual Park'],
    peakHours: '06:30 - 09:30 & 17:00 - 21:00',
    heatPoints: [
      { lat: -1.2010, lng: 36.7820, profitKes: 1420, name: 'Two Rivers Mall Terminal' },
      { lat: -1.1920, lng: 36.7750, profitKes: 1310, name: 'Ruaka Center High-Density' },
      { lat: -1.1713, lng: 36.8355, profitKes: 1230, name: 'Kiambu Town Commercial Hub' }
    ]
  },
  {
    id: 'cluster-mombasa-port',
    name: 'Mombasa Port & Kilindini Maritime Hub',
    city: 'Mombasa',
    type: 'Port & Shipping',
    centerLat: -4.0530,
    centerLng: 39.6520,
    avgProfitPerTripKes: 2450,
    avgRevenuePerTripKes: 3350,
    totalTrips30d: 2600,
    totalNetProfitKes: 6370000,
    evMarginPct: 77.0,
    fuelMarginPct: 53.0,
    topCorridors: ['Kilindini Gate 1 ➔ Changamwe Freight Yard', 'Mombasa Port ➔ Miritini SGR Terminal', 'Port ➔ Nyali Executive Logistics'],
    peakHours: '07:00 - 18:00 Non-stop',
    heatPoints: [
      { lat: -4.0530, lng: 39.6520, profitKes: 2600, name: 'Kilindini Port Main Gate' },
      { lat: -4.0410, lng: 39.6380, profitKes: 2400, name: 'Changamwe Oil Refinery Zone' },
      { lat: -4.0280, lng: 39.6120, profitKes: 2350, name: 'Miritini SGR Cargo Terminal' }
    ]
  },
  {
    id: 'cluster-nyali-mombasa',
    name: 'Nyali Coast & Hotel Waterfront Belt',
    city: 'Mombasa',
    type: 'Commercial Hub',
    centerLat: -4.0250,
    centerLng: 39.7020,
    avgProfitPerTripKes: 1680,
    avgRevenuePerTripKes: 2280,
    totalTrips30d: 2980,
    totalNetProfitKes: 5006400,
    evMarginPct: 74.2,
    fuelMarginPct: 51.5,
    topCorridors: ['Nyali Centre ➔ Mombasa CBD Island', 'City Mall Nyali ➔ Bamburi Beach Resorts', 'Nyali ➔ Moi International Airport'],
    peakHours: '08:00 - 12:00 & 17:30 - 23:00',
    heatPoints: [
      { lat: -4.0250, lng: 39.7020, profitKes: 1750, name: 'Nyali Centre Hub' },
      { lat: -4.0120, lng: 39.7150, profitKes: 1620, name: 'Bamburi Beach Resort Strip' },
      { lat: -4.0434, lng: 39.6682, profitKes: 1670, name: 'Mombasa Island Gateway Bridge' }
    ]
  },
  {
    id: 'cluster-kisumu-port',
    name: 'Kisumu Port & Lakeside Trade Zone',
    city: 'Kisumu',
    type: 'Port & Shipping',
    centerLat: -0.0917,
    centerLng: 34.7679,
    avgProfitPerTripKes: 1580,
    avgRevenuePerTripKes: 2150,
    totalTrips30d: 1950,
    totalNetProfitKes: 3081000,
    evMarginPct: 72.8,
    fuelMarginPct: 49.6,
    topCorridors: ['Kisumu Port Terminal ➔ Mega City Market', 'Kisumu CBD ➔ Busia Highway Outlet', 'Kisumu Airport ➔ Lakeside Hotels'],
    peakHours: '07:30 - 18:30',
    heatPoints: [
      { lat: -0.0917, lng: 34.7679, profitKes: 1680, name: 'Kisumu City Center Market' },
      { lat: -0.0980, lng: 34.7550, profitKes: 1520, name: 'Kisumu Pier & Port Gate' },
      { lat: -0.0820, lng: 34.7290, profitKes: 1540, name: 'Kisumu Airport Freight Link' }
    ]
  },
  {
    id: 'cluster-nakuru-cbd',
    name: 'Nakuru Town & Industrial Bypass Corridor',
    city: 'Nakuru',
    type: 'Commercial Hub',
    centerLat: -0.3030,
    centerLng: 36.0800,
    avgProfitPerTripKes: 1280,
    avgRevenuePerTripKes: 1760,
    totalTrips30d: 1720,
    totalNetProfitKes: 2201600,
    evMarginPct: 71.5,
    fuelMarginPct: 48.2,
    topCorridors: ['Nakuru CBD ➔ Pipeline Industrial Depot', 'Kenyatta Ave ➔ Njoro Agro Trade Gateway', 'Nakuru ➔ Naivasha Highway Feed'],
    peakHours: '07:00 - 18:00',
    heatPoints: [
      { lat: -0.3030, lng: 36.0800, profitKes: 1350, name: 'Kenyatta Avenue CBD' },
      { lat: -0.3150, lng: 36.0950, profitKes: 1220, name: 'Pipeline Industrial Junction' }
    ]
  }
];

// Sub-component: Google Maps Heatmap Layer utilizing `useMapsLibrary('visualization')`
function GoogleMapsHeatmapLayer({
  dataPoints,
  radius = 35
}: {
  dataPoints: { lat: number; lng: number; weight: number }[];
  radius?: number;
}) {
  const map = useMap();
  const visualizationLib = useMapsLibrary('visualization');

  useEffect(() => {
    if (!map || !visualizationLib || !dataPoints || dataPoints.length === 0) return;

    const HeatmapClass = (visualizationLib as any).HeatmapLayer;
    if (!HeatmapClass) return;

    const formattedData = dataPoints.map(pt => ({
      location: new google.maps.LatLng(pt.lat, pt.lng),
      weight: pt.weight
    }));

    const heatmap = new HeatmapClass({
      data: formattedData,
      map,
      radius,
      opacity: 0.82,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(16, 185, 129, 0.4)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.9)',
        'rgba(239, 68, 68, 1)',
        'rgba(220, 38, 38, 1)'
      ]
    });

    return () => {
      if (heatmap && typeof heatmap.setMap === 'function') {
        heatmap.setMap(null);
      }
    };
  }, [map, visualizationLib, dataPoints, radius]);

  return null;
}

// Leaflet Fallback Component for Preview Environment
const LeafletProfitHeatmapComponent: React.FC<{
  clusters: ClusterPoint[];
  selectedCluster: ClusterPoint | null;
  onSelectCluster: (cluster: ClusterPoint) => void;
  weightMetric: 'profit' | 'revenue' | 'trips';
}> = ({ clusters, selectedCluster, onSelectCluster, weightMetric }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        center: [-1.2863, 36.8172],
        zoom: 11,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      layerGroup.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
    }
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !layerGroup.current) return;

    layerGroup.current.clearLayers();

    clusters.forEach(c => {
      let weightVal = c.avgProfitPerTripKes;
      if (weightMetric === 'revenue') weightVal = c.avgRevenuePerTripKes;
      if (weightMetric === 'trips') weightVal = c.totalTrips30d;

      const isHighYield = c.avgProfitPerTripKes >= 2000;
      const isModerate = c.avgProfitPerTripKes >= 1500 && c.avgProfitPerTripKes < 2000;

      const colorHex = isHighYield ? '#ef4444' : isModerate ? '#f59e0b' : '#10b981';
      const radiusMeters = Math.min(Math.max(weightVal * 1.2, 800), 3200);

      // Outer heat aura circle
      const heatCircle = L.circle([c.centerLat, c.centerLng], {
        radius: radiusMeters,
        color: colorHex,
        fillColor: colorHex,
        fillOpacity: 0.22,
        weight: 1.5,
        dashArray: '4, 4'
      });

      // Core cluster marker
      const coreMarker = L.circle([c.centerLat, c.centerLng], {
        radius: radiusMeters * 0.35,
        color: '#0f172a',
        fillColor: colorHex,
        fillOpacity: 0.85,
        weight: 2
      });

      const popupContent = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; padding: 6px; color: #0f172a; min-width: 200px;">
          <div style="font-size: 13px; font-weight: 900; color: #0f172a;">${c.name}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">City: <strong>${c.city}</strong> • ${c.type}</div>
          <div style="margin-top: 6px; padding: 6px; background-color: #f1f5f9; border-radius: 6px; font-size: 11px; font-weight: bold;">
            Avg Profit / Trip: <span style="color: #059669; font-size: 13px;">KES ${c.avgProfitPerTripKes.toLocaleString()}</span><br/>
            30-Day Trips: ${c.totalTrips30d.toLocaleString()}<br/>
            Total Net Profit: <span style="color: #0284c7;">KES ${(c.totalNetProfitKes / 1000000).toFixed(2)}M</span>
          </div>
          <div style="margin-top: 6px; font-size: 10px; color: #64748b;">
            EV Net Margin: <strong style="color: #059669;">${c.evMarginPct}%</strong> vs Fuel: <strong>${c.fuelMarginPct}%</strong>
          </div>
        </div>
      `;

      coreMarker.bindPopup(popupContent);
      coreMarker.on('click', () => onSelectCluster(c));

      layerGroup.current?.addLayer(heatCircle);
      layerGroup.current?.addLayer(coreMarker);

      // Add sub-heat points around cluster
      c.heatPoints.forEach(hp => {
        const subCircle = L.circle([hp.lat, hp.lng], {
          radius: 350,
          color: colorHex,
          fillColor: colorHex,
          fillOpacity: 0.35,
          weight: 0
        });
        subCircle.bindTooltip(`${hp.name} — KES ${hp.profitKes}/trip`, { permanent: false, direction: 'top' });
        layerGroup.current?.addLayer(subCircle);
      });
    });

    if (selectedCluster && mapInstance.current) {
      mapInstance.current.panTo([selectedCluster.centerLat, selectedCluster.centerLng]);
      mapInstance.current.setZoom(13);
    }
  }, [clusters, selectedCluster, weightMetric]);

  return <div ref={mapRef} className="w-full h-[520px] rounded-xl overflow-hidden z-10" />;
};

export const TripProfitHeatmap: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [weightMetric, setWeightMetric] = useState<'profit' | 'revenue' | 'trips'>('profit');
  const [useLeaflet, setUseLeaflet] = useState<boolean>(!hasValidKey);

  const [selectedCluster, setSelectedCluster] = useState<ClusterPoint | null>(ClusterData[0]);

  // Filter clusters
  const filteredClusters = ClusterData.filter(c => {
    if (selectedCity !== 'All Cities' && c.city !== selectedCity) return false;
    if (selectedTier === 'Premium' && c.avgProfitPerTripKes < 2000) return false;
    if (selectedTier === 'High' && (c.avgProfitPerTripKes < 1500 || c.avgProfitPerTripKes >= 2000)) return false;
    if (selectedTier === 'Standard' && c.avgProfitPerTripKes >= 1500) return false;
    return true;
  });

  // KPI Calculations
  const highestYieldCluster = [...filteredClusters].sort((a, b) => b.avgProfitPerTripKes - a.avgProfitPerTripKes)[0] || ClusterData[0];
  const totalTripsAnalyzed = filteredClusters.reduce((a, c) => a + c.totalTrips30d, 0);
  const totalHeatmapProfit = filteredClusters.reduce((a, c) => a + c.totalNetProfitKes, 0);
  const avgFleetProfitPerTrip = totalTripsAnalyzed > 0 ? Math.round(totalHeatmapProfit / totalTripsAnalyzed) : 0;

  // Format heatmap points for Google Maps API
  const googleMapsHeatmapPoints = filteredClusters.flatMap(c => {
    return c.heatPoints.map(hp => ({
      lat: hp.lat,
      lng: hp.lng,
      weight: weightMetric === 'profit' ? hp.profitKes : weightMetric === 'revenue' ? hp.profitKes * 1.35 : c.totalTrips30d / 5
    }));
  });

  const handleDeployEvFleet = (cluster: ClusterPoint) => {
    toast.success(`🚀 EV Fleet Expansion Recommendation Logged for ${cluster.name}!`, {
      description: `Dispatched proposal to allocate 12 Electric Motorcycles (Roam Air) & 2 Swap Stations to ${cluster.city} zone. Projected EV profit margin: ${cluster.evMarginPct}%.`,
      duration: 6000
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6">
      
      {/* HEADER & STRATEGIC INSIGHT */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Google Maps Profit-per-Trip Geographic Heatmap</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  AI Yield Analysis
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clustered pickup &amp; drop-off route profitability across Kenya to identify high-revenue service zones for EV deployment.
              </p>
            </div>
          </div>
        </div>

        {/* Map Engine Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseLeaflet(!useLeaflet)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Map Mode: {useLeaflet ? 'Leaflet Engine' : 'Google Maps Platform'}</span>
          </button>
        </div>
      </div>

      {/* KPI SUMMARY METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Highest Yield Corridor</div>
          <div className="text-sm font-black text-white truncate mt-1">{highestYieldCluster.name}</div>
          <div className="text-xs font-extrabold text-emerald-400 mt-0.5 font-mono">
            KES {highestYieldCluster.avgProfitPerTripKes.toLocaleString()} / trip
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Network Profit / Trip</div>
          <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
            KES {avgFleetProfitPerTrip.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Weighted across {filteredClusters.length} clusters</div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Analyzed Trips (30d)</div>
          <div className="text-xl font-black text-white mt-0.5 font-mono">
            {totalTripsAnalyzed.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">GPS Pickup &amp; Drop-off Events</div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cluster Net Profit</div>
          <div className="text-xl font-black text-amber-400 mt-0.5 font-mono">
            KES {(totalHeatmapProfit / 1000000).toFixed(2)}M
          </div>
          <div className="text-[10px] text-emerald-400 font-bold mt-0.5">74.2% EV Margin Efficiency</div>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* City Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">City Region:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All Cities">All Cities (Kenya)</option>
              <option value="Nairobi">Nairobi</option>
              <option value="Mombasa">Mombasa</option>
              <option value="Kisumu">Kisumu</option>
              <option value="Nakuru">Nakuru</option>
              <option value="Kiambu">Kiambu</option>
            </select>
          </div>

          {/* Profit Tier Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Yield Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Yield Tiers</option>
              <option value="Premium">Premium (&gt; KES 2,000/trip)</option>
              <option value="High">High (KES 1,500 - 2,000/trip)</option>
              <option value="Standard">Standard (&lt; KES 1,500/trip)</option>
            </select>
          </div>

          {/* Heatmap Metric Weighting */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setWeightMetric('profit')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                weightMetric === 'profit' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Profit / Trip
            </button>
            <button
              onClick={() => setWeightMetric('revenue')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                weightMetric === 'revenue' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gross Revenue
            </button>
            <button
              onClick={() => setWeightMetric('trips')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                weightMetric === 'trips' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Trip Density
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span>High Yield (&gt; KES 2.0k)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Moderate (KES 1.5k-2.0k)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Standard (&lt; KES 1.5k)</span>
          </div>
        </div>

      </div>

      {/* MAP CANVAS & CLUSTER INSPECTOR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAP CANVAS CONTAINER (2 COLS) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative min-h-[520px]">
          
          {!hasValidKey && !useLeaflet ? (
            /* GOOGLE MAPS API KEY SPLASH SCREEN */
            <div className="flex flex-col items-center justify-center h-[520px] p-6 text-center bg-slate-950 text-slate-200">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-4">
                <Key className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">Google Maps Platform API Key Required</h3>
              <p className="text-xs text-slate-400 max-w-md mb-6">
                To unlock full Google Maps Vector Heatmaps &amp; Google Places integration, please add your API key secret.
              </p>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left max-w-md w-full text-xs space-y-2 mb-6">
                <div className="font-bold text-emerald-400 uppercase text-[10px]">Setup Instructions:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Get an API key from Google Cloud Console.</li>
                  <li>In AI Studio <strong>Settings (⚙️)</strong> &rarr; <strong>Secrets</strong>, add <code>GOOGLE_MAPS_PLATFORM_KEY</code>.</li>
                  <li>The heatmap reloads automatically with Google Maps Platform active!</li>
                </ol>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center gap-1.5"
                >
                  <span>Get Google Maps API Key</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => setUseLeaflet(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Preview Heatmap in Leaflet Mode
                </button>
              </div>
            </div>
          ) : useLeaflet ? (
            /* LEAFLET FALLBACK MAP MODE */
            <LeafletProfitHeatmapComponent
              clusters={filteredClusters}
              selectedCluster={selectedCluster}
              onSelectCluster={setSelectedCluster}
              weightMetric={weightMetric}
            />
          ) : (
            /* GOOGLE MAPS PLATFORM MODE WITH HEATMAP LAYER */
            <APIProvider apiKey={API_KEY} libraries={['visualization', 'places']} version="weekly">
              <div className="relative w-full h-[520px]">
                <Map
                  defaultCenter={{ lat: -1.2863, lng: 36.8172 }}
                  defaultZoom={11}
                  mapId="HEATMAP_DEMO_MAP"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '520px' }}
                >
                  {/* Google Maps Heatmap Layer */}
                  <GoogleMapsHeatmapLayer dataPoints={googleMapsHeatmapPoints} radius={40} />

                  {/* Cluster Center Pins */}
                  {filteredClusters.map(cluster => {
                    const isHighYield = cluster.avgProfitPerTripKes >= 2000;
                    const pinColor = isHighYield ? '#ef4444' : cluster.avgProfitPerTripKes >= 1500 ? '#f59e0b' : '#10b981';

                    return (
                      <React.Fragment key={cluster.id}>
                        <AdvancedMarker
                          position={{ lat: cluster.centerLat, lng: cluster.centerLng }}
                          title={cluster.name}
                          onClick={() => setSelectedCluster(cluster)}
                        >
                          <Pin
                            background={pinColor}
                            borderColor="#0f172a"
                            glyph="📈"
                            glyphColor="#ffffff"
                          />
                        </AdvancedMarker>

                        {selectedCluster?.id === cluster.id && (
                          <InfoWindow
                            position={{ lat: cluster.centerLat, lng: cluster.centerLng }}
                            onCloseClick={() => setSelectedCluster(null)}
                          >
                            <div className="p-1 font-sans text-slate-900 text-xs">
                              <strong className="text-sm font-bold block">{cluster.name}</strong>
                              <span className="text-slate-600 block">{cluster.city} • {cluster.type}</span>
                              <div className="mt-1 font-extrabold text-emerald-600 text-sm">
                                KES {cluster.avgProfitPerTripKes.toLocaleString()} / trip
                              </div>
                              <div className="text-slate-500 text-[10px]">
                                30-Day Trips: {cluster.totalTrips30d.toLocaleString()}
                              </div>
                            </div>
                          </InfoWindow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Map>
              </div>
            </APIProvider>
          )}

          {/* Map Overlay Watermark */}
          <div className="absolute top-3 right-3 z-20 bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 backdrop-blur-md text-[11px] text-slate-300 shadow-lg space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-white">
                {useLeaflet ? 'Leaflet Heat Engine' : 'Google Maps Heatmap Active'}
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">
              {filteredClusters.length} High-Revenue Clusters Weighted
            </div>
          </div>

        </div>

        {/* SELECTED CLUSTER DETAILED ANALYTICS DRAWER */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          {selectedCluster ? (
            <div className="space-y-4">
              
              {/* Cluster Title Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {selectedCluster.city} • {selectedCluster.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    ID: {selectedCluster.id}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1.5">{selectedCluster.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Peak Window: <strong className="text-white">{selectedCluster.peakHours}</strong></p>
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Avg Profit / Trip</span>
                  <div className="text-base font-black text-emerald-400 mt-0.5 font-mono">
                    KES {selectedCluster.avgProfitPerTripKes.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Gross Rev: KES {selectedCluster.avgRevenuePerTripKes.toLocaleString()}</div>
                </div>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">30-Day Cluster Profit</span>
                  <div className="text-base font-black text-amber-400 mt-0.5 font-mono">
                    KES {(selectedCluster.totalNetProfitKes / 1000000).toFixed(2)}M
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Volume: {selectedCluster.totalTrips30d.toLocaleString()} trips</div>
                </div>
              </div>

              {/* EV vs Fuel Profit Margin Efficiency Comparison */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>EV vs Fuel Margin Efficiency</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded">
                    +{(selectedCluster.evMarginPct - selectedCluster.fuelMarginPct).toFixed(1)}% EV Yield Boost
                  </span>
                </div>

                {/* EV Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 font-semibold">Electric Fleet Net Margin</span>
                    <span className="font-mono font-bold text-emerald-400">{selectedCluster.evMarginPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${selectedCluster.evMarginPct}%` }} />
                  </div>
                </div>

                {/* Fuel Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Fuel Fleet Net Margin</span>
                    <span className="font-mono font-semibold text-amber-400">{selectedCluster.fuelMarginPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${selectedCluster.fuelMarginPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Top High-Density Pickup/Drop-off Corridors */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Top High-Revenue Pickup &amp; Drop-Off Corridors</span>
                </div>
                <div className="space-y-1.5">
                  {selectedCluster.topCorridors.map((corridor, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800/80 p-2 rounded-lg text-[11px] text-slate-200 flex items-start gap-2">
                      <span className="text-emerald-400 font-mono font-black text-xs shrink-0">#{idx + 1}</span>
                      <span className="leading-snug">{corridor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button: Deploy EV Fleet */}
              <button
                onClick={() => handleDeployEvFleet(selectedCluster)}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Deploy EV Fleet Expansion to {selectedCluster.city} Zone</span>
              </button>

            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Select any high-revenue zone on the map or table to inspect detailed profit-per-trip metrics.
            </div>
          )}
        </div>

      </div>

      {/* CLUSTER PROFITABILITY BENCHMARK TABLE */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Zone Profitability &amp; Yield Benchmark Table</h3>
          </div>
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredClusters.length}</strong> service zones
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">Service Zone Cluster</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Avg Revenue / Trip</th>
                <th className="px-3 py-2 text-right">Avg Profit / Trip</th>
                <th className="px-3 py-2 text-right">30d Trips</th>
                <th className="px-3 py-2 text-right">Total Net Profit</th>
                <th className="px-3 py-2 text-center">EV Margin</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredClusters
                .sort((a, b) => b.avgProfitPerTripKes - a.avgProfitPerTripKes)
                .map((cluster) => {
                  const isSelected = selectedCluster?.id === cluster.id;
                  return (
                    <tr 
                      key={cluster.id} 
                      onClick={() => setSelectedCluster(cluster)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-emerald-950/40 text-white font-semibold' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <td className="px-3 py-2.5 font-bold text-white flex items-center gap-1.5">
                        <MapPin className={`w-3.5 h-3.5 ${cluster.avgProfitPerTripKes >= 2000 ? 'text-red-400' : 'text-emerald-400'}`} />
                        <span>{cluster.name}</span>
                      </td>
                      <td className="px-3 py-2.5">{cluster.city}</td>
                      <td className="px-3 py-2.5 text-slate-400">{cluster.type}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                        KES {cluster.avgRevenuePerTripKes.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-400 text-xs">
                        KES {cluster.avgProfitPerTripKes.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{cluster.totalTrips30d.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-400">
                        KES {(cluster.totalNetProfitKes / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-400">
                        {cluster.evMarginPct}%
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCluster(cluster);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition border border-slate-700 cursor-pointer"
                        >
                          Focus Zone
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
