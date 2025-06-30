import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchOptimizedDashboardData, cacheUtils } from '../lib/optimizedQueries'
import { AdvancedCalendar } from '../components/Calendar/AdvancedCalendar'
import { CustomEventModal } from '../components/EventModal/CustomEventModal'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FamilyManagement } from '../components/FamilyManagement'
import { UserMenu } from '../components/UserMenu'
import { generateICalendar, downloadFile } from '../lib/utils'
import {
  Calendar as CalIcon,
  Plus,
  Users,
  Download,
  User,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const userProfile = profile!
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
      const data = await fetchOptimizedDashboardData(
        userProfile.family_id!,
        currentDate,
        viewMode,
        profile.id
      )
      setFamilyInfo(data.familyInfo)
      setEvents(data.events)
      setFamilyMembers(data.familyMembers)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile.family_id) fetchData()
  }, [profile.family_id, viewMode, currentDate])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full" />
      </div>
    )

  // prepare modal data…
  // (same logic as before)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* …header… */}
      <main className="flex-1">{/* calendar & controls… */}</main>

      <CustomEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSave={fetchData}
        onDelete={fetchData}
        event={/* your event data */}
        familyMembers={familyMembers}
        familyId={userProfile.family_id!}
        userId={profile.id}
      />

      {userProfile.role === 'admin' && (
        <Modal isOpen={showFamilyModal} onClose={() => setShowFamilyModal(false)} title="Manage Family">
          <FamilyManagement familyId={userProfile.family_id!} onUpdate={fetchData} />
        </Modal>
      )}
    </div>
  )
}