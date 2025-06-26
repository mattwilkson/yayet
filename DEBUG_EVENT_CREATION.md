# Event Creation Time Flow Debug

## 1. DashboardPage.handleCreateEvent (Parent Component)

```typescript
// In src/pages/DashboardPage.tsx
const handleCreateEvent = (startTime: Date, endTime: Date) => {
  console.log('📅 DashboardPage.handleCreateEvent called:', { 
    startTime: startTime.toISOString(), 
    endTime: endTime.toISOString(),
    currentDate: currentDate.toISOString(),
    source: 'calendar_click'
  })
  
  setSelectedEvent(null) // Clear any selected event
  setNewEventData({ startTime, endTime }) // ✅ STORING THE CLICKED TIMES
  setShowEventModal(true)
}
```

## 2. EventModal Props in DashboardPage

```typescript
// In src/pages/DashboardPage.tsx - EventModal JSX
const eventModalData = (() => {
  if (newEventData) {
    // ✅ THIS SHOULD USE THE CLICKED TIMES
    console.log('📅 Event modal data from calendar click:', {
      source: 'calendar_click',
      startTime: newEventData.startTime.toISOString(),
      endTime: newEventData.endTime.toISOString()
    })
    
    return {
      title: '',
      description: '',
      start_time: newEventData.startTime.toISOString(), // ✅ CORRECT TIME
      end_time: newEventData.endTime.toISOString(),     // ✅ CORRECT TIME
      all_day: false,
      location: '',
    }
  } else if (selectedEvent) {
    return selectedEvent
  } else {
    // ❌ FALLBACK CASE - This might be the problem!
    const defaultStartTime = new Date(currentDate)
    defaultStartTime.setHours(9, 0, 0, 0) // 9:00 AM fallback
    
    const defaultEndTime = new Date(defaultStartTime)
    defaultEndTime.setHours(10, 0, 0, 0) // 10:00 AM fallback
    
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

// The modal is rendered with:
<EventModal
  isOpen={showEventModal}
  onClose={handleEventModalClose}
  onSave={handleEventSave}
  event={eventModalData}  // ✅ This should contain the clicked times
  familyMembers={familyMembers}
  familyId={userProfile?.family_id}
  userId={user?.id}
/>
```

## 3. EventModal Time Initialization

```typescript
// In src/components/EventModal.tsx
const getInitialDateTime = () => {
  console.log('📅 EventModal.getInitialDateTime called with event:', event)
  
  if (event?.start_time && event?.end_time) {
    const startDateTime = new Date(event.start_time)
    const endDateTime = new Date(event.end_time)
    
    console.log('📅 EventModal: Using event data for initial times:', {
      eventId: event.id,
      startTime: event.start_time,
      endTime: event.end_time,
      parsedStart: startDateTime.toISOString(),
      parsedEnd: endDateTime.toISOString(),
    })
    
    return { startDateTime, endDateTime }
  }
  
  // ❌ FALLBACK - This shouldn't happen for calendar clicks
  const now = new Date()
  const startDateTime = new Date(now)
  startDateTime.setHours(9, 0, 0, 0)
  const endDateTime = new Date(now)
  endDateTime.setHours(10, 0, 0, 0)
  
  return { startDateTime, endDateTime }
}
```

## PROBLEM IDENTIFIED:

The issue is likely in the EventModal's time format handling. The modal expects `HH:mm` format for HTML time inputs, but the date formatting might be incorrect.

Let me check the exact format being used...