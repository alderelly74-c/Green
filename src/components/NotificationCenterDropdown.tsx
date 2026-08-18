import React, { useState, useMemo, useRef, useEffect } from 'react';
import { VehicleDocument, Vehicle, Driver } from '../types';
import { 
  Bell, ShieldAlert, FileText, Calendar, ExternalLink, Eye, 
  CheckCircle2, AlertTriangle, ChevronRight, X, ShieldCheck, 
  Award, Building, ArrowRight, Sparkles, Filter
} from 'lucide-react';

interface NotificationCenterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  documents?: VehicleDocument[];
  vehicles?: Vehicle[];
  drivers?: Driver[];
  onSelectDocument: (doc: VehicleDocument) => void;
  onNavigateToVault: () => void;
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  isOpen,
  onClose,
  documents = [],
  vehicles = [],
  drivers = [],
  onSelectDocument,
  onNavigateToVault
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'INSURANCE' | 'NTSA'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Combine and deduplicate documents expiring within 7 days (or currently expired / <= 7 days)
  const expiringComplianceItems = useMemo<VehicleDocument[]>(() => {
    const list: VehicleDocument[] = [];
    const seenDocNumbers = new Set<string>();

    // 1. Process documents from documents state
    documents.forEach(doc => {
      const typeLower = doc.documentType.toLowerCase();
      const isInsurance = typeLower.includes('insurance');
      const isNtsa = typeLower.includes('ntsa') || typeLower.includes('license') || typeLower.includes('psv') || typeLower.includes('logbook');

      if ((isInsurance || isNtsa) && doc.daysUntilExpiry <= 7) {
        list.push(doc);
        seenDocNumbers.add(doc.documentNumber);
      }
    });

    // 2. Fail-safe: Check vehicles for insurance & NTSA inspection dates if not represented
    vehicles.forEach(v => {
      // Vehicle Insurance
      if (v.insuranceExpiry && !seenDocNumbers.has(v.insurancePolicyNumber)) {
        // Calculate days until expiry relative to reference 2026-08-13
        const expiryTime = new Date(v.insuranceExpiry).getTime();
        const refTime = new Date('2026-08-13T00:00:00Z').getTime();
        const days = Math.ceil((expiryTime - refTime) / (1000 * 60 * 60 * 24));

        if (days <= 7) {
          list.push({
            id: `v-ins-${v.id}`,
            entityType: 'Vehicle',
            entityId: v.id,
            entityName: v.registrationNumber,
            documentType: 'Comprehensive Insurance',
            documentNumber: v.insurancePolicyNumber || `GA-POL-${v.registrationNumber.replace(/\s+/g, '')}`,
            issueDate: '2025-08-16',
            expiryDate: v.insuranceExpiry,
            verificationStatus: 'Verified',
            daysUntilExpiry: Math.max(0, days),
            fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=60'
          });
          seenDocNumbers.add(v.insurancePolicyNumber);
        }
      }

      // NTSA Inspection
      if (v.ntsaInspectionExpiry) {
        const expiryTime = new Date(v.ntsaInspectionExpiry).getTime();
        const refTime = new Date('2026-08-13T00:00:00Z').getTime();
        const days = Math.ceil((expiryTime - refTime) / (1000 * 60 * 60 * 24));

        if (days <= 7) {
          const docNum = `NTSA-INS-${v.registrationNumber.replace(/\s+/g, '')}`;
          if (!seenDocNumbers.has(docNum)) {
            list.push({
              id: `v-ntsa-${v.id}`,
              entityType: 'Vehicle',
              entityId: v.id,
              entityName: v.registrationNumber,
              documentType: 'NTSA Inspection',
              documentNumber: docNum,
              issueDate: '2025-08-15',
              expiryDate: v.ntsaInspectionExpiry,
              verificationStatus: 'Verified',
              daysUntilExpiry: Math.max(0, days),
              fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60'
            });
            seenDocNumbers.add(docNum);
          }
        }
      }
    });

    // 3. Fail-safe: Check drivers for driving licenses & PSV badges
    drivers.forEach(d => {
      // Driving License
      if (d.licenseExpiry) {
        const expiryTime = new Date(d.licenseExpiry).getTime();
        const refTime = new Date('2026-08-13T00:00:00Z').getTime();
        const days = Math.ceil((expiryTime - refTime) / (1000 * 60 * 60 * 24));

        if (days <= 7 && !seenDocNumbers.has(d.drivingLicenseNumber)) {
          list.push({
            id: `d-dl-${d.id}`,
            entityType: 'Driver',
            entityId: d.id,
            entityName: d.fullName,
            documentType: 'Driving License',
            documentNumber: d.drivingLicenseNumber || `DL-KE-${d.nationalId}`,
            issueDate: '2023-08-17',
            expiryDate: d.licenseExpiry,
            verificationStatus: 'Verified',
            daysUntilExpiry: Math.max(0, days),
            fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'
          });
          seenDocNumbers.add(d.drivingLicenseNumber);
        }
      }

      // PSV Badge
      if (d.psvExpiry && d.psvBadgeNumber) {
        const expiryTime = new Date(d.psvExpiry).getTime();
        const refTime = new Date('2026-08-13T00:00:00Z').getTime();
        const days = Math.ceil((expiryTime - refTime) / (1000 * 60 * 60 * 24));

        if (days <= 7 && !seenDocNumbers.has(d.psvBadgeNumber)) {
          list.push({
            id: `d-psv-${d.id}`,
            entityType: 'Driver',
            entityId: d.id,
            entityName: d.fullName,
            documentType: 'PSV Badge',
            documentNumber: d.psvBadgeNumber,
            issueDate: '2025-08-14',
            expiryDate: d.psvExpiry,
            verificationStatus: 'Verified',
            daysUntilExpiry: Math.max(0, days),
            fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60'
          });
          seenDocNumbers.add(d.psvBadgeNumber);
        }
      }
    });

    // Sort by most urgent (fewest days until expiry) first
    return list.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, [documents, vehicles, drivers]);

  if (!isOpen) return null;

  // Tab Filter
  const insuranceItems = expiringComplianceItems.filter(item => 
    item.documentType.toLowerCase().includes('insurance')
  );
  const ntsaItems = expiringComplianceItems.filter(item => 
    !item.documentType.toLowerCase().includes('insurance')
  );

  const displayedItems = activeTab === 'INSURANCE' 
    ? insuranceItems 
    : activeTab === 'NTSA' 
    ? ntsaItems 
    : expiringComplianceItems;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Dropdown Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              7-Day Compliance Expiry Alerts
            </h4>
            <p className="text-[11px] text-slate-400">
              Insurance Policies & NTSA Licenses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-slate-950 font-black text-[10px] font-mono px-2 py-0.5 rounded-full">
            {expiringComplianceItems.length} Urgent
          </span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1 text-[11px]">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex-1 py-1 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
            activeTab === 'ALL'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All ({expiringComplianceItems.length})
        </button>

        <button
          onClick={() => setActiveTab('INSURANCE')}
          className={`flex-1 py-1 px-2 rounded-lg font-bold transition cursor-pointer text-center flex items-center justify-center gap-1 ${
            activeTab === 'INSURANCE'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Insurance ({insuranceItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('NTSA')}
          className={`flex-1 py-1 px-2 rounded-lg font-bold transition cursor-pointer text-center flex items-center justify-center gap-1 ${
            activeTab === 'NTSA'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>NTSA ({ntsaItems.length})</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-2">
        {displayedItems.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-slate-200">All Fleet Policies & NTSA Licenses Compliant!</p>
            <p className="text-[11px] text-slate-500">
              No insurance policies or NTSA licenses are expiring within the next 7 days.
            </p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const isInsurance = item.documentType.toLowerCase().includes('insurance');
            const isCritical = item.daysUntilExpiry <= 3;

            return (
              <div 
                key={item.id}
                className="p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 rounded-xl transition-all space-y-2 group"
              >
                {/* Item Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg border shrink-0 ${
                      isInsurance 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    }`}>
                      {isInsurance ? <ShieldAlert className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-white leading-snug">
                        {item.documentType}
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.entityName} ({item.entityType})
                      </span>
                    </div>
                  </div>

                  {/* Days remaining badge */}
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                    isCritical 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    <span>{item.daysUntilExpiry === 0 ? 'Expires Today' : `${item.daysUntilExpiry}d left`}</span>
                  </span>
                </div>

                {/* Serial & Authority Subtitle */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono bg-slate-900/90 px-2 py-1 rounded-md">
                  <span>Serial: <strong className="text-slate-200">{item.documentNumber}</strong></span>
                  <span>Expires: <strong className="text-amber-300">{item.expiryDate}</strong></span>
                </div>

                {/* Direct Action Links */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {isInsurance ? 'IRA Insurance Policy' : 'NTSA Official License'}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* DIRECT LINK TO DOCUMENT */}
                    <button
                      onClick={() => {
                        onClose();
                        onSelectDocument(item);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Document</span>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToVault();
                      }}
                      className="text-slate-400 hover:text-white text-[11px] font-semibold flex items-center gap-0.5 transition cursor-pointer"
                    >
                      <span>Vault</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dropdown Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[10px]">
          NTSA & IRA Automated Sync
        </span>

        <button
          onClick={() => {
            onClose();
            onNavigateToVault();
          }}
          className="text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
        >
          <span>Open Full Compliance Vault</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
