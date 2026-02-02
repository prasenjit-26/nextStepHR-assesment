import React from 'react'

export default function KanbanColumn({ title, count, children, accentColor }: {
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
  );
}
