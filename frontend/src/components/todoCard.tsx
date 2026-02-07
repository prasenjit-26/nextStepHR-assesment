import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { type Todo, type Priority } from '../lib/api'

function formatDue(dueAt?: string | null) {
  if (!dueAt) return null
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString()
}

function priorityLabel(priority?: Todo['priority']) {
  if (!priority) return 'medium'
  return priority
}

function priorityClass(priority?: Todo['priority']) {
  if (priority === 'high') return 'bg-red-100 text-red-700'
  if (priority === 'low') return 'bg-slate-100 text-slate-700'
  return 'bg-amber-100 text-amber-700'
}

export default function TodoCard({
  todo,
  onToggle,
  onDelete,
  onEdit,
  isToggling,
  isDeleting,
  onAiRewrite,
  onAiSuggestTags,
  onAiSuggestSubtasks,
  onCreateSubtask,
  onToggleSubtask,
  isAiWorking,
}: {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
  onEdit: (updates: { title?: string; priority?: Priority; due_at?: string | null }) => void
  isToggling: boolean
  isDeleting: boolean
  onAiRewrite: () => void
  onAiSuggestTags: () => void
  onAiSuggestSubtasks: () => void
  onCreateSubtask: (title: string) => void
  onToggleSubtask: (id: string, is_done: boolean) => void
  isAiWorking: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority ?? 'medium')
  const [editDueAt, setEditDueAt] = useState(todo.due_at ?? '')

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    data: { todo },
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  } as React.CSSProperties

  const due = formatDue(todo.due_at)
  const tags = todo.tags ?? []
  const subtasks = todo.subtasks ?? []

  const handleSave = () => {
    if (!editTitle.trim()) return
    onEdit({ title: editTitle.trim(), priority: editPriority, due_at: editDueAt || null })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(todo.title)
    setEditPriority(todo.priority ?? 'medium')
    setEditDueAt(todo.due_at ?? '')
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md animate-fade-slide-in ${
        isDragging ? 'opacity-50 scale-[0.98]' : ''
      }`}
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Priority)}
              className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="datetime-local"
              value={editDueAt}
              onChange={(e) => setEditDueAt(e.target.value)}
              className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleCancel} className="rounded bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-1 text-slate-300 hover:text-slate-500">
              ⠿
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{todo.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${priorityClass(todo.priority)}`}>
                  {priorityLabel(todo.priority)}
                </span>
                {due ? (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">Due: {due}</span>
                ) : null}
                {tags.length ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {tags.map((t) => (
                      <span key={t.id} className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
                        #{t.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500 text-xs"
                type="button"
              >
                ✎
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 text-xs"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>

          {subtasks.length ? (
            <div className="mt-3 space-y-1">
              {subtasks.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer group/subtask">
                  <input
                    type="checkbox"
                    checked={s.is_done}
                    onChange={(e) => onToggleSubtask(s.id, e.target.checked)}
                    className="checkbox-animated rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className={`transition-all duration-200 ${s.is_done ? 'line-through text-slate-400' : 'group-hover/subtask:text-slate-900'}`}>{s.title}</span>
                </label>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">{new Date(todo.inserted_at).toLocaleDateString()}</span>
            <div className="flex items-center gap-2">
              <button onClick={onAiRewrite} disabled={isAiWorking} className="btn-animated text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50" type="button">
                {isAiWorking ? <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : 'AI Rewrite'}
              </button>
              <button onClick={onAiSuggestTags} disabled={isAiWorking} className="btn-animated text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50" type="button">
                {isAiWorking ? <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : 'AI Tags'}
              </button>
              <button onClick={onAiSuggestSubtasks} disabled={isAiWorking} className="btn-animated text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50" type="button">
                {isAiWorking ? <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : 'AI Subtasks'}
              </button>
              <button
                onClick={onToggle}
                disabled={isToggling}
                className={`btn-animated text-xs px-2 py-1 rounded transition-all duration-200 ${
                  todo.is_completed ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                } ${isToggling ? 'animate-pulse' : ''}`}
                type="button"
              >
                {todo.is_completed ? '← Pending' : 'Complete →'}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              placeholder="Add subtask"
              type="text"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                const value = (e.currentTarget.value ?? '').trim()
                if (!value) return
                onCreateSubtask(value)
                e.currentTarget.value = ''
              }}
            />
            <span className="text-[11px] text-slate-400">Enter</span>
          </div>
        </>
      )}
    </div>
  )
}
