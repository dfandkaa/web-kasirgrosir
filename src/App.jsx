/*
  Skema database (SQL) TIDAK berubah. Pakai file supabase-schema.sql yang sudah Anda jalankan.
  Hapus transaksi + pengembalian stok memakai kebijakan RLS Pemilik yang sudah ada.

  Paket yang perlu dipasang:
    npm install @supabase/supabase-js xlsx @capacitor/core @capacitor/filesystem @capacitor/share
    npx cap sync android
*/
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  LayoutDashboard, ShoppingCart, Package, Wallet, History, Search, Plus, Minus, Trash2,
  Pencil, X, Printer, ScanBarcode, AlertTriangle, TrendingUp, Banknote, QrCode, Landmark,
  Store, Check, Boxes, Receipt, ShoppingBag, Tag, Settings, Download, Upload, FileSpreadsheet,
  Database, RotateCcw, ShieldCheck, LogOut, Cloud, CloudOff, KeyRound, Mail, UserRound, Loader2,
  Sun, Moon, MessageCircle, Trophy, Target,
} from 'lucide-react';

/* ============================== KONFIGURASI SUPABASE ============================== */
const SUPABASE_URL = 'https://xedhahazezgafvhmxmpv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mvKoTPob7HmyBQ4ucGTYAA_kYDNB8PK';
const CLOUD_ON =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL.trim()) &&
  SUPABASE_ANON_KEY.trim().length > 20 &&
  !SUPABASE_ANON_KEY.includes('YOUR_');
const supabase = CLOUD_ON ? createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim()) : null;
const CASHIER_TABS = ['pos', 'history'];

/* ============================== KONSTANTA & HELPER ============================== */
const STORE = { name: 'Toko Gemilang Jaya', addr: 'Jl. Marelan Raya No.02B, Paya Pasir, Kec. Medan Marelan, Kota Medan, Sumatera Utara 20255', tel: '0823-6008-6083' };
const CATS = ['Sembako', 'Minuman', 'Rokok', 'Bumbu', 'Sabun', 'Snack', 'Lainnya'];
const UNITS = ['Pcs', 'Dus', 'Pack', 'Sak'];
const EXP_CATS = ['Gaji Karyawan', 'Tagihan Listrik', 'Sewa Tempat', 'Transportasi', 'Kantong Plastik', 'Lain-lain'];
const METHODS = [
  { id: 'Tunai', icon: Banknote },
  { id: 'QRIS', icon: QrCode },
  { id: 'Transfer Bank', icon: Landmark },
];
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'Kasir (POS)', icon: ShoppingCart },
  { id: 'products', label: 'Produk & Stok', icon: Package },
  { id: 'expenses', label: 'Pengeluaran', icon: Wallet },
  { id: 'history', label: 'Riwayat Transaksi', icon: History },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];
const RANGE_LABEL = { 1: 'Hari ini', 7: '7 hari terakhir', 30: '30 hari terakhir', 0: 'Semua data' };

const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const n0 = (v) => Number(v) || 0;
const uid = () => Math.random().toString(36).slice(2, 9);
const dayAgo = (d, h = 10) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(h, 15, 0, 0);
  return x.toISOString();
};
const dateKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDT = (iso) =>
  new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtD = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

/* Smart auto-pricing: harga grosir otomatis aktif bila qty >= min qty grosir */
const isWs = (p, q) => p.wholesale > 0 && p.wholesale < p.retail && p.minQty > 0 && q >= p.minQty;
const toItems = (lines, prods) =>
  lines
    .map((l) => {
      const p = prods.find((x) => x.id === l.id);
      if (!p) return null;
      const ws = isWs(p, l.qty);
      return { id: p.id, sku: p.sku, name: p.name, unit: p.unit, qty: l.qty, price: ws ? p.wholesale : p.retail, retail: p.retail, cost: p.cost, ws };
    })
    .filter(Boolean);
const calc = (items, discType, discVal) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const v = Number(discVal) || 0;
  const raw = discType === 'percent' ? (subtotal * Math.min(v, 100)) / 100 : Math.min(v, subtotal);
  const discount = Math.round(raw);
  return { subtotal, discount, total: subtotal - discount };
};
const startOfRange = (days) => {
  if (!days) return 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() - (days - 1) * 86400000;
};
const inRange = (list, days) => list.filter((x) => new Date(x.date).getTime() >= startOfRange(days));
const summarize = (txs, exps) => {
  const omset = txs.reduce((s, t) => s + n0(t.total), 0);
  const hpp = txs.reduce((s, t) => s + n0(t.hpp), 0);
  const spend = exps.reduce((s, e) => s + n0(e.amount), 0);
  return { omset, hpp, spend, net: omset - hpp - spend };
};
const normPhone = (s) => {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
};
const waText = (tx) => {
  const lines = tx.items.map((i) => `• ${i.name}\n   ${i.qty} ${i.unit} x ${Math.round(i.price).toLocaleString('id-ID')}${i.ws ? ' (Grosir)' : ''} = ${Math.round(i.price * i.qty).toLocaleString('id-ID')}`);
  return [
    `*${STORE.name}*`, STORE.addr, '',
    `No: ${tx.id}`, `Tgl: ${fmtDT(tx.date)}`, tx.cashier ? `Kasir: ${tx.cashier}` : null, '',
    ...lines, '',
    `Subtotal: ${rp(tx.subtotal)}`,
    tx.discount > 0 ? `Diskon: -${rp(tx.discount)}` : null,
    `*TOTAL: ${rp(tx.total)}*`,
    `Bayar (${tx.method}): ${rp(tx.paid)}`,
    `Kembali: ${rp(tx.change)}`, '',
    'Terima kasih sudah berbelanja! 🙏',
  ].filter((x) => x !== null).join('\n');
};

/* ============================== EXPORT EXCEL (.xlsx) & BACKUP ============================== */
const BACKUP_VERSION = 1;
const stamp = (iso) => {
  const d = new Date(iso);
  return `${dateKey(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
/* Android (Capacitor): tulis ke Cache lalu buka dialog Share native. Web: unduh langsung. */
const shareNativeFile = async (filename, data, encoding, title) => {
  const saved = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, ...(encoding ? { encoding } : {}) });
  await Share.share({ title, text: title, url: saved.uri, dialogTitle: 'Simpan atau kirim file' });
};
const saveTextFile = async (filename, text, mime, title) => {
  if (Capacitor.isNativePlatform()) return shareNativeFile(filename, text, Encoding.UTF8, title);
  downloadBlob(new Blob([text], { type: mime }), filename);
  return undefined;
};
const runExport = async (fn, notify, okMsg) => {
  try {
    await fn();
    notify(okMsg);
  } catch (e) {
    const m = String((e && e.message) || e);
    if (/cancel/i.test(m)) return;
    notify(`Gagal mengekspor: ${m}`, 'err');
  }
};
const addSheet = (wb, name, aoa, widths) => {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = widths.map((w) => ({ wch: w }));
  Object.keys(ws).forEach((k) => {
    if (k[0] !== '!' && ws[k].t === 'n') ws[k].z = '#,##0';
  });
  XLSX.utils.book_append_sheet(wb, ws, name);
};
const buildWorkbook = ({ products, txs, expenses, label }) => {
  const wb = XLSX.utils.book_new();
  const s = summarize(txs, expenses);
  const byMethod = METHODS.map((m) => {
    const l = txs.filter((t) => t.method === m.id);
    return [m.id, l.length, l.reduce((a, t) => a + n0(t.total), 0)];
  });
  addSheet(wb, 'Ringkasan Laporan', [
    [STORE.name], [STORE.addr], ['Periode laporan', label], ['Dibuat pada', stamp(new Date().toISOString())], [],
    ['RINGKASAN KEUANGAN', 'Nilai (Rp)'],
    ['Jumlah transaksi', txs.length],
    ['Total omset', s.omset],
    ['Total HPP (modal barang terjual)', s.hpp],
    ['Laba kotor', s.omset - s.hpp],
    ['Total pengeluaran', s.spend],
    ['Laba bersih', s.net], [],
    ['METODE PEMBAYARAN', 'Jumlah transaksi', 'Total (Rp)'],
    ...byMethod, [],
    ['STOK SAAT INI', 'Nilai'],
    ['Jenis produk', products.length],
    ['Total stok (unit)', products.reduce((a, p) => a + n0(p.stock), 0)],
    ['Nilai stok (modal, Rp)', products.reduce((a, p) => a + n0(p.stock) * n0(p.cost), 0)],
  ], [38, 20, 20]);
  addSheet(wb, 'Riwayat Transaksi', [
    ['No Transaksi', 'Waktu', 'Kasir', 'Barang', 'Total Item', 'Subtotal', 'Diskon', 'Total Bayar', 'HPP', 'Laba Kotor', 'Metode'],
    ...txs.map((t) => [t.id, stamp(t.date), t.cashier || '-', t.items.map((i) => `${i.name} x${i.qty}`).join(', '), t.items.reduce((a, i) => a + i.qty, 0), n0(t.subtotal), n0(t.discount), n0(t.total), n0(t.hpp), n0(t.total) - n0(t.hpp), t.method]),
  ], [20, 17, 16, 50, 11, 14, 12, 14, 14, 14, 16]);
  addSheet(wb, 'Data Produk & Stok', [
    ['Barcode', 'Nama Barang', 'Kategori', 'Satuan', 'Harga Modal', 'Harga Eceran', 'Harga Grosir', 'Min Qty Grosir', 'Stok', 'Batas Menipis', 'Status Stok', 'Nilai Stok (Modal)'],
    ...products.map((p) => [String(p.sku), p.name, p.category, p.unit, n0(p.cost), n0(p.retail), n0(p.wholesale), n0(p.minQty), n0(p.stock), n0(p.lowStock), p.stock <= 0 ? 'Habis' : p.stock <= p.lowStock ? 'Menipis' : 'Aman', n0(p.stock) * n0(p.cost)]),
  ], [18, 32, 12, 9, 13, 13, 13, 14, 9, 13, 12, 17]);
  addSheet(wb, 'Pengeluaran', [
    ['Tanggal', 'Kategori', 'Keterangan', 'Nominal (Rp)'],
    ...expenses.map((e) => [e.date, e.category, e.note, n0(e.amount)]),
    [], ['', '', 'TOTAL', expenses.reduce((a, e) => a + n0(e.amount), 0)],
  ], [14, 20, 40, 16]);
  return wb;
};
const exportExcel = async (data) => {
  const wb = buildWorkbook(data);
  const filename = `laporan-toko-${dateKey(new Date().toISOString())}.xlsx`;
  if (Capacitor.isNativePlatform()) {
    const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    await shareNativeFile(filename, b64, null, 'Laporan Excel ' + STORE.name);
  } else {
    XLSX.writeFile(wb, filename);
  }
};

const validateBackup = (d) => {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return 'Format file tidak valid.';
  if (!Array.isArray(d.products) || !Array.isArray(d.transactions) || !Array.isArray(d.expenses)) return 'File tidak memuat data produk, transaksi, dan pengeluaran.';
  const num = (v) => Number.isFinite(Number(v));
  if (!d.products.every((p) => p && typeof p.id === 'string' && typeof p.sku === 'string' && typeof p.name === 'string' && num(p.cost) && num(p.retail) && num(p.stock))) return 'Data produk pada file rusak atau tidak lengkap.';
  if (!d.transactions.every((t) => t && typeof t.id === 'string' && typeof t.date === 'string' && Array.isArray(t.items) && num(t.total) && num(t.hpp))) return 'Data transaksi pada file rusak atau tidak lengkap.';
  if (!d.expenses.every((e) => e && typeof e.id === 'string' && typeof e.date === 'string' && num(e.amount))) return 'Data pengeluaran pada file rusak atau tidak lengkap.';
  return null;
};

/* ============================== DATA DUMMY AWAL (mode lokal) ============================== */
const SEED_PRODUCTS = [
  { id: 'p1', sku: '8993001000011', name: 'Beras Premium 5kg', category: 'Sembako', unit: 'Sak', cost: 62000, retail: 72000, wholesale: 68000, minQty: 5, stock: 48, lowStock: 10 },
  { id: 'p2', sku: '8999909000022', name: 'Minyak Goreng 2L', category: 'Sembako', unit: 'Pack', cost: 32000, retail: 37000, wholesale: 34500, minQty: 6, stock: 60, lowStock: 12 },
  { id: 'p3', sku: '8991002000033', name: 'Gula Pasir 1kg', category: 'Sembako', unit: 'Pack', cost: 14000, retail: 16500, wholesale: 15200, minQty: 10, stock: 8, lowStock: 15 },
  { id: 'p4', sku: '8992775000044', name: 'Mie Instan Goreng 85g', category: 'Sembako', unit: 'Pcs', cost: 2800, retail: 3500, wholesale: 3150, minQty: 40, stock: 400, lowStock: 80 },
  { id: 'p5', sku: '8996001000055', name: 'Air Mineral 600ml (Dus 24)', category: 'Minuman', unit: 'Dus', cost: 38000, retail: 45000, wholesale: 42000, minQty: 3, stock: 25, lowStock: 6 },
  { id: 'p6', sku: '8991111000066', name: 'Kopi Bubuk Sachet (10 pcs)', category: 'Minuman', unit: 'Pack', cost: 9000, retail: 11500, wholesale: 10300, minQty: 6, stock: 5, lowStock: 10 },
  { id: 'p7', sku: '8998866000077', name: 'Rokok Filter 12 Batang', category: 'Rokok', unit: 'Pack', cost: 24000, retail: 27000, wholesale: 26000, minQty: 10, stock: 70, lowStock: 20 },
  { id: 'p8', sku: '8999999000088', name: 'Kecap Manis 550ml', category: 'Bumbu', unit: 'Pcs', cost: 15500, retail: 18500, wholesale: 17000, minQty: 12, stock: 36, lowStock: 10 },
  { id: 'p9', sku: '8992222000099', name: 'Deterjen Bubuk 800g', category: 'Sabun', unit: 'Pack', cost: 12500, retail: 15000, wholesale: 13800, minQty: 6, stock: 40, lowStock: 10 },
];
const mkTx = (no, days, lines, method, discount = 0, paid) => {
  const items = toItems(lines, SEED_PRODUCTS);
  const c = calc(items, 'nominal', discount);
  const pay = paid ?? c.total;
  return {
    id: `TRX-2026${String(no).padStart(4, '0')}`, date: dayAgo(days, 8 + no), items, ...c, method,
    paid: pay, change: Math.max(pay - c.total, 0), hpp: items.reduce((s, i) => s + i.cost * i.qty, 0),
  };
};
const SEED_TXS = [
  mkTx(1, 0, [{ id: 'p1', qty: 5 }, { id: 'p2', qty: 6 }, { id: 'p4', qty: 40 }], 'Tunai', 0, 800000),
  mkTx(2, 1, [{ id: 'p5', qty: 3 }, { id: 'p7', qty: 10 }, { id: 'p9', qty: 2 }], 'QRIS', 5000),
  mkTx(3, 3, [{ id: 'p3', qty: 10 }, { id: 'p8', qty: 12 }, { id: 'p6', qty: 2 }], 'Transfer Bank'),
];
const SEED_EXP = [
  { id: 'e1', date: dayAgo(2).slice(0, 10), category: 'Tagihan Listrik', note: 'Listrik toko bulan ini', amount: 850000 },
  { id: 'e2', date: dayAgo(1).slice(0, 10), category: 'Transportasi', note: 'Ongkos kirim barang dari distributor', amount: 150000 },
];

/* ============================== HOOK PERSISTENSI & ANIMASI ============================== */
function useLS(key, init) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) return JSON.parse(s);
    } catch (e) { /* abaikan */ }
    return init;
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* abaikan */ }
  }, [key, v]);
  return [v, setV];
}
/* Angka menghitung naik dengan easing */
function useCountUp(target, dur = 800) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const f = from.current;
    let raf;
    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = f + (target - f) * e;
      from.current = cur;
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

/* ============================== PEMETAAN DATABASE & HOOK REALTIME ============================== */
const toNum = (v) => Number(v) || 0;
const productToRow = (p) => ({ id: p.id, sku: p.sku, name: p.name, category: p.category, unit: p.unit, cost: p.cost, retail: p.retail, wholesale: p.wholesale, min_qty: p.minQty, stock: p.stock, low_stock: p.lowStock });
const productFromRow = (r) => ({ id: r.id, sku: r.sku, name: r.name, category: r.category, unit: r.unit, cost: toNum(r.cost), retail: toNum(r.retail), wholesale: toNum(r.wholesale), minQty: toNum(r.min_qty), stock: toNum(r.stock), lowStock: toNum(r.low_stock) });
const txToRow = (t) => ({ id: t.id, date: t.date, items: t.items, subtotal: t.subtotal, discount: t.discount, total: t.total, method: t.method, paid: t.paid, change_amount: t.change, hpp: t.hpp, cashier: t.cashier || null });
const txFromRow = (r) => ({ id: r.id, date: new Date(r.date).toISOString(), items: r.items || [], subtotal: toNum(r.subtotal), discount: toNum(r.discount), total: toNum(r.total), method: r.method, paid: toNum(r.paid), change: toNum(r.change_amount), hpp: toNum(r.hpp), cashier: r.cashier || '' });
const expToRow = (e) => ({ id: e.id, date: e.date, category: e.category, note: e.note || '', amount: e.amount });
const expFromRow = (r) => ({ id: r.id, date: String(r.date).slice(0, 10), category: r.category, note: r.note || '', amount: toNum(r.amount) });

function useTable({ name, lsKey, seed, cloud, toRow, fromRow, orderCol, orderAsc, bus }) {
  const [rows, setRows] = useState(() => {
    try {
      const s = localStorage.getItem(lsKey);
      if (s) return JSON.parse(s);
    } catch (e) { /* abaikan */ }
    return seed;
  });
  const ref = useRef(rows);
  useEffect(() => {
    try { localStorage.setItem(lsKey, JSON.stringify(rows)); } catch (e) { /* abaikan */ }
  }, [lsKey, rows]);

  const applyLocal = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(ref.current) : updater;
    ref.current = next;
    setRows(next);
  }, []);

  const reload = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from(name).select('*').order(orderCol, { ascending: orderAsc });
    if (error) bus.current.onError(`Gagal memuat data ${name}: ${error.message}`);
    else applyLocal(data.map(fromRow));
  }, [name, orderCol, orderAsc, fromRow, applyLocal, bus]);

  const set = useCallback((updater) => {
    const prev = ref.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    applyLocal(next);
    if (!cloud || !supabase) return;
    const prevSig = new Map(prev.map((r) => [r.id, JSON.stringify(toRow(r))]));
    const nextIds = new Set(next.map((r) => r.id));
    const changed = next.filter((r) => prevSig.get(r.id) !== JSON.stringify(toRow(r)));
    const removed = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);
    (async () => {
      let failed = '';
      for (let i = 0; i < changed.length && !failed; i += 200) {
        const { error } = await supabase.from(name).upsert(changed.slice(i, i + 200).map(toRow));
        if (error) failed = error.message;
      }
      for (let i = 0; i < removed.length && !failed; i += 100) {
        const { error } = await supabase.from(name).delete().in('id', removed.slice(i, i + 100));
        if (error) failed = error.message;
      }
      if (failed) {
        bus.current.onError(`Gagal menyimpan ke cloud (${name}): ${failed}`);
        reload();
      }
    })();
  }, [cloud, name, toRow, applyLocal, reload, bus]);

  useEffect(() => {
    if (!cloud || !supabase) return undefined;
    reload();
    const ch = supabase
      .channel(`rt-${name}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: name }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old && payload.old.id;
          if (id) applyLocal((p) => p.filter((r) => r.id !== id));
          return;
        }
        const row = fromRow(payload.new);
        applyLocal((p) => (p.some((r) => r.id === row.id) ? p.map((r) => (r.id === row.id ? row : r)) : [row, ...p]));
      })
      .subscribe((status) => {
        bus.current.onStatus(name, status);
        if (status === 'SUBSCRIBED') reload();
      });
    return () => { supabase.removeChannel(ch); };
  }, [cloud, name, fromRow, reload, applyLocal, bus]);

  return [rows, set, applyLocal];
}

/* ============================== GAYA GLOBAL: ANIMASI, TEMA TERANG, CETAK ============================== */
const GLOBAL_CSS = String.raw`
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.anim-up{animation:fadeUp .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.6)}70%{transform:scale(.9)}100%{transform:scale(1)}}
.anim-pop{animation:pop .45s ease}
@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.anim-modal{animation:modalIn .22s ease-out both}
@keyframes softPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.55)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0)}}
.pulse-soft{animation:softPulse 1.8s ease-in-out infinite}
@keyframes checkDraw{to{stroke-dashoffset:0}}
.check-path{stroke-dasharray:50;stroke-dashoffset:50;animation:checkDraw .5s .3s ease-out forwards}
@keyframes ringGlow{0%{box-shadow:0 0 0 0 rgba(16,185,129,.55)}100%{box-shadow:0 0 0 30px rgba(16,185,129,0)}}
.ring-glow{animation:ringGlow 1.4s ease-out 2}
@keyframes confetti{0%{transform:translate3d(0,0,0) rotate(0);opacity:1}100%{transform:translate3d(var(--dx),var(--dy),0) rotate(var(--rot));opacity:0}}
.confetti-piece{position:absolute;left:50%;top:60px;width:8px;height:12px;border-radius:2px;animation:confetti 1.7s cubic-bezier(.2,.7,.3,1) both}
@keyframes barGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.bar-grow{transform-origin:bottom;animation:barGrow .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.grow-x{transform-origin:left;animation:growX .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes shimmer{from{background-position:0 0}to{background-position:200% 0}}
.shimmer-bar{background-size:200% 100%;animation:shimmer 2.5s linear infinite}
.print-only{display:none}
@media print{
  #root{display:none!important}
  .print-only{display:block!important;margin:0 auto;color:#000;background:#fff}
}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}

.td .app-bg{background:#0b0f17}
.td select option{background:#0f172a;color:#fff}

.tl .app-bg{background:#f1f5f9;color:#0f172a}
.tl select option{background:#fff;color:#0f172a}
.tl .blob{opacity:.45}
.tl .glass{background:#fff;border-color:rgba(15,23,42,.08);box-shadow:0 8px 28px rgba(15,23,42,.08)}
.tl .modal-box{background:rgba(255,255,255,.98);border-color:rgba(15,23,42,.1);box-shadow:0 24px 60px rgba(15,23,42,.18)}
.tl .topbar{background:rgba(241,245,249,.88)}
.tl .text-white{color:#0f172a}
.tl .text-slate-200{color:#1e293b}
.tl .text-slate-300{color:#334155}
.tl .text-slate-400{color:#475569}
.tl .text-slate-500{color:#64748b}
.tl .text-slate-600{color:#94a3b8}
.tl .text-amber-200{color:#92400e}
.tl .text-amber-300,.tl .text-amber-400{color:#b45309}
.tl .text-emerald-200{color:#065f46}
.tl .text-emerald-300,.tl .text-emerald-400{color:#047857}
.tl .text-cyan-200{color:#155e75}
.tl .text-cyan-300,.tl .text-cyan-400{color:#0e7490}
.tl .text-rose-200{color:#9f1239}
.tl .text-rose-300,.tl .text-rose-400{color:#be123c}
.tl .hover\:text-white:hover{color:#0f172a}
.tl .hover\:text-rose-300:hover{color:#be123c}
.tl .hover\:text-cyan-300:hover{color:#0e7490}
.tl .hover\:text-emerald-300:hover{color:#047857}
.tl .border-white\/10,.tl .border-white\/15{border-color:rgba(15,23,42,.12)}
.tl .border-white\/5{border-color:rgba(15,23,42,.07)}
.tl .hover\:border-white\/25:hover,.tl .hover\:border-white\/30:hover{border-color:rgba(15,23,42,.3)}
.tl .divide-white\/5>:not([hidden])~:not([hidden]){border-color:rgba(15,23,42,.07)}
.tl .bg-white\/\[0\.03\],.tl .bg-white\/\[0\.02\]{background-color:rgba(15,23,42,.035)}
.tl .bg-white\/5{background-color:rgba(15,23,42,.05)}
.tl .hover\:bg-white\/5:hover,.tl .hover\:bg-white\/\[0\.03\]:hover,.tl .hover\:bg-white\/\[0\.04\]:hover{background-color:rgba(15,23,42,.06)}
.tl .hover\:bg-white\/10:hover{background-color:rgba(15,23,42,.09)}
.tl input,.tl select{color:#0f172a}
`;

/* ============================== KOMPONEN UI DASAR ============================== */
const glass = 'glass backdrop-blur-xl bg-white/[0.03] border border-white/10 shadow-2xl shadow-black/50 rounded-2xl';
const inp =
  'w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200 shadow-inner shadow-black/20 hover:border-white/25 focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10';
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border bg-transparent shadow-inner shadow-black/10 transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-4';
const BTN = {
  amber: 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/70 hover:shadow-[0_0_22px_rgba(245,158,11,0.28)] focus:ring-amber-400/15',
  emerald: 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10 hover:border-emerald-400/70 hover:shadow-[0_0_22px_rgba(16,185,129,0.28)] focus:ring-emerald-400/15',
  cyan: 'border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/70 hover:shadow-[0_0_22px_rgba(6,182,212,0.28)] focus:ring-cyan-400/15',
  ghost: 'border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/30 focus:ring-white/10',
  danger: 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/70 hover:shadow-[0_0_22px_rgba(244,63,94,0.28)] focus:ring-rose-500/15',
};
const TONE = {
  emerald: { text: 'text-emerald-400', soft: 'bg-emerald-500/10 border-emerald-400/30', glow: 'shadow-[0_0_40px_rgba(16,185,129,0.12)]', bar: 'from-emerald-600 to-emerald-300' },
  amber: { text: 'text-amber-400', soft: 'bg-amber-500/10 border-amber-400/30', glow: 'shadow-[0_0_40px_rgba(245,158,11,0.12)]', bar: 'from-amber-600 to-amber-300' },
  cyan: { text: 'text-cyan-400', soft: 'bg-cyan-500/10 border-cyan-400/30', glow: 'shadow-[0_0_40px_rgba(6,182,212,0.12)]', bar: 'from-cyan-600 to-cyan-300' },
  rose: { text: 'text-rose-400', soft: 'bg-rose-500/10 border-rose-400/30', glow: 'shadow-[0_0_40px_rgba(244,63,94,0.12)]', bar: 'from-rose-600 to-rose-300' },
  slate: { text: 'text-slate-300', soft: 'bg-white/5 border-white/15', glow: '', bar: 'from-slate-600 to-slate-300' },
};

const Btn = ({ tone = 'ghost', className = '', ...p }) => <button type="button" {...p} className={`${btnBase} ${BTN[tone]} ${className}`} />;
const Badge = ({ tone = 'slate', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${TONE[tone].soft} ${TONE[tone].text} ${className}`}>{children}</span>
);
const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
    {children}
  </label>
);
const PageHead = ({ title, sub, children }) => (
  <div className="anim-up mb-5 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
      <p className="mt-1 text-sm text-slate-400">{sub}</p>
    </div>
    {children}
  </div>
);
const Empty = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-500">
    <Icon size={34} strokeWidth={1.4} />
    <p className="text-sm">{text}</p>
  </div>
);
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box anim-modal max-h-[94vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f172a]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-6 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function StatCard({ label, value, raw, fmt, icon: Icon, tone, note, delay = 0 }) {
  const t = TONE[tone];
  const animated = useCountUp(raw === undefined ? 0 : raw);
  const shown = raw === undefined ? value : fmt(animated);
  return (
    <div className={`${glass} ${t.glow} anim-up p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`rounded-xl border p-2 ${t.soft} ${t.text}`}><Icon size={18} /></span>
      </div>
      <div className={`mt-4 text-2xl font-extrabold tracking-tight ${t.text}`}>{shown}</div>
      {note && <div className="mt-1 text-xs text-slate-500">{note}</div>}
    </div>
  );
}
const stockTone = (p) => (p.stock <= 0 ? 'rose' : p.stock <= p.lowStock ? 'amber' : 'emerald');
const RangeTabs = ({ value, onChange }) => (
  <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
    {[[1, 'Hari ini'], [7, '7 hari'], [30, '30 hari'], [0, 'Semua']].map(([v, l]) => (
      <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${value === v ? 'bg-amber-400/15 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.25)]' : 'text-slate-400 hover:text-white'}`}>{l}</button>
    ))}
  </div>
);
function ThemeToggle({ theme, onToggle }) {
  const light = theme === 'light';
  return (
    <button type="button" onClick={onToggle} aria-label="Ganti tema" title={light ? 'Beralih ke Dark Mode' : 'Beralih ke Light Mode'} className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-amber-300 transition-all duration-300 hover:scale-105 hover:border-amber-400/50 active:scale-90">
      <Sun size={17} className={`absolute inset-0 m-auto transition-all duration-500 ${light ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'}`} />
      <Moon size={17} className={`absolute inset-0 m-auto transition-all duration-500 ${light ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
    </button>
  );
}
const CONFETTI_COLORS = ['#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#a78bfa', '#fde047'];
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 32 }, (_, i) => ({
    c: CONFETTI_COLORS[i % CONFETTI_COLORS.length], dx: (Math.random() - 0.5) * 340, dy: 50 + Math.random() * 200,
    rot: `${Math.random() * 720 - 360}deg`, d: Math.random() * 0.25,
  })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((x, i) => <span key={i} className="confetti-piece" style={{ background: x.c, '--dx': `${x.dx}px`, '--dy': `${x.dy}px`, '--rot': x.rot, animationDelay: `${x.d}s` }} />)}
    </div>
  );
}

/* ============================== STRUK BELANJA ============================== */
function ReceiptBody({ tx, paper }) {
  const fs = paper === 58 ? 11 : 12;
  const line = { borderTop: '1px dashed #888', margin: '6px 0' };
  const row = { display: 'flex', justifyContent: 'space-between', gap: 8 };
  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: fs, lineHeight: 1.35, color: '#000' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: fs + 2 }}>{STORE.name}</div>
        <div>{STORE.addr}</div>
        <div>Telp {STORE.tel}</div>
      </div>
      <div style={line} />
      <div style={row}><span>No</span><span>{tx.id}</span></div>
      <div style={row}><span>Tgl</span><span>{fmtDT(tx.date)}</span></div>
      {tx.cashier && <div style={row}><span>Kasir</span><span>{tx.cashier}</span></div>}
      <div style={line} />
      {tx.items.map((i) => (
        <div key={i.id} style={{ marginBottom: 4 }}>
          <div>{i.name}</div>
          <div style={row}>
            <span>{i.qty} {i.unit} x {Math.round(i.price).toLocaleString('id-ID')}{i.ws ? ' (Grosir)' : ''}</span>
            <span>{Math.round(i.price * i.qty).toLocaleString('id-ID')}</span>
          </div>
        </div>
      ))}
      <div style={line} />
      <div style={row}><span>Subtotal</span><span>{rp(tx.subtotal)}</span></div>
      {tx.discount > 0 && <div style={row}><span>Diskon</span><span>-{rp(tx.discount)}</span></div>}
      <div style={{ ...row, fontWeight: 700, fontSize: fs + 1 }}><span>TOTAL</span><span>{rp(tx.total)}</span></div>
      <div style={row}><span>Bayar ({tx.method})</span><span>{rp(tx.paid)}</span></div>
      <div style={row}><span>Kembali</span><span>{rp(tx.change)}</span></div>
      <div style={line} />
      <div style={{ textAlign: 'center' }}>Terima kasih sudah berbelanja!<br />Barang yang sudah dibeli tidak dapat ditukar.</div>
    </div>
  );
}
function ReceiptModal({ tx, onClose, canDelete, onDelete }) {
  const [paper, setPaper] = useLS('kg_paper', 80);
  const [phone, setPhone] = useState('');
  const fresh = !!tx.fresh;
  const w = paper === 58 ? '58mm' : '80mm';
  const sendWA = () => {
    const num = normPhone(phone);
    const url = `https://wa.me/${num}?text=${encodeURIComponent(waText(tx))}`;
    window.open(url, '_blank');
  };
  return (
    <>
      <Modal title={fresh ? 'Transaksi selesai' : `Struk ${tx.id}`} onClose={onClose}>
        {fresh && (
          <div className="relative mb-5 overflow-hidden pb-1 text-center">
            <Confetti />
            <div className="relative mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/15 text-emerald-400 ring-glow">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="check-path" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h4 className="anim-up mt-4 text-lg font-extrabold text-white" style={{ animationDelay: '250ms' }}>Pembayaran berhasil!</h4>
            <div className="anim-up mt-1 text-xs text-slate-400" style={{ animationDelay: '320ms' }}>{tx.method === 'Tunai' ? 'Kembalian untuk pelanggan' : `Total dibayar via ${tx.method}`}</div>
            <div className="anim-up mt-1 text-4xl font-extrabold tracking-tight text-emerald-400" style={{ animationDelay: '400ms' }}>{rp(tx.method === 'Tunai' ? tx.change : tx.total)}</div>
            <div className="anim-up mt-1 text-xs text-slate-500" style={{ animationDelay: '460ms' }}>{tx.id} - Total belanja {rp(tx.total)}</div>
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {[58, 80].map((p) => (
              <button key={p} type="button" onClick={() => setPaper(p)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${paper === p ? 'bg-amber-400/15 text-amber-300' : 'text-slate-400 hover:text-white'}`}>{p} mm</button>
            ))}
          </div>
          <Btn tone="amber" onClick={() => window.print()}><Printer size={16} /> Cetak struk</Btn>
        </div>
        <div className="mb-3 flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="No. WhatsApp pelanggan (opsional)" className={inp} />
          <Btn tone="emerald" className="shrink-0" onClick={sendWA}><MessageCircle size={16} /> Kirim WA</Btn>
        </div>
        <div className="max-h-[40vh] overflow-auto rounded-xl bg-slate-100 p-3">
          <div className="mx-auto bg-white p-3 text-black shadow-lg" style={{ width: w, maxWidth: '100%', color: '#000' }}>
            <ReceiptBody tx={tx} paper={paper} />
          </div>
        </div>
        <div className="mt-4 flex justify-between gap-2">
          {canDelete && !fresh ? <Btn tone="danger" onClick={() => onDelete(tx)}><Trash2 size={16} /> Hapus</Btn> : <span />}
          <Btn tone={fresh ? 'emerald' : 'ghost'} onClick={onClose}>{fresh ? 'Transaksi baru' : 'Tutup'}</Btn>
        </div>
      </Modal>
      {createPortal(<div className="print-only" style={{ width: w }}><ReceiptBody tx={tx} paper={paper} /></div>, document.body)}
    </>
  );
}
function DeleteTxModal({ tx, onConfirm, onClose }) {
  const [restore, setRestore] = useState(true);
  const units = tx.items.reduce((s, i) => s + i.qty, 0);
  return (
    <Modal title="Hapus transaksi?" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          Transaksi <b>{tx.id}</b> ({fmtDT(tx.date)}) senilai <b>{rp(tx.total)}</b> akan dihapus permanen dan laporan omset ikut berubah.
        </div>
        <button type="button" onClick={() => setRestore((r) => !r)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.99] ${restore ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${restore ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-white/30'}`}>{restore && <Check size={13} strokeWidth={3} />}</span>
          <span className="text-sm text-white">Kembalikan stok barang dari transaksi ini<span className="block text-xs text-slate-400">{units} unit dari {tx.items.length} jenis barang akan ditambahkan ke stok</span></span>
        </button>
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Batal</Btn>
          <Btn tone="danger" onClick={() => onConfirm(tx, restore)}><Trash2 size={16} /> Hapus transaksi</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================== DASHBOARD ============================== */
function Dashboard({ products, txs, expenses, setTab, openTx }) {
  const [range, setRange] = useState(7);
  const [tip, setTip] = useState(null);
  const [goal, setGoal] = useLS('kg_goal', 1000000);
  const [editGoal, setEditGoal] = useState(false);
  const [goalIn, setGoalIn] = useState('');
  const fTx = useMemo(() => inRange(txs, range), [txs, range]);
  const fEx = useMemo(() => inRange(expenses, range), [expenses, range]);
  const s = summarize(fTx, fEx);
  const low = useMemo(() => products.filter((p) => p.stock <= p.lowStock).sort((a, b) => a.stock - b.stock), [products]);
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dateKey(d.toISOString());
      arr.push({ k, label: d.toLocaleDateString('id-ID', { weekday: 'short' }), full: d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short' }), v: txs.filter((t) => dateKey(t.date) === k).reduce((a, t) => a + n0(t.total), 0) });
    }
    return arr;
  }, [txs]);
  const max = Math.max(...days.map((d) => d.v), 1);
  const top = useMemo(() => {
    const m = new Map();
    fTx.forEach((t) => t.items.forEach((i) => {
      const e = m.get(i.id) || { id: i.id, name: i.name, unit: i.unit, qty: 0, rev: 0 };
      e.qty += i.qty;
      e.rev += i.price * i.qty;
      m.set(i.id, e);
    }));
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [fTx]);
  const topMax = Math.max(...top.map((x) => x.qty), 1);
  const totalStock = products.reduce((a, p) => a + n0(p.stock), 0);
  const todayK = dateKey(new Date().toISOString());
  const today = useMemo(() => txs.filter((t) => dateKey(t.date) === todayK).reduce((a, t) => a + n0(t.total), 0), [txs, todayK]);
  const pct = goal > 0 ? Math.round((today / goal) * 100) : 0;
  const pctAnim = useCountUp(pct, 900);
  const saveGoal = () => {
    const v = Math.round(Number(goalIn));
    if (!v || v <= 0) return;
    setGoal(v);
    setEditGoal(false);
  };
  const medal = ['text-amber-400', 'text-slate-300', 'text-orange-400', 'text-cyan-400', 'text-cyan-400'];
  return (
    <div>
      <PageHead title="Dashboard" sub="Ringkasan performa toko Anda">
        <RangeTabs value={range} onChange={setRange} />
      </PageHead>

      <div className={`${glass} anim-up mb-4 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-white"><Target size={18} className="text-amber-400" /> Target omset hari ini</h2>
          {editGoal ? (
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={goalIn} onChange={(e) => setGoalIn(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveGoal()} placeholder="Target (Rp)" className={`${inp} w-40`} autoFocus />
              <Btn tone="amber" onClick={saveGoal}><Check size={15} /></Btn>
              <Btn onClick={() => setEditGoal(false)}><X size={15} /></Btn>
            </div>
          ) : (
            <Btn onClick={() => { setGoalIn(String(goal)); setEditGoal(true); }}><Pencil size={14} /> Atur target</Btn>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-amber-300">{rp(today)}</div>
            <div className="text-xs text-slate-500">dari target {rp(goal)}</div>
          </div>
          <div className={`text-3xl font-extrabold ${pct >= 100 ? 'text-emerald-400' : 'text-amber-300'}`}>{Math.round(pctAnim)}%</div>
        </div>
        <div className="mt-3 h-3.5 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
          <div className="shimmer-bar h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 transition-all duration-1000" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-400">{pct >= 100 ? 'Target tercapai! Luar biasa 🎉' : `Kurang ${rp(Math.max(goal - today, 0))} lagi untuk mencapai target`}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard delay={0} label="Total Omset" raw={s.omset} fmt={rp} icon={TrendingUp} tone="cyan" note={`${fTx.length} transaksi`} />
        <StatCard delay={70} label="Total HPP" value={rp(s.hpp)} icon={Boxes} tone="amber" note="Modal barang terjual" />
        <StatCard delay={140} label="Total Pengeluaran" value={rp(s.spend)} icon={Wallet} tone="rose" note={`${fEx.length} catatan`} />
        <StatCard delay={210} label="Laba Bersih" raw={s.net} fmt={rp} icon={Banknote} tone={s.net >= 0 ? 'emerald' : 'rose'} note="Omset - HPP - Pengeluaran" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard delay={280} label="Total Transaksi" raw={fTx.length} fmt={(n) => Math.round(n).toLocaleString('id-ID')} icon={Receipt} tone="cyan" note="Pada periode terpilih" />
        <StatCard delay={350} label="Total Stok" value={`${totalStock.toLocaleString('id-ID')} unit`} icon={Boxes} tone="amber" note={`${products.length} jenis produk`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className={`${glass} anim-up p-6 xl:col-span-2`}>
          <h2 className="font-bold text-white">Omset 7 hari terakhir</h2>
          <div className="mt-10 flex h-52 items-end gap-2 sm:gap-3">
            {days.map((d, idx) => (
              <div key={d.k} onMouseEnter={() => setTip(d.k)} onMouseLeave={() => setTip(null)} onClick={() => setTip((t) => (t === d.k ? null : d.k))} className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-2">
                {tip === d.k && (
                  <div className="anim-modal absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-center text-[11px] font-semibold text-cyan-300 shadow-lg backdrop-blur-md">
                    <div className="capitalize text-slate-400">{d.full}</div>{rp(d.v)}
                  </div>
                )}
                <span className="text-[10px] text-slate-400">{d.v ? `${Math.round(d.v / 1000)}k` : ''}</span>
                <div className={`bar-grow w-full rounded-t-lg bg-gradient-to-t ${TONE.cyan.bar} transition-opacity duration-200 ${tip === d.k ? 'opacity-100' : 'opacity-80'}`} style={{ height: `${Math.max((d.v / max) * 100, d.v ? 4 : 1)}%`, animationDelay: `${idx * 70}ms` }} />
                <span className="text-xs capitalize text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${glass} anim-up p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-white"><AlertTriangle size={18} className="text-amber-400" /> Stok menipis</h2>
            <Badge tone={low.length ? 'amber' : 'emerald'}>{low.length} barang</Badge>
          </div>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {low.length === 0 && <Empty icon={Check} text="Semua stok aman." />}
            {low.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{p.name}</div>
                  <div className="text-xs text-slate-500">Batas {p.lowStock} {p.unit}</div>
                </div>
                <Badge tone={stockTone(p)} className={p.stock > 0 ? 'pulse-soft' : ''}>{p.stock} {p.unit}</Badge>
              </div>
            ))}
          </div>
          {low.length > 0 && <Btn tone="amber" className="mt-4 w-full" onClick={() => setTab('products')}>Kelola stok</Btn>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className={`${glass} anim-up p-6`}>
          <h2 className="mb-4 flex items-center gap-2 font-bold text-white"><Trophy size={18} className="text-amber-400" /> 5 Produk terlaris <span className="text-xs font-normal text-slate-500">({RANGE_LABEL[range]})</span></h2>
          {top.length === 0 && <Empty icon={Trophy} text="Belum ada penjualan pada periode ini." />}
          <div className="space-y-4">
            {top.map((x, i) => (
              <div key={x.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><b className={`w-5 text-center ${medal[i]}`}>{i + 1}</b><span className="truncate font-medium text-white">{x.name}</span></span>
                  <span className="shrink-0 text-xs text-slate-400">{x.qty} {x.unit} - <span className="text-amber-300">{rp(x.rev)}</span></span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="grow-x h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300" style={{ width: `${(x.qty / topMax) * 100}%`, animationDelay: `${i * 90}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`${glass} anim-up p-6`}>
          <h2 className="mb-4 font-bold text-white">Transaksi terbaru</h2>
          {txs.length === 0 && <Empty icon={Receipt} text="Belum ada transaksi." />}
          <div className="divide-y divide-white/5">
            {txs.slice(0, 5).map((t) => (
              <button key={t.id} type="button" onClick={() => openTx(t)} className="flex w-full items-center justify-between gap-3 py-3 text-left transition-all duration-200 hover:bg-white/[0.03]">
                <div>
                  <div className="text-sm font-semibold text-white">{t.id}</div>
                  <div className="text-xs text-slate-500">{fmtDT(t.date)} - {t.items.length} jenis barang</div>
                </div>
                <div className="flex items-center gap-3"><Badge tone="cyan">{t.method}</Badge><span className="text-sm font-bold text-amber-300">{rp(t.total)}</span></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== POS / KASIR ============================== */
function POS({ products, onCheckout, notify, cart, setCart }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Semua');
  const [discType, setDiscType] = useState('nominal');
  const [discVal, setDiscVal] = useState('');
  const [method, setMethod] = useState('Tunai');
  const [paid, setPaid] = useState('');
  const [bump, setBump] = useState(0);
  const scanRef = useRef(null);
  const cartRef = useRef(null);
  useEffect(() => { scanRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (cat === 'Semua' || p.category === cat) && (!q || p.name.toLowerCase().includes(q) || p.sku.includes(q)));
  }, [products, query, cat]);
  const items = useMemo(() => toItems(cart, products), [cart, products]);
  const { subtotal, discount, total } = calc(items, discType, discVal);
  const saving = items.reduce((s, i) => (i.ws ? s + (i.retail - i.price) * i.qty : s), 0);
  const cartQty = cart.reduce((s, c) => s + c.qty, 0);
  const effPaid = method === 'Tunai' ? Number(paid) || 0 : total;
  const change = effPaid - total;
  const canPay = items.length > 0 && effPaid >= total;
  useEffect(() => { if (cartQty > 0) setBump((b) => b + 1); }, [cartQty]);

  const add = (p, qty = 1) => {
    const cur = cart.find((c) => c.id === p.id)?.qty || 0;
    if (p.stock <= 0) return notify(`Stok ${p.name} habis`, 'err');
    if (cur + qty > p.stock) return notify(`Stok ${p.name} hanya ${p.stock} ${p.unit}`, 'err');
    setCart((c) => (cur ? c.map((x) => (x.id === p.id ? { ...x, qty: x.qty + qty } : x)) : [...c, { id: p.id, qty }]));
    return undefined;
  };
  const setQty = (id, v) => {
    const p = products.find((x) => x.id === id);
    let q = Math.floor(Number(v) || 0);
    if (q > p.stock) { notify(`Stok ${p.name} hanya ${p.stock} ${p.unit}`, 'err'); q = p.stock; }
    setCart((c) => (q <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty: q } : x))));
  };
  const onScan = (e) => {
    if (e.key !== 'Enter') return;
    const q = query.trim();
    if (!q) return;
    const exact = products.find((p) => p.sku === q);
    if (exact) { add(exact); setQuery(''); return; }
    if (filtered.length === 1) { add(filtered[0]); setQuery(''); return; }
    notify(filtered.length ? 'Pilih barang dari daftar di bawah' : `Barcode ${q} tidak ditemukan`, 'err');
  };
  const pay = () => {
    if (!canPay) return;
    onCheckout({ lines: cart, discType, discVal, method, paid: effPaid });
    setCart([]); setDiscVal(''); setPaid(''); setMethod('Tunai'); setQuery('');
    scanRef.current?.focus();
  };
  const cashBtns = [['Uang Pas', total], ['Rp 20.000', 20000], ['Rp 50.000', 50000], ['Rp 100.000', 100000], ['Rp 200.000', 200000]];

  return (
    <div>
      <PageHead title="Kasir (POS)" sub="Scan barcode atau cari barang, harga grosir diterapkan otomatis" />
      <div className="grid gap-4 md:grid-cols-12">
        <div className="min-w-0 md:col-span-7 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:pr-1 lg:col-span-8">
          <div className="top-0 z-10 pb-3 md:sticky md:backdrop-blur-md">
            <div className="relative">
              <ScanBarcode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
              <input ref={scanRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onScan} placeholder="Scan barcode / ketik nama barang, tekan Enter" className={`${inp} py-3 pl-11 text-base`} />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {['Semua', ...CATS].map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all duration-300 active:scale-95 ${cat === c ? 'scale-105 border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.25)]' : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white'}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, idx) => (
              <button key={p.id} type="button" disabled={p.stock <= 0} onClick={() => add(p)} style={{ animationDelay: `${Math.min(idx, 14) * 35}ms` }} className={`${glass} anim-up p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/40 hover:shadow-[0_0_26px_rgba(245,158,11,0.15)] active:scale-95 disabled:opacity-40`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-snug text-white">{p.name}</span>
                  <Badge tone={stockTone(p)} className={p.stock > 0 && p.stock <= p.lowStock ? 'pulse-soft' : ''}>{p.stock}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{p.sku} - {p.category}</div>
                <div className="mt-3 text-lg font-extrabold text-amber-300">{rp(p.retail)}<span className="ml-1 text-xs font-medium text-slate-500">/{p.unit}</span></div>
                {p.wholesale > 0 && p.wholesale < p.retail && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400"><Tag size={12} /> Grosir {rp(p.wholesale)} mulai {p.minQty} {p.unit}</div>
                )}
                {p.stock > 0 && p.stock <= p.lowStock && <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400"><AlertTriangle size={11} /> Stok menipis</div>}
              </button>
            ))}
          </div>
          {filtered.length === 0 && <div className={glass}><Empty icon={Search} text="Barang tidak ditemukan." /></div>}
        </div>

        {/* Keranjang & pembayaran */}
        <div ref={cartRef} className={`${glass} flex flex-col p-4 md:col-span-5 md:sticky md:top-4 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto lg:col-span-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <ShoppingBag size={18} className="text-amber-400" /> Keranjang
              {cartQty > 0 && <span key={bump} className="anim-pop inline-flex min-w-[22px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-extrabold text-slate-900">{cartQty}</span>}
            </h2>
            {cart.length > 0 && <button type="button" onClick={() => setCart([])} className="text-xs text-slate-400 transition-all hover:text-rose-300">Kosongkan</button>}
          </div>
          <div className="max-h-[38vh] min-h-[90px] space-y-2 overflow-y-auto pr-1">
            {items.length === 0 && <Empty icon={ShoppingCart} text="Keranjang masih kosong." />}
            {items.map((i) => (
              <div key={i.id} className="anim-up rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{i.name}</div>
                    <div className="text-xs text-slate-400">{rp(i.price)} / {i.unit}</div>
                  </div>
                  <button type="button" onClick={() => setQty(i.id, 0)} className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"><Trash2 size={15} /></button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setQty(i.id, i.qty - 1)} className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition-all hover:border-white/30 active:scale-90"><Minus size={14} /></button>
                    <input type="number" value={i.qty} onChange={(e) => setQty(i.id, e.target.value)} className="w-14 rounded-lg border border-white/10 bg-transparent py-1 text-center text-sm text-white outline-none focus:border-amber-400/60" />
                    <button type="button" onClick={() => setQty(i.id, i.qty + 1)} className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition-all hover:border-white/30 active:scale-90"><Plus size={14} /></button>
                  </div>
                  <span className="text-sm font-bold text-amber-300">{rp(i.price * i.qty)}</span>
                </div>
                {i.ws && <Badge tone="emerald" className="mt-2">Hemat Grosir {rp((i.retail - i.price) * i.qty)}</Badge>}
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
            <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="text-white">{rp(subtotal)}</span></div>
            {saving > 0 && <div className="flex justify-between text-xs text-emerald-400"><span>Total hemat grosir</span><span>{rp(saving)}</span></div>}
            <div className="flex gap-2">
              <select value={discType} onChange={(e) => setDiscType(e.target.value)} className={`${inp} w-24`}>
                <option value="nominal">Rp</option>
                <option value="percent">%</option>
              </select>
              <input type="number" min="0" value={discVal} onChange={(e) => setDiscVal(e.target.value)} placeholder="Diskon tambahan" className={inp} />
            </div>
            {discount > 0 && <div className="flex justify-between text-sm text-slate-400"><span>Diskon</span><span className="text-rose-300">-{rp(discount)}</span></div>}
            <div className="flex items-end justify-between">
              <span className="text-sm text-slate-400">Total bayar</span>
              <span className="text-2xl font-extrabold tracking-tight text-amber-300 sm:text-3xl">{rp(total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ id, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setMethod(id)} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-all duration-200 active:scale-95 ${method === id ? 'border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.2)]' : 'border-white/10 text-slate-400 hover:border-white/30'}`}>
                  <Icon size={17} />{id}
                </button>
              ))}
            </div>
            {method === 'Tunai' ? (
              <>
                <input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="Uang dibayar" className={`${inp} text-base`} />
                <div className="grid grid-cols-3 gap-2">
                  {cashBtns.map(([l, v], idx) => (
                    <button key={l} type="button" disabled={!total} onClick={() => setPaid(String(v))} className={`rounded-lg border border-white/10 py-2 text-xs font-semibold text-slate-300 transition-all duration-200 hover:border-emerald-400/50 hover:text-emerald-300 active:scale-95 disabled:opacity-40 ${idx === 0 ? 'col-span-3 border-emerald-400/30 text-emerald-300' : ''}`}>{l}</button>
                  ))}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{change < 0 && paid ? 'Kurang' : 'Kembalian'}</span>
                  <span className={`font-bold ${change < 0 ? 'text-rose-300' : 'text-emerald-400'}`}>{rp(paid ? Math.abs(change) : 0)}</span>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs text-cyan-200">Pembayaran {method} dianggap lunas sesuai total belanja.</div>
            )}
            <Btn tone="emerald" className="w-full py-3.5 text-base" disabled={!canPay} onClick={pay}><Check size={18} /> Bayar & cetak struk</Btn>
          </div>
        </div>
      </div>

      {/* Tombol keranjang melayang (portrait) */}
      {cartQty > 0 && (
        <button type="button" onClick={() => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="anim-up fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between rounded-2xl border border-amber-400/50 bg-amber-500 px-5 py-3.5 text-sm font-extrabold text-slate-900 shadow-2xl shadow-black/40 transition-all active:scale-95 md:hidden">
          <span className="flex items-center gap-2"><ShoppingBag size={18} /> Lihat keranjang <span key={bump} className="anim-pop rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-amber-300">{cartQty}</span></span>
          <span>{rp(total)}</span>
        </button>
      )}
    </div>
  );
}

/* ============================== PRODUK & INVENTARIS ============================== */
function ProductModal({ product, products, onSave, onClose }) {
  const [f, setF] = useState(product ? { ...product } : { sku: '', name: '', category: CATS[0], unit: 'Pcs', cost: '', retail: '', wholesale: '', minQty: '', stock: '', lowStock: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const n = (k) => Number(f[k]) || 0;
  const submit = (e) => {
    e.preventDefault();
    const sku = String(f.sku).trim();
    const name = String(f.name).trim();
    if (!sku || !name) return setErr('Barcode / SKU dan nama barang wajib diisi.');
    if (products.some((p) => p.sku === sku && p.id !== f.id)) return setErr('Barcode / SKU sudah dipakai produk lain.');
    if (n('retail') <= 0) return setErr('Harga eceran harus lebih dari 0.');
    if (n('cost') < 0 || n('stock') < 0 || n('lowStock') < 0) return setErr('Nilai tidak boleh negatif.');
    if (n('wholesale') > n('retail')) return setErr('Harga grosir tidak boleh lebih tinggi dari harga eceran.');
    if (n('wholesale') > 0 && n('minQty') < 1) return setErr('Isi Min. Qty grosir (minimal 1) agar harga grosir aktif.');
    return onSave({ ...f, id: f.id || uid(), sku, name, cost: n('cost'), retail: n('retail'), wholesale: n('wholesale'), minQty: n('minQty'), stock: n('stock'), lowStock: n('lowStock') });
  };
  const num = (k, label, ph = '0') => (
    <Field label={label}><input type="number" min="0" value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className={inp} /></Field>
  );
  return (
    <Modal title={product ? 'Edit produk' : 'Tambah produk'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Barcode / Kode SKU"><input value={f.sku} onChange={(e) => set('sku', e.target.value)} placeholder="8993001000011" className={inp} autoFocus /></Field>
        <Field label="Nama barang"><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Beras Premium 5kg" className={inp} /></Field>
        <Field label="Kategori">
          <select value={f.category} onChange={(e) => set('category', e.target.value)} className={inp}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Satuan">
          <select value={f.unit} onChange={(e) => set('unit', e.target.value)} className={inp}>{UNITS.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        {num('cost', 'Harga modal (HPP)')}
        {num('retail', 'Harga eceran (per satuan)')}
        {num('wholesale', 'Harga grosir (0 = tidak ada)')}
        {num('minQty', 'Min. qty untuk harga grosir')}
        {num('stock', 'Stok saat ini')}
        {num('lowStock', 'Ambang batas stok menipis')}
        {err && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:col-span-2">{err}</div>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Btn onClick={onClose}>Batal</Btn>
          <button type="submit" className={`${btnBase} ${BTN.amber}`}><Check size={16} /> Simpan produk</button>
        </div>
      </form>
    </Modal>
  );
}
function Products({ products, setProducts, notify }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Semua');
  const [edit, setEdit] = useState(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (cat === 'Semua' || p.category === cat) && (!s || p.name.toLowerCase().includes(s) || p.sku.includes(s)));
  }, [products, q, cat]);
  const save = (p) => {
    setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]));
    setEdit(null);
    notify('Produk berhasil disimpan');
  };
  const del = (p) => {
    if (!window.confirm(`Hapus produk "${p.name}"?`)) return;
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    notify('Produk dihapus');
  };
  return (
    <div>
      <PageHead title="Produk & Stok" sub={`${products.length} produk terdaftar`}>
        <Btn tone="amber" onClick={() => setEdit('new')}><Plus size={16} /> Tambah produk</Btn>
      </PageHead>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau barcode" className={`${inp} pl-10`} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inp} w-44`}>{['Semua', ...CATS].map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <div className={`${glass} anim-up overflow-x-auto`}>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-400">
              {['Barang', 'Kategori', 'Modal', 'Eceran', 'Grosir', 'Stok', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((p) => (
              <tr key={p.id} className="transition-all duration-200 hover:bg-white/[0.03]">
                <td className="px-4 py-3"><div className="font-semibold text-white">{p.name}</div><div className="text-xs text-slate-500">{p.sku}</div></td>
                <td className="px-4 py-3"><Badge tone="cyan">{p.category}</Badge></td>
                <td className="px-4 py-3 text-slate-300">{rp(p.cost)}</td>
                <td className="px-4 py-3 font-semibold text-amber-300">{rp(p.retail)}<span className="text-xs font-normal text-slate-500"> /{p.unit}</span></td>
                <td className="px-4 py-3 text-emerald-400">{p.wholesale > 0 ? <>{rp(p.wholesale)}<span className="text-xs text-slate-500"> min {p.minQty}</span></> : <span className="text-slate-600">-</span>}</td>
                <td className="px-4 py-3">
                  <Badge tone={stockTone(p)}>{p.stock <= 0 ? 'Habis' : `${p.stock} ${p.unit}`}</Badge>
                  {p.stock > 0 && p.stock <= p.lowStock && <span className="pulse-soft ml-2 rounded-full px-1.5 text-xs text-amber-400">Menipis</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => setEdit(p)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-cyan-400/10 hover:text-cyan-300 active:scale-95"><Pencil size={15} /></button>
                    <button type="button" onClick={() => del(p)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty icon={Package} text="Tidak ada produk yang cocok." />}
      </div>
      {edit && <ProductModal product={edit === 'new' ? null : edit} products={products} onSave={save} onClose={() => setEdit(null)} />}
    </div>
  );
}

/* ============================== PENGELUARAN ============================== */
function Expenses({ expenses, setExpenses, txs, products, notify }) {
  const blank = { date: new Date().toISOString().slice(0, 10), category: EXP_CATS[0], note: '', amount: '' };
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [range, setRange] = useState(30);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const list = useMemo(() => inRange(expenses, range).sort((a, b) => b.date.localeCompare(a.date)), [expenses, range]);
  const total = list.reduce((s, e) => s + e.amount, 0);
  const submit = (e) => {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!amount || amount <= 0) return notify('Nominal pengeluaran harus lebih dari 0', 'err');
    const rec = { id: editId || uid(), date: f.date, category: f.category, note: f.note.trim(), amount };
    setExpenses((p) => (editId ? p.map((x) => (x.id === editId ? rec : x)) : [rec, ...p]));
    setF(blank); setEditId(null);
    return notify(editId ? 'Pengeluaran diperbarui' : 'Pengeluaran dicatat');
  };
  const startEdit = (x) => { setEditId(x.id); setF({ date: x.date, category: x.category, note: x.note, amount: String(x.amount) }); };
  const del = (x) => {
    if (!window.confirm('Hapus catatan pengeluaran ini?')) return;
    setExpenses((p) => p.filter((e) => e.id !== x.id));
    if (editId === x.id) { setEditId(null); setF(blank); }
    notify('Pengeluaran dihapus');
  };
  const doExport = () => runExport(() => exportExcel({ products, txs: inRange(txs, range), expenses: list, label: RANGE_LABEL[range] }), notify, 'Laporan Excel (.xlsx) siap');
  return (
    <div>
      <PageHead title="Pengeluaran" sub="Catat biaya operasional toko">
        <div className="flex flex-wrap items-center gap-3">
          <RangeTabs value={range} onChange={setRange} />
          <Btn tone="emerald" onClick={doExport}><Download size={16} /> Export Excel (.xlsx)</Btn>
        </div>
      </PageHead>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={submit} className={`${glass} anim-up h-fit space-y-4 p-5`}>
          <h2 className="font-bold text-white">{editId ? 'Edit pengeluaran' : 'Catat pengeluaran'}</h2>
          <Field label="Tanggal"><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} className={inp} /></Field>
          <Field label="Kategori"><select value={f.category} onChange={(e) => set('category', e.target.value)} className={inp}>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Nominal (Rp)"><input type="number" min="0" value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="150000" className={inp} /></Field>
          <Field label="Keterangan"><input value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="Opsional" className={inp} /></Field>
          <div className="flex gap-2">
            {editId && <Btn onClick={() => { setEditId(null); setF(blank); }}>Batal</Btn>}
            <button type="submit" className={`${btnBase} ${BTN.amber} flex-1`}><Check size={16} /> {editId ? 'Simpan perubahan' : 'Tambah pengeluaran'}</button>
          </div>
        </form>
        <div className={`${glass} anim-up p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-white">Daftar pengeluaran</h2>
            <span className="text-sm text-slate-400">Total <b className="ml-1 text-rose-300">{rp(total)}</b></span>
          </div>
          {list.length === 0 && <Empty icon={Wallet} text="Belum ada pengeluaran pada periode ini." />}
          <div className="divide-y divide-white/5">
            {list.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Badge tone="amber">{x.category}</Badge><span className="text-xs text-slate-500">{fmtD(x.date)}</span></div>
                  {x.note && <div className="mt-1 truncate text-sm text-slate-300">{x.note}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 text-sm font-bold text-rose-300">{rp(x.amount)}</span>
                  <button type="button" onClick={() => startEdit(x)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-cyan-400/10 hover:text-cyan-300 active:scale-95"><Pencil size={15} /></button>
                  <button type="button" onClick={() => del(x)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== RIWAYAT TRANSAKSI ============================== */
function HistoryView({ txs, expenses, products, openTx, notify, canSeeProfit, onDelete }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const list = useMemo(
    () => txs.filter((t) => {
      const k = dateKey(t.date);
      return (!from || k >= from) && (!to || k <= to) && (!q || t.id.toLowerCase().includes(q.trim().toLowerCase()));
    }),
    [txs, from, to, q]
  );
  const omset = list.reduce((s, t) => s + n0(t.total), 0);
  const gross = list.reduce((s, t) => s + n0(t.total) - n0(t.hpp), 0);
  const doExport = () => {
    const ex = expenses.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
    const label = from || to ? `${from || 'awal'} s/d ${to || 'sekarang'}` : 'Semua data';
    return runExport(() => exportExcel({ products, txs: list, expenses: ex, label }), notify, 'Laporan Excel (.xlsx) siap');
  };
  return (
    <div>
      <PageHead title="Riwayat Transaksi" sub="Klik transaksi untuk melihat detail dan mencetak ulang struk" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Dari tanggal"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inp} /></Field>
        <Field label="Sampai tanggal"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inp} /></Field>
        <div className="min-w-[180px] flex-1"><Field label="Cari nomor transaksi"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="TRX-..." className={inp} /></Field></div>
        {(from || to || q) && <Btn onClick={() => { setFrom(''); setTo(''); setQ(''); }}>Reset filter</Btn>}
        {canSeeProfit && (
          <Btn tone="emerald" className="ml-auto" disabled={!list.length} onClick={doExport}>
            <Download size={16} /> Export Excel (.xlsx)
          </Btn>
        )}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard delay={0} label="Jumlah transaksi" raw={list.length} fmt={(n) => Math.round(n).toLocaleString('id-ID')} icon={Receipt} tone="cyan" />
        <StatCard delay={70} label="Omset terfilter" raw={omset} fmt={rp} icon={TrendingUp} tone="amber" />
        {canSeeProfit && <StatCard delay={140} label="Laba kotor (Omset - HPP)" raw={gross} fmt={rp} icon={Banknote} tone="emerald" />}
      </div>
      <div className={`${glass} anim-up overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-400">
              {['No. transaksi', 'Waktu', 'Item', 'Metode', 'Total', 'Kasir', ...(canSeeProfit ? ['Laba kotor', ''] : [])].map((h, i) => <th key={`${h}${i}`} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((t) => (
              <tr key={t.id} onClick={() => openTx(t)} className="cursor-pointer transition-all duration-200 hover:bg-white/[0.04]">
                <td className="px-4 py-3 font-semibold text-white">{t.id}</td>
                <td className="px-4 py-3 text-slate-300">{fmtDT(t.date)}</td>
                <td className="px-4 py-3 text-slate-300">{t.items.reduce((s, i) => s + i.qty, 0)} unit</td>
                <td className="px-4 py-3"><Badge tone="cyan">{t.method}</Badge></td>
                <td className="px-4 py-3 font-bold text-amber-300">{rp(t.total)}</td>
                <td className="px-4 py-3 text-slate-300">{t.cashier || '-'}</td>
                {canSeeProfit && <td className="px-4 py-3 text-emerald-400">{rp(n0(t.total) - n0(t.hpp))}</td>}
                {canSeeProfit && (
                  <td className="px-4 py-3">
                    <button type="button" title="Hapus transaksi" onClick={(e) => { e.stopPropagation(); onDelete(t); }} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-300 active:scale-90"><Trash2 size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty icon={History} text="Tidak ada transaksi pada filter ini." />}
      </div>
    </div>
  );
}

/* ============================== PENGATURAN & BACKUP DATA ============================== */
function SettingsView({ products, txs, expenses, setProducts, setTxs, setExpenses, notify, cloud, syncState, session, onReset }) {
  const [lastBackup, setLastBackup] = useLS('kg_last_backup', null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef(null);

  const backup = () => runExport(async () => {
    const now = new Date().toISOString();
    const data = { app: 'kasir-grosir-premium', version: BACKUP_VERSION, exportedAt: now, products, transactions: txs, expenses };
    await saveTextFile(`backup-toko-${dateKey(now)}.json`, JSON.stringify(data, null, 2), 'application/json', 'Backup ' + STORE.name);
    setLastBackup(now);
  }, notify, 'Backup siap disimpan');
  const restore = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return undefined;
    if (!/\.json$/i.test(file.name)) return notify('Pilih file cadangan berekstensi .json', 'err');
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (err) {
      return notify('File rusak atau bukan JSON yang valid', 'err');
    }
    const problem = validateBackup(data);
    if (problem) return notify(problem, 'err');
    const ok = window.confirm(
      `Pulihkan data dari "${file.name}"?\n\n${data.products.length} produk, ${data.transactions.length} transaksi, ${data.expenses.length} pengeluaran.\n\nData yang ada sekarang akan diganti.`
    );
    if (!ok) return undefined;
    setProducts(data.products);
    setTxs(data.transactions);
    setExpenses(data.expenses);
    return notify('Data berhasil dipulihkan!');
  };
  const doReset = async () => {
    if (confirmText !== 'RESET' || resetting) return;
    setResetting(true);
    const ok = await onReset();
    setResetting(false);
    if (ok) { setResetOpen(false); setConfirmText(''); }
  };
  const closeReset = () => { setResetOpen(false); setConfirmText(''); };
  const sheets = ['Ringkasan Laporan', 'Riwayat Transaksi', 'Data Produk & Stok', 'Pengeluaran'];

  return (
    <div>
      <PageHead title="Pengaturan" sub="Cadangkan data toko dan unduh laporan Excel" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard delay={0} label="Produk tersimpan" raw={products.length} fmt={(n) => Math.round(n)} icon={Package} tone="amber" />
        <StatCard delay={70} label="Transaksi tersimpan" raw={txs.length} fmt={(n) => Math.round(n)} icon={Receipt} tone="cyan" />
        <StatCard delay={140} label="Catatan pengeluaran" raw={expenses.length} fmt={(n) => Math.round(n)} icon={Wallet} tone="rose" />
      </div>

      <div className={`${glass} anim-up mt-6 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-white">
            {cloud ? <Cloud size={18} className="text-emerald-400" /> : <CloudOff size={18} className="text-slate-400" />} Database & akun
          </h2>
          <SyncBadge state={syncState} />
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {cloud
            ? `Terhubung ke Supabase sebagai ${session.email || session.name}. Perubahan dari perangkat mana pun tampil otomatis di semua perangkat. Bila database masih kosong, tambahkan produk lewat menu Produk & Stok atau pulihkan file backup.`
            : 'Supabase belum dikonfigurasi, jadi data disimpan di localStorage browser ini. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di bagian atas App.jsx untuk mengaktifkan sinkronisasi real-time.'}
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className={`${glass} anim-up p-6`}>
          <h2 className="flex items-center gap-2 font-bold text-white"><ShieldCheck size={18} className="text-cyan-400" /> Backup & restore data</h2>
          <p className="mt-1 text-sm text-slate-400">Simpan seluruh produk, transaksi, dan pengeluaran dalam satu file cadangan.</p>
          <div className="mt-4">
            {lastBackup ? <Badge tone="emerald">Backup terakhir {fmtDT(lastBackup)}</Badge> : <Badge tone="amber">Belum pernah backup</Badge>}
          </div>
          <div className="mt-5 space-y-3">
            <Btn tone="amber" className="w-full" onClick={backup}><Download size={16} /> Export backup (.json)</Btn>
            <input ref={fileRef} type="file" accept=".json,application/json" onChange={restore} className="hidden" />
            <Btn tone="cyan" className="w-full" onClick={() => fileRef.current && fileRef.current.click()}><Upload size={16} /> Import / restore data</Btn>
          </div>
          <p className="mt-4 text-xs text-slate-500">Restore akan mengganti seluruh data yang ada sekarang. Unduh backup lebih dulu bila ragu.</p>
        </div>

        <div className={`${glass} anim-up p-6`}>
          <h2 className="flex items-center gap-2 font-bold text-white"><FileSpreadsheet size={18} className="text-emerald-400" /> Export Excel (.xlsx)</h2>
          <p className="mt-1 text-sm text-slate-400">Satu file Excel asli berisi 4 sheet, tanpa filter. Di HP Android akan muncul dialog untuk menyimpan atau mengirim file.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sheets.map((n, i) => <Badge key={n} tone="emerald">{i + 1}. {n}</Badge>)}
          </div>
          <Btn tone="emerald" className="mt-5 w-full py-3" onClick={() => runExport(() => exportExcel({ products, txs, expenses, label: 'Semua data' }), notify, 'Laporan Excel (.xlsx) siap')}>
            <Download size={16} /> Unduh laporan lengkap (.xlsx)
          </Btn>
        </div>
      </div>

      <div className={`${glass} anim-up mt-6 border-rose-500/20 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-white"><Database size={18} className="text-rose-400" /> Reset semua data</h2>
            <p className="mt-1 text-sm text-slate-400">Hapus semua produk, transaksi, dan pengeluaran sampai kosong (0). Akun login Pemilik dan Kasir tidak ikut terhapus.</p>
          </div>
          <Btn tone="danger" onClick={() => setResetOpen(true)}><RotateCcw size={16} /> Reset Semua Data (Kosongkan ke 0)</Btn>
        </div>
      </div>

      {resetOpen && (
        <Modal title="Kosongkan semua data toko?" onClose={closeReset}>
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              PERINGATAN: tindakan ini menghapus permanen {products.length} produk, {txs.length} transaksi, dan {expenses.length} pengeluaran sampai semuanya kosong (0). Data contoh tidak diisi ulang. Tidak bisa dibatalkan kecuali Anda punya file backup (JSON).{cloud && ' Karena memakai cloud, perubahan ini berlaku di semua perangkat.'}
            </div>
            <Field label="Ketik RESET untuk melanjutkan">
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" className={inp} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn onClick={closeReset}>Batal</Btn>
              <Btn tone="danger" disabled={confirmText !== 'RESET' || resetting} onClick={doReset}>{resetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Hapus semua data</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== LOGIN & STATUS SINKRONISASI ============================== */
const SYNC_META = {
  local: { tone: 'slate', label: 'Mode lokal', icon: CloudOff },
  connecting: { tone: 'amber', label: 'Menyambung...', icon: Loader2 },
  live: { tone: 'emerald', label: 'Real-time aktif', icon: Cloud },
  error: { tone: 'rose', label: 'Sinkron terputus', icon: CloudOff },
};
function SyncBadge({ state }) {
  const m = SYNC_META[state] || SYNC_META.local;
  const Icon = m.icon;
  return <Badge tone={m.tone}><Icon size={12} className={state === 'connecting' ? 'animate-spin' : ''} />{m.label}</Badge>;
}
function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0">
      <div className="blob absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="blob absolute -right-32 top-1/3 h-[480px] w-[480px] rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="blob absolute -bottom-40 left-1/3 h-[460px] w-[460px] rounded-full bg-cyan-500/10 blur-[130px]" />
    </div>
  );
}
function Splash() {
  return (
    <div className="app-bg relative flex min-h-screen items-center justify-center text-slate-400">
      <Backdrop />
      <div className="relative z-10 flex items-center gap-3 text-sm"><Loader2 size={20} className="animate-spin text-amber-400" /> Memuat sesi...</div>
    </div>
  );
}
function LoginScreen({ theme, onToggleTheme }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !pin) return setErr('Isi email dan PIN terlebih dahulu.');
    setBusy(true);
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pin });
    setBusy(false);
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Email atau PIN salah.' : `Gagal masuk: ${error.message}`);
    return undefined;
  };
  return (
    <div className="app-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4 text-white">
      <Backdrop />
      <div className="absolute right-4 top-4 z-20"><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div>
      <div className={`${glass} anim-up relative z-10 w-full max-w-md p-8`}>
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-amber-300 shadow-[0_0_28px_rgba(245,158,11,0.3)]"><Store size={22} /></span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{STORE.name}</h1>
            <p className="text-sm text-slate-400">Masuk untuk membuka kasir</p>
          </div>
        </div>

        {CLOUD_ON ? (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@tokoanda.com" className={`${inp} pl-10`} autoFocus />
              </div>
            </Field>
            <Field label="PIN / kata sandi">
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Minimal 6 karakter" className={`${inp} pl-10`} />
              </div>
            </Field>
            {err && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</div>}
            <button type="submit" disabled={busy} className={`${btnBase} ${BTN.amber} w-full py-3`}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Masuk
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-200">
            Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di bagian atas App.jsx.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== APLIKASI UTAMA ============================== */
function Shell({ session, cloud, onLogout, theme, onToggleTheme }) {
  const isOwner = session.role === 'owner';
  const [tab, setTab] = useState(isOwner ? 'dashboard' : 'pos');
  const [receipt, setReceipt] = useState(null);
  const [delTx, setDelTx] = useState(null);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [sync, setSync] = useState({});
  const notify = (msg, type = 'ok') => setToast({ msg, type, k: Date.now() });
  const bus = useRef({});
  bus.current = { onError: (m) => notify(m, 'err'), onStatus: (n, st) => setSync((x) => ({ ...x, [n]: st })) };
  const pre = cloud ? 'kgc_' : 'kg_';
  const [products, setProducts, applyProducts] = useTable({ name: 'products', lsKey: `${pre}products`, seed: cloud ? [] : SEED_PRODUCTS, cloud, toRow: productToRow, fromRow: productFromRow, orderCol: 'name', orderAsc: true, bus });
  const [txs, setTxs, applyTxs] = useTable({ name: 'transactions', lsKey: `${pre}transactions`, seed: cloud ? [] : SEED_TXS, cloud, toRow: txToRow, fromRow: txFromRow, orderCol: 'date', orderAsc: false, bus });
  const [expenses, setExpenses, applyExpenses] = useTable({ name: 'expenses', lsKey: `${pre}expenses`, seed: cloud ? [] : SEED_EXP, cloud: cloud && isOwner, toRow: expToRow, fromRow: expFromRow, orderCol: 'date', orderAsc: false, bus });
  const navItems = isOwner ? NAV : NAV.filter((n) => CASHIER_TABS.includes(n.id));
  const watched = isOwner ? ['products', 'transactions', 'expenses'] : ['products', 'transactions'];
  const vals = watched.map((n) => sync[n]);
  const syncState = !cloud ? 'local'
    : vals.every((v) => v === 'SUBSCRIBED') ? 'live'
    : vals.some((v) => ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(v)) ? 'error' : 'connecting';
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const checkout = ({ lines, discType, discVal, method, paid }) => {
    const items = toItems(lines, products);
    const c = calc(items, discType, discVal);
    const tx = {
      id: `TRX-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
      date: new Date().toISOString(), items, ...c, method, cashier: session.name,
      paid, change: Math.max(paid - c.total, 0), hpp: items.reduce((s, i) => s + i.cost * i.qty, 0),
    };
    setTxs((p) => [tx, ...p]);
    const dec = (list) => list.map((x) => {
      const l = lines.find((y) => y.id === x.id);
      return l ? { ...x, stock: Math.max(x.stock - l.qty, 0) } : x;
    });
    if (cloud) {
      /* Stok dikurangi atomik di server (aman bila 2 kasir menjual barang yang sama) */
      applyProducts(dec);
      lines.forEach((l) => {
        supabase.rpc('decrement_stock', { p_id: l.id, p_qty: l.qty }).then(({ error }) => {
          if (error) notify(`Gagal memperbarui stok di cloud: ${error.message}`, 'err');
        });
      });
    } else {
      setProducts(dec);
    }
    setReceipt({ ...tx, fresh: true });
    notify('Transaksi berhasil disimpan');
  };

  /* Hapus transaksi (Pemilik). Stok dikembalikan bila dicentang. */
  const deleteTx = (tx, restore) => {
    if (!isOwner) { notify('Hanya Pemilik yang boleh menghapus transaksi', 'err'); return; }
    setTxs((p) => p.filter((x) => x.id !== tx.id));
    if (restore) {
      setProducts((prev) => prev.map((x) => {
        const back = tx.items.filter((i) => i.id === x.id).reduce((s, i) => s + n0(i.qty), 0);
        return back ? { ...x, stock: x.stock + back } : x;
      }));
    }
    setDelTx(null);
    setReceipt(null);
    notify(restore ? `${tx.id} dihapus, stok dikembalikan` : `${tx.id} dihapus`);
  };

  /* Kosongkan SEMUA data toko (tabel profiles TIDAK disentuh). Hanya Pemilik. */
  const resetAll = async () => {
    if (!isOwner) { notify('Hanya Pemilik yang boleh mereset data', 'err'); return false; }
    const tables = ['transactions', 'expenses', 'products'];
    if (cloud && supabase) {
      for (const t of tables) {
        const { error } = await supabase.from(t).delete().neq('id', '__none__');
        if (error) { notify(`Gagal menghapus tabel ${t}: ${error.message}`, 'err'); return false; }
      }
      for (const t of tables) {
        const { count, error } = await supabase.from(t).select('id', { count: 'exact', head: true });
        if (error || count > 0) { notify(`Data ${t} di cloud belum terhapus semua. Periksa hak akses Owner.`, 'err'); return false; }
      }
    }
    ['kg_', 'kgc_'].forEach((pf) => ['products', 'transactions', 'expenses'].forEach((k) => {
      try { localStorage.setItem(pf + k, '[]'); } catch (e) { /* abaikan */ }
    }));
    applyProducts([]);
    applyTxs([]);
    applyExpenses([]);
    setCart([]);
    setReceipt(null);
    notify('Semua data dikosongkan (0)');
    return true;
  };

  return (
    <div className="app-bg relative min-h-screen overflow-x-hidden text-white">
      <Backdrop />

      {/* Sidebar melayang (desktop) */}
      <aside className={`${glass} fixed bottom-4 left-4 top-4 z-30 hidden w-64 flex-col p-4 lg:flex`}>
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <span className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-2.5 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.3)]"><Store size={20} /></span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold leading-tight">{STORE.name}</div><div className="text-[11px] text-slate-500">Kasir & manajemen toko</div></div>
        </div>
        <nav className="space-y-1.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-all duration-200 active:scale-95 ${tab === id ? 'border-amber-400/40 bg-amber-400/10 text-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.18)]' : 'border-transparent text-slate-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300"><UserRound size={16} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{session.name}</div>
              <div className="text-xs text-slate-500">{isOwner ? 'Pemilik' : 'Kasir'}</div>
            </div>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
          <SyncBadge state={syncState} />
          <Btn className="w-full" onClick={onLogout}><LogOut size={15} /> Keluar</Btn>
        </div>
      </aside>

      {/* Navigasi mobile */}
      <div className="topbar sticky top-0 z-30 flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-[#0b0f17]/80 p-2 backdrop-blur-xl lg:hidden">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${tab === id ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-transparent text-slate-400'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <SyncBadge state={syncState} />
          <button type="button" onClick={onLogout} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-all duration-200 active:scale-95"><LogOut size={14} />Keluar</button>
        </div>
      </div>

      <main key={tab} className="relative z-10 p-4 pb-24 sm:p-6 md:pb-6 lg:pl-[18.5rem] lg:pr-8 lg:pt-8">
        {tab === 'dashboard' && isOwner && <Dashboard products={products} txs={txs} expenses={expenses} setTab={setTab} openTx={setReceipt} />}
        {tab === 'pos' && <POS products={products} onCheckout={checkout} notify={notify} cart={cart} setCart={setCart} />}
        {tab === 'products' && isOwner && <Products products={products} setProducts={setProducts} notify={notify} />}
        {tab === 'expenses' && isOwner && <Expenses expenses={expenses} setExpenses={setExpenses} txs={txs} products={products} notify={notify} />}
        {tab === 'history' && <HistoryView txs={txs} expenses={expenses} products={products} openTx={setReceipt} notify={notify} canSeeProfit={isOwner} onDelete={setDelTx} />}
        {tab === 'settings' && isOwner && <SettingsView products={products} txs={txs} expenses={expenses} setProducts={setProducts} setTxs={setTxs} setExpenses={setExpenses} notify={notify} cloud={cloud} syncState={syncState} session={session} onReset={resetAll} />}
      </main>

      {receipt && <ReceiptModal tx={receipt} onClose={() => setReceipt(null)} canDelete={isOwner} onDelete={(t) => setDelTx(t)} />}
      {delTx && <DeleteTxModal tx={delTx} onConfirm={deleteTx} onClose={() => setDelTx(null)} />}

      {toast && (
        <div key={toast.k} className={`anim-up fixed bottom-24 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold backdrop-blur-xl shadow-2xl shadow-black/50 md:bottom-6 md:right-6 ${toast.type === 'err' ? 'border-rose-500/40 bg-rose-500/15 text-rose-200' : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'}`}>
          {toast.type === 'err' ? <AlertTriangle size={16} /> : <Check size={16} />}{toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================== ROOT: AUTENTIKASI & PERAN ============================== */
export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(CLOUD_ON);
  const [theme, setTheme] = useLS('kg_theme', 'dark');
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  useEffect(() => {
    try { localStorage.removeItem('kg_demo_session'); } catch (e) { /* abaikan */ }
    if (!supabase) return undefined;
    let alive = true;
    const loadProfile = async (user) => {
      const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).maybeSingle();
      if (!alive) return;
      setSession({ userId: user.id, email: user.email, name: (data && data.name) || user.email, role: data && data.role === 'owner' ? 'owner' : 'cashier' });
      setBooting(false);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadProfile(data.session.user);
      else if (alive) setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (event === 'SIGNED_IN' && sess) setTimeout(() => loadProfile(sess.user), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const logout = async () => {
    setSession(null);
    if (supabase) await supabase.auth.signOut();
  };

  let body;
  if (booting) body = <Splash />;
  else if (!session) body = <LoginScreen theme={theme} onToggleTheme={toggleTheme} />;
  else body = <Shell key={session.role} session={session} cloud={CLOUD_ON} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div className={theme === 'light' ? 'tl' : 'td'}>
      <style>{GLOBAL_CSS}</style>
      {body}
    </div>
  );
}
