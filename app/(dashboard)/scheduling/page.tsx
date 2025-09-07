"use client"
import { useEffect } from "react"
import React from "react"
import { createClient } from "@supabase/supabase-js"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfDay, addHours } from "date-fns"
import {
  Clock,
  Phone,
  MessageSquare,
  Check,
  X,
  Edit,
  Sparkles,
  Bell,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource?: {
    type: "appointment" | "ai-suggested" | "blocked"
    patient?: {
      name: string
      phone: string
      condition: string
      avatar: string
    }
    isAISuggested?: boolean
    priority?: "high" | "medium" | "low"
  }
}
const SUPABASE_URL = "https://waawehppqpmlvqbghith.supabase.co"
const SUPABASE_ANON ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

interface AITooltipData {
  event: CalendarEvent
  position: { x: number; y: number }
}
interface SlotMenuData {
  day: Date
  hour: number
  position: { x: number; y: number }
}



export default function SchedulingPage() {
  const [slotMenu, setSlotMenu] = useState<SlotMenuData | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [aiTooltip, setAiTooltip] = useState<AITooltipData | null>(null)
  const { toast } = useToast()
  const [bookingSelection, setBookingSelection] = useState<{day: Date, hour: number} | null>(null)

  const [showAppointmentsList, setShowAppointmentsList] = useState(false)
  const [allAppointments, setAllAppointments] = useState<Array<{
  id: string
  patient_name: string | null
  start_time: string
  reminder_sent: boolean | null
}>>([])
  useEffect(() => {
    const loadAppointments = async () => {
      const appointments = await fetchAppointments()
      setEvents(appointments)
    }
    
    loadAppointments()
  }, []) 
  useEffect(() => {
    const loadAppointments = async () => {
      const appointments = await fetchAppointments()
      setEvents(appointments)
    }
    
    const loadAllAppointments = async () => {
      const appointments = await fetchAllAppointments()
      setAllAppointments(appointments)
    }
    
    loadAppointments()
    loadAllAppointments()
  }, [])
  useEffect(() => {
    // Trigger immediately on mount
    triggerReminderWorkflow();

    // Then every hour
    const interval = setInterval(() => {
      triggerReminderWorkflow();
    }, 5 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, []);


  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1))
  }
  const fetchAllAppointments = async () => {
    try {
      const rawUser = localStorage.getItem("currentUser")
      const user = rawUser ? JSON.parse(rawUser) : null
      const doctor_id = user?.doctor_id ?? null

      if (!doctor_id) return []

      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?doctor_id=eq.${doctor_id}&select=id,patient_name,start_time,reminder_sent&order=start_time.asc`, {
        method: "GET",
        headers: {
          "apikey": SUPABASE_ANON,
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) return []
      return await res.json()
    } catch (error) {
      console.error('Error fetching all appointments:', error)
      return []
    }
  }

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1))
  }
  const handleTimeCellClick = (day: Date, hour: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setSlotMenu({
      day,
      hour,
      position: { x: rect.left + rect.width / 2, y: rect.top },
    })
  }
  const getSlotStart = (day: Date, hour: number) => addHours(startOfDay(day), hour)

  const isTimeBlocked = useCallback(
    (day: Date, hour: number) =>
      events.some(
        (e) =>
          e.resource?.type === "blocked" &&
          e.start.getTime() === getSlotStart(day, hour).getTime()
      ),
    [events]
  )
  const blockSelectedTime = () => {
    if (!slotMenu) return
    const start = getSlotStart(slotMenu.day, slotMenu.hour)
    const end = addHours(start, 1)

    // already blocked? do nothing here (menu will show Unblock)
    if (isTimeBlocked(slotMenu.day, slotMenu.hour)) {
      setSlotMenu(null)
      return
    }

    setEvents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: "",                 // no label rendered
        start,
        end,
        resource: { type: "blocked" },
      },
    ])
    setSlotMenu(null)
  }

  const unblockSelectedTime = () => {
    if (!slotMenu) return
    const start = getSlotStart(slotMenu.day, slotMenu.hour)
    setEvents((prev) =>
      prev.filter(
        (e) =>
          !(
            e.resource?.type === "blocked" &&
            e.start.getTime() === start.getTime()
          )
      )
    )
    setSlotMenu(null)
  }
  
// Add this function after your other utility functions (after unblockSelectedTime)
  const fetchAppointments = async () => {
    try {
      console.log('Fetching appointments from database...')
      
      // Get current user from localStorage
      const rawUser = localStorage.getItem("currentUser")
      const user = rawUser ? JSON.parse(rawUser) : null
      const doctor_id: string | null = user?.doctor_id ?? null

      // Get selected patient from localStorage
      const rawPatient = localStorage.getItem("selectedPatient")
      const patient = rawPatient ? JSON.parse(rawPatient) : null
      const patient_name: string | null = [patient?.firstName, patient?.lastName]
        .filter(Boolean)
        .join(" ") || null

      if (!doctor_id) {
        console.log('No doctor_id found, skipping appointment fetch')
        return []
      }

      if (!patient_name) {
        console.log('No selected patient found, skipping appointment fetch')
        return []
      }

      console.log('Filtering appointments for:', { doctor_id, patient_name })

      // Fetch appointments for this doctor AND patient combination
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?doctor_id=eq.${doctor_id}&patient_name=eq.${encodeURIComponent(patient_name)}&select=*`, {
        method: "GET",
        headers: {
          "apikey": SUPABASE_ANON,
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
        },
      })

      console.log('Fetch response status:', res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to fetch appointments:', errorText)
        return []
      }

      const appointments = await res.json()
      console.log('Fetched appointments:', appointments)

      // Transform database appointments to CalendarEvent format
      const calendarEvents: CalendarEvent[] = appointments.map((apt: any) => ({
        id: apt.id,
        title: apt.patient_name ? `Appointment: ${apt.patient_name}` : "Appointment",
        start: new Date(apt.start_time),
        end: new Date(apt.end_time),
        resource: {
          type: "appointment" as const,
          patient: apt.patient_name ? {
            name: apt.patient_name,
            phone: apt.patient_phone || "",
            condition: apt.patient_condition || "",
            avatar: apt.patient_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
          } : undefined
        }
      }))

      return calendarEvents
    } catch (error) {
      console.error('Error fetching appointments:', error)
      return []
    }
  }
  // Add this helper function after your existing helper functions
  const hasAppointmentAtTime = useCallback(
    (day: Date, hour: number) => {
      const slotStart = getSlotStart(day, hour)
      return events.some(
        (e) =>
          e.resource?.type === "appointment" &&
          e.start.getTime() === slotStart.getTime()
      )
    },
    [events]
  )

  const getAppointmentAtTime = useCallback(
    (day: Date, hour: number) => {
      const slotStart = getSlotStart(day, hour)
      return events.find(
        (e) =>
          e.resource?.type === "appointment" &&
          e.start.getTime() === slotStart.getTime()
      )
    },
    [events]
  )



// Improved function to cancel appointment and delete from Supabase
  const cancelAppointmentAtSelectedTime = async () => {
    if (!slotMenu) return

    const appointment = getAppointmentAtTime(slotMenu.day, slotMenu.hour)
    if (!appointment) {
      toast({
        title: "No Appointment Found",
        description: "No appointment found at this time slot.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('Attempting to delete appointment:', {
        id: appointment.id,
        title: appointment.title,
        start: appointment.start,
        end: appointment.end
      })

      // Delete from Supabase database using the UUID ID
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointment.id}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON,
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
        },
      })

      console.log('Delete response status:', res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to delete appointment from database:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText
        })

        let errorMessage = `HTTP ${res.status}: ${res.statusText}`
        
        // Try to parse error response for more details
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.hint || errorData.details || errorMessage
          console.error('Parsed delete error:', errorData)
        } catch (parseError) {
          console.error('Could not parse delete error response')
        }

        toast({
          title: "Database Error",
          description: `Failed to cancel appointment: ${errorMessage}`,
          variant: "destructive",
        })
        return
      }

      // Successfully deleted from database, now remove from local state
      setEvents((prev) => prev.filter((e) => e.id !== appointment.id))
      // Refresh the appointments list
      const updatedAppointments = await fetchAllAppointments()
      setAllAppointments(updatedAppointments)
      
      toast({
        title: "Appointment Cancelled",
        description: `${appointment.title} has been successfully cancelled and removed from the database.`,
      })

      console.log('Appointment successfully deleted from database and local state')
      
    } catch (error) {
      console.error('Unexpected error cancelling appointment:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while cancelling the appointment. Please try again.",
        variant: "destructive",
      })
    }

    setSlotMenu(null)
  }
  const triggerReminderWorkflow = async () => {
    try {
      await fetch("http://localhost:5678/webhook/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredBy: "SchedulingPage" })
      });
      console.log("Reminder workflow triggered");
    } catch (err) {
      console.error("Failed to trigger workflow:", err);
    }
  };


  // Alternative function if you want to cancel by appointment ID directly
  const cancelAppointmentById = async (appointmentId: string) => {
    try {
      console.log('Cancelling appointment by ID:', appointmentId)

      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointmentId}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON,
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to delete appointment:', errorText)
        throw new Error(`Failed to delete appointment: ${res.status} ${res.statusText}`)
      }

      // Remove from local state
      setEvents((prev) => prev.filter((e) => e.id !== appointmentId))
      
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      })

      return { success: true }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      })
      return { success: false, error }
    }
  }

  const insertAppointment = async (start: Date, end: Date) => {
    try {
      // Get current user from localStorage
      const rawUser = localStorage.getItem("currentUser")
      const user = rawUser ? JSON.parse(rawUser) : null
      const doctor_id: string | null = user?.doctor_id ?? null

      // Get selected patient from localStorage
      const rawPatient = localStorage.getItem("selectedPatient")
      const patient = rawPatient ? JSON.parse(rawPatient) : null
      const patient_name: string | null = [patient?.firstName, patient?.lastName]
        .filter(Boolean)
        .join(" ") || null

      if (!doctor_id) {
        toast({
          title: "Missing doctor_id",
          description: "Could not find doctor_id in localStorage.currentUser.",
          variant: "destructive",
        })
        return { ok: false }
      }

      // Generate a UUID for the appointment
      const appointmentId = crypto.randomUUID()

      // Prepare the appointment data
      const appointmentData = {
        id: appointmentId, // Include the UUID
        doctor_id,
        patient_name,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        created_at: new Date().toISOString() // Optional, but good practice
      }

      console.log('Sending appointment data:', appointmentData)

      // Make the API call to Supabase
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON,
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(appointmentData),
      })

      console.log('Response status:', res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('API Error Response:', errorText)
        
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`
        
        // Try to parse error response for more details
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.hint || errorData.details || errorMessage
          console.error('Parsed error:', errorData)
        } catch (parseError) {
          console.error('Could not parse error response:', parseError)
        }

        toast({
          title: "Database error",
          description: errorMessage,
          variant: "destructive",
        })
        return { ok: false }
      }

      const responseData = await res.json()
      console.log('Success response:', responseData)

      toast({
        title: "Appointment booked",
        description: `${patient_name || "Patient"} â€¢ ${format(start, "EEE MMM d, HH:mm")} â€” ${format(end, "HH:mm")}`,
      })

      return { ok: true, patient_name, data: responseData }
    } catch (e: any) {
      console.error('Unexpected error:', e)
      toast({
        title: "Unexpected error",
        description: String(e?.message || e),
        variant: "destructive",
      })
      return { ok: false }
    }
  }

  // Make event clicks NOT open the slot menu
  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    if (event.resource?.isAISuggested) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setAiTooltip({
        event,
        position: { x: rect.left + rect.width / 2, y: rect.top - 10 },
      })
    }
  }, [])


  const bookAppointmentAtSelectedTime = async () => {
    if (!slotMenu) return

    const start = addHours(startOfDay(slotMenu.day), slotMenu.hour)
    const end = addHours(start, 1)

    // write to DB
    const res = await insertAppointment(start, end)
    setSlotMenu(null)

    if (res?.ok) {
      // reflect it in the local calendar UI
      setEvents((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: res.patient_name ? `Appointment: ${res.patient_name}` : "Appointment",
          start,
          end,
          resource: { type: "appointment" as const },
        },
      ])
      setBookingSelection(null) // clear the yellow selection if you use it
    }
    // Refresh the appointments list
    const updatedAppointments = await fetchAllAppointments()
    setAllAppointments(updatedAppointments)
  }

  const isBookingSelected = (day: Date, hour: number) => {
    if (!bookingSelection) return false
    return bookingSelection.day.getTime() === day.getTime() && bookingSelection.hour === hour
  }
  const cancelAppointmentBooking = () => {
    if (!slotMenu) return
    setBookingSelection(null)
    setSlotMenu(null)
    toast({ title: "Booking cancelled", description: "The appointment booking has been cancelled." })
  }


  const handleAcceptAISuggestion = (eventId: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              title: event.title.replace("AI Suggested: ", ""),
              resource: {
                ...event.resource!,
                type: "appointment" as const,
                isAISuggested: false,
              },
            }
          : event,
      ),
    )
    setAiTooltip(null)
    toast({
      title: "Appointment Confirmed",
      description: "The AI-suggested appointment has been added to your schedule.",
    })
  }

  const handleModifyAISuggestion = (eventId: string) => {
    setAiTooltip(null)
    toast({
      title: "Modify Appointment",
      description: "Opening appointment editor...",
    })
  }

  const handleSendSMS = (eventId: string, phone: string, patientName: string) => {
    setAiTooltip(null)

    setTimeout(() => {
      toast({
        title: "SMS Sent Successfully",
        description: `Appointment confirmation sent to ${patientName} at ${phone}`,
        action: (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-teal-400" />
            <span className="text-sm">via Twilio</span>
          </div>
        ),
      })
    }, 1000)

    toast({
      title: "Sending SMS...",
      description: `Notifying ${patientName} about the appointment`,
    })
  }

  const handleRejectAISuggestion = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId))
    setAiTooltip(null)
    toast({
      title: "Suggestion Dismissed",
      description: "The AI suggestion has been removed from your calendar.",
    })
  }

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    const slotStart = addHours(startOfDay(day), hour)
    const slotEnd = addHours(startOfDay(day), hour + 1)

    return events.filter((event) => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      return eventStart >= slotStart && eventStart < slotEnd
    })
  }

  const getEventStyle = (event: CalendarEvent) => {
    let backgroundColor = "bg-slate-800"
    let borderColor = "border-slate-700"
    let textColor = "text-slate-100"

    if (event.resource?.type === "ai-suggested") {
      backgroundColor = "bg-teal-400/10"
      borderColor = "border-teal-400"
      textColor = "text-teal-400"
    } else if (event.resource?.type === "appointment") {
      backgroundColor = "bg-sky-400/10"
      borderColor = "border-sky-400"
      textColor = "text-sky-400"
    } else if (event.resource?.type === "blocked") {
      textColor = "text-slate-400"
    }

    return `${backgroundColor} ${borderColor} ${textColor} border-2 rounded p-1 text-xs cursor-pointer hover:opacity-80 transition-opacity ${
      event.resource?.isAISuggested ? "animate-pulse shadow-lg shadow-teal-400/20" : ""
    }`
  }
  const blocked = slotMenu ? isTimeBlocked(slotMenu.day, slotMenu.hour) : false
  const hasAppointment = slotMenu ? hasAppointmentAtTime(slotMenu.day, slotMenu.hour) : false

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-400" />
                Smart Scheduling
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAppointmentsList(!showAppointmentsList)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Bell className="h-4 w-4 mr-2" />
                All Appointments ({allAppointments.length})
              </Button>
            </div>
            
            {/* Appointments List */}
            <AnimatePresence>
              {showAppointmentsList && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 space-y-2 max-h-96 overflow-y-auto"
                >
                  {allAppointments.length === 0 ? (
                    <div className="text-slate-400 text-center py-4">
                      No appointments found
                    </div>
                  ) : (
                    allAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-sky-400/20 text-sky-400 font-semibold text-xs">
                              {appointment.patient_name 
                                ? appointment.patient_name.split(" ").map(n => n[0]).join("").toUpperCase()
                                : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-white font-medium">
                              {appointment.patient_name || "Unknown Patient"}
                            </div>
                            <div className="text-slate-400 text-sm flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {format(new Date(appointment.start_time), "EEE, MMM d 'at' h:mm a")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {appointment.reminder_sent ? (
                            <Badge variant="secondary" className="bg-green-400/10 text-green-400 border-green-400/20">
                              <Check className="h-3 w-3 mr-1" />
                              Reminded
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20">
                              <Bell className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardHeader>
        </Card>

      {/* Calendar Navigation */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold text-white">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-8 gap-px bg-white rounded-lg overflow-hidden">
            {/* Header Row */}
            <div className="bg-slate-900 p-2 text-center text-sm font-medium text-slate-400">Time</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="bg-slate-900 p-2 text-center">
                <div className="text-sm font-medium text-white">{format(day, "EEE")}</div>
                <div className="text-xs text-slate-400">{format(day, "MMM d")}</div>
              </div>
            ))}

            {/* Time Slots */}
            {timeSlots
              .filter((hour) => hour >= 8 && hour < 18) // keep only 8h â†’ 17h
              .map((hour) => (
                <React.Fragment key={hour}>
                  <div className="p-2 text-xs text-slate-400 text-center" style={{ backgroundColor: "#080E22" }}>
                    {format(addHours(startOfDay(new Date()), hour), "HH:mm")}
                  </div>
                    {weekDays.map((day) => {
                      const dayEvents = getEventsForTimeSlot(day, hour)
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className="p-1 min-h-[60px] relative cursor-pointer"
                          style={{ 
                            backgroundColor: isTimeBlocked(day, hour) 
                              ? "#64748b" 
                              : isBookingSelected(day, hour)
                              ? "#eab308"  // yellow-500
                              : "#1e293b" 
                          }}
                          onClick={(e) => handleTimeCellClick(day, hour, e)}
                        >
                          {dayEvents
                            .filter((ev) => ev.resource?.type !== "blocked")  // â† hide blocked â€œeventâ€ box
                            .map((event) => (
                              <div
                                key={event.id}
                                className={getEventStyle(event)}
                                onClick={(e) => handleEventClick(event, e)}
                              >
                                <div className="font-medium truncate">{event.title}</div>
                                {event.resource?.patient && (
                                  <div className="text-xs opacity-75 truncate">
                                    {event.resource.patient.condition}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )
                    })}

                </React.Fragment>
              ))}

          </div>
        </CardContent>
      </Card>

      {/* AI Suggestion Tooltip */}
      <AnimatePresence>
        {aiTooltip && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAiTooltip(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed z-50 w-80"
              style={{
                left: aiTooltip.position.x - 160,
                top: aiTooltip.position.y - 10,
                transform: "translateY(-100%)",
              }}
            >
              <Card className="bg-slate-800 border-teal-400/30 shadow-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-teal-400/20 text-teal-400 font-semibold">
                        {aiTooltip.event.resource?.patient?.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-white">{aiTooltip.event.resource?.patient?.name}</h3>
                      <p className="text-sm text-slate-400">{aiTooltip.event.resource?.patient?.condition}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto bg-teal-400/10 text-teal-400 border-teal-400/20">
                      AI Suggested
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(aiTooltip.event.start, "MMM d, yyyy 'at' h:mm a")} -{" "}
                      {format(aiTooltip.event.end, "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone className="h-4 w-4" />
                    <span>{aiTooltip.event.resource?.patient?.phone}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptAISuggestion(aiTooltip.event.id)}
                      className="bg-teal-500 hover:bg-teal-600 text-white flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleModifyAISuggestion(aiTooltip.event.id)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Modify
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSendSMS(
                          aiTooltip.event.id,
                          aiTooltip.event.resource?.patient?.phone || "",
                          aiTooltip.event.resource?.patient?.name || "",
                        )
                      }
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-1"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Send SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectAISuggestion(aiTooltip.event.id)}
                      className="border-red-700 text-red-400 hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
        {slotMenu && (
          <>
            {/* Click-away overlay */}
            
            <div className="fixed inset-0 z-40" onClick={() => setSlotMenu(null)} />
            <motion.div
            
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed z-50 w-72"
              style={{
                left: slotMenu.position.x - 144, // center ~72*2/2
                top: slotMenu.position.y,
                transform: "translateY(-100%)",
              }}
            >
              <Card className="bg-slate-800 border-slate-700 shadow-2xl">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-white">Select action</h3>
                  <p className="text-sm text-slate-400">
                    {format(addHours(startOfDay(slotMenu.day), slotMenu.hour), "EEE, MMM d â€¢ HH:00â€“HH:59")}
                  </p>
                </CardHeader>
                  <CardContent className="space-y-2">
                    {blocked ? (
                      <Button className="w-full bg-slate-600 hover:bg-slate-500" onClick={unblockSelectedTime}>
                        Unblock
                      </Button>
                    ) : hasAppointment ? (
                      <>
                        <Button className="w-full bg-slate-600 hover:bg-slate-500" onClick={blockSelectedTime}>
                          Block this time
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-red-600 text-red-400 hover:bg-red-900/20"
                          onClick={cancelAppointmentAtSelectedTime}
                        >
                          Cancel appointment
                        </Button>
                      </>
                    ) : isBookingSelected(slotMenu.day, slotMenu.hour) ? (
                      <>
                        <Button className="w-full bg-slate-600 hover:bg-slate-500" onClick={blockSelectedTime}>
                          Block this time
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-900/20"
                          onClick={cancelAppointmentBooking}
                        >
                          Cancel appointment
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button className="w-full bg-slate-600 hover:bg-slate-500" onClick={blockSelectedTime}>
                          Block this time
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-slate-700 text-slate-200 hover:bg-slate-800"
                          onClick={bookAppointmentAtSelectedTime}
                        >
                          Book an appointment
                        </Button>
                      </>
                    )}
                  </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>


    </div>
  )
}