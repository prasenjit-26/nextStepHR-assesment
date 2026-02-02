import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { createTodo, deleteTodo, listTodos, type Todo, updateTodo } from '../lib/api'

const schema = z.object({
  title: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

function TodoCard({
  todo,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
  isToggling: boolean
  isDeleting: boolean
}) {
  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm font-medium text-slate-800">{todo.title}</p>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 text-xs"
          type="button"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {new Date(todo.inserted_at).toLocaleDateString()}
        </span>
        <button
          onClick={onToggle}
          disabled={isToggling}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            todo.is_completed
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          }`}
          type="button"
        >
          {todo.is_completed ? '← Move to Pending' : 'Mark Complete →'}
        </button>
      </div>
    </div>
  )
}

function KanbanColumn({
  title,
  count,
  children,
  accentColor,
}: {
  title: string
  count: number
  children: React.ReactNode
  accentColor: string
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`rounded-t-lg px-4 py-3 ${accentColor}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">{title}</h2>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
            {count}
          </span>
        </div>
      </div>
      <div className="rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 p-3 min-h-[300px]">
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

export function TodosPage() {
  const { signOut, user } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const todosQuery = useQuery({
    queryKey: ['todos'],
    queryFn: listTodos,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '' },
  })

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
      form.reset({ title: '' })
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Create failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_completed }: { id: string; is_completed: boolean }) =>
      updateTodo(id, { is_completed }),
    onMutate: async ({ id, is_completed }) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, is_completed } : t))
      )
      return { previousTodos }
    },
    onError: (e: unknown, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos)
      }
      setError(e instanceof Error ? e.message : 'Failed to move task')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] })
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
    await createMutation.mutateAsync({ title: values.title })
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
            <Button type="submit" disabled={form.formState.isSubmitting || createMutation.isPending}>
              Add Task
            </Button>
          </form>
          {form.formState.errors.title?.message ? (
            <p className="mt-2 text-sm text-red-600">{form.formState.errors.title.message}</p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
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
          <div className="flex gap-6">
            <KanbanColumn title="Pending" count={pendingTodos.length} accentColor="bg-blue-500">
              {pendingTodos.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">No pending tasks</p>
              ) : (
                pendingTodos.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onToggle={() => toggleMutation.mutate({ id: todo.id, is_completed: true })}
                    onDelete={() => deleteMutation.mutate(todo.id)}
                    isToggling={toggleMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                  />
                ))
              )}
            </KanbanColumn>

            <KanbanColumn title="Completed" count={completedTodos.length} accentColor="bg-emerald-500">
              {completedTodos.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">No completed tasks</p>
              ) : (
                completedTodos.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onToggle={() => toggleMutation.mutate({ id: todo.id, is_completed: false })}
                    onDelete={() => deleteMutation.mutate(todo.id)}
                    isToggling={toggleMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                  />
                ))
              )}
            </KanbanColumn>
          </div>
        )}
      </div>
    </div>
  )
}
