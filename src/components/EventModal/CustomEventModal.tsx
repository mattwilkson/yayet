// File: src/components/EventModal/CustomEventModal.tsx

import React from 'react'
import { EventModalUI } from './EventModalUI'
import { useEventModalLogic } from '../../hooks/useEventModalLogic'

interface CustomEventModalProps {
  isOpen: boolean
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
  onClose: () => void
  // this should re-fetch your calendar data
  onSave: () => void
  onDelete: () => void
}

export function CustomEventModal({
  isOpen,
  event,
  familyMembers,
  familyId,
  userId,
  onClose,
  onSave,
  onDelete
}: CustomEventModalProps) {
  // wire up all the logic
  const {
    // modal control
    isOpen: open,
    onClose: close,
    // save/delete handlers from hook
    handleSave,
    handleDelete,
    // everything else needed by EventModalUI
    loading,
    error,
    title, setTitle,
    description, setDescription,
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate,
    endTime, setEndTime,
    allDay, setAllDay,
    location, setLocation,
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,
    showRecurringOptions, toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays, handleDayToggle,
    showAdditionalOptions, toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,
    isEditing,
    isRecurringParent,
    isRecurringInstance,
    editMode, setEditMode,
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  } = useEventModalLogic({
    isOpen,
    event,
    familyMembers,
    familyId,
    userId,
    onClose,
    onSave,     // this will trigger your calendar refresh
    onDelete   // same here
  })

  return (
    <EventModalUI
      isOpen={open}
      onClose={close}
      onSave={handleSave}
      onDelete={handleDelete}
      loading={loading}
      error={error}

      title={title}
      setTitle={setTitle}
      description={description}
      setDescription={setDescription}

      startDate={startDate}
      setStartDate={setStartDate}
      startTime={startTime}
      setStartTime={setStartTime}
      endDate={endDate}
      setEndDate={setEndDate}
      endTime={endTime}
      setEndTime={setEndTime}

      allDay={allDay}
      setAllDay={setAllDay}

      location={location}
      setLocation={setLocation}

      assignedMembers={assignedMembers}
      setAssignedMembers={setAssignedMembers}
      driverHelper={driverHelper}
      setDriverHelper={setDriverHelper}

      showRecurringOptions={showRecurringOptions}
      toggleRecurringOptions={toggleRecurringOptions}
      recurrenceType={recurrenceType}
      setRecurrenceType={setRecurrenceType}
      recurrenceInterval={recurrenceInterval}
      setRecurrenceInterval={setRecurrenceInterval}
      recurrenceEndDate={recurrenceEndDate}
      setRecurrenceEndDate={setRecurrenceEndDate}
      recurrenceEndCount={recurrenceEndCount}
      setRecurrenceEndCount={setRecurrenceEndCount}
      recurrenceEndType={recurrenceEndType}
      setRecurrenceEndType={setRecurrenceEndType}
      selectedDays={selectedDays}
      handleDayToggle={handleDayToggle}

      showAdditionalOptions={showAdditionalOptions}
      toggleAdditionalOptions={toggleAdditionalOptions}
      arrivalTime={arrivalTime}
      setArrivalTime={setArrivalTime}
      driveTime={driveTime}
      setDriveTime={setDriveTime}

      isEditing={isEditing}
      isRecurringParent={isRecurringParent}
      isRecurringInstance={isRecurringInstance}
      editMode={editMode}
      setEditMode={setEditMode}

      assignableFamilyMembers={assignableFamilyMembers}
      driverHelperFamilyMembers={driverHelperFamilyMembers}

      getDisplayName={getDisplayName}
      getDayLetter={getDayLetter}
      getSelectedDaysSummary={getSelectedDaysSummary}
    />
  )
}