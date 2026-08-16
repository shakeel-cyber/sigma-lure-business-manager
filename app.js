/**
 * Sigma Lures — Core Application Logic
 * Mobile-First Offline Business Management System
 * Standard JavaScript (Global window scope - runs in all browser environments)
 */

const {
  initDB,
  getAll,
  getItem,
  saveItem,
  deleteItem,
  generateId,
  exportBackupJSON,
  importBackupJSON
} = window;

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
  activeShopId: null,
  activeCustomerId: null,
  activeModal: null
};

// Global Order Row Expansion Toggle
window.toggleOrderExpand = (saleId) => {
  const expandRow = document.getElementById(`order-expand-${saleId}`);
  if (expandRow) {
    expandRow.style.display = expandRow.style.display === 'none' ? 'table-row' : 'none';
  }
};

// Helper: Render Order Row HTML for Shop & Customer Profiles
function renderOrderTableRowHtml(s) {
  const isPaid = s.pending <= 0;
  const statusBadge = isPaid
    ? `<span class="badge badge-success">Paid</span>`
    : `<span class="badge badge-warning">Pending</span>`;

  let innerRows = '';
  (s.items || []).forEach(item => {
    const matchedCat = state.catalog.find(c => c.name === item.product && c.weight === item.weight);
    const estPrice = matchedCat
      ? (s.customerType === 'wholesale' ? matchedCat.wholesalePrice : matchedCat.retailPrice)
      : item.sellingPrice;

    innerRows += `
      <tr>
        <td><strong>${escapeHTML(item.product)}</strong></td>
        <td style="text-align:center;">${escapeHTML(item.weight)}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">₹${(item.sellingPrice || 0).toLocaleString('en-IN')}</td>
        <td style="text-align:right; font-weight:700;">₹${(item.amount || 0).toLocaleString('en-IN')}</td>
        <td style="text-align:right; color: var(--text-muted); font-size: 0.78rem;">
          Est: ₹${estPrice}
        </td>
      </tr>`;
  });

  return `
    <tr class="order-row-clickable" onclick="window.toggleOrderExpand('${s.id}')">
      <td>${s.date}</td>
      <td><strong>${s.id.substring(0, 10)}</strong></td>
      <td style="font-weight: 800; color: var(--accent);">₹${(s.total || 0).toLocaleString('en-IN')}</td>
      <td style="color: var(--success);">₹${(s.amountPaid || 0).toLocaleString('en-IN')}</td>
      <td style="color: var(--danger); font-weight: 700;">₹${(s.pending || 0).toLocaleString('en-IN')}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center;">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.toggleOrderExpand('${s.id}')">
          👁️ Details
        </button>
      </td>
    </tr>
    <tr id="order-expand-${s.id}" style="display: none; background: rgba(0,0,0,0.3);">
      <td colspan="7">
        <div class="order-expand-card">
          <div style="font-weight: 800; font-size: 0.88rem; color: var(--accent); margin-bottom: 6px;">
            Selected Lures & Line Items Breakdown
          </div>
          <table class="inner-details-table">
            <thead>
              <tr>
                <th>Lure Model</th>
                <th style="text-align:center;">Weight</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Line Total</th>
                <th style="text-align:right;">Catalog Ref</th>
              </tr>
            </thead>
            <tbody>
              ${innerRows}
            </tbody>
          </table>

          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 0.8rem; background: var(--bg-input); padding: 8px 10px; border-radius: var(--radius-sm); margin: 8px 0;">
            <div>Subtotal: <strong>₹${(s.subtotal || 0).toLocaleString('en-IN')}</strong></div>
            <div>Shipping: <strong>₹${(s.shipping || 0).toLocaleString('en-IN')}</strong></div>
            <div>Discount: <strong>₹${(s.discount || 0).toLocaleString('en-IN')}</strong></div>
            <div>Free Jigs: <strong>${s.freeJigs || 0} pcs</strong></div>
            <div>Final Total: <strong style="color: var(--accent);">₹${(s.total || 0).toLocaleString('en-IN')}</strong></div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.openEditSaleModal('${s.id}')">✏️ Edit Order</button>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.openUpdatePaymentModal('${s.id}')">💳 Update Pay</button>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.openInvoiceModal('${s.id}')">📄 Invoice</button>
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.confirmDeleteSale('${s.id}')">✕ Delete</button>
          </div>
        </div>
      </td>
    </tr>`;
}

// View Shop Profile
window.viewShopProfile = (shopId) => {
  state.activeShopId = shopId;
  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  const shopsMain = document.getElementById('shops-main-card');
  const shopProfile = document.getElementById('shop-profile-card');
  if (shopsMain) shopsMain.style.display = 'none';
  if (shopProfile) shopProfile.style.display = 'block';

  document.getElementById('shop-profile-name').textContent = shop.name;

  const shopSales = state.sales.filter(s => s.buyerType === 'shop' && s.buyerId === shopId);
  const totalSales = shopSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPaid = shopSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const totalPending = shopSales.reduce((sum, s) => sum + (s.pending || 0), 0);

  document.getElementById('shop-total-sales').textContent = `₹${totalSales.toLocaleString('en-IN')}`;
  document.getElementById('shop-total-orders').textContent = shopSales.length;
  document.getElementById('shop-total-paid').textContent = `₹${totalPaid.toLocaleString('en-IN')}`;
  document.getElementById('shop-total-pending').textContent = `₹${totalPending.toLocaleString('en-IN')}`;

  const tbody = document.getElementById('shop-history-tbody');
  if (tbody) {
    if (shopSales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No sales recorded for this shop.</td></tr>`;
    } else {
      tbody.innerHTML = shopSales.map(s => renderOrderTableRowHtml(s)).join('');
    }
  }

  updateHeaderBackButton();
};

// View Customer Profile
window.viewCustomerProfile = (custId) => {
  state.activeCustomerId = custId;
  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return;

  const custsMain = document.getElementById('customers-main-card');
  const custProfile = document.getElementById('customer-profile-card');
  if (custsMain) custsMain.style.display = 'none';
  if (custProfile) custProfile.style.display = 'block';

  document.getElementById('customer-profile-name').textContent = cust.name;

  const custSales = state.sales.filter(s => s.buyerType === 'customer' && s.buyerId === custId);
  const totalSales = custSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPaid = custSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const totalPending = custSales.reduce((sum, s) => sum + (s.pending || 0), 0);

  document.getElementById('cust-total-sales').textContent = `₹${totalSales.toLocaleString('en-IN')}`;
  document.getElementById('cust-total-orders').textContent = custSales.length;
  document.getElementById('cust-total-paid').textContent = `₹${totalPaid.toLocaleString('en-IN')}`;
  document.getElementById('cust-total-pending').textContent = `₹${totalPending.toLocaleString('en-IN')}`;

  const tbody = document.getElementById('cust-history-tbody');
  if (tbody) {
    if (custSales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No sales recorded for this customer.</td></tr>`;
    } else {
      tbody.innerHTML = custSales.map(s => renderOrderTableRowHtml(s)).join('');
    }
  }

  updateHeaderBackButton();
};

// Open Edit Shop Modal
window.openEditShopModal = (shopId) => {
  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  document.getElementById('edit-shop-id').value = shop.id;
  document.getElementById('edit-shop-name-input').value = shop.name;
  document.getElementById('edit-shop-phone-input').value = shop.phone || '';
  document.getElementById('edit-shop-address-input').value = shop.address || '';

  openModal('edit-shop-modal');
};

// Open Edit Customer Modal
window.openEditCustomerModal = (custId) => {
  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return;

  document.getElementById('edit-customer-id').value = cust.id;
  document.getElementById('edit-customer-name-input').value = cust.name;
  document.getElementById('edit-customer-phone-input').value = cust.phone || '';
  document.getElementById('edit-customer-address-input').value = cust.address || '';

  openModal('edit-customer-modal');
};

// Confirmation Delete Dialogs
window.confirmDeleteShop = (shopId) => {
  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  state.pendingDeleteAction = async () => {
    await deleteItem('shops', shopId);
    state.shops = state.shops.filter(s => s.id !== shopId);
    showToast(`Shop "${shop.name}" deleted`);

    if (state.activeShopId === shopId) {
      const shopProfile = document.getElementById('shop-profile-card');
      const shopsMain = document.getElementById('shops-main-card');
      if (shopProfile) shopProfile.style.display = 'none';
      if (shopsMain) shopsMain.style.display = 'block';
      state.activeShopId = null;
    }
    renderAllViews();
  };

  document.getElementById('delete-modal-msg').textContent = `Are you sure you want to delete shop "${shop.name}"? This action cannot be undone.`;
  openModal('delete-confirm-modal');
};

window.confirmDeleteCustomer = (custId) => {
  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return;

  state.pendingDeleteAction = async () => {
    await deleteItem('customers', custId);
    state.customers = state.customers.filter(c => c.id !== custId);
    showToast(`Customer "${cust.name}" deleted`);

    if (state.activeCustomerId === custId) {
      const custProfile = document.getElementById('customer-profile-card');
      const custsMain = document.getElementById('customers-main-card');
      if (custProfile) custProfile.style.display = 'none';
      if (custsMain) custsMain.style.display = 'block';
      state.activeCustomerId = null;
    }
    renderAllViews();
  };

  document.getElementById('delete-modal-msg').textContent = `Are you sure you want to delete customer "${cust.name}"? This action cannot be undone.`;
  openModal('delete-confirm-modal');
};

// Invoice Modal Open
window.openInvoiceModal = (saleId) => {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  state.currentInvoiceSale = sale;
  renderInvoiceHtml(sale);
  openModal('invoice-modal');
};

// Render Invoice HTML for Print & Share
function renderInvoiceHtml(sale) {
  const container = document.getElementById('invoice-print-area');
  if (!container) return;

  let itemsHtml = '';
  (sale.items || []).forEach(item => {
    itemsHtml += `
      <tr>
        <td><strong>${escapeHTML(item.product)}</strong></td>
        <td>${escapeHTML(item.weight)}</td>
        <td>${item.quantity}</td>
        <td>₹${(item.sellingPrice || 0).toLocaleString('en-IN')}</td>
        <td style="text-align:right;">₹${(item.amount || 0).toLocaleString('en-IN')}</td>
      </tr>`;
  });

  container.innerHTML = `
    <div style="text-align: center; border-bottom: 2px solid #ff6b00; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #ff6b00;">SIGMA LURES</h2>
      <p style="margin: 2px 0; font-size: 0.85rem;">Premium Fishing Lures & Accessories</p>
      <p style="margin: 0; font-size: 0.78rem; color: #666;">Tax Invoice / Cash Memo</p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 0.88rem;">
      <div>
        <strong>Customer / Shop:</strong><br>
        <span style="font-size: 1.05rem;">${escapeHTML(sale.buyerName)}</span><br>
        Type: ${sale.buyerType ? sale.buyerType.toUpperCase() : 'N/A'} (${sale.customerType || 'Wholesale'})
      </div>
      <div style="text-align: right;">
        <strong>Invoice #:</strong> ${sale.id.substring(0, 10)}<br>
        <strong>Date:</strong> ${sale.date}<br>
        <strong>Status:</strong> ${sale.pending <= 0 ? 'PAID' : 'PENDING'}
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.88rem;">
      <thead>
        <tr style="background: #f1f5f9; color: #333;">
          <th style="padding: 8px; text-align: left;">Product</th>
          <th style="padding: 8px; text-align: left;">Weight</th>
          <th style="padding: 8px; text-align: left;">Qty</th>
          <th style="padding: 8px; text-align: left;">Rate</th>
          <th style="padding: 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
      <div style="width: 240px; font-size: 0.88rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Subtotal:</span> <span>₹${(sale.subtotal || 0).toLocaleString('en-IN')}</span>
        </div>
        ${sale.shipping ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Shipping:</span> <span>₹${sale.shipping.toLocaleString('en-IN')}</span></div>` : ''}
        ${sale.discount ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Discount:</span> <span>-₹${sale.discount.toLocaleString('en-IN')}</span></div>` : ''}
        ${sale.freeJigs ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Free Jigs:</span> <span>${sale.freeJigs} pcs</span></div>` : ''}
        <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 6px; font-weight: 800; font-size: 1.05rem;">
          <span>Total:</span> <span>₹${(sale.total || 0).toLocaleString('en-IN')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; color: green;">
          <span>Paid:</span> <span>₹${(sale.amountPaid || 0).toLocaleString('en-IN')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; color: red; font-weight: 700;">
          <span>Balance Due:</span> <span>₹${(sale.pending || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>`;
}

// Open Payment Modal
window.openUpdatePaymentModal = (saleId) => {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  document.getElementById('pay-sale-id').value = sale.id;
  document.getElementById('pay-modal-total').textContent = `₹${(sale.total || 0).toLocaleString('en-IN')}`;
  document.getElementById('pay-modal-prev-paid').textContent = `₹${(sale.amountPaid || 0).toLocaleString('en-IN')}`;
  document.getElementById('pay-modal-pending').textContent = `₹${(sale.pending || 0).toLocaleString('en-IN')}`;

  const input = document.getElementById('pay-modal-new-paid');
  if (input) input.value = sale.amountPaid || 0;

  openModal('update-payment-modal');
};

// Delete Sale Confirm
window.confirmDeleteSale = (saleId) => {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  state.pendingDeleteAction = async () => {
    await deleteItem('sales', saleId);
    state.sales = state.sales.filter(s => s.id !== saleId);
    showToast(`Order #${sale.id.substring(0, 8)} deleted`);

    if (state.activeShopId) window.viewShopProfile(state.activeShopId);
    if (state.activeCustomerId) window.viewCustomerProfile(state.activeCustomerId);
    renderAllViews();
  };

  document.getElementById('delete-modal-msg').textContent = `Permanently delete Order #${sale.id.substring(0, 8)}? This action cannot be undone.`;
  openModal('delete-confirm-modal');
};

window.confirmDeletePurchase = (purchId) => {
  state.pendingDeleteAction = async () => {
    await deleteItem('purchases', purchId);
    state.purchases = state.purchases.filter(p => p.id !== purchId);
    showToast('Purchase log deleted');
    renderAllViews();
  };
  document.getElementById('delete-modal-msg').textContent = 'Delete this purchase log permanently?';
  openModal('delete-confirm-modal');
};

window.togglePlanStatus = async (planId) => {
  const plan = state.plannedPurchases.find(p => p.id === planId);
  if (!plan) return;

  plan.status = plan.status === 'completed' ? 'pending' : 'completed';
  await saveItem('plannedPurchases', plan);
  showToast(`Status updated to ${plan.status}`);
  renderAllViews();
};

window.confirmDeletePlan = (planId) => {
  state.pendingDeleteAction = async () => {
    await deleteItem('plannedPurchases', planId);
    state.plannedPurchases = state.plannedPurchases.filter(p => p.id !== planId);
    showToast('Planned item deleted');
    renderAllViews();
  };
  document.getElementById('delete-modal-msg').textContent = 'Delete this planned purchase permanently?';
  openModal('delete-confirm-modal');
};

// Toast Notification Helper
function showToast(message, type = 'accent') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Modal Helpers
function openModal(modalId) {
  state.activeModal = modalId;
  const overlay = document.getElementById(modalId);
  if (overlay) overlay.classList.add('active');
  updateHeaderBackButton();
}

function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) overlay.classList.remove('active');
  state.activeModal = null;
  updateHeaderBackButton();
}

// Startup Application Init
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

function setupDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const saleDate = document.getElementById('sale-date');
  if (saleDate) saleDate.value = today;
  const purchDate = document.getElementById('purch-date');
  if (purchDate) purchDate.value = today;

  const currentMonth = today.substring(0, 7);
  const repMonth = document.getElementById('report-month-select');
  if (repMonth) repMonth.value = currentMonth;
  const compA = document.getElementById('comp-month-a');
  if (compA) compA.value = currentMonth;
  const compB = document.getElementById('comp-month-b');
  if (compB) {
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    compB.value = prev.toISOString().substring(0, 7);
  }
}

function setupHistoryHandling() {
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view) {
      switchView(e.state.view, false, false);
    } else {
      switchView('dashboard-view', false, false);
    }
  });
}

function handleBackNavigation(pushStateToHistory = true) {
  if (state.activeModal) {
    closeModal(state.activeModal);
    return;
  }

  const searchResults = document.getElementById('search-results-section');
  if (searchResults && searchResults.classList.contains('active')) {
    switchView(state.currentView, false, pushStateToHistory);
    return;
  }

  const shopProfile = document.getElementById('shop-profile-card');
  if (shopProfile && shopProfile.style.display !== 'none') {
    shopProfile.style.display = 'none';
    const shopsMain = document.getElementById('shops-main-card');
    if (shopsMain) shopsMain.style.display = 'block';
    state.activeShopId = null;
    updateHeaderBackButton();
    return;
  }

  const custProfile = document.getElementById('customer-profile-card');
  if (custProfile && custProfile.style.display !== 'none') {
    custProfile.style.display = 'none';
    const custsMain = document.getElementById('customers-main-card');
    if (custsMain) custsMain.style.display = 'block';
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

  // New Order Handlers for Business Hub & Bottom Nav
  const handleNewOrderClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    switchView('sales-view');
    openNewSaleForm();
  };

  document.getElementById('dash-new-order-btn')?.addEventListener('click', handleNewOrderClick);
  document.getElementById('bottom-nav-new-order-btn')?.addEventListener('click', handleNewOrderClick);
  window.openNewOrderForm = handleNewOrderClick;

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

  // Edit Sale Modal Listeners
  document.getElementById('edit-sale-form')?.addEventListener('submit', handleSaveEditedSale);

  document.querySelectorAll('.edit-buyer-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.edit-buyer-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editSaleBuyerType = btn.getAttribute('data-type');
      populateEditBuyerDatalist();
    });
  });

  document.querySelectorAll('.edit-cust-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.edit-cust-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editSaleCustomerType = btn.getAttribute('data-type');
      calculateEditSaleTotals();
    });
  });

  document.getElementById('edit-add-product-row-btn')?.addEventListener('click', () => {
    addEditProductRow();
  });

  ['edit-sale-shipping', 'edit-sale-discount', 'edit-sale-free-jigs', 'edit-sale-amount-paid'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateEditSaleTotals);
  });

  // Purchases View
  document.getElementById('open-add-purchase-modal')?.addEventListener('click', () => {
    openModal('add-purchase-modal');
  });
  document.getElementById('add-purchase-form')?.addEventListener('submit', handleAddPurchase);
  ['purch-price', 'purch-qty'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculatePurchaseTotal);
  });

  // Planned Purchases
  document.getElementById('open-add-planned-modal')?.addEventListener('click', () => {
    openModal('add-planned-modal');
  });
  document.getElementById('add-planned-form')?.addEventListener('submit', handleAddPlanned);

  // Update Payment Form
  document.getElementById('update-payment-form')?.addEventListener('submit', handleSavePaymentUpdate);

  // Backup & Import
  document.getElementById('export-backup-btn')?.addEventListener('click', handleExportBackup);
  document.getElementById('import-backup-file')?.addEventListener('change', handleImportBackup);

  // Close Modals
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.activeModal) closeModal(state.activeModal);
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

  // Filters & Reports
  document.getElementById('invoice-search-input')?.addEventListener('input', renderInvoicesList);
  document.getElementById('report-month-select')?.addEventListener('change', renderMonthlyReport);
  document.getElementById('comp-month-a')?.addEventListener('change', renderMonthComparison);
  document.getElementById('comp-month-b')?.addEventListener('change', renderMonthComparison);

  // Web Share Invoice
  document.getElementById('share-invoice-btn')?.addEventListener('click', handleShareInvoice);
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

function performGlobalSearch(query) {
  const container = document.getElementById('search-results-container');
  const searchSec = document.getElementById('search-results-section');
  if (!container || !searchSec) return;

  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  searchSec.classList.add('active');
  updateHeaderBackButton();

  const q = query.toLowerCase();
  const matchedShops = state.shops.filter(s => s.name.toLowerCase().includes(q));
  const matchedCusts = state.customers.filter(c => c.name.toLowerCase().includes(q));
  const matchedSales = state.sales.filter(s => s.buyerName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));

  let html = '';

  if (matchedShops.length > 0) {
    html += `<div style="font-weight: 800; font-size: 0.85rem; color: var(--accent); margin-bottom: 6px;">Shops</div>`;
    matchedShops.forEach(s => {
      html += `
        <div class="list-item" onclick="window.viewShopProfile('${s.id}')">
          <div class="list-item-title">${escapeHTML(s.name)}</div>
          <div class="list-item-sub">${s.phone ? escapeHTML(s.phone) : 'No phone'}</div>
        </div>`;
    });
  }

  if (matchedCusts.length > 0) {
    html += `<div style="font-weight: 800; font-size: 0.85rem; color: var(--accent); margin-top: 10px; margin-bottom: 6px;">Customers</div>`;
    matchedCusts.forEach(c => {
      html += `
        <div class="list-item" onclick="window.viewCustomerProfile('${c.id}')">
          <div class="list-item-title">${escapeHTML(c.name)}</div>
          <div class="list-item-sub">${c.phone ? escapeHTML(c.phone) : 'No phone'}</div>
        </div>`;
    });
  }

  if (matchedSales.length > 0) {
    html += `<div style="font-weight: 800; font-size: 0.85rem; color: var(--accent); margin-top: 10px; margin-bottom: 6px;">Sales & Orders</div>`;
    matchedSales.forEach(s => {
      html += `
        <div class="list-item" onclick="window.openInvoiceModal('${s.id}')">
          <div class="list-item-header">
            <span class="list-item-title">${escapeHTML(s.buyerName)} (${s.buyerType})</span>
            <span class="badge ${s.pending > 0 ? 'badge-warning' : 'badge-success'}">₹${s.total}</span>
          </div>
          <div class="list-item-sub">Date: ${s.date} • Order #: ${s.id.substring(0, 8)}</div>
        </div>`;
    });
  }

  if (!html) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 14px; text-align: center;">No records found for "${escapeHTML(query)}"</p>`;
  } else {
    container.innerHTML = html;
  }
}

function renderAllViews() {
  renderDashboardStats();
  renderShopsList();
  renderCustomersList();
  renderSalesList();
  renderPendingList();
  renderPurchasesList();
  renderPlannedList();
  renderInvoicesList();
  renderMonthlyReport();
  renderMonthComparison();
  renderCatalogTable();
}

function renderDashboardStats() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  document.getElementById('dash-month-label').textContent = currentMonth;

  const monthSales = state.sales.filter(s => s.date && s.date.startsWith(currentMonth));
  const monthPurchases = state.purchases.filter(p => p.date && p.date.startsWith(currentMonth));

  const totalSales = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPurchases = monthPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalReceived = monthSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const totalPending = monthSales.reduce((sum, s) => sum + (s.pending || 0), 0);

  document.getElementById('dash-month-sales').textContent = `₹${totalSales.toLocaleString('en-IN')}`;
  document.getElementById('dash-month-purchases').textContent = `₹${totalPurchases.toLocaleString('en-IN')}`;
  document.getElementById('dash-month-received').textContent = `₹${totalReceived.toLocaleString('en-IN')}`;
  document.getElementById('dash-month-pending').textContent = `₹${totalPending.toLocaleString('en-IN')}`;
  document.getElementById('dash-month-orders').textContent = monthSales.length;
}

// Handle Add Shop
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
    const buyerInput = document.getElementById('sale-buyer-input');
    if (buyerInput) buyerInput.value = shop.name;
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

// Render Shops List (ONLY shops with sold orders)
function renderShopsList() {
  const container = document.getElementById('shops-list-container');
  if (!container) return;

  const filter = (document.getElementById('shop-search-input')?.value || '').toLowerCase();
  const shopsWithSales = state.shops.filter(s =>
    s.name.toLowerCase().includes(filter) &&
    state.sales.some(sl => sl.buyerType === 'shop' && sl.buyerId === s.id)
  );

  if (shopsWithSales.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No shops with sold orders found.</p>`;
    return;
  }

  let html = '';
  shopsWithSales.forEach(s => {
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

// Handle Add Customer
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
    const buyerInput = document.getElementById('sale-buyer-input');
    if (buyerInput) buyerInput.value = customer.name;
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

// Render Customers List (ONLY customers with sold orders)
function renderCustomersList() {
  const container = document.getElementById('customers-list-container');
  if (!container) return;

  const filter = (document.getElementById('customer-search-input')?.value || '').toLowerCase();
  const custsWithSales = state.customers.filter(c =>
    c.name.toLowerCase().includes(filter) &&
    state.sales.some(sl => sl.buyerType === 'customer' && sl.buyerId === c.id)
  );

  if (custsWithSales.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No individual customers with sold orders found.</p>`;
    return;
  }

  let html = '';
  custsWithSales.forEach(c => {
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

// Sales & Order Form Functions
function openNewSaleForm() {
  const container = document.getElementById('new-sale-form-container');
  if (!container) return;
  container.style.display = 'block';
  populateBuyerDropdown();

  const rowsContainer = document.getElementById('product-rows-container');
  if (rowsContainer) rowsContainer.innerHTML = '';

  const buyerInput = document.getElementById('sale-buyer-input');
  if (buyerInput) buyerInput.value = '';

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
  const datalist = document.getElementById('buyer-datalist');
  if (!datalist) return;

  const list = state.currentBuyerType === 'shop' ? state.shops : state.customers;
  datalist.innerHTML = list.map(item => `
    <option value="${escapeHTML(item.name)}"></option>
  `).join('');
}

function addProductRow() {
  const container = document.getElementById('product-rows-container');
  if (!container) return;

  const rowId = `prod_row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const div = document.createElement('div');
  div.className = 'product-item-row';
  div.id = rowId;

  // Build Catalog Select Options
  let selectHtml = `<select class="form-select prod-select">`;
  state.catalog.forEach(cat => {
    const price = state.currentCustomerType === 'wholesale' ? cat.wholesalePrice : (cat.retailPrice || cat.wholesalePrice);
    selectHtml += `<option value="${cat.id}">${cat.name} (${cat.weight}) - ₹${price}</option>`;
  });
  selectHtml += `</select>`;

  div.innerHTML = `
    <div class="product-row-top">
      ${selectHtml}
    </div>
    <div class="product-row-bottom">
      <div>
        <label class="form-label" style="font-size: 0.7rem;">Qty</label>
        <input type="number" class="form-input prod-qty" value="1" min="1">
      </div>
      <div>
        <label class="form-label" style="font-size: 0.7rem;">Unit Price (₹)</label>
        <input type="number" class="form-input prod-price" placeholder="Price" min="0" step="0.01">
      </div>
      <div>
        <label class="form-label" style="font-size: 0.7rem;">Total</label>
        <div class="prod-row-total" style="font-weight: 800; font-size: 0.9rem; color: var(--accent); padding-top: 8px;">₹0</div>
      </div>
      <div style="text-align: right;">
        <button type="button" class="remove-prod-btn" title="Remove line item">✕</button>
      </div>
    </div>`;

  container.appendChild(div);

  const select = div.querySelector('.prod-select');
  const qtyInput = div.querySelector('.prod-qty');
  const priceInput = div.querySelector('.prod-price');

  const updatePrice = () => {
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
  };

  select?.addEventListener('change', updatePrice);
  qtyInput?.addEventListener('input', () => {
    calculateRowAmount(div);
    calculateSaleTotals();
  });
  priceInput?.addEventListener('input', () => {
    calculateRowAmount(div);
    calculateSaleTotals();
  });

  div.querySelector('.remove-prod-btn')?.addEventListener('click', () => {
    div.remove();
    calculateSaleTotals();
  });

  updatePrice();
}

function updateAllProductRowPricing() {
  document.querySelectorAll('.product-item-row:not(.edit-product-item-row)').forEach(div => {
    const select = div.querySelector('.prod-select');
    const priceInput = div.querySelector('.prod-price');
    if (select && priceInput) {
      const selectedCat = state.catalog.find(c => c.id === select.value);
      if (selectedCat) {
        if (state.currentCustomerType === 'wholesale') {
          priceInput.value = selectedCat.wholesalePrice;
          priceInput.readOnly = true;
        } else {
          priceInput.value = selectedCat.retailPrice || selectedCat.wholesalePrice;
          priceInput.readOnly = false;
        }
      }
      calculateRowAmount(div);
    }
  });
}

function calculateRowAmount(div) {
  const qty = parseFloat(div.querySelector('.prod-qty')?.value || 0);
  const price = parseFloat(div.querySelector('.prod-price')?.value || 0);
  const total = qty * price;
  const totalDiv = div.querySelector('.prod-row-total');
  if (totalDiv) totalDiv.textContent = `₹${total.toLocaleString('en-IN')}`;
  return total;
}

function calculateSaleTotals() {
  let subtotal = 0;
  document.querySelectorAll('.product-item-row:not(.edit-product-item-row)').forEach(div => {
    subtotal += calculateRowAmount(div);
  });

  const shipping = parseFloat(document.getElementById('sale-shipping')?.value || 0);
  const discount = parseFloat(document.getElementById('sale-discount')?.value || 0);
  const finalTotal = Math.max(0, subtotal + shipping - discount);

  const amountPaidVal = document.getElementById('sale-amount-paid')?.value;
  const amountPaid = amountPaidVal === '' ? 0 : parseFloat(amountPaidVal || 0);
  const pending = Math.max(0, finalTotal - amountPaid);

  const subEl = document.getElementById('sale-calc-subtotal');
  if (subEl) subEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  const totEl = document.getElementById('sale-calc-total');
  if (totEl) totEl.textContent = `₹${finalTotal.toLocaleString('en-IN')}`;
  const pendEl = document.getElementById('sale-calc-pending');
  if (pendEl) pendEl.textContent = `₹${pending.toLocaleString('en-IN')}`;

  return { subtotal, shipping, discount, finalTotal, amountPaid, pending };
}

// Save New Sale Handler (ONLY HERE IS BUYER PERSISTED IF NEW)
async function handleSaveSale() {
  const buyerName = document.getElementById('sale-buyer-input')?.value.trim();
  if (!buyerName) {
    showToast('Please enter or select a valid buyer name', 'danger');
    return;
  }

  // Find or create buyer
  let buyerObj = null;
  if (state.currentBuyerType === 'shop') {
    buyerObj = state.shops.find(s => s.name.toLowerCase() === buyerName.toLowerCase());
    if (!buyerObj) {
      buyerObj = {
        id: generateId('shop'),
        name: buyerName,
        createdAt: new Date().toISOString()
      };
      await saveItem('shops', buyerObj);
      state.shops.push(buyerObj);
    }
  } else {
    buyerObj = state.customers.find(c => c.name.toLowerCase() === buyerName.toLowerCase());
    if (!buyerObj) {
      buyerObj = {
        id: generateId('cust'),
        name: buyerName,
        createdAt: new Date().toISOString()
      };
      await saveItem('customers', buyerObj);
      state.customers.push(buyerObj);
    }
  }

  // Gather items
  const items = [];
  document.querySelectorAll('.product-item-row:not(.edit-product-item-row)').forEach(div => {
    const select = div.querySelector('.prod-select');
    const selectedCat = state.catalog.find(c => c.id === select?.value);
    const qty = parseInt(div.querySelector('.prod-qty')?.value || 1);
    const price = parseFloat(div.querySelector('.prod-price')?.value || 0);

    if (selectedCat && qty > 0) {
      items.push({
        product: selectedCat.name,
        weight: selectedCat.weight,
        quantity: qty,
        sellingPrice: price,
        amount: qty * price
      });
    }
  });

  if (items.length === 0) {
    showToast('Please add at least one product line item', 'danger');
    return;
  }

  const totals = calculateSaleTotals();
  const saleDate = document.getElementById('sale-date')?.value || new Date().toISOString().split('T')[0];
  const freeJigs = parseInt(document.getElementById('sale-free-jigs')?.value || 0);

  const sale = {
    id: generateId('sale'),
    buyerType: state.currentBuyerType,
    buyerId: buyerObj.id,
    buyerName: buyerObj.name,
    customerType: state.currentCustomerType,
    date: saleDate,
    items,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    discount: totals.discount,
    freeJigs,
    total: totals.finalTotal,
    amountPaid: totals.amountPaid,
    pending: totals.pending,
    createdAt: new Date().toISOString()
  };

  await saveItem('sales', sale);
  state.sales.unshift(sale);

  const form = document.getElementById('new-sale-form-container');
  if (form) form.style.display = 'none';

  showToast(`Sale of ₹${totals.finalTotal.toLocaleString('en-IN')} created successfully`, 'success');
  renderAllViews();
}

// Edit Sale Modal Variables & Logic
let editSaleBuyerType = 'shop';
let editSaleCustomerType = 'wholesale';

function populateEditBuyerDatalist() {
  const datalist = document.getElementById('edit-buyer-datalist');
  if (!datalist) return;

  const list = editSaleBuyerType === 'shop' ? state.shops : state.customers;
  datalist.innerHTML = list.map(item => `<option value="${escapeHTML(item.name)}"></option>`).join('');
}

window.openEditSaleModal = (saleId) => {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  document.getElementById('edit-sale-id').value = sale.id;

  editSaleBuyerType = sale.buyerType || 'shop';
  document.querySelectorAll('.edit-buyer-type-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-type') === editSaleBuyerType);
  });

  editSaleCustomerType = sale.customerType || 'wholesale';
  document.querySelectorAll('.edit-cust-type-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-type') === editSaleCustomerType);
  });

  populateEditBuyerDatalist();
  document.getElementById('edit-sale-buyer-input').value = sale.buyerName || '';
  document.getElementById('edit-sale-date').value = sale.date || new Date().toISOString().split('T')[0];

  document.getElementById('edit-sale-shipping').value = sale.shipping || '';
  document.getElementById('edit-sale-discount').value = sale.discount || '';
  document.getElementById('edit-sale-free-jigs').value = sale.freeJigs || '';
  document.getElementById('edit-sale-amount-paid').value = sale.amountPaid || '';

  const rowsContainer = document.getElementById('edit-product-rows-container');
  if (rowsContainer) rowsContainer.innerHTML = '';

  (sale.items || []).forEach(item => addEditProductRow(item));

  calculateEditSaleTotals();
  openModal('edit-sale-modal');
};

function addEditProductRow(existingItem = null) {
  const container = document.getElementById('edit-product-rows-container');
  if (!container) return;

  const rowId = `edit_prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const div = document.createElement('div');
  div.className = 'product-item-row edit-product-item-row';
  div.id = rowId;

  let selectHtml = `<select class="form-select prod-select">`;
  state.catalog.forEach(cat => {
    selectHtml += `<option value="${cat.id}">${cat.name} (${cat.weight})</option>`;
  });
  selectHtml += `</select>`;

  div.innerHTML = `
    <div class="product-row-top">
      ${selectHtml}
    </div>
    <div class="product-row-bottom">
      <div>
        <label class="form-label" style="font-size: 0.7rem;">Qty</label>
        <input type="number" class="form-input prod-qty" value="${existingItem ? existingItem.quantity : 1}" min="1">
      </div>
      <div>
        <label class="form-label" style="font-size: 0.7rem;">Unit Price (₹)</label>
        <input type="number" class="form-input prod-price" placeholder="Price" value="${existingItem ? existingItem.sellingPrice : ''}" min="0" step="0.01">
      </div>
      <div>
        <label class="form-label" style="font-size: 0.7rem;">Total</label>
        <div class="prod-row-total" style="font-weight: 800; font-size: 0.9rem; color: var(--accent); padding-top: 8px;">₹0</div>
      </div>
      <div style="text-align: right;">
        <button type="button" class="remove-prod-btn">✕</button>
      </div>
    </div>`;

  container.appendChild(div);

  const select = div.querySelector('.prod-select');
  const qtyInput = div.querySelector('.prod-qty');
  const priceInput = div.querySelector('.prod-price');

  if (existingItem) {
    const matchedCat = state.catalog.find(c => c.name === existingItem.product && c.weight === existingItem.weight);
    if (matchedCat && select) select.value = matchedCat.id;
  }

  select?.addEventListener('change', () => {
    const selectedCat = state.catalog.find(c => c.id === select.value);
    if (selectedCat && priceInput) {
      if (editSaleCustomerType === 'wholesale') {
        priceInput.value = selectedCat.wholesalePrice;
        priceInput.readOnly = true;
      } else {
        priceInput.value = selectedCat.retailPrice || selectedCat.wholesalePrice;
        priceInput.readOnly = false;
      }
    }
    calculateRowAmount(div);
    calculateEditSaleTotals();
  });

  qtyInput?.addEventListener('input', () => {
    calculateRowAmount(div);
    calculateEditSaleTotals();
  });

  priceInput?.addEventListener('input', () => {
    calculateRowAmount(div);
    calculateEditSaleTotals();
  });

  div.querySelector('.remove-prod-btn')?.addEventListener('click', () => {
    div.remove();
    calculateEditSaleTotals();
  });

  calculateRowAmount(div);
}

function calculateEditSaleTotals() {
  let subtotal = 0;
  document.querySelectorAll('.edit-product-item-row').forEach(div => {
    subtotal += calculateRowAmount(div);
  });

  const shipping = parseFloat(document.getElementById('edit-sale-shipping')?.value || 0);
  const discount = parseFloat(document.getElementById('edit-sale-discount')?.value || 0);
  const finalTotal = Math.max(0, subtotal + shipping - discount);

  const amountPaidVal = document.getElementById('edit-sale-amount-paid')?.value;
  const amountPaid = amountPaidVal === '' ? 0 : parseFloat(amountPaidVal || 0);
  const pending = Math.max(0, finalTotal - amountPaid);

  document.getElementById('edit-sale-calc-subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  document.getElementById('edit-sale-calc-total').textContent = `₹${finalTotal.toLocaleString('en-IN')}`;
  document.getElementById('edit-sale-calc-pending').textContent = `₹${pending.toLocaleString('en-IN')}`;

  return { subtotal, shipping, discount, finalTotal, amountPaid, pending };
}

async function handleSaveEditedSale(e) {
  e.preventDefault();
  const saleId = document.getElementById('edit-sale-id')?.value;
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  const buyerName = document.getElementById('edit-sale-buyer-input')?.value.trim();
  if (!buyerName) {
    showToast('Please enter a valid buyer name', 'danger');
    return;
  }

  let buyerObj = null;
  if (editSaleBuyerType === 'shop') {
    buyerObj = state.shops.find(s => s.name.toLowerCase() === buyerName.toLowerCase());
    if (!buyerObj) {
      buyerObj = { id: generateId('shop'), name: buyerName, createdAt: new Date().toISOString() };
      await saveItem('shops', buyerObj);
      state.shops.push(buyerObj);
    }
  } else {
    buyerObj = state.customers.find(c => c.name.toLowerCase() === buyerName.toLowerCase());
    if (!buyerObj) {
      buyerObj = { id: generateId('cust'), name: buyerName, createdAt: new Date().toISOString() };
      await saveItem('customers', buyerObj);
      state.customers.push(buyerObj);
    }
  }

  const items = [];
  document.querySelectorAll('.edit-product-item-row').forEach(div => {
    const select = div.querySelector('.prod-select');
    const selectedCat = state.catalog.find(c => c.id === select?.value);
    const qty = parseInt(div.querySelector('.prod-qty')?.value || 1);
    const price = parseFloat(div.querySelector('.prod-price')?.value || 0);

    if (selectedCat && qty > 0) {
      items.push({
        product: selectedCat.name,
        weight: selectedCat.weight,
        quantity: qty,
        sellingPrice: price,
        amount: qty * price
      });
    }
  });

  if (items.length === 0) {
    showToast('Please add at least one product line item', 'danger');
    return;
  }

  const totals = calculateEditSaleTotals();
  const saleDate = document.getElementById('edit-sale-date')?.value || sale.date;
  const freeJigs = parseInt(document.getElementById('edit-sale-free-jigs')?.value || 0);

  sale.buyerType = editSaleBuyerType;
  sale.buyerId = buyerObj.id;
  sale.buyerName = buyerObj.name;
  sale.customerType = editSaleCustomerType;
  sale.date = saleDate;
  sale.items = items;
  sale.subtotal = totals.subtotal;
  sale.shipping = totals.shipping;
  sale.discount = totals.discount;
  sale.freeJigs = freeJigs;
  sale.total = totals.finalTotal;
  sale.amountPaid = totals.amountPaid;
  sale.pending = totals.pending;

  await saveItem('sales', sale);
  closeModal('edit-sale-modal');
  showToast(`Order #${sale.id.substring(0, 8)} updated successfully`, 'success');

  if (state.activeShopId) window.viewShopProfile(state.activeShopId);
  if (state.activeCustomerId) window.viewCustomerProfile(state.activeCustomerId);
  renderAllViews();
}

// Render Sales List
function renderSalesList() {
  const container = document.getElementById('sales-list-container');
  if (!container) return;

  if (state.sales.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No sales recorded yet. Click "+ New Sale" to log your first order.</p>`;
    return;
  }

  let html = '';
  state.sales.forEach(s => {
    const isPaid = s.pending <= 0;
    html += `
      <div class="list-item">
        <div class="list-item-header" onclick="window.openInvoiceModal('${s.id}')">
          <span class="list-item-title">${escapeHTML(s.buyerName)} (${s.buyerType})</span>
          <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
            ₹${(s.total || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div class="list-item-sub" onclick="window.openInvoiceModal('${s.id}')">
          Date: ${s.date} • Paid: ₹${(s.amountPaid || 0).toLocaleString('en-IN')} • Pending: ₹${(s.pending || 0).toLocaleString('en-IN')}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="window.openEditSaleModal('${s.id}')">✏️ Edit Order</button>
          <button class="btn btn-secondary btn-sm" onclick="window.openUpdatePaymentModal('${s.id}')">💳 Update Pay</button>
          <button class="btn btn-primary btn-sm" onclick="window.openInvoiceModal('${s.id}')">📄 Invoice</button>
          <button class="btn btn-danger btn-sm" onclick="window.confirmDeleteSale('${s.id}')">✕</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// Pending List
function renderPendingList() {
  const container = document.getElementById('pending-list-container');
  if (!container) return;

  const pendingSales = state.sales.filter(s => s.pending > 0);

  if (pendingSales.length === 0) {
    container.innerHTML = `<p style="color: var(--success); font-size: 0.9rem; text-align: center; padding: 14px;">🎉 All pending payments cleared!</p>`;
    return;
  }

  let html = '';
  pendingSales.forEach(s => {
    html += `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(s.buyerName)}</span>
          <span class="badge badge-danger">Pending: ₹${s.pending.toLocaleString('en-IN')}</span>
        </div>
        <div class="list-item-sub">
          Order Date: ${s.date} • Total Order: ₹${s.total.toLocaleString('en-IN')} • Received: ₹${s.amountPaid.toLocaleString('en-IN')}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px;">
          <button class="btn btn-primary btn-sm" onclick="window.openUpdatePaymentModal('${s.id}')">Update Payment</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

async function handleSavePaymentUpdate(e) {
  e.preventDefault();
  const saleId = document.getElementById('pay-sale-id')?.value;
  const newPaid = parseFloat(document.getElementById('pay-modal-new-paid')?.value || 0);

  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  sale.amountPaid = newPaid;
  sale.pending = Math.max(0, sale.total - newPaid);

  await saveItem('sales', sale);
  closeModal('update-payment-modal');
  showToast(`Payment updated for Order #${sale.id.substring(0, 8)}`);

  if (state.activeShopId) window.viewShopProfile(state.activeShopId);
  if (state.activeCustomerId) window.viewCustomerProfile(state.activeCustomerId);
  renderAllViews();
}

// Purchases Logic
function calculatePurchaseTotal() {
  const price = parseFloat(document.getElementById('purch-price')?.value || 0);
  const qty = parseInt(document.getElementById('purch-qty')?.value || 1);
  const total = price * qty;
  const totalEl = document.getElementById('purch-calc-total');
  if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
}

async function handleAddPurchase(e) {
  e.preventDefault();
  const product = document.getElementById('purch-product')?.value.trim();
  const price = parseFloat(document.getElementById('purch-price')?.value || 0);
  const qty = parseInt(document.getElementById('purch-qty')?.value || 1);
  const supplier = document.getElementById('purch-supplier')?.value.trim() || '';
  const date = document.getElementById('purch-date')?.value || new Date().toISOString().split('T')[0];

  if (!product || price <= 0) {
    showToast('Please enter valid product and price', 'danger');
    return;
  }

  const purchase = {
    id: generateId('purch'),
    product,
    unitPrice: price,
    quantity: qty,
    total: price * qty,
    supplier,
    date,
    createdAt: new Date().toISOString()
  };

  await saveItem('purchases', purchase);
  state.purchases.unshift(purchase);

  closeModal('add-purchase-modal');
  e.target.reset();
  showToast('Material purchase logged');
  renderAllViews();
}

function renderPurchasesList() {
  const container = document.getElementById('purchases-list-container');
  if (!container) return;

  const totalSpent = state.purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  document.getElementById('purchase-total-spent').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
  document.getElementById('purchase-total-count').textContent = state.purchases.length;

  if (state.purchases.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No purchases logged yet.</p>`;
    return;
  }

  let html = '';
  state.purchases.forEach(p => {
    html += `
      <div class="list-item">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(p.product)}</span>
          <span class="badge badge-warning">₹${(p.total || 0).toLocaleString('en-IN')}</span>
        </div>
        <div class="list-item-sub">
          Date: ${p.date} • ${p.supplier ? `Supplier: ${escapeHTML(p.supplier)} • ` : ''}Qty: ${p.quantity} @ ₹${p.unitPrice}
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
          <button class="btn btn-danger btn-sm" onclick="window.confirmDeletePurchase('${p.id}')">✕ Delete</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// Planned Purchases
async function handleAddPlanned(e) {
  e.preventDefault();
  const item = document.getElementById('plan-item')?.value.trim();
  const expectedPrice = parseFloat(document.getElementById('plan-price')?.value || 0);
  const quantity = parseInt(document.getElementById('plan-qty')?.value || 1);
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
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await saveItem('plannedPurchases', plan);
  state.plannedPurchases.unshift(plan);

  closeModal('add-planned-modal');
  e.target.reset();
  showToast('Upcoming purchase planned');
  renderAllViews();
}

function renderPlannedList() {
  const container = document.getElementById('planned-list-container');
  if (!container) return;

  if (state.plannedPurchases.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No upcoming planned purchases.</p>`;
    return;
  }

  let html = '';
  state.plannedPurchases.forEach(p => {
    const isDone = p.status === 'completed';
    html += `
      <div class="list-item" style="${isDone ? 'opacity: 0.6;' : ''}">
        <div class="list-item-header">
          <span class="list-item-title">${escapeHTML(p.item)} (×${p.quantity})</span>
          <span class="badge ${isDone ? 'badge-success' : 'badge-warning'}">${p.status.toUpperCase()}</span>
        </div>
        <div class="list-item-sub">
          Expected Price: ₹${p.expectedPrice} • Supplier: ${p.supplier ? escapeHTML(p.supplier) : 'N/A'}<br>
          Target Date: ${p.plannedDate || 'N/A'} ${p.notes ? `• Note: ${escapeHTML(p.notes)}` : ''}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="window.togglePlanStatus('${p.id}')">
            ${isDone ? 'Mark Pending' : '✓ Mark Complete'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="window.confirmDeletePlan('${p.id}')">✕</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// Invoices
function renderInvoicesList() {
  const container = document.getElementById('invoices-list-container');
  if (!container) return;

  const filter = (document.getElementById('invoice-search-input')?.value || '').toLowerCase();
  const filteredSales = state.sales.filter(s =>
    s.buyerName.toLowerCase().includes(filter) ||
    s.id.toLowerCase().includes(filter)
  );

  if (filteredSales.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 14px;">No invoices found.</p>`;
    return;
  }

  let html = '';
  filteredSales.forEach(s => {
    html += `
      <div class="list-item">
        <div class="list-item-header" onclick="window.openInvoiceModal('${s.id}')">
          <span class="list-item-title">${escapeHTML(s.buyerName)}</span>
          <span class="badge badge-success">₹${s.total.toLocaleString('en-IN')}</span>
        </div>
        <div class="list-item-sub" onclick="window.openInvoiceModal('${s.id}')">
          Invoice #: ${s.id.substring(0, 10)} • Date: ${s.date}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
          <button class="btn btn-primary btn-sm" onclick="window.openInvoiceModal('${s.id}')">📄 Generate / Share Invoice</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// Web Share API Invoice Sharing
async function handleShareInvoice() {
  if (!state.currentInvoiceSale) return;
  const s = state.currentInvoiceSale;

  let text = `SIGMA LURES - TAX INVOICE\n`;
  text += `Invoice #: ${s.id.substring(0, 10)}\n`;
  text += `Date: ${s.date}\n`;
  text += `Customer / Shop: ${s.buyerName}\n`;
  text += `------------------------------\n`;
  (s.items || []).forEach(i => {
    text += `- ${i.product} (${i.weight}) ×${i.quantity} @ ₹${i.sellingPrice} = ₹${i.amount}\n`;
  });
  text += `------------------------------\n`;
  text += `Subtotal: ₹${s.subtotal}\n`;
  if (s.shipping) text += `Shipping: ₹${s.shipping}\n`;
  if (s.discount) text += `Discount: -₹${s.discount}\n`;
  text += `TOTAL: ₹${s.total}\n`;
  text += `Paid: ₹${s.amountPaid}\n`;
  text += `Balance Due: ₹${s.pending}\n\n`;
  text += `Thank you for choosing Sigma Lures!`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Invoice #${s.id.substring(0, 10)} - ${s.buyerName}`,
        text: text
      });
    } catch (e) {}
  } else {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Invoice details copied to clipboard!');
    } catch (e) {
      showToast('Sharing not supported on this browser', 'danger');
    }
  }
}

// Monthly Financial Reports
function renderMonthlyReport() {
  const monthVal = document.getElementById('report-month-select')?.value;
  const container = document.getElementById('report-summary-container');
  if (!container || !monthVal) return;

  const monthSales = state.sales.filter(s => s.date && s.date.startsWith(monthVal));
  const monthPurchases = state.purchases.filter(p => p.date && p.date.startsWith(monthVal));

  const totalSales = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalReceived = monthSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const totalPending = monthSales.reduce((sum, s) => sum + (s.pending || 0), 0);
  const totalPurchases = monthPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const netProfit = totalSales - totalPurchases;

  container.innerHTML = `
    <div class="grid-2" style="margin-bottom: 10px;">
      <div class="stat-card">
        <span class="stat-label">Gross Sales</span>
        <span class="stat-value accent">₹${totalSales.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Material Costs</span>
        <span class="stat-value warning">₹${totalPurchases.toLocaleString('en-IN')}</span>
      </div>
    </div>
    <div class="grid-3">
      <div class="stat-card">
        <span class="stat-label">Collected</span>
        <span class="stat-value success">₹${totalReceived.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Pending</span>
        <span class="stat-value danger">₹${totalPending.toLocaleString('en-IN')}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Est. Profit</span>
        <span class="stat-value ${netProfit >= 0 ? 'success' : 'danger'}">₹${netProfit.toLocaleString('en-IN')}</span>
      </div>
    </div>`;
}

function renderMonthComparison() {
  const mA = document.getElementById('comp-month-a')?.value;
  const mB = document.getElementById('comp-month-b')?.value;
  const container = document.getElementById('comparison-table-container');
  if (!container || !mA || !mB) return;

  const salesA = state.sales.filter(s => s.date && s.date.startsWith(mA)).reduce((sum, s) => sum + (s.total || 0), 0);
  const salesB = state.sales.filter(s => s.date && s.date.startsWith(mB)).reduce((sum, s) => sum + (s.total || 0), 0);

  const purchA = state.purchases.filter(p => p.date && p.date.startsWith(mA)).reduce((sum, p) => sum + (p.total || 0), 0);
  const purchB = state.purchases.filter(p => p.date && p.date.startsWith(mB)).reduce((sum, p) => sum + (p.total || 0), 0);

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>${mA}</th>
          <th>${mB}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Sales</td>
          <td>₹${salesA.toLocaleString('en-IN')}</td>
          <td>₹${salesB.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Total Purchases</td>
          <td>₹${purchA.toLocaleString('en-IN')}</td>
          <td>₹${purchB.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td><strong>Net Difference</strong></td>
          <td colspan="2" style="text-align: center; font-weight: 800; color: ${salesA >= salesB ? 'var(--success)' : 'var(--danger)'};">
            ${salesA >= salesB ? `+₹${(salesA - salesB).toLocaleString('en-IN')}` : `-₹${(salesB - salesA).toLocaleString('en-IN')}`}
          </td>
        </tr>
      </tbody>
    </table>`;
}

// Backup Export & Import
async function handleExportBackup() {
  try {
    const jsonStr = await exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sigma_Lures_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exported successfully!');
  } catch (e) {
    showToast('Export failed', 'danger');
  }
}

async function handleImportBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      await importBackupJSON(evt.target.result);
      await loadAllData();
      renderAllViews();
      showToast('Backup data imported successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Import failed', 'danger');
    }
  };
  reader.readAsText(file);
}

function renderCatalogTable() {
  const tbody = document.getElementById('catalog-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.catalog.map(c => `
    <tr>
      <td><strong>${escapeHTML(c.name)}</strong></td>
      <td>${escapeHTML(c.weight)}</td>
      <td style="color: var(--accent);">₹${c.wholesalePrice}</td>
      <td style="color: var(--success);">₹${c.retailPrice || c.wholesalePrice}</td>
    </tr>
  `).join('');
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
