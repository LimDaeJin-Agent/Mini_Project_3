import { supabase } from "@/lib/supabaseClient";

export async function DELETE(request, { params }) {
  const { id } = await params;

  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) {
    console.error("Supabase delete error:", error);
    return Response.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }

  return Response.json({ success: true });
}
