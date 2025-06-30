// File: src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  fetchOptimizedDashboardData,
  performanceMonitor,
  cacheUtils
} from '../lib/optimizedQueries'
import { AdvancedCalendar } from '../components/Calendar/AdvancedCalendar'
import { CustomEventModal } from '../components/EventModal/CustomEventModal'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FamilyManagement } from '../components/FamilyManagement'
import { UserMenu } from '../components/UserMenu'
import { generateICalendar, downloadFile } from '../lib/utils'
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

const DashboardPage: React.FC = () => {
  const { user, userProfile } = useAuth()
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

  // INITIAL DATA FETCH
  useEffect(() => {
    if (userProfile?.family_id) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [userProfile, viewMode])

  const fetchData = async () => {
    const timer = performanceMonitor.startTimer('DashboardPage.fetchData')
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
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      timer.end()
    }
  }

  // HANDLERS
  const handleEventClick = (event: any) => {
    if (event.isHoliday || event.isSpecialEvent) return
    setSelectedEvent(event)
    setNewEventData(null)
    setShowEventModal(true)
  }
  const handleCreateEvent = (startTime: Date, endTime: Date) => {
    setSelectedEvent(null)
    setNewEventData({ startTime, endTime })
    setShowEventModal(true)
  }
  const handleEventModalClose = () => {
    setShowEventModal(false)
    setSelectedEvent(null)
    setNewEventData(null)
  }
  const handleEventSave = async () => {
    cacheUtils.clearFamily(userProfile!.family_id)
    await fetchData()
    handleEventModalClose()
  }
  const handleEventDelete = async () => {
    cacheUtils.clearFamily(userProfile!.family_id)
    await fetchData()
    handleEventModalClose()
  }
  const handleExportCalendar = () => {
    const eventsToExport = events.filter(e => !e.isHoliday && !e.isSpecialEvent)
    const ical = generateICalendar(eventsToExport)
    const famName = familyInfo?.family_name || 'Family'
    const filename = `${famName}_${viewMode === 'personal' ? 'personal' : 'family'}_calendar.ics`
    downloadFile(ical, filename, 'text/calendar')
  }
  const handleRefreshData = async () => {
    cacheUtils.clearFamily(userProfile!.family_id)
    await fetchData()
  }

  // REFETCH WHEN DATE CHANGES
  useEffect(() => {
    if (userProfile?.family_id) fetchData()
  }, [currentDate])

  // LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 text-lg font-medium">Loading Dashboard…</p>
        </div>
      </div>
    )
  }

  const familyName = familyInfo?.family_name || 'Family'

  // PREPARE eventModalData
  let eventModalData: any
  if (selectedEvent) {
    eventModalData = selectedEvent
  } else if (newEventData) {
    eventModalData = {
      title: '',
      description: '',
      start_time: newEventData.startTime.toISOString(),
      end_time: newEventData.endTime.toISOString(),
      all_day: false,
      location: ''
    }
  } else {
    const defaultStart = new Date(currentDate)
    defaultStart.setHours(9, 0, 0, 0)
    const defaultEnd = new Date(defaultStart)
    defaultEnd.setHours(10, 0, 0, 0)
    eventModalData = {
      title: '',
      description: '',
      start_time: defaultStart.toISOString(),
      end_time: defaultEnd.toISOString(),
      all_day: false,
      location: ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      {/* … the rest of your JSX unchanged … */}

      {/* EVENT MODAL */}
      <CustomEventModal
        isOpen={showEventModal}
        onClose={handleEventModalClose}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
        event={eventModalData}
        familyMembers={familyMembers}
        familyId={userProfile!.family_id}
        userId={user!.id}
      />

      {/* FAMILY MANAGEMENT MODAL */}
      {userProfile?.role === 'admin' && (
        <Modal isOpen={showFamilyModal} onClose={() => setShowFamilyModal(false)} title="Manage Family" size="lg">
          <FamilyManagement
            familyId={userProfile.family_id}
            onUpdate={() => {
              cacheUtils.clearFamily(userProfile.family_id)
              fetchData()
            }}
          />
        </Modal>
      )}
    </div>
  )
}

export default DashboardPage