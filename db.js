/**
 * Sigma Lures - Offline-First IndexedDB Manager with LocalStorage Fallback
 * Seamlessly handles data persistence across all environments (including Safari file:// mode).
 */

const DB_NAME = 'SigmaLuresDB';
const DB_VERSION = 4;

// Default Preloaded Product Catalog with Wholesale & Retail Prices
const DEFAULT_CATALOG = [
  { id: 'cat_1', name: 'Brine', weight: '8g', wholesalePrice: 120, retailPrice: 170 },
  { id: 'cat_2', name: 'Drift', weight: '10g', wholesalePrice: 130, retailPrice: 180 },
  { id: 'cat_3', name: 'Drift', weight: '15g', wholesalePrice: 140, retailPrice: 190 },
  { id: 'cat_4', name: 'Drift', weight: '20g', wholesalePrice: 150, retailPrice: 200 },
  { id: 'cat_5', name: 'Apex', weight: '25g', wholesalePrice: 200, retailPrice: 260 },
  { id: 'cat_6', name: 'Apex', weight: '35g', wholesalePrice: 220, retailPrice: 280 },
  { id: 'cat_7', name: 'Pulse', weight: '40g', wholesalePrice: 230, retailPrice: 300 },
  { id: 'cat_8', name: 'Pulse', weight: '50g', wholesalePrice: 250, retailPrice: 320 }
];

let dbInstance = null;
let useFallbackStore = false;
const fallbackData = {
  shops: [],
  customers: [],
  sales: [],
  purchases: [],
  expenses: [],
  budgets: [],
  plannedPurchases: [],
  catalog: DEFAULT_CATALOG,
  newOrders: [],
  settings: []
};

function seedFallbackDemoData() {
  try {
    const cached = localStorage.getItem('sigma_fallback_data');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.shops)) parsed.shops = parsed.shops.filter(s => !s.id || !s.id.startsWith('shop_demo_'));
      if (Array.isArray(parsed.customers)) parsed.customers = parsed.customers.filter(c => !c.id || !c.id.startsWith('cust_demo_'));
      if (Array.isArray(parsed.sales)) parsed.sales = parsed.sales.filter(s => !s.id || !s.id.startsWith('sale_demo_'));
      if (Array.isArray(parsed.purchases)) parsed.purchases = parsed.purchases.filter(p => !p.id || !p.id.startsWith('purch_demo_'));
      if (Array.isArray(parsed.expenses)) parsed.expenses = parsed.expenses.filter(e => !e.id || !e.id.startsWith('exp_demo_'));
      if (Array.isArray(parsed.budgets)) parsed.budgets = parsed.budgets.filter(b => !b.id || !b.id.startsWith('bdg_demo_'));
      Object.assign(fallbackData, parsed);
      return;
    }
  } catch (e) {}

  fallbackData.shops = [];
  fallbackData.customers = [];
  fallbackData.sales = [];
  fallbackData.purchases = [];
  fallbackData.expenses = [];
  fallbackData.budgets = [];
  fallbackData.plannedPurchases = [];
  fallbackData.newOrders = [];
  fallbackData.settings = [];

  persistFallbackData();
}

function persistFallbackData() {
  try {
    localStorage.setItem('sigma_fallback_data', JSON.stringify(fallbackData));
  } catch (e) {}
}

function initDB() {
  return new Promise((resolve) => {
    seedFallbackDemoData();

    if (dbInstance || useFallbackStore) {
      return resolve(dbInstance || 'fallback');
    }

    try {
      if (!window.indexedDB) {
        useFallbackStore = true;
        return resolve('fallback');
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('shops')) {
          const shopStore = db.createObjectStore('shops', { keyPath: 'id' });
          shopStore.createIndex('name', 'name', { unique: false });
          shopStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('customers')) {
          const custStore = db.createObjectStore('customers', { keyPath: 'id' });
          custStore.createIndex('name', 'name', { unique: false });
          custStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('sales')) {
          const saleStore = db.createObjectStore('sales', { keyPath: 'id' });
          saleStore.createIndex('buyerId', 'buyerId', { unique: false });
          saleStore.createIndex('buyerType', 'buyerType', { unique: false });
          saleStore.createIndex('date', 'date', { unique: false });
          saleStore.createIndex('status', 'status', { unique: false });
          saleStore.createIndex('pending', 'pending', { unique: false });
          saleStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('purchases')) {
          const purchStore = db.createObjectStore('purchases', { keyPath: 'id' });
          purchStore.createIndex('date', 'date', { unique: false });
          purchStore.createIndex('product', 'product', { unique: false });
          purchStore.createIndex('supplier', 'supplier', { unique: false });
        }

        if (!db.objectStoreNames.contains('expenses')) {
          const expStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expStore.createIndex('date', 'date', { unique: false });
          expStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('budgets')) {
          const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
          budgetStore.createIndex('month', 'month', { unique: false });
          budgetStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('plannedPurchases')) {
          const planStore = db.createObjectStore('plannedPurchases', { keyPath: 'id' });
          planStore.createIndex('status', 'status', { unique: false });
          planStore.createIndex('plannedDate', 'plannedDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('catalog')) {
          const catStore = db.createObjectStore('catalog', { keyPath: 'id' });
          catStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('newOrders')) {
          const orderStore = db.createObjectStore('newOrders', { keyPath: 'id' });
          orderStore.createIndex('buyerId', 'buyerId', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        dbInstance = event.target.result;

        for (const item of DEFAULT_CATALOG) {
          await saveItem('catalog', item);
        }

        try {
          const existingShops = await getAll('shops');
          for (const s of existingShops) {
            if (s.id && s.id.startsWith('shop_demo_')) await deleteItem('shops', s.id);
          }
          const existingCusts = await getAll('customers');
          for (const c of existingCusts) {
            if (c.id && c.id.startsWith('cust_demo_')) await deleteItem('customers', c.id);
          }
          const existingSales = await getAll('sales');
          for (const s of existingSales) {
            if (s.id && s.id.startsWith('sale_demo_')) await deleteItem('sales', s.id);
          }
          const existingPurchs = await getAll('purchases');
          for (const p of existingPurchs) {
            if (p.id && p.id.startsWith('purch_demo_')) await deleteItem('purchases', p.id);
          }
        } catch (err) {}

        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open blocked/error, using fallback store:', event);
        useFallbackStore = true;
        resolve('fallback');
      };
    } catch (e) {
      console.warn('IndexedDB exception, using fallback store:', e);
      useFallbackStore = true;
      resolve('fallback');
    }
  });
}

function getStore(storeName, mode = 'readonly') {
  const tx = dbInstance.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve) => {
    initDB().then(() => {
      if (useFallbackStore || !dbInstance) {
        const list = fallbackData[storeName] || [];
        return resolve(JSON.parse(JSON.stringify(list)));
      }
      try {
        const store = getStore(storeName, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => {
          const res = request.result || [];
          if (res.length > 0) {
            resolve(res);
          } else {
            const list = fallbackData[storeName] || [];
            resolve(JSON.parse(JSON.stringify(list)));
          }
        };
        request.onerror = () => {
          const list = fallbackData[storeName] || [];
          resolve(JSON.parse(JSON.stringify(list)));
        };
      } catch (e) {
        const list = fallbackData[storeName] || [];
        resolve(JSON.parse(JSON.stringify(list)));
      }
    }).catch(() => {
      const list = fallbackData[storeName] || [];
      resolve(JSON.parse(JSON.stringify(list)));
    });
  });
}

function getItem(storeName, id) {
  return new Promise((resolve) => {
    initDB().then(() => {
      if (useFallbackStore || !dbInstance) {
        const list = fallbackData[storeName] || [];
        const found = list.find(item => (item.id || item.key) === id) || null;
        return resolve(JSON.parse(JSON.stringify(found)));
      }
      try {
        const store = getStore(storeName, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            const list = fallbackData[storeName] || [];
            const found = list.find(item => (item.id || item.key) === id) || null;
            resolve(JSON.parse(JSON.stringify(found)));
          }
        };
        request.onerror = () => {
          const list = fallbackData[storeName] || [];
          const found = list.find(item => (item.id || item.key) === id) || null;
          resolve(JSON.parse(JSON.stringify(found)));
        };
      } catch (e) {
        const list = fallbackData[storeName] || [];
        const found = list.find(item => (item.id || item.key) === id) || null;
        resolve(JSON.parse(JSON.stringify(found)));
      }
    }).catch(() => {
      const list = fallbackData[storeName] || [];
      const found = list.find(item => (item.id || item.key) === id) || null;
      resolve(JSON.parse(JSON.stringify(found)));
    });
  });
}

function saveItem(storeName, item) {
  return new Promise((resolve) => {
    if (!fallbackData[storeName]) fallbackData[storeName] = [];
    const itemId = item.id || item.key;
    if (itemId) {
      const idx = fallbackData[storeName].findIndex(i => (i.id || i.key) === itemId);
      if (idx >= 0) {
        fallbackData[storeName][idx] = item;
      } else {
        fallbackData[storeName].push(item);
      }
      persistFallbackData();
    }

    initDB().then(() => {
      if (useFallbackStore || !dbInstance) {
        return resolve(item);
      }
      try {
        const store = getStore(storeName, 'readwrite');
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = (err) => {
          console.warn(`IndexedDB put error for ${storeName}:`, err);
          resolve(item);
        };
      } catch (e) {
        console.warn(`IndexedDB store error for ${storeName}:`, e);
        resolve(item);
      }
    }).catch(() => {
      resolve(item);
    });
  });
}

function deleteItem(storeName, id) {
  return new Promise((resolve) => {
    if (fallbackData[storeName]) {
      fallbackData[storeName] = fallbackData[storeName].filter(i => (i.id || i.key) !== id);
      persistFallbackData();
    }

    initDB().then(() => {
      if (useFallbackStore || !dbInstance) {
        return resolve(true);
      }
      try {
        const store = getStore(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(true);
      } catch (e) {
        resolve(true);
      }
    }).catch(() => {
      resolve(true);
    });
  });
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

async function exportBackupJSON() {
  await initDB();
  const backup = {
    app: 'Sigma Lures Business Manager',
    version: '2.0',
    exportDate: new Date().toISOString(),
    shops: await getAll('shops'),
    customers: await getAll('customers'),
    sales: await getAll('sales'),
    purchases: await getAll('purchases'),
    expenses: await getAll('expenses'),
    budgets: await getAll('budgets'),
    plannedPurchases: await getAll('plannedPurchases'),
    catalog: await getAll('catalog'),
    newOrders: await getAll('newOrders'),
    settings: await getAll('settings')
  };
  return JSON.stringify(backup, null, 2);
}

async function importBackupJSON(jsonContent) {
  await initDB();
  let parsed;
  try {
    parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  } catch (err) {
    throw new Error('Invalid JSON backup file format');
  }

  if (!parsed || (parsed.app !== 'Sigma Lures Business Manager' && !parsed.sales)) {
    throw new Error('Unrecognized backup format for Sigma Lures');
  }

  const putMany = async (storeName, items) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item && (item.id || item.key)) {
        await saveItem(storeName, item);
      }
    }
  };

  if (parsed.shops) await putMany('shops', parsed.shops);
  if (parsed.customers) await putMany('customers', parsed.customers);
  if (parsed.sales) await putMany('sales', parsed.sales);
  if (parsed.purchases) await putMany('purchases', parsed.purchases);
  if (parsed.expenses) await putMany('expenses', parsed.expenses);
  if (parsed.budgets) await putMany('budgets', parsed.budgets);
  if (parsed.plannedPurchases) await putMany('plannedPurchases', parsed.plannedPurchases);
  if (parsed.catalog) await putMany('catalog', parsed.catalog);
  if (parsed.newOrders) await putMany('newOrders', parsed.newOrders);
  if (parsed.settings) await putMany('settings', parsed.settings);

  return true;
}

// Expose globally on window
window.initDB = initDB;
window.getAll = getAll;
window.getItem = getItem;
window.saveItem = saveItem;
window.deleteItem = deleteItem;
window.generateId = generateId;
window.exportBackupJSON = exportBackupJSON;
window.importBackupJSON = importBackupJSON;

window.SigmaDB = {
  initDB,
  getAll,
  getItem,
  saveItem,
  deleteItem,
  generateId,
  exportBackupJSON,
  importBackupJSON
};

