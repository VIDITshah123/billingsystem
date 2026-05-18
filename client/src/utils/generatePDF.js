import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const COMPANY = {
  name: 'VIDHIM ENTERPRISES',
  address: 'First Floor, 105, Bhaurao Udyog Nagar, Kharigaon,\nAbove S K Steel, Bhayander (E) - 401105',
  phone: '+91 9892352600',
  email: 'vidhimenterprises@gmail.com',
  gst: '27AXVPS9856J1Z4',
  bank: 'UNION BANK OF INDIA',
  branch: 'BHAYANDAR EAST, JESAL PARK BRANCH',
  account: '510101006809654',
  ifsc: 'UBIN0904554',
};

// Global cache for base64 font data to avoid fetching multiple times
let robotoFontBase64 = null;

async function loadRobotoFont() {
  if (robotoFontBase64) return robotoFontBase64;
  try {
    const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
    if (!res.ok) throw new Error('CDN unreachable');
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    robotoFontBase64 = window.btoa(binary);
    return robotoFontBase64;
  } catch (err) {
    console.warn('Could not download Unicode Roboto font. Falling back to default PDF fonts.', err);
    return null;
  }
}

export async function generateInvoicePDF(invoice) {
  const toastId = toast.loading('Generating high-quality invoice PDF...');
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  
  // Clean color scheme: Slate Gray & Dark Charcoal
  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [71, 85, 105]; // Slate 600
  const lightGray = [241, 245, 249]; // Slate 100
  const borderGray = [226, 232, 240]; // Slate 200

  // Dynamically load Roboto Font which fully supports the Indian Rupee symbol (₹)
  const fontBase64 = await loadRobotoFont();
  let currencySymbol = 'Rs. ';
  
  if (fontBase64) {
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    currencySymbol = '₹'; // Successfully loaded unicode font, safe to use ₹ symbol
  } else {
    doc.setFont('helvetica', 'normal');
  }

  // 1. Company Logo & Title Header
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text(COMPANY.name, 14, 16);

  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  
  // Split company address lines for clean vertical rendering
  const companyAddr = COMPANY.address.split('\n');
  doc.text(companyAddr[0], 14, 21.5);
  doc.text(companyAddr[1], 14, 25.5);
  doc.text(`Phone: ${COMPANY.phone}   |   Email: ${COMPANY.email}`, 14, 29.5);
  doc.text(`GSTIN: ${COMPANY.gst}`, 14, 33.5);

  // 2. Right Aligned Tax Invoice Title
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('TAX INVOICE', W - 14, 16, { align: 'right' });

  // Invoice Details Block
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(W - 74, 21, 60, 16, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.text('Invoice No:', W - 70, 27);
  doc.text('Date:', W - 70, 32);

  doc.setTextColor(...primaryColor);
  doc.text(invoice.invoice_number, W - 18, 27, { align: 'right' });
  doc.text(invoice.invoice_date, W - 18, 32, { align: 'right' });

  // Horizontal divider
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.line(14, 39, W - 14, 39);

  // 3. Billing details block
  const billY = 44;
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('BILL TO:', 14, billY);

  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text(invoice.customer_name, 14, billY + 5.5);

  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  
  // Wrap and print client address cleanly (limited to 75mm width so it wraps nicely)
  const clientAddrLines = doc.splitTextToSize(invoice.customer_address, 75);
  let addrY = billY + 10.5;
  clientAddrLines.forEach(line => {
    doc.text(line, 14, addrY);
    addrY += 4;
  });

  doc.setTextColor(...primaryColor);
  doc.text(`GSTIN: ${invoice.customer_gst}`, 14, addrY + 1);

  // 4. Products Table
  const tableStartY = addrY + 7;
  const tableRows = invoice.items.map((it, idx) => [
    idx + 1,
    it.product_name,
    it.hsn_code,
    `${parseFloat(it.quantity).toFixed(2)} ${it.unit}`,
    `${currencySymbol}${parseFloat(it.rate).toFixed(2)}`,
    `${currencySymbol}${parseFloat(it.amount).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Sr. No.', 'Product Description', 'HSN Code', 'Qty / Unit', 'Rate', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255], 
      fontSize: 8, 
      halign: 'left'
    },
    bodyStyles: { 
      fontSize: 8, 
      textColor: primaryColor 
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 31, halign: 'right' },
    },
    // Apply loaded Unicode font inside autoTable cells as well
    styles: {
      font: fontBase64 ? 'Roboto' : 'helvetica',
      lineColor: borderGray,
      lineWidth: 0.15
    },
    // Right align headers for numeric columns
    didParseCell: function (data) {
      if (data.section === 'head' && [3, 4, 5].includes(data.column.index)) {
        data.cell.styles.halign = 'right';
      }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable.finalY + 6;

  // 5. Calculations / Taxes Block (Right aligned, perfect width calculation)
  const calcX = W - 14;
  let taxY = finalY;

  const summary = [
    ['Taxable Value', `${currencySymbol}${parseFloat(invoice.taxable_value).toFixed(2)}`],
    ...(invoice.tax_type === 'cgst_sgst'
      ? [
          ['CGST @ 2.5%', `${currencySymbol}${parseFloat(invoice.cgst).toFixed(2)}`],
          ['SGST @ 2.5%', `${currencySymbol}${parseFloat(invoice.sgst).toFixed(2)}`]
        ]
      : [['IGST @ 5.0%', `${currencySymbol}${parseFloat(invoice.igst).toFixed(2)}`]]),
    ['Round Off', `${parseFloat(invoice.roundoff) >= 0 ? '+' : ''}${currencySymbol}${parseFloat(invoice.roundoff).toFixed(2)}`],
  ];

  doc.setFontSize(8.5);
  summary.forEach(([lbl, val]) => {
    doc.setTextColor(...secondaryColor);
    doc.text(lbl, calcX - 60, taxY);
    
    doc.setTextColor(...primaryColor);
    doc.text(val, calcX, taxY, { align: 'right' });
    taxY += 5.5;
  });

  // Total highlighting box
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(calcX - 64, taxY + 1, 64, 10, 1.5, 1.5, 'FD');

  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text('Grand Total:', calcX - 60, taxY + 7.5);
  doc.text(`${currencySymbol}${parseFloat(invoice.total).toFixed(2)}`, calcX - 4, taxY + 7.5, { align: 'right' });

  // 6. Payment & Bank Information Block (Left aligned, vertically matches total box)
  const infoY = finalY;
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Payment Terms:', 14, infoY);
  
  doc.setTextColor(...secondaryColor);
  doc.text('Payment due on receipt of invoice.', 14, infoY + 5);

  doc.setTextColor(...primaryColor);
  doc.text('Our Bank Account Details:', 14, infoY + 12);
  
  doc.setTextColor(...secondaryColor);
  doc.text(`Bank Name:  ${COMPANY.bank}`, 14, infoY + 17);
  doc.text(`Branch:         ${COMPANY.branch}`, 14, infoY + 21);
  doc.text(`A/C Number:  ${COMPANY.account}`, 14, infoY + 25);
  doc.text(`IFS Code:      ${COMPANY.ifsc}`, 14, infoY + 29);

  // 7. Signature (Clean right aligned bottom section)
  const signY = Math.max(taxY + 24, infoY + 38);
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('For VIDHIM ENTERPRISES', W - 14, signY, { align: 'right' });

  doc.setTextColor(...secondaryColor);
  doc.text('Authorized Signatory', W - 14, signY + 15, { align: 'right' });

  // Clean footer line
  doc.setDrawColor(...borderGray);
  doc.line(14, signY + 20, W - 14, signY + 20);

  doc.setFontSize(7.5);
  doc.text('Thank you for your business!', W / 2, signY + 24, { align: 'center' });

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  toast.dismiss(toastId);
}
