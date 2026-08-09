import { query, withTransaction } from "../../../lib/db";
import crypto from "crypto";

function genId() {
  return crypto.randomBytes(5).toString("hex");
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const categories = await query(
        "SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC"
      );
      const details = await query(
        "SELECT * FROM category_details ORDER BY category_id ASC, sort_order ASC, id ASC"
      );
      const byCategory = {};
      for (const d of details) {
        (byCategory[d.category_id] ||= []).push(d.text);
      }
      const result = categories.map((c) => ({
        id: c.id,
        name: c.name,
        vendor: c.vendor,
        status: c.status,
        harga: Number(c.harga),
        bayar: Number(c.bayar),
        deadline: c.deadline,
        note: c.note || "",
        detail: byCategory[c.id] || [],
      }));
      return res.status(200).json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal memuat data." });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      if (!body.name || !body.name.trim()) {
        return res.status(400).json({ error: "Nama item wajib diisi." });
      }
      const id = genId();
      const detail = Array.isArray(body.detail) ? body.detail : [];

      await withTransaction(async (conn) => {
        const [[maxRow]] = await conn.query(
          "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM categories"
        );
        await conn.execute(
          `INSERT INTO categories (id, name, vendor, status, harga, bayar, deadline, note, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            body.name.trim(),
            body.vendor || "",
            body.status || "belum-booking",
            Number(body.harga) || 0,
            Number(body.bayar) || 0,
            body.deadline || "",
            body.note || "",
            maxRow.next_order,
          ]
        );
        for (let i = 0; i < detail.length; i++) {
          await conn.execute(
            "INSERT INTO category_details (category_id, text, sort_order) VALUES (?, ?, ?)",
            [id, detail[i], i + 1]
          );
        }
      });

      return res.status(201).json({ id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal menambah item." });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
