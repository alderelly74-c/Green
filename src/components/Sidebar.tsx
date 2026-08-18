import React from 'react';
import { 
  LayoutDashboard, Map, Bike, Users, BatteryCharging, 
  Fuel, Wrench, Wallet, FileText, AlertOctagon, 
  Bot, BarChart3, ShieldCheck, MessageSquare, ShieldAlert
} from 'lucide-react';

export type TabType = 
  | 'overview'
  | 'map'
  | 'vehicles'
  | 'drivers'
  | 'messages'
  | 'security'
  | 'ev'
  | 'fuel'
  | 'maintenance'
  | 'finance'
  | 'documents'
  | 'incidents'
  | 'ai'
  | 'reports'
  | 'audit';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  openIncidentsCount: number;
  expiringDocsCount: number;
  pendingMessagesCount?: number;
  maintenanceDueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  openIncidentsCount,
  expiringDocsCount,
  pendingMessagesCount = 0,
  maintenanceDueCount = 0
}) => {
  const menuItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { id: 'overview', label: 'Command Center', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'map', label: 'Live Fleet Map', icon: <Map className="w-4 h-4" /> },
    { id: 'vehicles', label: 'Mixed Fleet Profiles', icon: <Bike className="w-4 h-4" /> },
    { id: 'drivers', label: 'Driver Operations', icon: <Users className="w-4 h-4" /> },
    { 
      id: 'messages', 
      label: 'Driver App Messaging', 
      icon: <MessageSquare className="w-4 h-4" />,
      badge: pendingMessagesCount > 0 ? pendingMessagesCount : undefined,
      badgeColor: 'bg-indigo-600 text-white'
    },
    { 
      id: 'security', 
      label: 'Security & Anomaly Alerts', 
      icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
      badgeColor: 'bg-red-600 text-white font-bold animate-pulse'
    },
    { id: 'ev', label: 'EV Battery & Charging', icon: <BatteryCharging className="w-4 h-4" /> },
    { id: 'fuel', label: 'Fuel & Fraud Audit', icon: <Fuel className="w-4 h-4" /> },
    { 
      id: 'maintenance', 
      label: 'Maintenance & Parts', 
      icon: <Wrench className="w-4 h-4" />,
      badge: maintenanceDueCount > 0 ? maintenanceDueCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold animate-pulse'
    },
    { id: 'finance', label: 'M-Pesa & Financials', icon: <Wallet className="w-4 h-4" /> },
    { 
      id: 'documents', 
      label: 'Document Repository', 
      icon: <FileText className="w-4 h-4" />,
      badge: expiringDocsCount > 0 ? expiringDocsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950'
    },
    { 
      id: 'incidents', 
      label: 'Incidents & SOS', 
      icon: <AlertOctagon className="w-4 h-4" />,
      badge: openIncidentsCount > 0 ? openIncidentsCount : undefined,
      badgeColor: 'bg-red-500 text-white'
    },
    { id: 'ai', label: 'GreenShift Fleet AI', icon: <Bot className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail & Access', icon: <ShieldCheck className="w-4 h-4" /> }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 text-slate-700 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] shadow-2xs">
      <div className="p-3 border-b border-slate-100">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
          Operations Modules
        </div>
      </div>

      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition group ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${item.badgeColor || 'bg-emerald-600 text-white'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Fleet Operating Badge */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-700">Live Telemetry Active</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 font-medium">
          Nairobi Metro • Mombasa • Kisumu
        </p>
      </div>
    </aside>
  );
};
