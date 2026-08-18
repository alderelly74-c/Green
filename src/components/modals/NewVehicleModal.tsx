import React, { useState } from 'react';
import { VehicleCategory, VehicleType, CityRegion } from '../../types';
import { X, Bike, Zap, Fuel } from 'lucide-react';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (vehicleData: any) => void;
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [regNum, setRegNum] = useState('');
  const [make, setMake] = useState('Roam');
  const [model, setModel] = useState('Air Electric Motorcycle');
  const [year, setYear] = useState(2025);
  const [category, setCategory] = useState<VehicleCategory>('Electric');
  const [type, setType] = useState<VehicleType>('Electric Motorcycle');
  const [color, setColor] = useState('Emerald Green');
  const [vin, setVin] = useState(`RM2025KE${Math.floor(1000 + Math.random() * 9000)}`);
  const [city, setCity] = useState<CityRegion>('Nairobi');
  const [purchasePrice, setPurchasePrice] = useState(280000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNum) return;

    onSubmit({
      registrationNumber: regNum.toUpperCase(),
      make,
      model,
      year: Number(year),
      type,
      category,
      color,
      vin,
      city,
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchasePriceKes: Number(purchasePrice),
      currentEstimatedValueKes: Number(purchasePrice),
      ownershipType: 'Purchased',
      odometerKm: 0,
      currentSoCPercent: category === 'Electric' ? 100 : undefined,
      batteryCapacityKwh: category === 'Electric' ? 3.2 : undefined,
      batteryHealthPercent: category === 'Electric' ? 100 : undefined,
      currentFuelLiters: category === 'Fuel' ? 10 : undefined,
      fuelCapacityLiters: category === 'Fuel' ? 12 : undefined,
      currentLocation: {
        lat: -1.2864,
        lng: 36.8232,
        heading: 0,
        speedKmh: 0,
        lastUpdated: new Date().toISOString(),
        address: `${city} Central Depot`
      },
      status: 'Available',
      insurancePolicyNumber: `INS-KE-${Math.floor(10000 + Math.random() * 90000)}`,
      insuranceExpiry: '2027-08-08',
      ntsaInspectionExpiry: '2027-08-08'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Register New Fleet Asset</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Registration Number:</label>
              <input
                type="text"
                required
                placeholder="e.g. KMG 482E"
                value={regNum}
                onChange={(e) => setRegNum(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Operating City:</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as CityRegion)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Nairobi">Nairobi</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Kisumu">Kisumu</option>
                <option value="Nakuru">Nakuru</option>
                <option value="Kiambu">Kiambu</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Asset Category:</label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as VehicleCategory;
                  setCategory(cat);
                  if (cat === 'Electric') {
                    setType('Electric Motorcycle');
                    setMake('Roam');
                    setModel('Air Electric Motorcycle');
                  } else {
                    setType('Fuel Motorcycle');
                    setMake('TVS');
                    setModel('HLX 150 Fuel Boda');
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Electric">⚡ Electric (EV)</option>
                <option value="Fuel">⛽ Fuel (Petrol/Diesel)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Vehicle Type:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as VehicleType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {category === 'Electric' ? (
                  <>
                    <option value="Electric Motorcycle">Electric Motorcycle</option>
                    <option value="Electric Car">Electric Car</option>
                    <option value="Van">Electric Shuttle Van</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                  </>
                ) : (
                  <>
                    <option value="Fuel Motorcycle">Fuel Motorcycle (Boda)</option>
                    <option value="Petrol Car">Petrol Car</option>
                    <option value="Diesel Car">Diesel Car</option>
                    <option value="SUV">SUV</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Make / Brand:</label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Model Name:</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Purchase Price (KES):</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">VIN / Chassis:</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-emerald-950 mt-2"
          >
            Register Asset into Database
          </button>
        </form>

      </div>
    </div>
  );
};
