import React from 'react'
import { useDroppable } from '@dnd-kit/core'

export default function KanbanColumn({ title, count, children, accentColor, id }: {
  title: string
  count: number
  children: React.ReactNode
  accentColor: string
  id: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

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
      <div
        ref={setNodeRef}
        className={`rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 p-3 min-h-[300px] transition-colors ${
          isOver ? 'bg-slate-100 border-blue-300' : ''
        }`}
      >
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
