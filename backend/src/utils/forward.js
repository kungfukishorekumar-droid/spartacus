/* Forward a lead (or event) to external automation — n8n and/or a CRM webhook.
   Fire-and-forget: never blocks or fails the API response.
   Env (all optional):
     N8N_WEBHOOK_URL     -> n8n Webhook node
     CRM_WEBHOOK_URL     -> a CRM webhook
     CRM_WEBHOOK_TOKEN   -> sent as "Authorization: Bearer <token>" to the CRM webhook */
async function forwardLead(payload) {
  if (typeof fetch !== "function") return; // Node < 18 safety

  const targets = [];
  if (process.env.N8N_WEBHOOK_URL) {
    targets.push({ url: process.env.N8N_WEBHOOK_URL, headers: { "Content-Type": "application/json" } });
  }
  if (process.env.CRM_WEBHOOK_URL) {
    const headers = { "Content-Type": "application/json" };
    if (process.env.CRM_WEBHOOK_TOKEN) headers.Authorization = "Bearer " + process.env.CRM_WEBHOOK_TOKEN;
    targets.push({ url: process.env.CRM_WEBHOOK_URL, headers });
  }
  if (targets.length === 0) return;

  await Promise.allSettled(
    targets.map((t) => fetch(t.url, { method: "POST", headers: t.headers, body: JSON.stringify(payload) }))
  ).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.warn("⚠️  Forward failed:", targets[i].url, r.reason && r.reason.message);
    });
  });
}

module.exports = { forwardLead };
