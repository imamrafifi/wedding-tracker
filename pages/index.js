import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Lock, Unlock, X, Plus, Trash2, ChevronRight, Check,
  Building2, Flower2, UtensilsCrossed, Mic2, BookOpen, Music4,
  Camera, Video, Sparkles, Shirt, Gift, Users, ScrollText,
  Image as ImageIcon
} from "lucide-react";

/* ---------------------------------------------------------
   DATA
--------------------------------------------------------- */


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

// Status badge shown on cards / detail. Uses the manually-picked status if set,
// otherwise falls back to a computed guess from harga/bayar (for older data).
function statusOf(cat) {
  if (cat.status && STATUS_META[cat.status]) return cat.status;
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

const STATUS_ORDER = ["belum-booking", "belum-bayar", "dp", "lunas"];

// Older saved data may have `detail` as a single text blob, or an old-style
// `sub` checklist ([{text, done}] or plain strings). Normalize everything to
// a plain array of strings so the current UI always has content to show.
function migrateCategory(c) {
  let detail = [];
  if (Array.isArray(c.detail)) {
    detail = c.detail.map((d) => (typeof d === "string" ? d : d.text)).filter(Boolean);
  } else if (typeof c.detail === "string" && c.detail.trim()) {
    detail = c.detail.split("\n").map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(c.sub)) {
    detail = c.sub.map((s) => (typeof s === "string" ? s : s.text)).filter(Boolean);
  }
  const { sub, ...rest } = c;
  return { ...rest, detail };
}

function emptyDraft() {
  return { name: "", vendor: "", status: "belum-booking", harga: 0, bayar: 0, note: "", deadline: "", detail: [] };
}

/* ---------------------------------------------------------
   CONFIRM DIALOG (custom — window.confirm is unreliable inside
   sandboxed webviews, so we never rely on native dialogs)
--------------------------------------------------------- */

function ConfirmDialog({ message, confirmLabel = "Ya", cancelLabel = "Batal", danger, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onCancel} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(42,38,33,0.55)" }} />
      <div style={{ position: "relative", background: "#FBF7F1", borderRadius: 16, padding: "22px 20px", width: "100%", maxWidth: 320, fontFamily: "'Manrope', sans-serif", boxShadow: "0 20px 50px rgba(42,38,33,0.35)" }}>
        <div style={{ fontSize: 14.5, color: "#2A2621", lineHeight: 1.5, textAlign: "center" }}>{message}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E5DFD2", background: "#fff", color: "#8A8375", fontWeight: 600, cursor: "pointer", fontSize: 13.5, fontFamily: "'Manrope', sans-serif" }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: danger ? "#B76E79" : "#2F4B3C", color: "#FBF7F1", fontWeight: 600, cursor: "pointer", fontSize: 13.5, fontFamily: "'Manrope', sans-serif" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN APP
--------------------------------------------------------- */

export default function WeddingTracker() {
  const [categories, setCategories] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filter, setFilter] = useState("semua");
  const [toast, setToast] = useState("");

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      return data.map(migrateCategory);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    (async () => {
      const data = await fetchCategories();
      if (data) setCategories(data);
      else {
        setCategories([]);
        showToast("Gagal memuat data dari server.");
      }
    })();
  }, []);

  // Keep every viewer's screen in sync with the shared database: poll
  // periodically and re-check whenever the tab regains focus. Skipped
  // while a modal is open so it never clobbers an in-progress edit.
  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = !!(activeId || addOpen || pinModalOpen || confirmDeleteId);
  }, [activeId, addOpen, pinModalOpen, confirmDeleteId]);

  useEffect(() => {
    async function refresh() {
      if (modalOpenRef.current) return;
      const data = await fetchCategories();
      if (!data) return;
      setCategories((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
    }
    const interval = setInterval(refresh, 8000);
    function onVisible() { if (document.visibilityState === "visible") refresh(); }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function saveCategory(id, draft) {
    const prev = categories;
    setCategories(categories.map((c) => (c.id === id ? { ...draft } : c)));
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("save failed");
      showToast("Perubahan disimpan.");
    } catch {
      setCategories(prev);
      showToast("Gagal menyimpan, coba lagi.");
    }
  }

  async function createCategory(draft) {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("create failed");
      const { id } = await res.json();
      setCategories((prev) => [...prev, { ...draft, id }]);
      setAddOpen(false);
      showToast("Item baru ditambahkan.");
    } catch {
      showToast("Gagal menambah item, coba lagi.");
    }
  }

  function requestDeleteCategory(id) {
    setConfirmDeleteId(id);
  }

  async function confirmDeleteCategory() {
    const id = confirmDeleteId;
    const prev = categories;
    setCategories(categories.filter((c) => c.id !== id));
    setActiveId(null);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      showToast("Item dihapus.");
    } catch {
      setCategories(prev);
      showToast("Gagal menghapus, coba lagi.");
    }
  }

  async function handlePinSubmit() {
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setEditMode(true);
        setPinModalOpen(false);
        setPinInput("");
        setPinError("");
        showToast("Mode edit aktif.");
      } else {
        setPinError("PIN salah.");
        setPinInput("");
      }
    } catch {
      setPinError("Gagal memeriksa PIN, coba lagi.");
    }
  }

  function openEditGate() {
    if (editMode) {
      setEditMode(false);
      showToast("Mode lihat saja.");
      return;
    }
    setPinModalOpen(true);
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

  if (categories === null) {
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
            onClick={() => setAddOpen(true)}
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
          key={active.id}
          cat={active}
          editMode={editMode}
          onClose={() => setActiveId(null)}
          onSave={(draft) => { saveCategory(active.id, draft); setActiveId(null); }}
          onDelete={() => requestDeleteCategory(active.id)}
        />
      )}

      {addOpen && (
        <AddItemModal
          onClose={() => setAddOpen(false)}
          onCreate={createCategory}
        />
      )}

      {pinModalOpen && (
        <PinModal
          value={pinInput}
          setValue={setPinInput}
          error={pinError}
          onSubmit={handlePinSubmit}
          onClose={() => { setPinModalOpen(false); setPinInput(""); setPinError(""); }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          message="Hapus item ini beserta detailnya?"
          confirmLabel="Hapus"
          danger
          onConfirm={confirmDeleteCategory}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "#2A2621", color: "#FBF7F1", padding: "10px 18px", borderRadius: 999,
          fontSize: 13, fontFamily: "'Manrope', sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 100,
          maxWidth: "88%", textAlign: "center"
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
      .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      .no-scrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }
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
            {harga > 0 ? rupiah(harga) : ((cat.detail || []).length ? `${cat.detail.length} detail` : "-")}
          </span>
        </div>
      </div>
      <ChevronRight size={17} color="#C9C2B2" style={{ flexShrink: 0 }} />
    </button>
  );
}

/* ---------------------------------------------------------
   STATUS PILLS (shared quick-set control)
--------------------------------------------------------- */

function StatusPills({ value, onSelect }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
        Status Pembayaran
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {STATUS_ORDER.map((key) => {
          const meta = STATUS_META[key];
          const isActive = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: "1.5px solid " + (isActive ? meta.dot : "#E5DFD2"),
                background: isActive ? meta.bg : "#fff",
                color: isActive ? meta.fg : "#9C9484",
                fontFamily: "'Manrope', sans-serif"
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   DETAIL LIST (plain bullet list — no checkbox — editable in edit mode)
--------------------------------------------------------- */

function DetailListEditor({ items, editable, newItem, setNewItem, onAdd, onRemove }) {
  const list = items || [];
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        Detail
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map((text, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #EFEAE0", borderRadius: 10, padding: "9px 10px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C7A25C", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13.5, color: "#2A2621" }}>{text}</span>
            {editable && (
              <button type="button" onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C9A0A6", padding: 2 }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div style={{ fontSize: 12.5, color: "#B0A996", padding: "4px 2px" }}>Belum ada detail tambahan.</div>
        )}
      </div>
      {editable && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
            placeholder="Tambah detail..."
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13, outline: "none", background: "#fff" }}
          />
          <button
            type="button"
            onClick={onAdd}
            style={{ background: "#2F4B3C", border: "none", borderRadius: 10, padding: "0 14px", color: "#fff", cursor: "pointer" }}
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   DETAIL SHEET (view + edit existing item, with Simpan button)
--------------------------------------------------------- */

function DetailSheet({ cat, editMode, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => ({ ...cat, status: cat.status || statusOf(cat) }));
  const [newItem, setNewItem] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const status = statusOf(draft);
  const meta = STATUS_META[status];
  const Icon = ICONS[cat.id] || Gift;
  const original = { ...cat, status: cat.status || statusOf(cat) };
  const isDirty = JSON.stringify(draft) !== JSON.stringify(original);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  function handleClose() {
    if (editMode && isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  }

  function addDetailItem() {
    if (!newItem.trim()) return;
    setDraft((d) => ({ ...d, detail: [...(d.detail || []), newItem.trim()] }));
    setNewItem("");
  }

  return (
    <>
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 14px" }}>
      <div onClick={handleClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(42,38,33,0.45)" }} />
      <div className="no-scrollbar" style={{
        position: "relative", background: "#FBF7F1", width: "100%", maxWidth: 480,
        maxHeight: "100%", overflowY: "scroll", WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain", touchAction: "pan-y",
        borderRadius: 22, padding: "10px 18px 28px",
        fontFamily: "'Manrope', sans-serif", boxSizing: "border-box",
        boxShadow: "0 20px 50px rgba(42,38,33,0.35)"
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
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, border: "none", background: "transparent", borderBottom: "1px dashed #C7A25C", color: "#2A2621", outline: "none", width: "100%" }}
              />
            ) : (
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, color: "#2A2621" }}>{draft.name}</div>
            )}
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9484", padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {!editMode && (
          <span style={{ display: "inline-block", marginTop: 10, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.fg }}>
            {meta.label}
          </span>
        )}

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {editMode && (
            <StatusPills value={draft.status} onSelect={(key) => setDraft((d) => ({ ...d, status: key }))} />
          )}

          <Field label="Vendor" editMode={editMode} value={draft.vendor} placeholder="Belum ada vendor" onChange={(v) => setDraft((d) => ({ ...d, vendor: v }))} />

          <div style={{ display: "flex", gap: 12 }}>
            <NumberField label="Harga" editMode={editMode} value={draft.harga} onChange={(v) => setDraft((d) => ({ ...d, harga: v }))} />
            <NumberField label="Sudah Dibayar" editMode={editMode} value={draft.bayar} onChange={(v) => setDraft((d) => ({ ...d, bayar: v }))} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#F1EEE5", borderRadius: 12, fontSize: 13 }}>
            <span style={{ color: "#8A8375" }}>Sisa Pembayaran</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#95475A" }}>
              {rupiah((Number(draft.harga) || 0) - (Number(draft.bayar) || 0))}
            </span>
          </div>

          <Field label="Deadline" editMode={editMode} value={draft.deadline} placeholder="Belum diatur" onChange={(v) => setDraft((d) => ({ ...d, deadline: v }))} />
          <Field label="Catatan" editMode={editMode} value={draft.note} placeholder="Tidak ada catatan" onChange={(v) => setDraft((d) => ({ ...d, note: v }))} multiline />
          <DetailListEditor
            items={draft.detail}
            editable={editMode}
            newItem={newItem}
            setNewItem={setNewItem}
            onAdd={addDetailItem}
            onRemove={(i) => setDraft((d) => ({ ...d, detail: (d.detail || []).filter((_, idx) => idx !== i) }))}
          />

          {editMode && (
            <>
              <button
                onClick={() => onSave(draft)}
                disabled={!draft.name.trim()}
                style={{
                  marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: draft.name.trim() ? "#2F4B3C" : "#B7C2BB", border: "none", color: "#FBF7F1",
                  borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 700,
                  cursor: draft.name.trim() ? "pointer" : "not-allowed", fontFamily: "'Manrope', sans-serif"
                }}
              >
                <Check size={16} /> Simpan Perubahan
              </button>
              <button
                onClick={onDelete}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: "1px solid #E9C6CB", color: "#95475A", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <Trash2 size={14} /> Hapus item ini
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    {confirmCloseOpen && (
      <ConfirmDialog
        message="Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?"
        confirmLabel="Tutup"
        danger
        onConfirm={onClose}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    )}
    </>
  );
}

/* ---------------------------------------------------------
   ADD ITEM MODAL (create a brand-new category)
--------------------------------------------------------- */

function AddItemModal({ onClose, onCreate }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [newItem, setNewItem] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(emptyDraft());

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  function handleClose() {
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  }

  function handleSubmit() {
    if (!draft.name.trim()) return;
    onCreate(draft);
  }

  function addDetailItem() {
    if (!newItem.trim()) return;
    setDraft((d) => ({ ...d, detail: [...(d.detail || []), newItem.trim()] }));
    setNewItem("");
  }

  return (
    <>
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 14px" }}>
      <div onClick={handleClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(42,38,33,0.45)" }} />
      <div className="no-scrollbar" style={{
        position: "relative", background: "#FBF7F1", width: "100%", maxWidth: 480,
        maxHeight: "100%", overflowY: "scroll", WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain", touchAction: "pan-y",
        borderRadius: 22, padding: "10px 18px 28px",
        fontFamily: "'Manrope', sans-serif", boxSizing: "border-box",
        boxShadow: "0 20px 50px rgba(42,38,33,0.35)"
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "#DDD5C4", margin: "6px auto 14px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, color: "#2A2621" }}>
            Tambah Item Baru
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9484", padding: 6 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: "#9C9484", marginTop: 2 }}>
          Item ini otomatis masuk ke perhitungan total biaya wedding.
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nama Item *" editMode value={draft.name} placeholder="Contoh: Dokumentasi Drone" onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
          <Field label="Vendor" editMode value={draft.vendor} placeholder="Belum ada vendor" onChange={(v) => setDraft((d) => ({ ...d, vendor: v }))} />

          <StatusPills value={draft.status} onSelect={(key) => setDraft((d) => ({ ...d, status: key }))} />

          <div style={{ display: "flex", gap: 12 }}>
            <NumberField label="Harga" editMode value={draft.harga} onChange={(v) => setDraft((d) => ({ ...d, harga: v }))} />
            <NumberField label="Sudah Dibayar" editMode value={draft.bayar} onChange={(v) => setDraft((d) => ({ ...d, bayar: v }))} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#F1EEE5", borderRadius: 12, fontSize: 13 }}>
            <span style={{ color: "#8A8375" }}>Sisa Pembayaran</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#95475A" }}>
              {rupiah((Number(draft.harga) || 0) - (Number(draft.bayar) || 0))}
            </span>
          </div>

          <Field label="Deadline" editMode value={draft.deadline} placeholder="Belum diatur" onChange={(v) => setDraft((d) => ({ ...d, deadline: v }))} />
          <Field label="Catatan" editMode value={draft.note} placeholder="Tidak ada catatan" onChange={(v) => setDraft((d) => ({ ...d, note: v }))} multiline />
          <DetailListEditor
            items={draft.detail}
            editable
            newItem={newItem}
            setNewItem={setNewItem}
            onAdd={addDetailItem}
            onRemove={(i) => setDraft((d) => ({ ...d, detail: (d.detail || []).filter((_, idx) => idx !== i) }))}
          />

          <button
            onClick={handleSubmit}
            disabled={!draft.name.trim()}
            style={{
              marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: draft.name.trim() ? "#2F4B3C" : "#B7C2BB", border: "none", color: "#FBF7F1",
              borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 700,
              cursor: draft.name.trim() ? "pointer" : "not-allowed", fontFamily: "'Manrope', sans-serif"
            }}
          >
            <Plus size={16} /> Tambah Item
          </button>
        </div>
      </div>
    </div>
    {confirmCloseOpen && (
      <ConfirmDialog
        message="Batalkan penambahan item ini?"
        confirmLabel="Batalkan"
        danger
        onConfirm={onClose}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    )}
    </>
  );
}

/* ---------------------------------------------------------
   FIELD PRIMITIVES
--------------------------------------------------------- */

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

function PinModal({ value, setValue, error, onSubmit, onClose }) {
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
          Masukkan PIN
        </div>
        <div style={{ fontSize: 12.5, color: "#9C9484", textAlign: "center", marginTop: 4 }}>
          Masukkan PIN untuk masuk mode edit.
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
            Masuk
          </button>
        </div>
      </div>
    </div>
  );
}
