/**
 * Sigma Lures - Offline-First IndexedDB Manager with LocalStorage Fallback
 * Seamlessly handles data persistence across all environments (including Safari file:// mode).
 */

const DB_NAME = 'SigmaLuresDB';
const DB_VERSION = 1;

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
  plannedPurchases: [],
  catalog: DEFAULT_CATALOG,
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
      Object.assign(fallbackData, parsed);
      return;
    }
  } catch (e) {}

  fallbackData.shops = [];
  fallbackData.customers = [];
  fallbackData.sales = [];
  fallbackData.purchases = [];
  fallbackData.plannedPurchases = [];
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
    if (dbInstance || useFallbackStore) {
      return resolve(dbInstance || 'fallback');
    }

    try {
      if (!window.indexedDB) {
        useFallbackStore = true;
        seedFallbackDemoData();
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

        if (!db.objectStoreNames.contains('plannedPurchases')) {
          const planStore = db.createObjectStore('plannedPurchases', { keyPath: 'id' });
          planStore.createIndex('status', 'status', { unique: false });
          planStore.createIndex('plannedDate', 'plannedDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('catalog')) {
          const catStore = db.createObjectStore('catalog', { keyPath: 'id' });
          catStore.createIndex('name', 'name', { unique: false });
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
          if (existingShops.length === 0) {
            seedFallbackDemoData();
            for (const s of fallbackData.shops) await saveItem('shops', s);
            for (const c of fallbackData.customers) await saveItem('customers', c);
            for (const sl of fallbackData.sales) await saveItem('sales', sl);
            for (const p of fallbackData.purchases) await saveItem('purchases', p);
          }
        } catch (err) {}

        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open blocked/error, using fallback store:', event);
        useFallbackStore = true;
        seedFallbackDemoData();
        resolve('fallback');
      };
    } catch (e) {
      console.warn('IndexedDB exception, using fallback store:', e);
      useFallbackStore = true;
      seedFallbackDemoData();
      resolve('fallback');
    }
  });
}

function getStore(storeName, mode = 'readonly') {
  const tx = dbInstance.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      if (useFallbackStore) {
        const list = fallbackData[storeName] || [];
        return resolve(JSON.parse(JSON.stringify(list)));
      }
      const store = getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

function getItem(storeName, id) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      if (useFallbackStore) {
        const list = fallbackData[storeName] || [];
        const found = list.find(item => item.id === id) || null;
        return resolve(JSON.parse(JSON.stringify(found)));
      }
      const store = getStore(storeName, 'readonly');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

function saveItem(storeName, item) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      if (useFallbackStore) {
        if (!fallbackData[storeName]) fallbackData[storeName] = [];
        const idx = fallbackData[storeName].findIndex(i => i.id === item.id);
        if (idx >= 0) {
          fallbackData[storeName][idx] = item;
        } else {
          fallbackData[storeName].push(item);
        }
        persistFallbackData();
        return resolve(item);
      }
      const store = getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

function deleteItem(storeName, id) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      if (useFallbackStore) {
        if (fallbackData[storeName]) {
          fallbackData[storeName] = fallbackData[storeName].filter(i => i.id !== id);
          persistFallbackData();
        }
        return resolve(true);
      }
      const store = getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    }).catch(reject);
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
    plannedPurchases: await getAll('plannedPurchases'),
    catalog: await getAll('catalog'),
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
      if (item && item.id) {
        await saveItem(storeName, item);
      }
    }
  };

  await putMany('shops', parsed.shops);
  await putMany('customers', parsed.customers);
  await putMany('sales', parsed.sales);
  await putMany('purchases', parsed.purchases);
  await putMany('plannedPurchases', parsed.plannedPurchases);
  await putMany('catalog', parsed.catalog);
  await putMany('settings', parsed.settings);

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
