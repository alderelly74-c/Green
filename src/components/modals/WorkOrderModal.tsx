import React, { useState, useEffect } from 'react';
import { Vehicle } from '../../types';
import { X, Wrench } from 'lucide-react';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  preselectedVehicle?: Vehicle | null;
  onSubmit: (workOrderData: any) => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  isOpen,
  onClose,
  vehicles = [],
  preselectedVehicle,
  onSubmit
}) => {
  const [vehicleId, setVehicleId] = useState(preselectedVehicle?.id || vehicles[0]?.id || '');
  const [serviceType, setServiceType] = useState('Brake Pad Replacement & Chain Lube');
  const [workshopName, setWorkshopName] = useState('Central Nairobi Workshop');
  const [mechanicName, setMechanicName] = useState('Juma Mechanics');
  const [priority, setPriority] = useState<'Routine' | 'High' | 'Emergency'>('Routine');
  const [laborCost, setLaborCost] = useState(1500);

  useEffect(() => {
    if (preselectedVehicle) {
      setVehicleId(preselectedVehicle.id);
    } else if (vehicles.length > 0 && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [preselectedVehicle, isOpen, vehicles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = vehicles.find(veh => veh.id === vehicleId);

    onSubmit({
      vehicleId,
      vehicleReg: v?.registrationNumber || 'Unknown',
      vehicleModel: `${v?.make} ${v?.model}`,
      serviceType,
      workshopName,
      mechanicName,
      priority,
      status: 'In Progress',
      partsUsed: [
        { partName: 'Front Brake Pads', partNumber: 'BP-ROAM-01', quantity: 1, unitCostKes: 1800 }
      ],
      laborCostKes: Number(laborCost),
      totalCostKes: Number(laborCost) + 1800
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Create Maintenance Work Order</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Select Fleet Vehicle:</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make} {v.model})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Service Type:</label>
            <input
              type="text"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Workshop Name:</label>
              <input
                type="text"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Mechanic Name:</label>
              <input
                type="text"
                value={mechanicName}
                onChange={(e) => setMechanicName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Priority Level:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Routine">Routine</option>
                <option value="High">High Priority</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Labor Cost (KES):</label>
              <input
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition shadow-lg shadow-emerald-950 mt-2"
          >
            Issue Work Order & Lock Asset
          </button>
        </form>

      </div>
    </div>
  );
};
