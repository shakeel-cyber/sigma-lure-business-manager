/**
 * Sigma Lures — Core Application Logic
 * Mobile-First Offline Business Management
 * Full Back Button, Edit & Delete Shop/Customer Features, Wholesale & Retail Catalogue Prices & Stealth Theme
 */

import {
  initDB,
  getAll,
  getItem,
  saveItem,
  deleteItem,
  generateId,
  exportBackupJSON,
  importBackupJSON
} from './db.js';

// Application State
const state = {
  currentView: 'dashboard-view',
  shops: [],
  customers: [],
  sales: [],
  purchases: [],
  plannedPurchases: [],
  catalog: [],
  currentBuyerType: 'shop', // 'shop' | 'customer'
  currentCustomerType: 'wholesale', // 'wholesale' | 'retail'
  pendingDeleteAction: null,
  currentInvoiceSale: null,
  activeProfile: null, // null | 'shop' | 'customer'
  activeShopId: null,
  activeCustomerId: null,
  activeModal: null // id of open modal
};

// EXPOSE GLOBAL WINDOW HANDLERS IMMEDIATELY SO DYNAMIC ONCLICK BUTTONS ALWAYS WORK
window.viewShopProfile = (shopId) => {
  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  state.activeShopId = shopId;
  state.activeProfile = 'shop';

  if (state.currentView !== 'shops-view') {
    switchView('shops-view', true, true);
  }

  const mainCard = document.getElementById('shops-main-card');
  if (mainCard) mainCard.style.display = 'none';

  const card = document.getElementById('shop-profile-card');
  if (card) {
    card.style.display = 'block';
  }

  const nameEl = document.getElementById('shop-profile-name');
  if (nameEl) nameEl.textContent = `🏪 ${shop.name}`;

  const shopSales = state.sales.filter(s => s.buyerType === 'shop' && s.buyerId === shopId);
  const totalSales = shopSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalPaid = shopSales.reduce((acc, s) => acc + (s.paid || 0), 0);
  const totalPending = shopSales.reduce((acc, s) => acc + (s.pending || 0), 0);

  setText('shop-total-sales', `₹${totalSales.toLocaleString('en-IN')}`);
  setText('shop-total-orders', shopSales.length);
  setText('shop-total-paid', `₹${totalPaid.toLocaleString('en-IN')}`);
  setText('shop-total-pending', `₹${totalPending.toLocaleString('en-IN')}`);

  const tbody = document.getElementById('shop-history-tbody');
  if (tbody) {
    if (shopSales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No sales recorded yet</td></tr>`;
    } else {
      tbody.innerHTML = shopSales.map(s => `
        <tr style="cursor: pointer;" onclick="window.openInvoiceModal('${s.id}')">
          <td>${s.date}</td>
          <td>${s.invoiceNo || s.id.substring(0, 8)}</td>
          <td>₹${s.total.toLocaleString('en-IN')}</td>
          <td style="color: var(--success);">₹${s.paid.toLocaleString('en-IN')}</td>
          <td style="color: var(--danger);">₹${s.pending.toLocaleString('en-IN')}</td>
          <td>${getStatusBadgeHTML(s.status)}</td>
        </tr>
      `).join('');
    }
  }

  updateHeaderBackButton();
  if (card) card.scrollIntoView({ behavior: 'smooth' });
};

window.viewCustomerProfile = (custId) => {
  const customer = state.customers.find(c => c.id === custId);
  if (!customer) return;

  state.activeCustomerId = custId;
  state.activeProfile = 'customer';

  if (state.currentView !== 'customers-view') {
    switchView('customers-view', true, true);
  }

  const mainCard = document.getElementById('customers-main-card');
  if (mainCard) mainCard.style.display = 'none';

  const card = document.getElementById('customer-profile-card');
  if (card) {
    card.style.display = 'block';
  }

  const nameEl = document.getElementById('customer-profile-name');
  if (nameEl) nameEl.textContent = `👤 ${customer.name}`;

  const custSales = state.sales.filter(s => s.buyerType === 'customer' && s.buyerId === custId);
  const totalSales = custSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalPaid = custSales.reduce((acc, s) => acc + (s.paid || 0), 0);
  const totalPending = custSales.reduce((acc, s) => acc + (s.pending || 0), 0);

  setText('cust-total-sales', `₹${totalSales.toLocaleString('en-IN')}`);
  setText('cust-total-orders', custSales.length);
  setText('cust-total-paid', `₹${totalPaid.toLocaleString('en-IN')}`);
  setText('cust-total-pending', `₹${totalPending.toLocaleString('en-IN')}`);

  const tbody = document.getElementById('cust-history-tbody');
  if (tbody) {
    if (custSales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No sales recorded yet</td></tr>`;
    } else {
      tbody.innerHTML = custSales.map(s => `
        <tr style="cursor: pointer;" onclick="window.openInvoiceModal('${s.id}')">
          <td>${s.date}</td>
          <td>${s.invoiceNo || s.id.substring(0, 8)}</td>
          <td>₹${s.total.toLocaleString('en-IN')}</td>
          <td style="color: var(--success);">₹${s.paid.toLocaleString('en-IN')}</td>
          <td style="color: var(--danger);">₹${s.pending.toLocaleString('en-IN')}</td>
          <td>${getStatusBadgeHTML(s.status)}</td>
        </tr>
      `).join('');
    }
  }

  updateHeaderBackButton();
  if (card) card.scrollIntoView({ behavior: 'smooth' });
};

window.openEditShopModal = (shopId) => {
  const targetId = shopId || state.activeShopId;
  const shop = state.shops.find(s => s.id === targetId);
  if (!shop) return;

  const idInput = document.getElementById('edit-shop-id');
  if (idInput) idInput.value = shop.id;

  const nameInput = document.getElementById('edit-shop-name-input');
  if (nameInput) nameInput.value = shop.name;

  const phoneInput = document.getElementById('edit-shop-phone-input');
  if (phoneInput) phoneInput.value = shop.phone || '';

  const addressInput = document.getElementById('edit-shop-address-input');
  if (addressInput) addressInput.value = shop.address || '';

  openModal('edit-shop-modal');
};

window.openEditCustomerModal = (custId) => {
  const targetId = custId || state.activeCustomerId;
  const customer = state.customers.find(c => c.id === targetId);
  if (!customer) return;

  const idInput = document.getElementById('edit-customer-id');
  if (idInput) idInput.value = customer.id;

  const nameInput = document.getElementById('edit-customer-name-input');
  if (nameInput) nameInput.value = customer.name;

  const phoneInput = document.getElementById('edit-customer-phone-input');
  if (phoneInput) phoneInput.value = customer.phone || '';

  const addressInput = document.getElementById('edit-customer-address-input');
  if (addressInput) addressInput.value = customer.address || '';

  openModal('edit-customer-modal');
};

window.confirmDeleteShop = (shopId) => {
  const targetId = shopId || state.activeShopId;
  const shop = state.shops.find(s => s.id === targetId);
  if (!shop) return;

  const shopSales = state.sales.filter(s => s.buyerType === 'shop' && s.buyerId === targetId);
  let msg = `Delete shop "${shop.name}" permanently?`;
  if (shopSales.length > 0) {
    msg += ` (${shopSales.length} historical order records for this shop will remain in past sales logs).`;
  }

  confirmDelete(msg, async () => {
    await deleteItem('shops', targetId);
    state.shops = state.shops.filter(s => s.id !== targetId);
    showToast(`Shop "${shop.name}" deleted`);

    const shopProfileCard = document.getElementById('shop-profile-card');
    if (shopProfileCard) shopProfileCard.style.display = 'none';
    const shopsMainCard = document.getElementById('shops-main-card');
    if (shopsMainCard) shopsMainCard.style.display = 'block';

    state.activeProfile = null;
    state.activeShopId = null;
    updateHeaderBackButton();
    renderAllViews();
  });
};

window.confirmDeleteCustomer = (custId) => {
  const targetId = custId || state.activeCustomerId;
  const customer = state.customers.find(c => c.id === targetId);
  if (!customer) return;

  const custSales = state.sales.filter(s => s.buyerType === 'customer' && s.buyerId === targetId);
  let msg = `Delete customer "${customer.name}" permanently?`;
  if (custSales.length > 0) {
    msg += ` (${custSales.length} historical purchase records for this customer will remain in past sales logs).`;
  }

  confirmDelete(msg, async () => {
    await deleteItem('customers', targetId);
    state.customers = state.customers.filter(c => c.id !== targetId);
    showToast(`Customer "${customer.name}" deleted`);

    const custProfileCard = document.getElementById('customer-profile-card');
    if (custProfileCard) custProfileCard.style.display = 'none';
    const custsMainCard = document.getElementById('customers-main-card');
    if (custsMainCard) custsMainCard.style.display = 'block';

    state.activeProfile = null;
    state.activeCustomerId = null;
    updateHeaderBackButton();
    renderAllViews();
  });
};

window.openInvoiceModal = (saleId) => {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  state.currentInvoiceSale = sale;
  const printArea = document.getElementById('invoice-print-area');
  if (!printArea) return;

  const itemsHtml = sale.items.map(item => `
    <tr>
      <td>${escapeHTML(item.product)}</td>
      <td>${escapeHTML(item.weight)}</td>
      <td style="text-align:center;">${item.qty}</td>
      <td style="text-align:right;">₹${item.sellingPrice.toLocaleString('en-IN')}</td>
      <td style="text-align:right; font-weight:bold;">₹${item.amount.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  printArea.innerHTML = `
    <div class="invoice-paper">
      <div class="invoice-header">
        <div>
          <div class="invoice-brand">SIGMA LURES</div>
          <div style="font-size:0.8rem; color:#475569;">Handmade Premium Fishing Lures</div>
        </div>
        <div class="invoice-meta">
          <strong>INVOICE</strong><br>
          #${sale.invoiceNo}<br>
          Date: ${sale.date}
        </div>
      </div>

      <div class="invoice-details-grid">
        <div>
          <strong style="font-size:0.75rem; color:#64748b; text-transform:uppercase;">Billed To</strong><br>
          <strong style="font-size:1.05rem;">${escapeHTML(sale.buyerName)}</strong><br>
          <span style="font-size:0.8rem; color:#475569;">Buyer Type: ${sale.buyerType.toUpperCase()} (${sale.customerType.toUpperCase()})</span>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Weight</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="invoice-totals">
        <div class="invoice-total-row">
          <span>Subtotal:</span>
          <span>₹${sale.subtotal.toLocaleString('en-IN')}</span>
        </div>
        ${sale.shipping > 0 ? `
          <div class="invoice-total-row">
            <span>Shipping:</span>
            <span>+₹${sale.shipping.toLocaleString('en-IN')}</span>
          </div>` : ''}
        ${sale.discount > 0 ? `
          <div class="invoice-total-row">
            <span>Discount:</span>
            <span>-₹${sale.discount.toLocaleString('en-IN')}</span>
          </div>` : ''}
        ${sale.freeQty > 0 ? `
          <div class="invoice-total-row" style="color:#0284c7;">
            <span>Free Jigs:</span>
            <span>${sale.freeQty} pcs</span>
          </div>` : ''}
        <div class="invoice-total-row grand">
          <span>Final Total:</span>
          <span>₹${sale.total.toLocaleString('en-IN')}</span>
        </div>
        <div class="invoice-total-row" style="margin-top:6px; color:#16a34a; font-weight:600;">
          <span>Amount Paid:</span>
          <span>₹${sale.paid.toLocaleString('en-IN')}</span>
        </div>
        <div class="invoice-total-row" style="color:#dc2626; font-weight:600;">
          <span>Pending Amount:</span>
          <span>₹${sale.pending.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  `;

  openModal('invoice-modal');
};

window.openUpdatePaymentModal = (saleId) => {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  const idInput = document.getElementById('pay-sale-id');
  if (idInput) idInput.value = sale.id;

  setText('pay-modal-total', `₹${sale.total.toLocaleString('en-IN')}`);
  setText('pay-modal-prev-paid', `₹${sale.paid.toLocaleString('en-IN')}`);
  setText('pay-modal-pending', `₹${sale.pending.toLocaleString('en-IN')}`);

  const paidInput = document.getElementById('pay-modal-new-paid');
  if (paidInput) paidInput.value = sale.paid;

  openModal('update-payment-modal');
};

window.confirmDeleteSale = (saleId) => {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  confirmDelete(`Delete sale order #${sale.invoiceNo || sale.id} permanently? This action cannot be undone.`, async () => {
    await deleteItem('sales', saleId);
    state.sales = state.sales.filter(s => s.id !== saleId);
    showToast('Sale deleted');
    renderAllViews();
  });
};

window.confirmDeletePurchase = (purchId) => {
  confirmDelete('Delete this purchase record permanently?', async () => {
    await deleteItem('purchases', purchId);
    state.purchases = state.purchases.filter(p => p.id !== purchId);
    showToast('Purchase deleted');
    renderAllViews();
  });
};

window.togglePlanStatus = async (planId) => {
  const plan = state.plannedPurchases.find(p => p.id === planId);
  if (!plan) return;

  plan.status = plan.status === 'Planned' ? 'Purchased' : 'Planned';
  await saveItem('plannedPurchases', plan);
  renderAllViews();
};

window.confirmDeletePlan = (planId) => {
  confirmDelete('Delete this planned purchase item?', async () => {
    await deleteItem('plannedPurchases', planId);
    state.plannedPurchases = state.plannedPurchases.filter(p => p.id !== planId);
    showToast('Planned item deleted');
    renderAllViews();
  });
};

// STARTUP INITIALIZATION
function startApp() {
  try {
    setupEventListeners();
    setupDefaultDates();
    setupHistoryHandling();
  } catch (err) {
    console.error('Setup listeners error:', err);
  }

  initDB().then(async () => {
    await loadAllData();
    renderAllViews();
    registerServiceWorker();
  }).catch(err => {
    console.error('DB Init error:', err);
    renderAllViews();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration skipped:', err);
    });
  }
}

async function loadAllData() {
  try {
    state.shops = await getAll('shops');
    state.customers = await getAll('customers');
    state.sales = await getAll('sales');
    state.purchases = await getAll('purchases');
    state.plannedPurchases = await getAll('plannedPurchases');
    state.catalog = await getAll('catalog');
    state.sales.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (e) {
    console.error('Failed loading DB data:', e);
  }
}

function setupHistoryHandling() {
  try {
    history.replaceState({ view: 'dashboard-view' }, '', '');
  } catch (e) {}

  window.addEventListener('popstate', () => {
    handleBackNavigation(false);
  });
}

function handleBackNavigation(pushStateToHistory = true) {
  if (state.activeModal) {
    closeModal(state.activeModal, false);
    return;
  }

  const searchSec = document.getElementById('search-results-section');
  if (searchSec && searchSec.classList.contains('active')) {
    const input = document.getElementById('global-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) clearBtn.classList.remove('active');
    switchView(state.currentView, false, false);
    return;
  }

  const shopCard = document.getElementById('shop-profile-card');
  if (shopCard && shopCard.style.display !== 'none') {
    shopCard.style.display = 'none';
    const mainCard = document.getElementById('shops-main-card');
    if (mainCard) mainCard.style.display = 'block';
    state.activeProfile = null;
    state.activeShopId = null;
    updateHeaderBackButton();
    return;
  }

  const custCard = document.getElementById('customer-profile-card');
  if (custCard && custCard.style.display !== 'none') {
    custCard.style.display = 'none';
    const mainCard = document.getElementById('customers-main-card');
    if (mainCard) mainCard.style.display = 'block';
    state.activeProfile = null;
    state.activeCustomerId = null;
    updateHeaderBackButton();
    return;
  }

  const saleForm = document.getElementById('new-sale-form-container');
  if (saleForm && saleForm.style.display !== 'none') {
    saleForm.style.display = 'none';
    updateHeaderBackButton();
    return;
  }

  if (state.currentView !== 'dashboard-view') {
    switchView('dashboard-view', true, pushStateToHistory);
    return;
  }
}

function updateHeaderBackButton() {
  const backBtn = document.getElementById('global-header-back-btn');
  if (!backBtn) return;

  const isShopProfileOpen = document.getElementById('shop-profile-card')?.style.display !== 'none';
  const isCustProfileOpen = document.getElementById('customer-profile-card')?.style.display !== 'none';
  const isSaleFormOpen = document.getElementById('new-sale-form-container')?.style.display !== 'none';
  const isSearchOpen = document.getElementById('search-results-section')?.classList.contains('active');

  const shouldShowBack = (
    state.currentView !== 'dashboard-view' ||
    isShopProfileOpen ||
    isCustProfileOpen ||
    isSaleFormOpen ||
    isSearchOpen ||
    state.activeModal !== null
  );

  backBtn.style.display = shouldShowBack ? 'inline-flex' : 'none';
}

function setupEventListeners() {
  document.getElementById('brand-home-btn')?.addEventListener('click', () => {
    switchView('dashboard-view');
  });

  document.getElementById('global-header-back-btn')?.addEventListener('click', () => {
    handleBackNavigation(true);
  });

  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-target]');
    if (navBtn) {
      const target = navBtn.getAttribute('data-target');
      if (target) switchView(target);
    }
  });

  const searchInput = document.getElementById('global-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const closeSearchBtn = document.getElementById('close-search-btn');

  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      clearSearchBtn?.classList.add('active');
      performGlobalSearch(query);
    } else {
      clearSearchBtn?.classList.remove('active');
      switchView(state.currentView, false, false);
    }
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    clearSearchBtn.classList.remove('active');
    switchView(state.currentView, false, false);
  });

  closeSearchBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    clearSearchBtn?.classList.remove('active');
    switchView(state.currentView, false, false);
  });

  // Shops View
  document.getElementById('open-add-shop-modal')?.addEventListener('click', () => {
    openModal('add-shop-modal');
  });
  document.getElementById('add-shop-form')?.addEventListener('submit', handleAddShop);
  document.getElementById('edit-shop-form')?.addEventListener('submit', handleEditShop);
  document.getElementById('shop-search-input')?.addEventListener('input', renderShopsList);
  document.getElementById('close-shop-profile')?.addEventListener('click', () => {
    handleBackNavigation(true);
  });
  document.getElementById('edit-current-shop-btn')?.addEventListener('click', () => {
    window.openEditShopModal(state.activeShopId);
  });
  document.getElementById('delete-current-shop-btn')?.addEventListener('click', () => {
    window.confirmDeleteShop(state.activeShopId);
  });

  // Customers View
  document.getElementById('open-add-customer-modal')?.addEventListener('click', () => {
    openModal('add-customer-modal');
  });
  document.getElementById('add-customer-form')?.addEventListener('submit', handleAddCustomer);
  document.getElementById('edit-customer-form')?.addEventListener('submit', handleEditCustomer);
  document.getElementById('customer-search-input')?.addEventListener('input', renderCustomersList);
  document.getElementById('close-customer-profile')?.addEventListener('click', () => {
    handleBackNavigation(true);
  });
  document.getElementById('edit-current-customer-btn')?.addEventListener('click', () => {
    window.openEditCustomerModal(state.activeCustomerId);
  });
  document.getElementById('delete-current-customer-btn')?.addEventListener('click', () => {
    window.confirmDeleteCustomer(state.activeCustomerId);
  });

  // Sales View
  document.getElementById('toggle-new-sale-btn')?.addEventListener('click', () => {
    const form = document.getElementById('new-sale-form-container');
    if (!form) return;
    if (form.style.display === 'none') {
      openNewSaleForm();
    } else {
      form.style.display = 'none';
      updateHeaderBackButton();
    }
  });
  document.getElementById('sale-form-top-back-btn')?.addEventListener('click', () => {
    handleBackNavigation(true);
  });
  document.getElementById('cancel-sale-btn')?.addEventListener('click', () => {
    handleBackNavigation(true);
  });

  document.querySelectorAll('.buyer-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.buyer-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentBuyerType = btn.getAttribute('data-type');
      populateBuyerDropdown();
    });
  });

  document.getElementById('sale-quick-add-buyer-btn')?.addEventListener('click', () => {
    if (state.currentBuyerType === 'shop') {
      openModal('add-shop-modal');
    } else {
      openModal('add-customer-modal');
    }
  });

  document.querySelectorAll('.cust-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cust-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCustomerType = btn.getAttribute('data-type');
      updateAllProductRowPricing();
      calculateSaleTotals();
    });
  });

  document.getElementById('add-product-row-btn')?.addEventListener('click', () => {
    addProductRow();
  });

  ['sale-shipping', 'sale-discount', 'sale-free-jigs', 'sale-amount-paid'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateSaleTotals);
  });

  document.getElementById('save-sale-btn')?.addEventListener('click', handleSaveSale);

  // Purchases View
  document.getElementById('open-add-purchase-modal')?.addEventListener('click', () => {
    openModal('add-purchase-modal');
  });
  document.getElementById('add-purchase-form')?.addEventListener('submit', handleAddPurchase);
  ['purch-price', 'purch-qty'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const price = parseFloat(document.getElementById('purch-price')?.value) || 0;
      const qty = parseInt(document.getElementById('purch-qty')?.value) || 0;
      setText('purch-calc-total', `₹${(price * qty).toLocaleString('en-IN')}`);
    });
  });

  // Planned Purchases View
  document.getElementById('open-add-planned-modal')?.addEventListener('click', () => {
    openModal('add-planned-modal');
  });
  document.getElementById('add-planned-form')?.addEventListener('submit', handleAddPlannedPurchase);

  // Update Payment Modal
  document.getElementById('update-payment-form')?.addEventListener('submit', handleUpdatePayment);

  // Backup & Import
  document.getElementById('export-backup-btn')?.addEventListener('click', handleExportBackup);
  document.getElementById('import-backup-file')?.addEventListener('change', handleImportBackup);

  // Modal Closers
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const overlay = e.target.closest('.modal-overlay');
      if (overlay) closeModal(overlay.id);
    });
  });

  document.getElementById('confirm-delete-btn')?.addEventListener('click', () => {
    if (state.pendingDeleteAction) {
      state.pendingDeleteAction();
      state.pendingDeleteAction = null;
    }
    closeModal('delete-confirm-modal');
  });
  document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
    state.pendingDeleteAction = null;
    closeModal('delete-confirm-modal');
  });

  document.getElementById('invoice-search-input')?.addEventListener('input', renderInvoicesList);

  document.getElementById('report-month-select')?.addEventListener('change', renderMonthlyReport);
  document.getElementById('comp-month-a')?.addEventListener('change', renderMonthComparison);
  document.getElementById('comp-month-b')?.addEventListener('change', renderMonthComparison);

  document.getElementById('share-invoice-btn')?.addEventListener('click', handleShareInvoice);
}

function setupDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  const saleDate = document.getElementById('sale-date');
  if (saleDate && !saleDate.value) saleDate.value = today;

  const purchDate = document.getElementById('purch-date');
  if (purchDate && !purchDate.value) purchDate.value = today;

  const planDate = document.getElementById('plan-date');
  if (planDate && !planDate.value) planDate.value = today;

  const reportMonth = document.getElementById('report-month-select');
  if (reportMonth && !reportMonth.value) reportMonth.value = currentMonth;

  const compA = document.getElementById('comp-month-a');
  const compB = document.getElementById('comp-month-b');
  if (compA && !compA.value) compA.value = currentMonth;
  if (compB && !compB.value) {
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    compB.value = prevDate.toISOString().substring(0, 7);
  }
}

function switchView(viewId, updateState = true, pushStateToHistory = true) {
  if (updateState) state.currentView = viewId;

  const shopProfile = document.getElementById('shop-profile-card');
  if (shopProfile) shopProfile.style.display = 'none';
  const shopsMain = document.getElementById('shops-main-card');
  if (shopsMain) shopsMain.style.display = 'block';

  const custProfile = document.getElementById('customer-profile-card');
  if (custProfile) custProfile.style.display = 'none';
  const custsMain = document.getElementById('customers-main-card');
  if (custsMain) custsMain.style.display = 'block';

  const saleForm = document.getElementById('new-sale-form-container');
  if (saleForm) saleForm.style.display = 'none';

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-target') === viewId);
  });

  const activeSec = document.getElementById(viewId);
  if (activeSec) {
    activeSec.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (pushStateToHistory) {
    try {
      history.pushState({ view: viewId }, '', '');
    } catch (e) {}
  }

  updateHeaderBackButton();
  renderAllViews();
}

function renderAllViews() {
  renderDashboardStats();
  renderShopsList();
  renderCustomersList();
  renderSalesList();
  renderPendingPaymentsList();
  renderPurchasesList();
  renderPlannedPurchasesList();
  renderInvoicesList();
  renderMonthlyReport();
  renderMonthComparison();
  renderCatalogTable();
}

function performGlobalSearch(query) {
  const q = query.toLowerCase();
  const container = document.getElementById('search-results-container');
  if (!container) return;

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const searchSec = document.getElementById('search-results-section');
  if (searchSec) searchSec.classList.add('active');

  updateHeaderBackButton();

  let html = '';

  const matchingShops = state.shops.filter(s => s.name.toLowerCase().includes(q));
  if (matchingShops.length > 0) {
    html += `<div class="card-title" style="font-size: 0.88rem; color: var(--accent);">🏪 Shops (${matchingShops.length})</div>`;
    matchingShops.forEach(s => {
      html += `
        <div class="list-item" onclick="window.viewShopProfile('${s.id}')">
          <div class="list-item-title">${escapeHTML(s.name)}</div>
          <div class="list-item-sub">${s.phone ? escapeHTML(s.phone) : 'No phone'}</div>
        </div>`;
    });
  }

  const matchingCusts = state.customers.filter(c => c.name.toLowerCase().includes(q));
  if (matchingCusts.length > 0) {
    html += `<div class="card-title" style="font-size: 0.88rem; color: var(--accent); margin-top: 12px;">👤 Customers (${matchingCusts.length})</div>`;
    matchingCusts.forEach(c => {
      html += `
        <div class="list-item" onclick="window.viewCustomerProfile('${c.id}')">
          <div class="list-item-title">${escapeHTML(c.name)}</div>
          <div class="list-item-sub">${c.phone ? escapeHTML(c.phone) : 'No phone'}</div>
        </div>`;
    });
  }

  const matchingSales = state.sales.filter(s =>
    s.buyerName.toLowerCase().includes(q) ||
    (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
    s.id.toLowerCase().includes(q) ||
    s.items.some(i => i.product.toLowerCase().includes(q))
  );

  if (matchingSales.length > 0) {
    html += `<div class="card-title" style="font-size: 0.88rem; color: var(--accent); margin-top: 12px;">💰 Sales & Invoices (${matchingSales.length})</div>`;
    matchingSales.forEach(s => {
      const statusBadge = getStatusBadgeHTML(s.status);
      html += `
        <div class="list-item" onclick="window.openInvoiceModal('${s.id}')">
          <div class="list-item-header">
            <span class="list-item-title">${escapeHTML(s.buyerName)} (${s.buyerType})</span>
            ${statusBadge}
          </div>
          <div class="list-item-sub">Order #${s.invoiceNo || s.id.substring(0, 8)} • ${s.date} • Total: ₹${s.total.toLocaleString('en-IN')} (Pending: ₹${s.pending.toLocaleString('en-IN')})</div>
        </div>`;
    });
  }

  if (html === '') {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 14px; text-align: center;">No records found for "${escapeHTML(query)}"</p>`;
  } else {
    container.innerHTML = html;
  }
}

function renderDashboardStats() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthLabel = document.getElementById('dash-month-label');
  if (monthLabel) {
    monthLabel.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  const thisMonthSales = state.sales.filter(s => s.date && s.date.startsWith(currentMonthStr));
  const thisMonthPurchases = state.purchases.filter(p => p.date && p.date.startsWith(currentMonthStr));

  const totalSalesVal = thisMonthSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalReceivedVal = thisMonthSales.reduce((acc, s) => acc + (s.paid || 0), 0);
  const totalPendingVal = thisMonthSales.reduce((acc, s) => acc + (s.pending || 0), 0);
  const totalPurchasesVal = thisMonthPurchases.reduce((acc, p) => acc + (p.total || 0), 0);

  setText('dash-month-sales', `₹${totalSalesVal.toLocaleString('en-IN')}`);
  setText('dash-month-purchases', `₹${totalPurchasesVal.toLocaleString('en-IN')}`);
  setText('dash-month-received', `₹${totalReceivedVal.toLocaleString('en-IN')}`);
  setText('dash-month-pending', `₹${totalPendingVal.toLocaleString('en-IN')}`);
  setText('dash-month-orders', thisMonthSales.length);
}

async function handleAddShop(e) {
  e.preventDefault();
  const nameInput = document.getElementById('shop-name-input');
  const name = nameInput ? nameInput.value.trim() : '';
  const phone = document.getElementById('shop-phone-input')?.value.trim() || '';
  const address = document.getElementById('shop-address-input')?.value.trim() || '';

  if (!name) return;

  const shop = {
    id: generateId('shop'),
    name,
    phone,
    address,
    createdAt: new Date().toISOString()
  };

  await saveItem('shops', shop);
  state.shops.push(shop);
  closeModal('add-shop-modal');
  e.target.reset();
  showToast(`Shop "${name}" added successfully`);

  if (state.currentBuyerType === 'shop') {
    populateBuyerDropdown();
    const buyerSel = document.getElementById('sale-buyer-select');
    if (buyerSel) buyerSel.value = shop.id;
  }

  renderShopsList();
}

async function handleEditShop(e) {
  e.preventDefault();
  const shopId = document.getElementById('edit-shop-id')?.value;
  const name = document.getElementById('edit-shop-name-input')?.value.trim();
  const phone = document.getElementById('edit-shop-phone-input')?.value.trim() || '';
  const address = document.getElementById('edit-shop-address-input')?.value.trim() || '';

  if (!name) return;

  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  shop.name = name;
  shop.phone = phone;
  shop.address = address;
  shop.updatedAt = new Date().toISOString();

  await saveItem('shops', shop);

  const shopSales = state.sales.filter(s => s.buyerType === 'shop' && s.buyerId === shopId);
  for (const s of shopSales) {
    s.buyerName = name;
    await saveItem('sales', s);
  }

  closeModal('edit-shop-modal');
  showToast(`Shop "${name}" updated successfully`);

  if (state.activeShopId === shopId) {
    window.viewShopProfile(shopId);
  } else {
    renderAllViews();
  }
}

function renderShopsList() {
  const container = document.getElementById('shops-list-container');
  if (!container) return;

  const filter = (document.getElementById('shop-search-input')?.value || '').toLowerCase();
  const shops = state.shops.filter(s => s.name.toLowerCase().includes(filter));

  if (shops.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No shops found.</p>`;
    return;
  }

  let html = '';
  shops.forEach(s => {
    const shopSales = state.sales.filter(sl => sl.buyerType === 'shop' && sl.buyerId === s.id);
    const totalSales = shopSales.reduce((acc, sl) => acc + (sl.total || 0), 0);
    const totalPending = shopSales.reduce((acc, sl) => acc + (sl.pending || 0), 0);

    html += `
      <div class="list-item">
        <div class="list-item-header" onclick="window.viewShopProfile('${s.id}')">
          <span class="list-item-title">${escapeHTML(s.name)}</span>
          <span class="badge ${totalPending > 0 ? 'badge-warning' : 'badge-success'}">
            ${totalPending > 0 ? `Pending: ₹${totalPending.toLocaleString('en-IN')}` : 'All Paid'}
          </span>
        </div>
        <div class="list-item-sub" onclick="window.viewShopProfile('${s.id}')">
          Orders: ${shopSales.length} • Total Sales: ₹${totalSales.toLocaleString('en-IN')}
          ${s.phone ? ` • 📞 ${escapeHTML(s.phone)}` : ''}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="window.openEditShopModal('${s.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="window.confirmDeleteShop('${s.id}')">✕ Delete</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

async function handleAddCustomer(e) {
  e.preventDefault();
  const nameInput = document.getElementById('customer-name-input');
  const name = nameInput ? nameInput.value.trim() : '';
  const phone = document.getElementById('customer-phone-input')?.value.trim() || '';
  const address = document.getElementById('customer-address-input')?.value.trim() || '';

  if (!name) return;

  const customer = {
    id: generateId('cust'),
    name,
    phone,
    address,
    createdAt: new Date().toISOString()
  };

  await saveItem('customers', customer);
  state.customers.push(customer);
  closeModal('add-customer-modal');
  e.target.reset();
  showToast(`Customer "${name}" added successfully`);

  if (state.currentBuyerType === 'customer') {
    populateBuyerDropdown();
    const buyerSel = document.getElementById('sale-buyer-select');
    if (buyerSel) buyerSel.value = customer.id;
  }

  renderCustomersList();
}

async function handleEditCustomer(e) {
  e.preventDefault();
  const custId = document.getElementById('edit-customer-id')?.value;
  const name = document.getElementById('edit-customer-name-input')?.value.trim();
  const phone = document.getElementById('edit-customer-phone-input')?.value.trim() || '';
  const address = document.getElementById('edit-customer-address-input')?.value.trim() || '';

  if (!name) return;

  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return;

  cust.name = name;
  cust.phone = phone;
  cust.address = address;
  cust.updatedAt = new Date().toISOString();

  await saveItem('customers', cust);

  const custSales = state.sales.filter(s => s.buyerType === 'customer' && s.buyerId === custId);
  for (const s of custSales) {
    s.buyerName = name;
    await saveItem('sales', s);
  }

  closeModal('edit-customer-modal');
  showToast(`Customer "${name}" updated successfully`);

  if (state.activeCustomerId === custId) {
    window.viewCustomerProfile(custId);
  } else {
    renderAllViews();
  }
}

function renderCustomersList() {
  const container = document.getElementById('customers-list-container');
  if (!container) return;

  const filter = (document.getElementById('customer-search-input')?.value || '').toLowerCase();
  const custs = state.customers.filter(c => c.name.toLowerCase().includes(filter));

  if (custs.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No individual customers found.</p>`;
    return;
  }

  let html = '';
  custs.forEach(c => {
    const custSales = state.sales.filter(sl => sl.buyerType === 'customer' && sl.buyerId === c.id);
    const totalSales = custSales.reduce((acc, sl) => acc + (sl.total || 0), 0);
    const totalPending = custSales.reduce((acc, sl) => acc + (sl.pending || 0), 0);

    html += `
      <div class="list-item">
        <div class="list-item-header" onclick="window.viewCustomerProfile('${c.id}')">
          <span class="list-item-title">${escapeHTML(c.name)}</span>
          <span class="badge ${totalPending > 0 ? 'badge-warning' : 'badge-success'}">
            ${totalPending > 0 ? `Pending: ₹${totalPending.toLocaleString('en-IN')}` : 'All Paid'}
          </span>
        </div>
        <div class="list-item-sub" onclick="window.viewCustomerProfile('${c.id}')">
          Orders: ${custSales.length} • Total Sales: ₹${totalSales.toLocaleString('en-IN')}
          ${c.phone ? ` • 📞 ${escapeHTML(c.phone)}` : ''}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="window.openEditCustomerModal('${c.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="window.confirmDeleteCustomer('${c.id}')">✕ Delete</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function openNewSaleForm() {
  const container = document.getElementById('new-sale-form-container');
  if (!container) return;
  container.style.display = 'block';
  populateBuyerDropdown();

  const rowsContainer = document.getElementById('product-rows-container');
  if (rowsContainer) rowsContainer.innerHTML = '';

  const shipInput = document.getElementById('sale-shipping');
  if (shipInput) shipInput.value = '';
  const discInput = document.getElementById('sale-discount');
  if (discInput) discInput.value = '';
  const freeInput = document.getElementById('sale-free-jigs');
  if (freeInput) freeInput.value = '';
  const paidInput = document.getElementById('sale-amount-paid');
  if (paidInput) paidInput.value = '';

  addProductRow();
  calculateSaleTotals();
  updateHeaderBackButton();
}

function populateBuyerDropdown() {
  const select = document.getElementById('sale-buyer-select');
  if (!select) return;

  const list = state.currentBuyerType === 'shop' ? state.shops : state.customers;

  if (list.length === 0) {
    select.innerHTML = `<option value="">No ${state.currentBuyerType}s available - Please add one</option>`;
    return;
  }

  select.innerHTML = list.map(item => `
    <option value="${item.id}">${escapeHTML(item.name)}</option>
  `).join('');
}

function addProductRow() {
  const container = document.getElementById('product-rows-container');
  if (!container) return;

  const rowId = `prod_row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  const div = document.createElement('div');
  div.className = 'product-item-row';
  div.id = rowId;

  const catOptions = state.catalog.map(cat => `
    <option value="${cat.id}">${cat.name} ${cat.weight} (W: ₹${cat.wholesalePrice} | R: ₹${cat.retailPrice || cat.wholesalePrice})</option>
  `).join('');

  div.innerHTML = `
    <div class="product-row-top">
      <select class="form-select prod-select" style="flex: 1;">
        <option value="">-- Select Product --</option>
        ${catOptions}
      </select>
    </div>
    <div class="product-row-bottom">
      <div>
        <label class="form-label" style="font-size:0.68rem;">Qty</label>
        <input type="number" class="form-input prod-qty" value="1" min="1">
      </div>
      <div>
        <label class="form-label" style="font-size:0.68rem;">Selling Price</label>
        <input type="number" class="form-input prod-price" placeholder="Price" min="0" step="0.01">
      </div>
      <div>
        <label class="form-label" style="font-size:0.68rem;">Amount</label>
        <div class="prod-amount" style="font-size: 0.85rem; font-weight:700; padding-top:8px;">₹0</div>
      </div>
      <div>
        <label class="form-label" style="font-size:0.68rem;">&nbsp;</label>
        <button type="button" class="remove-prod-btn">✕</button>
      </div>
    </div>
  `;

  container.appendChild(div);

  const select = div.querySelector('.prod-select');
  const qtyInput = div.querySelector('.prod-qty');
  const priceInput = div.querySelector('.prod-price');
  const removeBtn = div.querySelector('.remove-prod-btn');

  select?.addEventListener('change', () => {
    const selectedCat = state.catalog.find(c => c.id === select.value);
    if (selectedCat && priceInput) {
      if (state.currentCustomerType === 'wholesale') {
        priceInput.value = selectedCat.wholesalePrice;
        priceInput.readOnly = true;
      } else {
        priceInput.value = selectedCat.retailPrice || selectedCat.wholesalePrice;
        priceInput.readOnly = false;
      }
    }
    calculateRowAmount(div);
    calculateSaleTotals();
  });

  qtyInput?.addEventListener('input', () => {
    calculateRowAmount(div);
    calculateSaleTotals();
  });

  priceInput?.addEventListener('input', () => {
    calculateRowAmount(div);
    calculateSaleTotals();
  });

  removeBtn?.addEventListener('click', () => {
    div.remove();
    calculateSaleTotals();
  });

  if (state.catalog.length > 0 && select) {
    select.value = state.catalog[0].id;
    select.dispatchEvent(new Event('change'));
  }
}

function calculateRowAmount(rowDiv) {
  const qty = parseInt(rowDiv.querySelector('.prod-qty')?.value) || 0;
  const price = parseFloat(rowDiv.querySelector('.prod-price')?.value) || 0;
  const amount = qty * price;
  const amtEl = rowDiv.querySelector('.prod-amount');
  if (amtEl) amtEl.textContent = `₹${amount.toLocaleString('en-IN')}`;
}

function updateAllProductRowPricing() {
  document.querySelectorAll('.product-item-row').forEach(rowDiv => {
    const select = rowDiv.querySelector('.prod-select');
    const priceInput = rowDiv.querySelector('.prod-price');
    const selectedCat = state.catalog.find(c => c.id === select?.value);

    if (priceInput && selectedCat) {
      if (state.currentCustomerType === 'wholesale') {
        priceInput.readOnly = true;
        priceInput.value = selectedCat.wholesalePrice;
      } else {
        priceInput.readOnly = false;
        priceInput.value = selectedCat.retailPrice || selectedCat.wholesalePrice;
      }
    }
    calculateRowAmount(rowDiv);
  });
}

function calculateSaleTotals() {
  let subtotal = 0;
  document.querySelectorAll('.product-item-row').forEach(rowDiv => {
    const qty = parseInt(rowDiv.querySelector('.prod-qty')?.value) || 0;
    const price = parseFloat(rowDiv.querySelector('.prod-price')?.value) || 0;
    subtotal += qty * price;
  });

  const shipping = parseFloat(document.getElementById('sale-shipping')?.value) || 0;
  const discount = parseFloat(document.getElementById('sale-discount')?.value) || 0;

  const finalTotal = Math.max(0, subtotal + shipping - discount);

  const amountPaidRaw = document.getElementById('sale-amount-paid')?.value;
  const amountPaid = (amountPaidRaw === '' || amountPaidRaw === undefined) ? 0 : parseFloat(amountPaidRaw) || 0;

  const pending = Math.max(0, finalTotal - amountPaid);

  setText('sale-calc-subtotal', `₹${subtotal.toLocaleString('en-IN')}`);
  setText('sale-calc-total', `₹${finalTotal.toLocaleString('en-IN')}`);
  setText('sale-calc-pending', `₹${pending.toLocaleString('en-IN')}`);
}

async function handleSaveSale() {
  const buyerId = document.getElementById('sale-buyer-select')?.value;
  if (!buyerId) {
    showToast('Please select a valid buyer', 'danger');
    return;
  }

  const buyerList = state.currentBuyerType === 'shop' ? state.shops : state.customers;
  const buyerObj = buyerList.find(b => b.id === buyerId);
  const buyerName = buyerObj ? buyerObj.name : 'Unknown';

  const date = document.getElementById('sale-date')?.value || new Date().toISOString().split('T')[0];

  const items = [];
  document.querySelectorAll('.product-item-row').forEach(rowDiv => {
    const catId = rowDiv.querySelector('.prod-select')?.value;
    const catObj = state.catalog.find(c => c.id === catId);
    if (catObj) {
      const qty = parseInt(rowDiv.querySelector('.prod-qty')?.value) || 0;
      const sellingPrice = parseFloat(rowDiv.querySelector('.prod-price')?.value) || 0;
      if (qty > 0) {
        items.push({
          product: catObj.name,
          weight: catObj.weight,
          qty,
          wholesalePrice: catObj.wholesalePrice,
          sellingPrice,
          amount: qty * sellingPrice
        });
      }
    }
  });

  if (items.length === 0) {
    showToast('Please add at least one product with quantity > 0', 'danger');
    return;
  }

  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const shipping = parseFloat(document.getElementById('sale-shipping')?.value) || 0;
  const discount = parseFloat(document.getElementById('sale-discount')?.value) || 0;
  const freeQty = parseInt(document.getElementById('sale-free-jigs')?.value) || 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const paidInputRaw = document.getElementById('sale-amount-paid')?.value;
  const paid = (paidInputRaw === '' || paidInputRaw === undefined) ? 0 : parseFloat(paidInputRaw) || 0;
  const pending = Math.max(0, total - paid);

  let status = 'Pending';
  if (paid >= total && total > 0) {
    status = 'Paid';
  } else if (paid > 0 && paid < total) {
    status = 'Partially Paid';
  }

  const invoiceNo = `SIG-${Date.now().toString().slice(-6)}`;

  const sale = {
    id: generateId('sale'),
    invoiceNo,
    date,
    buyerType: state.currentBuyerType,
    buyerId,
    buyerName,
    customerType: state.currentCustomerType,
    items,
    subtotal,
    shipping,
    discount,
    freeQty,
    total,
    paid,
    pending,
    status,
    paymentHistory: paid > 0 ? [{ date: new Date().toISOString(), amount: paid }] : [],
    createdAt: new Date().toISOString()
  };

  await saveItem('sales', sale);
  state.sales.unshift(sale);

  const saleForm = document.getElementById('new-sale-form-container');
  if (saleForm) saleForm.style.display = 'none';
  updateHeaderBackButton();
  showToast('Sale saved successfully!');
  renderAllViews();
}

function renderSalesList() {
  const container = document.getElementById('sales-list-container');
  if (!container) return;

  if (state.sales.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No sales orders recorded yet.</p>`;
    return;
  }

  let html = '';
  state.sales.forEach(s => {
    const statusBadge = getStatusBadgeHTML(s.status);
    const itemsSummary = s.items.map(i => `${i.product} ${i.weight} × ${i.qty}`).join(', ');

    html += `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(s.buyerName)} (${s.buyerType})</span>
          ${statusBadge}
        </div>
        <div class="list-item-sub">
          Inv #: <strong>${s.invoiceNo}</strong> • Date: ${s.date} • Type: ${s.customerType.toUpperCase()}<br>
          Items: ${itemsSummary} ${s.freeQty > 0 ? ` (+${s.freeQty} free jigs)` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <div>
            <span style="font-weight: 800; font-size: 1rem; color: var(--accent);">₹${s.total.toLocaleString('en-IN')}</span>
            <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 6px;">(Paid: ₹${s.paid.toLocaleString('en-IN')} | Pending: ₹${s.pending.toLocaleString('en-IN')})</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="window.openUpdatePaymentModal('${s.id}')">Update Pay</button>
            <button class="btn btn-primary btn-sm" onclick="window.openInvoiceModal('${s.id}')">Invoice</button>
            <button class="btn btn-danger btn-sm" onclick="window.confirmDeleteSale('${s.id}')">✕</button>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function renderPendingPaymentsList() {
  const container = document.getElementById('pending-list-container');
  if (!container) return;

  const pendingSales = state.sales.filter(s => s.pending > 0);

  if (pendingSales.length === 0) {
    container.innerHTML = `<p style="color: var(--success); font-size: 0.9rem; text-align: center; padding: 14px;">🎉 All customer payment dues are fully cleared!</p>`;
    return;
  }

  let html = '';
  pendingSales.forEach(s => {
    html += `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(s.buyerName)}</span>
          <span class="badge badge-danger">Pending ₹${s.pending.toLocaleString('en-IN')}</span>
        </div>
        <div class="list-item-sub">
          Order #: <strong>${s.invoiceNo}</strong> • Date: ${s.date} • Total Order: ₹${s.total.toLocaleString('en-IN')}<br>
          Paid so far: ₹${s.paid.toLocaleString('en-IN')}
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
          <button class="btn btn-primary btn-sm" onclick="window.openUpdatePaymentModal('${s.id}')">Update Payment</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

async function handleUpdatePayment(e) {
  e.preventDefault();
  const saleId = document.getElementById('pay-sale-id')?.value;
  const newPaid = parseFloat(document.getElementById('pay-modal-new-paid')?.value) || 0;

  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  sale.paid = Math.min(sale.total, Math.max(0, newPaid));
  sale.pending = Math.max(0, sale.total - sale.paid);

  if (sale.paid >= sale.total && sale.total > 0) {
    sale.status = 'Paid';
  } else if (sale.paid > 0 && sale.paid < sale.total) {
    sale.status = 'Partially Paid';
  } else {
    sale.status = 'Pending';
  }

  if (!sale.paymentHistory) sale.paymentHistory = [];
  sale.paymentHistory.push({ date: new Date().toISOString(), amount: sale.paid });

  await saveItem('sales', sale);
  closeModal('update-payment-modal');
  showToast('Payment updated successfully');
  renderAllViews();
}

function renderInvoicesList() {
  const container = document.getElementById('invoices-list-container');
  if (!container) return;

  const filter = (document.getElementById('invoice-search-input')?.value || '').toLowerCase();
  const sales = state.sales.filter(s =>
    s.buyerName.toLowerCase().includes(filter) ||
    (s.invoiceNo && s.invoiceNo.toLowerCase().includes(filter))
  );

  if (sales.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No invoices found.</p>`;
    return;
  }

  let html = '';
  sales.forEach(s => {
    html += `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(s.buyerName)}</span>
          <span class="badge ${s.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
        </div>
        <div class="list-item-sub">
          Invoice #: <strong>${s.invoiceNo}</strong> • Date: ${s.date} • Total: ₹${s.total.toLocaleString('en-IN')}
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
          <button class="btn btn-primary btn-sm" onclick="window.openInvoiceModal('${s.id}')">📄 Generate / Share Invoice</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

async function handleShareInvoice() {
  const sale = state.currentInvoiceSale;
  if (!sale) return;

  const textSummary = `SIGMA LURES - INVOICE #${sale.invoiceNo}
Customer: ${sale.buyerName}
Date: ${sale.date}
Items:
${sale.items.map(i => `- ${i.product} ${i.weight} x ${i.qty} = ₹${i.amount}`).join('\n')}
${sale.freeQty > 0 ? `Free Jigs: ${sale.freeQty} pcs\n` : ''}Total Amount: ₹${sale.total}
Paid: ₹${sale.paid}
Pending Dues: ₹${sale.pending}
Status: ${sale.status}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Invoice #${sale.invoiceNo} - Sigma Lures`,
        text: textSummary
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyToClipboard(textSummary);
      }
    }
  } else {
    copyToClipboard(textSummary);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Invoice details copied to clipboard!');
  }).catch(() => {
    showToast('Unable to copy automatically', 'warning');
  });
}

async function handleAddPurchase(e) {
  e.preventDefault();
  const product = document.getElementById('purch-product')?.value.trim();
  const supplier = document.getElementById('purch-supplier')?.value.trim() || '';
  const price = parseFloat(document.getElementById('purch-price')?.value) || 0;
  const quantity = parseInt(document.getElementById('purch-qty')?.value) || 1;
  const date = document.getElementById('purch-date')?.value || new Date().toISOString().split('T')[0];

  if (!product || price <= 0) return;

  const purchase = {
    id: generateId('purch'),
    product,
    supplier,
    price,
    quantity,
    total: price * quantity,
    date,
    createdAt: new Date().toISOString()
  };

  await saveItem('purchases', purchase);
  state.purchases.unshift(purchase);
  closeModal('add-purchase-modal');
  e.target.reset();
  showToast('Purchase entry saved');
  renderAllViews();
}

function renderPurchasesList() {
  const container = document.getElementById('purchases-list-container');
  if (!container) return;

  const totalSpent = state.purchases.reduce((acc, p) => acc + p.total, 0);
  setText('purchase-total-spent', `₹${totalSpent.toLocaleString('en-IN')}`);
  setText('purchase-total-count', state.purchases.length);

  if (state.purchases.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No material purchases logged yet.</p>`;
    return;
  }

  let html = '';
  state.purchases.forEach(p => {
    html += `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(p.product)}</span>
          <span style="font-weight: 800; color: var(--warning);">₹${p.total.toLocaleString('en-IN')}</span>
        </div>
        <div class="list-item-sub">
          Date: ${p.date} • ${p.supplier ? `Supplier: ${escapeHTML(p.supplier)} • ` : ''}
          ${p.quantity} units @ ₹${p.price}/unit
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button class="btn btn-danger btn-sm" onclick="window.confirmDeletePurchase('${p.id}')">✕ Delete</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

async function handleAddPlannedPurchase(e) {
  e.preventDefault();
  const item = document.getElementById('plan-item')?.value.trim();
  const expectedPrice = parseFloat(document.getElementById('plan-price')?.value) || 0;
  const quantity = parseInt(document.getElementById('plan-qty')?.value) || 1;
  const supplier = document.getElementById('plan-supplier')?.value.trim() || '';
  const plannedDate = document.getElementById('plan-date')?.value || '';
  const notes = document.getElementById('plan-notes')?.value.trim() || '';

  if (!item) return;

  const plan = {
    id: generateId('plan'),
    item,
    expectedPrice,
    quantity,
    supplier,
    plannedDate,
    notes,
    status: 'Planned',
    createdAt: new Date().toISOString()
  };

  await saveItem('plannedPurchases', plan);
  state.plannedPurchases.unshift(plan);
  closeModal('add-planned-modal');
  e.target.reset();
  showToast('Planned item saved');
  renderAllViews();
}

function renderPlannedPurchasesList() {
  const container = document.getElementById('planned-list-container');
  if (!container) return;

  if (state.plannedPurchases.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No planned purchases.</p>`;
    return;
  }

  let html = '';
  state.plannedPurchases.forEach(p => {
    html += `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(p.item)} (×${p.quantity})</span>
          <span class="badge ${p.status === 'Purchased' ? 'badge-success' : 'badge-warning'}">${p.status}</span>
        </div>
        <div class="list-item-sub">
          Expected Price: ₹${p.expectedPrice} • Supplier: ${p.supplier ? escapeHTML(p.supplier) : 'N/A'}<br>
          Target Date: ${p.plannedDate || 'N/A'} ${p.notes ? `• Note: ${escapeHTML(p.notes)}` : ''}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="window.togglePlanStatus('${p.id}')">
            Mark as ${p.status === 'Planned' ? 'Purchased' : 'Planned'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="window.confirmDeletePlan('${p.id}')">✕</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function renderMonthlyReport() {
  const monthInput = document.getElementById('report-month-select');
  const container = document.getElementById('report-metrics-container');
  if (!monthInput || !container) return;

  const monthStr = monthInput.value;
  if (!monthStr) return;

  const monthSales = state.sales.filter(s => s.date && s.date.startsWith(monthStr));
  const monthPurchases = state.purchases.filter(p => p.date && p.date.startsWith(monthStr));

  const totalSales = monthSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalPurchases = monthPurchases.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalReceived = monthSales.reduce((acc, s) => acc + (s.paid || 0), 0);
  const totalPending = monthSales.reduce((acc, s) => acc + (s.pending || 0), 0);
  const totalDiscounts = monthSales.reduce((acc, s) => acc + (s.discount || 0), 0);
  const totalShipping = monthSales.reduce((acc, s) => acc + (s.shipping || 0), 0);
  const totalFreeJigs = monthSales.reduce((acc, s) => acc + (s.freeQty || 0), 0);

  const prodSummary = {};
  monthSales.forEach(s => {
    s.items.forEach(i => {
      const key = `${i.product} ${i.weight}`;
      prodSummary[key] = (prodSummary[key] || 0) + i.qty;
    });
  });

  const prodListHtml = Object.keys(prodSummary).length === 0
    ? '<span style="color:var(--text-muted);">None</span>'
    : Object.entries(prodSummary).map(([k, v]) => `<li>${k}: <strong>${v} pcs</strong></li>`).join('');

  container.innerHTML = `
    <div class="grid-2" style="margin-bottom: 12px;">
      <div class="stat-card">
        <span class="stat-label">Total Sales</span>
        <span class="stat-value accent">₹${totalSales.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Purchases</span>
        <span class="stat-value warning">₹${totalPurchases.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 12px;">
      <div class="stat-card">
        <span class="stat-label">Received</span>
        <span class="stat-value success">₹${totalReceived.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Pending</span>
        <span class="stat-value danger">₹${totalPending.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Orders</span>
        <span class="stat-value">${monthSales.length}</span>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 14px;">
      <div class="stat-card">
        <span class="stat-label">Discounts</span>
        <span class="stat-value">₹${totalDiscounts.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Shipping</span>
        <span class="stat-value">₹${totalShipping.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Free Jigs</span>
        <span class="stat-value" style="color:var(--accent);">${totalFreeJigs}</span>
      </div>
    </div>

    <div class="card" style="background: var(--bg-input);">
      <div class="card-title" style="font-size:0.85rem; color:var(--text-muted);">Products Sold Breakdown</div>
      <ul style="padding-left: 20px; font-size:0.85rem;">
        ${prodListHtml}
      </ul>
    </div>
  `;
}

function renderMonthComparison() {
  const monthA = document.getElementById('comp-month-a')?.value;
  const monthB = document.getElementById('comp-month-b')?.value;
  const container = document.getElementById('comparison-table-container');
  if (!monthA || !monthB || !container) return;

  const salesA = state.sales.filter(s => s.date && s.date.startsWith(monthA));
  const salesB = state.sales.filter(s => s.date && s.date.startsWith(monthB));
  const purchA = state.purchases.filter(p => p.date && p.date.startsWith(monthA));
  const purchB = state.purchases.filter(p => p.date && p.date.startsWith(monthB));

  const totalSalesA = salesA.reduce((acc, s) => acc + s.total, 0);
  const totalSalesB = salesB.reduce((acc, s) => acc + s.total, 0);
  const totalPurchA = purchA.reduce((acc, p) => acc + p.total, 0);
  const totalPurchB = purchB.reduce((acc, p) => acc + p.total, 0);
  const totalRecA = salesA.reduce((acc, s) => acc + s.paid, 0);
  const totalRecB = salesB.reduce((acc, s) => acc + s.paid, 0);
  const totalPendA = salesA.reduce((acc, s) => acc + s.pending, 0);
  const totalPendB = salesB.reduce((acc, s) => acc + s.pending, 0);

  const diffSales = totalSalesA - totalSalesB;
  const diffPurch = totalPurchA - totalPurchB;
  const diffRec = totalRecA - totalRecB;
  const diffPend = totalPendA - totalPendB;

  const formatDiff = (val) => {
    const prefix = val >= 0 ? '+' : '';
    const color = val >= 0 ? 'var(--success)' : 'var(--danger)';
    return `<span style="color:${color}; font-weight:bold;">${prefix}₹${val.toLocaleString('en-IN')}</span>`;
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>${monthA}</th>
            <th>${monthB}</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sales</td>
            <td>₹${totalSalesA.toLocaleString('en-IN')}</td>
            <td>₹${totalSalesB.toLocaleString('en-IN')}</td>
            <td>${formatDiff(diffSales)}</td>
          </tr>
          <tr>
            <td>Purchases</td>
            <td>₹${totalPurchA.toLocaleString('en-IN')}</td>
            <td>₹${totalPurchB.toLocaleString('en-IN')}</td>
            <td>${formatDiff(diffPurch)}</td>
          </tr>
          <tr>
            <td>Amount Received</td>
            <td>₹${totalRecA.toLocaleString('en-IN')}</td>
            <td>₹${totalRecB.toLocaleString('en-IN')}</td>
            <td>${formatDiff(diffRec)}</td>
          </tr>
          <tr>
            <td>Pending Payments</td>
            <td>₹${totalPendA.toLocaleString('en-IN')}</td>
            <td>₹${totalPendB.toLocaleString('en-IN')}</td>
            <td>${formatDiff(diffPend)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

async function handleExportBackup() {
  try {
    const jsonStr = await exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    const a = document.createElement('a');
    a.href = url;
    a.download = `sigma_lures_backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exported successfully!');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'danger');
  }
}

async function handleImportBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  confirmDelete('Importing this backup will safely append and restore all records into your local database. Proceed?', async () => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        await importBackupJSON(evt.target.result);
        await loadAllData();
        renderAllViews();
        showToast('Backup restored successfully!');
      } catch (err) {
        showToast('Import error: ' + err.message, 'danger');
      }
    };
    reader.readAsText(file);
  });
}

function renderCatalogTable() {
  const tbody = document.getElementById('catalog-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.catalog.map(c => `
    <tr>
      <td><strong>${escapeHTML(c.name)}</strong></td>
      <td>${escapeHTML(c.weight)}</td>
      <td style="color: var(--text-muted); font-weight: 600;">₹${c.wholesalePrice}</td>
      <td style="color: var(--success); font-weight: 700;">₹${c.retailPrice || c.wholesalePrice}</td>
    </tr>
  `).join('');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function getStatusBadgeHTML(status) {
  if (status === 'Paid') {
    return `<span class="badge badge-success">Paid</span>`;
  } else if (status === 'Partially Paid') {
    return `<span class="badge badge-warning">Partially Paid</span>`;
  } else {
    return `<span class="badge badge-danger">Pending</span>`;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'danger') toast.style.borderColor = 'var(--danger)';
  if (type === 'warning') toast.style.borderColor = 'var(--warning)';

  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) {
    overlay.classList.add('active');
    state.activeModal = modalId;
    updateHeaderBackButton();
  }
}

function closeModal(modalId, updateHistory = true) {
  const overlay = document.getElementById(modalId);
  if (overlay) {
    overlay.classList.remove('active');
    if (state.activeModal === modalId) {
      state.activeModal = null;
    }
    updateHeaderBackButton();
  }
}

function confirmDelete(message, actionCallback) {
  state.pendingDeleteAction = actionCallback;
  const msgEl = document.getElementById('delete-modal-msg');
  if (msgEl) msgEl.textContent = message;
  openModal('delete-confirm-modal');
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
