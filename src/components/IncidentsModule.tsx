import React from 'react';
import { IncidentReport } from '../types';
import { AlertOctagon, ShieldAlert, Plus, MapPin, CheckCircle2 } from 'lucide-react';

interface IncidentsModuleProps {
  incidents: IncidentReport[];
  onOpenIncidentModal: () => void;
}

export const IncidentsModule: React.FC<IncidentsModuleProps> = ({
  incidents = [],
  onOpenIncidentModal = () => {}
}) => {
  const openIncidents = incidents.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white">Emergency SOS & Incident Management</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time emergency SOS alerts, breakdown reports, accidents, and police OB tracking
          </p>
        </div>

        <button
          onClick={onOpenIncidentModal}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-red-950"
        >
          <Plus className="w-4 h-4" />
          <span>Report Emergency / Incident</span>
        </button>
      </div>

      {/* Active Incidents List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white">Active Safety & Emergency Logbook</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Incident Code</th>
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Driver</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Severity</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incidents.map(inc => (
                <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono font-bold text-red-400">{inc.incidentCode}</td>
                  <td className="px-4 py-3 font-bold text-white">{inc.vehicleReg}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{inc.driverName}</td>
                  <td className="px-4 py-3 text-slate-300">{inc.incidentType}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.severity === 'Critical SOS' ? 'bg-red-500 text-white animate-pulse' :
                      inc.severity === 'Severe' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">📍 {inc.locationName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
