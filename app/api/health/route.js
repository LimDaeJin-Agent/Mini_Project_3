import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const checkedAt = new Date().toISOString();

  let supabaseOk = true;
  let supabaseError = null;
  try {
    const { error } = await supabase.from("recipes").select("id").limit(1);
    if (error) {
      supabaseOk = false;
      supabaseError = error.message;
    }
  } catch (error) {
    supabaseOk = false;
    supabaseError = error.message || "unknown error";
  }

  try {
    await supabase.from("status_checks").insert({
      nextjs_ok: true,
      supabase_ok: supabaseOk,
      supabase_error: supabaseError,
    });
  } catch (error) {
    console.error("status_checks insert error:", error);
  }

  const status = {
    nextjs: "ok",
    supabase: supabaseOk ? "ok" : "error",
    supabaseError,
    checkedAt,
  };

  return Response.json(status, { status: supabaseOk ? 200 : 503 });
}
