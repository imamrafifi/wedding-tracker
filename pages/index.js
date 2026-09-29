import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Lock, Unlock, X, Plus, Trash2, ChevronRight, Check,
  Building2, Flower2, UtensilsCrossed, Mic2, BookOpen, Music4,
  Camera, Video, Sparkles, Shirt, Gift, Users, ScrollText,
  Image as ImageIcon, Wallet, Printer, FileDown,
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

/* ---------------------------------------------------------
   CONSTANTS
--------------------------------------------------------- */

const PEOPLE = ["Rafi", "Sharly"];
const STATUS_META = {
  "lunas": { label: "Lunas", bg: "#EAF1EC", fg: "#2F4B3C", dot: "#2F4B3C" },
  "dp": { label: "DP", bg: "#FBF1DC", fg: "#8A6A22", dot: "#C7A25C" },
  "belum-bayar": { label: "Belum Bayar", bg: "#F7EAEC", fg: "#95475A", dot: "#B76E79" },
  "belum-booking": { label: "Belum Booking", bg: "#F1EFEA", fg: "#8A8375", dot: "#B7B0A0" },
};
const STATUS_ORDER = ["belum-bayar", "dp", "lunas"];
const FILTER_ORDER = ["lunas", "dp", "belum-bayar", "belum-booking"];

function rupiah(n) {
  const v = Number(n) || 0;
  return "Rp " + v.toLocaleString("id-ID");
}
function uid() { return Math.random().toString(36).slice(2, 9); }

function effectiveStatus(cat) {
  const harga = Number(cat.harga) || 0;
  const bayar = (Number(cat.dpAmount) || 0) + (Number(cat.lunasAmount) || 0);
  if (!cat.vendor && harga === 0) return "belum-booking";
  if (harga > 0 && bayar >= harga) return "lunas";
  if (bayar > 0) return "dp";
  return "belum-bayar";
}

function migrateCategory(c) {
  let detail = [];
  if (Array.isArray(c.detail)) {
    detail = c.detail.map((d) => (typeof d === "string" ? d : d.text)).filter(Boolean);
  } else if (typeof c.detail === "string" && c.detail.trim()) {
    detail = c.detail.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return { ...c, detail };
}

function emptyDraft() {
  return {
    name: "", vendor: "", harga: 0, status: "belum-bayar",
    dpAmount: 0, dpBy: "", lunasAmount: 0, lunasBy: "",
    deadline: "", note: "", detail: [],
  };
}

function computeRekap(categories, rafiPct, sharlyPct) {
  const totalAnggaran = categories.reduce((sum, c) => sum + (Number(c.harga) || 0), 0);
  const targetRafi = totalAnggaran * ((Number(rafiPct) || 0) / 100);
  const targetSharly = totalAnggaran * ((Number(sharlyPct) || 0) / 100);

  let dpRafi = 0, lunasRafi = 0, dpSharly = 0, lunasSharly = 0;
  categories.forEach((c) => {
    const dp = Number(c.dpAmount) || 0;
    const lunas = Number(c.lunasAmount) || 0;
    if (c.dpBy === "Rafi") dpRafi += dp;
    if (c.dpBy === "Sharly") dpSharly += dp;
    if (c.lunasBy === "Rafi") lunasRafi += lunas;
    if (c.lunasBy === "Sharly") lunasSharly += lunas;
  });
  const progressRafi = dpRafi + lunasRafi;
  const progressSharly = dpSharly + lunasSharly;

  return {
    totalAnggaran, targetRafi, targetSharly,
    dpRafi, lunasRafi, progressRafi, sisaRafi: targetRafi - progressRafi,
    dpSharly, lunasSharly, progressSharly, sisaSharly: targetSharly - progressSharly,
  };
}

const ICON_MAP = {
  venue: Building2, gedung: Building2, auditorium: Building2, hall: Building2, hotel: Building2, ballroom: Building2,
  dekor: Flower2, pelaminan: Flower2, bunga: Flower2, bouquet: Flower2, buket: Flower2,
  catering: UtensilsCrossed, makan: UtensilsCrossed, kuliner: UtensilsCrossed, snack: UtensilsCrossed,
  foto: Camera, video: Video, dokumentasi: Camera, prewed: Camera,
  baju: Shirt, gaun: Shirt, jas: Shirt, kebaya: Shirt, busana: Shirt, sunting: Shirt,
  mua: Sparkles, rias: Sparkles, henna: Sparkles, makeup: Sparkles,
  souvenir: Gift, hadiah: Gift, seserahan: Gift, rantiang: Gift,
  band: Music4, musik: Music4, tari: Music4, organ: Music4,
  mc: Mic2,
  wo: Users, organizer: Users, penghulu: Users,
  undangan: ScrollText, invitation: ScrollText, "buku tamu": BookOpen,
};
function pickIcon(name) {
  const n = (name || "").toLowerCase();
  for (const key in ICON_MAP) if (n.includes(key)) return ICON_MAP[key];
  return Gift;
}

/* ---------------------------------------------------------
   CONFIRM DIALOG
--------------------------------------------------------- */

function ConfirmDialog({ message, confirmLabel = "Ya", cancelLabel = "Batal", danger, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(42,38,33,0.55)" }} />
      <div style={{ position: "relative", background: "#FBF7F1", borderRadius: 16, padding: "22px 20px", width: "100%", maxWidth: 320, boxShadow: "0 20px 50px rgba(42,38,33,0.35)" }}>
        <div style={{ fontSize: 14.5, color: "#2A2621", lineHeight: 1.5, textAlign: "center" }}>{message}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E5DFD2", background: "#fff", color: "#8A8375", fontWeight: 600, cursor: "pointer", fontSize: 13.5 }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: danger ? "#B76E79" : "#2F4B3C", color: "#FBF7F1", fontWeight: 600, cursor: "pointer", fontSize: 13.5 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   FIELD PRIMITIVES
--------------------------------------------------------- */

function Field({ label, value, onChange, editMode, placeholder, multiline, type = "text" }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      {editMode ? (
        multiline ? (
          <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, resize: "none", background: "#fff", fontFamily: "'Manrope', sans-serif" }} />
        ) : (
          <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, background: "#fff", fontFamily: "'Manrope', sans-serif" }} />
        )
      ) : (
        <div style={{ fontSize: 14, color: value ? "#2A2621" : "#B0A996" }}>{value || placeholder}</div>
      )}
    </div>
  );
}

function RupiahInput({ label, value, onChange }) {
  const displayValue = value ? "Rp " + Number(value).toLocaleString("id-ID") : "";
  function handleChange(e) {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    onChange(digits ? Number(digits) : 0);
  }
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      <input
        type="text" inputMode="numeric" value={displayValue} onChange={handleChange} placeholder="Rp 0"
        style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, background: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}
      />
    </div>
  );
}

function PercentInput({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      <input type="number" value={value === "" ? "" : value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, background: "#fff", fontFamily: "'IBM Plex Mono', monospace" }} />
    </div>
  );
}

function ReadOnlyField({ label, value, tone }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      <div style={{ padding: "9px 12px", borderRadius: 10, background: "#F1EEE5", fontSize: 13.5, fontFamily: "'IBM Plex Mono', monospace", color: tone || "#95475A" }}>{value}</div>
    </div>
  );
}

function PersonSelect({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, background: "#fff", color: value ? "#2A2621" : "#B0A996" }}>
        <option value="">Belum dipilih</option>
        {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Status Pembayaran</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13.5, background: "#fff", fontWeight: 600, color: STATUS_META[value].fg }}>
        {STATUS_ORDER.map((k) => <option key={k} value={k}>{STATUS_META[k].label}</option>)}
      </select>
    </div>
  );
}

/* ---------------------------------------------------------
   DETAIL LIST
--------------------------------------------------------- */

function DetailListEditor({ items, editable, newItem, setNewItem, onAdd, onRemove }) {
  const list = items || [];
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Detail</div>
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
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid #E5DFD2", fontSize: 13, background: "#fff" }}
          />
          <button type="button" onClick={onAdd} style={{ background: "#2F4B3C", border: "none", borderRadius: 10, padding: "0 14px", color: "#fff", cursor: "pointer" }}>
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   CONDITIONAL FIELDS
--------------------------------------------------------- */

function ConditionalFields({ draft, setDraft }) {
  const harga = Number(draft.harga) || 0;

  if (draft.status === "belum-bayar") return null;

  if (draft.status === "dp") {
    const sisa = harga - (Number(draft.dpAmount) || 0);
    return (
      <>
        <div style={{ display: "flex", gap: 12 }}>
          <RupiahInput label="Jumlah DP" value={draft.dpAmount} onChange={(v) => setDraft((d) => ({ ...d, dpAmount: v }))} />
          <PersonSelect label="DP By" value={draft.dpBy} onChange={(v) => setDraft((d) => ({ ...d, dpBy: v }))} />
        </div>
        <ReadOnlyField label="Sisa Pembayaran" value={rupiah(sisa)} />
        <Field label="Deadline" type="date" editMode value={draft.deadline} onChange={(v) => setDraft((d) => ({ ...d, deadline: v }))} />
        <Field label="Catatan" multiline editMode value={draft.note} placeholder="Tidak ada catatan" onChange={(v) => setDraft((d) => ({ ...d, note: v }))} />
      </>
    );
  }

  if (draft.status === "lunas") {
    const sisaSebelumLunas = harga - (Number(draft.dpAmount) || 0);
    const isReallySettled = (Number(draft.lunasAmount) || 0) === sisaSebelumLunas && sisaSebelumLunas >= 0;
    return (
      <>
        <ReadOnlyField label="Sisa Pembayaran" value={rupiah(sisaSebelumLunas)} />
        <div style={{ display: "flex", gap: 12 }}>
          <RupiahInput label="Jumlah Pelunasan" value={draft.lunasAmount} onChange={(v) => setDraft((d) => ({ ...d, lunasAmount: v }))} />
          <PersonSelect label="Lunas By" value={draft.lunasBy} onChange={(v) => setDraft((d) => ({ ...d, lunasBy: v }))} />
        </div>
        {!isReallySettled && (
          <div style={{ fontSize: 12, color: "#B76E79", background: "#F7EAEC", borderRadius: 10, padding: "8px 10px" }}>
            Jumlah Pelunasan belum sama dengan Sisa Pembayaran ({rupiah(sisaSebelumLunas)}) — status belum akan tercatat "Lunas" sampai jumlahnya pas.
          </div>
        )}
        <Field label="Catatan" multiline editMode value={draft.note} placeholder="Tidak ada catatan" onChange={(v) => setDraft((d) => ({ ...d, note: v }))} />
      </>
    );
  }

  return null;
}

/* ---------------------------------------------------------
   ADD ITEM MODAL
--------------------------------------------------------- */

function AddItemModal({ onClose, onCreate }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [newItem, setNewItem] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(emptyDraft());

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevBody; };
  }, []);

  function handleClose() { if (isDirty) { setConfirmCloseOpen(true); return; } onClose(); }
  function handleSubmit() { if (!draft.name.trim()) return; onCreate(draft); }
  function addDetailItem() { if (!newItem.trim()) return; setDraft((d) => ({ ...d, detail: [...(d.detail || []), newItem.trim()] })); setNewItem(""); }

  return (
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 14px" }}>
      <div onClick={handleClose} style={{ position: "absolute", inset: 0, background: "rgba(42,38,33,0.45)" }} />
      <div className="no-scrollbar" style={{ position: "relative", background: "#FBF7F1", width: "100%", maxWidth: 480, maxHeight: "100%", overflowY: "scroll", borderRadius: 22, padding: "10px 18px 28px", boxShadow: "0 20px 50px rgba(42,38,33,0.35)", boxSizing: "border-box" }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "#DDD5C4", margin: "6px auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, color: "#2A2621" }}>Tambah Item Baru</div>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9484" }}><X size={20} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: "#9C9484", marginTop: 2 }}>Item ini otomatis masuk ke perhitungan total biaya wedding.</div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nama Item *" editMode value={draft.name} placeholder="Contoh: Dokumentasi Drone" onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
          <Field label="Vendor" editMode value={draft.vendor} placeholder="Belum ada vendor" onChange={(v) => setDraft((d) => ({ ...d, vendor: v }))} />
          <RupiahInput label="Harga" value={draft.harga} onChange={(v) => setDraft((d) => ({ ...d, harga: v }))} />
          <StatusSelect value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} />
          <ConditionalFields draft={draft} setDraft={setDraft} />
          <DetailListEditor items={draft.detail} editable newItem={newItem} setNewItem={setNewItem} onAdd={addDetailItem} onRemove={(i) => setDraft((d) => ({ ...d, detail: (d.detail || []).filter((_, idx) => idx !== i) }))} />
          <button onClick={handleSubmit} disabled={!draft.name.trim()} style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: draft.name.trim() ? "#2F4B3C" : "#B7C2BB", border: "none", color: "#FBF7F1", borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 700, cursor: draft.name.trim() ? "pointer" : "not-allowed" }}><Plus size={16} /> Tambah Item</button>
        </div>
      </div>
    </div>
    {confirmCloseOpen && <ConfirmDialog message="Batalkan penambahan item ini?" confirmLabel="Batalkan" danger onConfirm={onClose} onCancel={() => setConfirmCloseOpen(false)} />}
    </>
  );
}

/* ---------------------------------------------------------
   DETAIL SHEET
--------------------------------------------------------- */

function DetailSheet({ cat, editMode, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => ({ detail: [], ...cat }));
  const [newItem, setNewItem] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const status = effectiveStatus(draft), meta = STATUS_META[status];
  const Icon = pickIcon(draft.name);
  const isDirty = JSON.stringify(draft) !== JSON.stringify({ detail: [], ...cat });

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevBody; };
  }, []);

  function handleClose() { if (editMode && isDirty) { setConfirmCloseOpen(true); return; } onClose(); }
  function addDetailItem() { if (!newItem.trim()) return; setDraft((d) => ({ ...d, detail: [...(d.detail || []), newItem.trim()] })); setNewItem(""); }

  return (
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 14px" }}>
      <div onClick={handleClose} style={{ position: "absolute", inset: 0, background: "rgba(42,38,33,0.45)" }} />
      <div className="no-scrollbar" style={{ position: "relative", background: "#FBF7F1", width: "100%", maxWidth: 480, maxHeight: "100%", overflowY: "scroll", borderRadius: 22, padding: "10px 18px 28px", boxShadow: "0 20px 50px rgba(42,38,33,0.35)", boxSizing: "border-box" }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "#DDD5C4", margin: "6px auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, border: "1.5px solid #E9D9B6", background: "#FBF7F1", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A6A22" }}>
              <Icon size={18} strokeWidth={1.7} />
            </div>
            {editMode ? (
              <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, border: "none", background: "transparent", borderBottom: "1px dashed #C7A25C", color: "#2A2621", width: "100%" }} />
            ) : <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, color: "#2A2621" }}>{draft.name}</div>}
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9484", flexShrink: 0 }}><X size={20} /></button>
        </div>
        <span style={{ display: "inline-block", marginTop: 10, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.fg }}>{meta.label}</span>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {editMode ? (
            <>
              <Field label="Vendor" editMode value={draft.vendor} placeholder="Belum ada vendor" onChange={(v) => setDraft((d) => ({ ...d, vendor: v }))} />
              <RupiahInput label="Harga" value={draft.harga} onChange={(v) => setDraft((d) => ({ ...d, harga: v }))} />
              <StatusSelect value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} />
              <ConditionalFields draft={draft} setDraft={setDraft} />
              <DetailListEditor items={draft.detail} editable newItem={newItem} setNewItem={setNewItem} onAdd={addDetailItem} onRemove={(i) => setDraft((d) => ({ ...d, detail: (d.detail || []).filter((_, idx) => idx !== i) }))} />
              <button onClick={() => onSave(draft)} disabled={!draft.name.trim()} style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: draft.name.trim() ? "#2F4B3C" : "#B7C2BB", border: "none", color: "#FBF7F1", borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 700, cursor: draft.name.trim() ? "pointer" : "not-allowed" }}><Check size={16} /> Simpan Perubahan</button>
              <button onClick={onDelete} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: "1px solid #E9C6CB", color: "#95475A", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Trash2 size={14} /> Hapus item ini</button>
            </>
          ) : (
            <>
              <Field label="Vendor" value={draft.vendor} placeholder="Belum ada vendor" />
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#2A2621" }}>{rupiah(draft.harga)}</div>
              {status === "dp" && (
                <>
                  <div style={{ fontSize: 13 }}>Jumlah DP: <b>{rupiah(draft.dpAmount)}</b> (oleh {draft.dpBy || "-"})</div>
                  <ReadOnlyField label="Sisa Pembayaran" value={rupiah((Number(draft.harga) || 0) - (Number(draft.dpAmount) || 0))} />
                  {draft.deadline && <div style={{ fontSize: 13 }}>Deadline: {draft.deadline}</div>}
                </>
              )}
              {status === "lunas" && (
                <div style={{ fontSize: 13 }}>
                  DP: {rupiah(draft.dpAmount)} ({draft.dpBy || "-"}) · Pelunasan: {rupiah(draft.lunasAmount)} ({draft.lunasBy || "-"})
                </div>
              )}
              {draft.note && <div style={{ fontSize: 13, color: "#8A8375" }}>Catatan: {draft.note}</div>}
              <DetailListEditor items={draft.detail} editable={false} />
            </>
          )}
        </div>
      </div>
    </div>
    {confirmCloseOpen && <ConfirmDialog message="Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?" confirmLabel="Tutup" danger onConfirm={onClose} onCancel={() => setConfirmCloseOpen(false)} />}
    </>
  );
}

/* ---------------------------------------------------------
   CATEGORY CARD
--------------------------------------------------------- */

function CategoryCard({ cat, onClick }) {
  const status = effectiveStatus(cat), meta = STATUS_META[status];
  const Icon = pickIcon(cat.name);
  const harga = Number(cat.harga) || 0;
  const bayar = (Number(cat.dpAmount) || 0) + (Number(cat.lunasAmount) || 0);
  const pct = harga > 0 ? Math.min(100, Math.round((bayar / harga) * 100)) : 0;

  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #EFEAE0", borderRadius: 16, padding: "13px 14px", textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "'Manrope', sans-serif", boxShadow: "0 1px 2px rgba(42,38,33,0.04)" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, border: "1.5px solid #E9D9B6", background: "#FBF7F1", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A6A22" }}>
        <Icon size={19} strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "#2A2621", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</div>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: meta.bg, color: meta.fg, flexShrink: 0 }}>{meta.label}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "#9C9484", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.vendor || "Belum ada vendor"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 999, background: "#F1EEE5", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: meta.dot }} /></div>
          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#B0A996", flexShrink: 0 }}>{harga > 0 ? rupiah(harga) : "-"}</span>
        </div>
      </div>
      <ChevronRight size={17} color="#C9C2B2" style={{ flexShrink: 0 }} />
    </button>
  );
}

/* ---------------------------------------------------------
   HEADER
--------------------------------------------------------- */

function Header({ totals, editMode, onEditToggle, onRekapOpen, onPrint, onDownloadPdf }) {
  const r = 42, c = 2 * Math.PI * r, offset = c - (Math.min(totals.pct, 100) / 100) * c;
  return (
    <div style={{ background: "#2F4B3C", padding: "28px 16px 26px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "radial-gradient(circle at 20% 20%, #C7A25C 0, transparent 40%), radial-gradient(circle at 85% 75%, #C7A25C 0, transparent 45%)" }} />
      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#D9C79A", fontSize: 13, letterSpacing: 1 }}>Wedding Progress</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: "#FBF7F1", fontSize: 30, lineHeight: 1.1, marginTop: 2 }}>Rafi & Sharly</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button onClick={onEditToggle} style={{ display: "flex", alignItems: "center", gap: 6, background: editMode ? "#C7A25C" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: editMode ? "#2A2621" : "#FBF7F1", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {editMode ? <Unlock size={14} /> : <Lock size={14} />} {editMode ? "Edit Aktif" : "Mode Edit"}
            </button>
            {editMode && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={onRekapOpen} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#FBF7F1", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Wallet size={14} /> Rekap</button>
                <button onClick={onPrint} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#FBF7F1", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Printer size={14} /> Cetak</button>
                <button onClick={onDownloadPdf} style={{ display: "flex", alignItems: "center", gap: 6, background: "#C7A25C", border: "1px solid #C7A25C", color: "#2A2621", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><FileDown size={14} /> PDF</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 22, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
              <circle cx="50" cy="50" r={r} fill="none" stroke="#C7A25C" strokeWidth="7" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#FBF7F1" }}>
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
  return <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "rgba(251,247,241,0.65)" }}>{label}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", color: accent || "#FBF7F1", fontWeight: 500 }}>{value}</span></div>;
}

/* ---------------------------------------------------------
   FILTER TABS
--------------------------------------------------------- */

function FilterTabs({ filter, setFilter, counts, total }) {
  const tabs = [
    { key: "semua", label: `Semua (${total})` },
    ...FILTER_ORDER.map((k) => ({ key: k, label: counts[k] ? `${STATUS_META[k].label} (${counts[k]})` : STATUS_META[k].label })),
  ];
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 0 4px" }}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => setFilter(t.key)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: "1px solid " + (filter === t.key ? "#2F4B3C" : "#E5DFD2"), background: filter === t.key ? "#2F4B3C" : "#fff", color: filter === t.key ? "#FBF7F1" : "#8A8375", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Manrope', sans-serif" }}>{t.label}</button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   REKAP PANEL
--------------------------------------------------------- */

function RekapPanel({ categories, rafiPct, setRafiPct, sharlyPct, setSharlyPct, onSavePct, onClose }) {
  const totalPct = (Number(rafiPct) || 0) + (Number(sharlyPct) || 0);
  const pctValid = totalPct === 100;
  const calc = useMemo(() => computeRekap(categories, rafiPct, sharlyPct), [categories, rafiPct, sharlyPct]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 65, display: "flex" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,38,33,0.45)" }} />
      <div className="no-scrollbar" style={{ position: "relative", background: "#FBF7F1", width: "100%", maxWidth: 400, height: "100%", overflowY: "scroll", boxShadow: "6px 0 30px rgba(42,38,33,0.25)", padding: "20px 18px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, color: "#2A2621" }}>Rekap & Pembagian Anggaran</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9484" }}><X size={20} /></button>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", marginTop: 20, marginBottom: 8 }}>Target Pembagian (%)</div>
        <div style={{ display: "flex", gap: 12 }}>
          <PercentInput label="Persentase Rafi" value={rafiPct} onChange={setRafiPct} />
          <PercentInput label="Persentase Sharly" value={sharlyPct} onChange={setSharlyPct} />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: pctValid ? "#2F4B3C" : "#B76E79" }}>Total: {totalPct}% {pctValid ? "✓" : "— harus 100%"}</div>
        <button onClick={onSavePct} style={{ marginTop: 10, padding: "9px 14px", borderRadius: 10, border: "none", background: "#2F4B3C", color: "#FBF7F1", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Simpan Persentase</button>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8375", textTransform: "uppercase", marginTop: 22, marginBottom: 8 }}>Ringkasan</div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#F1EEE5", borderRadius: 12, fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: "#8A8375" }}>Total Anggaran Keseluruhan</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{rupiah(calc.totalAnggaran)}</span>
        </div>

        {[
          { person: "Rafi", target: calc.targetRafi, dp: calc.dpRafi, lunas: calc.lunasRafi, progress: calc.progressRafi, sisa: calc.sisaRafi },
          { person: "Sharly", target: calc.targetSharly, dp: calc.dpSharly, lunas: calc.lunasSharly, progress: calc.progressSharly, sisa: calc.sisaSharly },
        ].map((row) => (
          <div key={row.person} style={{ background: "#2F4B3C", borderRadius: 16, padding: "16px", marginBottom: 10 }}>
            <div style={{ color: "#D9C79A", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>{row.person}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5 }}><span style={{ color: "rgba(251,247,241,0.65)" }}>Target Kewajiban</span><span style={{ color: "#FBF7F1", fontFamily: "'IBM Plex Mono', monospace" }}>{rupiah(row.target)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12.5 }}><span style={{ color: "rgba(251,247,241,0.65)" }}>Total DP</span><span style={{ color: "#FBF7F1", fontFamily: "'IBM Plex Mono', monospace" }}>{rupiah(row.dp)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12.5 }}><span style={{ color: "rgba(251,247,241,0.65)" }}>Total Pelunasan</span><span style={{ color: "#FBF7F1", fontFamily: "'IBM Plex Mono', monospace" }}>{rupiah(row.lunas)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12.5, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 6 }}><span style={{ color: "#C7A25C", fontWeight: 700 }}>Progress</span><span style={{ color: "#C7A25C", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{rupiah(row.progress)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 13 }}><span style={{ color: row.sisa > 0 ? "#E8B4BC" : "#9FD8B0", fontWeight: 700 }}>Sisa Kewajiban</span><span style={{ color: row.sisa > 0 ? "#E8B4BC" : "#9FD8B0", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{rupiah(row.sisa)}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   PIN MODAL
--------------------------------------------------------- */

function PinModal({ value, setValue, error, onSubmit, onClose }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,38,33,0.5)" }} />
      <div style={{ position: "relative", background: "#FBF7F1", borderRadius: 18, padding: "24px 22px", width: "100%", maxWidth: 320 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "#2F4B3C", display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={18} color="#C7A25C" /></div></div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 19, textAlign: "center", color: "#2A2621" }}>Masukkan PIN</div>
        <div style={{ fontSize: 12.5, color: "#9C9484", textAlign: "center", marginTop: 4 }}>Masukkan PIN untuk masuk mode edit.</div>
        <input ref={inputRef} type="text" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && onSubmit()} style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 12, border: "1px solid #E5DFD2", fontSize: 20, textAlign: "center", letterSpacing: 8, background: "#fff" }} />
        {error && <div style={{ color: "#B76E79", fontSize: 12, textAlign: "center", marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E5DFD2", background: "#fff", color: "#8A8375", fontWeight: 600, cursor: "pointer", fontSize: 13.5 }}>Batal</button>
          <button onClick={onSubmit} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#2F4B3C", color: "#FBF7F1", fontWeight: 600, cursor: "pointer", fontSize: 13.5 }}>Masuk</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   FONT LOADER + PRINT CSS
--------------------------------------------------------- */

function FontLoader() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      input, textarea, select { font-family: 'Manrope', sans-serif; }
      .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      .no-scrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }
      #print-report { display: none; }
      @media print {
        body * { visibility: hidden; }
        #print-report, #print-report * { visibility: visible; }
        #print-report { display: block; position: absolute; top: 0; left: 0; width: 100%; padding: 24px; color: #111; font-family: 'Manrope', sans-serif; }
      }
    `}</style>
  );
}

function PrintReport({ categories, listItems, filterLabel, rafiPct, sharlyPct }) {
  const calc = computeRekap(categories, rafiPct, sharlyPct);
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const paid = calc.progressRafi + calc.progressSharly;

  return (
    <div id="print-report">
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, margin: "0 0 2px" }}>Rekapitulasi Anggaran Wedding — Rafi & Sharly</h1>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 18 }}>Dicetak pada {today}</div>

      <h2 style={{ fontSize: 14, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>Ringkasan Anggaran</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 18 }}>
        <tbody>
          <tr><td style={{ padding: "4px 0" }}>Total Anggaran Keseluruhan</td><td style={{ textAlign: "right", fontWeight: 700 }}>{rupiah(calc.totalAnggaran)}</td></tr>
          <tr><td style={{ padding: "4px 0" }}>Sudah Dibayar</td><td style={{ textAlign: "right" }}>{rupiah(paid)}</td></tr>
          <tr><td style={{ padding: "4px 0" }}>Sisa</td><td style={{ textAlign: "right" }}>{rupiah(calc.totalAnggaran - paid)}</td></tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>Rekap per Penanggung Jawab (target {rafiPct}% Rafi / {sharlyPct}% Sharly)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 18 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #999" }}>
            <th style={{ textAlign: "left", padding: "4px 0" }}>Penanggung Jawab</th>
            <th style={{ textAlign: "right" }}>Target</th><th style={{ textAlign: "right" }}>Total DP</th>
            <th style={{ textAlign: "right" }}>Total Pelunasan</th><th style={{ textAlign: "right" }}>Progress</th>
            <th style={{ textAlign: "right" }}>Sisa Kewajiban</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "4px 0" }}>Rafi</td><td style={{ textAlign: "right" }}>{rupiah(calc.targetRafi)}</td>
            <td style={{ textAlign: "right" }}>{rupiah(calc.dpRafi)}</td><td style={{ textAlign: "right" }}>{rupiah(calc.lunasRafi)}</td>
            <td style={{ textAlign: "right", fontWeight: 700 }}>{rupiah(calc.progressRafi)}</td><td style={{ textAlign: "right" }}>{rupiah(calc.sisaRafi)}</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 0" }}>Sharly</td><td style={{ textAlign: "right" }}>{rupiah(calc.targetSharly)}</td>
            <td style={{ textAlign: "right" }}>{rupiah(calc.dpSharly)}</td><td style={{ textAlign: "right" }}>{rupiah(calc.lunasSharly)}</td>
            <td style={{ textAlign: "right", fontWeight: 700 }}>{rupiah(calc.progressSharly)}</td><td style={{ textAlign: "right" }}>{rupiah(calc.sisaSharly)}</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>Daftar Item — {filterLabel} ({listItems.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #999" }}>
            <th style={{ textAlign: "left", padding: "4px 2px" }}>Item</th><th style={{ textAlign: "left" }}>Vendor</th>
            <th style={{ textAlign: "left" }}>Status</th><th style={{ textAlign: "right" }}>Harga</th>
            <th style={{ textAlign: "right" }}>DP</th><th style={{ textAlign: "left" }}>DP By</th>
            <th style={{ textAlign: "right" }}>Pelunasan</th><th style={{ textAlign: "left" }}>Lunas By</th>
            <th style={{ textAlign: "right" }}>Sisa</th>
          </tr>
        </thead>
        <tbody>
          {listItems.map((c) => {
            const harga = Number(c.harga) || 0;
            const bayar = (Number(c.dpAmount) || 0) + (Number(c.lunasAmount) || 0);
            return (
              <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "4px 2px" }}>{c.name}</td><td>{c.vendor || "-"}</td>
                <td>{STATUS_META[effectiveStatus(c)].label}</td><td style={{ textAlign: "right" }}>{rupiah(harga)}</td>
                <td style={{ textAlign: "right" }}>{c.dpAmount ? rupiah(c.dpAmount) : "-"}</td><td>{c.dpBy || "-"}</td>
                <td style={{ textAlign: "right" }}>{c.lunasAmount ? rupiah(c.lunasAmount) : "-"}</td><td>{c.lunasBy || "-"}</td>
                <td style={{ textAlign: "right" }}>{rupiah(harga - bayar)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function alignHeadRight(cols) {
  return (data) => {
    if (data.section === "head" && cols.includes(data.column.index)) data.cell.styles.halign = "right";
  };
}

function buildPdfBlob(categories, listItems, filterLabel, rafiPct, sharlyPct) {
  const calc = computeRekap(categories, rafiPct, sharlyPct);
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const green = [47, 75, 60];
  const paid = calc.progressRafi + calc.progressSharly;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Rekapitulasi Anggaran Wedding - Rafi & Sharly", 40, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Dicetak pada " + today, 40, 58);
  doc.setTextColor(0);

  doc.autoTable({
    startY: 74,
    head: [["Ringkasan Anggaran", ""]],
    body: [
      ["Total Anggaran Keseluruhan", rupiah(calc.totalAnggaran)],
      ["Sudah Dibayar", rupiah(paid)],
      ["Sisa", rupiah(calc.totalAnggaran - paid)],
    ],
    theme: "grid", headStyles: { fillColor: green }, columnStyles: { 1: { halign: "right" } },
    didParseCell: alignHeadRight([1]), styles: { fontSize: 10 }, tableWidth: 360, margin: { left: 40 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 18,
    head: [["Penanggung Jawab (target " + rafiPct + "% Rafi / " + sharlyPct + "% Sharly)", "Target", "Total DP", "Total Pelunasan", "Progress", "Sisa Kewajiban"]],
    body: [
      ["Rafi", rupiah(calc.targetRafi), rupiah(calc.dpRafi), rupiah(calc.lunasRafi), rupiah(calc.progressRafi), rupiah(calc.sisaRafi)],
      ["Sharly", rupiah(calc.targetSharly), rupiah(calc.dpSharly), rupiah(calc.lunasSharly), rupiah(calc.progressSharly), rupiah(calc.sisaSharly)],
    ],
    theme: "grid", headStyles: { fillColor: green },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" }, 5: { halign: "right" } },
    didParseCell: alignHeadRight([1, 2, 3, 4, 5]), styles: { fontSize: 10 }, margin: { left: 40, right: 40 },
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Daftar Item - " + filterLabel + " (" + listItems.length + ")", 40, doc.lastAutoTable.finalY + 30);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 38,
    head: [["Item", "Vendor", "Status", "Harga", "DP", "DP By", "Pelunasan", "Lunas By", "Sisa"]],
    body: listItems.map((c) => {
      const harga = Number(c.harga) || 0;
      const bayar = (Number(c.dpAmount) || 0) + (Number(c.lunasAmount) || 0);
      return [c.name, c.vendor || "-", STATUS_META[effectiveStatus(c)].label, rupiah(harga), c.dpAmount ? rupiah(c.dpAmount) : "-", c.dpBy || "-", c.lunasAmount ? rupiah(c.lunasAmount) : "-", c.lunasBy || "-", rupiah(harga - bayar)];
    }),
    theme: "striped", headStyles: { fillColor: green },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 6: { halign: "right" }, 8: { halign: "right" } },
    didParseCell: alignHeadRight([3, 4, 6, 8]), styles: { fontSize: 9 }, margin: { left: 40, right: 40 },
  });

  return doc.output("blob");
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
  const [rekapOpen, setRekapOpen] = useState(false);
  const [rafiPct, setRafiPct] = useState(50);
  const [sharlyPct, setSharlyPct] = useState(50);
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
      else { setCategories([]); showToast("Gagal memuat data dari server."); }
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const s = await res.json();
          setRafiPct(s.rafiPct);
          setSharlyPct(s.sharlyPct);
        }
      } catch {}
    })();
  }, []);

  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = !!(activeId || addOpen || pinModalOpen || confirmDeleteId || rekapOpen);
  }, [activeId, addOpen, pinModalOpen, confirmDeleteId, rekapOpen]);

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

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  async function saveCategory(id, draft) {
    const prev = categories;
    setCategories(categories.map((c) => (c.id === id ? { ...draft } : c)));
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!res.ok) throw new Error("save failed");
      showToast("Perubahan disimpan.");
    } catch {
      setCategories(prev);
      showToast("Gagal menyimpan, coba lagi.");
    }
  }

  async function createCategory(draft) {
    try {
      const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!res.ok) throw new Error("create failed");
      const { id } = await res.json();
      setCategories((prev) => [...prev, { ...draft, id }]);
      setAddOpen(false);
      showToast("Item baru ditambahkan.");
    } catch {
      showToast("Gagal menambah item, coba lagi.");
    }
  }

  function requestDeleteCategory(id) { setConfirmDeleteId(id); }

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
      const res = await fetch("/api/verify-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pinInput }) });
      const data = await res.json();
      if (data.ok) {
        setEditMode(true); setPinModalOpen(false); setPinInput(""); setPinError("");
        showToast("Mode edit aktif.");
      } else {
        setPinError("PIN salah."); setPinInput("");
      }
    } catch {
      setPinError("Gagal memeriksa PIN, coba lagi.");
    }
  }

  function openEditGate() {
    if (editMode) { setEditMode(false); setRekapOpen(false); showToast("Mode lihat saja."); return; }
    setPinModalOpen(true);
  }

  async function savePct() {
    try {
      await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rafiPct, sharlyPct }) });
      showToast("Persentase disimpan.");
    } catch {
      showToast("Gagal menyimpan persentase.");
    }
  }

  function handlePrint() { window.print(); }

  function handleDownloadPdf() {
    const filterLabel = filter === "semua" ? "Semua Item" : STATUS_META[filter].label;
    const blob = buildPdfBlob(categories, filtered, filterLabel, rafiPct, sharlyPct);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Rekapitulasi-Anggaran-Wedding.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const totals = useMemo(() => {
    if (!categories) return { harga: 0, bayar: 0, sisa: 0, pct: 0 };
    let harga = 0, bayar = 0;
    categories.forEach((c) => { harga += Number(c.harga) || 0; bayar += (Number(c.dpAmount) || 0) + (Number(c.lunasAmount) || 0); });
    return { harga, bayar, sisa: harga - bayar, pct: harga > 0 ? Math.round((bayar / harga) * 100) : 0 };
  }, [categories]);

  const counts = useMemo(() => {
    const c = { lunas: 0, dp: 0, "belum-bayar": 0, "belum-booking": 0 };
    (categories || []).forEach((cat) => { c[effectiveStatus(cat)]++; });
    return c;
  }, [categories]);

  const filtered = useMemo(() => {
    if (!categories) return [];
    if (filter === "semua") return categories;
    return categories.filter((c) => effectiveStatus(c) === filter);
  }, [categories, filter]);

  const active = categories?.find((c) => c.id === activeId) || null;

  if (categories === null) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF7F1", fontFamily: "Manrope, sans-serif", color: "#8A8375" }}>Memuat...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FBF7F1", fontFamily: "'Manrope', sans-serif", color: "#2A2621", paddingBottom: 40 }}>
      <FontLoader />
      <Header totals={totals} editMode={editMode} onEditToggle={openEditGate} onRekapOpen={() => setRekapOpen(true)} onPrint={handlePrint} onDownloadPdf={handleDownloadPdf} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
        <FilterTabs filter={filter} setFilter={setFilter} counts={counts} total={categories.length} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {filtered.map((cat) => <CategoryCard key={cat.id} cat={cat} onClick={() => setActiveId(cat.id)} />)}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#B0A996", fontSize: 14 }}>Tidak ada item di kategori ini.</div>}
        </div>
        {editMode && (
          <button onClick={() => setAddOpen(true)} style={{ marginTop: 18, width: "100%", padding: "13px", borderRadius: 14, border: "1.5px dashed #C7A25C", background: "transparent", color: "#8A6A22", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
            <Plus size={16} /> Tambah item
          </button>
        )}
      </div>

      {active && (
        <DetailSheet key={active.id} cat={active} editMode={editMode} onClose={() => setActiveId(null)} onSave={(d) => { saveCategory(active.id, d); setActiveId(null); }} onDelete={() => requestDeleteCategory(active.id)} />
      )}
      {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onCreate={createCategory} />}
      {editMode && rekapOpen && (
        <RekapPanel categories={categories} rafiPct={rafiPct} setRafiPct={setRafiPct} sharlyPct={sharlyPct} setSharlyPct={setSharlyPct} onSavePct={savePct} onClose={() => setRekapOpen(false)} />
      )}
      {pinModalOpen && <PinModal value={pinInput} setValue={setPinInput} error={pinError} onSubmit={handlePinSubmit} onClose={() => { setPinModalOpen(false); setPinInput(""); setPinError(""); }} />}
      {confirmDeleteId && <ConfirmDialog message="Hapus item ini beserta detailnya?" confirmLabel="Hapus" danger onConfirm={confirmDeleteCategory} onCancel={() => setConfirmDeleteId(null)} />}

      {editMode && (
        <PrintReport categories={categories} listItems={filtered} filterLabel={filter === "semua" ? "Semua Item" : STATUS_META[filter].label} rafiPct={rafiPct} sharlyPct={sharlyPct} />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#2A2621", color: "#FBF7F1", padding: "10px 18px", borderRadius: 999, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 100, maxWidth: "88%", textAlign: "center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
