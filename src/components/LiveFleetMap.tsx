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
import { Vehicle, CityRegion, IncidentReport, GeofenceZone, GeofenceViolationAlert } from '../types';
import { 
  Zap, Fuel, MapPin, Battery, Navigation, 
  Search, ShieldAlert, Route, Clock, AlertTriangle,
  Shield, ShieldCheck, X, Settings, Eye, ExternalLink, Key, Sparkles, CheckCircle2
} from 'lucide-react';
import { GeofenceManagerModal } from './modals/GeofenceManagerModal';

interface LiveFleetMapProps {
  vehicles: Vehicle[];
  incidents?: IncidentReport[];
  selectedCity: CityRegion | 'All Cities';
  onSelectVehicle: (v: Vehicle) => void;
  onUpdateStatus: (vehicleId: string, newStatus: any) => void;
}

// Google Maps API Key Resolution
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Initial Kenya Operational Geofences
const INITIAL_GEOFENCES: GeofenceZone[] = [
  {
    id: 'gf-nairobi-cbd',
    name: 'Nairobi CBD Operations Zone',
    type: 'Authorized Area',
    city: 'Nairobi',
    centerLat: -1.286389,
    centerLng: 36.817223,
    radiusMeters: 2500,
    assignedVehicleIds: ['all'],
    active: true,
    colorHex: '#10b981',
    description: 'Core authorized delivery & dispatch perimeter for Nairobi riders.',
    createdAt: '2026-08-01'
  },
  {
    id: 'gf-westlands',
    name: 'Westlands & Kilimani Commercial Hub',
    type: 'Authorized Area',
    city: 'Nairobi',
    centerLat: -1.2780,
    centerLng: 36.8120,
    radiusMeters: 3000,
    assignedVehicleIds: ['all'],
    active: true,
    colorHex: '#3b82f6',
    description: 'High-density EV delivery and battery charging station zone.',
    createdAt: '2026-08-02'
  },
  {
    id: 'gf-industrial',
    name: 'Industrial Area Restricted Depot',
    type: 'Restricted Zone',
    city: 'Nairobi',
    centerLat: -1.3120,
    centerLng: 36.8450,
    radiusMeters: 1200,
    assignedVehicleIds: ['all'],
    active: true,
    colorHex: '#ef4444',
    description: 'Restricted heavy freight yard. Entering triggers level-1 dispatcher security alert.',
    createdAt: '2026-08-03'
  },
  {
    id: 'gf-mombasa-port',
    name: 'Mombasa Port Logistics Hub',
    type: 'Authorized Area',
    city: 'Mombasa',
    centerLat: -4.043477,
    centerLng: 39.668206,
    radiusMeters: 4000,
    assignedVehicleIds: ['all'],
    active: true,
    colorHex: '#10b981',
    description: 'Primary coastal port dispatch & cargo pickup corridor.',
    createdAt: '2026-08-04'
  }
];

// Helper to retrieve breadcrumb GPS points
const getVehicleBreadcrumbs = (v: Vehicle) => {
  if (v.breadcrumbs && v.breadcrumbs.length >= 5) {
    return v.breadcrumbs.slice(-5);
  }

  const currLat = v.currentLocation.lat;
  const currLng = v.currentLocation.lng;
  const heading = v.currentLocation.heading || 45;
  const speed = v.currentLocation.speedKmh || 32;

  const timeOffsets = [12, 9, 6, 3, 0];
  const distFactors = [0.009, 0.0065, 0.0042, 0.002, 0];
  const baseRad = (heading + 180) * (Math.PI / 180);

  return timeOffsets.map((minsAgo, idx) => {
    const factor = distFactors[idx];
    const angleCurve = baseRad + (Math.sin(idx * 0.8) * 0.22);
    const lat = currLat + factor * Math.cos(angleCurve);
    const lng = currLng + factor * Math.sin(angleCurve);
    const ptSpeed = minsAgo === 0 ? speed : Math.max(8, Math.round(speed + Math.sin(idx * 2) * 10));

    return {
      id: `bc-${v.id}-${idx + 1}`,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      timestamp: minsAgo === 0 ? 'Just now (Current)' : `${minsAgo}m ago`,
      speedKmh: ptSpeed,
      address: minsAgo === 0 ? v.currentLocation.address : `Waypoint #${idx + 1} (${minsAgo}m ago)`
    };
  });
};

// Sub-component: Google Maps Circle for Geofences
function GoogleMapsCircle({
  center,
  radiusMeters,
  colorHex,
  isRestricted,
  name,
  description,
  city
}: {
  center: { lat: number; lng: number };
  radiusMeters: number;
  colorHex: string;
  isRestricted: boolean;
  name: string;
  description?: string;
  city: string;
  key?: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    const stroke = isRestricted ? '#ef4444' : (colorHex || '#10b981');
    const fill = isRestricted ? '#ef4444' : (colorHex || '#10b981');

    const circle = new google.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      strokeColor: stroke,
      strokeOpacity: 0.9,
      strokeWeight: isRestricted ? 2.5 : 2,
      fillColor: fill,
      fillOpacity: isRestricted ? 0.20 : 0.12,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family: sans-serif; color: #0f172a; padding: 4px; min-width: 180px;">
          <strong style="font-size: 13px; color: #0f172a;">${name}</strong><br/>
          <div style="font-size: 11px; font-weight: 800; color: ${isRestricted ? '#dc2626' : '#059669'}; margin-top: 2px;">
            ${isRestricted ? '⛔ Restricted Security Zone' : '🛡️ Authorized Operation Zone'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Radius: <strong>${radiusMeters}m</strong> • Region: ${city}
          </div>
          ${description ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">${description}</div>` : ''}
        </div>
      `
    });

    circle.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        infoWindow.setPosition(e.latLng);
        infoWindow.open(map);
      }
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, center.lat, center.lng, radiusMeters, colorHex, isRestricted, name, description, city]);

  return null;
}

// Sub-component: Google Maps Polyline for Breadcrumb Trail
function GoogleMapsPolyline({
  points,
  isEv
}: {
  points: { lat: number; lng: number }[];
  isEv: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;

    const mainColor = isEv ? '#10b981' : '#f59e0b';
    const polyline = new google.maps.Polyline({
      map,
      path: points,
      strokeColor: mainColor,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      geodesic: true
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, points, isEv]);

  return null;
}

// Sub-component: Google Places Search Bar
function GooglePlacesSearch({ onSelectLocation }: { onSelectLocation: (loc: { lat: number; lng: number; address: string }) => void }) {
  const placesLib = useMapsLibrary('places');
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; address: string; location: { lat: number; lng: number } }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!placesLib || !query.trim()) return;
    setIsSearching(true);
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: query,
        fields: ['displayName', 'location', 'formattedAddress'],
        locationBias: map?.getCenter(),
        maxResultCount: 5,
      });

      if (places && places.length > 0) {
        const mapped = places.map(p => ({
          id: p.id,
          name: p.displayName || '',
          address: p.formattedAddress || '',
          location: { lat: p.location?.lat() || 0, lng: p.location?.lng() || 0 }
        })).filter(p => p.location.lat !== 0);
        setResults(mapped);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Google Places search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search Google Places in Kenya..."
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-lg text-xs transition cursor-pointer"
        >
          {isSearching ? '...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onSelectLocation({ ...r.location, address: r.address || r.name });
                setResults([]);
                setQuery('');
              }}
              className="w-full text-left p-2 hover:bg-slate-800 transition block text-xs"
            >
              <div className="font-bold text-white truncate">{r.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{r.address}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-component: Google Map Controller for smooth pan & zoom
function MapController({
  center,
  zoom,
  selectedVehicle
}: {
  center: { lat: number; lng: number };
  zoom: number;
  selectedVehicle: Vehicle | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!map || !selectedVehicle) return;
    map.panTo({
      lat: selectedVehicle.currentLocation.lat,
      lng: selectedVehicle.currentLocation.lng
    });
  }, [map, selectedVehicle?.id]);

  return null;
}

// LEAFLET MAP COMPONENT (Fallback Mode)
const LeafletFleetMapComponent: React.FC<{
  vehicles: Vehicle[];
  incidents: IncidentReport[];
  selectedCity: string;
  filterCategory: string;
  filterStatus: string;
  geofences: GeofenceZone[];
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (v: Vehicle) => void;
  onSelectVehicle: (v: Vehicle) => void;
  cityCoordinates: Record<string, [number, number]>;
}> = ({
  vehicles,
  incidents,
  selectedCity,
  filterCategory,
  filterStatus,
  geofences,
  selectedVehicle,
  setSelectedVehicle,
  onSelectVehicle,
  cityCoordinates
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<L.Map | null>(null);
  const markersLayerGroup = useRef<L.LayerGroup | null>(null);
  const breadcrumbsLayerGroup = useRef<L.LayerGroup | null>(null);
  const incidentsLayerGroup = useRef<L.LayerGroup | null>(null);
  const geofencesLayerGroup = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapInstance.current) {
      const initialCoords = cityCoordinates[selectedCity] || cityCoordinates['Nairobi'];
      const map = L.map(mapRef.current, {
        center: initialCoords,
        zoom: 13,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      geofencesLayerGroup.current = L.layerGroup().addTo(map);
      markersLayerGroup.current = L.layerGroup().addTo(map);
      breadcrumbsLayerGroup.current = L.layerGroup().addTo(map);
      incidentsLayerGroup.current = L.layerGroup().addTo(map);
      leafletMapInstance.current = map;
    }

    const coords = cityCoordinates[selectedCity];
    if (coords && leafletMapInstance.current) {
      leafletMapInstance.current.setView(coords, selectedCity === 'All Cities' ? 11 : 13);
    }
  }, [selectedCity]);

  // Geofences on Leaflet
  useEffect(() => {
    if (!leafletMapInstance.current || !geofencesLayerGroup.current) return;
    geofencesLayerGroup.current.clearLayers();

    geofences.filter(g => g.active && (selectedCity === 'All Cities' || g.city === selectedCity)).forEach(g => {
      const isRestricted = g.type === 'Restricted Zone';
      const strokeColor = isRestricted ? '#ef4444' : (g.colorHex || '#10b981');
      const circle = L.circle([g.centerLat, g.centerLng], {
        radius: g.radiusMeters,
        color: strokeColor,
        fillColor: strokeColor,
        fillOpacity: isRestricted ? 0.20 : 0.12,
        weight: isRestricted ? 2.5 : 2,
        dashArray: isRestricted ? '6, 6' : undefined
      });
      geofencesLayerGroup.current?.addLayer(circle);
    });
  }, [geofences, selectedCity]);

  // Vehicle Markers on Leaflet
  useEffect(() => {
    if (!leafletMapInstance.current || !markersLayerGroup.current) return;
    markersLayerGroup.current.clearLayers();

    const filtered = vehicles.filter(v => {
      if (selectedCity !== 'All Cities' && v.city !== selectedCity) return false;
      if (filterCategory !== 'All' && v.category !== filterCategory) return false;
      if (filterStatus !== 'All' && v.status !== filterStatus) return false;
      return true;
    });

    filtered.forEach(v => {
      const isEv = v.category === 'Electric';
      const colorHex = isEv ? '#10b981' : '#f59e0b';
      const customIcon = L.divIcon({
        className: 'custom-fleet-marker',
        html: `<div style="background-color: ${colorHex}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid #0f172a; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; cursor: pointer; color: #0f172a;">${isEv ? '⚡' : '⛽'}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([v.currentLocation.lat, v.currentLocation.lng], { icon: customIcon });
      marker.on('click', () => {
        setSelectedVehicle(v);
        onSelectVehicle(v);
      });
      markersLayerGroup.current?.addLayer(marker);
    });
  }, [vehicles, selectedCity, filterCategory, filterStatus]);

  // Breadcrumbs on Leaflet
  useEffect(() => {
    if (!leafletMapInstance.current || !breadcrumbsLayerGroup.current || !selectedVehicle) return;
    breadcrumbsLayerGroup.current.clearLayers();

    const points = getVehicleBreadcrumbs(selectedVehicle);
    const isEv = selectedVehicle.category === 'Electric';
    const mainColor = isEv ? '#10b981' : '#f59e0b';
    const latLngs = points.map(pt => [pt.lat, pt.lng] as [number, number]);

    const polyline = L.polyline(latLngs, { color: mainColor, weight: 4, opacity: 0.9, dashArray: '8, 8' });
    breadcrumbsLayerGroup.current.addLayer(polyline);

    if (latLngs.length > 0) {
      leafletMapInstance.current.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60], maxZoom: 15 });
    }
  }, [selectedVehicle]);

  return <div ref={mapRef} className="w-full h-[540px] z-10" />;
};

export const LiveFleetMap: React.FC<LiveFleetMapProps> = ({
  vehicles = [],
  incidents = [],
  selectedCity = 'All Cities',
  onSelectVehicle = (_v?: any) => {},
  onUpdateStatus = (_vehicleId?: any, _newStatus?: any) => {}
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(vehicles[0] || null);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Electric' | 'Fuel'>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [useLeafletFallback, setUseLeafletFallback] = useState<boolean>(!hasValidKey);
  const [activeInfoWindowVehicleId, setActiveInfoWindowVehicleId] = useState<string | null>(null);

  // Geofences state
  const [geofences, setGeofences] = useState<GeofenceZone[]>(INITIAL_GEOFENCES);
  const [geofenceAlerts, setGeofenceAlerts] = useState<GeofenceViolationAlert[]>([
    {
      id: 'alert-initial-demo',
      vehicleId: vehicles[0]?.id || 'v-1',
      vehicleReg: vehicles[0]?.registrationNumber || 'KMG 482E',
      driverName: vehicles[0]?.assignedDriverName || 'Juma Omondi',
      driverPhone: vehicles[0]?.assignedDriverPhone || '+254712345678',
      geofenceId: 'gf-industrial',
      geofenceName: 'Industrial Area Restricted Zone',
      geofenceType: 'Restricted Zone',
      violationType: 'Entered Restricted Zone',
      lat: -1.3120,
      lng: 36.8450,
      locationAddress: 'Industrial Area Depot, Enterprise Rd, Nairobi',
      distanceOffsetMeters: 280,
      timestamp: '2 mins ago',
      acknowledged: false
    }
  ]);
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);

  // City center coordinates
  const cityCoordinates: Record<string, [number, number]> = {
    Nairobi: [-1.286389, 36.817223],
    Mombasa: [-4.043477, 39.668206],
    Kisumu: [-0.091702, 34.767956],
    Nakuru: [-0.303099, 36.080025],
    Kiambu: [-1.171389, 36.835556],
    'All Cities': [-1.286389, 36.817223]
  };

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: cityCoordinates[selectedCity]?.[0] || -1.286389,
    lng: cityCoordinates[selectedCity]?.[1] || 36.817223
  });
  const [mapZoom, setMapZoom] = useState<number>(selectedCity === 'All Cities' ? 11 : 13);

  useEffect(() => {
    const coords = cityCoordinates[selectedCity] || cityCoordinates['Nairobi'];
    setMapCenter({ lat: coords[0], lng: coords[1] });
    setMapZoom(selectedCity === 'All Cities' ? 11 : 13);
  }, [selectedCity]);

  const filteredVehicles = vehicles.filter(v => {
    if (selectedCity !== 'All Cities' && v.city !== selectedCity) return false;
    if (filterCategory !== 'All' && v.category !== filterCategory) return false;
    if (filterStatus !== 'All' && v.status !== filterStatus) return false;
    return true;
  });

  const activeGeofences = geofences.filter(g => g.active && (selectedCity === 'All Cities' || g.city === selectedCity));
  const activeGeofencesCount = activeGeofences.length;
  const unacknowledgedAlerts = geofenceAlerts.filter(a => !a.acknowledged);
  const activeAlertBanner = unacknowledgedAlerts[0] || null;

  const handleSaveGeofence = (zone: GeofenceZone) => {
    setGeofences(prev => {
      const idx = prev.findIndex(g => g.id === zone.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = zone;
        return next;
      }
      return [zone, ...prev];
    });
  };

  const handleDeleteGeofence = (id: string) => {
    setGeofences(prev => prev.filter(g => g.id !== id));
  };

  const handleToggleGeofenceActive = (id: string) => {
    setGeofences(prev => prev.map(g => g.id === id ? { ...g, active: !g.active } : g));
  };

  const handleSimulateViolation = (newAlert: GeofenceViolationAlert) => {
    setGeofenceAlerts(prev => [newAlert, ...prev]);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setGeofenceAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative">

      {/* GEOFENCE VIOLATION NOTIFICATION BANNER */}
      {activeAlertBanner && (
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 border-2 border-red-500 rounded-2xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-600/30 border border-red-500 rounded-xl text-red-400 shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    🚨 INSTANT GEOFENCE BREACH DETECTED
                  </span>
                  <span className="text-xs font-mono text-slate-400">{activeAlertBanner.timestamp}</span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-1">
                  Vehicle <span className="text-red-400 font-mono">{activeAlertBanner.vehicleReg}</span> ({activeAlertBanner.driverName}) — {activeAlertBanner.violationType}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Location: <strong className="text-white">{activeAlertBanner.geofenceName}</strong> ({activeAlertBanner.locationAddress}). Offset: <span className="text-amber-400 font-mono font-bold">+{activeAlertBanner.distanceOffsetMeters}m</span> beyond perimeter.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                onClick={() => {
                  setMapCenter({ lat: activeAlertBanner.lat, lng: activeAlertBanner.lng });
                  setMapZoom(16);
                  const matchingV = vehicles.find(v => v.id === activeAlertBanner.vehicleId || v.registrationNumber === activeAlertBanner.vehicleReg);
                  if (matchingV) setSelectedVehicle(matchingV);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Focus Map</span>
              </button>

              <button
                onClick={() => setIsGeofenceModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>Configure Zones</span>
              </button>

              <button
                onClick={() => handleAcknowledgeAlert(activeAlertBanner.id)}
                className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Acknowledge Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER & CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Google Maps Live Fleet GPS Command Center</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time tracking for {vehicles.length} mixed fleet vehicles across {selectedCity === 'All Cities' ? 'Kenya' : selectedCity}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Map Engine Toggle */}
          <button
            onClick={() => setUseLeafletFallback(!useLeafletFallback)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Map Engine: {useLeafletFallback ? 'Leaflet Mode' : 'Google Maps Platform'}</span>
          </button>

          <button
            onClick={() => setIsGeofenceModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition shadow relative cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Geofences ({activeGeofencesCount})</span>
            {unacknowledgedAlerts.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute -top-1 -right-1" />
            )}
          </button>

          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setFilterCategory('All')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${filterCategory === 'All' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterCategory('Electric')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${filterCategory === 'Electric' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              ⚡ EV Only
            </button>
            <button
              onClick={() => setFilterCategory('Fuel')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${filterCategory === 'Fuel' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              ⛽ Fuel Only
            </button>
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="On Trip">On Trip</option>
              <option value="Online">Online / Available</option>
              <option value="Charging">Charging / Swapping</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Idle">Idle</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAP + SIDE INSPECTOR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAP CANVAS CONTAINER */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative min-h-[540px]">
          
          {!hasValidKey && !useLeafletFallback ? (
            /* GOOGLE MAPS API KEY SPLASH SCREEN (Constitution Requirement) */
            <div className="flex flex-col items-center justify-center h-[540px] p-6 text-center bg-slate-950 text-slate-200">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-4">
                <Key className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-xl font-extrabold text-white mb-2">Google Maps Platform API Key Required</h2>
              <p className="text-xs text-slate-400 max-w-md mb-6">
                To unlock full Google Maps vector rendering, Google Places search &amp; route compute, please configure your API key secret in AI Studio.
              </p>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left max-w-md w-full text-xs space-y-2 mb-6">
                <div className="font-bold text-emerald-400 uppercase text-[10px]">Setup Instructions:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Get an API key from Google Cloud Console.</li>
                  <li>When prompted or via <strong>Settings (⚙️)</strong> &rarr; <strong>Secrets</strong>, add secret name <code>GOOGLE_MAPS_PLATFORM_KEY</code>.</li>
                  <li>Paste your API key value and press <strong>Enter</strong>.</li>
                  <li>The app rebuilds automatically with Google Maps active!</li>
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
                  onClick={() => setUseLeafletFallback(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Preview Map in Leaflet Mode
                </button>
              </div>
            </div>
          ) : useLeafletFallback ? (
            /* LEAFLET FALLBACK MODE */
            <LeafletFleetMapComponent
              vehicles={vehicles}
              incidents={incidents}
              selectedCity={selectedCity}
              filterCategory={filterCategory}
              filterStatus={filterStatus}
              geofences={geofences}
              selectedVehicle={selectedVehicle}
              setSelectedVehicle={setSelectedVehicle}
              onSelectVehicle={onSelectVehicle}
              cityCoordinates={cityCoordinates}
            />
          ) : (
            /* GOOGLE MAPS PLATFORM MODE */
            <APIProvider apiKey={API_KEY} version="weekly">
              <div className="relative w-full h-[540px]">
                {/* Search Bar Overlay */}
                <div className="absolute top-3 left-3 z-30 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-xl">
                  <GooglePlacesSearch
                    onSelectLocation={(loc) => {
                      setMapCenter({ lat: loc.lat, lng: loc.lng });
                      setMapZoom(15);
                    }}
                  />
                </div>

                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={mapZoom}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '540px' }}
                >
                  {/* Active Geofence Circles */}
                  {activeGeofences.map(g => (
                    <GoogleMapsCircle
                      key={g.id}
                      center={{ lat: g.centerLat, lng: g.centerLng }}
                      radiusMeters={g.radiusMeters}
                      colorHex={g.colorHex}
                      isRestricted={g.type === 'Restricted Zone'}
                      name={g.name}
                      description={g.description}
                      city={g.city}
                    />
                  ))}

                  {/* Vehicle Markers */}
                  {filteredVehicles.map(v => {
                    const isEv = v.category === 'Electric';
                    const markerColor = isEv ? '#10b981' : '#f59e0b';
                    return (
                      <React.Fragment key={v.id}>
                        <AdvancedMarker
                          position={{ lat: v.currentLocation.lat, lng: v.currentLocation.lng }}
                          title={`${v.registrationNumber} (${v.make} ${v.model})`}
                          onClick={() => {
                            setSelectedVehicle(v);
                            onSelectVehicle(v);
                            setActiveInfoWindowVehicleId(v.id);
                          }}
                        >
                          <Pin
                            background={markerColor}
                            borderColor="#0f172a"
                            glyph={isEv ? '⚡' : '⛽'}
                            glyphColor="#0f172a"
                          />
                        </AdvancedMarker>

                        {activeInfoWindowVehicleId === v.id && (
                          <InfoWindow
                            position={{ lat: v.currentLocation.lat, lng: v.currentLocation.lng }}
                            onCloseClick={() => setActiveInfoWindowVehicleId(null)}
                          >
                            <div className="p-1 font-sans text-slate-900 text-xs">
                              <strong className="text-sm font-bold block">{v.registrationNumber}</strong>
                              <span className="text-slate-600 block">{v.make} {v.model} ({v.year})</span>
                              <div className="mt-1 font-bold text-emerald-600">Status: {v.status}</div>
                              <div className="text-slate-500">
                                {isEv ? `Battery: ${v.currentSoCPercent}%` : `Fuel: ${v.currentFuelLiters}L`}
                              </div>
                            </div>
                          </InfoWindow>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Breadcrumb Trail Polyline for Selected Vehicle */}
                  {selectedVehicle && (
                    <GoogleMapsPolyline
                      points={getVehicleBreadcrumbs(selectedVehicle).map(p => ({ lat: p.lat, lng: p.lng }))}
                      isEv={selectedVehicle.category === 'Electric'}
                    />
                  )}

                  {/* Incident Markers */}
                  {incidents.filter(i => i.status !== 'Closed').map(inc => {
                    const isCritical = inc.severity === 'Critical SOS' || inc.severity === 'Severe';
                    const lat = inc.lat || -1.286389;
                    const lng = inc.lng || 36.817223;
                    return (
                      <AdvancedMarker key={inc.id} position={{ lat, lng }}>
                        <Pin
                          background={isCritical ? '#ef4444' : '#f59e0b'}
                          borderColor="#0f172a"
                          glyph="🚨"
                          glyphColor="#ffffff"
                        />
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </div>
            </APIProvider>
          )}

          {/* Map Overlay Badge */}
          <div className="absolute top-3 right-3 z-20 bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 backdrop-blur-md text-[11px] text-slate-300 space-y-1.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">
                {useLeafletFallback ? 'Leaflet Engine Active' : 'Google Maps Platform Active'}
              </span>
            </div>
            
            <div className="text-[10px] text-indigo-400 flex items-center gap-1 font-mono font-bold pt-1 border-t border-slate-800">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>{activeGeofencesCount} Geofences Active</span>
            </div>

            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <Route className="w-3 h-3 text-emerald-400" />
              <span>5-Point Breadcrumbs Enabled</span>
            </div>
          </div>
        </div>

        {/* VEHICLE INSPECTOR CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          {selectedVehicle ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">{selectedVehicle.category} Asset</span>
                  <h3 className="text-xl font-black text-white">{selectedVehicle.registrationNumber}</h3>
                  <p className="text-xs text-slate-400">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedVehicle.status === 'On Trip' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  selectedVehicle.status === 'Charging' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {selectedVehicle.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 font-medium">Assigned Driver / Rider:</div>
                  <div className="font-bold text-white text-sm mt-0.5">{selectedVehicle.assignedDriverName || 'Unassigned'}</div>
                  <div className="text-slate-400 text-[11px]">{selectedVehicle.assignedDriverPhone}</div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 font-medium">Current GPS Location:</div>
                  <div className="font-semibold text-slate-200 mt-0.5">📍 {selectedVehicle.currentLocation.address}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Speed: {selectedVehicle.currentLocation.speedKmh} km/h</span>
                    <span>Updated: Just now</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Energy / Fuel Status</div>
                    {selectedVehicle.category === 'Electric' ? (
                      <div className="text-base font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Battery className="w-4 h-4" />
                        <span>{selectedVehicle.currentSoCPercent}% SoC</span>
                      </div>
                    ) : (
                      <div className="text-base font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                        <Fuel className="w-4 h-4" />
                        <span>{selectedVehicle.currentFuelLiters} L</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Net Profit Generated</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      KES {selectedVehicle.netProfitKes.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Historical Breadcrumb Points */}
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Route className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Breadcrumb Trail (Last 5 Points)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {getVehicleBreadcrumbs(selectedVehicle).map((pt, idx) => (
                      <div 
                        key={pt.id}
                        onClick={() => setMapCenter({ lat: pt.lat, lng: pt.lng })}
                        className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white">{pt.timestamp}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}</div>
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-emerald-400">{pt.speedKmh} km/h</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Change Asset Status:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateStatus(selectedVehicle.id, 'On Trip')}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Set On Trip
                  </button>
                  <button
                    onClick={() => onUpdateStatus(selectedVehicle.id, 'Charging')}
                    className="bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Set Charging
                  </button>
                  <button
                    onClick={() => onUpdateStatus(selectedVehicle.id, 'Under Maintenance')}
                    className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Set Maintenance
                  </button>
                  <button
                    onClick={() => onUpdateStatus(selectedVehicle.id, 'Available')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Set Available
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select any vehicle marker on the map to inspect live metrics.
            </div>
          )}
        </div>

      </div>

      <GeofenceManagerModal
        isOpen={isGeofenceModalOpen}
        onClose={() => setIsGeofenceModalOpen(false)}
        geofences={geofences}
        vehicles={vehicles}
        onSaveGeofence={handleSaveGeofence}
        onDeleteGeofence={handleDeleteGeofence}
        onToggleGeofenceActive={handleToggleGeofenceActive}
        onSimulateViolation={handleSimulateViolation}
      />

    </div>
  );
};
