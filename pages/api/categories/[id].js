import { withTransaction } from "../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const body = req.body || {};
      if (!body.name || !body.name.trim()) {
        return res.status(400).json({ error: "Nama item wajib diisi." });
      }
      const detail = Array.isArray(body.detail) ? body.detail : [];

      await withTransaction(async (conn) => {
        const [result] = await conn.execute(
          `UPDATE categories SET name=?, vendor=?, status=?, harga=?, bayar=?, deadline=?, note=?
           WHERE id=?`,
          [
            body.name.trim(),
            body.vendor || "",
            body.status || "belum-booking",
            Number(body.harga) || 0,
            Number(body.bayar) || 0,
            body.deadline || "",
            body.note || "",
            id,
          ]
        );
        if (result.affectedRows === 0) {
          throw Object.assign(new Error("not found"), { statusCode: 404 });
        }
        await conn.execute("DELETE FROM category_details WHERE category_id=?", [id]);
        for (let i = 0; i < detail.length; i++) {
          await conn.execute(
            "INSERT INTO category_details (category_id, text, sort_order) VALUES (?, ?, ?)",
            [id, detail[i], i + 1]
          );
        }
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).json({ error: "Item tidak ditemukan." });
      }
      console.error(err);
      return res.status(500).json({ error: "Gagal menyimpan perubahan." });
    }
  }

  if (req.method === "DELETE") {
    try {
      await withTransaction(async (conn) => {
        await conn.execute("DELETE FROM categories WHERE id=?", [id]);
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal menghapus item." });
    }
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
