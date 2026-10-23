// Approved knowledge documents for the policy assistant (one entry = one retrievable section).
const d = (document, section, version, effectiveDate, category, text) => ({
  document, section, version, effectiveDate, category, region: 'Global', text,
});

export const docs = [
  d('Laptop Return Policy', 'Opened Products', '2026.1', '2026-01-01', 'Returns',
    'Opened laptops can be returned within 7 days of delivery if no physical damage is present. The original charger, packaging and accessories must be included. Laptops with physical damage, liquid damage or missing serial-number stickers are not eligible.'),
  d('Laptop Return Policy', 'Unopened Products', '2026.1', '2026-01-01', 'Returns',
    'Unopened laptops in sealed original packaging can be returned within 30 days of delivery for a full refund.'),
  d('General Return Policy', 'Return Window', '2026.1', '2026-01-01', 'Returns',
    'Most products can be returned within 30 days of delivery. Electronics have a 10-day window. Fashion items must be unworn with tags attached. Perishable groceries and opened healthcare products cannot be returned.'),
  d('Refund Policy', 'Refund Timeline', '2026.2', '2026-02-01', 'Refunds',
    'Refunds are issued to the original payment method within 5 to 7 business days after the returned item passes quality inspection. Premium members receive an instant refund to ShopSmart wallet for orders under $200.'),
  d('Shipping Policy', 'Delivery Charges and Timelines', '2026.1', '2026-01-01', 'Shipping',
    'Basic members get free delivery on orders above $50 with 5 to 7 day delivery. Prime members get free 2-day delivery on all eligible items. Premium members get free next-day delivery in supported cities.'),
  d('Membership Benefits', 'Prime Membership', '2026.1', '2026-01-01', 'Membership',
    'Prime membership includes free 2-day delivery on eligible items, early access to deals, extended 10-day returns on electronics and priority customer support.'),
  d('Membership Benefits', 'Premium Membership', '2026.1', '2026-01-01', 'Membership',
    'Premium membership includes everything in Prime plus free next-day delivery, instant refunds under $200, 24x7 phone support and an extended 2-year warranty on selected electronics.'),
  d('Order Cancellation Policy', 'Cancelling After Shipment', '2026.1', '2026-01-01', 'Orders',
    'Orders can be cancelled free of charge before they are shipped. Once an order has shipped it cannot be cancelled; you may refuse delivery or return the item after it arrives under the applicable return policy.'),
  d('Warranty Policy', 'Smartphones', '2026.1', '2026-01-01', 'Warranty',
    'Smartphones carry a 12-month manufacturer warranty covering manufacturing defects. Accidental and liquid damage are not covered unless ShopSmart Protect was purchased.'),
  d('Warranty Policy', 'Laptops', '2026.1', '2026-01-01', 'Warranty',
    'Laptops carry a 24-month manufacturer warranty covering hardware defects. Battery coverage is 12 months.'),
  d('Seller Guidelines', 'Listing Requirements', '2025.4', '2025-10-01', 'Sellers',
    'Sellers must provide accurate product titles, genuine images and valid GST or tax details. Counterfeit goods lead to immediate account suspension.'),
];
