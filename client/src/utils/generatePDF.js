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

function convertNumberToWords(amount) {
  const number = Math.round(amount);
  if (number === 0) return 'Rupees Zero Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const double = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function hundred(n) {
    let str = '';
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += single[n];
      } else {
        str += double[Math.floor(n / 10)] + (n % 10 ? ' ' + single[n % 10] : '');
      }
    }
    return str.trim();
  }

  let temp = number;
  let wordList = [];

  if (temp >= 10000000) {
    wordList.push(hundred(Math.floor(temp / 10000000)) + ' Crore');
    temp %= 10000000;
  }
  if (temp >= 100000) {
    wordList.push(hundred(Math.floor(temp / 100000)) + ' Lakh');
    temp %= 100000;
  }
  if (temp >= 1000) {
    wordList.push(hundred(Math.floor(temp / 1000)) + ' Thousand');
    temp %= 1000;
  }
  if (temp > 0) {
    wordList.push(hundred(temp));
  }

  const words = wordList.join(' ').trim();
  return `Rupees ${words} Only`;
}

export async function generateInvoicePDF(invoice) {
  const toastId = toast.loading('Generating invoice PDF...');

  const fontBase64 = await loadRobotoFont();
  let cs = 'Rs.'; // currency symbol

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(); // 210
  const margin = 10;
  const innerW = W - margin * 2; // 190

  if (fontBase64) {
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    cs = '₹';
  } else {
    doc.setFont('helvetica', 'normal');
  }

  const black   = [0, 0, 0];
  const navy    = [0, 51, 102];
  const blue    = [0, 0, 255];
  const darkRed = [180, 0, 0];
  const gray    = [200, 200, 200];

  // ─── helper: draw a bordered rect ───
  function rect(x, y, w, h) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
  }

  // ─── helper: horizontal line ───
  function hline(x1, y, x2) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.line(x1, y, x2, y);
  }

  // ─── helper: vertical line ───
  function vline(x, y1, y2) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.line(x, y1, x, y2);
  }

  // ══════════════════════════════════════════
  // SECTION 1: Company Header Box
  // ══════════════════════════════════════════
  const headerH = 28;
  rect(margin, 10, innerW, headerH);

  doc.setFontSize(16);
  doc.setTextColor(...navy);
  doc.setFont(fontBase64 ? 'Roboto' : 'helvetica', 'normal');
  doc.text('VIDHIM ENTERPRISES', W / 2, 19, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text(
    'FIRST FLOOR, 105, BHAURAO UDYOG NAGAR, KHARIGAON , ABOVE S K STEEL, BHAYANDER (E)-401105',
    W / 2, 24, { align: 'center' }
  );

  doc.text(`GST No: ${COMPANY.gst}`, W / 2, 28.5, { align: 'center' });
  doc.text(
    'Mobile No: 8286287102, 9892352600, E Mail ID: vidhimenterprises@gmail.com',
    W / 2, 33, { align: 'center' }
  );

  // ══════════════════════════════════════════
  // SECTION 2: TAX INVOICE Banner
  // ══════════════════════════════════════════
  const bannerY = 10 + headerH;
  const bannerH = 7;
  rect(margin, bannerY, innerW, bannerH);

  doc.setFontSize(11);
  doc.setTextColor(...black);
  doc.text('TAX  INVOICE', W / 2, bannerY + 5, { align: 'center' });

  // ══════════════════════════════════════════
  // SECTION 3: Invoice Details (2 columns)
  // ══════════════════════════════════════════
  const detailY = bannerY + bannerH;
  const detailH = 18;
  const midX = margin + innerW / 2;

  rect(margin, detailY, innerW, detailH);
  vline(midX, detailY, detailY + detailH);

  doc.setFontSize(8);
  doc.setTextColor(...black);
  const leftX = margin + 2;
  const rightX = midX + 2;

  doc.text('Order No :', leftX, detailY + 5);
  doc.text(`Invoice No.     :${invoice.invoice_number}`, leftX, detailY + 10);
  doc.text(`Invoice Date    :${invoice.invoice_date}`, leftX, detailY + 15);

  doc.text('E-way Bill  Reference No :', rightX, detailY + 5);
  doc.text('Vehicle No :', rightX, detailY + 10);
  doc.text('Date & Time of Supply :', rightX, detailY + 15);

  // ══════════════════════════════════════════
  // SECTION 4: Billed To / Shipped To
  // ══════════════════════════════════════════
  const sanitizedAddress = (invoice.customer_address || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(sanitizedAddress, 87);
  const billedH = Math.max(30, 6 + addrLines.length * 4 + 8);

  const billedY = detailY + detailH;
  rect(margin, billedY, innerW, billedH);
  vline(midX, billedY, billedY + billedH);

  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Billed to', leftX, billedY + 5);

  doc.setFontSize(8);
  doc.setTextColor(...blue);
  doc.text(`Name : ${invoice.customer_name}`, leftX, billedY + 10);

  doc.setFontSize(7.5);
  doc.setTextColor(...blue);
  let addrCurY = billedY + 14;
  const addrPrefix = 'Address : ';
  const addrIndent = leftX + doc.getTextWidth(addrPrefix);
  addrLines.forEach((line, i) => {
    if (i === 0) {
      doc.text(addrPrefix + line, leftX, addrCurY);
    } else {
      doc.text(line, addrIndent, addrCurY);
    }
    addrCurY += 4;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text(`GST No : ${invoice.customer_gst}`, leftX, addrCurY + 1);

  // Shipped To (right column — static)
  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Shipped To :', rightX, billedY + 5);
  doc.text('Name         :', rightX, billedY + 10);
  doc.text('Address      :', rightX, billedY + 15);

  // ══════════════════════════════════════════
  // SECTION 5: Product Table
  // ══════════════════════════════════════════
  const tableY = billedY + billedH;

  // Column widths: Sr | Description | HSN | QTY | Rate | Total
  const cols = { sr: 12, desc: 79, hsn: 24, qty: 20, rate: 20, total: 35 };
  // X positions
  const cX = {
    sr:    margin,
    desc:  margin + cols.sr,
    hsn:   margin + cols.sr + cols.desc,
    qty:   margin + cols.sr + cols.desc + cols.hsn,
    rate:  margin + cols.sr + cols.desc + cols.hsn + cols.qty,
    total: margin + cols.sr + cols.desc + cols.hsn + cols.qty + cols.rate,
  };
  const tableRight = margin + innerW;

  // Header row
  const thH = 10;
  rect(margin, tableY, innerW, thH);
  Object.values(cX).slice(1).forEach(x => vline(x, tableY, tableY + thH));

  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Sr.\nNo.', cX.sr + cols.sr / 2, tableY + 3.5, { align: 'center' });
  doc.text('Description of Goods / Service', cX.desc + cols.desc / 2, tableY + 6, { align: 'center' });
  doc.text('HSN CODE', cX.hsn + cols.hsn / 2, tableY + 6, { align: 'center' });
  doc.text('QTY', cX.qty + cols.qty / 2, tableY + 6, { align: 'center' });
  doc.text('Rate', cX.rate + cols.rate / 2, tableY + 6, { align: 'center' });
  doc.text('Total', cX.total + cols.total / 2, tableY + 6, { align: 'center' });

  // Item rows — minimum 10 rows to fill space
  const rowH = 7;
  const minRows = 10;
  const numItems = invoice.items.length;
  const numRows = Math.max(numItems, minRows);
  const itemsStartY = tableY + thH;

  for (let i = 0; i < numRows; i++) {
    const ry = itemsStartY + i * rowH;
    hline(margin, ry + rowH, tableRight);
    Object.values(cX).slice(1).forEach(x => vline(x, ry, ry + rowH));
    rect(margin, ry, innerW, rowH); // draws the row border

    if (i < numItems) {
      const it = invoice.items[i];
      doc.setFontSize(8);
      doc.setTextColor(...black);
      doc.text(`${i + 1}`, cX.sr + cols.sr / 2, ry + 5, { align: 'center' });
      doc.setTextColor(...blue);
      doc.text(it.product_name, cX.desc + 2, ry + 5);
      doc.setTextColor(...black);
      doc.text(`${it.hsn_code}`, cX.hsn + cols.hsn / 2, ry + 5, { align: 'center' });
      doc.text(`${parseFloat(it.quantity).toFixed(2)}`, cX.qty + cols.qty - 2, ry + 5, { align: 'right' });
      doc.text(`${parseFloat(it.rate).toFixed(0)}`, cX.rate + cols.rate - 2, ry + 5, { align: 'right' });
      doc.text(`${parseFloat(it.amount).toFixed(2)}`, cX.total + cols.total - 2, ry + 5, { align: 'right' });
    }
  }

  // ══════════════════════════════════════════
  // SECTION 6: Summary Rows (part of table)
  // ══════════════════════════════════════════
  const summaryStartY = itemsStartY + numRows * rowH;
  const sRowH = 6;

  function summaryRow(label, value, y, bold) {
    rect(margin, y, innerW, sRowH);
    Object.values(cX).slice(1).forEach(x => vline(x, y, y + sRowH));

    doc.setFontSize(7.5);
    doc.setTextColor(bold ? [180, 0, 0] : black);
    doc.text(label, cX.sr + 1, y + 4);

    if (value !== null && value !== undefined) {
      doc.setTextColor(...black);
      doc.text(String(value), cX.total + cols.total - 2, y + 4, { align: 'right' });
    }
  }

  const tv = parseFloat(invoice.taxable_value).toFixed(2);
  const grandTotal = parseFloat(invoice.total).toFixed(2);

  summaryRow('Taxable Value:', tv, summaryStartY, false);
  summaryRow('Freight & Insurance:', '', summaryStartY + sRowH, false);
  summaryRow('Total Taxable Value:', tv, summaryStartY + sRowH * 2, false);

  if (invoice.tax_type === 'cgst_sgst') {
    const cgst = parseFloat(invoice.cgst).toFixed(2);
    const sgst = parseFloat(invoice.sgst).toFixed(2);
    summaryRow(`Central Tax (CGST) @:`, cgst, summaryStartY + sRowH * 3, false);
    summaryRow(`State Tax (SGST) @:`, sgst, summaryStartY + sRowH * 4, false);
    summaryRow(`Integrated Tax (IGST) @:`, '', summaryStartY + sRowH * 5, false);
  } else {
    const igst = parseFloat(invoice.igst).toFixed(2);
    summaryRow(`Central Tax (CGST) @:`, '', summaryStartY + sRowH * 3, false);
    summaryRow(`State Tax (SGST) @:`, '', summaryStartY + sRowH * 4, false);
    summaryRow(`Integrated Tax (IGST) @:`, igst, summaryStartY + sRowH * 5, false);
  }

  summaryRow('Total Invoice Value:', Math.round(parseFloat(invoice.total)), summaryStartY + sRowH * 6, true);

  // ══════════════════════════════════════════
  // SECTION 7: Amount in Words
  // ══════════════════════════════════════════
  const wordsY = summaryStartY + sRowH * 7;
  const wordsH = 7;
  rect(margin, wordsY, innerW, wordsH);

  const totalWords = convertNumberToWords(invoice.total);
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text(`AMOUNT IN WORDS : ${totalWords.toUpperCase()}`, margin + 2, wordsY + 4.8);

  // ══════════════════════════════════════════
  // SECTION 8: Bottom — Payment / Bank / Terms | Certification
  // ══════════════════════════════════════════
  const terms = [
    '1. Payment requested by crossed cheque payee A/c  cheque/NEFT/RTGS only',
    '2.Our responsibility ceases on delivery of the goods to transport',
    '3. Goods supplied to order will not be accepted back',
    '4. Subject to Mumbai Jurisdiction',
    '5. Interest @24% p.a. will be charge on bill remaining unpaid after due date',
  ];

  doc.setFontSize(7.5);
  const termsLines = terms.map(t => doc.splitTextToSize(t, innerW * 0.65));
  let totalTermLines = 0;
  termsLines.forEach(tl => { totalTermLines += tl.length; });

  const bottomH = Math.max(48, 6 + totalTermLines * 3.5 + 8);
  const bottomY = wordsY + wordsH;
  const splitX = margin + innerW * 0.65;

  rect(margin, bottomY, innerW, bottomH);
  vline(splitX, bottomY, bottomY + bottomH);

  // Payment Term
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text('Payment Term :-', margin + 2, bottomY + 5);

  // Bank Detail
  doc.text(
    `Bank Detail :-${COMPANY.bank},${COMPANY.branch} {A/C No:-${COMPANY.account},IFS CODE:-${COMPANY.ifsc}}`,
    margin + 2, bottomY + 11, { maxWidth: splitX - margin - 4 }
  );

  // Terms & Conditions
  doc.setFontSize(7.8);
  doc.setTextColor(...black);
  doc.text('Terms & Conditions:', margin + 2, bottomY + 20);

  doc.setFontSize(7.5);
  doc.setTextColor(...blue);
  let tY = bottomY + 25;
  terms.forEach(t => {
    const wrapped = doc.splitTextToSize(t, splitX - margin - 4);
    wrapped.forEach(line => {
      doc.text(line, margin + 2, tY);
      tY += 3.8;
    });
  });

  // Right column: certification
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  const certX = splitX + 2;
  const certW = tableRight - splitX - 4;
  doc.text('Certified that the Particulars given', certX + certW / 2, bottomY + 10, { align: 'center' });
  doc.text('above are true and correct', certX + certW / 2, bottomY + 14, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text('FOR VIDHIM ENTERPRISES', certX + certW / 2, bottomY + bottomH - 16, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('(Prop: Manoj Shah)', certX + certW / 2, bottomY + bottomH - 5, { align: 'center' });

  // Dynamic page height crop
  const pageEnd = bottomY + bottomH + 5;
  const safePageHeight = Math.max(pageEnd, 211);
  doc.internal.pageSize.height = safePageHeight;

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  toast.dismiss(toastId);
}


  const secondaryColor = [71, 85, 105]; // Slate 600
  const lightGray = [241, 245, 249]; // Slate 100
  const borderGray = [226, 232, 240]; // Slate 200

  // Dynamically load Roboto Font which fully supports the Indian Rupee symbol (₹)
  const fontBase64 = await loadRobotoFont();
  let currencySymbol = 'Rs. ';
  
  // 1. Dry run with a test doc to calculate precise height of content
  const testDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  if (fontBase64) {
    testDoc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    testDoc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    testDoc.setFont('Roboto', 'normal');
    currencySymbol = '₹';
  }

  // Set the correct font size for address wrapping calculation!
  testDoc.setFontSize(8.5);
  // Calculate client address wrap Y height with carriage return sanitization
  const sanitizedAddress = (invoice.customer_address || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const clientAddrLines = testDoc.splitTextToSize(sanitizedAddress, 75);
  let addrY = 44 + 10.5; // billY = 44
  clientAddrLines.forEach(() => {
    addrY += 4;
  });
  
  const tableStartY = addrY + 7;
  const tableRows = invoice.items.map((it, idx) => [
    idx + 1,
    it.product_name,
    it.hsn_code,
    `${parseFloat(it.quantity).toFixed(2)} ${it.unit}`,
    `${currencySymbol}${parseFloat(it.rate).toFixed(2)}`,
    `${currencySymbol}${parseFloat(it.amount).toFixed(2)}`,
  ]);

  autoTable(testDoc, {
    startY: tableStartY,
    head: [['Sr. No.', 'Product Description', 'HSN Code', 'Qty / Unit', 'Rate', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 8, halign: 'left' },
    bodyStyles: { fontSize: 8, textColor: primaryColor },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 31, halign: 'right' },
    },
    styles: {
      font: fontBase64 ? 'Roboto' : 'helvetica',
      lineColor: borderGray,
      lineWidth: 0.15
    },
    didParseCell: function (data) {
      if (data.section === 'head' && [3, 4, 5].includes(data.column.index)) {
        data.cell.styles.halign = 'right';
      }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = testDoc.lastAutoTable.finalY + 6;

  // Calculate calculations height
  let taxY = finalY;
  const summaryCount = 2 + (invoice.tax_type === 'cgst_sgst' ? 2 : 1);
  taxY += summaryCount * 5.5;

  const infoY = finalY;
  const wordsY = Math.max(taxY + 15, infoY + 31);
  const bottomY = wordsY + 13;

  // Calculate terms wrapping height
  const terms = [
    '1. Payment requested by crossed cheque payee A/c cheque/NEFT/RTGS only',
    '2. Our responsibility ceases on delivery of the goods to transport',
    '3. Goods supplied to order will not be accepted back',
    '4. Subject to Mumbai Jurisdiction',
    '5. Interest @24% p.a. will be charge on bill remaining unpaid after due date'
  ];
  // Set the correct font size for terms wrapping calculation!
  testDoc.setFontSize(6.8);
  let termY = bottomY + 4.5;
  terms.forEach(term => {
    const wrappedTerm = testDoc.splitTextToSize(term, 105);
    wrappedTerm.forEach(() => {
      termY += 3.2;
    });
  });

  const signEndY = Math.max(termY, bottomY + 19);
  // Ensure height is always > 210mm (page width) to prevent jsPDF from swapping
  // width/height dimensions when height < width (which would make page narrower and cut off columns)
  const safePageHeight = Math.max(signEndY + 12, 211);

  // 2. Initialize the REAL document with exact custom height (so no extra whitespace exists!)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, safePageHeight] });
  const W = doc.internal.pageSize.getWidth();

  if (fontBase64) {
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    currencySymbol = '₹';
  } else {
    doc.setFont('helvetica', 'normal');
  }

  // 1. Company Logo & Title Header
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text(COMPANY.name, 14, 16);

  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  
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
  
  let currentAddrY = billY + 10.5;
  clientAddrLines.forEach(line => {
    doc.text(line, 14, currentAddrY);
    currentAddrY += 4;
  });

  doc.setTextColor(...primaryColor);
  doc.text(`GSTIN: ${invoice.customer_gst}`, 14, currentAddrY + 1);

  // 4. Products Table (Render on real doc)
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
    styles: {
      font: fontBase64 ? 'Roboto' : 'helvetica',
      lineColor: borderGray,
      lineWidth: 0.15
    },
    didParseCell: function (data) {
      if (data.section === 'head' && [3, 4, 5].includes(data.column.index)) {
        data.cell.styles.halign = 'right';
      }
    },
    margin: { left: 14, right: 14 }
  });

  // 5. Calculations / Taxes Block (Right aligned)
  const calcX = W - 14;
  let currentTaxY = finalY;

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
    doc.text(lbl, calcX - 60, currentTaxY);
    
    doc.setTextColor(...primaryColor);
    doc.text(val, calcX, currentTaxY, { align: 'right' });
    currentTaxY += 5.5;
  });

  // Total highlighting box
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(W - 74, currentTaxY + 1, 60, 10, 1.5, 1.5, 'FD');

  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text('Grand Total:', W - 70, currentTaxY + 7.5);
  doc.text(`${currencySymbol}${parseFloat(invoice.total).toFixed(2)}`, W - 18, currentTaxY + 7.5, { align: 'right' });

  // 6. Payment & Bank Information Block (Left aligned)
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Payment Terms:', 14, infoY);
  
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Payment due on receipt of invoice.', 14, infoY + 4.5);

  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Our Bank Account Details:', 14, infoY + 11);
  
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Bank Name:  ', 14, infoY + 16);
  doc.text('Branch:         ', 14, infoY + 19.5);
  doc.text('A/C Number:  ', 14, infoY + 23);
  doc.text('IFS Code:      ', 14, infoY + 26.5);

  doc.setTextColor(...primaryColor);
  doc.text(COMPANY.bank, 32, infoY + 16);
  doc.text(COMPANY.branch, 32, infoY + 19.5);
  doc.text(COMPANY.account, 32, infoY + 23);
  doc.text(COMPANY.ifsc, 32, infoY + 26.5);

  // 6.1 Amount Chargeable in Words
  const totalWords = convertNumberToWords(invoice.total);
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, wordsY, W - 28, 8, 1, 1, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Amount Chargeable (in words):', 18, wordsY + 5.2);

  doc.setTextColor(...primaryColor);
  doc.text(totalWords, 62, wordsY + 5.2);

  // 6.2 Bottom Blocks Side-by-Side: Terms & Conditions (Left) and Signature (Right)
  // Terms & Conditions (Left Column)
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Terms & Conditions:', 14, bottomY);

  doc.setFontSize(6.8);
  doc.setTextColor(...secondaryColor);
  
  let currentTermY = bottomY + 4.5;
  terms.forEach(term => {
    const wrappedTerm = doc.splitTextToSize(term, 105);
    wrappedTerm.forEach(line => {
      doc.text(line, 14, currentTermY);
      currentTermY += 3.2;
    });
  });

  // Signature Block (Right Column)
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('For VIDHIM ENTERPRISES', W - 14, bottomY + 2, { align: 'right' });

  doc.setTextColor(...secondaryColor);
  doc.text('Authorized Signatory', W - 14, bottomY + 19, { align: 'right' });

  // Clean Footer Line
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.2);
  doc.line(14, signEndY + 2, W - 14, signEndY + 2);

  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Thank you for your business!', W / 2, signEndY + 6, { align: 'center' });

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  toast.dismiss(toastId);
}
