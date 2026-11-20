// Offline fallback — used only when deals.json hasn't been generated yet.
window.SAMPLE_RETAILERS = [
  { id: "techhaven", name: "TechHaven", domain: "techhaven.example.com", category: "Electronics", shipping: "Free over $50", returnsWindow: "30 days",
    signals: { https: true, returns: true, contact: true, securePayments: true, reviews: 4.6, domainYears: 9 } },
  { id: "northmart", name: "NorthMart", domain: "northmart.example.com", category: "General", shipping: "Free over $35", returnsWindow: "90 days",
    signals: { https: true, returns: true, contact: true, securePayments: true, reviews: 4.8, domainYears: 14 } },
  { id: "gadgetgrove", name: "GadgetGrove", domain: "gadgetgrove.example.com", category: "Electronics", shipping: "$4.99 flat", returnsWindow: "30 days",
    signals: { https: true, returns: true, contact: true, securePayments: true, reviews: 4.2, domainYears: 6 } },
  { id: "cozyhome", name: "CozyHome Goods", domain: "cozyhome.example.com", category: "Home & Kitchen", shipping: "Free over $75", returnsWindow: "60 days",
    signals: { https: true, returns: true, contact: true, securePayments: true, reviews: 4.5, domainYears: 8 } },
  { id: "pixelplay", name: "PixelPlay", domain: "pixelplay.example.com", category: "Gaming", shipping: "Free over $40", returnsWindow: "30 days",
    signals: { https: true, returns: true, contact: true, securePayments: true, reviews: 4.0, domainYears: 5 } },
  { id: "urbanthreads", name: "UrbanThreads", domain: "urbanthreads.example.com", category: "Clothing", shipping: "$6.99 flat", returnsWindow: "21 days",
    signals: { https: true, returns: true, contact: false, securePayments: true, reviews: 3.4, domainYears: 3 } },
  { id: "dealzilla", name: "DealZilla", domain: "dealzilla.example.com", category: "General", shipping: "Varies", returnsWindow: "14 days",
    signals: { https: true, returns: true, contact: false, securePayments: false, reviews: 2.6, domainYears: 2 } },
  { id: "quickbuys", name: "QuickBuys", domain: "quickbuys.example.com", category: "General", shipping: "Varies", returnsWindow: "None stated",
    signals: { https: true, returns: false, contact: false, securePayments: false, reviews: 1.9, domainYears: 1 } }
];

window.SAMPLE_DEALS = [
  { id: 1,  title: "Aurora ANC Wireless Headphones", retailerId: "techhaven",    category: "Electronics",    originalPrice: 209.99, salePrice: 129.99, coupon: "SOUND20",  ends: "Nov 24", url: null, source: "Sample" },
  { id: 2,  title: "Titan 27-inch 165Hz Gaming Monitor", retailerId: "pixelplay", category: "Gaming",        originalPrice: 329.99, salePrice: 219.99, coupon: null,       ends: "Nov 22", url: null, source: "Sample" },
  { id: 3,  title: "CloudRest Memory Foam Pillow (2-pack)", retailerId: "cozyhome", category: "Home & Kitchen", originalPrice: 79.99, salePrice: 44.99, coupon: "COZY10",   ends: "Nov 26", url: null, source: "Sample" },
  { id: 4,  title: "Nimbus 4K Streaming Stick", retailerId: "northmart",    category: "Electronics",    originalPrice: 59.99,  salePrice: 34.99,  coupon: null,       ends: "Nov 21", url: null, source: "Sample" },
  { id: 5,  title: "Trailblaze Insulated Water Bottle 1L", retailerId: "northmart", category: "Outdoors", originalPrice: 39.99,  salePrice: 21.99,  coupon: null,       ends: "Nov 30", url: null, source: "Sample" },
  { id: 6,  title: "MechType RGB Mechanical Keyboard", retailerId: "gadgetgrove", category: "Gaming",      originalPrice: 119.99, salePrice: 74.99,  coupon: "KEYS15",   ends: "Nov 23", url: null, source: "Sample" },
  { id: 7,  title: "Streetline Hooded Bomber Jacket", retailerId: "urbanthreads", category: "Clothing",   originalPrice: 129.99, salePrice: 71.99,  coupon: null,       ends: "Nov 25", url: null, source: "Sample" },
  { id: 8,  title: "ChefPro 10pc Stainless Cookware Set", retailerId: "cozyhome", category: "Home & Kitchen", originalPrice: 249.99, salePrice: 149.99, coupon: null,     ends: "Nov 27", url: null, source: "Sample" },
  { id: 9,  title: "Volt 20,000mAh USB-C Power Bank", retailerId: "techhaven", category: "Electronics",  originalPrice: 49.99,  salePrice: 27.99,  coupon: null,       ends: "Nov 22", url: null, source: "Sample" },
  { id: 10, title: "RetroWave Bluetooth Speaker", retailerId: "dealzilla",  category: "Electronics",    originalPrice: 89.99,  salePrice: 39.99,  coupon: "BOOM55",   ends: "Nov 21", url: null, source: "Sample" },
  { id: 11, title: "FlexFit Running Sneakers", retailerId: "urbanthreads", category: "Clothing",       originalPrice: 99.99,  salePrice: 59.99,  coupon: null,       ends: "Nov 28", url: null, source: "Sample" },
  { id: 12, title: "Starfield Projector Mini 1080p", retailerId: "quickbuys", category: "Electronics", originalPrice: 199.99, salePrice: 69.99,  coupon: null,       ends: "Nov 20", url: null, source: "Sample" }
];
