import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase select error:", error);
    return Response.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
  }

  return Response.json({ recipes: data });
}

export async function POST(request) {
  const body = await request.json();
  const {
    ingredients_input,
    recipe_name,
    cook_time,
    servings_requested,
    main_ingredients,
    seasonings,
    steps,
    cooking_device,
  } = body;

  if (!recipe_name) {
    return Response.json({ error: "저장할 레시피 정보가 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      ingredients_input,
      recipe_name,
      cook_time,
      servings_requested,
      main_ingredients,
      seasonings,
      steps,
      cooking_device,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return Response.json({ error: "저장에 실패했습니다." }, { status: 500 });
  }

  return Response.json({ recipe: data });
}
