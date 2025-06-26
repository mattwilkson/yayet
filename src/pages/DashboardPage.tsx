import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchOptimizedDashboardData, performanceMonitor, cacheUtils } from '../lib/optimizedQueries'
import { AdvancedCalendar } from '../components/Calendar/AdvancedCalendar'
import { CustomEventModal } from '../components/EventModal/CustomEventModal'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FamilyManagement } from '../components/FamilyManagement'
import { UserMenu } from '../components/UserMenu'
import { generateICalendar, downloadFile } from '../lib/utils'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Users, 
  Download, 
  User,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'

export const DashboardPage = () => {
  const { user, userProfile, signOut } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [familyInfo, setFamilyInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showFamilyModal, setShowFamilyModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [newEventData, setNewEventData] = useState<{ startTime: Date; endTime: Date } | null>(null)
  const [viewMode, setViewMode] = useState<'full' | 'personal'>('full')
  const [currentDate, setCurrentDate] = useState(new Date())

  console.log('🎯 DashboardPage render:', {
    hasUser: !!user,
    hasProfile: !!userProfile,
    familyId: userProfile?.family_id,
    loading,
    currentDate: currentDate.toISOString(),
    timestamp: new Date().toISOString()
  })

  useEffect(() => {
    if (userProfile?.family_id) {
      console.log('🏠 User has family, starting optimized data fetch...')
      fetchData()
    } else {
      console.log('🏠 User has no family, skipping data fetch')
      setLoading(false)
    }
  }, [userProfile, viewMode])

  const fetchData = async () => {
    const timer = performanceMonitor.startTimer('DashboardPage.fetchData')
    console.log('📊 Starting optimized dashboard data fetch at', new Date().toISOString())
    setLoading(true)
    
    try {
      const dashboardData = await fetchOptimizedDashboardData(
        userProfile!.family_id,
        currentDate,
        viewMode,
        user!.id
      )
      
      setFamilyInfo(dashboardData.familyInfo)
      setEvents(dashboardData.events)
      setFamilyMembers(dashboardData.familyMembers)
      
      console.log('📊 Dashboard data loaded successfully:', {
        familyInfo: !!dashboardData.familyInfo,
        eventsCount: dashboardData.events.length,
        familyMembersCount: dashboardData.familyMembers.length
      })
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      timer.end()
    }
  }

  const handleEventClick = (event: any) => {
    // Don't allow editing holidays or special events
    if (event.isHoliday || event.isSpecialEvent) return
    
    console.log('🖱️ Event clicked:', event)
    setSelectedEvent(event)
    setNewEventData(null)
    setShowEventModal(true)
  }

  const handleCreateEvent = (startTime: Date, endTime: Date) => {
    console.log('📅 DashboardPage.handleCreateEvent called:', { 
      startTime: startTime.toISOString(), 
      endTime: endTime.toISOString(),
      currentDate: currentDate.toISOString(),
      source: 'calendar_click'
    })
    
    setSelectedEvent(null)
    setNewEventData({ startTime, endTime })
    setShowEventModal(true)
  }

  const handleEventModalClose = () => {
    console.log('📅 Event modal closing')
    setShowEventModal(false)
    setSelectedEvent(null)
    setNewEventData(null)
  }

  const handleEventSave = async () => {
    console.log('📅 Event saved, refreshing events')
    
    // Clear cache for this family to ensure fresh data
    cacheUtils.clearFamily(userProfile!.family_id)
    
    await fetchData()
    handleEventModalClose()
  }

  const handleExportCalendar = async () => {
    try {
      // Filter out holidays and special events from export
      const eventsToExport = events.filter(event => !event.isHoliday && !event.isSpecialEvent)
      const icalContent = generateICalendar(eventsToExport)
      const familyName = familyInfo?.family_name || 'Family'
      const filename = `${familyName}_${viewMode === 'personal' ? 'personal' : 'family'}_calendar.ics`
      downloadFile(icalContent, filename, 'text/calendar')
    } catch (error) {
      console.error('Error exporting calendar:', error)
    }
  }

  const handleRefreshData = async () => {
    console.log('🔄 Manual data refresh requested')
    cacheUtils.clearFamily(userProfile!.family_id)
    await fetchData()
  }

  // Refetch events when date changes
  useEffect(() => {
    if (userProfile?.family_id) {
      console.log('📅 Date changed, refetching events...')
      fetchData()
    }
  }, [currentDate])

  if (loading) {
    console.log('⏳ DashboardPage showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading Dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching your family data</p>
        </div>
      </div>
    )
  }

  const familyName = familyInfo?.family_name || 'Family'

  // Prepare event data for the modal with correct date handling
  const eventModalData = (() => {
    if (newEventData) {
      console.log('📅 Event modal data from calendar click:', {
        source: 'calendar_click',
        startTime: newEventData.startTime.toISOString(),
        endTime: newEventData.endTime.toISOString()
      })
      
      return {
        title: '',
        description: '',
        start_time: newEventData.startTime.toISOString(),
        end_time: newEventData.endTime.toISOString(),
        all_day: false,
        location: '',
      }
    } else if (selectedEvent) {
      console.log('📅 Event modal data from existing event:', {
        source: 'existing_event',
        eventId: selectedEvent.id,
        startTime: selectedEvent.start_time
      })
      return selectedEvent
    } else {
      const defaultStartTime = new Date(currentDate)
      defaultStartTime.setHours(9, 0, 0, 0)
      
      const defaultEndTime = new Date(defaultStartTime)
      defaultEndTime.setHours(10, 0, 0, 0)
      
      console.log('📅 Event modal data from new event button:', {
        source: 'new_event_button',
        currentCalendarDate: currentDate.toISOString(),
        defaultStartTime: defaultStartTime.toISOString(),
        defaultEndTime: defaultEndTime.toISOString()
      })
      
      return {
        title: '',
        description: '',
        start_time: defaultStartTime.toISOString(),
        end_time: defaultEndTime.toISOString(),
        all_day: false,
        location: '',
      }
    }
  })()

  console.log('🎨 DashboardPage rendering UI')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {familyName}
                </h1>
                <p className="text-sm text-gray-500">
                  Family Scheduler
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('personal')}
                  className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'personal'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <User className="h-4 w-4 mr-1" />
                  My Events
                </button>
                <button
                  onClick={() => setViewMode('full')}
                  className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'full'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Full Family
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCalendar}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Button
                onClick={() => {
                  console.log('📅 New Event button clicked')
                  setSelectedEvent(null)
                  setNewEventData(null)
                  setShowEventModal(true)
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>

              {userProfile?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFamilyModal(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Family
                </Button>
              )}

              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {viewMode === 'personal' ? 'My Calendar' : 'Family Calendar'}
            </h2>
            <p className="text-gray-600">
              {viewMode === 'personal' 
                ? 'Events you\'re assigned to or responsible for'
                : 'All family events, activities, birthdays, anniversaries, and holidays'
              }
            </p>
            <p className="text-sm text-gray-500 mt-1">
              💡 Click on empty time slots to create new events, or drag to set duration
            </p>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            {viewMode === 'personal' ? (
              <EyeOff className="h-4 w-4 mr-1" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            {events.filter(e => !e.isHoliday && !e.isSpecialEvent).length} event{events.filter(e => !e.isHoliday && !e.isSpecialEvent).length !== 1 ? 's' : ''} 
            {viewMode === 'full' && (
              <span className="ml-2">
                + {events.filter(e => e.isHoliday).length} holiday{events.filter(e => e.isHoliday).length !== 1 ? 's' : ''}
                + {events.filter(e => e.isSpecialEvent).length} special event{events.filter(e => e.isSpecialEvent).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Calendar - Takes remaining space */}
        <div className="flex-1 min-h-0">
          <AdvancedCalendar
            events={events}
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateEvent}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        </div>
      </main>

      {/* Event Modal */}
      <CustomEventModal
  isOpen={false}
  onClose={() => {}}
  onSave={() => {}}
  onDelete={() => {}}
  event={{}}
  familyMembers={[]}
  familyId=""
  userId=""
/>

      {/* Family Management Modal */}
      {userProfile?.role === 'admin' && (
        <Modal
          isOpen={showFamilyModal}
          onClose={() => setShowFamilyModal(false)}
          title="Manage Family"
          size="lg"
        >
          <FamilyManagement
            familyId={userProfile.family_id}
            onUpdate={() => {
              // Clear cache and refresh data when family is updated
              cacheUtils.clearFamily(userProfile.family_id)
              fetchData()
            }}
          />
        </Modal>
      )}
    </div>
  )
}