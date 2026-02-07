import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/button'
import TodoCard from '../components/todoCard'
import KanbanColumn from '../components/kanbanColumn'
import { Input } from '../components/input'
import {
  aiParse,
  aiRewrite,
  aiSubtasks,
  aiTag,
  createSubtask,
  createTodo,
  deleteTodo,
  listTodos,
  type Priority,
  type Todo,
  type TodoFilters,
  updateSubtask,
  updateTodo,
} from '../lib/api'

const schema = z.object({
  title: z.string().min(1),
  due_at: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof schema>


export function TodosPage() {
  const { signOut, user } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<TodoFilters>({})
  const [searchInput, setSearchInput] = useState('')

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const todosQuery = useQuery({
    queryKey: ['todos', filters],
    queryFn: () => listTodos(filters),
  })

  // Get unique tags for filter dropdown
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    todosQuery.data?.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag.name)))
    return Array.from(tagSet).sort()
  }, [todosQuery.data])

  // Find active todo for drag overlay
  const activeTodo = useMemo(() => {
    if (!activeDragId) return null
    return todosQuery.data?.find((t) => t.id === activeDragId) ?? null
  }, [activeDragId, todosQuery.data])

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const todoId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column
    if (overId === 'pending' || overId === 'completed') {
      const isCompleted = overId === 'completed'
      const todo = todosQuery.data?.find((t) => t.id === todoId)
      if (todo && todo.is_completed !== isCompleted) {
        // Optimistic update - immediately move to new column
        queryClient.setQueryData<Todo[]>(['todos', filters], (old) =>
          old?.map((t) => (t.id === todoId ? { ...t, is_completed: isCompleted } : t))
        )
        // Then mutate (will revalidate on success/error)
        updateMutation.mutate(
          { id: todoId, input: { is_completed: isCompleted } },
          {
            onError: () => {
              // Revert on error
              queryClient.setQueryData<Todo[]>(['todos', filters], (old) =>
                old?.map((t) => (t.id === todoId ? { ...t, is_completed: !isCompleted } : t))
              )
            },
          }
        )
      }
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', due_at: '', priority: 'medium', tags: '' },
  })

  const createMutation = useMutation({
    mutationFn: createTodo,
    onMutate: async (input) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })

      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])
      const tempId = `temp-${crypto.randomUUID()}`

      const optimisticTodo: Todo = {
        id: tempId,
        title: input.title,
        is_completed: false,
        due_at: input.due_at ?? null,
        priority: input.priority ?? 'medium',
        tags: (input.tags ?? []).map((name) => ({ id: `temp-${name}`, name })),
        subtasks: [],
        inserted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Todo[]>(['todos'], (old) => [optimisticTodo, ...(old ?? [])])

      return { previousTodos, tempId }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
      form.reset({ title: '', due_at: '', priority: 'medium', tags: '' })
    },
    onError: (e: unknown, _input, ctx) => {
      if (ctx?.previousTodos) queryClient.setQueryData(['todos'], ctx.previousTodos)
      setError(e instanceof Error ? e.message : 'Create failed')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateTodo>[1] }) =>
      updateTodo(id, input),
    onMutate: async ({ id, input }) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])

      const { tags, ...rest } = input

      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((t) => {
          if (t.id !== id) return t
          const next: Todo = {
            ...t,
            ...rest,
          }
          if (tags) {
            next.tags = tags.map((name) => ({ id: `temp-${name}`, name }))
          }
          next.updated_at = new Date().toISOString()
          return next
        })
      )

      return { previousTodos }
    },
    onError: (e: unknown, _vars, ctx) => {
      if (ctx?.previousTodos) queryClient.setQueryData(['todos'], ctx.previousTodos)
      setError(e instanceof Error ? e.message : 'Update failed')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const aiParseMutation = useMutation({
    mutationFn: aiParse,
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'AI parse failed'),
  })

  const aiRewriteMutation = useMutation({
    mutationFn: aiRewrite,
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'AI rewrite failed'),
  })

  const aiTagsMutation = useMutation({
    mutationFn: aiTag,
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'AI tag failed'),
  })

  const aiSubtasksMutation = useMutation({
    mutationFn: aiSubtasks,
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'AI subtasks failed'),
  })

  const createSubtaskMutation = useMutation({
    mutationFn: ({ todoId, title }: { todoId: string; title: string }) =>
      createSubtask(todoId, { title }),
    onMutate: async ({ todoId, title }) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])
      const tempId = `temp-${crypto.randomUUID()}`

      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((t) => {
          if (t.id !== todoId) return t
          const subtasks = t.subtasks ?? []
          return {
            ...t,
            subtasks: [
              ...subtasks,
              {
                id: tempId,
                todo_id: todoId,
                user_id: user?.id ?? '',
                title,
                is_done: false,
                inserted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          }
        })
      )
      return { previousTodos }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: (e: unknown, _vars, ctx) => {
      if (ctx?.previousTodos) queryClient.setQueryData(['todos'], ctx.previousTodos)
      setError(e instanceof Error ? e.message : 'Create subtask failed')
    },
  })

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ id, is_done }: { id: string; is_done: boolean }) => updateSubtask(id, { is_done }),
    onMutate: async ({ id, is_done }) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])

      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((t) => ({
          ...t,
          subtasks: (t.subtasks ?? []).map((s) => (s.id === id ? { ...s, is_done } : s)),
        }))
      )

      return { previousTodos }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: (e: unknown, _vars, ctx) => {
      if (ctx?.previousTodos) queryClient.setQueryData(['todos'], ctx.previousTodos)
      setError(e instanceof Error ? e.message : 'Update subtask failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onMutate: async (id) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.filter((t) => t.id !== id)
      )
      return { previousTodos }
    },
    onError: (e: unknown, _id, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos)
      }
      setError(e instanceof Error ? e.message : 'Failed to delete task')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const todos = useMemo<Todo[]>(() => todosQuery.data ?? [], [todosQuery.data])
  const pendingTodos = useMemo(() => todos.filter((t) => !t.is_completed), [todos])
  const completedTodos = useMemo(() => todos.filter((t) => t.is_completed), [todos])

  async function onSubmit(values: FormValues) {
    setError(null)

    const tags = (values.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const dueAtIso = values.due_at ? new Date(values.due_at).toISOString() : null

    await createMutation.mutateAsync({
      title: values.title,
      due_at: dueAtIso,
      priority: (values.priority as Priority | undefined) ?? 'medium',
      tags: tags.length ? tags : undefined,
    })
  }

  async function onSmartAdd() {
    setError(null)
    const text = form.getValues('title')
    if (!text || text.trim().length === 0) return

    const parsed = await aiParseMutation.mutateAsync({ text })

    // Create immediately so the user sees it show up in the UI.
    await createMutation.mutateAsync({
      title: parsed.title,
      due_at: parsed.due_at ?? null,
      priority: (parsed.priority as Priority | undefined) ?? 'medium',
      tags: parsed.tags,
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Tasks</h1>
            <p className="text-sm text-slate-500">Signed in as {user?.email}</p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            Logout
          </Button>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <form className="flex gap-2" onSubmit={form.handleSubmit(onSubmit)}>
            <Input
              placeholder="What needs to be done?"
              className="flex-1"
              {...form.register('title')}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onSmartAdd}
              disabled={aiParseMutation.isPending || createMutation.isPending}
              className="btn-animated"
            >
              {aiParseMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Parsing...
                </span>
              ) : '✨ Smart Add'}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || createMutation.isPending} className="btn-animated">
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </span>
              ) : '+ Add Task'}
            </Button>
          </form>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <Input type="datetime-local" placeholder="Due date" {...form.register('due_at')} />
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              {...form.register('priority')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <Input placeholder="Tags (comma separated)" {...form.register('tags')} />
          </div>

          {form.formState.errors.title?.message ? (
            <p className="mt-2 text-sm text-red-600 animate-shake">{form.formState.errors.title.message}</p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600 animate-shake">{error}</p> : null}
        </section>

        {/* Filters */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Filters:</span>
            </div>

            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by title..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFilters((f) => ({ ...f, search: searchInput || undefined }))
                  }
                }}
                onBlur={() => setFilters((f) => ({ ...f, search: searchInput || undefined }))}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              />
            </div>

            <select
              value={filters.status ?? 'all'}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as 'all' | 'pending' | 'completed',
                }))
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filters.priority ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  priority: (e.target.value as Priority) || undefined,
                }))
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <select
              value={filters.tag ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tag: e.target.value || undefined }))
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            {(filters.search || filters.status !== 'all' || filters.priority || filters.tag) && (
              <button
                type="button"
                onClick={() => {
                  setFilters({})
                  setSearchInput('')
                }}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {todosQuery.isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">Loading tasks…</p>
          </div>
        ) : todosQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">
              {todosQuery.error instanceof Error ? todosQuery.error.message : 'Failed to load'}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6">
              <KanbanColumn title="Pending" count={pendingTodos.length} accentColor="bg-blue-500" id="pending">
                {pendingTodos.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">No pending tasks</p>
                ) : (
                  pendingTodos.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={() => updateMutation.mutate({ id: todo.id, input: { is_completed: true } })}
                      onDelete={() => deleteMutation.mutate(todo.id)}
                      onEdit={(updates) => updateMutation.mutate({ id: todo.id, input: updates })}
                      isToggling={updateMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                      isAiWorking={
                        aiRewriteMutation.isPending ||
                        aiTagsMutation.isPending ||
                        aiSubtasksMutation.isPending
                      }
                      onAiRewrite={async () => {
                        setError(null)
                        const out = await aiRewriteMutation.mutateAsync({ title: todo.title })
                        await updateMutation.mutateAsync({ id: todo.id, input: { title: out.title } })
                      }}
                      onAiSuggestTags={async () => {
                        setError(null)
                        const out = await aiTagsMutation.mutateAsync({ title: todo.title })
                        await updateMutation.mutateAsync({ id: todo.id, input: { tags: out.tags } })
                      }}
                      onAiSuggestSubtasks={async () => {
                        setError(null)
                        const out = await aiSubtasksMutation.mutateAsync({ title: todo.title })
                        for (const st of out.subtasks) {
                          await createSubtaskMutation.mutateAsync({ todoId: todo.id, title: st })
                        }
                      }}
                      onCreateSubtask={(title) =>
                        createSubtaskMutation.mutate({ todoId: todo.id, title })
                      }
                      onToggleSubtask={(id, is_done) =>
                        updateSubtaskMutation.mutate({ id, is_done })
                      }
                    />
                  ))
                )}
              </KanbanColumn>

              <KanbanColumn title="Completed" count={completedTodos.length} accentColor="bg-emerald-500" id="completed">
                {completedTodos.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">No completed tasks</p>
                ) : (
                  completedTodos.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={() => updateMutation.mutate({ id: todo.id, input: { is_completed: false } })}
                      onDelete={() => deleteMutation.mutate(todo.id)}
                      onEdit={(updates) => updateMutation.mutate({ id: todo.id, input: updates })}
                      isToggling={updateMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                      isAiWorking={
                        aiRewriteMutation.isPending ||
                        aiTagsMutation.isPending ||
                        aiSubtasksMutation.isPending
                      }
                      onAiRewrite={async () => {
                        setError(null)
                        const out = await aiRewriteMutation.mutateAsync({ title: todo.title })
                        await updateMutation.mutateAsync({ id: todo.id, input: { title: out.title } })
                      }}
                      onAiSuggestTags={async () => {
                        setError(null)
                        const out = await aiTagsMutation.mutateAsync({ title: todo.title })
                        await updateMutation.mutateAsync({ id: todo.id, input: { tags: out.tags } })
                      }}
                      onAiSuggestSubtasks={async () => {
                        setError(null)
                        const out = await aiSubtasksMutation.mutateAsync({ title: todo.title })
                        for (const st of out.subtasks) {
                          await createSubtaskMutation.mutateAsync({ todoId: todo.id, title: st })
                        }
                      }}
                      onCreateSubtask={(title) =>
                        createSubtaskMutation.mutate({ todoId: todo.id, title })
                      }
                      onToggleSubtask={(id, is_done) =>
                        updateSubtaskMutation.mutate({ id, is_done })
                      }
                    />
                  ))
                )}
              </KanbanColumn>
            </div>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
              {activeTodo ? (
                <div className="drag-overlay rounded-lg border border-blue-300 bg-white p-3">
                  <p className="text-sm font-medium text-slate-800">{activeTodo.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                      activeTodo.priority === 'high' ? 'bg-red-100 text-red-700' :
                      activeTodo.priority === 'low' ? 'bg-slate-100 text-slate-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {activeTodo.priority ?? 'medium'}
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
