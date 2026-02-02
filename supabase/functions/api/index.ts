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
    inserted_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("Todo");

const CreateTodoSchema = z
  .object({
    title: z.string().min(1),
  })
  .openapi("CreateTodo");

const UpdateTodoSchema = z
  .object({
    title: z.string().min(1).optional(),
    is_completed: z.boolean().optional(),
  })
  .openapi("UpdateTodo");

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
  description: "Returns all todos for the authenticated user.",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: "List of todos",
      content: { "application/json": { schema: z.array(TodoSchema) } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

app.openapi(listTodosRoute, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createClient>;

  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("inserted_at", { ascending: false });

  if (error) return c.json({ message: error.message }, 400);
  return c.json(data ?? [], 200);
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
      content: { "application/json": { schema: TodoSchema } },
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
    .insert({ user_id: user.id, title: body.title.trim() })
    .select("*")
    .single();

  if (error) return c.json({ message: error.message }, 400);
  return c.json(data, 201);
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
      content: { "application/json": { schema: TodoSchema } },
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
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const updateData: { title?: string; is_completed?: boolean } = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.is_completed !== undefined) updateData.is_completed = body.is_completed;

  if (Object.keys(updateData).length === 0) {
    return c.json({ message: "At least one field is required" }, 400);
  }

  const { data, error } = await supabase
    .from("todos")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ message: error.message }, 400);
  return c.json(data, 200);
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
