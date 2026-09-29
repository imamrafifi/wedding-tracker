import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rows = await query(
        "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('rafi_pct', 'sharly_pct')"
      );
      const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
      return res.status(200).json({
        rafiPct: Number(map.rafi_pct ?? 50),
        sharlyPct: Number(map.sharly_pct ?? 50),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal memuat pengaturan." });
    }
  }

  if (req.method === "PUT") {
    try {
      const { rafiPct, sharlyPct } = req.body || {};
      await query(
        "INSERT INTO app_settings (setting_key, setting_value) VALUES ('rafi_pct', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        [String(Number(rafiPct) || 0)]
      );
      await query(
        "INSERT INTO app_settings (setting_key, setting_value) VALUES ('sharly_pct', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        [String(Number(sharlyPct) || 0)]
      );
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal menyimpan pengaturan." });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
