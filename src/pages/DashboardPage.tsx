import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  fetchOptimizedDashboardData,
  cacheUtils
} from '../lib/optimizedQueries'
import { AdvancedCalendar } from '../components/Calendar/AdvancedCalendar'
import CustomEventModal from '../components/EventModal/CustomEventModal'
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

  const fetchData = async () => {
    setLoading(true)
    try {
      const { familyInfo, events, familyMembers } = await fetchOptimizedDashboardData(
        userProfile!.family_id!,
        currentDate,
        viewMode,
        user!.id
      )
      setFamilyInfo(familyInfo)
      setEvents(events)
      setFamilyMembers(familyMembers)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.family_id) fetchData()
    else setLoading(false)
  }, [userProfile, viewMode, currentDate])

  const handleEventClick = (ev: any) => {
    if (ev.isHoliday || ev.isSpecialEvent) return
    setSelectedEvent(ev)
    setNewEventData(null)
    setShowEventModal(true)
  }
  const handleCreateEvent = (startTime: Date, endTime: Date) => {
    setSelectedEvent(null)
    setNewEventData({ startTime, endTime })
    setShowEventModal(true)
  }
  const handleClose = () => setShowEventModal(false)
  const handleSave = async () => {
    cacheUtils.clearFamily(userProfile!.family_id!)
    await fetchData()
    handleClose()
  }
  const handleDelete = async () => {
    cacheUtils.clearFamily(userProfile!.family_id!)
    await fetchData()
    handleClose()
  }
  const handleRefresh = () => {
    cacheUtils.clearFamily(userProfile!.family_id!)
    fetchData()
  }
  const handleExport = () => {
    const evs = events.filter(e => !e.isHoliday && !e.isSpecialEvent)
    const ical = generateICalendar(evs)
    downloadFile(
      ical,
      `${familyInfo.family_name}_${viewMode}_calendar.ics`,
      'text/calendar'
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  const familyName = familyInfo?.family_name || 'Family'

  // prepare modal event data...
  let modalEvent: any = selectedEvent ?? {
    title: '',
    description: '',
    start_time: newEventData?.startTime.toISOString() || new Date().toISOString(),
    end_time: newEventData?.endTime.toISOString() || new Date().toISOString(),
    all_day: false,
    location: ''
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold">{familyName}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setViewMode('personal')}>
            <User className={viewMode==='personal' ? 'text-blue-600' : ''} />
          </button>
          <button onClick={() => setViewMode('full')}>
            <Users className={viewMode==='full' ? 'text-blue-600' : ''} />
          </button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-1" /> Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-1" /> Export
          </Button>
          <Button onClick={() => handleCreateEvent(new Date(), new Date())}>
            <Plus className="mr-1" /> New Event
          </Button>
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 p-4">
        <AdvancedCalendar
          events={events}
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      </main>

      <CustomEventModal
        isOpen={showEventModal}
        event={modalEvent}
        familyMembers={familyMembers}
        familyId={userProfile!.family_id!}
        userId={user!.id}
        onClose={handleClose}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {userProfile?.role === 'admin' && (
        <Modal isOpen={showFamilyModal} onClose={() => setShowFamilyModal(false)} title="Manage Family">
          <FamilyManagement
            familyId={userProfile.family_id!}
            onUpdate={handleRefresh}
          />
        </Modal>
      )}
    </div>
)

export default DashboardPage