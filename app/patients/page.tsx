"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"
import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfDay, addHours } from "date-fns"
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X,
  Clock,
  Sparkles,
  TrendingUp,
  Heart,
  Brain,
  Pill,
  Check,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

const SUPABASE_URL = "https://waawehppqpmlvqbghith.supabase.co"
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w"
interface DatabaseInsight {
  id: number
  created_at: string
  url: string | null
  title: string | null
  abstract: string | null
  date_posted: string | null
  field: string | null
  image_url: string | null
}

interface Patient {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  lastVisit: string
  condition: string
  status: "active" | "inactive" | "pending"
  avatar?: string
  sex: string
  address: string
}

interface MedicalInsight {
  id: string
  title: string
  summary: string
  category: "cardiology" | "neurology" | "pharmacology" | "general" | "research"
  source: string
  publishedAt: string
  readTime: string
  imageUrl: string
  content: string
  tags: string[]
}

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

interface AITooltipData {
  event: CalendarEvent
  position: { x: number; y: number }
}

const mockInsights: MedicalInsight[] = [
  {
    id: "1",
    title: "New Guidelines for Hypertension Management in 2024",
    summary:
      "Updated recommendations from the American Heart Association on blood pressure targets and treatment protocols.",
    category: "cardiology",
    source: "American Heart Association",
    publishedAt: "2024-01-15",
    readTime: "5 min read",
    imageUrl: "/medical-heart-research.png",
    content: `The American Heart Association has released updated guidelines for hypertension management, emphasizing personalized treatment approaches and lower blood pressure targets for high-risk patients.

Key Updates:
• Target BP <130/80 mmHg for most adults
• Enhanced focus on lifestyle modifications
• New risk stratification algorithms
• Updated medication protocols for elderly patients`,
    tags: ["hypertension", "guidelines", "cardiovascular", "treatment"],
  },
  {
    id: "2",
    title: "Advancements in Alzheimer's Research: Promising New Therapies",
    summary:
      "Recent breakthroughs in understanding the pathogenesis of Alzheimer's disease and the development of targeted therapies.",
    category: "neurology",
    source: "Journal of Neuroscience",
    publishedAt: "2024-02-28",
    readTime: "8 min read",
    imageUrl: "https://i.pinimg.com/736x/75/9a/87/759a877e678fe44947e5a7d91f938073.jpg",
    content: `Recent advancements in Alzheimer's research have identified several promising new therapies targeting amyloid plaques and tau protein aggregation. Clinical trials are underway to assess the efficacy of these treatments in slowing cognitive decline.

Key Findings:
• Novel antibodies targeting amyloid plaques
• Tau protein inhibitors showing promise
• Genetic risk factors identified
• Early detection methods improved`,
    tags: ["alzheimer's", "neurology", "therapy", "research"],
  },
  {
    id: "3",
    title: "The Role of Gut Microbiome in Mental Health: A Comprehensive Review",
    summary:
      "Exploring the intricate relationship between the gut microbiome and mental health disorders such as depression and anxiety.",
    category: "general",
    source: "Nature Reviews Neuroscience",
    publishedAt: "2024-03-10",
    readTime: "12 min read",
    imageUrl: "https://i.pinimg.com/1200x/05/65/43/056543ee8c6c3e5589c009753506ec37.jpg",
    content: `The gut microbiome plays a crucial role in mental health, influencing neurotransmitter production and immune system regulation. Imbalances in gut bacteria have been linked to increased risk of depression, anxiety, and other mental health disorders.

Key Insights:
• Gut-brain axis communication pathways
• Probiotic interventions for mental health
• Dietary influences on microbiome composition
• Personalized microbiome-based therapies`,
    tags: ["gut microbiome", "mental health", "depression", "anxiety"],
  },
  {
    id: "4",
    title: "Precision Medicine in Oncology: Tailoring Treatment to Individual Genetic Profiles",
    summary:
      "How genetic testing is revolutionizing cancer treatment by enabling personalized therapies based on individual genetic profiles.",
    category: "research",
    source: "The Lancet Oncology",
    publishedAt: "2024-04-05",
    readTime: "10 min read",
    imageUrl: "https://i.pinimg.com/736x/24/4f/6e/244f6e4d7322fc2fbfecea1e927a8e5e.jpg",
    content: `Precision medicine in oncology utilizes genetic testing to tailor cancer treatment to individual genetic profiles, improving treatment outcomes and reducing side effects. Targeted therapies based on specific genetic mutations have shown remarkable success in certain cancers.

Key Advancements:
• Genetic sequencing technologies
• Targeted therapies for specific mutations
• Biomarker identification for treatment response
• Personalized immunotherapy approaches`,
    tags: ["precision medicine", "oncology", "genetics", "cancer treatment"],
  },
  {
    id: "5",
    title: "The Impact of Telemedicine on Healthcare Delivery: A Meta-Analysis",
    summary:
      "Evaluating the effectiveness and benefits of telemedicine in improving healthcare access and patient outcomes.",
    category: "general",
    source: "JAMA Internal Medicine",
    publishedAt: "2024-05-20",
    readTime: "7 min read",
    imageUrl: "https://i.pinimg.com/1200x/1f/9a/51/1f9a5134258051fccb6b877a8b053358.jpg",
    content: `Telemedicine has emerged as a transformative tool in healthcare delivery, improving access to care, reducing costs, and enhancing patient outcomes. Meta-analysis studies have demonstrated the effectiveness of telemedicine in various medical specialties.

Key Findings:
• Improved access to care for rural populations
• Cost savings for patients and healthcare providers
• Enhanced patient satisfaction and engagement
• Remote monitoring and chronic disease management`,
    tags: ["telemedicine", "healthcare delivery", "patient outcomes", "remote monitoring"],
  },
  {
    id: "6",
    title: "Novel Antiviral Drugs for Emerging Viral Infections: A Review",
    summary:
      "Exploring the development of new antiviral drugs to combat emerging viral infections and pandemic threats.",
    category: "pharmacology",
    source: "Antiviral Research",
    publishedAt: "2024-06-12",
    readTime: "9 min read",
    imageUrl: "https://i.pinimg.com/1200x/85/14/4f/85144f906201288841c75dd58d6c60f5.jpg",
    content: `The development of novel antiviral drugs is crucial for combating emerging viral infections and pandemic threats. Researchers are exploring various approaches, including direct-acting antivirals, host-targeted therapies, and immunomodulatory agents.

Key Developments:
• Broad-spectrum antiviral compounds
• Rapid drug discovery platforms
• Vaccine development strategies
• Global collaboration efforts`,
    tags: ["antiviral drugs", "viral infections", "pharmacology", "pandemic"],
  },
]

const categoryIcons = {
  cardiology: Heart,
  neurology: Brain,
  pharmacology: Pill,
  general: TrendingUp,
  research: Sparkles,
}

const categoryColors = {
  cardiology: "bg-red-400/10 text-red-400 border-red-400/20",
  neurology: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  pharmacology: "bg-green-400/10 text-green-400 border-green-400/20",
  general: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  research: "bg-teal-400/10 text-teal-400 border-teal-400/20",
}

const PatientsPage = () => {
  const [insights, setInsights] = useState<MedicalInsight[]>(mockInsights)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "pending">("all")
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    condition: "",
    sex: "",
    address: "",
  })
  const [showAppointmentsList, setShowAppointmentsList] = useState(false)
  const [allAppointments, setAllAppointments] = useState<Array<{
    id: string
    patient_name: string | null
    start_time: string
    reminder_sent: boolean | null
  }>>([])
  const router = useRouter()

  const [selectedInsight, setSelectedInsight] = useState<MedicalInsight | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [aiTooltip, setAiTooltip] = useState<AITooltipData | null>(null)
  const { toast } = useToast()

// Add this improved getCurrentUserSafely function at the top of your component
const getCurrentUserSafely = () => {
  try {
    const currentUserString = localStorage.getItem("currentUser")
    console.log("Raw localStorage currentUser:", currentUserString)
    
    if (!currentUserString) {
      console.error("No currentUser in localStorage")
      return null
    }

    const currentUser = JSON.parse(currentUserString)
    console.log("Parsed currentUser object:", currentUser)
    console.log("Available properties:", Object.keys(currentUser))
    
    // Check for different possible property names for license number
    const licenseNumber = currentUser.licenseNumber || 
                         currentUser.license_number || 
                         currentUser.doctorId || 
                         currentUser.doctor_id ||
                         currentUser.id ||
                         currentUser.userId ||
                         currentUser.user_id

    if (!licenseNumber) {
      console.error("No license number found in any expected property")
      console.log("User object structure:", currentUser)
      return null
    }

    return {
      ...currentUser,
      licenseNumber // Normalize to licenseNumber property
    }
  } catch (error) {
    console.error("Error parsing currentUser:", error)
    return null
  }
}
useEffect(() => {
  const loadAllAppointments = async () => {
    const appointments = await fetchAllAppointments()
    setAllAppointments(appointments)
  }
  
  loadAllAppointments()
}, [])

// Replace your existing useEffect for fetching patients with this improved version:
useEffect(() => {
  const fetchPatientsFromDatabase = async () => {
    try {
      const currentUser = getCurrentUserSafely()
      
      if (!currentUser || !currentUser.licenseNumber) {
        console.error("No current user or license number found")
        // Show a helpful error message to the user
        toast({
          title: "Authentication Error",
          description: "Please log in again to access patient data.",
          variant: "destructive",
        })
        setIsLoading(false)
        // Optionally redirect to login page
        // router.push('/login')
        return
      }

      console.log("Fetching patients for license:", currentUser.licenseNumber)

      const response = await fetch(
        `https://waawehppqpmlvqbghith.supabase.co/rest/v1/patients?primary_doctor=eq.${currentUser.licenseNumber}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Database error:", errorText)
        throw new Error(`Failed to fetch patients: ${response.status} - ${errorText}`)
      }

      const dbPatients = await response.json()
      console.log("Fetched patients from database:", dbPatients)

      // Transform database format to your Patient interface
      const transformedPatients: Patient[] = dbPatients.map((dbPatient: any) => {
        const nameParts = (dbPatient.full_name || "Unknown Patient").split(" ")
        const firstName = nameParts[0] || "Unknown"
        const lastName = nameParts.slice(1).join(" ") || "Patient"
        
        return {
          id: dbPatient.patient_id,
          firstName: firstName,
          lastName: lastName,
          email: dbPatient.email || "", 
          phone: dbPatient.phone || "",
          dateOfBirth: dbPatient.birth_date || "",
          lastVisit: dbPatient.created_at 
            ? new Date(dbPatient.created_at).toISOString().split("T")[0] 
            : new Date().toISOString().split("T")[0],
          condition: "General Consultation",
          status: "active" as const,
          sex: dbPatient.gender === "M" ? "Homme" : dbPatient.gender === "F" ? "Femme" : "",
          address: dbPatient.address || "",
        }
      })

      setPatients(transformedPatients)
      
      if (transformedPatients.length === 0) {
        toast({
          title: "No Patients Found",
          description: "No patients are currently assigned to your profile.",
        })
      }

    } catch (error) {
      console.error("Error fetching patients from database:", error)
      toast({
        title: "Error",
        description: "Failed to load patients from database. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  fetchPatientsFromDatabase()
}, [toast, router])

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery)

    const matchesFilter = filterStatus === "all" || patient.status === filterStatus

    return matchesSearch && matchesFilter
  })

  const insertPatientToDatabase = async (patientData: any) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")

      const generateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c == "x" ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }

      const mapGender = (frenchGender: string) => {
        switch (frenchGender) {
          case "Homme":
            return "M"
          case "Femme":
            return "F"
          default:
            return "M" // Default fallback
        }
      }

      const payload = {
        patient_id: generateUUID(),
        full_name: `${patientData.firstName} ${patientData.lastName}`,
        gender: mapGender(patientData.sex), // Use mapped gender value
        birth_date: patientData.dateOfBirth,
        address: patientData.address,
        phone: patientData.phone,
        primary_doctor_id: currentUser.licenseNumber, // Use doctor's license number as primary_doctor_id instead of facility code
      }

      console.log("Sending patient data to database:", payload)

      const response = await fetch("https://waawehppqpmlvqbghith.supabase.co/rest/v1/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Database error response:", errorText)
        throw new Error(`Failed to insert patient: ${response.status} - ${errorText}`)
      }

      console.log("Patient successfully added to database")
      return true
    } catch (error) {
      console.error("Error inserting patient to database:", error)
      return false
    }
  }
// Updated handleAddPatient function
  const handleAddPatient = async () => {
    try {
      const currentUser = getCurrentUserSafely()

      if (!currentUser || !currentUser.licenseNumber) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to add patients.",
          variant: "destructive",
        })
        return
      }

      // Validation
      if (!newPatient.firstName.trim() || !newPatient.lastName.trim()) {
        toast({
          title: "Validation Error",
          description: "First name and last name are required.",
          variant: "destructive",
        })
        return
      }

      const generateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c == "x" ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }

      const mapGender = (frenchGender: string) => {
        switch (frenchGender) {
          case "Homme":
            return "M"
          case "Femme":
            return "F"
          default:
            return "M"
        }
      }

      const patientId = generateUUID()

      const payload = {
        patient_id: patientId,
        full_name: `${newPatient.firstName.trim()} ${newPatient.lastName.trim()}`,
        gender: mapGender(newPatient.sex),
        birth_date: newPatient.dateOfBirth,
        address: newPatient.address.trim(),
        phone: newPatient.phone.trim(),
        primary_doctor: currentUser.licenseNumber,
        email: newPatient.email.trim(), // Add email if your database supports it
      }

      console.log("Sending patient data to database:", payload)

      const response = await fetch("https://waawehppqpmlvqbghith.supabase.co/rest/v1/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Database error response:", errorText)
        throw new Error(`Failed to insert patient: ${response.status} - ${errorText}`)
      }

      // Create patient object for local state
      const patient: Patient = {
        id: patientId,
        ...newPatient,
        firstName: newPatient.firstName.trim(),
        lastName: newPatient.lastName.trim(),
        email: newPatient.email.trim(),
        phone: newPatient.phone.trim(),
        address: newPatient.address.trim(),
        lastVisit: new Date().toISOString().split("T")[0],
        condition: newPatient.condition || "General Consultation",
        status: "pending",
      }

      // Add to local state
      setPatients([patient, ...patients])
      
      // Reset form
      setNewPatient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        condition: "",
        sex: "",
        address: "",
      })
      
      setIsAddPatientOpen(false)
      
      toast({
        title: "Patient Added",
        description: `${patient.firstName} ${patient.lastName} has been successfully added.`,
      })

      console.log("Patient successfully added with ID:", patientId)
      
    } catch (error) {
      console.error("Error adding patient:", error)
      toast({
        title: "Error",
        description: "Failed to add patient. Please try again.",
        variant: "destructive",
      })
    }
  }
  // Function to trigger the n8n webhook
  const triggerInsightsWebhook = async () => {
    try {
      console.log("Triggering webhook via /webhooks/pubmed")

  const response = await fetch("/webhooks/pubmed?trigger=fetch_insights", {
    method: "GET",
    // If your n8n flow expects an API key, you can still send it:
    // headers: { "x-api-key": "YOUR_SUPER_SECRET" },
  })


      if (!response.ok) {
        const text = await response.text()   // ← add this
        console.error(`Webhook failed with status: ${response.status}. Body: ${text}`) // ← add this
        return false
      }

      console.log("Webhook triggered successfully")
      return true
    } catch (error) {
      console.error("Error triggering webhook:", error)
      return false
    }
}



  // Function to fetch insights from Supabase
  const fetchInsightsFromSupabase = async (): Promise<MedicalInsight[]> => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/Medical_Insights?select=*&order=id.desc&limit=6`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.status}`)
      }

      const dbInsights: DatabaseInsight[] = await response.json()

      // Transform database insights to the expected format
      const transformedInsights: MedicalInsight[] = dbInsights.map((dbInsight) => {
        // Map database field to category
        const mapFieldToCategory = (field: string | null): MedicalInsight["category"] => {
          if (!field) return "general"
          const fieldLower = field.toLowerCase()
          if (fieldLower.includes("cardio") || fieldLower.includes("heart")) return "cardiology"
          if (fieldLower.includes("neuro") || fieldLower.includes("brain")) return "neurology"
          if (fieldLower.includes("pharma") || fieldLower.includes("drug")) return "pharmacology"
          if (fieldLower.includes("research")) return "research"
          return "general"
        }

        return {
          id: dbInsight.id.toString(),
          title: dbInsight.title || "Untitled Article",
          summary: dbInsight.abstract || "No abstract available",
          category: mapFieldToCategory(dbInsight.field),
          source: "PubMed",
          publishedAt: dbInsight.date_posted || new Date().toISOString().split("T")[0],
          readTime: `${Math.floor(Math.random() * 8) + 5} min read`,
          imageUrl: dbInsight.image_url || "/placeholder.svg",
          content: dbInsight.url || "No full article available",
          tags: [],
        }
      })

      return transformedInsights
    } catch (error) {
      console.error("Error fetching insights from Supabase:", error)
      throw error
    }
  }

  // Function to handle Medical Insights tab click
// Replace your current triggerInsightsWebhook and handleInsightsTabClick functions with these improved versions

// Option 1: Direct fetch from Supabase without webhook (Recommended)
const handleInsightsTabClick = async () => {
    setIsLoadingInsights(true)
    
    try {
      // First, trigger the webhook
      toast({
        title: "Updating Medical Insights",
        description: "Triggering data refresh, please wait...",
      })

      const webhookSuccess = await triggerInsightsWebhook()
      
      if (webhookSuccess) {
        // Show waiting message
        toast({
          title: "Processing Data",
          description: "Waiting for new insights to be processed (60 seconds)...",
        })

        // Wait for 1 minute (60 seconds)
        await new Promise(resolve => setTimeout(resolve, 60000))

        // Then fetch the latest insights from database
        toast({
          title: "Fetching Latest Insights",
          description: "Getting the most recent medical insights...",
        })
        
        const fetchedInsights = await fetchInsightsFromSupabase()
        
        if (fetchedInsights.length > 0) {
          setInsights(fetchedInsights)
          toast({
            title: "Insights Updated",
            description: `Successfully loaded ${fetchedInsights.length} fresh medical insights.`,
          })
        } else {
          // If no insights in database after webhook, use mock data
          setInsights(mockInsights)
          toast({
            title: "No New Data",
            description: "No new insights found. Showing sample medical insights.",
            variant: "destructive",
          })
        }
      } else {
        // Webhook failed, fall back to existing data fetch
        console.warn("Webhook failed, fetching existing data...")
        
        toast({
          title: "Webhook Failed",
          description: "Fetching existing insights from database...",
          variant: "destructive",
        })

        const fetchedInsights = await fetchInsightsFromSupabase()
        
        if (fetchedInsights.length > 0) {
          setInsights(fetchedInsights)
          toast({
            title: "Insights Loaded",
            description: `Loaded ${fetchedInsights.length} existing insights from database.`,
          })
        } else {
          setInsights(mockInsights)
          toast({
            title: "Using Sample Data",
            description: "Database empty, showing sample insights.",
          })
        }
      }
      
    } catch (error) {
      console.error("Error in handleInsightsTabClick:", error)
      
      // Final fallback to mock data
      setInsights(mockInsights)
      
      toast({
        title: "Error Occurred",
        description: "Failed to update insights. Showing sample data.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingInsights(false)
    }
  }



const handleDeletePatient = async (patientId: string) => {
    try {
      // Show loading toast
      toast({
        title: "Deleting Patient",
        description: "Removing patient from database...",
      })

      // Delete from database
      const response = await fetch(
        `https://waawehppqpmlvqbghith.supabase.co/rest/v1/patients?patient_id=eq.${patientId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            apikey: 
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Database delete error:", errorText)
        throw new Error(`Failed to delete patient from database: ${response.status} - ${errorText}`)
      }

      // Get patient name for success message
      const deletedPatient = patients.find((p) => p.id === patientId)
      const patientName = deletedPatient ? `${deletedPatient.firstName} ${deletedPatient.lastName}` : "Patient"

      // Remove from local state only after successful database deletion
      setPatients(patients.filter((p) => p.id !== patientId))

      toast({
        title: "Patient Deleted",
        description: `${patientName} has been successfully removed from your patient list.`,
      })

      console.log("Patient successfully deleted from database")

    } catch (error) {
      console.error("Error deleting patient:", error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete patient from database. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePatientClick = (patientId: string) => {
    const selectedPatient = patients.find((p) => p.id === patientId)
    if (selectedPatient) {
      localStorage.setItem("selectedPatient", JSON.stringify(selectedPatient))
      router.push("/consultation")
    }
  }

  const getStatusColor = (status: Patient["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-400/10 text-green-400 border-green-400/20"
      case "inactive":
        return "bg-slate-400/10 text-slate-400 border-slate-400/20"
      case "pending":
        return "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
      default:
        return "bg-slate-400/10 text-slate-400 border-slate-400/20"
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const handleInsightClick = (insight: MedicalInsight) => {
    setSelectedInsight(insight)
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1))
  }

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1))
  }

  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    if (event.resource?.isAISuggested) {
      const rect = e.currentTarget.getBoundingClientRect()
      setAiTooltip({
        event,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        },
      })
    }
  }, [])

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

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    const slotStart = addHours(startOfDay(day), hour)
    const slotEnd = addHours(startOfDay(day), hour + 1)

    return events.filter((event) => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      return eventStart >= slotStart && eventStart < slotEnd
    })
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
    }

    return `${backgroundColor} ${borderColor} ${textColor} border-2 rounded p-1 text-xs cursor-pointer hover:opacity-80 transition-opacity ${
      event.resource?.isAISuggested ? "animate-pulse shadow-lg shadow-teal-400/20" : ""
    }`
  }

  // Show loading state while fetching patients
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-8 w-8 border-2 border-teal-400 border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-slate-400">Loading patients...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-white">Patient Management Hub</CardTitle>
                  <p className="text-slate-400 mt-1">Manage patients, view insights, and schedule appointments</p>
                </div>
                <Button className="bg-teal-500 hover:bg-teal-600 text-white" onClick={() => setIsAddPatientOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Tabs defaultValue="patients" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-slate-800">
              <TabsTrigger value="patients" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                <User className="h-4 w-4 mr-2" />
                Patients
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
                onClick={handleInsightsTabClick}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Medical Insights
                {isLoadingInsights && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-3 w-3 border border-teal-400 border-t-transparent rounded-full ml-2"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="scheduling"
                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Smart Scheduling
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patients" className="space-y-6">
              {/* Search and Filters */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      {["all", "active", "inactive", "pending"].map((status) => (
                        <Button
                          key={status}
                          variant={filterStatus === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterStatus(status as any)}
                          className={
                            filterStatus === status
                              ? "bg-teal-500 hover:bg-teal-600 text-white"
                              : "border-slate-700 text-slate-300 hover:bg-slate-800"
                          }
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Patient List */}
              <div className="grid gap-4">
                <AnimatePresence>
                  {filteredPatients.map((patient, index) => (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 transition-all duration-200 cursor-pointer group">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-4 flex-1"
                              onClick={() => handlePatientClick(patient.id)}
                            >
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={patient.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="bg-teal-400/20 text-teal-400 font-semibold">
                                  {getInitials(patient.firstName, patient.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">
                                    {patient.firstName} {patient.lastName}
                                  </h3>
                                  <Badge variant="secondary" className={getStatusColor(patient.status)}>
                                    {patient.status}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-400">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>{patient.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{patient.phone}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Last visit: {new Date(patient.lastVisit).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className="text-sm text-slate-300">{patient.condition}</p>
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Patient
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-400 hover:bg-red-900/20"
                                  onClick={() => handleDeletePatient(patient.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Patient
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {filteredPatients.length === 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-12 text-center">
                    <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">No patients found</h3>
                    <p className="text-slate-500">
                      {searchQuery || filterStatus !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Add your first patient to get started"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <div className="flex gap-6 h-[calc(100vh-16rem)]">
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                    <div className="masonry-grid">
                      {insights.map((insight, index) => {
                        const CategoryIcon = categoryIcons[insight.category]
                        return (
                          <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            whileHover={{ scale: 1.02, y: -5 }}
                            className="masonry-item cursor-pointer"
                            onClick={() => handleInsightClick(insight)}
                          >
                            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300 group overflow-hidden">
                              <div className="aspect-video overflow-hidden">
                                <img
                                  src={insight.imageUrl || "/placeholder.svg"}
                                  alt={insight.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              </div>
                              <CardHeader className="pb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary" className={categoryColors[insight.category]}>
                                    <CategoryIcon className="h-3 w-3 mr-1" />
                                    {insight.category}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Clock className="h-3 w-3" />
                                    {insight.readTime}
                                  </div>
                                </div>
                                <CardTitle className="text-white text-lg leading-tight group-hover:text-teal-400 transition-colors">
                                  {insight.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-400 text-sm leading-relaxed mb-4">{insight.summary}</p>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{insight.source}</span>
                                  <span>{new Date(insight.publishedAt).toLocaleDateString()}</span>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Insight Detail Panel */}
                <AnimatePresence>
                  {selectedInsight && (
                    <motion.div
                      initial={{ x: "100%", opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: "100%", opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="w-96 bg-slate-900/50 border border-slate-800 rounded-lg flex flex-col"
                    >
                      <div className="flex items-center justify-between p-6 border-b border-slate-800">
                        <h3 className="text-lg font-semibold text-white">Article Details</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInsight(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary" className={categoryColors[selectedInsight.category]}>
                                {React.createElement(categoryIcons[selectedInsight.category], {
                                  className: "h-3 w-3 mr-1",
                                })}
                                {selectedInsight.category}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {selectedInsight.readTime}
                              </div>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-3">{selectedInsight.title}</h2>
                            <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                              <span>{selectedInsight.source}</span>
                              <span>{new Date(selectedInsight.publishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="aspect-video overflow-hidden rounded-lg">
                            <img
                              src={selectedInsight.imageUrl || "/placeholder.svg"}
                              alt={selectedInsight.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">{selectedInsight.summary}</p>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-white mb-3">Full Article</h4>
                            <div className="prose prose-sm prose-invert max-w-none">
                              <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                                {selectedInsight.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>
            <TabsContent value="scheduling" className="space-y-6">
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
            </TabsContent>


          </Tabs>
        </motion.div>

        {/* Add Patient Modal */}
        <AnimatePresence>
          {isAddPatientOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsAddPatientOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-white">Add New Patient</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddPatientOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-slate-300">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          value={newPatient.firstName}
                          onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                          className="bg-slate-800/50 border-slate-700 text-white"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-slate-300">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          value={newPatient.lastName}
                          onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                          className="bg-slate-800/50 border-slate-700 text-white"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-slate-300">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                        className="bg-slate-800/50 border-slate-700 text-white"
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-slate-300">
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                        className="bg-slate-800/50 border-slate-700 text-white"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth" className="text-slate-300">
                        Date of Birth
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={newPatient.dateOfBirth}
                        onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                        className="bg-slate-800/50 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sex" className="text-slate-300">
                        Sexe
                      </Label>
                      <select
                        id="sex"
                        value={newPatient.sex}
                        onChange={(e) => setNewPatient({ ...newPatient, sex: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select...</option>
                        <option value="Homme">Homme</option>
                        <option value="Femme">Femme</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="address" className="text-slate-300">
                        Adresse
                      </Label>
                      <Textarea
                        id="address"
                        value={newPatient.address}
                        onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                        className="bg-slate-800/50 border-slate-700 text-white"
                        placeholder="123 Rue de la Paix, 75001 Paris"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="condition" className="text-slate-300">
                        Primary Condition
                      </Label>
                      <Input
                        id="condition"
                        value={newPatient.condition}
                        onChange={(e) => setNewPatient({ ...newPatient, condition: e.target.value })}
                        className="bg-slate-800/50 border-slate-700 text-white"
                        placeholder="e.g., Hypertension, Diabetes"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddPatientOpen(false)}
                        className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddPatient}
                        className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
                        disabled={!newPatient.firstName || !newPatient.lastName || !newPatient.email}
                      >
                        Add Patient
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Tooltip for Scheduling */}
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
                        onClick={() => setAiTooltip(null)}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modify
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default PatientsPage