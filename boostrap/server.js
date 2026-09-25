/* =========================================================
   Doom Coin Bootstrap Server 🚗
   নতুন নোডকে নেটওয়ার্কে পৌঁছে দেয়
   ========================================================= */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const SEEDS_FILE = path.join(__dirname, 'seeds.json');
const SEEDS_GITHUB_RAW = process.env.SEEDS_GITHUB_RAW || '';

app.use(express.json({ limit: '100kb' }));

// CORS — GitHub Pages থেকে কল করার জন্য জরুরি
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- Helpers ----------
function loadSeeds() {
  try { return JSON.parse(fs.readFileSync(SEEDS_FILE, 'utf8')); }
  catch { return { network: 'doomcoin-mainnet', updated: '', seeds: [] }; }
}

function saveSeeds(data) {
  data.updated = new Date().toISOString();
  try { fs.writeFileSync(SEEDS_FILE, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('Save failed:', e.message); }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Routes ----------

// হেলথ চেক (Render এর জন্য)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'doomcoin-bootstrap', time: Date.now() });
});

// 🚗 নতুন নোড এখানে কল করে ঠিকানা নেয়
app.get('/bootstrap', (req, res) => {
  const data = loadSeeds();
  const region = (req.query.region || 'any').toLowerCase();
  let seeds = data.seeds;

  if (region !== 'any') {
    const local = seeds.filter(s => (s.region || '').toLowerCase() === region);
    if (local.length >= 3) seeds = local;
  }

  const peers = shuffle(seeds).slice(0, 8).map(s => ({
    ip: s.ip, port: s.port, region: s.region
  }));

  res.json({
    network: data.network,
    peers,
    total: data.seeds.length,
    timestamp: Date.now()
  });
});

// 📝 নতুন নোড নিজে রেজিস্টার করে
app.post('/register', (req, res) => {
  const { ip, port, region, address } = req.body || {};
  if (!ip || !port) return res.status(400).json({ error: 'ip and port required' });

  const data = loadSeeds();
  const exists = data.seeds.find(s => s.ip === ip && s.port === port);
  if (!exists) {
    data.seeds.push({
      ip,
      port: parseInt(port),
      region: (region || 'unknown').toLowerCase(),
      address: address || null,
      joined: new Date().toISOString()
    });
    saveSeeds(data);
  }
  res.json({ ok: true, total: data.seeds.length });
});

// 🗑️ রেজিস্ট্রেশন বাতিল (নোড বন্ধ হলে)
app.post('/unregister', (req, res) => {
  const { ip, port } = req.body || {};
  if (!ip || !port) return res.status(400).json({ error: 'ip and port required' });
  const data = loadSeeds();
  const before = data.seeds.length;
  data.seeds = data.seeds.filter(s => !(s.ip === ip && s.port === parseInt(port)));
  saveSeeds(data);
  res.json({ ok: true, removed: before - data.seeds.length });
});

// 📊 নেটওয়ার্ক স্ট্যাটাস
app.get('/stats', (req, res) => {
  const data = loadSeeds();
  const regions = {};
  data.seeds.forEach(s => {
    const r = s.region || 'unknown';
    regions[r] = (regions[r] || 0) + 1;
  });
  res.json({
    network: data.network,
    total_nodes: data.seeds.length,
    regions,
    last_updated: data.updated,
    seeds: data.seeds
  });
});

// 🌐 রুট
app.get('/', (req, res) => {
  const data = loadSeeds();
  res.json({
    name: 'Doom Coin Bootstrap',
    network: data.network,
    active_nodes: data.seeds.length,
    endpoints: {
      bootstrap: 'GET /bootstrap?region=india',
      register: 'POST /register {ip,port,region}',
      unregister: 'POST /unregister {ip,port}',
      stats: 'GET /stats',
      health: 'GET /health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚗 Doom Coin Bootstrap চলছে পোর্ট ${PORT}-এ`);
});
