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
    const { orderId } = await req.json();
    if (!orderId) return Response.json({ error: "Missing orderId" }, { status: 400 });

    const accessToken = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const result = await captureRes.json();
    if (result.status === "COMPLETED") {
      return Response.json({ success: true, status: result.status });
    } else {
      throw new Error(result.message || "Capture failed");
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});