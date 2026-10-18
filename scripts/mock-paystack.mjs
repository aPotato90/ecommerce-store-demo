// A tiny local stand-in for the two Paystack endpoints the checkout uses, plus a fake hosted
// payment page. Used only by the browser tests (scripts/e2e-checkout.mjs) so they never call
// the real Paystack API. The app talks to it when PAYSTACK_API_BASE_URL=http://127.0.0.1:<port>.
//
// Fake payment page outcomes (links on /pay/:reference):
//   success   – status "success", correct amount and currency
//   abandoned – status "abandoned"
//   failed    – status "failed"
//   tamper    – status "success" but 1 kobo less than requested
//   usd       – status "success" but currency "USD"
//   garbage   – verify answers with a 502 HTML page (simulates a network/gateway error)

import { createServer } from "node:http";

const transactions = new Map();

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== "string";
  res.writeHead(status, {
    "Content-Type": isJson ? "application/json" : "text/html; charset=utf-8",
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

function authorized(req) {
  return /^Bearer sk_test_\w+/.test(req.headers.authorization ?? "");
}

export function startMockPaystack(port = 4010) {
  const base = `http://127.0.0.1:${port}`;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", base);
    const parts = url.pathname.split("/").filter(Boolean);

    if (req.method === "POST" && url.pathname === "/transaction/initialize") {
      if (!authorized(req))
        return send(res, 401, { status: false, message: "Invalid key" });
      const body = JSON.parse((await readBody(req)) || "{}");
      if (transactions.has(body.reference)) {
        return send(res, 400, {
          status: false,
          message: "Duplicate Transaction Reference",
        });
      }
      transactions.set(body.reference, {
        reference: body.reference,
        amount: body.amount,
        currency: body.currency,
        email: body.email,
        callbackUrl: body.callback_url,
        metadata:
          typeof body.metadata === "string" ? JSON.parse(body.metadata) : body.metadata,
        outcome: "pending",
      });
      return send(res, 200, {
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: `${base}/pay/${body.reference}`,
          access_code: `access_${body.reference}`,
          reference: body.reference,
        },
      });
    }

    if (req.method === "GET" && parts[0] === "transaction" && parts[1] === "verify") {
      if (!authorized(req))
        return send(res, 401, { status: false, message: "Invalid key" });
      const tx = transactions.get(decodeURIComponent(parts[2] ?? ""));
      if (!tx)
        return send(res, 400, {
          status: false,
          message: "Transaction reference not found",
        });
      if (tx.outcome === "garbage")
        return send(res, 502, "<html><body>Bad gateway</body></html>");
      const status =
        tx.outcome === "abandoned" || tx.outcome === "failed"
          ? tx.outcome
          : tx.outcome === "pending"
            ? "ongoing"
            : "success";
      return send(res, 200, {
        status: true,
        message: "Verification successful",
        data: {
          id: 1,
          status,
          reference: tx.reference,
          amount: tx.outcome === "tamper" ? tx.amount - 1 : tx.amount,
          currency: tx.outcome === "usd" ? "USD" : tx.currency,
          metadata: tx.metadata,
          paid_at: status === "success" ? new Date().toISOString() : null,
          gateway_response: status === "success" ? "Successful" : "Declined",
          customer: { email: tx.email },
        },
      });
    }

    // Fake hosted checkout page.
    if (req.method === "GET" && parts[0] === "pay" && parts.length === 2) {
      const tx = transactions.get(parts[1]);
      if (!tx) return send(res, 404, "<p>Unknown transaction</p>");
      const links = ["success", "abandoned", "failed", "tamper", "usd", "garbage"]
        .map((o) => `<li><a href="/pay/${tx.reference}/${o}">Mock outcome: ${o}</a></li>`)
        .join("");
      return send(
        res,
        200,
        `<!doctype html><html lang="en"><title>Mock Paystack</title><main><h1>Mock Paystack checkout</h1><p>Amount: ${tx.amount} kobo ${tx.currency}</p><ul>${links}</ul></main></html>`,
      );
    }
    if (req.method === "GET" && parts[0] === "pay" && parts.length === 3) {
      const tx = transactions.get(parts[1]);
      if (!tx) return send(res, 404, "<p>Unknown transaction</p>");
      tx.outcome = parts[2];
      const callback = new URL(tx.callbackUrl);
      callback.searchParams.set("trxref", tx.reference);
      callback.searchParams.set("reference", tx.reference);
      return send(res, 302, "", { Location: callback.toString() });
    }

    // Test hook: change the outcome of an existing transaction (e.g. after a "garbage" verify).
    if (req.method === "POST" && parts[0] === "__outcome" && parts.length === 3) {
      const tx = transactions.get(parts[1]);
      if (!tx) return send(res, 404, { ok: false });
      tx.outcome = parts[2];
      return send(res, 200, { ok: true });
    }

    send(res, 404, { status: false, message: "Not found" });
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve({ server, base, transactions }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.MOCK_PAYSTACK_PORT ?? 4010);
  await startMockPaystack(port);
  console.log(`Mock Paystack listening on http://127.0.0.1:${port}`);
}
