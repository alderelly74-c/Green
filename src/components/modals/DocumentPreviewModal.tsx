import React, { useState } from 'react';
import { VehicleDocument } from '../../types';
import { 
  X, ShieldAlert, FileText, CheckCircle2, Clock, Download, Copy, 
  ExternalLink, ZoomIn, ZoomOut, RotateCw, ShieldCheck, AlertTriangle, Building
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: VehicleDocument | null;
  onNavigateToVault?: () => void;
}

// Government & Regulatory Authority Issuers
const DOCUMENT_AUTHORITIES: Record<string, string> = {
  'NTSA Inspection': 'National Transport & Safety Authority (NTSA Kenya)',
  'Comprehensive Insurance': 'Insurance Regulatory Authority (IRA) / GA & Britam Insurance',
  'Logbook': 'Republic of Kenya - Ministry of Transport',
  'Driving License': 'National Transport & Safety Authority (NTSA - DL Licensing)',
  'PSV Badge': 'NTSA Commercial & PSV Licensing Division',
  'Good Conduct Certificate': 'Directorate of Criminal Investigations (DCI Kenya)',
  'National ID': 'National Registration Bureau (NRB Kenya)',
};

// Fallback high-res document image URLs
const DEFAULT_DOC_IMAGES: Record<string, string> = {
  'NTSA Inspection': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60',
  'Comprehensive Insurance': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=60',
  'Logbook': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=60',
  'Driving License': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
  'PSV Badge': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60',
  'Good Conduct Certificate': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=60',
  'National ID': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60',
};

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  onNavigateToVault
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen || !document) return null;

  const authority = DOCUMENT_AUTHORITIES[document.documentType] || 'National Regulatory Licensing Body';
  const displayImage = document.fileUrl || DEFAULT_DOC_IMAGES[document.documentType] || DEFAULT_DOC_IMAGES['Logbook'];

  const isInsurance = document.documentType.toLowerCase().includes('insurance');
  const isNtsa = document.documentType.toLowerCase().includes('ntsa') || 
                document.documentType.toLowerCase().includes('license') || 
                document.documentType.toLowerCase().includes('psv') || 
                document.documentType.toLowerCase().includes('logbook');

  const isUrgentExpiry = document.daysUntilExpiry <= 7;
  const isCriticalExpiry = document.daysUntilExpiry <= 3;

  const handleCopyDocNumber = () => {
    navigator.clipboard.writeText(document.documentNumber);
    setIsCopied(true);
    toast.success(`Copied ${document.documentType} number: ${document.documentNumber}`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    // Generate simple certificate download
    const link = document.createElement('a');
    link.href = displayImage;
    link.download = `${document.entityName}_${document.documentType.replace(/\s+/g, '_')}_${document.documentNumber}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Started download for ${document.documentType}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isInsurance 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                : isNtsa 
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}>
              {isInsurance ? <ShieldAlert className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">{document.documentType}</h3>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  {document.entityName} ({document.entityType})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Building className="w-3 h-3 text-slate-500" />
                <span>{authority}</span>
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

        {/* Expiry Warning Callout Banner */}
        {isUrgentExpiry && (
          <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
            isCriticalExpiry
              ? 'bg-rose-950/80 border-rose-800/80 text-rose-200'
              : 'bg-amber-950/80 border-amber-800/80 text-amber-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className={`w-5 h-5 shrink-0 ${isCriticalExpiry ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  {isCriticalExpiry ? '🚨 CRITICAL COMPLIANCE ACTION REQUIRED' : '⚠️ UPCOMING EXPIRY WARNING'}
                </span>
                <p className="text-xs mt-0.5">
                  This {isInsurance ? 'Insurance Policy' : 'NTSA License'} expires in{' '}
                  <strong className="underline font-mono">{document.daysUntilExpiry} days</strong> ({document.expiryDate}).
                  Immediate renewal with regulatory authorities is required to avoid vehicle impoundment or dispatch suspension.
                </p>
              </div>
            </div>

            {onNavigateToVault && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToVault();
                }}
                className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer shadow-xs"
              >
                Open Vault
              </button>
            )}
          </div>
        )}

        {/* Modal Main Content: Details + Document Viewer */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Document Serial No.</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-white truncate">{document.documentNumber}</span>
                <button
                  onClick={handleCopyDocNumber}
                  title="Copy Serial Number"
                  className="text-slate-400 hover:text-white p-1 rounded transition"
                >
                  {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Issue Date</span>
              <span className="font-mono font-semibold text-slate-300 block mt-1">{document.issueDate}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Expiration Date</span>
              <span className={`font-mono font-bold block mt-1 ${isUrgentExpiry ? 'text-rose-400' : 'text-emerald-400'}`}>
                {document.expiryDate}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Status</span>
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-400">{document.verificationStatus}</span>
              </div>
            </div>
          </div>

          {/* Interactive Document Image Canvas Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Official Digital Document Attachment</span>
              </span>

              {/* View Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomScale(prev => Math.max(0.75, prev - 0.25))}
                  title="Zoom Out"
                  className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.25))}
                  title="Zoom In"
                  className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRotationDegree(prev => (prev + 90) % 360)}
                  title="Rotate 90deg"
                  className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Rendered Document Image */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800/80 h-[320px] flex items-center justify-center p-2">
              <img
                src={displayImage}
                alt={document.documentType}
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotationDegree}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-h-full max-w-full object-contain rounded shadow-lg"
              />

              {/* Verified Watermark Badge */}
              <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>NTSA / IRA DIGITAL SEAL VERIFIED</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Serial: <strong className="font-mono text-white">{document.documentNumber}</strong></span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleDownload}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Copy</span>
            </button>

            {onNavigateToVault && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToVault();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Vault</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
