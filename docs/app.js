/* =========================================================
   Doom Coin Dashboard Controller
   ========================================================= */

// ⚠️ আপনার Render URL এখানে বসান
let BOOTSTRAP_URL = localStorage.getItem('doom_bootstrap')
  || 'https://doomcoin-bootstrap.onrender.com';

let RPC_URL = localStorage.getItem('doom_rpc')
  || 'http://localhost:3334';

let REGION = localStorage.getItem('doom_region') || 'any';

/* ============ Navigation ============ */
function startMode(mode) {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  if (mode === 'both') {
    switchTab('wallet');
    setTimeout(() => { if (!Miner.active) startMining(); }, 600);
  } else {
    switchTab(mode === 'miner' ? 'miner' : 'wallet');
  }

  initDashboard();
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === 'tab-' + name));
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => switchTab(t.dataset.tab));
});

/* ============ Dashboard Init ============ */
async function initDashboard() {
  const w = await initOrCreateWallet();
  refreshWalletUI(w);
  syncMinerAddress();

  document.getElementById('bootstrap-url').value = BOOTSTRAP_URL;
  document.getElementById('setting-bootstrap').value = BOOTSTRAP_URL;
  document.getElementById('setting-rpc').value = RPC_URL;
  document.getElementById('setting-region').value = REGION;

  // নেটওয়ার্ক স্ট্যাটাস পোল
  await refreshNetworkStats();
  setInterval(refreshNetworkStats, 15000);

  // লাইভ ব্লক হিসাব (ডেমো)
  setInterval(() => {
    const h = parseInt(document.getElementById('stat-height').textContent) || 0;
    document.getElementById('stat-height').textContent = h + 1;
    document.getElementById('node-height').textContent = h + 1;
  }, 12000);
}

/* ============ Network Stats ============ */
async function refreshNetworkStats() {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BOOTSTRAP_URL}/stats`, { cache: 'no-store' });
    const data = await res.json();
    const latency = Math.round(performance.now() - t0);
    document.getElementById('stat-nodes').textContent = data.total_nodes || 0;
    document.getElementById('node-count') && (document.getElementById('node-count').textContent = data.total_nodes || 0);
    document.getElementById('stat-peers').textContent = Math.min(data.total_nodes || 0, 8);
    document.getElementById('peer-count').textContent = Math.min(data.total_nodes || 0, 8);
    document.getElementById('latency').textContent = latency + 'ms';
    setStatus(true);
  } catch (e) {
    setStatus(false);
  }
}

function setStatus(ok) {
  const pill = document.getElementById('net-status');
  if (ok) {
    pill.textContent = '🟢 অনলাইন';
    pill.classList.add('online');
  } else {
    pill.textContent = '🔴 অফলাইন';
    pill.classList.remove('online');
  }
}

/* ============ Node Connect ============ */
async function connectNode() {
  try {
    const res = await fetch(`${BOOTSTRAP_URL}/bootstrap?region=${REGION}`);
    const data = await res.json();
    const peers = data.peers || [];
    document.getElementById('bootstrap-status').textContent = `${peers.length}টি পিয়ার`;
    document.getElementById('peer-count').textContent = peers.length;
    toast(`✅ ${peers.length}টি নোডের সাথে কানেক্টেড`, 'success');
    console.log('Peers:', peers);
  } catch (e) {
    document.getElementById('bootstrap-status').textContent = 'ব্যর্থ';
    toast('❌ বুটস্ট্র্যাপে কানেক্ট করা যায়নি', 'error');
  }
}

/* ============ Node Register ============ */
async function registerNode() {
  const ip = document.getElementById('node-ip').value.trim();
  const region = document.getElementById('node-region').value.trim() || 'unknown';
  if (!ip) return toast('IP দিন', 'error');
  try {
    const res = await fetch(`${BOOTSTRAP_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port: 3333, region })
    });
    const data = await res.json();
    if (data.ok) toast(`✅ রেজিস্টার সফল (মোট ${data.total})`, 'success');
    else toast('❌ রেজিস্ট্রেশন ব্যর্থ', 'error');
  } catch {
    toast('❌ সার্ভারে সমস্যা', 'error');
  }
}

/* ============ Settings ============ */
function saveSettings() {
  BOOTSTRAP_URL = document.getElementById('setting-bootstrap').value.trim();
  RPC_URL = document.getElementById('setting-rpc').value.trim();
  REGION = document.getElementById('setting-region').value;
  localStorage.setItem('doom_bootstrap', BOOTSTRAP_URL);
  localStorage.setItem('doom_rpc', RPC_URL);
  localStorage.setItem('doom_region', REGION);
  document.getElementById('bootstrap-url').value = BOOTSTRAP_URL;
  toast('💾 সেটিংস সেভ হয়েছে', 'success');
  refreshNetworkStats();
}

/* ============ Utils ============ */
function copyText(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.value || el.textContent || '')
    .then(() => toast('📋 কপি হয়েছে', 'success'))
    .catch(() => toast('❌ কপি ব্যর্থ', 'error'));
}

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast ' + type, 2600);
}

/* ============ Auto-connect on load ============ */
window.addEventListener('load', () => {
  document.getElementById('send-amount').addEventListener('input', (e) => {
    const amt = parseFloat(e.target.value) || 0;
    document.getElementById('send-total').textContent =
      `মোট: ${(amt + 0.0001).toFixed(4)} DOOM`;
  });
});
