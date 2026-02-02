import { type Todo } from '../lib/api'

export default function TodoCard({ todo,
  onToggle,
  onDelete,
  isToggling,
  isDeleting, }: {
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
          className={`text-xs px-2 py-1 rounded transition-colors ${todo.is_completed
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
