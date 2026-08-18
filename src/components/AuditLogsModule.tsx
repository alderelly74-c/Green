import React from 'react';
import { AuditLogEntry, UserRole } from '../types';
import { ShieldCheck, Lock, User, Clock, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogsModuleProps {
  auditLogs: AuditLogEntry[];
  currentRole: UserRole;
}

export const AuditLogsModule: React.FC<AuditLogsModuleProps> = ({ auditLogs = [], currentRole = 'Super Admin' }) => {
  const rbacMatrix: { role: UserRole; permissions: string[] }[] = [
    { role: 'Super Admin', permissions: ['Full System Access', 'Role Management', 'Payout Approvals', 'Vehicle Decommissioning'] },
    { role: 'Fleet Manager', permissions: ['Vehicle Assignment', 'Status Updates', 'GPS Tracking', 'Incident Overrides'] },
    { role: 'Finance Manager', permissions: ['M-Pesa B2C Payout Dispatch', 'Financial Audits', 'Fuel Reconciliation'] },
    { role: 'Operations Manager', permissions: ['Trip Dispatch', 'Driver Onboarding', 'Incident Logging'] },
    { role: 'Maintenance Manager', permissions: ['Work Order Creation', 'Spare Parts Stocking', 'Service Sign-off'] },
    { role: 'HR / Admin', permissions: ['Driver Document Verification', 'License Verification', 'Driver Suspension'] }
  ];

  const exportCsv = () => {
    if (auditLogs.length === 0) {
      toast.error('No audit log entries available to export');
      return;
    }
    const headers = "ID,Timestamp,User Name,User Role,Action Performed,Target Entity,IP Address\n";
    const rows = auditLogs.map(log => 
      `"${log.id}","${new Date(log.timestamp).toISOString()}","${log.userName}","${log.userRole}","${(log.action || '').replace(/"/g, '""')}","${(log.targetEntity || '').replace(/"/g, '""')}","${log.ipAddress}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GreenShift_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Audit trail CSV exported for compliance reporting');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">System Audit Trail & Role-Based Access Control (RBAC)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all administrative actions, driver payouts, vehicle assignments, and role permissions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition shadow-md cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 shrink-0">
            Role: {currentRole}
          </div>
        </div>
      </div>

      {/* RBAC Permissions Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-3">Role-Based Access Control (RBAC) Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rbacMatrix.map(r => (
            <div key={r.role} className={`p-3 rounded-lg border text-xs space-y-1 ${
              r.role === currentRole ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="font-bold text-white flex items-center justify-between">
                <span>{r.role}</span>
                {r.role === currentRole && <span className="text-[10px] text-emerald-400 font-bold uppercase">Active</span>}
              </div>
              <ul className="text-slate-400 text-[11px] space-y-0.5 list-disc list-inside">
                {r.permissions.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Live System Audit Logbook</h3>
            <p className="text-xs text-slate-400 mt-0.5">Showing {auditLogs.length} compliance audit events</p>
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Audit Trail CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Action Performed</th>
                <th className="px-4 py-3 font-semibold">Target Entity</th>
                <th className="px-4 py-3 font-semibold">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{log.userName}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-medium text-[10px]">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{log.action}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">{log.targetEntity}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
