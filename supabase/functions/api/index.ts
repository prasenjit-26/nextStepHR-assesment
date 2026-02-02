import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

// Helper to create JSON response with CORS headers
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// Helper to get authenticated Supabase client
function getSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing SUPABASE_ANON_KEY");

  const authHeader = req.headers.get("Authorization") ?? "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

// Helper to get authenticated user
async function getAuthenticatedUser(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawPath = url.pathname;
    const path = rawPath.replace("/api", "");
    const method = req.method;

    console.log("Raw URL:", req.url);
    console.log("Raw path:", rawPath);
    console.log("Extracted path:", path);
    console.log("Method:", method);

    const supabase = getSupabaseClient(req);
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }

    // GET /todos - List all todos
    if (method === "GET" && path === "/todos") {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("inserted_at", { ascending: false });

      if (error) return jsonResponse({ message: error.message }, 400);
      return jsonResponse(data ?? []);
    }

    // POST /todos - Create a new todo
    if (method === "POST" && path === "/todos") {
      const body = await req.json();

      if (!body.title || body.title.trim().length === 0) {
        return jsonResponse({ message: "Title is required" }, 400);
      }

      const { data, error } = await supabase
        .from("todos")
        .insert({ user_id: user.id, title: body.title.trim() })
        .select("*")
        .single();

      if (error) return jsonResponse({ message: error.message }, 400);
      return jsonResponse(data, 201);
    }

    // PATCH /todos/:id - Update a todo
    const patchMatch = path.match(/^\/todos\/([a-f0-9-]+)$/);
    if (method === "PATCH" && patchMatch) {
      const id = patchMatch[1];
      const body = await req.json();

      if (Object.keys(body).length === 0) {
        return jsonResponse({ message: "At least one field is required" }, 400);
      }

      const updateData: { title?: string; is_completed?: boolean } = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.is_completed !== undefined) updateData.is_completed = body.is_completed;

      const { data, error } = await supabase
        .from("todos")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) return jsonResponse({ message: error.message }, 400);
      return jsonResponse(data);
    }

    // DELETE /todos/:id - Delete a todo
    const deleteMatch = path.match(/^\/todos\/([a-f0-9-]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const id = deleteMatch[1];

      const { error } = await supabase.from("todos").delete().eq("id", id);

      if (error) return jsonResponse({ message: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // Not found
    return jsonResponse({ message: "Not found" }, 404);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400);
  }
});
