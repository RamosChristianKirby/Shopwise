import { PdfDoc, wrap } from './pdf.js';

const NAVY = '#0b1a33';
const BLUE = '#256abf';
const MUTED = '#5d6673';
const LINE = '#e1e4ea';
const PAY = { cod: 'Cash on Delivery', gcash: 'GCash', bank: 'Bank Transfer', paypal: 'PayPal', manual: 'Manual' };

const money = (v, currency = 'PHP') =>
  `${currency} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');

function header(doc, { brand, title, number, issued, paid }) {
  doc.rect(0, 0, doc.width, 96, { fill: NAVY });
  doc.rect(0, 96, doc.width, 4, { fill: BLUE });
  doc.text(40, 30, brand, { size: 20, bold: true, color: '#ffffff' });
  doc.text(40, 58, 'Powered by Shopwise', { size: 9, color: '#9fb4d6' });
  doc.text(300, 28, title, { size: 22, bold: true, color: '#ffffff', align: 'right', width: doc.width - 340 });
  doc.text(300, 58, `No. ${number}`, { size: 10, color: '#dbe7f5', align: 'right', width: doc.width - 340 });
  doc.text(40, 120, 'Issued', { size: 8, bold: true, color: MUTED });
  doc.text(40, 132, date(issued), { size: 10 });
  doc.text(160, 120, 'Status', { size: 8, bold: true, color: MUTED });
  doc.text(160, 132, paid ? 'PAID' : 'UNPAID', { size: 10, bold: true, color: paid ? '#0a7a3d' : '#b3261e' });
}

function table(doc, y, rows, currency) {
  const x = 40;
  const w = doc.width - 80;
  doc.rect(x, y, w, 24, { fill: '#eef0f3' });
  doc.text(x + 10, y + 7, 'Item', { size: 9, bold: true, color: MUTED });
  doc.text(x + w - 230, y + 7, 'Qty', { size: 9, bold: true, color: MUTED, align: 'right', width: 40 });
  doc.text(x + w - 180, y + 7, 'Unit price', { size: 9, bold: true, color: MUTED, align: 'right', width: 80 });
  doc.text(x + w - 95, y + 7, 'Amount', { size: 9, bold: true, color: MUTED, align: 'right', width: 85 });
  y += 30;
  for (const r of rows) {
    if (y > doc.height - 160) {
      doc.addPage();
      y = 50;
    }
    const lines = wrap(r.name, 10, w - 260, true);
    lines.forEach((l, i) => doc.text(x + 10, y + i * 13, l, { size: 10, bold: true }));
    let h = lines.length * 13;
    if (r.sub) {
      doc.text(x + 10, y + h, r.sub, { size: 8.5, color: MUTED });
      h += 12;
    }
    doc.text(x + w - 230, y, String(r.qty), { size: 10, align: 'right', width: 40 });
    doc.text(x + w - 180, y, money(r.price, currency), { size: 10, align: 'right', width: 80 });
    doc.text(x + w - 95, y, money(r.price * r.qty, currency), { size: 10, bold: true, align: 'right', width: 85 });
    y += Math.max(h, 14) + 10;
    doc.line(x, y - 5, x + w, y - 5, { color: LINE });
  }
  return y;
}

function totals(doc, y, rows) {
  const x = doc.width - 260;
  for (const [label, value, strong] of rows) {
    if (strong) {
      doc.rect(x - 10, y - 6, 230, 28, { fill: NAVY });
      doc.text(x, y + 2, label, { size: 11, bold: true, color: '#ffffff' });
      doc.text(x + 90, y + 2, value, { size: 11, bold: true, color: '#ffffff', align: 'right', width: 120 });
      y += 30;
    } else {
      doc.text(x, y, label, { size: 10, color: MUTED });
      doc.text(x + 90, y, value, { size: 10, align: 'right', width: 120 });
      y += 18;
    }
  }
  return y;
}

function footer(doc, text) {
  doc.line(40, doc.height - 60, doc.width - 40, doc.height - 60, { color: LINE });
  doc.text(40, doc.height - 50, text, { size: 8.5, color: MUTED, align: 'center', width: doc.width - 80 });
}

/** PDF invoice for a customer order. */
export function orderInvoicePdf(order, store) {
  const brand = store?.name || 'Shopwise';
  const doc = new PdfDoc({ title: `Invoice ${order.orderNumber}` });
  header(doc, { brand, title: 'INVOICE', number: order.orderNumber, issued: order.createdAt, paid: order.isPaid });
  doc.text(280, 120, 'Payment', { size: 8, bold: true, color: MUTED });
  doc.text(280, 132, `${PAY[order.paymentMethod] || order.paymentMethod}${order.paymentReference ? ` - Ref ${order.paymentReference}` : ''}`, { size: 10 });

  const a = order.shippingAddress || {};
  doc.text(40, 170, 'BILL / SHIP TO', { size: 8, bold: true, color: MUTED });
  [a.fullName, a.line1, [a.city, a.province, a.postalCode].filter(Boolean).join(', '), a.phone, order.user?.email]
    .filter(Boolean)
    .forEach((l, i) => doc.text(40, 184 + i * 14, l, { size: 10, bold: i === 0 }));
  doc.text(330, 170, 'FROM', { size: 8, bold: true, color: MUTED });
  [brand, store?.settings?.supportEmail, store?.settings?.supportPhone]
    .filter(Boolean)
    .forEach((l, i) => doc.text(330, 184 + i * 14, l, { size: 10, bold: i === 0 }));

  let y = table(doc, 270, order.items.map((i) => ({ name: i.name, sub: i.variantLabel, qty: i.qty, price: i.price })));
  y = totals(doc, y + 10, [
    ['Subtotal', money(order.itemsPrice)],
    ...(order.discount ? [[`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `- ${money(order.discount)}`]] : []),
    ['Shipping', order.shippingPrice ? money(order.shippingPrice) : 'Free'],
    ['Total', money(order.totalPrice), true],
  ]);
  if (order.notes) {
    doc.text(40, y + 10, 'Notes', { size: 8, bold: true, color: MUTED });
    wrap(order.notes, 9.5, doc.width - 80).slice(0, 6).forEach((l, i) => doc.text(40, y + 24 + i * 12, l, { size: 9.5 }));
  }
  footer(doc, `Thank you for shopping with ${brand}. Questions? Reply to your order email or contact ${store?.settings?.supportEmail || 'the store'}.`);
  return doc.toBuffer();
}

/** PDF invoice for a store's Shopwise subscription. */
export function billingInvoicePdf(store, invoice, plan) {
  const doc = new PdfDoc({ title: `Shopwise invoice ${invoice.number}` });
  header(doc, { brand: 'Shopwise', title: 'INVOICE', number: invoice.number, issued: invoice.createdAt, paid: invoice.status === 'paid' });
  doc.text(280, 120, 'Payment', { size: 8, bold: true, color: MUTED });
  doc.text(280, 132, `${PAY[invoice.method] || invoice.method}${invoice.reference ? ` - Ref ${invoice.reference}` : ''}`, { size: 10 });
  doc.text(40, 170, 'BILLED TO', { size: 8, bold: true, color: MUTED });
  doc.text(40, 184, store.name, { size: 10, bold: true });
  doc.text(40, 198, `${store.slug} store`, { size: 10, color: MUTED });
  const y = table(doc, 240, [{ name: `${plan?.name || invoice.plan} plan subscription`, sub: `${invoice.months} month${invoice.months === 1 ? '' : 's'}`, qty: invoice.months, price: invoice.amount / (invoice.months || 1) }]);
  totals(doc, y + 10, [['Subtotal', money(invoice.amount)], ['Total', money(invoice.amount), true]]);
  footer(doc, 'Shopwise - commerce platform for independent stores. This invoice was generated automatically.');
  return doc.toBuffer();
}
