import React, { useState, useEffect } from 'react';
import { Vehicle, Driver } from '../../types';
import { X, Fuel } from 'lucide-react';

interface RecordFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  preselectedVehicle?: Vehicle | null;
  preselectedDriver?: Driver | null;
  onSubmit: (fuelData: any) => void;
}

export const RecordFuelModal: React.FC<RecordFuelModalProps> = ({
  isOpen,
  onClose,
  vehicles = [],
  drivers = [],
  preselectedVehicle,
  preselectedDriver,
  onSubmit
}) => {
  const fuelVehicles = vehicles.filter(v => v.category === 'Fuel');

  const [vehicleId, setVehicleId] = useState(preselectedVehicle?.id || fuelVehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(preselectedDriver?.id || drivers[0]?.id || '');
  const [stationName, setStationName] = useState('Rubis Westlands');
  const [fuelType, setFuelType] = useState<'Super Petrol' | 'Diesel'>('Super Petrol');
  const [liters, setLiters] = useState(12);
  const [pricePerLiter, setPricePerLiter] = useState(198.5);
  const [odometerKm, setOdometerKm] = useState(14500);
  const [receiptNo, setReceiptNo] = useState(`RUB-${Math.floor(10000 + Math.random() * 90000)}`);

  useEffect(() => {
    if (preselectedVehicle) {
      setVehicleId(preselectedVehicle.id);
    } else if (fuelVehicles.length > 0 && !vehicleId) {
      setVehicleId(fuelVehicles[0].id);
    }
    if (preselectedDriver) {
      setDriverId(preselectedDriver.id);
    } else if (drivers.length > 0 && !driverId) {
      setDriverId(drivers[0].id);
    }
  }, [preselectedVehicle, preselectedDriver, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = vehicles.find(veh => veh.id === vehicleId);
    const d = drivers.find(dr => dr.id === driverId);

    const totalCost = Number(liters) * Number(pricePerLiter);

    onSubmit({
      vehicleId,
      vehicleReg: v?.registrationNumber || 'Unknown',
      driverId,
      driverName: d?.fullName || 'Unknown',
      stationName,
      fuelType,
      liters: Number(liters),
      pricePerLiterKes: Number(pricePerLiter),
      totalCostKes: totalCost,
      odometerReadingKm: Number(odometerKm),
      receiptNumber: receiptNo,
      calculatedKmPerLiter: 26.5
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Record Fuel Transaction</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Select Fuel Vehicle:</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {fuelVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make} {v.model})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Select Driver:</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Fuel Station Name:</label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Fuel Type:</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Super Petrol">Super Petrol</option>
                <option value="Diesel">Diesel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Liters Pumped:</label>
              <input
                type="number"
                value={liters}
                onChange={(e) => setLiters(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Price per Liter (KES):</label>
              <input
                type="number"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Receipt Number:</label>
            <input
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-amber-950 mt-2"
          >
            Record Fuel Fill-Up & Audit
          </button>
        </form>

      </div>
    </div>
  );
};
