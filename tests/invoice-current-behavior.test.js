const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

test('invoice uses the same HSN slab and total as billing', () => {
  const items = [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 2 }];
  const billed = pricing.computeTotals(items, '');
  const invoiced = invoice.computeInvoiceFigures({ items });

  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);
  assert.equal(invoiced.rows[0].gstPercent, 5);
});

test('invoice applies active coupon to subtotal under billing rules', () => {
  const items = [{ name: 'Goods', hsn: '1006', price: 600, qty: 1 }];
  const billed = pricing.computeTotals(items, 'SAVE10');
  const invoiced = invoice.computeInvoiceFigures({ items, coupon: 'SAVE10' });

  assert.equal(invoiced.discount, billed.discount);
  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);
});

test('invoice does not apply inactive coupon', () => {
  const invoiced = invoice.computeInvoiceFigures({
    items: [{ name: 'Goods', price: 1200, qty: 1 }],
    coupon: 'DIWALI20'
  });

  assert.equal(invoiced.discount, 0);
  assert.equal(invoiced.total, 1416);
});

test('invoice resolves decimal gstRate using the shared tax rules', () => {
  const item = { name: 'Goods', gstRate: 0.18, price: 100, qty: 1 };
  const billed = pricing.computeTotals([item], '');
  const invoiced = invoice.computeInvoiceFigures({ items: [item] });

  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);
  assert.equal(invoiced.rows[0].gstPercent, 18);
});

test('invoice tax equals the sum of rounded line tax amounts', () => {
  const invoiced = invoice.computeInvoiceFigures({
    items: [
      { name: 'A', gstRate: 5, price: 0.05, qty: 1 },
      { name: 'B', gstRate: 5, price: 0.05, qty: 1 }
    ]
  });

  assert.deepEqual(invoiced.rows.map((row) => row.lineTax), [0, 0]);
  assert.equal(invoiced.tax, 0);
  assert.equal(invoiced.total, 0.1);
});

test('invoice and billing split odd-cent GST the same way', () => {
  const item = { name: 'Goods', gstRate: 0.01, price: 1, qty: 1 };
  const invoiced = invoice.computeInvoiceFigures({ items: [item] });
  const billed = pricing.computeTotals([item], '');

  assert.deepEqual({ cgst: invoiced.cgst, sgst: invoiced.sgst }, { cgst: billed.cgst, sgst: billed.sgst });
});
