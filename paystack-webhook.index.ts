import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const event = await req.json();

    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = event.data;
    const email = data.customer?.email;
    const plan = data.metadata?.plan || "monthly";

    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: "No email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) throw userError;

    const matchedUser = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!matchedUser) {
      return new Response(JSON.stringify({ ok: false, error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const expires = new Date(now);

    if (plan === "yearly") {
      expires.setFullYear(expires.getFullYear() + 1);
    } else {
      expires.setMonth(expires.getMonth() + 1);
    }

    const { error: subError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: matchedUser.id,
        plan: "pro",
        status: "active",
        paystack_customer: String(data.customer?.customer_code || ""),
        paystack_subscription: String(data.reference || ""),
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (subError) throw subError;

    return new Response(JSON.stringify({ ok: true, upgraded: true, email, plan }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
