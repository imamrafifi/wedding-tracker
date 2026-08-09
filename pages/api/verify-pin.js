import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }
  try {
    const { pin } = req.body || {};
    const rows = await query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'edit_pin' LIMIT 1"
    );
    const correctPin = rows[0]?.setting_value ?? process.env.EDIT_PIN ?? "";
    const ok = typeof pin === "string" && pin.length > 0 && pin === correctPin;
    return res.status(200).json({ ok });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Gagal memeriksa PIN." });
  }
}
