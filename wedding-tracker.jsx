import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Lock, Unlock, X, Plus, Trash2, ChevronRight, Check,
  Building2, Flower2, UtensilsCrossed, Mic2, BookOpen, Music4,
  Camera, Video, Sparkles, Shirt, Gift, Users, ScrollText,
  Wallet, PartyPopper, Image as ImageIcon
} from "lucide-react";

/* ---------------------------------------------------------
   DATA
--------------------------------------------------------- */

const SEED_CATEGORIES = [
  { id: "venue", name: "Venue", vendor: "Auditorium UNP (add VIP room)", harga: 51000000, bayar: 5100000, note: "Dp by Sharly", deadline: "H-7", sub: [] },
  { id: "decor", name: "Decor & Pelaminan", vendor: "Humaira", harga: 86850000, bayar: 2500000, note: "Keep by Rafi (2jt)", deadline: "H-7", sub: [
    "Pelaminan Minang Modern", "Kain latar belakang hitam", "Taman Artificial Depan Pelaminan",
    "Gazebo 4x4 Ukiran Bunga", "Backdrop Penerima Tamu", "Backdrop Penerima Souvenir",
    "Photobooth", "Gallery Photo", "Backdrop Musik", "Lantai Mika + Mini Garden + Lampu Standing",
    "Dekorasi Akad Nikah", "Dekorasi Tiang Gorden + Lampu Kristal"
  ]},
  { id: "catering", name: "Catering", vendor: "Manti", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "penghulu", name: "Penghulu", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "souvenir", name: "Souvenir", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "mc", name: "MC", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "buku-tamu", name: "Paket Penanti Buku Tamu", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "tari", name: "Tari", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "band", name: "Band", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "wo", name: "WO", vendor: "Arunika", harga: 12000000, bayar: 3000000, note: "Dp by Rafi (24-05-2026)", deadline: "", sub: [] },
  { id: "foto", name: "Foto (Prewed & Wedding)", vendor: "Rozzy Motret", harga: 13500000, bayar: 6000000, note: "Dp by Rafi (09-07-2026)", deadline: "", sub: [] },
  { id: "video", name: "Video", vendor: "By Erenka", harga: 9000000, bayar: 2000000, note: "Dp by Sharly (24-07-2026)", deadline: "H+2", sub: [
    "Dokumentasi Akad+Resepsi (25-30 menit)", "Cinema Video (3-5 Menit) + Teaser Instagram"
  ]},
  { id: "photobooth", name: "Photobooth", vendor: "Rewindbooth", harga: 5500000, bayar: 0, note: "", deadline: "", sub: ["Package 7 hours"] },
  { id: "content-creator", name: "Wedding Content Creator", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "baju-pengantin", name: "Baju Pengantin", vendor: "Gadih Nan Tongga", harga: 10000000, bayar: 10000000, note: "Lunas by Sharly (29-06-2026)", deadline: "", sub: ["Baju Akad + Resepsi + Sunting"] },
  { id: "baju-ortu", name: "Baju Orang Tua", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "baju-adek-cpw", name: "Baju Adek CPW", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "baju-adek-cpp", name: "Baju Adek CPP", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "mua-cpw", name: "MUA CPW", vendor: "Randita Larasati", harga: 6000000, bayar: 1500000, note: "Dp by Sharly (14-05-2026)", deadline: "H-3", sub: [] },
  { id: "henna-cpw", name: "Henna CPW", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "mua-cpp", name: "MUA CPP", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "mua-mama", name: "MUA Mama + Aurel", vendor: "", harga: 1500000, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "invitation-fisik", name: "Physical Invitation", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
  { id: "invitation-digital", name: "Digital Invitation", vendor: "Eenvited", harga: 0, bayar: 0, note: "", deadline: "", sub: ["(Include Rozzy Motret)"] },
  { id: "hand-bouquet", name: "Hand Bouquet", vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] },
];

const ICONS = {
  venue: Building2, decor: Flower2, catering: UtensilsCrossed, penghulu: ScrollText,
  souvenir: Gift, mc: Mic2, "buku-tamu": BookOpen, tari: Music4, band: Music4,
  wo: Users, foto: Camera, video: Video, photobooth: ImageIcon,
  "content-creator": Sparkles, "baju-pengantin": Shirt, "baju-ortu": Shirt,
  "baju-adek-cpw": Shirt, "baju-adek-cpp": Shirt, "mua-cpw": Sparkles,
  "henna-cpw": Sparkles, "mua-cpp": Sparkles, "mua-mama": Sparkles,
  "invitation-fisik": ScrollText, "invitation-digital": ScrollText, "hand-bouquet": Flower2,
};

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function rupiah(n) {
  const v = Number(n) || 0;
  return "Rp " + v.toLocaleString("id-ID");
}

function statusOf(cat) {
  const harga = Number(cat.harga) || 0;
  const bayar = Number(cat.bayar) || 0;
  if (!cat.vendor && harga === 0) return "belum-booking";
  if (harga > 0 && bayar >= harga) return "lunas";
  if (bayar > 0) return "dp";
  return "belum-bayar";
}

const STATUS_META = {
  "lunas": { label: "Lunas", bg: "#EAF1EC", fg: "#2F4B3C", dot: "#2F4B3C" },
  "dp": { label: "DP", bg: "#FBF1DC", fg: "#8A6A22", dot: "#C7A25C" },
  "belum-bayar": { label: "Belum Bayar", bg: "#F7EAEC", fg: "#95475A", dot: "#B76E79" },
  "belum-booking": { label: "Belum Booking", bg: "#F1EFEA", fg: "#8A8375", dot: "#B7B0A0" },
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* ---------------------------------------------------------
   MAIN APP
--------------------------------------------------------- */

export default function WeddingTracker() {
  const [categories, setCategories] = useState(null);
  const [pin, setPin] = useState(undefined); // undefined = loading, null = not set
  const [editMode, setEditMode] = useState(false);
  const [pinModal, setPinModal] = useState(null); // 'set' | 'enter' | null
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState("semua");
  const [toast, setToast] = useState("");
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const catRes = await window.storage.get("wedding-categories", true);
        setCategories(catRes ? JSON.parse(catRes.value) : SEED_CATEGORIES);
      } catch {
        setCategories(SEED_CATEGORIES);
      }
      try {
        const pinRes = await window.storage.get("wedding-pin", true);
        setPin(pinRes ? pinRes.value : null);
      } catch {
        setPin(null);
      }
    })();
  }, []);

  function persist(next) {
    setCategories(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set("wedding-categories", JSON.stringify(next), true);
      } catch {
        showToast("Gagal menyimpan, coba lagi.");
      }
    }, 250);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function updateCategory(id, patch) {
    if (!editMode) return;
    const next = categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
    persist(next);
  }

  function toggleSub(catId, idx) {
    if (!editMode) return;
    const next = categories.map((c) => {
      if (c.id !== catId) return c;
      const sub = c.sub.map((s, i) =>
        i === idx ? (typeof s === "string" ? { text: s, done: true } : { ...s, done: !s.done }) : s
      );
      return { ...c, sub };
    });
    persist(next);
  }

  function addSubItem(catId, text) {
    if (!text.trim()) return;
    const next = categories.map((c) =>
      c.id === catId ? { ...c, sub: [...c.sub, { text: text.trim(), done: false }] } : c
    );
    persist(next);
  }

  function removeSubItem(catId, idx) {
    const next = categories.map((c) =>
      c.id === catId ? { ...c, sub: c.sub.filter((_, i) => i !== idx) } : c
    );
    persist(next);
  }

  function addCategory() {
    const name = window.prompt("Nama item baru:");
    if (!name || !name.trim()) return;
    const id = uid();
    const next = [...categories, { id, name: name.trim(), vendor: "", harga: 0, bayar: 0, note: "", deadline: "", sub: [] }];
    persist(next);
    setActiveId(id);
  }

  function deleteCategory(id) {
    if (!window.confirm("Hapus item ini beserta detailnya?")) return;
    persist(categories.filter((c) => c.id !== id));
    setActiveId(null);
  }

  async function handlePinSubmit() {
    if (pinModal === "set") {
      if (pinInput.length < 4) {
        setPinError("Minimal 4 digit.");
        return;
      }
      try {
        await window.storage.set("wedding-pin", pinInput, true);
        setPin(pinInput);
        setEditMode(true);
        setPinModal(null);
        setPinInput("");
        setPinError("");
        showToast("Mode edit aktif.");
      } catch {
        setPinError("Gagal menyimpan PIN.");
      }
    } else if (pinModal === "enter") {
      if (pinInput === pin) {
        setEditMode(true);
        setPinModal(null);
        setPinInput("");
        setPinError("");
        showToast("Mode edit aktif.");
      } else {
        setPinError("PIN salah.");
        setPinInput("");
      }
    }
  }

  function openEditGate() {
    if (editMode) {
      setEditMode(false);
      showToast("Mode lihat saja.");
      return;
    }
    if (pin === null) {
      setPinModal("set");
    } else {
      setPinModal("enter");
    }
  }

  const totals = useMemo(() => {
    if (!categories) return { harga: 0, bayar: 0, sisa: 0, pct: 0, lunas: 0, dp: 0, belum: 0 };
    let harga = 0, bayar = 0, lunas = 0, dp = 0, belum = 0;
    categories.forEach((c) => {
      harga += Number(c.harga) || 0;
      bayar += Number(c.bayar) || 0;
      const s = statusOf(c);
      if (s === "lunas") lunas++;
      else if (s === "dp") dp++;
      else belum++;
    });
    const pct = harga > 0 ? Math.round((bayar / harga) * 100) : 0;
    return { harga, bayar, sisa: harga - bayar, pct, lunas, dp, belum };
  }, [categories]);

  const filtered = useMemo(() => {
    if (!categories) return [];
    if (filter === "semua") return categories;
    return categories.filter((c) => statusOf(c) === filter);
  }, [categories, filter]);

  const active = categories?.find((c) => c.id === activeId) || null;

  if (categories === null || pin === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF7F1", fontFamily: "Manrope, sans-serif", color: "#8A8375" }}>
        Memuat...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FBF7F1", fontFamily: "'Manrope', sans-serif", color: "#2A2621", paddingBottom: 40 }}>
      <FontLoader />
      <Header totals={totals} editMode={editMode} onEditToggle={openEditGate} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
        <FilterTabs filter={filter} setFilter={setFilter} totals={totals} count={categories.length} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {filtered.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} onClick={() => setActiveId(cat.id)} />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#B0A996", fontSize: 14 }}>
              Tidak ada item di kategori ini.
            </div>
          )}
        </div>

        {editMode && (
          <button
            onClick={addCategory}
            style={{
              marginTop: 18, width: "100%", padding: "13px", borderRadius: 14,
              border: "1.5px dashed #C7A25C", background: "transparent", color: "#8A6A22",
              fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer"
            }}
          >
            <Plus size={16} /> Tambah item
          </button>
        )}
      </div>

      {active && (
        <DetailSheet
          cat={active}
          editMode={editMode}
          onClose={() => setActiveId(null)}
          onUpdate={(patch) => updateCategory(active.id, patch)}
          onToggleSub={(idx) => toggleSub(active.id, idx)}
          onAddSub={(text) => addSubItem(active.id, text)}
          onRemoveSub={(idx) => removeSubItem(active.id, idx)}
          onDelete={() => deleteCategory(active.id)}
        />
      )}

      {pinModal && (
        <PinModal
          mode={pinModal}
          value={pinInput}
          setValue={setPinInput}
          error={pinError}
          onSubmit={handlePinSubmit}
          onClose={() => { setPinModal(null); setPinInput(""); setPinError(""); }}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "#2A2621", color: "#FBF7F1", padding: "10px 18px", borderRadius: 999,
          fontSize: 13, fontFamily: "'Manrope', sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 100
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   FONT LOADER
--------------------------------------------------------- */
function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      input, textarea { font-family: 'Manrope', sans-serif; }
      ::selection { background: #C7A25C55; }
    `}</style>
  );
}

/* ---------------------------------------------------------
   HEADER + RING
--------------------------------------------------------- */

function Header({ totals, editMode, onEditToggle }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(totals.pct, 100) / 100) * c;

  return (
    <div style={{ background: "#2F4B3C", padding: "28px 16px 26px", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.08,
        backgroundImage: "radial-gradient(circle at 20% 20%, #C7A25C 0, transparent 40%), radial-gradient(circle at 85% 75%, #C7A25C 0, transparent 45%)"
      }} />
      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#D9C79A", fontSize: 13, letterSpacing: 1 }}>
              Wedding Progress
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: "#FBF7F1", fontSize: 30, lineHeight: 1.1, marginTop: 2 }}>
              Rafi & Sharly
            </div>
          </div>
          <button
            onClick={onEditToggle}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: editMode ? "#C7A25C" : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)", color: editMode ? "#2A2621" : "#FBF7F1",
              padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Manrope', sans-serif"
            }}
          >
            {editMode ? <Unlock size={14} /> : <Lock size={14} />}
            {editMode ? "Edit Aktif" : "Mode Edit"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 22, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
              <circle
                cx="50" cy="50" r={r} fill="none" stroke="#C7A25C" strokeWidth="7"
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", color: "#FBF7F1"
            }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 500 }}>{totals.pct}%</div>
              <div style={{ fontSize: 9, color: "#D9C79A", marginTop: -2 }}>terbayar</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 }}>
            <StatRow label="Total Anggaran" value={rupiah(totals.harga)} />
            <StatRow label="Sudah Dibayar" value={rupiah(totals.bayar)} accent="#C7A25C" />
            <StatRow label="Sisa" value={rupiah(totals.sisa)} accent="#E8B4BC" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "rgba(251,247,241,0.65)" }}>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: accent || "#FBF7F1", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------
   FILTER TABS
--------------------------------------------------------- */

function FilterTabs({ filter, setFilter, totals, count }) {
  const tabs = [
    { key: "semua", label: `Semua (${count})` },
    { key: "lunas", label: `Lunas (${totals.lunas})` },
    { key: "dp", label: `DP (${totals.dp})` },
    { key: "belum-bayar", label: "Belum Bayar" },
    { key: "belum-booking", label: "Belum Booking" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 0 4px", marginBottom: -4 }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setFilter(t.key)}
          style={{
            flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
            border: "1px solid " + (filter === t.key ? "#2F4B3C" : "#E5DFD2"),
            background: filter === t.key ? "#2F4B3C" : "#fff",
            color: filter === t.key ? "#FBF7F1" : "#8A8375",
            cursor: "pointer", fontFamily: "'Manrope', sans-serif", whiteSpace: "nowrap"
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   CATEGORY CARD
--------------------------------------------------------- */

function CategoryCard({ cat, onClick }) {
  const status = statusOf(cat);
  const meta = STATUS_META[status];
  const Icon = ICONS[cat.id] || Gift;
  const harga = Number(cat.harga) || 0;
  const bayar = Number(cat.bayar) || 0;
  const pct = harga > 0 ? Math.min(100, Math.round((bayar / harga) * 100)) : 0;
  const doneSub = cat.sub.filter((s) => typeof s === "object" && s.done).length;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, background: "#fff",
        border: "1px solid #EFEAE0", borderRadius: 16, padding: "13px 14px",
        textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "'Manrope', sans-serif",
        boxShadow: "0 1px 2px rgba(42,38,33,0.04)"
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        border: "1.5px solid #E9D9B6", background: "#FBF7F1",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#8A6A22"
      }}>
        <Icon size={19} strokeWidth={1.7} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "#2A2621", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cat.name}
          </div>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
            background: meta.bg, color: meta.fg, flexShrink: 0
          }}>
            {meta.label}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "#9C9484", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cat.vendor || "Belum ada vendor"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 999, background: "#F1EEE5", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: meta.dot, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#B0A996", flexShrink: 0 }}>
            {harga > 0 ? rupiah(harga) : (cat.sub.length ? `${doneSub}/${cat.sub.length}` : "-")}
          </span>
        </div>
      </div>
      <ChevronRight size={17} color="#C9C2B2" style={{ flexShrink: 0 }} />
    </button>
  );
}

/* ---------------------------------------------------------
   DETAIL SHEET
--------------------------------------------------------- */

function DetailSheet({ cat, editMode, onClose, onUpdate, onToggleSub, onAddSub, onRemoveSub, onDelete }) {
  const [newSub, setNewSub] = useState("");
  const status = statusOf(cat);
  const meta = STATUS_META[status];
  const Icon = ICONS[cat.id] || Gift;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,38,33,0.45)" }} />
      <div style={{
        position: "relative", background: "#FBF7F1", width: "100%", maxWidth: 640, margin: "0 auto",
        maxHeight: "88vh", overflowY: "auto", borderRadius: "22px 22px 0 0", padding: "10px 18px 28px",
        fontFamily: "'Manrope', sans-serif", animation: "none"
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "#DDD5C4", margin: "6px auto 14px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%", border: "1.5px solid #E9D9B6",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#8A6A22", flexShrink: 0
            }}>
              <Icon size={18} strokeWidth={1.7} />
            </div>
            {editMode ? (
              <input
                value={cat.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, border: "none", background: "transparent", borderBottom: "1px dashed #C7A25C", color: "#2A2621", outline: "none", width: "100%" }}
              />
            ) : (
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, color: "#2A2621" }}>{cat.name}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9484", padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        <span style={{ display: "inline-block", marginTop: 10, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.fg }}>
          {meta.label}
        </span>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Vendor" editMode={editMode} value={cat.vendor} placeholder="Belum ada vendor" onChange={(v) => onUpdate({ vendor: v })} />

          <div style={{ display: "flex", gap: 12 }}>
            <NumberField label="Harga" editMode={editMode} value={cat.harga} onChange={(v) => onUpdate({ harga: v })} />
            <NumberField label="Sudah Dibayar" editMode={editMode} value={cat.bayar} onChange={(v) => onUpdate({ bayar: v })} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#F1EEE5", borderRadius: 12, fontSize: 13 }}>
            <span style={{ color: "#8A8375" }}>Sisa Pembayaran</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#95475A" }}>
              {rupiah((Number(cat.harga) || 0) - (Number(cat.bayar) || 0))}
            </span>
          </div>

          <Field label="Deadline" editMode={editMode} value={cat.deadline} placeholder="Belum diatur" onChange={(v) => onUpdate({ deadline: v })} />
          <Field label="Catatan" editMode={editMode} value={cat.note} placeholder="Tidak ada catatan" onChange={(v) => onUpdate({ note: v })} multiline />

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
              Checklist Detail {cat.sub.length > 0 && `(${cat.sub.filter(s => typeof s === "object" && s.done).length}/${cat.sub.length})`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cat.sub.map((s, i) => {
                const text = typeof s === "string" ? s : s.text;
                const done = typeof s === "object" && s.done;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #EFEAE0", borderRadius: 10, padding: "9px 10px" }}>
                    <button
                      onClick={() => onToggleSub(i)}
                      disabled={!editMode}
                      style={{
                        width: 19, height: 19, borderRadius: 6, flexShrink: 0, border: "1.5px solid " + (done ? "#2F4B3C" : "#D9D2C2"),
                        background: done ? "#2F4B3C" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: editMode ? "pointer" : "default"
                      }}
                    >
                      {done && <Check size={13} color="#fff" strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13.5, color: done ? "#B0A996" : "#2A2621", textDecoration: done ? "line-through" : "none" }}>
                      {text}
                    </span>
                    {editMode && (
                      <button onClick={() => onRemoveSub(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C9A0A6", padding: 2 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {cat.sub.length === 0 && !editMode && (
                <div style={{ fontSize: 12.5, color: "#B0A996", padding: "4px 2px" }}>Belum ada detail tambahan.</div>
              )}
            </div>
            {editMode && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { onAddSub(newSub); setNewSub(""); } }}
                  placeholder="Tambah detail..."
                  style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13, outline: "none", background: "#fff" }}
                />
                <button
                  onClick={() => { onAddSub(newSub); setNewSub(""); }}
                  style={{ background: "#2F4B3C", border: "none", borderRadius: 10, padding: "0 14px", color: "#fff", cursor: "pointer" }}
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {editMode && (
            <button
              onClick={onDelete}
              style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: "1px solid #E9C6CB", color: "#95475A", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <Trash2 size={14} /> Hapus item ini
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, editMode, placeholder, multiline }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      {editMode ? (
        multiline ? (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, outline: "none", resize: "none", background: "#fff", fontFamily: "'Manrope', sans-serif" }}
          />
        ) : (
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, outline: "none", background: "#fff", fontFamily: "'Manrope', sans-serif" }}
          />
        )
      ) : (
        <div style={{ fontSize: 14, color: value ? "#2A2621" : "#B0A996" }}>{value || placeholder}</div>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, editMode }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      {editMode ? (
        <input
          type="number"
          value={value || 0}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, outline: "none", background: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}
        />
      ) : (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#2A2621" }}>{rupiah(value)}</div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   PIN MODAL
--------------------------------------------------------- */

function PinModal({ mode, value, setValue, error, onSubmit, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,38,33,0.5)" }} />
      <div style={{ position: "relative", background: "#FBF7F1", borderRadius: 18, padding: "24px 22px", width: "100%", maxWidth: 320, fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#2F4B3C", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} color="#C7A25C" />
          </div>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 19, textAlign: "center", color: "#2A2621" }}>
          {mode === "set" ? "Buat PIN Edit" : "Masukkan PIN"}
        </div>
        <div style={{ fontSize: 12.5, color: "#9C9484", textAlign: "center", marginTop: 4 }}>
          {mode === "set" ? "PIN ini hanya untuk kamu, dipakai untuk mengubah data." : "Masukkan PIN untuk masuk mode edit."}
        </div>

        <input
          type="password"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          autoFocus
          style={{
            width: "100%", marginTop: 16, padding: "12px", borderRadius: 12, border: "1px solid #E5DFD2",
            fontSize: 20, textAlign: "center", letterSpacing: 8, outline: "none", background: "#fff"
          }}
        />
        {error && <div style={{ color: "#B76E79", fontSize: 12, textAlign: "center", marginTop: 6 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E5DFD2", background: "#fff", color: "#8A8375", fontWeight: 600, cursor: "pointer", fontSize: 13.5 }}>
            Batal
          </button>
          <button onClick={onSubmit} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#2F4B3C", color: "#FBF7F1", fontWeight: 600, cursor: "pointer", fontSize: 13.5 }}>
            {mode === "set" ? "Simpan" : "Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
