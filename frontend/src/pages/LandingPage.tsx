import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Sparkles,
  Tags,
  ListTodo,
  Filter,
  GripVertical,
  Clock,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Smart Add',
    description: 'Just type naturally and let AI extract tasks, due dates, and priorities automatically.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Tags,
    title: 'AI Tag Suggestions',
    description: 'Get intelligent tag recommendations based on your task content.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: ListTodo,
    title: 'AI Subtasks Generation',
    description: 'Break down complex tasks into manageable subtasks with one click.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: GripVertical,
    title: 'Drag & Drop Kanban',
    description: 'Move tasks between columns with intuitive drag and drop.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Filter,
    title: 'Advanced Filters',
    description: 'Filter by status, priority, tags, or search by title.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: Clock,
    title: 'Due Dates & Priorities',
    description: 'Set deadlines and priority levels to stay organized.',
    color: 'bg-cyan-100 text-cyan-600',
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Create an Account',
    description: 'Sign up in seconds with just your email.',
  },
  {
    step: '2',
    title: 'Add Your Tasks',
    description: 'Use Smart Add or manually create tasks with details.',
  },
  {
    step: '3',
    title: 'Stay Organized',
    description: 'Drag tasks, filter by tags, and track progress easily.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Powered by AI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            The Smartest Way to
            <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              {' '}Manage Tasks
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            TaskFlow combines the power of AI with beautiful Kanban boards to help you
            stay organized, focused, and productive.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              Start Free — No Credit Card
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              I Have an Account
            </Link>
          </div>
        </div>
      </section>

      {/* Preview Image/Demo */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
            <div className="p-8 bg-slate-100">
              <div className="flex gap-6">
                {/* Pending Column Preview */}
                <div className="flex-1 rounded-lg overflow-hidden shadow-lg">
                  <div className="bg-blue-500 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Pending</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs text-white">3</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 space-y-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                      <p className="text-sm font-medium text-slate-800">Complete project proposal</p>
                      <div className="mt-2 flex gap-2">
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">high</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs">#work</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                      <p className="text-sm font-medium text-slate-800">Review team feedback</p>
                      <div className="mt-2 flex gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">medium</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Completed Column Preview */}
                <div className="flex-1 rounded-lg overflow-hidden shadow-lg">
                  <div className="bg-emerald-500 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Completed</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs text-white">2</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 space-y-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                      <p className="text-sm font-medium text-slate-800 line-through text-slate-400">Setup development environment</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                      <p className="text-sm font-medium text-slate-800 line-through text-slate-400">Create database schema</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Stay Productive
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features designed to help you work smarter, not harder.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all bg-white"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-slate-600">
              Three simple steps to transform your productivity.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 right-0 w-8 text-slate-300">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Boost Your Productivity?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Join thousands of users who have transformed how they manage tasks.
          </p>
          <Link
            to="/signup"
            className="inline-block px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">TaskFlow</span>
          </div>
          <p className="text-sm">© 2026 TaskFlow. Built with AI-powered features.</p>
        </div>
      </footer>
    </div>
  )
}
