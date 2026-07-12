import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const COMPANY = {
  name: 'VIDHIM ENTERPRISES',
  address: 'First Floor, 105, Bhaurao Udyog Nagar, Kharigaon,\nAbove S K Steel, Bhayander (E) - 401105',
  phone: '+91 9892352600',
  mobile2: '8286287102',
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

  // ── Color palette ──────────────────────────────────────
  const black       = [0,   0,   0  ];
  const white       = [255, 255, 255];
  const navy        = [10,  36,  99 ];   // deep navy header
  const navyMid     = [21,  67,  160];   // medium blue accents
  const lightBlue   = [235, 242, 255];   // row alternate / words bg
  const deepRed     = [160,  20,  20];   // total row
  const lightRed    = [255, 235, 235];   // total row bg
  const grayRow     = [248, 249, 250];   // alt row shade
  const midGray     = [120, 120, 120];

  // ── Drawing helpers ────────────────────────────────────
  const tableRight = margin + innerW;

  function filledRect(x, y, w, h, fillColor) {
    doc.setFillColor(...fillColor);
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
  function hline(x1, y, x2) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.25);
    doc.line(x1, y, x2, y);
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 1 — Company Header (navy fill, white text)
  // ══════════════════════════════════════════════════════════
  const headerH = 30;
  filledRect(margin, 10, innerW, headerH, navy);

  doc.setFontSize(18);
  doc.setTextColor(...white);
  doc.setFont(font, 'normal');
  doc.text('VIDHIM ENTERPRISES', W / 2, 21, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(200, 220, 255);
  doc.text('FIRST FLOOR, 105, BHAURAO UDYOG NAGAR, KHARIGAON, ABOVE S K STEEL, BHAYANDER (E)-401105', W / 2, 26.5, { align: 'center' });
  doc.text(`GST No: ${COMPANY.gst}`, W / 2, 30.5, { align: 'center' });
  doc.text(`Mobile: ${COMPANY.mobile2}, ${COMPANY.phone.replace('+91 ', '')}   |   Email: ${COMPANY.email}`, W / 2, 34.5, { align: 'center' });

  // ══════════════════════════════════════════════════════════
  // SECTION 2 — TAX INVOICE Banner (light blue fill)
  // ══════════════════════════════════════════════════════════
  const bannerY = 10 + headerH;
  const bannerH = 8;
  filledRect(margin, bannerY, innerW, bannerH, lightBlue);
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text('TAX  INVOICE', W / 2, bannerY + 5.5, { align: 'center' });

  // ══════════════════════════════════════════════════════════
  // SECTION 3 — Invoice Details (2 columns, no Order No)
  // ══════════════════════════════════════════════════════════
  const detailY = bannerY + bannerH;
  const detailH = 14;
  const midX = margin + innerW / 2;

  outlineRect(margin, detailY, innerW, detailH);
  vline(midX, detailY, detailY + detailH);

  const leftX  = margin + 3;
  const rightX = midX + 3;

  doc.setFontSize(8);
  doc.setTextColor(...navy);
  doc.text('Invoice No.', leftX, detailY + 5);
  doc.text('Invoice Date', leftX, detailY + 11);

  doc.setTextColor(...black);
  doc.text(`:  ${invoice.invoice_number}`, leftX + 28, detailY + 5);
  doc.text(`:  ${invoice.invoice_date}`,   leftX + 28, detailY + 11);

  doc.setTextColor(...navy);
  doc.text('E-way Bill Ref No.', rightX, detailY + 5);
  doc.text('Vehicle No.', rightX, detailY + 11);

  doc.setTextColor(...midGray);
  doc.text(':',  rightX + 35, detailY + 5);
  doc.text(':',  rightX + 35, detailY + 11);

  // ══════════════════════════════════════════════════════════
  // SECTION 4 — Billed To / Shipped To
  // ══════════════════════════════════════════════════════════
  const sanitizedAddress = (invoice.customer_address || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(sanitizedAddress, 85);
  const billedH = Math.max(30, 8 + addrLines.length * 4 + 8);

  const billedY = detailY + detailH;
  outlineRect(margin, billedY, innerW, billedH);
  vline(midX, billedY, billedY + billedH);

  // Left column header
  filledRect(margin, billedY, innerW / 2, 6, lightBlue);
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('BILLED TO', leftX, billedY + 4.2);

  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text(invoice.customer_name, leftX, billedY + 11);

  doc.setFontSize(7.5);
  doc.setTextColor(60, 80, 120);
  let addrCurY = billedY + 16;
  const addrPrefix = 'Address : ';
  const addrIndent = leftX + doc.getTextWidth(addrPrefix);
  addrLines.forEach((line, i) => {
    doc.text(i === 0 ? addrPrefix + line : line, i === 0 ? leftX : addrIndent, addrCurY);
    addrCurY += 4;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text(`GST No : ${invoice.customer_gst}`, leftX, addrCurY + 1.5);

  // Right column header
  filledRect(midX, billedY, innerW / 2, 6, lightBlue);
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('SHIPPED TO', rightX, billedY + 4.2);

  doc.setFontSize(8);
  doc.setTextColor(...midGray);
  doc.text('Name         :', rightX, billedY + 11);
  doc.text('Address      :', rightX, billedY + 16);

  // ══════════════════════════════════════════════════════════
  // SECTION 5 — Product Table
  // ══════════════════════════════════════════════════════════
  const tableY = billedY + billedH;

  // Column widths (total 190mm)
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

  // Table header row — navy fill
  const thH = 9;
  filledRect(margin, tableY, innerW, thH, navy);
  colXArr.forEach(x => vline(x, tableY, tableY + thH));

  doc.setFontSize(7.5);
  doc.setTextColor(...white);
  doc.text('Sr.\nNo.', cX.sr + cols.sr / 2, tableY + 2.5, { align: 'center' });
  doc.text('Description of Goods / Service', cX.desc + cols.desc / 2, tableY + 5.5, { align: 'center' });
  doc.text('HSN CODE', cX.hsn + cols.hsn / 2, tableY + 5.5, { align: 'center' });
  doc.text('QTY', cX.qty + cols.qty / 2, tableY + 5.5, { align: 'center' });
  doc.text('Rate', cX.rate + cols.rate / 2, tableY + 5.5, { align: 'center' });
  doc.text('Total', cX.total + cols.total / 2, tableY + 5.5, { align: 'center' });

  // Item rows (min 10), alternate shading
  const rowH = 7;
  const numItems = invoice.items.length;
  const numRows = Math.max(numItems, 10);
  const itemsStartY = tableY + thH;

  for (let i = 0; i < numRows; i++) {
    const ry = itemsStartY + i * rowH;
    const rowFill = i % 2 === 1 ? grayRow : white;
    filledRect(margin, ry, innerW, rowH, rowFill);
    colXArr.forEach(x => vline(x, ry, ry + rowH));

    if (i < numItems) {
      const it = invoice.items[i];
      doc.setFontSize(8);
      doc.setTextColor(...navy);
      doc.text(`${i + 1}`, cX.sr + cols.sr / 2, ry + 5, { align: 'center' });
      doc.setTextColor(30, 80, 160);
      doc.text(it.product_name, cX.desc + 2, ry + 5);
      doc.setTextColor(...black);
      doc.text(`${it.hsn_code}`, cX.hsn + cols.hsn / 2, ry + 5, { align: 'center' });
      doc.text(`${parseFloat(it.quantity).toFixed(2)}`, cX.qty + cols.qty - 2, ry + 5, { align: 'right' });
      doc.text(`${parseFloat(it.rate).toFixed(0)}`, cX.rate + cols.rate - 2, ry + 5, { align: 'right' });
      doc.text(`${parseFloat(it.amount).toFixed(2)}`, cX.total + cols.total - 2, ry + 5, { align: 'right' });
    }
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 6 — Summary Rows
  // ══════════════════════════════════════════════════════════
  const summaryStartY = itemsStartY + numRows * rowH;
  const sRowH = 6;

  function summaryRow(label, value, y, isTotal) {
    if (isTotal) {
      filledRect(margin, y, innerW, sRowH, lightRed);
    } else {
      outlineRect(margin, y, innerW, sRowH);
    }
    colXArr.forEach(x => vline(x, y, y + sRowH));

    doc.setFontSize(7.5);
    doc.setTextColor(...(isTotal ? deepRed : navy));
    doc.text(label, cX.sr + 2, y + 4);

    if (value !== '' && value !== null && value !== undefined && value !== false) {
      doc.setTextColor(...(isTotal ? deepRed : black));
      doc.text(String(value), cX.total + cols.total - 2, y + 4, { align: 'right' });
    }
  }

  const tv = parseFloat(invoice.taxable_value).toFixed(2);
  summaryRow('Taxable Value:',           tv, summaryStartY,           false);
  summaryRow('Freight & Insurance:',     '',  summaryStartY + sRowH,   false);
  summaryRow('Total Taxable Value:',     tv, summaryStartY + sRowH*2, false);

  if (invoice.tax_type === 'cgst_sgst') {
    summaryRow('Central Tax (CGST) @ 2.5%:',   parseFloat(invoice.cgst).toFixed(2), summaryStartY + sRowH*3, false);
    summaryRow('State Tax (SGST) @ 2.5%:',     parseFloat(invoice.sgst).toFixed(2), summaryStartY + sRowH*4, false);
    summaryRow('Integrated Tax (IGST) @:',     '', summaryStartY + sRowH*5, false);
  } else {
    summaryRow('Central Tax (CGST) @:',        '', summaryStartY + sRowH*3, false);
    summaryRow('State Tax (SGST) @:',          '', summaryStartY + sRowH*4, false);
    summaryRow('Integrated Tax (IGST) @ 5%:',  parseFloat(invoice.igst).toFixed(2), summaryStartY + sRowH*5, false);
  }

  summaryRow('Total Invoice Value:', Math.round(parseFloat(invoice.total)), summaryStartY + sRowH * 6, true);

  // ══════════════════════════════════════════════════════════
  // SECTION 7 — Amount in Words (navy fill, white text)
  // ══════════════════════════════════════════════════════════
  const wordsY = summaryStartY + sRowH * 7;
  const wordsH = 8;
  filledRect(margin, wordsY, innerW, wordsH, lightBlue);

  const totalWords = convertNumberToWords(invoice.total);
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('Amount in Words :', margin + 2, wordsY + 5.2);
  doc.setTextColor(30, 60, 140);
  doc.text(totalWords.toUpperCase(), margin + 38, wordsY + 5.2);

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
  const bottomH = Math.max(50, 28 + totalTermLines * 3.8 + 4);
  const bottomY = wordsY + wordsH;

  outlineRect(margin, bottomY, innerW, bottomH);
  vline(splitX, bottomY, bottomY + bottomH);

  // Left column header strip
  filledRect(margin, bottomY, splitX - margin, 6, lightBlue);
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('PAYMENT & BANK DETAILS', leftX, bottomY + 4.2);

  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('Payment Term :-', leftX, bottomY + 11);

  doc.setTextColor(...black);
  doc.text(
    `Bank : ${COMPANY.bank}, ${COMPANY.branch}`,
    leftX, bottomY + 16.5, { maxWidth: splitX - margin - 5 }
  );
  doc.text(
    `A/C No: ${COMPANY.account}   |   IFS Code: ${COMPANY.ifsc}`,
    leftX, bottomY + 21.5, { maxWidth: splitX - margin - 5 }
  );

  doc.setFontSize(7.8);
  doc.setTextColor(...navy);
  doc.text('Terms & Conditions:', leftX, bottomY + 28);

  doc.setFontSize(7.2);
  doc.setTextColor(50, 50, 80);
  let tY = bottomY + 33;
  termsWrapped.forEach(wrapped => {
    wrapped.forEach(line => {
      doc.text(line, leftX, tY);
      tY += 3.8;
    });
  });

  // Right column header strip
  filledRect(splitX, bottomY, tableRight - splitX, 6, lightBlue);
  const certX = splitX + 2;
  const certW = tableRight - splitX - 4;

  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('FOR VIDHIM ENTERPRISES', certX + certW / 2, bottomY + 4.2, { align: 'center' });

  doc.setFontSize(7.2);
  doc.setTextColor(...midGray);
  doc.text('Certified that the particulars given', certX + certW / 2, bottomY + 13, { align: 'center' });
  doc.text('above are true and correct', certX + certW / 2, bottomY + 17, { align: 'center' });

  // Horizontal line before signature
  hline(splitX + 3, bottomY + bottomH - 14, tableRight - 3);

  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text('FOR VIDHIM ENTERPRISES', certX + certW / 2, bottomY + bottomH - 9, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(...midGray);
  doc.text('(Prop: Manoj Shah)', certX + certW / 2, bottomY + bottomH - 4, { align: 'center' });

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  toast.dismiss(toastId);
}
