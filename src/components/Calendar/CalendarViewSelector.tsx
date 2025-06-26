import { Calendar, List, Eye, EyeOff } from 'lucide-react'
import { Button } from '../ui/Button'

export type CalendarViewType = 'weekly' | 'daily' | 'simplified-weekly' | 'simplified-daily' | 'list'

interface CalendarViewSelectorProps {
  currentView: CalendarViewType
  onViewChange: (view: CalendarViewType) => void
}

export const CalendarViewSelector = ({ currentView, onViewChange }: CalendarViewSelectorProps) => {
  const views = [
    { id: 'weekly' as const, label: 'Week', icon: Calendar },
    { id: 'daily' as const, label: 'Day', icon: Calendar },
    { id: 'simplified-weekly' as const, label: 'Simple Week', icon: EyeOff },
    { id: 'simplified-daily' as const, label: 'Simple Day', icon: EyeOff },
    { id: 'list' as const, label: 'List', icon: List },
  ]

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      {views.map((view) => {
        const IconComponent = view.icon
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentView === view.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <IconComponent className="h-4 w-4 mr-1" />
            {view.label}
          </button>
        )
      })}
    </div>
  )
}