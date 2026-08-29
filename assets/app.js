// BESTWALLET single-file app (assets/app.js)
// Features: SPA routing, localStorage persistence, QR code receive, Chart.js portfolio chart,
// safe DOM rendering for assets/transactions/staking, send/receive/trade mock flows, admin mode.

// --- Configuration & Defaults ---
const STORAGE_KEY = 'bestwallet_state_v1';

const defaultState = {
  settings: {
    fiat: 'USD',
    showAdmin: false,
    priceAlerts: true,
    txAlerts: true,
  },
  wallet: {
    address: '3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy',
    assets: [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', amount: 0.5432, price: 42500, icon: '₿' },
      { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', amount: 5.2341, price: 2350, icon: '⟠' },
      { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', amount: 15.5, price: 95, icon: 'Ł' },
      { id: 'ripple', name: 'XRP', symbol: 'XRP', amount: 1000, price: 2.45, icon: '✕' },
      { id: 'cardano', name: 'Cardano', symbol: 'ADA', amount: 500, price: 0.75, icon: '₳' },
    ],
    transactions: [
      { id: Date.now()-500000, type: 'Sent', amount: '-0.15 BTC', value: '-$6,375', date: '2 hours ago', status: 'completed', icon: 'fa-arrow-up' },
      { id: Date.now()-400000, type: 'Received', amount: '+2.5 ETH', value: '+$5,875', date: '1 day ago', status: 'completed', icon: 'fa-arrow-down' },
    ],
    staking: [
      { id: 'ethereum', name: 'Ethereum Staking', symbol: 'ETH', apy: '5.2%', min: '0.1 ETH', earned: '0.125 ETH' },
      { id: 'cardano', name: 'Cardano Staking', symbol: 'ADA', apy: '4.8%', min: '1 ADA', earned: '24 ADA' },
    ]
  },
  markets: [], // mock market data
};

// --- State Management ---
let state = loadState();
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse state, using defaults', e);
  }
  // deep clone default to avoid accidental mutation of constant
  return JSON.parse(JSON.stringify(defaultState));
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Utilities ---
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.substring(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function showAlert(message, type = 'success') {
  const container = document.getElementById('alertContainer') || document.body;
  const alert = el('div', { class: `alert alert-${type}`, role: 'alert', 'aria-live': type === 'error' ? 'assertive' : 'polite' },
    el('i', { class: `fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`, 'aria-hidden': 'true' }),
    el('span', {}, ' ' + message)
  );
  // ensure alert container exists
  if (!document.getElementById('alertContainer')) {
    const main = document.querySelector('main') || document.body;
    const wrapper = el('div', { id: 'alertContainer' });
    main.prepend(wrapper);
  }
  document.getElementById('alertContainer').appendChild(alert);
  setTimeout(() => alert.remove(), 3500);
}

// Clipboard helper with fallback
async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      showAlert('Address copied to clipboard!', 'success');
      return true;
    } catch (err) {
      console.warn('Clipboard API failed', err);
    }
  }
  // fallback: create temporary textarea
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showAlert('Address copied to clipboard!', 'success');
    return true;
  } catch (err) {
    showAlert('Unable to copy address', 'error');
    return false;
  }
}

// --- Routing & UI Shell ---
const routes = {
  home: renderHome,
  assets: renderAssets,
  transactions: renderTransactions,
  staking: renderStaking,
  trade_buy: () => renderTrade('buy'),
  trade_sell: () => renderTrade('sell'),
  trade_swap: () => renderTrade('swap'),
  wallet: renderWalletManagement,
  profile: renderProfile,
  admin: renderAdmin,
  market: renderMarket,
  web3: renderWeb3,
  security: renderSecurity,
};

function initRouting() {
  // wire sidebar buttons with data-route attributes
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const route = btn.getAttribute('data-route');
      navigate(route);
    });
  });
  // default
  const initial = 'home';
  navigate(location.hash.replace('#', '') || initial);
  window.addEventListener('hashchange', () => {
    navigate(location.hash.replace('#', '') || 'home');
  });
}

function navigate(route) {
  if (!route) route = 'home';
  location.hash = route;
  // call renderer
  const fn = routes[route] || routes['home'];
  fn();
  updateActiveNav(route);
}

// highlight active nav item
function updateActiveNav(route) {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-route') === route);
  });
  // also ensure tabs (if any) are toggled by route
}

// --- Main Renderers ---
function renderHome() {
  const content = document.querySelector('main');
  content.innerHTML = '';
  const dashboard = el('section', { class: 'dashboard' },
    el('div', { class: 'balance-card' },
      el('div', { class: 'balance-label' }, 'Total Balance'),
      el('div', { id: 'totalBalance', class: 'balance-amount' }, '$0.00'),
      el('div', { class: 'balance-info' },
        el('div', { class: 'balance-stat' }, el('span', {}, '24h Change'), el('span', { id: 'change24h', class: 'positive' }, '+$0.00')),
        el('div', { class: 'balance-stat' }, el('span', {}, "Today's Profit"), el('span', { id: 'profit', class: 'positive' }, '+0%')),
        el('div', { class: 'balance-stat' }, el('span', {}, 'Total Transactions'), el('span', { id: 'txCount' }, String(state.wallet.transactions.length)))
      ),
      el('div', { style: 'margin-top:1.5rem; display:flex; gap:1rem;' },
        el('button', { class: 'btn-primary', onclick: openSendModal, style: 'flex:1;' }, el('i', { class: 'fas fa-arrow-up' }), ' Send'),
        el('button', { class: 'btn-primary', onclick: openReceiveModal, style: 'flex:1;' }, el('i', { class: 'fas fa-arrow-down' }), ' Receive')
      )
    ),
    el('div', { class: 'chart-placeholder' },
      // ensure canvas exists for Chart.js
      el('canvas', { id: 'portfolioChart', width: 400, height: 200 })
    )
  );
  content.appendChild(dashboard);

  // Quick actions, Market panel, Alerts (simpler placeholders)
  const grid = el('section', { style: 'margin-top:1.5rem; display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;' },
    el('div', { class: 'asset-card' },
      el('h3', {}, 'Quick Actions'),
      el('div', { style: 'display:flex; gap:0.75rem; margin-top:1rem;' },
        el('button', { class: 'btn-primary', onclick: () => navigate('assets') }, 'Assets'),
        el('button', { class: 'btn-primary', onclick: openSendModal }, 'Send'),
        el('button', { class: 'btn-primary', onclick: () => navigate('trade_buy') }, 'Buy')
      )
    ),
    el('div', { class: 'asset-card' },
      el('h3', {}, 'Markets'),
      el('div', { id: 'marketList' }, 'Loading market data...')
    )
  );
  content.appendChild(grid);

  updateBalanceUI();
  renderMarketData();
  renderPortfolioChart();
}

function renderAssets() {
  const content = document.querySelector('main');
  content.innerHTML = '';
  const wrap = el('div', {},
    el('h2', {}, 'Assets'),
    el('div', { style: 'margin:1rem 0; display:flex; gap:0.5rem; align-items:center;' },
      el('input', { id: 'assetSearch', type: 'search', placeholder: 'Search assets...' , style: 'flex:1; padding:0.5rem; border-radius:8px;'}),
      el('select', { id: 'assetSort'}, 
        el('option', { value: 'value_desc' }, 'Value: High → Low'),
        el('option', { value: 'value_asc' }, 'Value: Low → High'),
        el('option', { value: 'symbol' }, 'Symbol')
      )
    ),
    el('div', { id: 'assetsGrid', class: 'assets-grid' })
  );
  content.appendChild(wrap);

  // wire search/sort
  document.getElementById('assetSearch').addEventListener('input', () => renderAssetsGrid());
  document.getElementById('assetSort').addEventListener('change', () => renderAssetsGrid());
  renderAssetsGrid();
}

function renderAssetsGrid() {
  const container = document.getElementById('assetsGrid');
  container.innerHTML = '';
  const q = (document.getElementById('assetSearch')?.value || '').toLowerCase();
  const sort = document.getElementById('assetSort')?.value || 'value_desc';
  let assets = [...state.wallet.assets];
  // compute value
  assets.forEach(a => a._value = a.amount * (Number(a.price) || 0));
  // filter
  if (q) assets = assets.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
  // sort
  assets.sort((a,b) => {
    if (sort === 'value_desc') return b._value - a._value;
    if (sort === 'value_asc') return a._value - b._value;
    if (sort === 'symbol') return a.symbol.localeCompare(b.symbol);
    return 0;
  });
  // render each with DOM-safe creation
  assets.forEach(asset => {
    const card = el('div', { class: 'asset-card' },
      el('div', { class: 'asset-info' },
        el('div', { class: 'asset-icon' }, asset.icon),
        el('div', { class: 'asset-details' },
          el('h3', {}, asset.name),
          el('p', {}, `${asset.amount} ${asset.symbol}`)
        )
      ),
      el('div', { class: 'asset-value' },
        el('div', { class: 'amount' }, `$${asset._value.toLocaleString('en-US', {minimumFractionDigits:2})}`),
        el('div', { class: 'change positive' }, '+0.0%') // mock change for now
      )
    );
    container.appendChild(card);
  });
}

function renderTransactions() {
  const content = document.querySelector('main');
  content.innerHTML = '';
  const wrap = el('div', {},
    el('h2', {}, 'Activity — Transactions'),
    el('div', { style: 'margin:1rem 0; display:flex; gap:0.5rem; align-items:center;' },
      el('select', { id: 'txFilter' },
        el('option', { value: 'all' }, 'All'),
        el('option', { value: 'sent' }, 'Sent'),
        el('option', { value: 'received' }, 'Received')
      ),
      el('input', { id: 'txSearch', type: 'search', placeholder: 'Search transactions...' })
    ),
    el('div', { id: 'txList', class: 'transaction-list' })
  );
  content.appendChild(wrap);

  document.getElementById('txFilter').addEventListener('change', renderTxList);
  document.getElementById('txSearch').addEventListener('input', renderTxList);

  renderTxList();
}

function renderTxList() {
  const container = document.getElementById('txList');
  container.innerHTML = '';
  const filter = (document.getElementById('txFilter')?.value || 'all');
  const q = (document.getElementById('txSearch')?.value || '').toLowerCase();

  let txs = [...state.wallet.transactions];
  if (filter === 'sent') txs = txs.filter(t => t.type.toLowerCase() === 'sent');
  if (filter === 'received') txs = txs.filter(t => t.type.toLowerCase() === 'received');
  if (q) txs = txs.filter(t => (t.amount + ' ' + t.value + ' ' + t.date).toLowerCase().includes(q));

  txs.forEach(tx => {
    const item = el('div', { class: 'transaction-item' },
      el('div', { class: `transaction-icon ${tx.type === 'Sent' ? 'sent' : 'received'}` },
        el('i', { class: `fas ${tx.icon}` })
      ),
      el('div', { class: 'transaction-details' },
        el('div', { class: 'transaction-type' }, tx.type),
        el('div', { class: 'transaction-time' }, tx.date)
      ),
      el('div', { class: 'transaction-amount' },
        el('div', { class: 'amount' }, tx.amount),
        el('div', { class: 'status' }, tx.value)
      )
    );
    container.appendChild(item);
  });
}

function renderStaking() {
  const content = document.querySelector('main');
  content.innerHTML = '';
  const wrap = el('div', {},
    el('h2', {}, 'Earn — Staking'),
    el('div', { id: 'stakingGrid', class: 'assets-grid' })
  );
  content.appendChild(wrap);

  const container = document.getElementById('stakingGrid');
  container.innerHTML = '';
  state.wallet.staking.forEach(stake => {
    const card = el('div', { class: 'asset-card' },
      el('div', { class: 'asset-info' },
        el('div', { class: 'asset-icon' }, el('i', { class: 'fas fa-lock' })),
        el('div', { class: 'asset-details' }, el('h3', {}, stake.name), el('p', {}, `APY: ${stake.apy}`))
      ),
      el('div', { class: 'asset-value' },
        el('div', { class: 'amount', style: 'color:var(--success);' }, `+${stake.earned}`),
        el('button', { class: 'btn-primary btn-small', onclick: () => stakeAction(stake.id) }, 'Stake')
      )
    );
    container.appendChild(card);
  });
}

function renderWalletManagement() {
  const content = document.querySelector('main');
  content.innerHTML = '';
  const wrap = el('div', {},
    el('h2', {}, 'Wallet Management'),
    el('p', {}, 'Export/import keys and wallet backup (client-only stub)'),
    el('button', { class: 'btn-secondary', onclick: exportBackup }, 'Export Backup'),
    el('button', { class: 'btn-secondary', onclick: importBackup }, 'Import Backup')
  );
  content.appendChild(wrap);
}

function renderTrade(mode='buy') {
  const content = document.querySelector('main');
  content.innerHTML = '';
  const wrap = el('div', {},
    el('h2', {}, `Trade — ${mode[0].toUpperCase() + mode.slice(1)}`),
    el('form', { id: 'tradeForm', onsubmit: (e) => handleTrade(e, mode) },
      el('div', { class: 'form-group' },
        el('label', {}, 'Select Asset'),
        el('select', { id: 'tradeAsset' }, ...state.wallet.assets.map(a => el('option', { value: a.id }, `${a.name} (${a.symbol})`)))
      ),
      el('div', { class: 'form-group' },
        el('label', {}, 'Amount'),
        el('input', { id: 'tradeAmount', type: 'number', step: '0.00000001', required: true })
      ),
      el('button', { class: 'btn-primary', type: 'submit' }, mode === 'buy' ? 'Buy' : mode === 'sell' ? 'Sell' : 'Swap')
    )
  );
  content.appendChild(wrap);
}

function renderMarket() {
  const content = document.querySelector('main');
  content.innerHTML = '<h2>Market</h2><div id=\"marketList\">Market data will appear here.</div>';
  renderMarketData();
}
function renderWeb3() {
  const content = document.querySelector('main');
  content.innerHTML = '<h2>Web3</h2><p>dApps, NFTs and DeFi integration points (stubs)</p>';
}
function renderProfile() {
  const content = document.querySelector('main');
  content.innerHTML = '<h2>Profile & Settings</h2><p>Account settings and support.</p>';
}
function renderSecurity() {
  const content = document.querySelector('main');
  content.innerHTML = '<h2>Security</h2><p>Authentication and protection settings.</p>';
}

function renderAdmin() {
  if (!state.settings.showAdmin) {
    showAlert('Admin mode is disabled', 'error');
    return;
  }
  const content = document.querySelector('main');
  content.innerHTML = '';
  content.appendChild(el('h2', {}, 'Admin Panel (client-side only)'));
  // Simple users table stub
  const users = [
    { id: 1, name: 'Alice', role: 'user' },
    { id: 2, name: 'Bob', role: 'admin' }
  ];
  const table = el('table', { style: 'width:100%; margin-top:1rem; border-collapse:collapse;' },
    el('thead', {}, el('tr', {}, el('th', {}, 'ID'), el('th', {}, 'Name'), el('th', {}, 'Role'))),
    el('tbody', {}, ...users.map(u => el('tr', {}, el('td', {}, String(u.id)), el('td', {}, u.name), el('td', {}, u.role))))
  );
  content.appendChild(table);
}

// --- Actions / Flows ---
function updateBalanceUI() {
  const total = state.wallet.assets.reduce((s,a)=> s + (a.amount * Number(a.price || 0)), 0);
  const totalEl = document.getElementById('totalBalance');
  if (totalEl) totalEl.textContent = '$' + total.toLocaleString('en-US',{minimumFractionDigits:2});
  const change24hEl = document.getElementById('change24h');
  if (change24hEl) {
    const change = (Math.random() * 2000 - 1000).toFixed(2);
    change24hEl.textContent = (change >= 0 ? '+' : '') + '$' + Math.abs(Number(change)).toFixed(2);
    change24hEl.className = change >= 0 ? 'positive' : 'negative';
  }
  const txCountEl = document.getElementById('txCount');
  if (txCountEl) txCountEl.textContent = String(state.wallet.transactions.length);
}

function renderMarketData() {
  const markets = [
    { symbol: 'BTC', price: 42500, change: '+1.2%' },
    { symbol: 'ETH', price: 2350, change: '-0.5%' },
    { symbol: 'ADA', price: 0.75, change: '+3.1%' },
  ];
  state.markets = markets;
  const elMarket = document.getElementById('marketList');
  if (!elMarket) return;
  elMarket.innerHTML = '';
  markets.forEach(m => {
    const row = el('div', { style: 'display:flex; justify-content:space-between; padding:0.25rem 0; border-bottom:1px solid rgba(255,255,255,0.03);' },
      el('div', {}, `${m.symbol}`),
      el('div', {}, `$${m.price} ${m.change}`)
    );
    elMarket.appendChild(row);
  });
}

// --- Send / Receive modals ---
// These rely on existing modal HTML elements in index.html
function openSendModal() {
  const modal = document.getElementById('sendModal');
  if (!modal) {
    showAlert('Send modal not found in DOM', 'error');
    return;
  }
  modal.classList.add('active');
  const first = modal.querySelector('#sendCrypto') || modal.querySelector('input,select,button');
  if (first) first.focus();
}
function closeSendModal() {
  const modal = document.getElementById('sendModal');
  if (modal) modal.classList.remove('active');
  const amount = document.getElementById('sendAmount');
  const addr = document.getElementById('sendAddress');
  if (amount) amount.value = '';
  if (addr) addr.value = '';
}
function openReceiveModal() {
  const modal = document.getElementById('receiveModal');
  if (!modal) {
    showAlert('Receive modal not found in DOM', 'error');
    return;
  }
  modal.classList.add('active');
  const first = modal.querySelector('#receiveCrypto') || modal.querySelector('input,select,button');
  if (first) first.focus();
  updateReceiveQRCode();
}
function closeReceiveModal() {
  const modal = document.getElementById('receiveModal');
  if (modal) modal.classList.remove('active');
}

async function handleSend(e) {
  e.preventDefault();
  const crypto = document.getElementById('sendCrypto')?.value;
  const address = document.getElementById('sendAddress')?.value;
  const amountStr = document.getElementById('sendAmount')?.value;
  const amount = parseFloat(amountStr);
  if (!crypto || !address || !amount || isNaN(amount) || amount <= 0) {
    showAlert('Please fill all send fields with valid values', 'error');
    return;
  }
  // mock: add transaction
  const tx = {
    id: Date.now(),
    type: 'Sent',
    amount: `-${amount} ${crypto.toUpperCase()}`,
    value: `-$${(amount * 1000).toFixed(2)}`,
    date: 'Just now',
    status: 'completed',
    icon: 'fa-arrow-up'
  };
  state.wallet.transactions.unshift(tx);
  saveState();
  showAlert(`Sent ${amount} ${crypto.toUpperCase()}`, 'success');
  closeSendModal();
  // if on transactions page, refresh list
  if (location.hash.replace('#','') === 'transactions') renderTxList();
  updateBalanceUI();
}

function handleReceive(e) {
  e.preventDefault();
  const crypto = document.getElementById('receiveCrypto')?.value;
  if (!crypto) {
    showAlert('Choose a cryptocurrency to receive', 'error');
    return;
  }
  showAlert(`Share your ${crypto.toUpperCase()} address to receive funds`, 'success');
}

function copyAddress() {
  const addr = document.getElementById('receiveAddress')?.value || state.wallet.address;
  copyText(addr);
}

function updateReceiveQRCode() {
  const crypto = document.getElementById('receiveCrypto')?.value;
  const address = document.getElementById('receiveAddress')?.value || state.wallet.address;
  const qrEl = document.getElementById('qrCode');
  if (!qrEl) return;
  qrEl.innerHTML = '';
  // QRCode library expected as global "QRCode"
  try {
    // format text as simple protocol string
    const text = `${crypto ? crypto + ':' : ''}${address}`;
    // eslint-disable-next-line no-undef
    new QRCode(qrEl, { text, width: 180, height: 180 });
    showAlert(`QR code updated for ${crypto ? crypto.toUpperCase() : 'address'}`, 'success');
  } catch (err) {
    qrEl.textContent = 'QR unavailable';
    console.warn('QRCode failed', err);
  }
}

// --- Trade handler ---
function handleTrade(e, mode) {
  e.preventDefault();
  const assetId = document.getElementById('tradeAsset')?.value;
  const amount = parseFloat(document.getElementById('tradeAmount')?.value);
  if (!assetId || !amount || isNaN(amount) || amount <= 0) {
    showAlert('Provide a valid trade amount', 'error');
    return;
  }
  // Mock trade: add transaction
  const tx = {
    id: Date.now(),
    type: mode === 'buy' ? 'Received' : 'Sent',
    amount: `${mode === 'buy' ? '+' : '-'}${amount} ${(state.wallet.assets.find(a => a.id===assetId) || {}).symbol || ''}`,
    value: `${mode === 'buy' ? '+' : '-'}$${(amount * 1000).toFixed(2)}`,
    date: 'Just now',
    status: 'completed',
    icon: mode === 'buy' ? 'fa-arrow-down' : 'fa-arrow-up'
  };
  state.wallet.transactions.unshift(tx);
  // update asset amount (mock, naive)
  const asset = state.wallet.assets.find(a => a.id === assetId);
  if (asset) {
    asset.amount = (asset.amount || 0) + (mode === 'buy' ? amount : -amount);
  }
  saveState();
  showAlert(`${mode[0].toUpperCase()+mode.slice(1)} executed (mock)`, 'success');
  navigate('transactions');
  updateBalanceUI();
}

// --- Staking action (stub) ---
function stakeAction(id) {
  showAlert('Stake flow is a stub (client-only)', 'success');
}

// --- Backup / restore ---
function exportBackup() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bestwallet-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showAlert('Backup exported', 'success');
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        state = parsed;
        saveState();
        showAlert('Backup imported', 'success');
        navigate('home');
      } catch (err) {
        showAlert('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// --- Portfolio Chart (Chart.js) ---
let portfolioChart = null;
function renderPortfolioChart() {
  const ctx = document.getElementById('portfolioChart');
  if (!ctx) return;
  const labels = Array.from({length: 12}, (_,i) => `${i+1}h`);
  // mock series: portfolio value with slight variation
  const base = state.wallet.assets.reduce((s,a)=> s + a.amount * Number(a.price || 0), 0);
  const data = labels.map((_,i) => Math.max(0, base + (Math.sin(i/2) * 1000) + (Math.random()*500-250)));
  try {
    if (portfolioChart) portfolioChart.destroy();
    // eslint-disable-next-line no-undef
    portfolioChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Portfolio Value', data, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)', fill: true }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  } catch (err) {
    console.warn('Chart render failed', err);
  }
}

// --- Admin toggle (client-side) ---
function toggleAdminMode() {
  state.settings.showAdmin = !state.settings.showAdmin;
  saveState();
  showAlert(state.settings.showAdmin ? 'Admin mode enabled' : 'Admin mode disabled', 'success');
  // if toggling on, show admin route
  if (state.settings.showAdmin) navigate('admin');
}

// --- Init App: wire up existing DOM controls & handlers ---
function initApp() {
  // attach modal form handlers if present
  const sendForm = document.querySelector('#sendModal form');
  if (sendForm) sendForm.addEventListener('submit', handleSend);
  const receiveForm = document.querySelector('#receiveModal form');
  if (receiveForm) receiveForm.addEventListener('submit', handleReceive);

  // wire bare buttons (copy, open modals) that may exist
  const copyBtn = document.querySelector('#receiveModal button[onclick="copyAddress()"]');
  if (copyBtn) copyBtn.addEventListener('click', copyAddress);
  const receiveSelect = document.getElementById('receiveCrypto');
  if (receiveSelect) receiveSelect.addEventListener('change', updateReceiveQRCode);

  // wire admin toggle in settings modal if exists
  const adminToggle = document.getElementById('toggleAdminMode');
  if (adminToggle) adminToggle.addEventListener('click', toggleAdminMode);

  // initialize routing and UI
  initRouting();

  // wire global modal close on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });

  // When the DOM first loads, refresh the UI from state
  updateBalanceUI();
}

// run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
  // also initial render
  navigate(location.hash.replace('#','') || 'home');
}
