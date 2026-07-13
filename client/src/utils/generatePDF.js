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

let robotoFontBase64 = null;

async function loadRobotoFont() {
  if (robotoFontBase64) return robotoFontBase64;
  try {
    const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
    if (!res.ok) throw new Error('CDN unreachable');
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    robotoFontBase64 = window.btoa(binary);
    return robotoFontBase64;
  } catch (err) {
    console.warn('Could not load Roboto font, falling back.', err);
    return null;
  }
}

function convertNumberToWords(amount) {
  const number = Math.round(amount);
  if (number === 0) return 'Rupees Zero Only';
  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const double = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function hundred(n) {
    let str = '';
    if (n >= 100) { str += single[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n > 0) str += n < 20 ? single[n] : double[Math.floor(n / 10)] + (n % 10 ? ' ' + single[n % 10] : '');
    return str.trim();
  }

  let temp = number;
  const parts = [];
  if (temp >= 10000000) { parts.push(hundred(Math.floor(temp / 10000000)) + ' Crore'); temp %= 10000000; }
  if (temp >= 100000)   { parts.push(hundred(Math.floor(temp / 100000))   + ' Lakh');  temp %= 100000;   }
  if (temp >= 1000)     { parts.push(hundred(Math.floor(temp / 1000))     + ' Thousand'); temp %= 1000;  }
  if (temp > 0)         { parts.push(hundred(temp)); }
  return `Rupees ${parts.join(' ')} Only`;
}

export async function generateInvoicePDF(invoice) {
  const toastId = toast.loading('Generating invoice PDF...');

  const fontBase64 = await loadRobotoFont();
  let cs = 'Rs.';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 10;
  const innerW = W - margin * 2; // 190mm

  const font = fontBase64 ? 'Roboto' : 'helvetica';
  if (fontBase64) {
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    cs = '₹';
  } else {
    doc.setFont('helvetica', 'normal');
  }

  // ── Strict black & white palette ────────────────────────
  const black     = [0,   0,   0  ];
  const white     = [255, 255, 255];
  const darkFill  = [30,  30,  30 ];   // near-black for filled header rows
  const midFill   = [80,  80,  80 ];   // medium gray for sub-headers
  const lightFill = [240, 240, 240];   // very light gray for alt rows
  const totalFill = [210, 210, 210];   // light gray for total row (premium)

  // ── Drawing helpers ──────────────────────────────────────
  const tableRight = margin + innerW;
  const leftX  = margin + 3;

  function filledRect(x, y, w, h, fill) {
    doc.setFillColor(...fill);
    doc.setDrawColor(...black);
    doc.setLineWidth(0.25);
    doc.rect(x, y, w, h, 'FD');
  }
  function outlineRect(x, y, w, h) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.25);
    doc.rect(x, y, w, h);
  }
  function vline(x, y1, y2) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.25);
    doc.line(x, y1, x, y2);
  }
  function hline(x1, y, x2, lw = 0.25) {
    doc.setDrawColor(...black);
    doc.setLineWidth(lw);
    doc.line(x1, y, x2, y);
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 1 — Company Header (dark fill, white text)
  // ══════════════════════════════════════════════════════════
  const headerH = 30;
  filledRect(margin, 10, innerW, headerH, darkFill);

  doc.setFontSize(18);
  doc.setTextColor(...white);
  doc.setFont(font, 'normal');
  doc.text('VIDHIM ENTERPRISES', W / 2, 21, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  doc.text('FIRST FLOOR, 105, BHAURAO UDYOG NAGAR, KHARIGAON, ABOVE S K STEEL, BHAYANDER (E)-401105', W / 2, 26.5, { align: 'center' });
  doc.text(`GST No: ${COMPANY.gst}`, W / 2, 30.5, { align: 'center' });
  doc.text(`Mobile: ${COMPANY.phone.replace('+91 ', '')}   |   Email: ${COMPANY.email}`, W / 2, 34.5, { align: 'center' });

  // ══════════════════════════════════════════════════════════
  // SECTION 2 — TAX INVOICE Banner (light gray fill)
  // ══════════════════════════════════════════════════════════
  const bannerY = 10 + headerH;
  const bannerH = 8;
  filledRect(margin, bannerY, innerW, bannerH, lightFill);
  doc.setFontSize(11);
  doc.setTextColor(...black);
  doc.text('TAX  INVOICE', W / 2, bannerY + 5.5, { align: 'center' });

  // ══════════════════════════════════════════════════════════
  // SECTION 3 — Invoice Details (no Order No)
  // ══════════════════════════════════════════════════════════
  const detailY = bannerY + bannerH;
  const detailH = 20;
  const midX = margin + innerW / 2;
  const rightX = midX + 3;

  outlineRect(margin, detailY, innerW, detailH);
  vline(midX, detailY, detailY + detailH);

  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Invoice No.',  leftX, detailY + 5);
  doc.text('Invoice Date', leftX, detailY + 12);
  doc.text(`:  ${invoice.invoice_number}`, leftX + 28, detailY + 5);
  doc.text(`:  ${invoice.invoice_date}`,   leftX + 28, detailY + 12);

  doc.text('E-way Bill Ref No.',    rightX, detailY + 5);
  doc.text('Vehicle No.',           rightX, detailY + 12);
  doc.text('Date & Time of Supply', rightX, detailY + 18);
  doc.text(`:  ${invoice.eway_bill_no   || ''}`, rightX + 40, detailY + 5);
  doc.text(`:  ${invoice.vehicle_no     || ''}`, rightX + 40, detailY + 12);
  doc.text(`:  ${invoice.supply_datetime || ''}`, rightX + 40, detailY + 18);

  // ══════════════════════════════════════════════════════════
  // SECTION 4 — Billed To / Shipped To
  // ══════════════════════════════════════════════════════════
  const sanitizedAddress = (invoice.customer_address || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(sanitizedAddress, 85);
  // 6px header strip + 6px customer name + address lines (4px each) + 8px for GST line + 6px bottom padding
  const billedH = Math.max(34, 6 + 6 + addrLines.length * 4 + 14);

  const billedY = detailY + detailH;
  outlineRect(margin, billedY, innerW, billedH);
  vline(midX, billedY, billedY + billedH);

  // "BILLED TO" sub-header strips
  filledRect(margin, billedY, innerW / 2, 6, lightFill);
  filledRect(midX,   billedY, innerW / 2, 6, lightFill);

  doc.setFontSize(7);
  doc.setTextColor(...black);
  doc.text('BILLED TO', leftX, billedY + 4.2);
  doc.text('SHIPPED TO', rightX, billedY + 4.2);

  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text(invoice.customer_name, leftX, billedY + 12);

  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  let addrCurY = billedY + 17;
  const addrPrefix = 'Address : ';
  const addrIndent = leftX + doc.getTextWidth(addrPrefix);
  addrLines.forEach((line, i) => {
    doc.text(i === 0 ? addrPrefix + line : line, i === 0 ? leftX : addrIndent, addrCurY);
    addrCurY += 4;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text(`GST No : ${invoice.customer_gst}`, leftX, addrCurY + 2);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const shippedName = invoice.shipped_to_name || '';
  const shippedAddr = invoice.shipped_to_address || '';
  if (shippedName) {
    doc.setFontSize(8.5);
    doc.setTextColor(...black);
    doc.text(shippedName, rightX, billedY + 12);
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    const shAddrLines = doc.splitTextToSize(shippedAddr, 85);
    let shY = billedY + 17;
    shAddrLines.forEach(line => { doc.text(line, rightX, shY); shY += 4; });
  } else {
    doc.text('Name         :', rightX, billedY + 12);
    doc.text('Address      :', rightX, billedY + 17);
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 5 — Product Table
  // ══════════════════════════════════════════════════════════
  const tableY = billedY + billedH;

  const cols = { sr: 12, desc: 79, hsn: 22, qty: 20, rate: 22, total: 35 };
  const cX = {
    sr:    margin,
    desc:  margin + cols.sr,
    hsn:   margin + cols.sr + cols.desc,
    qty:   margin + cols.sr + cols.desc + cols.hsn,
    rate:  margin + cols.sr + cols.desc + cols.hsn + cols.qty,
    total: margin + cols.sr + cols.desc + cols.hsn + cols.qty + cols.rate,
  };
  const colXArr = Object.values(cX).slice(1);

  // Table header — dark fill, white text
  const thH = 9;
  filledRect(margin, tableY, innerW, thH, darkFill);
  colXArr.forEach(x => vline(x, tableY, tableY + thH));

  doc.setFontSize(7.5);
  doc.setTextColor(...white);
  doc.text('Sr.\nNo.', cX.sr + cols.sr / 2, tableY + 2.5, { align: 'center' });
  doc.text('Description of Goods / Service', cX.desc + cols.desc / 2, tableY + 5.5, { align: 'center' });
  doc.text('HSN CODE', cX.hsn + cols.hsn / 2, tableY + 5.5, { align: 'center' });
  doc.text('QTY', cX.qty + cols.qty / 2, tableY + 5.5, { align: 'center' });
  doc.text('Rate', cX.rate + cols.rate / 2, tableY + 5.5, { align: 'center' });
  doc.text('Total', cX.total + cols.total / 2, tableY + 5.5, { align: 'center' });

  // Item rows — alternate light gray / white
  const rowH = 7;
  const numItems = invoice.items.length;
  const numRows = Math.max(numItems, 10);
  const itemsStartY = tableY + thH;

  for (let i = 0; i < numRows; i++) {
    const ry = itemsStartY + i * rowH;
    filledRect(margin, ry, innerW, rowH, i % 2 === 1 ? lightFill : white);
    colXArr.forEach(x => vline(x, ry, ry + rowH));

    if (i < numItems) {
      const it = invoice.items[i];
      doc.setFontSize(8);
      doc.setTextColor(...black);
      doc.text(`${i + 1}`, cX.sr + cols.sr / 2, ry + 5, { align: 'center' });
      doc.text(it.product_name, cX.desc + 2, ry + 5);
      doc.text(`${it.hsn_code}`, cX.hsn + cols.hsn / 2, ry + 5, { align: 'center' });
      doc.text(`${parseFloat(it.quantity).toFixed(2)}`, cX.qty + cols.qty - 2, ry + 5, { align: 'right' });
      doc.text(`${parseFloat(it.rate).toFixed(0)}`, cX.rate + cols.rate - 2, ry + 5, { align: 'right' });
      doc.text(`${parseFloat(it.amount).toFixed(2)}`, cX.total + cols.total - 2, ry + 5, { align: 'right' });
    }
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 6 — Summary Rows (conditional tax, round off)
  // ══════════════════════════════════════════════════════════
  const summaryStartY = itemsStartY + numRows * rowH;
  const sRowH = 6.5;

  // Separator before summary
  hline(margin, summaryStartY, tableRight, 0.5);

  function summaryRow(label, value, y, bold) {
    // light fill for total row, white for others
    filledRect(margin, y, innerW, sRowH, bold ? totalFill : white);
    // Only draw the single divider before the Total value column
    vline(cX.total, y, y + sRowH);
    hline(margin, y + sRowH, tableRight);

    doc.setFontSize(bold ? 8 : 7.5);
    doc.setTextColor(...black);
    doc.text(label, cX.sr + 2, y + sRowH - 2);

    if (value !== '' && value !== null && value !== undefined && value !== false) {
      doc.text(String(value), cX.total + cols.total - 2, y + sRowH - 2, { align: 'right' });
    }
  }

  const tv = parseFloat(invoice.taxable_value).toFixed(2);
  const roundOff = parseFloat(invoice.roundoff || 0);
  const roundOffStr = (roundOff >= 0 ? '+' : '') + roundOff.toFixed(2);

  let sY = summaryStartY;
  summaryRow('Taxable Value',           tv,         sY,          false); sY += sRowH;
  summaryRow('Freight & Insurance',     '',         sY,          false); sY += sRowH;
  summaryRow('Total Taxable Value',     tv,         sY,          false); sY += sRowH;

  if (invoice.tax_type === 'cgst_sgst') {
    summaryRow('Central Tax (CGST) @ 2.5%',  parseFloat(invoice.cgst).toFixed(2), sY, false); sY += sRowH;
    summaryRow('State Tax (SGST) @ 2.5%',    parseFloat(invoice.sgst).toFixed(2), sY, false); sY += sRowH;
  } else {
    summaryRow('Integrated Tax (IGST) @ 5%', parseFloat(invoice.igst).toFixed(2), sY, false); sY += sRowH;
  }

  summaryRow('Round Off',             roundOffStr,                       sY, false); sY += sRowH;
  summaryRow('Total Invoice Value',   Math.round(parseFloat(invoice.total)), sY, true);  sY += sRowH;

  // ══════════════════════════════════════════════════════════
  // SECTION 7 — Amount in Words (light gray fill)
  // ══════════════════════════════════════════════════════════
  const wordsY = sY;
  const wordsH = 8;
  filledRect(margin, wordsY, innerW, wordsH, lightFill);

  const totalWords = convertNumberToWords(invoice.total);
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text('Amount in Words :', leftX, wordsY + 5.2);
  doc.text(totalWords.toUpperCase(), leftX + 37, wordsY + 5.2);

  // ══════════════════════════════════════════════════════════
  // SECTION 8 — Bottom: Payment/Terms | Certification
  // ══════════════════════════════════════════════════════════
  const terms = [
    '1. Payment requested by crossed cheque payee A/c cheque/NEFT/RTGS only',
    '2. Our responsibility ceases on delivery of the goods to transport',
    '3. Goods supplied to order will not be accepted back',
    '4. Subject to Mumbai Jurisdiction',
    '5. Interest @24% p.a. will be charged on bill remaining unpaid after due date',
  ];

  doc.setFontSize(7.5);
  const splitX = margin + innerW * 0.65;
  const termsWrapped = terms.map(t => doc.splitTextToSize(t, splitX - margin - 5));
  const totalTermLines = termsWrapped.reduce((s, l) => s + l.length, 0);
  const bottomH = Math.max(52, 30 + totalTermLines * 3.8 + 4);
  const bottomY = wordsY + wordsH;

  outlineRect(margin, bottomY, innerW, bottomH);
  vline(splitX, bottomY, bottomY + bottomH);

  // Left & right sub-header strips
  filledRect(margin, bottomY, splitX - margin, 6, lightFill);
  filledRect(splitX, bottomY, tableRight - splitX, 6, lightFill);

  doc.setFontSize(7);
  doc.setTextColor(...black);
  doc.text('PAYMENT & BANK DETAILS', leftX, bottomY + 4.2);

  const certX = splitX + 3;
  const certW = tableRight - splitX - 4;
  doc.text('FOR VIDHIM ENTERPRISES', certX + certW / 2, bottomY + 4.2, { align: 'center' });

  // Bank details
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text('Payment Term :-', leftX, bottomY + 11);
  doc.setTextColor(50, 50, 50);
  doc.text(`Bank : ${COMPANY.bank}, ${COMPANY.branch}`, leftX, bottomY + 16.5, { maxWidth: splitX - margin - 5 });
  doc.text(`A/C No: ${COMPANY.account}   |   IFS Code: ${COMPANY.ifsc}`, leftX, bottomY + 22, { maxWidth: splitX - margin - 5 });

  doc.setFontSize(7.8);
  doc.setTextColor(...black);
  doc.text('Terms & Conditions:', leftX, bottomY + 29);

  doc.setFontSize(7.2);
  doc.setTextColor(50, 50, 50);
  let tY = bottomY + 34;
  termsWrapped.forEach(wrapped => {
    wrapped.forEach(line => {
      doc.text(line, leftX, tY);
      tY += 3.8;
    });
  });

  // Right column
  doc.setFontSize(7.2);
  doc.setTextColor(80, 80, 80);
  doc.text('Certified that the particulars given', certX + certW / 2, bottomY + 14, { align: 'center' });
  doc.text('above are true and correct', certX + certW / 2, bottomY + 18, { align: 'center' });

  hline(splitX + 4, bottomY + bottomH - 14, tableRight - 4, 0.4);

  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text('FOR VIDHIM ENTERPRISES', certX + certW / 2, bottomY + bottomH - 9, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('(Prop: Manoj Shah)', certX + certW / 2, bottomY + bottomH - 4, { align: 'center' });

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  toast.dismiss(toastId);
}
