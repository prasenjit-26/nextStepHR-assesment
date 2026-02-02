import { supabase } from './supabase'

export type Todo = {
  id: string
  title: string
  is_completed: boolean
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

export function listTodos() {
  return apiFetch<Todo[]>('/functions/v1/api/todos', {
    method: 'GET',
  })
}

export function createTodo(input: { title: string }) {
  return apiFetch<Todo>('/functions/v1/api/todos', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateTodo(id: string, input: { title?: string; is_completed?: boolean }) {
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
