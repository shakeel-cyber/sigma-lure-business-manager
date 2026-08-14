/**
 * Sigma Lures - Offline-First IndexedDB Manager
 * Handles data persistence, safe non-destructive migrations, preloaded catalog, JSON backups, and New Orders queue.
 */

const DB_NAME = 'SigmaLuresDB';
const DB_VERSION = 2; // Incremented version to safely handle schema additions

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

/**
 * Initialize IndexedDB securely and non-destructively
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
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

      if (!db.objectStoreNames.contains('newOrders')) {
        const newOrderStore = db.createObjectStore('newOrders', { keyPath: 'id' });
        newOrderStore.createIndex('customerName', 'customerName', { unique: false });
        newOrderStore.createIndex('createdAt', 'createdAt', { unique: false });
        newOrderStore.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = async (event) => {
      dbInstance = event.target.result;

      // Ensure newOrders store exists dynamically if version upgrade skipped
      if (!dbInstance.objectStoreNames.contains('newOrders')) {
        dbInstance.close();
        dbInstance = null;
        const upgradeReq = indexedDB.open(DB_NAME, dbInstance ? dbInstance.version + 1 : DB_VERSION + 1);
        upgradeReq.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('newOrders')) {
            db.createObjectStore('newOrders', { keyPath: 'id' });
          }
        };
        upgradeReq.onsuccess = (e) => {
          dbInstance = e.target.result;
          seedCatalogAndResolve(resolve);
        };
        return;
      }

      seedCatalogAndResolve(resolve);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Initialization error:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function seedCatalogAndResolve(resolve) {
  // Seed / update catalog safely
  for (const item of DEFAULT_CATALOG) {
    await saveItem('catalog', item);
  }
  resolve(dbInstance);
}

function getStore(storeName, mode = 'readonly') {
  const tx = dbInstance.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export function getAll(storeName) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      const store = getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

export function getItem(storeName, id) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      const store = getStore(storeName, 'readonly');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

export function saveItem(storeName, item) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      const store = getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

export function deleteItem(storeName, id) {
  return new Promise((resolve, reject) => {
    initDB().then(() => {
      const store = getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export async function exportBackupJSON() {
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
    settings: await getAll('settings'),
    newOrders: await getAll('newOrders')
  };
  return JSON.stringify(backup, null, 2);
}

export async function importBackupJSON(jsonContent) {
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
  await putMany('newOrders', parsed.newOrders);

  return true;
}
