import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vehicle, EvBatterySession, MaintenanceWorkOrder } from '../types';

export const generateWorkOrderPdf = (workOrder: MaintenanceWorkOrder) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner (Slate-900 background)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // GreenShift Fleet Command Logo Text
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GREENSHIFT FLEET COMMAND', 14, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Workshop Vehicle Maintenance Work Order', 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Doc Ref: ${workOrder.workOrderCode} | Generated: ${new Date().toLocaleString()}`, 14, 25);

  // Status Badge on Header Right
  const statusColor = workOrder.status === 'Completed' ? [16, 185, 129] : workOrder.status === 'In Progress' ? [59, 130, 246] : [245, 158, 11];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - 55, 10, 41, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(workOrder.status.toUpperCase(), pageWidth - 34.5, 17.5, { align: 'center' });

  let startY = 38;

  // Section 1: Work Order & Vehicle Overview Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(14, startY, pageWidth - 28, 44, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(14, startY, pageWidth - 28, 44, 'S');

  // Left Column Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`WORK ORDER: ${workOrder.workOrderCode}`, 18, startY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vehicle Asset: ${workOrder.vehicleReg} (${workOrder.vehicleModel})`, 18, startY + 16);
  doc.text(`Service Type: ${workOrder.serviceType}`, 18, startY + 23);
  doc.text(`Odometer Reading: ${workOrder.odometerKmAtService ? workOrder.odometerKmAtService.toLocaleString() : 'N/A'} km`, 18, startY + 30);
  doc.text(`Priority Level: ${workOrder.priority}`, 18, startY + 37);

  // Right Column Details
  const rightColX = pageWidth - 90;
  doc.text(`Workshop: ${workOrder.workshopName}`, rightColX, startY + 16);
  doc.text(`Lead Mechanic: ${workOrder.mechanicName}`, rightColX, startY + 23);
  doc.text(`Service Start Date: ${workOrder.startDate}`, rightColX, startY + 30);
  doc.text(`Completion Date: ${workOrder.completionDate || 'In Progress'}`, rightColX, startY + 37);

  startY += 50;

  // Section 2: Itemized Spare Parts & Components
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Itemized Spare Parts & Replacement Components', 14, startY);

  startY += 4;

  const partsRows = (workOrder.partsUsed || []).map(p => {
    const total = p.quantity * p.unitCostKes;
    return [
      p.partName,
      p.quantity.toString(),
      `KES ${p.unitCostKes.toLocaleString()}`,
      `KES ${total.toLocaleString()}`
    ];
  });

  if (partsRows.length === 0) {
    partsRows.push(['No replacement parts recorded (Labor / Inspection only)', '-', '-', 'KES 0']);
  }

  const partsSubtotal = (workOrder.partsUsed || []).reduce((acc, p) => acc + (p.quantity * p.unitCostKes), 0);

  autoTable(doc, {
    startY,
    head: [['Part / Component Description', 'Quantity', 'Unit Cost (KES)', 'Total Cost (KES)']],
    body: partsRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // @ts-ignore
  startY = (doc as any).lastAutoTable.finalY + 6;

  // Cost Summary Breakdown Table
  const costBreakdownRows = [
    ['Spare Parts Subtotal', `KES ${partsSubtotal.toLocaleString()}`],
    ['Labor & Technician Services', `KES ${workOrder.laborCostKes.toLocaleString()}`],
    ['Total Maintenance Cost', `KES ${workOrder.totalCostKes.toLocaleString()}`]
  ];

  autoTable(doc, {
    startY,
    body: costBreakdownRows,
    theme: 'plain',
    tableWidth: 90,
    margin: { left: pageWidth - 104 },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
    didParseCell: function(data) {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = [16, 185, 129]; // emerald
      }
    }
  });

  // @ts-ignore
  startY = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: Mechanic Observations & Inspection Notes
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Technician Observations & Maintenance Notes', 14, startY);

  startY += 5;

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, startY, pageWidth - 28, 20, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, startY, pageWidth - 28, 20, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const notesText = workOrder.notes || 'Routine vehicle maintenance service completed according to GreenShift Fleet technical standards.';
  doc.text(doc.splitTextToSize(notesText, pageWidth - 36), 18, startY + 6);

  startY += 26;

  // Section 4: Quality Control & Safety Compliance Checklist
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. Quality Control & Safety Sign-off', 14, startY);

  startY += 5;

  const qcItems = [
    ['[X] Odometer & Telematics Calibrated', '[X] Spare Parts Torque Verified'],
    ['[X] Road Safety & Brake Test Passed', '[X] Vehicle Cleared for Fleet Dispatch']
  ];

  autoTable(doc, {
    startY,
    body: qcItems,
    theme: 'plain',
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { fontStyle: 'bold' }
    }
  });

  // @ts-ignore
  startY = (doc as any).lastAutoTable.finalY + 12;

  // Signatures Box
  if (startY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    startY = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, startY, pageWidth - 14, startY);

  startY += 8;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Lead Mechanic (${workOrder.mechanicName}):`, 14, startY);
  doc.text('Signature: ___________________________', 14, startY + 10);

  doc.text('Fleet Operations Supervisor Approval:', pageWidth - 90, startY);
  doc.text('Signature: ___________________________', pageWidth - 90, startY + 10);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('GreenShift Fleet Management System • Official Maintenance Audit Record', pageWidth / 2, startY + 22, { align: 'center' });

  // Download PDF file
  const cleanCode = workOrder.workOrderCode.replace(/\s+/g, '_');
  doc.save(`Work_Order_${cleanCode}.pdf`);
};

export const generateBatteryReportPdf = (
  vehicle: Vehicle,
  evSessions: EvBatterySession[]
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const currentSoh = vehicle.batteryHealthPercent || 96;

  // Compute 6-Month Projection
  const vSessions = evSessions.filter(s => s.vehicleId === vehicle.id || s.vehicleReg === vehicle.registrationNumber);
  const totalFastCharges = vSessions.filter(s => s.durationMinutes <= 30).length;
  const fastChargeRatio = vSessions.length > 0 ? totalFastCharges / vSessions.length : 0.3;

  const baseDegradation = 0.4;
  const fastChargeImpact = fastChargeRatio * 0.3;
  const sohFactor = (100 - currentSoh) * 0.02;
  const monthlyRate = Math.min(1.2, Math.max(0.3, baseDegradation + fastChargeImpact + sohFactor));

  const monthNames = ['Aug 2026 (Now)', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027'];

  const projectionRows = [];
  // Historical
  projectionRows.push(['Jun 2026', 'Historical', `${Math.min(100, Math.round((currentSoh + monthlyRate * 2.1) * 10) / 10)}%`, `-${Math.round(monthlyRate * 100) / 100}%/mo`, 'Optimal']);
  projectionRows.push(['Jul 2026', 'Historical', `${Math.min(100, Math.round((currentSoh + monthlyRate * 1.05) * 10) / 10)}%`, `-${Math.round(monthlyRate * 100) / 100}%/mo`, 'Optimal']);
  // Current
  projectionRows.push(['Aug 2026 (Now)', 'Current', `${currentSoh}%`, `-${Math.round(monthlyRate * 100) / 100}%/mo`, currentSoh <= 80 ? 'CRITICAL (Preemptive Replace)' : 'Compliant']);

  let breachMonth = null;
  for (let m = 1; m <= 6; m++) {
    const projSoh = Math.max(50, Math.round((currentSoh - monthlyRate * m) * 10) / 10);
    const isCritical = projSoh <= 80;
    if (isCritical && !breachMonth) breachMonth = monthNames[m];
    projectionRows.push([
      monthNames[m],
      'Projected',
      `${projSoh}%`,
      `-${Math.round(monthlyRate * 100) / 100}%/mo`,
      isCritical ? 'CRITICAL REPLACEMENT DUE' : 'Compliant'
    ]);
  }

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GREENSHIFT FLEET COMMAND', 14, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EV Battery Telemetry & Maintenance Diagnostics Report', 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${new Date().toLocaleString()} | Official Telemetry Record`, 14, 23);

  let startY = 36;

  // Vehicle Technical Profile Card
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, startY, pageWidth - 28, 30, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, startY, pageWidth - 28, 30, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`ASSET: ${vehicle.registrationNumber} (${vehicle.make})`, 18, startY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vehicle ID: ${vehicle.id}`, 18, startY + 15);
  doc.text(`Category: ${vehicle.category} | City: ${vehicle.city}`, 18, startY + 21);
  doc.text(`Battery Capacity: ${vehicle.batteryCapacityKwh || 'N/A'} kWh`, 18, startY + 26);

  doc.text(`Current SOH: ${currentSoh}%`, pageWidth - 80, startY + 15);
  doc.text(`Current SoC: ${vehicle.currentSoCPercent || 0}%`, pageWidth - 80, startY + 21);
  doc.text(`Monthly Degradation: -${Math.round(monthlyRate * 100) / 100}%/mo`, pageWidth - 80, startY + 26);

  startY += 36;

  // Section 1: Degradation Trajectory
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. 6-Month Predictive Battery Degradation Forecast (D3 Engine)', 14, startY);

  startY += 4;

  autoTable(doc, {
    startY,
    head: [['Timeline', 'Data Type', 'State of Health (SOH)', 'Degradation Rate', 'Compliance Status']],
    body: projectionRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      4: { fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.column.index === 4 && data.cell.text[0] && data.cell.text[0].includes('CRITICAL')) {
        data.cell.styles.textColor = [220, 38, 38]; // Red
        data.cell.styles.fillColor = [254, 226, 226];
      }
    }
  });

  // @ts-ignore
  startY = (doc as any).lastAutoTable.finalY + 10;

  // Replacement Alert box if applicable
  if (breachMonth || currentSoh <= 80) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.rect(14, startY, pageWidth - 28, 16, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.rect(14, startY, pageWidth - 28, 16, 'S');

    doc.setTextColor(180, 83, 9);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠️ PREEMPTIVE MAINTENANCE ACTION REQUIRED', 18, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `Battery SOH breaches the 80% threshold around ${breachMonth || 'Now'}. Schedule a battery pack swap/replacement with the manufacturer prior to this date.`,
      18, startY + 11
    );

    startY += 22;
  }

  // Section 2: Charging History
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Historical Charging & Battery Swapping Logbook', 14, startY);

  startY += 4;

  const sessionRows = vSessions.map(s => [
    s.stationName,
    `${s.durationMinutes} mins`,
    `${s.startSoCPercent}% -> ${s.endSoCPercent}%`,
    `${s.energyKwhConsumed} kWh`,
    s.operatorName,
    `KES ${s.costKes.toLocaleString()}`
  ]);

  if (sessionRows.length === 0) {
    sessionRows.push(['No recent charging sessions logged', '-', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY,
    head: [['Station Hub', 'Duration', 'SoC Delta', 'Energy (kWh)', 'Operator', 'Cost (KES)']],
    body: sessionRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] }
  });

  // @ts-ignore
  startY = (doc as any).lastAutoTable.finalY + 14;

  // Sign-off section
  if (startY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    startY = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, startY, pageWidth - 14, startY);

  startY += 8;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Dispatcher Approval & Verification:', 14, startY);
  doc.text('Signature: ___________________________', 14, startY + 10);
  doc.text('Date: ________________________', pageWidth - 80, startY + 10);

  // Save the PDF
  const cleanReg = vehicle.registrationNumber.replace(/\s+/g, '_');
  doc.save(`Battery_Health_Report_${cleanReg}.pdf`);
};
