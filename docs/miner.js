/* =========================================================
   Doom Coin Miner — ব্রাউজার-ভিত্তিক সিমুলেশন (ডেমো)
   ========================================================= */

const Miner = {
  active: false,
  hashrate: 0,
  shares: 0,
  earnings: 0,
  lastBlock: null,
  chartData: [],
  timer: null,
  threads: 2
};

function toggleMining() {
  Miner.active ? stopMining() : startMining();
}

function startMining() {
  Miner.active = true;
  const btn = document.getElementById('mine-toggle');
  btn.textContent = '⏹️ মাইনিং বন্ধ';
  btn.classList.remove('primary');
  btn.classList.add('danger');
  document.getElementById('miner-status').textContent = '✅ চলছে';
  document.getElementById('miner-status').classList.add('active');

  Miner.timer = setInterval(minerTick, 1500);
  toast('⛏️ মাইনিং শুরু হয়েছে', 'success');
}

function stopMining() {
  Miner.active = false;
  clearInterval(Miner.timer);
  const btn = document.getElementById('mine-toggle');
  btn.textContent = '▶️ মাইনিং শুরু';
  btn.classList.remove('danger');
  btn.classList.add('primary');
  document.getElementById('miner-status').textContent = 'বন্ধ';
  document.getElementById('miner-status').classList.remove('active');
  toast('⏹️ মাইনিং বন্ধ', 'success');
}

function minerTick() {
  if (!Miner.active) return;
  const threads = parseInt(document.getElementById('miner-threads').value) || 2;
  Miner.threads = threads;

  // সিমুলেশন: থ্রেড সংখ্যা অনুযায়ী হ্যাশরেট
  const base = threads * (150 + Math.random() * 100);
  Miner.hashrate = Math.floor(base);

  // শেয়ার সামান্য বাড়ে
  if (Math.random() < 0.6) Miner.shares += 1 + Math.floor(Math.random() * threads);
  // আয়ও সামান্য বাড়ে
  Miner.earnings += (threads * 0.000012) * Math.random();

  // মাঝে মাঝে নতুন ব্লক পাই
  if (Math.random() < 0.05) {
    Miner.lastBlock = Date.now();
  }

  updateMinerUI();
  pushChart(Miner.hashrate);
}

function updateMinerUI() {
  document.getElementById('hashrate').textContent = `${Miner.hashrate} H/s`;
  document.getElementById('shares').textContent = Miner.shares;
  document.getElementById('earnings').textContent = `${Miner.earnings.toFixed(6)} DOOM`;
  document.getElementById('last-block').textContent =
    Miner.lastBlock ? new Date(Miner.lastBlock).toLocaleTimeString() : '—';
}

function pushChart(value) {
  Miner.chartData.push(value);
  if (Miner.chartData.length > 60) Miner.chartData.shift();
  drawHashrateChart();
}

function drawHashrateChart() {
  const canvas = document.getElementById('hashrate-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // গ্রিড
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (H / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  if (Miner.chartData.length < 2) return;
  const max = Math.max(...Miner.chartData, 1);
  const stepX = W / (Miner.chartData.length - 1);

  // এরিয়া
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255,184,0,0.35)');
  grad.addColorStop(1, 'rgba(255,184,0,0)');
  ctx.beginPath();
  ctx.moveTo(0, H);
  Miner.chartData.forEach((v, i) => {
    ctx.lineTo(i * stepX, H - (v / max) * (H * 0.85));
  });
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // লাইন
  ctx.beginPath();
  ctx.strokeStyle = '#ffb800';
  ctx.lineWidth = 2;
  Miner.chartData.forEach((v, i) => {
    const x = i * stepX, y = H - (v / max) * (H * 0.85);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function syncMinerAddress() {
  loadWallet().then(w => {
    if (w) document.getElementById('miner-address').value = w.address;
  });
}
