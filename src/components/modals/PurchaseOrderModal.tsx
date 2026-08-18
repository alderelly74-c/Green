import React, { useState } from 'react';
import { 
  X, ShoppingCart, CheckCircle2, Send, Building2, Package, 
  DollarSign, Clock, FileText, Download, ShieldCheck, Printer, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseOrderSuggestion } from '../../types';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderSuggestion | null;
  onApprovePO: (poId: string) => void;
  onSendToSupplier: (poId: string) => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onApprovePO,
  onSendToSupplier
}) => {
  const [customNotes, setCustomNotes] = useState<string>('');

  if (!isOpen || !purchaseOrder) return null;

  const handleApprove = () => {
    onApprovePO(purchaseOrder.id);
    toast.success(`Purchase Order ${purchaseOrder.poNumber} officially approved!`);
  };

  const handleDispatch = () => {
    onSendToSupplier(purchaseOrder.id);
    toast.success(`PO ${purchaseOrder.poNumber} dispatched to ${purchaseOrder.supplierName} via automated procurement link.`);
  };

  const handlePrintDownload = () => {
    toast.info(`Generating PDF Purchase Order document for ${purchaseOrder.poNumber}...`);
    setTimeout(() => {
      toast.success(`PO ${purchaseOrder.poNumber} downloaded successfully.`);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-emerald-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Automated Reorder Trigger
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">{purchaseOrder.poNumber}</span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Official Purchase Order Voucher
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Status & Urgency Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-950 border-slate-800">
            <div>
              <span className="text-slate-400 text-[11px] block">Trigger Source:</span>
              <span className="text-white font-semibold">Low Stock Inventory Threshold (&le; {purchaseOrder.minimumStock} units)</span>
            </div>

            <div className="text-right">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                purchaseOrder.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' :
                purchaseOrder.urgency === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}>
                Urgency: {purchaseOrder.urgency}
              </span>
            </div>
          </div>

          {/* Supplier & Delivery Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Vendor / Supplier:</span>
              </div>
              <div className="text-sm font-bold text-white">{purchaseOrder.supplierName}</div>
              <div className="text-slate-400 text-[11px]">Authorized Fleet Parts Dealer</div>
              <div className="text-emerald-400 text-[11px] font-mono font-medium pt-1">Procurement Terms: Net 30 Days</div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span>Delivery Location:</span>
              </div>
              <div className="text-sm font-bold text-white">GreenShift Central Workshop</div>
              <div className="text-slate-400 text-[11px]">Enterprise Road, Industrial Area, Nairobi</div>
              <div className="text-slate-300 text-[11px] pt-1">Attention: Fleet Workshop Manager</div>
            </div>
          </div>

          {/* Line Item Table */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 font-bold text-white flex items-center justify-between">
              <span>Order Line Item Details</span>
              <span className="text-slate-400 font-mono text-[11px]">{purchaseOrder.partNumber}</span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{purchaseOrder.partName}</h4>
                  <p className="text-slate-400 text-[11px]">Part #: <span className="font-mono text-slate-300">{purchaseOrder.partNumber}</span></p>
                </div>

                <div className="text-right">
                  <div className="text-slate-400 text-[11px]">Current Stock: <strong className="text-red-400">{purchaseOrder.currentStock} units</strong></div>
                  <div className="text-slate-400 text-[11px]">Min Level: <strong className="text-amber-300">{purchaseOrder.minimumStock} units</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Suggested Quantity</span>
                  <span className="text-base font-black text-amber-400 font-mono">{purchaseOrder.suggestedQuantity} units</span>
                </div>

                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Unit Price</span>
                  <span className="text-base font-black text-white font-mono">KES {purchaseOrder.unitCostKes.toLocaleString()}</span>
                </div>

                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estimated Total</span>
                  <span className="text-base font-black text-emerald-400 font-mono">KES {purchaseOrder.totalEstimatedCostKes.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Procurement Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Internal Purchase Order Notes / Special Instructions:
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Express delivery requested before Friday morning shift..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={handlePrintDownload}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Download PO Document</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {purchaseOrder.status === 'Suggested' && (
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve PO</span>
                </button>
              )}

              {purchaseOrder.status !== 'Sent to Supplier' && (
                <button
                  onClick={handleDispatch}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition shadow-lg flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Send PO to Supplier</span>
                </button>
              )}

              {purchaseOrder.status === 'Sent to Supplier' && (
                <span className="px-4 py-2 bg-emerald-950 text-emerald-400 font-bold rounded-xl text-xs border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Dispatched to Supplier</span>
                </span>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
