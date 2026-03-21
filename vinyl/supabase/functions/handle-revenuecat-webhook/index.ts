import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service credentials are not configured.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function isAuthorized(request: Request): boolean {
  if (!webhookSecret) {
    return false;
  }

  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  return provided === webhookSecret;
}

function coerceExpiryTimestamp(value: unknown): string | null {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    return new Date(value).toISOString();
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await request.json();
    const event = payload.event ?? payload;
    const userId = event.app_user_id ?? payload.app_user_id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing app_user_id." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const productId = String(event.product_id ?? payload.product_id ?? "unknown");
    const provider = "revenuecat";
    const isActive = !["EXPIRATION", "CANCELLATION"].includes(String(event.type ?? ""));
    const expiresAt = coerceExpiryTimestamp(
      event.expiration_at_ms ??
        event.expiration_at ??
        payload.expiration_at_ms ??
        payload.expiration_at
    );

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        is_active: isActive,
        plan: productId,
        provider,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id"
      }
    );

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
