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

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
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
  const wordList = [];

  if (temp >= 10000000) { wordList.push(hundred(Math.floor(temp / 10000000)) + ' Crore'); temp %= 10000000; }
  if (temp >= 100000)   { wordList.push(hundred(Math.floor(temp / 100000))   + ' Lakh');  temp %= 100000;   }
  if (temp >= 1000)     { wordList.push(hundred(Math.floor(temp / 1000))     + ' Thousand'); temp %= 1000;  }
  if (temp > 0)         { wordList.push(hundred(temp)); }

  return `Rupees ${wordList.join(' ').trim()} Only`;
}

export async function generateInvoicePDF(invoice) {
  const toastId = toast.loading('Generating invoice PDF...');

  const fontBase64 = await loadRobotoFont();
  let cs = 'Rs.';

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

  const black  = [0, 0, 0];
  const navy   = [0, 51, 102];
  const blue   = [0, 0, 255];

  function drawRect(x, y, w, h) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
  }
  function hline(x1, y, x2) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.line(x1, y, x2, y);
  }
  function vline(x, y1, y2) {
    doc.setDrawColor(...black);
    doc.setLineWidth(0.3);
    doc.line(x, y1, x, y2);
  }

  // ══════════════════════════════════════════════════════
  // SECTION 1: Company Header Box
  // ══════════════════════════════════════════════════════
  const headerH = 28;
  drawRect(margin, 10, innerW, headerH);

  doc.setFontSize(16);
  doc.setTextColor(...navy);
  doc.text('VIDHIM ENTERPRISES', W / 2, 19, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text('FIRST FLOOR, 105, BHAURAO UDYOG NAGAR, KHARIGAON , ABOVE S K STEEL, BHAYANDER (E)-401105', W / 2, 24, { align: 'center' });
  doc.text(`GST No: ${COMPANY.gst}`, W / 2, 28.5, { align: 'center' });
  doc.text('Mobile No: 8286287102, 9892352600, E Mail ID: vidhimenterprises@gmail.com', W / 2, 33, { align: 'center' });

  // ══════════════════════════════════════════════════════
  // SECTION 2: TAX INVOICE Banner
  // ══════════════════════════════════════════════════════
  const bannerY = 10 + headerH;
  const bannerH = 7;
  drawRect(margin, bannerY, innerW, bannerH);
  doc.setFontSize(11);
  doc.setTextColor(...black);
  doc.text('TAX  INVOICE', W / 2, bannerY + 5, { align: 'center' });

  // ══════════════════════════════════════════════════════
  // SECTION 3: Invoice Details (2 columns)
  // ══════════════════════════════════════════════════════
  const detailY = bannerY + bannerH;
  const detailH = 18;
  const midX = margin + innerW / 2;

  drawRect(margin, detailY, innerW, detailH);
  vline(midX, detailY, detailY + detailH);

  const leftX  = margin + 2;
  const rightX = midX + 2;

  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Order No :', leftX, detailY + 5);
  doc.text(`Invoice No.     :${invoice.invoice_number}`, leftX, detailY + 10);
  doc.text(`Invoice Date    :${invoice.invoice_date}`, leftX, detailY + 15);
  doc.text('E-way Bill  Reference No :', rightX, detailY + 5);
  doc.text('Vehicle No :', rightX, detailY + 10);
  doc.text('Date & Time of Supply :', rightX, detailY + 15);

  // ══════════════════════════════════════════════════════
  // SECTION 4: Billed To / Shipped To
  // ══════════════════════════════════════════════════════
  const sanitizedAddress = (invoice.customer_address || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  doc.setFontSize(7.5);
  const addrLines = doc.splitTextToSize(sanitizedAddress, 87);
  const billedH = Math.max(30, 6 + addrLines.length * 4 + 8);

  const billedY = detailY + detailH;
  drawRect(margin, billedY, innerW, billedH);
  vline(midX, billedY, billedY + billedH);

  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Billed to', leftX, billedY + 5);

  doc.setTextColor(...blue);
  doc.text(`Name : ${invoice.customer_name}`, leftX, billedY + 10);

  doc.setFontSize(7.5);
  doc.setTextColor(...blue);
  let addrCurY = billedY + 14;
  const addrPrefix = 'Address : ';
  const addrIndent = leftX + doc.getTextWidth(addrPrefix);
  addrLines.forEach((line, i) => {
    doc.text(i === 0 ? addrPrefix + line : line, i === 0 ? leftX : addrIndent, addrCurY);
    addrCurY += 4;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text(`GST No : ${invoice.customer_gst}`, leftX, addrCurY + 1);

  // Shipped To (right — static labels)
  doc.setFontSize(8);
  doc.text('Shipped To :', rightX, billedY + 5);
  doc.text('Name         :', rightX, billedY + 10);
  doc.text('Address      :', rightX, billedY + 15);

  // ══════════════════════════════════════════════════════
  // SECTION 5: Product Table
  // ══════════════════════════════════════════════════════
  const tableY = billedY + billedH;

  // Column widths (total = 190mm = innerW)
  const cols = { sr: 12, desc: 79, hsn: 24, qty: 20, rate: 20, total: 35 };
  const cX = {
    sr:    margin,
    desc:  margin + cols.sr,
    hsn:   margin + cols.sr + cols.desc,
    qty:   margin + cols.sr + cols.desc + cols.hsn,
    rate:  margin + cols.sr + cols.desc + cols.hsn + cols.qty,
    total: margin + cols.sr + cols.desc + cols.hsn + cols.qty + cols.rate,
  };
  const tableRight = margin + innerW;
  const colXArr = Object.values(cX).slice(1);

  // Header row
  const thH = 10;
  drawRect(margin, tableY, innerW, thH);
  colXArr.forEach(x => vline(x, tableY, tableY + thH));

  doc.setFontSize(8);
  doc.setTextColor(...black);
  doc.text('Sr.\nNo.', cX.sr + cols.sr / 2, tableY + 3.5, { align: 'center' });
  doc.text('Description of Goods / Service', cX.desc + cols.desc / 2, tableY + 6, { align: 'center' });
  doc.text('HSN CODE', cX.hsn + cols.hsn / 2, tableY + 6, { align: 'center' });
  doc.text('QTY', cX.qty + cols.qty / 2, tableY + 6, { align: 'center' });
  doc.text('Rate', cX.rate + cols.rate / 2, tableY + 6, { align: 'center' });
  doc.text('Total', cX.total + cols.total / 2, tableY + 6, { align: 'center' });

  // Item rows — minimum 10 rows
  const rowH = 7;
  const numItems = invoice.items.length;
  const numRows = Math.max(numItems, 10);
  const itemsStartY = tableY + thH;

  for (let i = 0; i < numRows; i++) {
    const ry = itemsStartY + i * rowH;
    drawRect(margin, ry, innerW, rowH);
    colXArr.forEach(x => vline(x, ry, ry + rowH));

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

  // ══════════════════════════════════════════════════════
  // SECTION 6: Summary Rows
  // ══════════════════════════════════════════════════════
  const summaryStartY = itemsStartY + numRows * rowH;
  const sRowH = 6;

  function summaryRow(label, value, y, highlight) {
    drawRect(margin, y, innerW, sRowH);
    colXArr.forEach(x => vline(x, y, y + sRowH));
    doc.setFontSize(7.5);
    doc.setTextColor(highlight ? [180, 0, 0] : black);
    doc.text(label, cX.sr + 1, y + 4);
    if (value !== '' && value !== null && value !== undefined) {
      doc.setTextColor(...black);
      doc.text(String(value), cX.total + cols.total - 2, y + 4, { align: 'right' });
    }
  }

  const tv = parseFloat(invoice.taxable_value).toFixed(2);
  summaryRow('Taxable Value:', tv, summaryStartY, false);
  summaryRow('Freight & Insurance:', '', summaryStartY + sRowH, false);
  summaryRow('Total Taxable Value:', tv, summaryStartY + sRowH * 2, false);

  if (invoice.tax_type === 'cgst_sgst') {
    summaryRow('Central Tax (CGST) @:', parseFloat(invoice.cgst).toFixed(2), summaryStartY + sRowH * 3, false);
    summaryRow('State Tax (SGST) @:',   parseFloat(invoice.sgst).toFixed(2), summaryStartY + sRowH * 4, false);
    summaryRow('Integrated Tax (IGST) @:', '', summaryStartY + sRowH * 5, false);
  } else {
    summaryRow('Central Tax (CGST) @:', '', summaryStartY + sRowH * 3, false);
    summaryRow('State Tax (SGST) @:',   '', summaryStartY + sRowH * 4, false);
    summaryRow('Integrated Tax (IGST) @:', parseFloat(invoice.igst).toFixed(2), summaryStartY + sRowH * 5, false);
  }

  summaryRow('Total Invoice Value:', Math.round(parseFloat(invoice.total)), summaryStartY + sRowH * 6, true);

  // ══════════════════════════════════════════════════════
  // SECTION 7: Amount in Words
  // ══════════════════════════════════════════════════════
  const wordsY = summaryStartY + sRowH * 7;
  const wordsH = 7;
  drawRect(margin, wordsY, innerW, wordsH);

  const totalWords = convertNumberToWords(invoice.total);
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text(`AMOUNT IN WORDS : ${totalWords.toUpperCase()}`, margin + 2, wordsY + 4.8);

  // ══════════════════════════════════════════════════════
  // SECTION 8: Bottom — Payment/Bank/Terms | Certification
  // ══════════════════════════════════════════════════════
  const terms = [
    '1. Payment requested by crossed cheque payee A/c  cheque/NEFT/RTGS only',
    '2.Our responsibility ceases on delivery of the goods to transport',
    '3. Goods supplied to order will not be accepted back',
    '4. Subject to Mumbai Jurisdiction',
    '5. Interest @24% p.a. will be charge on bill remaining unpaid after due date',
  ];

  doc.setFontSize(7.5);
  const splitX = margin + innerW * 0.65;
  const termsWrapped = terms.map(t => doc.splitTextToSize(t, splitX - margin - 4));
  const totalTermLines = termsWrapped.reduce((sum, lines) => sum + lines.length, 0);
  const bottomH = Math.max(48, 25 + totalTermLines * 3.8 + 4);
  const bottomY = wordsY + wordsH;

  drawRect(margin, bottomY, innerW, bottomH);
  vline(splitX, bottomY, bottomY + bottomH);

  // Left: Payment Term + Bank + Terms & Conditions
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text('Payment Term :-', leftX, bottomY + 5);
  doc.text(
    `Bank Detail :-${COMPANY.bank},${COMPANY.branch} {A/C No:-${COMPANY.account},IFS CODE:-${COMPANY.ifsc}}`,
    leftX, bottomY + 11, { maxWidth: splitX - margin - 4 }
  );

  doc.setFontSize(7.8);
  doc.setTextColor(...black);
  doc.text('Terms & Conditions:', leftX, bottomY + 20);

  doc.setFontSize(7.5);
  doc.setTextColor(...blue);
  let tY = bottomY + 25;
  termsWrapped.forEach(wrapped => {
    wrapped.forEach(line => {
      doc.text(line, leftX, tY);
      tY += 3.8;
    });
  });

  // Right: Certification + Company + Prop name
  const certX = splitX + 2;
  const certW = tableRight - splitX - 4;
  doc.setFontSize(7.5);
  doc.setTextColor(...black);
  doc.text('Certified that the Particulars given', certX + certW / 2, bottomY + 10, { align: 'center' });
  doc.text('above are true and correct', certX + certW / 2, bottomY + 14, { align: 'center' });

  doc.setFontSize(9);
  doc.text('FOR VIDHIM ENTERPRISES', certX + certW / 2, bottomY + bottomH - 16, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('(Prop: Manoj Shah)', certX + certW / 2, bottomY + bottomH - 5, { align: 'center' });

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  toast.dismiss(toastId);
}
