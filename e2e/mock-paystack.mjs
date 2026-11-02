// Stand-in for Paystack's API, used only by the Playwright end-to-end tests (see playwright.config.ts).
import http from "node:http";
import { createHmac } from "node:crypto";
const KEY = "sk_test_e2e_mock";
const APP = "http://localhost:3100";
const tx = new Map(); // reference -> { amount, callback, status }
const send = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const txData = (ref) => { const t = tx.get(ref); return { id: 1, status: t.status, reference: ref, amount: t.amount, currency: "GHS", channel: "mobile_money", paid_at: t.status === "success" ? new Date().toISOString() : null, gateway_response: "Approved", authorization: { channel: "mobile_money", bank: "MTN", last4: "4567", authorization_code: "AUTH_must_not_be_stored" } }; };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:4010");
  if (req.method === "POST" && url.pathname === "/transaction/initialize") {
    if (req.headers.authorization !== `Bearer ${KEY}`) return send(res, 401, { status: false, message: "Invalid key" });
    let raw = ""; for await (const c of req) raw += c;
    const b = JSON.parse(raw);
    tx.set(b.reference, { amount: b.amount, callback: b.callback_url, status: "pending" });
    console.log(`[mock] initialize ${b.reference} GHS ${b.amount / 100} channels=${b.channels}`);
    return send(res, 200, { status: true, data: { authorization_url: `http://localhost:4010/pay/${encodeURIComponent(b.reference)}`, access_code: "x", reference: b.reference } });
  }
  if (url.pathname.startsWith("/transaction/verify/")) {
    const ref = decodeURIComponent(url.pathname.split("/").pop());
    if (!tx.has(ref)) return send(res, 404, { status: false, message: "Not found" });
    console.log(`[mock] verify ${ref} → ${tx.get(ref).status}`);
    return send(res, 200, { status: true, data: txData(ref) });
  }
  if (url.pathname.startsWith("/pay/")) { // customer "approves the MoMo prompt"
    const ref = decodeURIComponent(url.pathname.split("/").pop());
    const t = tx.get(ref); t.status = "success";
    const body = JSON.stringify({ event: "charge.success", data: txData(ref) });
    const sig = createHmac("sha512", KEY).update(body).digest("hex");
    for (const s of [sig, sig]) { // send the webhook twice: must only count once
      const r = await fetch(`${APP}/api/webhooks/paystack`, { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": s }, body });
      console.log(`[mock] webhook → ${r.status}`);
    }
    const bad = await fetch(`${APP}/api/webhooks/paystack`, { method: "POST", headers: { "x-paystack-signature": "forged" }, body });
    console.log(`[mock] forged webhook → ${bad.status}`);
    const back = new URL(t.callback); back.searchParams.set("reference", ref); back.searchParams.set("trxref", ref);
    res.writeHead(302, { Location: back.toString() }); return res.end();
  }
  if (req.method === "POST" && url.pathname === "/refund") {
    let raw = ""; for await (const c of req) raw += c;
    const b = JSON.parse(raw);
    const id = Math.floor(Math.random() * 1e9);
    console.log(`[mock] refund ${b.transaction} GHS ${b.amount / 100} → id ${id}`);
    setTimeout(async () => { // Paystack completes refunds asynchronously
      const body = JSON.stringify({ event: "refund.processed", data: { id, status: "processed", transaction_reference: b.transaction, amount: b.amount } });
      const sig = createHmac("sha512", KEY).update(body).digest("hex");
      const r = await fetch(`${APP}/api/webhooks/paystack`, { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": sig }, body }).catch(() => null);
      console.log(`[mock] refund webhook → ${r?.status}`);
    }, 300);
    return send(res, 200, { status: true, data: { id, status: "pending", amount: b.amount } });
  }
  send(res, 404, { status: false });
}).listen(4010, () => console.log("[mock] Paystack stand-in on :4010"));
