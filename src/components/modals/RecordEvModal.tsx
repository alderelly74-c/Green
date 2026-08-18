import React, { useState, useEffect } from 'react';
import { Vehicle } from '../../types';
import { X, BatteryCharging, Zap } from 'lucide-react';

interface RecordEvModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  preselectedVehicle?: Vehicle | null;
  onSubmit: (evData: any) => void;
}

export const RecordEvModal: React.FC<RecordEvModalProps> = ({
  isOpen,
  onClose,
  vehicles = [],
  preselectedVehicle,
  onSubmit
}) => {
  const evVehicles = vehicles.filter(v => v.category === 'Electric');

  const [vehicleId, setVehicleId] = useState(preselectedVehicle?.id || evVehicles[0]?.id || '');
  const [stationName, setStationName] = useState('Roam Hub Kilimani');
  const [startSoC, setStartSoC] = useState(15);
  const [endSoC, setEndSoC] = useState(100);
  const [energyKwh, setEnergyKwh] = useState(3.2);
  const [costKes, setCostKes] = useState(350);
  const [duration, setDuration] = useState(15);
  const [operator, setOperator] = useState('Roam Hub Kenya');

  useEffect(() => {
    if (preselectedVehicle) {
      setVehicleId(preselectedVehicle.id);
    } else if (evVehicles.length > 0 && !vehicleId) {
      setVehicleId(evVehicles[0].id);
    }
  }, [preselectedVehicle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = vehicles.find(veh => veh.id === vehicleId);

    onSubmit({
      vehicleId,
      vehicleReg: v?.registrationNumber || 'Unknown',
      stationName,
      batteryPackId: `BAT-ROAM-${Math.floor(100 + Math.random() * 900)}`,
      startSoCPercent: Number(startSoC),
      endSoCPercent: Number(endSoC),
      energyKwhConsumed: Number(energyKwh),
      costKes: Number(costKes),
      durationMinutes: Number(duration),
      operatorName: operator
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Record EV Charging / Battery Swap</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Select Electric Vehicle (EV):</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {evVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make} {v.model})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Station Hub Name:</label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Station Operator:</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Start SoC (%):</label>
              <input
                type="number"
                value={startSoC}
                onChange={(e) => setStartSoC(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">End SoC (%):</label>
              <input
                type="number"
                value={endSoC}
                onChange={(e) => setEndSoC(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Energy Consumed (kWh):</label>
              <input
                type="number"
                value={energyKwh}
                onChange={(e) => setEnergyKwh(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Total Cost (KES):</label>
              <input
                type="number"
                value={costKes}
                onChange={(e) => setCostKes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-emerald-950 mt-2"
          >
            Log Battery Swap Session
          </button>
        </form>

      </div>
    </div>
  );
};
