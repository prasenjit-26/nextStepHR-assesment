import { supabase } from './supabase'

export type Priority = 'low' | 'medium' | 'high'

export type Tag = {
  id: string
  name: string
}

export type Subtask = {
  id: string
  todo_id: string
  user_id: string
  title: string
  is_done: boolean
  inserted_at: string
  updated_at: string
}

export type Todo = {
  id: string
  title: string
  is_completed: boolean
  due_at?: string | null
  priority?: Priority
  tags?: Tag[]
  subtasks?: Subtask[]
  inserted_at: string
  updated_at: string
}

type ApiError = {
  message: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = apiBaseUrl ? `${apiBaseUrl}${path}` : path
  const token = await getAccessToken()
  console.log('token', token)
  if (!token) {
    throw new Error('Not authenticated')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY')
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    let err: ApiError | undefined
    try {
      err = (await res.json()) as ApiError
    } catch {
      err = undefined
    }
    throw new Error(err?.message ?? `Request failed: ${res.status}`)
  }

  return (await res.json()) as T
}

export type TodoFilters = {
  search?: string
  status?: 'all' | 'pending' | 'completed'
  priority?: Priority
  tag?: string
}

export function listTodos(filters?: TodoFilters) {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.priority) params.set('priority', filters.priority)
  if (filters?.tag) params.set('tag', filters.tag)

  const queryString = params.toString()
  const url = `/functions/v1/api/todos${queryString ? `?${queryString}` : ''}`

  return apiFetch<Todo[]>(url, {
    method: 'GET',
  })
}

export function createTodo(input: {
  title: string
  due_at?: string | null
  priority?: Priority
  tags?: string[]
}) {
  return apiFetch<Todo>('/functions/v1/api/todos', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateTodo(
  id: string,
  input: {
    title?: string
    is_completed?: boolean
    due_at?: string | null
    priority?: Priority
    tags?: string[]
  }
) {
  return apiFetch<Todo>(`/functions/v1/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteTodo(id: string) {
  return apiFetch<{ success: true }>(`/functions/v1/api/todos/${id}`, {
    method: 'DELETE',
  })
}

export function listSubtasks(todoId: string) {
  return apiFetch<Subtask[]>(`/functions/v1/api/todos/${todoId}/subtasks`, {
    method: 'GET',
  })
}

export function createSubtask(todoId: string, input: { title: string }) {
  return apiFetch<Subtask>(`/functions/v1/api/todos/${todoId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSubtask(id: string, input: { title?: string; is_done?: boolean }) {
  return apiFetch<Subtask>(`/functions/v1/api/subtasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteSubtask(id: string) {
  return apiFetch<{ success: true }>(`/functions/v1/api/subtasks/${id}`, {
    method: 'DELETE',
  })
}

export function aiParse(input: { text: string }) {
  return apiFetch<{ title: string; due_at?: string | null; priority?: Priority; tags?: string[] }>(
    `/functions/v1/api/ai/parse`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export function aiRewrite(input: { title: string }) {
  return apiFetch<{ title: string }>(`/functions/v1/api/ai/rewrite`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function aiSubtasks(input: { title: string }) {
  return apiFetch<{ subtasks: string[] }>(`/functions/v1/api/ai/subtasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function aiTag(input: { title: string }) {
  return apiFetch<{ tags: string[] }>(`/functions/v1/api/ai/tag`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
