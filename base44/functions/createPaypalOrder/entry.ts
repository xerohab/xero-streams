import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAYPAL_API = "https://api-m.paypal.com";

async function getAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  const auth = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get PayPal access token");
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { amount, currency = "GBP" } = await req.json();

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: Number(amount).toFixed(2),
          },
          description: "Donation to Xero Streams",
        }],
        application_context: {
          brand_name: "Xero Streams",
          user_action: "PAY_NOW",
          return_url: `${req.headers.get("origin") || "https://xerostreams.com"}/donate?success=true`,
          cancel_url: `${req.headers.get("origin") || "https://xerostreams.com"}/donate?cancelled=true`,
        },
      }),
    });

    const order = await orderRes.json();
    if (!order.id) throw new Error(order.message || "Failed to create PayPal order");

    const approvalUrl = order.links?.find(l => l.rel === "approve")?.href;
    return Response.json({ orderId: order.id, approvalUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});