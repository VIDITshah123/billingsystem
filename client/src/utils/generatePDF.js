import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COMPANY = {
  name: 'VIDHIM ENTERPRISES',
  address: 'First Floor, 105, Bhaurao Udyog Nagar, Kharigaon,\nAbove S K Steel, Bhayander (E) - 401105',
  phone: '+91 9892352600',
  email: 'vidhimenterprises@gmail.com',
  gst: '27AXVPS9856J1Z4',
  bank: 'UNION BANK OF INDIA, Bhayandar East, Jesal Park Branch',
  account: '510101006809654',
  ifsc: 'UBIN0904554',
};

export function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(20, 20, 40);
  doc.rect(0, 0, W, 42, 'F');

  // Company name
  doc.setFontSize(16);
  doc.setTextColor(108, 99, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, 14, 14);

  // Company details
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 200);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.address, 14, 21);
  doc.text(`Ph: ${COMPANY.phone}  |  ${COMPANY.email}`, 14, 29);
  doc.text(`GST No: ${COMPANY.gst}`, 14, 35);

  // TAX INVOICE label
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', W - 14, 18, { align: 'right' });

  // Invoice meta box
  doc.setFillColor(30, 33, 48);
  doc.roundedRect(W - 70, 22, 56, 16, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(140, 144, 176);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice No:', W - 66, 29);
  doc.text('Date:', W - 66, 34);
  doc.setTextColor(232, 234, 246);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoice_number, W - 30, 29);
  doc.text(invoice.invoice_date, W - 30, 34);

  // Bill To
  const y1 = 48;
  doc.setFontSize(8);
  doc.setTextColor(108, 99, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 14, y1);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(invoice.customer_name, 14, y1 + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);

  // Address word-wrap
  const addrLines = doc.splitTextToSize(invoice.customer_address, 90);
  doc.text(addrLines, 14, y1 + 12);
  doc.text(`GST No: ${invoice.customer_gst}`, 14, y1 + 12 + addrLines.length * 4);

  // Items table
  const tableY = y1 + 30;
  const rows = invoice.items.map((it, i) => [
    i + 1,
    it.product_name,
    it.hsn_code,
    `${parseFloat(it.quantity).toFixed(2)} ${it.unit}`,
    `₹${parseFloat(it.rate).toFixed(2)}`,
    `₹${parseFloat(it.amount).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [['#', 'Description', 'HSN', 'Qty', 'Rate', 'Amount']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [20, 20, 40], textColor: [108, 99, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 60] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const afterTable = doc.lastAutoTable.finalY + 4;

  // Tax summary (right aligned)
  const taxX = W - 14;
  let ty = afterTable;

  const taxLines = [
    ['Taxable Value', `₹${parseFloat(invoice.taxable_value).toFixed(2)}`],
    ...(invoice.tax_type === 'cgst_sgst'
      ? [['CGST @ 2.5%', `₹${parseFloat(invoice.cgst).toFixed(2)}`], ['SGST @ 2.5%', `₹${parseFloat(invoice.sgst).toFixed(2)}`]]
      : [['IGST @ 5%', `₹${parseFloat(invoice.igst).toFixed(2)}`]]),
    ['Round Off', `${parseFloat(invoice.roundoff) >= 0 ? '+' : ''}₹${parseFloat(invoice.roundoff).toFixed(2)}`],
  ];

  doc.setFontSize(8);
  taxLines.forEach(([label, val]) => {
    doc.setTextColor(80, 80, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(label, taxX - 50, ty + 5);
    doc.setTextColor(40, 40, 60);
    doc.text(val, taxX, ty + 5, { align: 'right' });
    ty += 6;
  });

  // Total box
  doc.setFillColor(20, 20, 40);
  doc.roundedRect(W - 80, ty + 2, 66, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(108, 99, 255);
  doc.text('TOTAL:', W - 76, ty + 10);
  doc.setTextColor(255, 255, 255);
  doc.text(`₹${parseFloat(invoice.total).toFixed(2)}`, W - 18, ty + 10, { align: 'right' });

  // Footer section
  const footY = ty + 22;

  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(0.3);
  doc.line(14, footY, W - 14, footY);

  // Payment Terms
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 80);
  doc.text('Payment Term:', 14, footY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 100);
  doc.text('Payment due on receipt of invoice.', 14, footY + 13);

  // Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 80);
  doc.text('Bank Details:', 14, footY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 100);
  doc.text(COMPANY.bank, 14, footY + 28);
  doc.text(`A/C No: ${COMPANY.account}`, 14, footY + 34);
  doc.text(`IFSC Code: ${COMPANY.ifsc}`, 14, footY + 40);

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 80);
  doc.text('For VIDHIM ENTERPRISES', W - 14, footY + 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 150);
  doc.text('Authorised Signatory', W - 14, footY + 46, { align: 'right' });

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
}
