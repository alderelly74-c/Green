import React, { useState } from 'react';
import { VehicleDocument } from '../types';
import { 
  FileText, AlertTriangle, CheckCircle2, ShieldAlert, Eye, Search, 
  Filter, ZoomIn, ZoomOut, RotateCw, Download, Printer, Copy, Check, 
  ExternalLink, Calendar, User, Truck, ShieldCheck, Grid, List, RefreshCw, X,
  Bell, BellRing, BellOff, Mail, MessageSquare, Send, Smartphone, Settings,
  Clock, Sparkles, ToggleLeft, ToggleRight, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface DocumentsModuleProps {
  documents: VehicleDocument[];
}

// Fallback document image placeholders based on type
const DEFAULT_DOC_IMAGES: Record<string, string> = {
  'NTSA Inspection': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60',
  'Comprehensive Insurance': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=60',
  'Logbook': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=60',
  'Driving License': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
  'PSV Badge': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60',
  'Good Conduct Certificate': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=60',
  'National ID': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60',
};

// Authority Issuer Badges
const DOCUMENT_AUTHORITIES: Record<string, string> = {
  'NTSA Inspection': 'National Transport & Safety Authority (NTSA)',
  'Comprehensive Insurance': 'Insurance Regulatory Authority (IRA) / GA Insurance',
  'Logbook': 'Republic of Kenya - Ministry of Transport',
  'Driving License': 'National Transport & Safety Authority (NTSA Kenya)',
  'PSV Badge': 'NTSA Commercial & PSV Licensing Division',
  'Good Conduct Certificate': 'Directorate of Criminal Investigations (DCI Kenya)',
  'National ID': 'National Registration Bureau (NRB Kenya)',
};

// Canvas Certificate Generator for Offline/CORS-proof Document Attachments
const createCertificateCanvasBlob = (doc: VehicleDocument): Promise<Blob | null> => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Dark Slate Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Emerald Border Frame
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 12;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

      // Header Title
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('REPUBLIC OF KENYA • OFFICIAL FLEET COMPLIANCE ARCHIVE', canvas.width / 2, 95);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(doc.documentType.toUpperCase(), canvas.width / 2, 160);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px sans-serif';
      ctx.fillText(`Authority Issuer: ${DOCUMENT_AUTHORITIES[doc.documentType] || 'National Licensing Body'}`, canvas.width / 2, 210);

      // Divider Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 250);
      ctx.lineTo(canvas.width - 100, 250);
      ctx.stroke();

      // Content Box
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(100, 280, canvas.width - 200, 370);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(100, 280, canvas.width - 200, 370);

      ctx.textAlign = 'left';
      ctx.font = 'bold 24px sans-serif';
      
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`Entity Registration Name:`, 140, 340);
      ctx.fillStyle = '#34d399';
      ctx.fillText(`${doc.entityName} (${doc.entityType})`, 480, 340);

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`Document Serial Number:`, 140, 400);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${doc.documentNumber}`, 480, 400);

      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`Official Issue Date:`, 140, 460);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`${doc.issueDate}`, 480, 460);

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`Expiration Date:`, 140, 520);
      ctx.fillStyle = doc.daysUntilExpiry <= 30 ? '#fbbf24' : '#34d399';
      ctx.fillText(`${doc.expiryDate} (${doc.daysUntilExpiry} days remaining)`, 480, 520);

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`Compliance Status:`, 140, 580);
      ctx.fillStyle = '#10b981';
      ctx.fillText(`VERIFIED & VALIDATED`, 480, 580);

      // Official Stamp Circle Seal
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(canvas.width - 220, 560, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('OFFICIAL', canvas.width - 220, 545);
      ctx.fillText('VERIFIED', canvas.width - 220, 565);
      ctx.fillText('SEAL', canvas.width - 220, 585);

      // Footer Stamp Hash
      ctx.fillStyle = '#64748b';
      ctx.font = '16px monospace';
      ctx.fillText(`Digital Verification Signature: ${doc.id.toUpperCase()}-VERIFIED-${Date.now().toString(16)}`, canvas.width / 2, 715);

      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch (e) {
      console.error('Error generating certificate canvas blob:', e);
      resolve(null);
    }
  });
};

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({ documents = [] }) => {
  const [docList, setDocList] = useState<VehicleDocument[]>(documents);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<VehicleDocument | null>(null);
  const [selectedDocForReminderModal, setSelectedDocForReminderModal] = useState<VehicleDocument | null>(null);
  const [isReminderQueueOpen, setIsReminderQueueOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'Vehicle' | 'Driver'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXPIRING_SOON' | 'VERIFIED' | 'REMINDER_ACTIVE' | 'REMINDER_MUTED'>('ALL');
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  // Preview Modal Interactive Viewer State
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Expiry & Reminder Calculations
  const expiringSoonList = docList.filter(d => d.daysUntilExpiry <= 30);
  const verifiedList = docList.filter(d => d.verificationStatus === 'Verified');
  const activeRemindersList = docList.filter(d => d.reminderEnabled);
  const pendingNotificationQueue = docList.filter(d => d.reminderEnabled && d.daysUntilExpiry <= 30);

  // Filtered Documents
  const filteredDocs = docList.filter(doc => {
    const matchesSearch = 
      doc.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEntity = entityFilter === 'ALL' || doc.entityType === entityFilter;

    let matchesStatus = true;
    if (statusFilter === 'EXPIRING_SOON') matchesStatus = doc.daysUntilExpiry <= 30;
    if (statusFilter === 'VERIFIED') matchesStatus = doc.verificationStatus === 'Verified';
    if (statusFilter === 'REMINDER_ACTIVE') matchesStatus = !!doc.reminderEnabled;
    if (statusFilter === 'REMINDER_MUTED') matchesStatus = !doc.reminderEnabled;

    return matchesSearch && matchesEntity && matchesStatus;
  });

  // Toggle Automated 30-Day Reminder for a single document
  const handleToggleReminder = (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    let isNowEnabled = false;
    let targetDocName = '';
    let targetType = '';

    setDocList(prev => prev.map(d => {
      if (d.id === docId) {
        isNowEnabled = !d.reminderEnabled;
        targetDocName = d.entityName;
        targetType = d.documentType;
        return {
          ...d,
          reminderEnabled: isNowEnabled,
          reminderDaysBefore: d.reminderDaysBefore || 30,
          reminderChannel: d.reminderChannel || 'BOTH',
          recipientRole: d.recipientRole || 'BOTH',
          reminderStatus: isNowEnabled ? 'SCHEDULED' : 'MUTED',
          ownerPhone: d.ownerPhone || '+254 712 345 678',
          ownerEmail: d.ownerEmail || 'owner@greenshiftfleet.co.ke',
          driverPhone: d.driverPhone || '+254 722 999 888',
          driverEmail: d.driverEmail || 'driver@greenshiftfleet.co.ke',
        };
      }
      return d;
    }));

    if (isNowEnabled) {
      toast.success(`🔔 30-Day Auto-Reminder Activated for ${targetType} (${targetDocName})!`, {
        description: 'Automated SMS & Email alerts will notify owner and driver 30 days before document expiry.'
      });
    } else {
      toast.info(`🔕 Auto-Reminder Muted for ${targetType} (${targetDocName})`);
    }
  };

  // Batch Enable 30-Day Reminders for all Insurance, NTSA, and Driver License Docs
  const handleBatchEnable30DayReminders = () => {
    let count = 0;
    setDocList(prev => prev.map(d => {
      if (!d.reminderEnabled) {
        count++;
        return {
          ...d,
          reminderEnabled: true,
          reminderDaysBefore: 30,
          reminderChannel: d.reminderChannel || 'BOTH',
          recipientRole: d.recipientRole || 'BOTH',
          reminderStatus: 'SCHEDULED',
          ownerPhone: d.ownerPhone || '+254 712 345 678',
          ownerEmail: d.ownerEmail || 'owner@greenshiftfleet.co.ke',
          driverPhone: d.driverPhone || '+254 722 999 888',
          driverEmail: d.driverEmail || 'driver@greenshiftfleet.co.ke',
        };
      }
      return d;
    }));

    toast.success(`⚡ 30-Day Automated Expiry Reminders Enabled for All ${count > 0 ? count : 'Compliance'} Documents!`, {
      description: 'Scheduled email & SMS dispatch rule set to notify 30 days prior to expiry.'
    });
  };

  // Save Reminder Settings from Modal
  const handleSaveReminderSettings = (updatedDoc: VehicleDocument) => {
    setDocList(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (selectedDocForPreview && selectedDocForPreview.id === updatedDoc.id) {
      setSelectedDocForPreview(updatedDoc);
    }
    setSelectedDocForReminderModal(null);
    toast.success(`Saved reminder settings for ${updatedDoc.documentType} (${updatedDoc.entityName})`);
  };

  // Simulate Instant Test Notification
  const handleSendTestAlert = (doc: VehicleDocument) => {
    const channel = doc.reminderChannel || 'BOTH';
    const role = doc.recipientRole || 'BOTH';
    const phone = doc.ownerPhone || doc.driverPhone || '+254 712 345 678';
    const email = doc.ownerEmail || doc.driverEmail || 'owner@greenshiftfleet.co.ke';

    let details = '';
    if (channel === 'SMS') details = `SMS sent to ${phone}`;
    else if (channel === 'EMAIL') details = `Email sent to ${email}`;
    else details = `SMS to ${phone} & Email to ${email}`;

    // Mark last sent timestamp
    setDocList(prev => prev.map(d => d.id === doc.id ? { ...d, lastReminderSentAt: new Date().toISOString().slice(0, 16).replace('T', ' '), reminderStatus: 'SENT' } : d));

    toast.success(`📱 Test 30-Day Expiry Alert Dispatched!`, {
      description: `Recipient: ${role} (${details}) for ${doc.documentType} expiring in ${doc.daysUntilExpiry} days.`
    });
  };

  // Verified documents within current filtered view for ZIP export
  const verifiedDocsToExport = filteredDocs.filter(d => d.verificationStatus === 'Verified');

  const handleOpenPreview = (doc: VehicleDocument) => {
    setSelectedDocForPreview(doc);
    setZoomScale(1);
    setRotationDegree(0);
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotationDegree(prev => (prev + 90) % 360);
  const handleResetView = () => {
    setZoomScale(1);
    setRotationDegree(0);
  };

  const handleCopyDocNumber = (docNum: string) => {
    navigator.clipboard.writeText(docNum);
    setIsCopied(true);
    toast.success(`Copied document number ${docNum} to clipboard!`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleVerifyDocument = (docId: string) => {
    setDocList(prev => prev.map(d => d.id === docId ? { ...d, verificationStatus: 'Verified' } : d));
    if (selectedDocForPreview && selectedDocForPreview.id === docId) {
      setSelectedDocForPreview(prev => prev ? { ...prev, verificationStatus: 'Verified' } : null);
    }
    toast.success('Document marked as Verified & Validated!');
  };

  // Trigger Consolidated ZIP Download for all Verified Documents in Current Filtered View
  const handleExportAllZip = async () => {
    if (verifiedDocsToExport.length === 0) {
      toast.error('No verified documents found in the current filtered view to export.');
      return;
    }

    setIsExportingZip(true);
    const toastId = toast.loading(`Preparing ZIP package for ${verifiedDocsToExport.length} verified document(s)...`);

    try {
      const zip = new JSZip();
      const folderName = `Verified_Documents_${new Date().toISOString().slice(0, 10)}`;
      const docsFolder = zip.folder(folderName) || zip;

      // 1. Generate Manifest File
      let manifestText = `=================================================================\n`;
      manifestText += `           GREENSHIFT FLEET COMPLIANCE MANIFEST\n`;
      manifestText += `=================================================================\n`;
      manifestText += `Export Date: ${new Date().toLocaleString()}\n`;
      manifestText += `Total Verified Documents Exported: ${verifiedDocsToExport.length}\n`;
      manifestText += `Active Filter Entity: ${entityFilter}\n`;
      manifestText += `Search Query: "${searchQuery || 'None'}"\n\n`;
      manifestText += `-----------------------------------------------------------------\n`;

      verifiedDocsToExport.forEach((doc, idx) => {
        manifestText += `[${idx + 1}] ENTITY: ${doc.entityName} (${doc.entityType})\n`;
        manifestText += `    DOCUMENT TYPE : ${doc.documentType}\n`;
        manifestText += `    DOCUMENT NO.  : ${doc.documentNumber}\n`;
        manifestText += `    ISSUER        : ${DOCUMENT_AUTHORITIES[doc.documentType] || 'NTSA / Govt Authority'}\n`;
        manifestText += `    ISSUE DATE    : ${doc.issueDate}\n`;
        manifestText += `    EXPIRY DATE   : ${doc.expiryDate} (${doc.daysUntilExpiry} days remaining)\n`;
        manifestText += `    STATUS        : VERIFIED & COMPLIANT\n`;
        manifestText += `-----------------------------------------------------------------\n`;
      });

      docsFolder.file('COMPLIANCE_MANIFEST.txt', manifestText);

      const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_');

      // 2. Loop through each verified document
      for (const doc of verifiedDocsToExport) {
        const baseName = `${sanitize(doc.entityName)}_${sanitize(doc.documentType)}_${sanitize(doc.documentNumber)}`;

        // Metadata file
        const metaText = `OFFICIAL DIGITAL VERIFICATION RECORD\n` +
          `Entity: ${doc.entityName} (${doc.entityType})\n` +
          `Document Type: ${doc.documentType}\n` +
          `Serial Number: ${doc.documentNumber}\n` +
          `Issuer Authority: ${DOCUMENT_AUTHORITIES[doc.documentType] || 'National Licensing Body'}\n` +
          `Issue Date: ${doc.issueDate}\n` +
          `Expiry Date: ${doc.expiryDate} (${doc.daysUntilExpiry} days remaining)\n` +
          `Verification Status: VERIFIED & VALIDATED\n`;

        docsFolder.file(`${baseName}_metadata.txt`, metaText);

        // Certificate PNG Image
        const certBlob = await createCertificateCanvasBlob(doc);
        if (certBlob) {
          docsFolder.file(`${baseName}_certificate.png`, certBlob);
        }

        // Try fetching actual remote image if available
        const docImgUrl = doc.fileUrl || DEFAULT_DOC_IMAGES[doc.documentType];
        if (docImgUrl) {
          try {
            const imgRes = await fetch(docImgUrl, { mode: 'cors' });
            if (imgRes.ok) {
              const imgBlob = await imgRes.blob();
              docsFolder.file(`${baseName}_document.jpg`, imgBlob);
            }
          } catch (err) {
            console.warn(`Could not fetch remote image for ${doc.documentNumber}, certificate saved instead.`);
          }
        }
      }

      // Generate Zip Blob & trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Verified_Vehicle_Documents_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success(`Successfully exported ${verifiedDocsToExport.length} verified document(s) to ZIP!`, { id: toastId });
    } catch (error) {
      console.error('Failed to export ZIP:', error);
      toast.error('Failed to generate ZIP archive. Please try again.', { id: toastId });
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Vehicle & Driver Digital Document Repository</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compliance tracking for Logbooks, Comprehensive Insurance, NTSA Inspection, DL, and PSV Badges
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono font-bold text-slate-300">
            {docList.length} Active Compliance Records
          </span>

          <button
            onClick={handleExportAllZip}
            disabled={isExportingZip}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-400 font-black px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-emerald-950/60 cursor-pointer disabled:cursor-not-allowed"
            title="Download ZIP package of all verified documents in the current view"
          >
            {isExportingZip ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExportingZip ? 'Packing ZIP...' : `Export All (${verifiedDocsToExport.length} Verified)`}</span>
          </button>
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Documents</div>
          <div className="text-2xl font-black text-white mt-1">{docList.length} Archived</div>
          <p className="text-[11px] text-slate-400 mt-1">Vehicles & drivers compliance</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Compliant</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{verifiedList.length} Verified</div>
          <p className="text-[11px] text-emerald-300 mt-1">Inspected & active in fleet</p>
        </div>

        <div className={`border rounded-xl p-4 shadow-lg transition ${
          expiringSoonList.length > 0 ? 'bg-amber-950/40 border-amber-500/50' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Expiring &lt;30 Days</span>
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{expiringSoonList.length} Requiring Renewal</div>
          <p className="text-[11px] text-amber-300 mt-1">NTSA & insurance renewal alerts</p>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'REMINDER_ACTIVE' ? 'ALL' : 'REMINDER_ACTIVE')}
          className={`border rounded-xl p-4 shadow-lg transition cursor-pointer ${
            activeRemindersList.length > 0 ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>30-Day Auto Reminders</span>
            <BellRing className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{activeRemindersList.length} Active</div>
          <p className="text-[11px] text-emerald-300 mt-1">SMS & Email alerts to owner/driver</p>
        </div>
      </div>

      {/* AUTOMATED 30-DAY EXPIRY NOTIFICATIONS CONTROL STRIP */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
            <BellRing className="w-6 h-6 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-white">Automated 30-Day Expiry Notification Engine</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                30 Days Lead Time
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatically flags Insurance & NTSA documents and dispatches direct SMS/Email alerts to vehicle owners & drivers 30 days prior to expiration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch md:self-auto">
          <button
            onClick={handleBatchEnable30DayReminders}
            className="flex-1 md:flex-none px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
            title="Flag all Insurance, NTSA & DL documents for automated 30-day notifications"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Enable 30D Reminders (All Docs)</span>
          </button>

          <button
            onClick={() => setIsReminderQueueOpen(true)}
            className="flex-1 md:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="View scheduled SMS & Email dispatches for documents expiring within 30 days"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Scheduled Queue ({pendingNotificationQueue.length})</span>
          </button>
        </div>
      </div>

      {/* EXPIRING SOON WARNING BANNER */}
      {expiringSoonList.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Document Expiry Warning ({expiringSoonList.length} Document(s) Expiring Soon)</span>
            </div>
            <button
              onClick={() => setStatusFilter('EXPIRING_SOON')}
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/30 font-bold transition cursor-pointer"
            >
              Filter Expiring Records
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {expiringSoonList.map(doc => (
              <div key={doc.id} className="text-xs text-amber-200 bg-amber-900/30 p-3 rounded-lg border border-amber-500/20 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-white">{doc.entityName}</strong> — {doc.documentType} ({doc.documentNumber})
                  <p className="text-[11px] text-amber-300 mt-0.5">Expires on: {doc.expiryDate} ({doc.daysUntilExpiry} days left)</p>
                </div>
                <button
                  onClick={() => handleOpenPreview(doc)}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded text-[11px] transition shadow flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPOSITORY TOOLBAR & CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle, driver or doc #..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Filter Badges & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            
            {/* Status & Reminder Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto max-w-full">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter('EXPIRING_SOON')}
                className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  statusFilter === 'EXPIRING_SOON' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Expiring &lt;30d</span>
              </button>
              <button
                onClick={() => setStatusFilter('REMINDER_ACTIVE')}
                className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  statusFilter === 'REMINDER_ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BellRing className="w-3 h-3 text-emerald-400" />
                <span>Auto-Reminder Active ({activeRemindersList.length})</span>
              </button>
            </div>

            {/* Entity Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setEntityFilter('ALL')}
                className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                  entityFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setEntityFilter('Vehicle')}
                className={`px-3 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'Vehicle' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Vehicles</span>
              </button>
              <button
                onClick={() => setEntityFilter('Driver')}
                className={`px-3 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer ${
                  entityFilter === 'Driver' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Drivers</span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  viewMode === 'GRID' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Thumbnail Cards View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Toolbar Export Button */}
            <button
              onClick={handleExportAllZip}
              disabled={isExportingZip}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-400 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow cursor-pointer disabled:cursor-not-allowed"
              title="Download ZIP package of verified documents in current view"
            >
              {isExportingZip ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Export All (ZIP)</span>
            </button>

          </div>

        </div>

        {/* DOCUMENTS GRID THUMBNAIL CARDS VIEW */}
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => {
              const docImg = doc.fileUrl || DEFAULT_DOC_IMAGES[doc.documentType] || DEFAULT_DOC_IMAGES['Logbook'];
              const isExpiring = doc.daysUntilExpiry <= 30;

              return (
                <div 
                  key={doc.id}
                  onClick={() => handleOpenPreview(doc)}
                  className={`group bg-slate-950 border rounded-xl overflow-hidden shadow-lg transition hover:shadow-2xl cursor-pointer relative ${
                    isExpiring ? 'border-amber-500/50 hover:border-amber-400' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Scaled Thumbnail Card Image Container */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden flex items-center justify-center">
                    <img 
                      src={docImg} 
                      alt={doc.documentType}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80 group-hover:opacity-100"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    {/* Official Stamp Watermark Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 rounded-md px-2 py-1 text-[10px] font-mono text-slate-200 font-bold flex items-center gap-1 shadow-md">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>{doc.documentType}</span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shadow-md ${
                        isExpiring ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {isExpiring ? `${doc.daysUntilExpiry}d Left` : 'Verified'}
                      </span>
                    </div>

                    {/* Quick Preview Hover Overlay Button */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 rounded-lg shadow-xl flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition">
                        <Eye className="w-4 h-4" />
                        <span>Click to Audit Preview</span>
                      </span>
                    </div>
                  </div>

                  {/* Document Card Details Footer */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-sm">{doc.entityName}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {doc.entityType}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center justify-between font-mono">
                      <span>Doc #: <strong className="text-slate-200">{doc.documentNumber}</strong></span>
                      <span className="text-emerald-400 font-bold">{doc.verificationStatus}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Issued: {doc.issueDate}</span>
                      <span className={isExpiring ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        Exp: {doc.expiryDate}
                      </span>
                    </div>

                    {/* Automated 30-Day Reminder Bar */}
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleReminder(doc.id, e)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          doc.reminderEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                        title={doc.reminderEnabled ? "Click to mute automated 30-day reminder" : "Click to activate automated 30-day reminder"}
                      >
                        {doc.reminderEnabled ? (
                          <>
                            <BellRing className="w-3 h-3 text-emerald-400 animate-pulse" />
                            <span>30D Auto-Notify Active</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3 h-3 text-slate-500" />
                            <span>Reminder Muted</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocForReminderModal(doc);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 transition cursor-pointer flex items-center gap-1 text-[10px]"
                        title="Configure recipient phone, email & alert channel"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Config</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* DOCUMENTS TABLE VIEW WITH CLICK-TO-PREVIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3 font-semibold">Entity Name</th>
                  <th className="px-4 py-3 font-semibold">Document Type</th>
                  <th className="px-4 py-3 font-semibold">Document Number</th>
                  <th className="px-4 py-3 font-semibold">Expiry Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">30D Auto-Reminder</th>
                  <th className="px-4 py-3 font-semibold text-center">Audit Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDocs.map(doc => {
                  const docImg = doc.fileUrl || DEFAULT_DOC_IMAGES[doc.documentType] || DEFAULT_DOC_IMAGES['Logbook'];
                  const isExpiring = doc.daysUntilExpiry <= 30;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Scaled Mini Thumbnail Click Trigger */}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleOpenPreview(doc)}
                          className="w-12 h-9 rounded-md overflow-hidden bg-slate-950 border border-slate-800 hover:border-emerald-500 transition relative group cursor-pointer block"
                          title="Click to zoom preview"
                        >
                          <img src={docImg} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition" />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      </td>

                      <td className="px-4 py-3 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{doc.entityName}</span>
                          <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {doc.entityType}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-200">{doc.documentType}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{doc.documentNumber}</td>
                      
                      <td className="px-4 py-3 text-slate-300 font-semibold">
                        <span className={isExpiring ? 'text-amber-400 font-bold' : ''}>
                          {doc.expiryDate}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isExpiring ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {doc.verificationStatus} ({doc.daysUntilExpiry}d left)
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleReminder(doc.id, e)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                              doc.reminderEnabled
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {doc.reminderEnabled ? (
                              <>
                                <BellRing className="w-3 h-3 text-emerald-400" />
                                <span>ON</span>
                              </>
                            ) : (
                              <>
                                <BellOff className="w-3 h-3 text-slate-500" />
                                <span>OFF</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocForReminderModal(doc);
                            }}
                            className="p-1 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 transition cursor-pointer"
                            title="Configure contacts & channels"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenPreview(doc)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-[11px] border border-slate-700 transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Preview</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredDocs.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No compliance documents matched your filter parameters.
          </div>
        )}

      </div>

      {/* DOCUMENT AUDIT PREVIEW MODAL WITH SCALED THUMBNAIL & CONTROLS */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Modal Header Toolbar */}
            <div className="bg-slate-950 border-b border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span>{selectedDocForPreview.documentType}</span>
                    <span className="text-slate-400 font-normal">• {selectedDocForPreview.entityName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Doc Serial #: {selectedDocForPreview.documentNumber}
                  </p>
                </div>
              </div>

              {/* View Control Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 px-2 font-bold min-w-[45px] text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetView}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition text-[10px] font-bold px-1.5 cursor-pointer"
                    title="Reset View"
                  >
                    Reset
                  </button>
                </div>

                <button
                  onClick={() => setSelectedDocForPreview(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Main Body (2 Columns: Scaled Canvas Thumbnail + Compliance Info Panel) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-y-auto">
              
              {/* Scaled Thumbnail Document Viewer Canvas (2 Cols) */}
              <div className="lg:col-span-2 p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
                
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                {/* Interactive Scaled Canvas */}
                <div 
                  className="transition-transform duration-200 ease-out shadow-2xl rounded-xl border border-slate-800 overflow-hidden relative max-w-full bg-slate-900"
                  style={{
                    transform: `scale(${zoomScale}) rotate(${rotationDegree}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  {/* Scaled Image */}
                  <img 
                    src={selectedDocForPreview.fileUrl || DEFAULT_DOC_IMAGES[selectedDocForPreview.documentType]} 
                    alt={selectedDocForPreview.documentType}
                    className="w-full max-h-[450px] object-contain rounded-xl"
                  />

                  {/* Kenya Official Seal Overlay Header on Document */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent p-4 flex items-center justify-between text-white pointer-events-none">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest block text-emerald-400">
                          OFFICIAL DIGITAL COMPLIANCE ARCHIVE
                        </span>
                        <span className="text-xs font-bold font-mono">
                          {DOCUMENT_AUTHORITIES[selectedDocForPreview.documentType] || 'Republic of Kenya - Official Document'}
                        </span>
                      </div>
                    </div>

                    <div className="border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 rounded text-[10px] font-mono text-emerald-300 font-bold uppercase">
                      VERIFIED COPY
                    </div>
                  </div>

                  {/* Dynamic Official Watermark Stamp Bottom */}
                  <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-emerald-500/50 rounded-lg p-2.5 shadow-2xl backdrop-blur-xs flex items-center gap-2 pointer-events-none">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center text-[8px] font-black text-emerald-400 text-center leading-tight uppercase font-mono">
                      SEAL OK
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-white block">AUDITED & VALIDATED</span>
                      <span className="text-[9px] text-slate-400 font-mono">ID: {selectedDocForPreview.documentNumber}</span>
                    </div>
                  </div>

                </div>

                <div className="mt-4 text-[11px] text-slate-500 font-mono flex items-center gap-3">
                  <span>Zoom: {Math.round(zoomScale * 100)}%</span>
                  <span>•</span>
                  <span>Rotation: {rotationDegree}°</span>
                </div>

              </div>

              {/* Compliance Metadata & Fast Verification Controls (1 Col) */}
              <div className="p-6 bg-slate-900 space-y-5">
                
                {/* Header Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Verification Status</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                      selectedDocForPreview.daysUntilExpiry <= 30
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {selectedDocForPreview.verificationStatus}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Validity Countdown</span>
                    <div className="text-lg font-black text-white font-mono flex items-center justify-between">
                      <span>{selectedDocForPreview.daysUntilExpiry} Days Remaining</span>
                      <Calendar className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {selectedDocForPreview.daysUntilExpiry <= 30
                        ? 'Renewal required urgently with relevant state authority.'
                        : 'Compliant and cleared for active fleet operations.'}
                    </p>
                  </div>
                </div>

                {/* Metadata Items */}
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-400">Holder Entity:</span>
                      <strong className="text-white font-bold">{selectedDocForPreview.entityName}</strong>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-400">Entity Category:</span>
                      <span className="text-slate-200 font-medium">{selectedDocForPreview.entityType}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-400">Document Type:</span>
                      <span className="text-emerald-400 font-bold">{selectedDocForPreview.documentType}</span>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-slate-400">Document Serial #:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-white">{selectedDocForPreview.documentNumber}</span>
                        <button
                          onClick={() => handleCopyDocNumber(selectedDocForPreview.documentNumber)}
                          className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                          title="Copy Serial Number"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Issue Date</span>
                      <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">{selectedDocForPreview.issueDate}</span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Expiry Date</span>
                      <span className="text-xs font-mono font-bold text-amber-400 mt-0.5 block">{selectedDocForPreview.expiryDate}</span>
                    </div>
                  </div>
                </div>

                {/* 30-Day Automated Expiry Notification Card in Preview Modal */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                      <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                      <span>30-Day Auto Reminder</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleReminder(selectedDocForPreview.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold border transition cursor-pointer ${
                        selectedDocForPreview.reminderEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {selectedDocForPreview.reminderEnabled ? 'ENABLED' : 'MUTED'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    Auto-dispatches SMS & Email alerts 30 days prior to expiry ({selectedDocForPreview.expiryDate}).
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                    <button
                      onClick={() => {
                        setSelectedDocForReminderModal(selectedDocForPreview);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Configure Contacts & Channel</span>
                    </button>

                    <button
                      onClick={() => handleSendTestAlert(selectedDocForPreview)}
                      className="text-[11px] text-slate-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1 rounded border border-slate-800"
                    >
                      <Send className="w-3 h-3 text-emerald-400" />
                      <span>Test Alert</span>
                    </button>
                  </div>
                </div>

                {/* Audit & Verification Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Compliance Actions</span>

                  <button
                    onClick={() => handleVerifyDocument(selectedDocForPreview.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Verify Compliance</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        toast.info(`Preparing print copy for ${selectedDocForPreview.documentNumber}`);
                      }}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-300" />
                      <span>Print Slip</span>
                    </button>

                    <button
                      onClick={() => {
                        toast.success(`Downloaded digital copy of ${selectedDocForPreview.documentType}`);
                      }}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* REMINDER CONFIGURATION & CONTACTS MODAL */}
      {selectedDocForReminderModal && (
        <ReminderConfigModal
          doc={selectedDocForReminderModal}
          onClose={() => setSelectedDocForReminderModal(null)}
          onSave={handleSaveReminderSettings}
          onSendTest={handleSendTestAlert}
        />
      )}

      {/* SCHEDULED NOTIFICATION QUEUE MODAL */}
      {isReminderQueueOpen && (
        <NotificationQueueModal
          queue={pendingNotificationQueue}
          allDocs={docList}
          onClose={() => setIsReminderQueueOpen(false)}
          onSendTest={handleSendTestAlert}
          onOpenConfig={(doc) => {
            setIsReminderQueueOpen(false);
            setSelectedDocForReminderModal(doc);
          }}
        />
      )}

    </div>
  );
};

/* REMINDER CONFIGURATION & CONTACTS MODAL */
interface ReminderConfigModalProps {
  doc: VehicleDocument;
  onClose: () => void;
  onSave: (updatedDoc: VehicleDocument) => void;
  onSendTest: (doc: VehicleDocument) => void;
}

const ReminderConfigModal: React.FC<ReminderConfigModalProps> = ({ doc, onClose, onSave, onSendTest }) => {
  const [enabled, setEnabled] = useState<boolean>(doc.reminderEnabled ?? true);
  const [daysBefore, setDaysBefore] = useState<number>(doc.reminderDaysBefore ?? 30);
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'BOTH'>(doc.reminderChannel ?? 'BOTH');
  const [recipientRole, setRecipientRole] = useState<'OWNER' | 'DRIVER' | 'BOTH'>(doc.recipientRole ?? 'BOTH');
  const [ownerName, setOwnerName] = useState<string>(doc.ownerName || 'GreenShift Fleet Owner');
  const [ownerEmail, setOwnerEmail] = useState<string>(doc.ownerEmail || 'owner@greenshiftfleet.co.ke');
  const [ownerPhone, setOwnerPhone] = useState<string>(doc.ownerPhone || '+254 712 345 678');
  const [driverName, setDriverName] = useState<string>(doc.driverName || doc.entityName || 'Driver');
  const [driverEmail, setDriverEmail] = useState<string>(doc.driverEmail || 'driver@greenshiftfleet.co.ke');
  const [driverPhone, setDriverPhone] = useState<string>(doc.driverPhone || '+254 722 999 888');

  const handleSave = () => {
    onSave({
      ...doc,
      reminderEnabled: enabled,
      reminderDaysBefore: daysBefore,
      reminderChannel: channel,
      recipientRole,
      ownerName,
      ownerEmail,
      ownerPhone,
      driverName,
      driverEmail,
      driverPhone,
      reminderStatus: enabled ? 'SCHEDULED' : 'MUTED'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Automated Expiry Notification Settings</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {doc.documentType} • {doc.entityName} ({doc.documentNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          
          {/* Main Toggle Switch */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-extrabold text-white text-sm block">Automated Expiry Reminder Toggle</span>
              <p className="text-slate-400 text-xs">
                Automatically notify contacts when expiry date ({doc.expiryDate}) approaches.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`px-4 py-2 rounded-xl font-black text-xs border transition flex items-center gap-2 cursor-pointer ${
                enabled
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {enabled ? (
                <>
                  <Bell className="w-4 h-4 text-slate-950 fill-current" />
                  <span>30D REMINDER ON</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-slate-400" />
                  <span>REMINDER MUTED</span>
                </>
              )}
            </button>
          </div>

          {/* Lead Time & Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Lead Time Selector */}
            <div className="space-y-2">
              <label className="font-extrabold text-slate-200 uppercase tracking-wider block text-[11px]">
                Reminder Lead Time
              </label>
              <select
                value={daysBefore}
                onChange={(e) => setDaysBefore(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-bold focus:border-emerald-500"
              >
                <option value={30}>30 Days Before Expiry (Standard)</option>
                <option value={15}>15 Days Before Expiry (Urgent)</option>
                <option value={60}>60 Days Before Expiry (Advance Notice)</option>
                <option value={7}>7 Days Before Expiry (Critical)</option>
              </select>
              <p className="text-[11px] text-slate-500">Scheduled trigger: 30 days before {doc.expiryDate}.</p>
            </div>

            {/* Notification Channel */}
            <div className="space-y-2">
              <label className="font-extrabold text-slate-200 uppercase tracking-wider block text-[11px]">
                Notification Channel
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['SMS', 'EMAIL', 'BOTH'] as const).map(ch => (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`py-2 rounded-lg font-bold text-[11px] border transition flex items-center justify-center gap-1 cursor-pointer ${
                      channel === ch
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {ch === 'SMS' && <Smartphone className="w-3.5 h-3.5" />}
                    {ch === 'EMAIL' && <Mail className="w-3.5 h-3.5" />}
                    {ch === 'BOTH' && <Send className="w-3.5 h-3.5" />}
                    <span>{ch}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Recipient Target Selection */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-200 uppercase tracking-wider block text-[11px]">
              Alert Target Recipients
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['OWNER', 'DRIVER', 'BOTH'] as const).map(role => (
                <button
                  type="button"
                  key={role}
                  onClick={() => setRecipientRole(role)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    recipientRole === role
                      ? 'bg-slate-800 border-emerald-500/60 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-extrabold block text-xs">
                    {role === 'OWNER' ? 'Vehicle Owner' : role === 'DRIVER' ? 'Assigned Driver' : 'Owner & Driver'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {role === 'OWNER' ? 'Send to owner contact' : role === 'DRIVER' ? 'Send to driver contact' : 'Send to both contacts'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Contacts Inputs */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <span className="font-extrabold text-slate-300 uppercase tracking-wider block text-[11px]">
              Recipient Contact Information
            </span>

            {/* Owner Details */}
            {(recipientRole === 'OWNER' || recipientRole === 'BOTH') && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                  <User className="w-3.5 h-3.5" />
                  <span>Vehicle Owner Contact</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Owner Name</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">SMS Phone (+254...)</label>
                    <input
                      type="text"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Driver Details */}
            {(recipientRole === 'DRIVER' || recipientRole === 'BOTH') && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                  <User className="w-3.5 h-3.5" />
                  <span>Assigned Driver Contact</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">SMS Phone (+254...)</label>
                    <input
                      type="text"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={driverEmail}
                      onChange={(e) => setDriverEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* SMS & Email Message Dispatch Preview */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Automated 30-Day Message Preview</span>
            </span>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed">
              &quot;GreenShift Compliance Notice: Document [<strong>{doc.documentType}</strong>] (Serial #: <strong>{doc.documentNumber}</strong>) for <strong>{doc.entityName}</strong> will expire in 30 days on <strong>{doc.expiryDate}</strong>. Please initiate NTSA / IRA renewal immediately.&quot;
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSendTest({
              ...doc,
              reminderEnabled: enabled,
              reminderDaysBefore: daysBefore,
              reminderChannel: channel,
              recipientRole,
              ownerName, ownerEmail, ownerPhone,
              driverName, driverEmail, driverPhone
            })}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Send Test Alert Now</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold rounded-lg text-xs transition border border-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition shadow-lg shadow-emerald-950/60 cursor-pointer"
            >
              Save Notification Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

/* SCHEDULED NOTIFICATION QUEUE MODAL */
interface NotificationQueueModalProps {
  queue: VehicleDocument[];
  allDocs: VehicleDocument[];
  onClose: () => void;
  onSendTest: (doc: VehicleDocument) => void;
  onOpenConfig: (doc: VehicleDocument) => void;
}

const NotificationQueueModal: React.FC<NotificationQueueModalProps> = ({ queue, allDocs, onClose, onSendTest, onOpenConfig }) => {
  const activeCount = allDocs.filter(d => d.reminderEnabled).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">30-Day Scheduled Expiry Notification Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {queue.length} document(s) expiring within 30 days out of {activeCount} auto-reminder monitored records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-white font-bold text-sm">All Monitored Documents Are Compliant</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No documents with active 30-day reminders are expiring in the next 30 days. All active documents are clear.
              </p>
            </div>
          ) : (
            queue.map(doc => {
              const recipientPhone = doc.ownerPhone || doc.driverPhone || '+254 712 345 678';
              const recipientEmail = doc.ownerEmail || doc.driverEmail || 'owner@greenshiftfleet.co.ke';

              return (
                <div key={doc.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{doc.entityName}</span>
                      <span className="bg-slate-900 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-800">
                        {doc.documentType}
                      </span>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {doc.daysUntilExpiry}d Remaining
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
                      <span>Doc #: {doc.documentNumber}</span>
                      <span>•</span>
                      <span>Expiry Date: {doc.expiryDate}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{recipientPhone}</span>
                      <span>•</span>
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{recipientEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => onSendTest(doc)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition shadow flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Alert</span>
                    </button>

                    <button
                      onClick={() => onOpenConfig(doc)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                      title="Edit Contacts & Channels"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Next automated batch check: <strong className="text-emerald-400">08:00 AM Daily</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            Close Queue
          </button>
        </div>

      </div>
    </div>
  );
};
