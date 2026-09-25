/* =========================================================
   Doom Coin Wallet — ব্রাউজার-ভিত্তিক, প্রাইভেট কী লোকাল
   ⚠️ এটি একটি ডেমো। প্রোডাকশনে bitcoinjs-lib ব্যবহার করুন।
   ========================================================= */

const WALLET_KEY = 'doom_wallet';

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

const BIP39_WORDS = [
  'doom','fire','chain','shadow','blade','nether','dark','forged','ember','ash',
  'crypt','iron','bolt','storm','rune','glory','void','flame','slate','oath',
  'stone','heart','spark','shield','oath','realm','fall','rise','brood','frost'
];

function makeSeedPhrase() {
  const words = [];
  for (let i = 0; i < 12; i++) {
    words.push(BIP39_WORDS[Math.floor(Math.random() * BIP39_WORDS.length)]);
  }
  return words.join(' ');
}

function makeDoomAddress(privKey) {
  // আসল প্রোডাকশনে: base58check + ripemd160(sha256(pubkey))
  const short = privKey.slice(0, 30).toUpperCase();
  return 'DOOM' + short;
}

async function createWallet() {
  const entropy = randomHex(32);
  const privKey = await sha256('DOOM_PRIV_' + entropy);
  const pubKey = await sha256('DOOM_PUB_' + privKey);
  const address = makeDoomAddress(pubKey);
  const seed = makeSeedPhrase();
  return {
    address,
    publicKey: pubKey,
    privateKey: privKey,
    seedPhrase: seed,
    createdAt: Date.now(),
    balance: 0,
    pending: 0,
    transactions: []
  };
}

async function loadWallet() {
  const raw = localStorage.getItem(WALLET_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveWallet(w) {
  localStorage.setItem(WALLET_KEY, JSON.stringify(w));
}

async function initOrCreateWallet() {
  let w = await loadWallet();
  if (!w) {
    w = await createWallet();
    saveWallet(w);
    toast('নতুন ওয়ালেট তৈরি হয়েছে 🔥', 'success');
  }
  return w;
}

/* ============ UI Actions ============ */
async function backupWallet() {
  const w = await loadWallet();
  if (!w) return;
  const text =
    `🔥 DOOM COIN WALLET BACKUP 🔥\n\n` +
    `ঠিকানা: ${w.address}\n\n` +
    `সিড ফ্রেজ (১২ শব্দ):\n${w.seedPhrase}\n\n` +
    `প্রাইভেট কী:\n${w.privateKey}\n\n` +
    `⚠️ এই ডেটা কোথাও নিরাপদে লিখে রাখুন। কাউকে দেবেন না।\n` +
    `তৈরি: ${new Date(w.createdAt).toLocaleString()}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `doomcoin-backup-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('ব্যাকআপ ডাউনলোড হয়েছে', 'success');
}

async function showRecovery() {
  const phrase = prompt('আপনার ১২ শব্দের সিড ফ্রেজ দিন:');
  if (!phrase) return;
  const words = phrase.trim().split(/\s+/);
  if (words.length !== 12) return toast('১২ শব্দ হতে হবে', 'error');
  toast('✅ সিড ফ্রেজ বৈধ দেখাচ্ছে (ডেমো যাচাই)', 'success');
}

function lockWallet() {
  localStorage.removeItem('doom_wallet');
  toast('🔒 ওয়ালেট লক হয়েছে। রিফ্রেশ করুন।', 'success');
  setTimeout(() => location.reload(), 1200);
}

async function sendCoins() {
  const to = document.getElementById('send-to').value.trim();
  const amt = parseFloat(document.getElementById('send-amount').value);
  const w = await loadWallet();
  if (!w) return toast('ওয়ালেট নেই', 'error');
  if (!to.startsWith('DOOM')) return toast('ঠিকানা DOOM দিয়ে শুরু হতে হবে', 'error');
  if (!amt || amt <= 0) return toast('পরিমাণ সঠিক নয়', 'error');
  if (amt > w.balance) return toast('ব্যালেন্স যথেষ্ট নয়', 'error');

  const fee = 0.0001;
  w.balance -= (amt + fee);
  w.transactions.unshift({
    type: 'out', to, amount: amt, fee, time: Date.now(),
    txid: randomHex(32)
  });
  saveWallet(w);
  refreshWalletUI(w);
  toast(`✅ ${amt} DOOM পাঠানো হয়েছে`, 'success');
  document.getElementById('send-to').value = '';
  document.getElementById('send-amount').value = '';
}

async function exportWallet() {
  const w = await loadWallet();
  if (!w) return;
  const blob = new Blob([JSON.stringify(w, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `doomcoin-wallet-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

async function importWallet() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();
    try {
      const w = JSON.parse(text);
      if (!w.address || !w.privateKey) throw new Error();
      saveWallet(w);
      toast('✅ ওয়ালেট ইমপোর্ট সফল', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch { toast('❌ অবৈধ ফাইল', 'error'); }
  };
  input.click();
}

function resetWallet() {
  if (!confirm('সব ডেটা মুছে যাবে। আপনি কি নিশ্চিত?')) return;
  localStorage.clear();
  location.reload();
}

/* ============ UI Refresh ============ */
function refreshWalletUI(w) {
  if (!w) return;
  document.getElementById('wallet-address').value = w.address;
  document.getElementById('wallet-balance').innerHTML =
    `${w.balance.toFixed(8)} <span>DOOM</span>`;
  document.getElementById('wallet-pending').textContent =
    `অপেক্ষমাণ: ${(w.pending || 0).toFixed(8)}`;
  document.getElementById('wallet-type').textContent = '🔐 লোকাল ওয়ালেট';

  const list = document.getElementById('tx-list');
  if (!w.transactions || w.transactions.length === 0) {
    list.innerHTML = '<div class="empty">কোনো লেনদেন নেই</div>';
  } else {
    list.innerHTML = w.transactions.slice(0, 20).map(tx => `
      <div class="tx-item">
        <div>
          <div>${tx.type === 'out' ? '➡️' : '⬅️'} ${tx.type === 'out' ? tx.to.slice(0, 16) + '…' : 'প্রাপ্ত'}</div>
          <div style="font-size:0.7rem;color:var(--muted)">${new Date(tx.time).toLocaleString()}</div>
        </div>
        <div class="amt ${tx.type === 'out' ? 'out' : ''}">
          ${tx.type === 'out' ? '-' : '+'}${tx.amount} DOOM
        </div>
      </div>
    `).join('');
  }
}
