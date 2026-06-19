import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const plan = body.plan === "yearly" ? "yearly" : "monthly";

    // Paystack uses kobo:
    // Monthly: ₦1,500 = 150000
    // Yearly:  ₦12,000 = 1200000
    const amount = plan === "yearly" ? 1200000 : 150000;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        amount,
        currency: "NGN",
        callback_url: "https://monietrack.vercel.app",
        metadata: {
          plan,
          app: "MonieTrack",
          monthly_price_ngn: 1500,
          yearly_price_ngn: 12000
        },
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ status: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
