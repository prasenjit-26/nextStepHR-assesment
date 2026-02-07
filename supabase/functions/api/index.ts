import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const TodoSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    title: z.string(),
    is_completed: z.boolean(),
    due_at: z.string().datetime().nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    inserted_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("Todo");

const TagSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
  })
  .openapi("Tag");

const SubtaskSchema = z
  .object({
    id: z.string().uuid(),
    todo_id: z.string().uuid(),
    user_id: z.string().uuid(),
    title: z.string(),
    is_done: z.boolean(),
    inserted_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("Subtask");

const TodoWithMetaSchema = TodoSchema.extend({
  tags: z.array(TagSchema),
  subtasks: z.array(SubtaskSchema),
}).openapi("TodoWithMeta");

const CreateTodoSchema = z
  .object({
    title: z.string().min(1),
    due_at: z.string().datetime().nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    tags: z.array(z.string().min(1)).optional(),
  })
  .openapi("CreateTodo");

const UpdateTodoSchema = z
  .object({
    title: z.string().min(1).optional(),
    is_completed: z.boolean().optional(),
    due_at: z.string().datetime().nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    tags: z.array(z.string().min(1)).optional(),
  })
  .openapi("UpdateTodo");

const CreateSubtaskSchema = z
  .object({
    title: z.string().min(1),
  })
  .openapi("CreateSubtask");

const UpdateSubtaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    is_done: z.boolean().optional(),
  })
  .openapi("UpdateSubtask");

const AiParseRequestSchema = z
  .object({
    text: z.string().min(1),
  })
  .openapi("AiParseRequest");

const AiParseResponseSchema = z
  .object({
    title: z.string().min(1),
    due_at: z.string().datetime().nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    tags: z.array(z.string().min(1)).optional(),
  })
  .openapi("AiParseResponse");

const AiRewriteRequestSchema = z
  .object({
    title: z.string().min(1),
  })
  .openapi("AiRewriteRequest");

const AiRewriteResponseSchema = z
  .object({
    title: z.string().min(1),
  })
  .openapi("AiRewriteResponse");

const AiSubtasksRequestSchema = z
  .object({
    title: z.string().min(1),
  })
  .openapi("AiSubtasksRequest");

const AiSubtasksResponseSchema = z
  .object({
    subtasks: z.array(z.string().min(1)).max(10),
  })
  .openapi("AiSubtasksResponse");

const AiTagsRequestSchema = z
  .object({
    title: z.string().min(1),
  })
  .openapi("AiTagsRequest");

const AiTagsResponseSchema = z
  .object({
    tags: z.array(z.string().min(1)).max(10),
  })
  .openapi("AiTagsResponse");

const ErrorSchema = z
  .object({
    message: z.string(),
  })
  .openapi("Error");

const SuccessSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("Success");

// ─────────────────────────────────────────────────────────────────────────────
// Supabase helpers
// ─────────────────────────────────────────────────────────────────────────────

function getSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing SUPABASE_ANON_KEY");

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

async function getAuthenticatedUser(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function normalizeTagNames(names: string[]) {
  return Array.from(
    new Set(
      names
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => t.toLowerCase())
    )
  );
}

async function ensureTags(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tagNames: string[]
) {
  const normalized = normalizeTagNames(tagNames);
  if (normalized.length === 0) return [] as { id: string; name: string }[];

  // Fetch existing tags for this user
  const { data: existing, error: fetchError } = await supabase
    .from("tags")
    .select("id,name")
    .eq("user_id", userId)
    .in("name", normalized);

  if (fetchError) throw new Error(fetchError.message);

  const existingNames = new Set((existing ?? []).map((t) => t.name));
  const toInsert = normalized.filter((n) => !existingNames.has(n));

  let inserted: { id: string; name: string }[] = [];
  if (toInsert.length > 0) {
    const { data, error: insertError } = await supabase
      .from("tags")
      .insert(toInsert.map((name) => ({ user_id: userId, name })))
      .select("id,name");
    if (insertError) throw new Error(insertError.message);
    inserted = data ?? [];
  }

  return [...(existing ?? []), ...inserted];
}

async function setTodoTags(
  supabase: ReturnType<typeof createClient>,
  todoId: string,
  tagIds: string[]
) {
  // Delete existing todo_tags for this todo
  const { error: deleteError } = await supabase
    .from("todo_tags")
    .delete()
    .eq("todo_id", todoId);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length === 0) return;

  // Insert new todo_tags
  const { error: insertError } = await supabase
    .from("todo_tags")
    .insert(tagIds.map((tag_id) => ({ todo_id: todoId, tag_id })));
  if (insertError) throw new Error(insertError.message);
}

async function hydrateTodos(
  supabase: ReturnType<typeof createClient>,
  todos: Array<z.infer<typeof TodoSchema>>
) {
  const ids = todos.map((t) => t.id);
  if (ids.length === 0) return [];

  const { data: todoTags, error: todoTagsError } = await supabase
    .from("todo_tags")
    .select("todo_id, tags(id,name)")
    .in("todo_id", ids);
  if (todoTagsError) throw new Error(todoTagsError.message);

  const { data: subtasks, error: subtasksError } = await supabase
    .from("subtasks")
    .select("*")
    .in("todo_id", ids)
    .order("inserted_at", { ascending: true });
  if (subtasksError) throw new Error(subtasksError.message);

  const tagsByTodoId = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of todoTags ?? []) {
    const tag = (row as unknown as { tags: { id: string; name: string } | null })
      .tags;
    if (!tag) continue;
    const arr = tagsByTodoId.get((row as { todo_id: string }).todo_id) ?? [];
    arr.push(tag);
    tagsByTodoId.set((row as { todo_id: string }).todo_id, arr);
  }

  const subtasksByTodoId = new Map<string, Array<z.infer<typeof SubtaskSchema>>>();
  for (const st of subtasks ?? []) {
    const arr = subtasksByTodoId.get(st.todo_id) ?? [];
    arr.push(st as z.infer<typeof SubtaskSchema>);
    subtasksByTodoId.set(st.todo_id, arr);
  }

  return todos.map((t) => ({
    ...t,
    tags: tagsByTodoId.get(t.id) ?? [],
    subtasks: subtasksByTodoId.get(t.id) ?? [],
  }));
}

async function openaiJson<T>(args: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  function extractJson(text: string) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

    const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return fenced[1].trim();

    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return trimmed.slice(first, last + 1);
    }

    throw new Error("Model did not return JSON");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Invalid OpenAI response");
  const parsed = JSON.parse(extractJson(content));
  return args.schema.parse(parsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// App setup
// ─────────────────────────────────────────────────────────────────────────────

const app = new OpenAPIHono().basePath("/api");

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type", "x-client-info", "apikey"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Auth middleware for /todos routes
app.use("/todos/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const supabase = getSupabaseClient(authHeader);
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  c.set("supabase" as never, supabase);
  c.set("user" as never, user);
  await next();
});

// Auth middleware for /ai routes
app.use("/ai/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const supabase = getSupabaseClient(authHeader);
  const user = await getAuthenticatedUser(supabase);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  c.set("supabase" as never, supabase);
  c.set("user" as never, user);
  await next();
});

// Auth middleware for /subtasks routes
app.use("/subtasks/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const supabase = getSupabaseClient(authHeader);
  const user = await getAuthenticatedUser(supabase);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  c.set("supabase" as never, supabase);
  c.set("user" as never, user);
  await next();
});

app.use("/ai", async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const supabase = getSupabaseClient(authHeader);
  const user = await getAuthenticatedUser(supabase);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  c.set("supabase" as never, supabase);
  c.set("user" as never, user);
  await next();
});

app.use("/todos", async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const supabase = getSupabaseClient(authHeader);
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  c.set("supabase" as never, supabase);
  c.set("user" as never, user);
  await next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /todos
const listTodosRoute = createRoute({
  method: "get",
  path: "/todos",
  tags: ["Todos"],
  summary: "List all todos",
  description: "Returns all todos for the authenticated user. Supports filters via query params.",
  security: [{ BearerAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      status: z.enum(["all", "pending", "completed"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      tag: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "List of todos",
      content: { "application/json": { schema: z.array(TodoWithMetaSchema) } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(listTodosRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const { search, status, priority, tag } = c.req.valid("query");

  let query = supabase.from("todos").select("*");

  // Filter by title search
  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  // Filter by completion status
  if (status === "pending") {
    query = query.eq("is_completed", false);
  } else if (status === "completed") {
    query = query.eq("is_completed", true);
  }

  // Filter by priority
  if (priority) {
    query = query.eq("priority", priority);
  }

  const { data, error } = await query.order("inserted_at", { ascending: false });

  if (error) return c.json({ message: error.message }, 400);
  try {
    let hydrated = await hydrateTodos(
      supabase,
      (data ?? []) as Array<z.infer<typeof TodoSchema>>
    );

    // Filter by tag (post-hydration since tags are in a join table)
    if (tag) {
      const tagLower = tag.toLowerCase();
      hydrated = hydrated.filter((t) =>
        t.tags.some((tg: { name: string }) => tg.name.toLowerCase() === tagLower)
      );
    }

    return c.json(hydrated, 200);
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

// POST /todos
const createTodoRoute = createRoute({
  method: "post",
  path: "/todos",
  tags: ["Todos"],
  summary: "Create a new todo",
  description: "Creates a new todo for the authenticated user.",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateTodoSchema } },
    },
  },
  responses: {
    201: {
      description: "Todo created",
      content: { "application/json": { schema: TodoWithMetaSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(createTodoRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const user = c.get("user" as never) as { id: string };
  const body = c.req.valid("json");

  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      due_at: body.due_at ?? null,
      priority: body.priority ?? "medium",
    })
    .select("*")
    .single();

  if (error) return c.json({ message: error.message }, 400);
  try {
    if (body.tags?.length) {
      const tags = await ensureTags(supabase, user.id, body.tags);
      await setTodoTags(
        supabase,
        (data as { id: string }).id,
        tags.map((t) => t.id)
      );
    }
    const hydrated = await hydrateTodos(
      supabase,
      [data as unknown as z.infer<typeof TodoSchema>]
    );
    return c.json(hydrated[0], 201);
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

// PATCH /todos/:id
const updateTodoRoute = createRoute({
  method: "patch",
  path: "/todos/{id}",
  tags: ["Todos"],
  summary: "Update a todo",
  description: "Updates a todo by ID.",
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: UpdateTodoSchema } },
    },
  },
  responses: {
    200: {
      description: "Todo updated",
      content: { "application/json": { schema: TodoWithMetaSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(updateTodoRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const user = c.get("user" as never) as { id: string };
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const updateData: {
    title?: string;
    is_completed?: boolean;
    due_at?: string | null;
    priority?: "low" | "medium" | "high";
  } = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.is_completed !== undefined) updateData.is_completed = body.is_completed;
  if (body.due_at !== undefined) updateData.due_at = body.due_at;
  if (body.priority !== undefined) updateData.priority = body.priority;

  if (Object.keys(updateData).length === 0 && body.tags === undefined) {
    return c.json({ message: "At least one field is required" }, 400);
  }

  let data;
  // Only call update if there are fields to update (not just tags)
  if (Object.keys(updateData).length > 0) {
    const { data: updated, error } = await supabase
      .from("todos")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return c.json({ message: error.message }, 400);
    data = updated;
  } else {
    // Just fetch existing todo when only tags are being updated
    const { data: existing, error } = await supabase
      .from("todos")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return c.json({ message: error.message }, 400);
    data = existing;
  }

  try {
    if (body.tags !== undefined) {
      const tags = await ensureTags(supabase, user.id, body.tags);
      await setTodoTags(
        supabase,
        (data as { id: string }).id,
        tags.map((t) => t.id)
      );
    }
    const hydrated = await hydrateTodos(
      supabase,
      [data as unknown as z.infer<typeof TodoSchema>]
    );
    return c.json(hydrated[0], 200);
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

// DELETE /todos/:id
const deleteTodoRoute = createRoute({
  method: "delete",
  path: "/todos/{id}",
  tags: ["Todos"],
  summary: "Delete a todo",
  description: "Deletes a todo by ID.",
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Todo deleted",
      content: { "application/json": { schema: SuccessSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(deleteTodoRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const { id } = c.req.valid("param");

  const { error } = await supabase.from("todos").delete().eq("id", id);

  if (error) return c.json({ message: error.message }, 400);
  return c.json({ success: true }, 200);
});

// GET /todos/:id/subtasks
const listSubtasksRoute = createRoute({
  method: "get",
  path: "/todos/{id}/subtasks",
  tags: ["Subtasks"],
  summary: "List subtasks for a todo",
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "List of subtasks",
      content: { "application/json": { schema: z.array(SubtaskSchema) } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(listSubtasksRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const { id } = c.req.valid("param");

  const { data, error } = await supabase
    .from("subtasks")
    .select("*")
    .eq("todo_id", id)
    .order("inserted_at", { ascending: true });

  if (error) return c.json({ message: error.message }, 400);
  return c.json(data ?? [], 200);
});

// POST /todos/:id/subtasks
const createSubtaskRoute = createRoute({
  method: "post",
  path: "/todos/{id}/subtasks",
  tags: ["Subtasks"],
  summary: "Create a subtask",
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: CreateSubtaskSchema } },
    },
  },
  responses: {
    201: {
      description: "Subtask created",
      content: { "application/json": { schema: SubtaskSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(createSubtaskRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const { data, error } = await supabase
    .from("subtasks")
    .insert({ todo_id: id, title: body.title.trim() })
    .select("*")
    .single();

  if (error) return c.json({ message: error.message }, 400);
  return c.json(data, 201);
});

// PATCH /subtasks/:id
const updateSubtaskRoute = createRoute({
  method: "patch",
  path: "/subtasks/{id}",
  tags: ["Subtasks"],
  summary: "Update a subtask",
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: UpdateSubtaskSchema } },
    },
  },
  responses: {
    200: {
      description: "Subtask updated",
      content: { "application/json": { schema: SubtaskSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(updateSubtaskRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  if (Object.keys(body).length === 0) {
    return c.json({ message: "At least one field is required" }, 400);
  }

  const { data, error } = await supabase
    .from("subtasks")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ message: error.message }, 400);
  return c.json(data, 200);
});

// DELETE /subtasks/:id
const deleteSubtaskRoute = createRoute({
  method: "delete",
  path: "/subtasks/{id}",
  tags: ["Subtasks"],
  summary: "Delete a subtask",
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Subtask deleted",
      content: { "application/json": { schema: SuccessSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(deleteSubtaskRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;
  const { id } = c.req.valid("param");

  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) return c.json({ message: error.message }, 400);
  return c.json({ success: true }, 200);
});

// POST /ai/parse
const aiParseRoute = createRoute({
  method: "post",
  path: "/ai/parse",
  tags: ["AI"],
  summary: "Smart add parsing",
  description: "Parse freeform text into structured todo fields.",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: AiParseRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Parsed fields",
      content: { "application/json": { schema: AiParseResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(aiParseRoute, async (c) => {
  const body = c.req.valid("json");
  try {
    const parsed = await openaiJson({
      system:
        "You convert messy todo text into JSON with keys: title (string), due_at (ISO datetime or null), priority (low|medium|high), tags (string[]). Return ONLY JSON.",
      user: body.text,
      schema: AiParseResponseSchema,
    });
    return c.json(parsed, 200);
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

// POST /ai/rewrite
const aiRewriteRoute = createRoute({
  method: "post",
  path: "/ai/rewrite",
  tags: ["AI"],
  summary: "Rewrite todo title",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: AiRewriteRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Rewritten title",
      content: { "application/json": { schema: AiRewriteResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(aiRewriteRoute, async (c) => {
  const body = c.req.valid("json");
  try {
    const rewritten = await openaiJson({
      system:
        "Rewrite the todo title to be clear, specific, and actionable. Output JSON {title}. Return ONLY JSON.",
      user: body.title,
      schema: AiRewriteResponseSchema,
    });
    return c.json(rewritten, 200);
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

// POST /ai/subtasks
const aiSubtasksRoute = createRoute({
  method: "post",
  path: "/ai/subtasks",
  tags: ["AI"],
  summary: "Generate subtasks",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: AiSubtasksRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Suggested subtasks",
      content: { "application/json": { schema: AiSubtasksResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(aiSubtasksRoute, async (c) => {
  const body = c.req.valid("json");
  try {
    const out = await openaiJson({
      system:
        "Generate up to 8 concise subtasks for the given todo. Output JSON {subtasks: string[]}. Return ONLY JSON.",
      user: body.title,
      schema: AiSubtasksResponseSchema,
    });
    return c.json(out, 200);
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

// POST /ai/tag
const aiTagsRoute = createRoute({
  method: "post",
  path: "/ai/tag",
  tags: ["AI"],
  summary: "Suggest tags",
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: AiTagsRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Suggested tags",
      content: { "application/json": { schema: AiTagsResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(aiTagsRoute, async (c) => {
  const body = c.req.valid("json");
  try {
    const out = await openaiJson({
      system:
        "Suggest up to 6 short tags for the given todo. Output JSON {tags: string[]}. Return ONLY JSON.",
      user: body.title,
      schema: AiTagsResponseSchema,
    });
    return c.json(out, 200);
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenAPI spec + docs
// ─────────────────────────────────────────────────────────────────────────────

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Todo API",
    version: "1.0.0",
    description: "A simple Todo API with Supabase authentication.",
  },
  servers: [{ url: "/functions/v1/api" }],
  security: [{ BearerAuth: [] }],
});

app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Supabase Auth JWT token",
});

app.get("/docs", () => {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Todo API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="https://gdfogprenglttjfcegla.supabase.co/functions/v1/api/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Serve
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve((req) => app.fetch(req));
