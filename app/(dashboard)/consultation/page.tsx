"use client"
import { supabase } from '@/lib/supabase'; 
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Download, FileText, User, Stethoscope, Calendar, MapPin, Phone } from "lucide-react"
import App from "next/app";
import * as React from "react";

const SUPABASE_URL = "https://waawehppqpmlvqbghith.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w";
const BASE = `${SUPABASE_URL}/rest/v1/clinical_documents`;

// ---- Local cache helpers (scoped per doctor+patient) ----
type AnyObj = Record<string, any>;

const normalize = (s?: string | number | null) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // collapse spaces

const safeParse = <T = any>(raw: string | null): T | null => {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
};

// Build a namespaced key like: lastCDA:142563:patientId-123  (or name fallback)
const cdaCacheKey = (user: AnyObj | null, patient: AnyObj | null) => {
  const lic = user?.licenseNumber ?? user?.doctor_id ?? user?.id;
  const patientId = patient?.id ?? patient?.patient_id;
  const patientName = patient?.name ?? `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`;

  const doctorPart = normalize(lic ?? user?.fullName ?? "");
  const patientPart = normalize(patientId ?? patientName);

  if (!doctorPart || !patientPart) return null;
  return `lastCDA:${doctorPart}:${patientPart}`;
};

const readCdaFromCache = (key: string) => {
  const cached = safeParse<{ doc: any; ts: number }>(localStorage.getItem(key));
  return cached?.doc ?? null;
};

const writeCdaToCache = (key: string, doc: any) => {
  localStorage.setItem(key, JSON.stringify({ doc, ts: Date.now() }));
};

const clearScopedCda = (key: string) => localStorage.removeItem(key);

// Optional: wipe *all* CDA caches (e.g., on logout)
const wipeAllCdaCaches = () => {
  Object.keys(localStorage).forEach(k => { if (k.startsWith("lastCDA:")) localStorage.removeItem(k); });
};



export default function ConsultationCapture() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingCDA, setIsLoadingCDA] = useState(false)
  const [cdaDocument, setCdaDocument] = useState<any>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [language, setLanguage] = useState("en")
  

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language") || "en"
    setLanguage(storedLanguage)
  }, [])

  // inside your component:
  // however you already obtain these two:
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrentUser(safeParse<any>(localStorage.getItem("currentUser")) || {});
    setSelectedPatient(safeParse<any>(localStorage.getItem("selectedPatient")) || {});
  }, []);

  useEffect(() => {
    setCdaDocument(null);
    const key = cdaCacheKey(currentUser, selectedPatient);
    if (!key) return;

    const doc = readCdaFromCache(key);
    if (doc) setCdaDocument(doc);
  }, [
    currentUser?.licenseNumber, currentUser?.id,
    selectedPatient?.id, selectedPatient?.firstName, selectedPatient?.lastName
  ]);



  const translations = {
    en: {
      startRecording: "Start Recording",
      stopRecording: "Stop Recording",
      processing: "Processing...",
      cdaGenerated: "Generated CDA Document",
      recordingTime: "Recording Time",
      error: "Error occurred",
      fetchingDocument: "Fetching document...",
      noDocumentFound: "No CDA document found. The n8n workflow may not have processed the data yet.",
    },
    fr: {
      startRecording: "Commencer l'Enregistrement",
      stopRecording: "Arrêter l'Enregistrement",
      processing: "Traitement...",
      cdaGenerated: "Document CDA généré",
      recordingTime: "Temps d'Enregistrement",
      error: "Erreur survenue",
      fetchingDocument: "Récupération du document...",
      noDocumentFound: "Aucun document CDA trouvé. Le flux de travail n8n n'a peut-être pas encore traité les données.",
    },
  }

  const t = translations[language as keyof typeof translations]

  const generateWaveform = () => {
    const newData = Array.from({ length: 50 }, () => Math.random() * 100)
    setWaveformData(newData)
    if (isRecording) {
      animationRef.current = requestAnimationFrame(generateWaveform)
    }
  }

  const sendAudioToN8n = async (audioBlob: Blob) => {
    try {
      console.log("[v0] Preparing to send audio and JSON data...")

      // Get current user data
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
      const selectedPatient = JSON.parse(localStorage.getItem("selectedPatient") || "{}")

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log("[v0] Generated session ID:", sessionId)

      // Debug: Log the actual data being accessed
      console.log("[DEBUG] currentUser from localStorage:", currentUser)
      console.log("[DEBUG] selectedPatient from localStorage:", selectedPatient)

      // Create JSON data with correct property names (note: underscore properties!)
      const jsonData = {
        session_id: sessionId,
        "Nom complet du patient": `${selectedPatient.firstName || ""} ${selectedPatient.lastName || ""}`.trim(),
        "Sexe du patient": selectedPatient.sex || "",
        "Date de naissance du patient": selectedPatient.dateOfBirth || "",
        "Adresse du patient": selectedPatient.address || "",
        "Téléphone du patient": selectedPatient.phone || "",
        "Nom du medecin": currentUser.full_name || "",
        "Liscence number du medecin": currentUser.license_number || "",
        "Rôle du medecin": currentUser.specialization || "",
        "Nom de l'établissement": currentUser.facility_name || "",       // underscore: facility_name  
        "Adresse de l'établissement": currentUser.facility_address || "", // underscore: facility_address
        "Contact de l'établissement": currentUser.phone || "",
      }

      console.log("[SEND-DEBUG] Final JSON data being sent:", jsonData)
      console.log("[v0] JSON data prepared:", jsonData)

      localStorage.setItem("currentSessionId", sessionId)

      const formData = new FormData()
      formData.append("file", audioBlob, "consultation-audio.webm")
      formData.append(
        "data",
        new Blob([JSON.stringify(jsonData)], { type: "application/json" }),
        "consultation-data.json",
      )

      console.log("[v0] FormData prepared with file and data fields")
      console.log("[v0] Audio blob size:", audioBlob.size, "bytes")
      console.log("[v0] Audio blob type:", audioBlob.type)
      console.log("[v0] JSON data size:", JSON.stringify(jsonData).length, "characters")

      const webhookUrl = "http://localhost:5678/webhook/audio"

      console.log("[v0] Testing webhook connectivity...")
      try {
        const testResponse = await fetch(webhookUrl, {
          method: "POST",
        })
        console.log("[v0] Webhook test response status:", testResponse.status)
        console.log("[v0] Webhook test response headers:", Object.fromEntries(testResponse.headers.entries()))
      } catch (testError) {
        console.log("[v0] Webhook connectivity test failed:", testError)
      }

      // Try direct POST first
      try {
        console.log(`[v0] Sending POST to webhook: ${webhookUrl}`)
        console.log("[v0] Request timestamp:", new Date().toISOString())

        const response = await fetch(webhookUrl, {
          method: "POST",
          body: formData,
        })

        console.log(`[v0] Response status: ${response.status}`)
        console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

        // Check for CORS headers specifically
        console.log("[v0] CORS headers check:")
        console.log("- Access-Control-Allow-Origin:", response.headers.get('Access-Control-Allow-Origin'))
        console.log("- Access-Control-Allow-Methods:", response.headers.get('Access-Control-Allow-Methods'))
        console.log("- Access-Control-Allow-Headers:", response.headers.get('Access-Control-Allow-Headers'))

        if (response.ok || response.status === 200) {
          const responseText = await response.text()
          console.log("[v0] Webhook response:", responseText)
          console.log("[v0] Response received at:", new Date().toISOString())

          // Try to parse response as JSON for more details
          try {
            const responseJson = JSON.parse(responseText)
            console.log("[v0] Parsed response JSON:", responseJson)
            if (responseJson.executionId) {
              console.log("[v0] n8n execution ID:", responseJson.executionId)
            }
          } catch (parseError) {
            console.log("[v0] Response is not JSON, raw text:", responseText)
          }

          return { success: true, response: responseText }
        }
      } catch (error) {
        console.log(`[v0] Standard POST failed:`, error)
      }

      // Try with no-cors mode
      try {
        console.log(`[v0] Trying no-cors mode for: ${webhookUrl}`)

        const noCorsResponse = await fetch(webhookUrl, {
          method: "POST",
          body: formData,
          mode: "no-cors",
        })

        console.log(`[v0] No-cors response status: ${noCorsResponse.status}`)
        // With no-cors, we can't read the response, but if no error thrown, assume success
        return { success: true }
      } catch (noCorsError) {
        console.log(`[v0] No-cors also failed:`, noCorsError)
      }

      // Try XMLHttpRequest as fallback
      try {
        console.log(`[v0] Trying XMLHttpRequest for: ${webhookUrl}`)

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open("POST", webhookUrl, true)

          xhr.onload = () => {
            console.log(`[v0] XMLHttpRequest status: ${xhr.status}`)
            if (xhr.status >= 200 && xhr.status < 300) {
              console.log("[v0] XMLHttpRequest response:", xhr.responseText)
              resolve({ success: true })
            } else {
              reject(new Error(`XMLHttpRequest failed with status: ${xhr.status}`))
            }
          }

          xhr.onerror = () => {
            console.log("[v0] XMLHttpRequest error occurred")
            reject(new Error("XMLHttpRequest failed"))
          }

          xhr.send(formData)
        })
      } catch (xhrError) {
        console.log(`[v0] XMLHttpRequest failed:`, xhrError)
      }

      throw new Error("All webhook delivery methods failed")
    } catch (error) {
      console.error("[v0] Error sending audio to n8n:", error)
      throw error
    }
  } 

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })

        try {
          setIsProcessing(true)
          console.log("[v0] Starting processing workflow...")

          // Send audio and JSON to n8n
          const result = await sendAudioToN8n(audioBlob)
          console.log("[v0] Data sent to n8n, waiting for processing...")
          if (result.response) {
            console.log("[v0] Additional response details:", result.response)
          }

          setIsLoadingCDA(true)

          // Wait 15 seconds for n8n to process with progress updates
          for (let i = 0; i < 60; i++) {
            console.log(`[v0] Waiting for n8n processing... ${i + 1}/60 seconds`)
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }

          console.log("[v0] Fetching CDA document...")

          let cdaDoc = null
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`[v0] Fetch attempt ${attempt}/3`)
            cdaDoc = await fetchLatestCDADocument()

            if (cdaDoc && !cdaDoc.message) {
              break
            }

            if (attempt < 3) {
              console.log(`[v0] No document found, waiting 5 more seconds...`)
              await new Promise((resolve) => setTimeout(resolve, 5000))
            }
          }

          setCdaDocument(cdaDoc)
          const key = cdaCacheKey(currentUser, selectedPatient);
          if (key) writeCdaToCache(key, cdaDoc);

          console.log("[v0] CDA document retrieved:", cdaDoc);

          console.log("[v0] CDA document retrieved:", cdaDoc)
        } catch (error) {
          console.error("[v0] Error in processing workflow:", error)
          setCdaDocument({ error: "Failed to process consultation. Please try again." })
        } finally {
          setIsProcessing(false)
          setIsLoadingCDA(false)
        }

        // Clean up
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      generateWaveform()

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("[v0] Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const downloadAsPDF = async () => {
    if (!cdaDocument) return

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6;">
          <div style="text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #0891b2; margin: 0;">Clinical Document Architecture (CDA)</h1>
            <p style="margin: 10px 0; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          ${
            cdaDocument.patient_info
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Patient Information</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.patient_info.name || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Gender:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.patient_info.gender || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Date of Birth:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.patient_info.birth_date || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.patient_info.phone || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Address:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.patient_info.address || "N/A"}</td></tr>
            </table>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.doctor_info
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Healthcare Provider</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.doctor_info.name || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Specialization:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.doctor_info.specialization || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">License Number:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.doctor_info.license_number || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Establishment:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${cdaDocument.doctor_info.establishment || "N/A"}</td></tr>
            </table>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.consultation_content
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Consultation Notes</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.consultation_content}</div>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.medical_findings
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Medical Findings</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.medical_findings}</div>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.recommendations
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Recommendations</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.recommendations}</div>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.socialHistory
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Social History</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.socialHistory}</div>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.temperature
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Temperature</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.temperature}</div>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.PressionArterielle
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Blood Pressure</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.PressionArterielle}</div>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.Taille
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Height</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.Taille}</div>
          </div>
          `
              : ""
          }
          
          ${
            cdaDocument.Poids
              ? `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #0891b2; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #0891b2; padding-left: 10px;">Weight</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0891b2;">${cdaDocument.Poids}</div>
          </div>
          `
              : ""
          }
          
          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>This document was generated by MedFlow Clinical Documentation System</p>
            <p>Document ID: ${cdaDocument.id || "N/A"} | Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `

      // Create HTML file for download
      const blob = new Blob(
        [
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CDA Medical Document</title></head><body>${htmlContent}</body></html>`,
        ],
        { type: "text/html" },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `CDA-Document-${new Date().toISOString().split("T")[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
    }
  }

  const parseContentWithAI = (content: string) => {
    if (!content) return {}

    const parsed = {
      medications: [] as string[],
      problemList: [] as string[],
      plannedProcedures: [] as string[],
      socialHistory: [] as string[],
      temperature: null as string | null,
      bloodPressure: null as string | null,
      height: null as string | null,
      weight: null as string | null,
    }

    const medicationPatterns = [
      /(?:prescribe|give|medication|medicine|take)\s+(?:you\s+)?(?:a\s+)?(?:medication\s+)?(?:named\s+|called\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/gi,
      /anti\s+inflammatory/gi,
    ]

    medicationPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        let medication = match[1]?.trim() || (match[0]?.includes("anti inflammatory") ? "anti inflammatory" : "")
        if (medication) {
          medication = medication.toLowerCase()
          // Clean up common non-medication words and phrases
          const excludeWords = [
            "you",
            "the",
            "and",
            "for",
            "with",
            "about",
            "take",
            "some",
            "medication",
            "medicine",
            "a",
            "an",
            "your",
            "legs",
            "like",
            "squat",
            "on",
            "back",
            "deal",
            "if",
            "pain",
            "gets",
            "worse",
            "we",
          ]
          const words = medication.split(" ").filter(
            (word) => !excludeWords.includes(word) && word.length > 2 && /^[a-zA-Z]+$/.test(word), // Only alphabetic words
          )
          if (words.length > 0 && words.length <= 3) {
            // Reasonable medication name length
            const cleanMedication = words.join(" ")
            if (!parsed.medications.includes(cleanMedication)) {
              parsed.medications.push(cleanMedication)
            }
          }
        }
      }
    })

    const problemPatterns = [
      /(?:sharp\s+pain\s+in\s+(?:my\s+)?(?:the\s+)?lower\s+back)/gi,
      /(?:back\s+pain)/gi,
      /(?:pain\s+(?:in\s+)?(?:my\s+)?(?:the\s+)?back)/gi,
      /(?:tingling\s+(?:on\s+)?(?:the\s+)?(?:outside\s+of\s+)?(?:the\s+)?leg)/gi,
      /(?:migraine)/gi,
    ]

    const foundProblems = []
    problemPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        let problem = match[0]?.trim()
        if (problem) {
          problem = problem.toLowerCase()
          foundProblems.push(problem)
        }
      }
    })

    // Combine related problems into comprehensive descriptions
    if (foundProblems.length > 0) {
      const hasBackPain = foundProblems.some((p) => p.includes("back") && p.includes("pain"))
      const hasTingling = foundProblems.some((p) => p.includes("tingling"))

      if (hasBackPain || hasTingling) {
        let combinedProblem = ""
        if (hasBackPain) {
          combinedProblem = "back pain"
        }
        if (hasTingling) {
          combinedProblem += (combinedProblem ? ", " : "") + "tingling in leg"
        }
        parsed.problemList.push(combinedProblem)
      }

      // Add other unique problems
      const otherProblems = foundProblems.filter((p) => !p.includes("back") && !p.includes("tingling"))
      parsed.problemList.push(...otherProblems)
    }

    const procedurePatterns = [
      /(?:examination)/gi,
      /(?:mri)/gi,
      /(?:lab\s+analysis)/gi,
      /(?:blood\s+test)/gi,
      /(?:x-ray)/gi,
      /(?:ct\s+scan)/gi,
      /(?:ultrasound)/gi,
    ]

    procedurePatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        let procedure = match[0]?.trim()
        if (procedure && procedure.length > 2) {
          procedure = procedure.toLowerCase()
          if (!parsed.plannedProcedures.includes(procedure)) {
            parsed.plannedProcedures.push(procedure)
          }
        }
      }
    })

    // Temperature parsing
    const tempPatterns = [
      /temp(?:erature)?\s+(?:is\s+)?normal/gi,
      /temp(?:erature)?\s+(?:is\s+)?(\d+(?:\.\d+)?)\s*(?:degrees?|°)?/gi,
    ]

    tempPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[0].toLowerCase().includes("normal")) {
          parsed.temperature = "normal"
        } else if (match[1]) {
          parsed.temperature = `${match[1]}°C`
        }
      }
    })

    // Blood pressure parsing
    const bpPatterns = [
      /bp\s+(?:is\s+)?(\d+)\s+over\s+(\d+)/gi,
      /blood\s+pressure\s+(?:is\s+)?(\d+)\s*\/\s*(\d+)/gi,
      /(\d+)\s*\/\s*(\d+)\s*mmhg/gi,
    ]

    bpPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[2]) {
          parsed.bloodPressure = `${match[1]}/${match[2]} mmHg`
        }
      }
    })

    // Height parsing
    const heightPatterns = [/(?:height\s+(?:and\s+weight\s+)?)?(\d+)\s+centimeters?/gi, /(\d+)\s*cm/gi]

    heightPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          const height = Number.parseInt(match[1])
          if (height > 100 && height < 250) {
            // Reasonable height range
            parsed.height = `${height} cm`
          }
        }
      }
    })

    // Weight parsing
    const weightPatterns = [/(?:weight\s+)?(\d+)\s+kilograms?/gi, /(\d+)\s*kg/gi]

    weightPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          const weight = Number.parseInt(match[1])
          if (weight > 20 && weight < 300) {
            // Reasonable weight range
            parsed.weight = `${weight} kg`
          }
        }
      }
    })

    const socialHistoryPatterns = [
      /(?:smoke|smoking)\s+(?:occasionally|sometimes|daily|weekly)?/gi,
      /(?:drink|alcohol|wine|beer|spirits)\s+(?:occasionally|sometimes|daily|weekly|on\s+weekends)?/gi,
      /(?:wine\s+on\s+weekends)/gi,
      /(?:beer\s+occasionally)/gi,
      /(?:vape|vaping)\s+(?:occasionally|sometimes|daily|weekly)?/gi,
    ]

    socialHistoryPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        let socialItem = match[0]?.trim()
        if (socialItem && socialItem.length > 3) {
          socialItem = socialItem.toLowerCase()
          if (!parsed.socialHistory.includes(socialItem)) {
            parsed.socialHistory.push(socialItem)
          }
        }
      }
    })

    return parsed
  }

  const updateCDAWithParsedData = (document: any) => {
    if (!document || document.error || document.message) return document

    const parsedContent = document.content ? parseContentWithAI(document.content) : {}

    const cdaDocument = { ...document }

    if (parsedContent.medications?.length > 0) {
      cdaDocument.medications = parsedContent.medications
    }
    if (parsedContent.problemList?.length > 0) {
      cdaDocument.ProblemList = parsedContent.problemList.join(", ")
    }
    if (parsedContent.plannedProcedures?.length > 0) {
      cdaDocument.plannedProcedures = parsedContent.plannedProcedures
    }
    if (parsedContent.socialHistory?.length > 0) {
      cdaDocument.SocialHistory = parsedContent.socialHistory.join(", ")
    }
    if (parsedContent.temperature) {
      cdaDocument.Temperature = parsedContent.temperature
    }
    if (parsedContent.bloodPressure) {
      cdaDocument.PressionArterielle = parsedContent.bloodPressure
    }
    if (parsedContent.height) {
      cdaDocument.Taille = parsedContent.height
    }
    if (parsedContent.weight) {
      cdaDocument.Poids = parsedContent.weight
    }

    return cdaDocument
  }

  const renderCDADocument = (document: any) => {
    if (document.error) {
      return (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{document.error}</p>
        </div>
      )
    }

    if (document.message) {
      return (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-400">{document.message}</p>
          <p className="text-slate-400 text-sm mt-2">
            Please check if the n8n workflow is running and configured correctly.
          </p>
        </div>
      )
    }

    const cdaDocument = updateCDAWithParsedData(document)

    return (
      <div className="space-y-6">
        {/* Patient Information */}
        {cdaDocument.patient_info && (
          <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-blue-400 mr-2" />
              <h4 className="text-blue-300 font-semibold text-lg">Patient Information</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Full Name</span>
                  <span className="text-white font-medium">{cdaDocument.patient_info.name || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Gender</span>
                  <span className="text-white font-medium">{cdaDocument.patient_info.gender || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Date of Birth</span>
                  <span className="text-white font-medium">{cdaDocument.patient_info.birth_date || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Phone</span>
                  <span className="text-white font-medium">{cdaDocument.patient_info.phone || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 md:col-span-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Address</span>
                  <span className="text-white font-medium">{cdaDocument.patient_info.address || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Information */}
        {cdaDocument.doctor_info && (
          <div className="bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center mb-4">
              <Stethoscope className="h-5 w-5 text-green-400 mr-2" />
              <h4 className="text-green-300 font-semibold text-lg">Healthcare Provider</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-green-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Doctor Name</span>
                  <span className="text-white font-medium">{cdaDocument.doctor_info.name || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Stethoscope className="h-4 w-4 text-green-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Specialization</span>
                  <span className="text-white font-medium">{cdaDocument.doctor_info.specialization || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-green-400" />
                <div>
                  <span className="text-slate-400 text-sm block">License Number</span>
                  <span className="text-white font-medium">{cdaDocument.doctor_info.license_number || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-green-400" />
                <div>
                  <span className="text-slate-400 text-sm block">Medical Establishment</span>
                  <span className="text-white font-medium">{cdaDocument.doctor_info.establishment || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Consultation Content */}
        {(cdaDocument.consultation_content || cdaDocument.content) && (
          <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/10 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-purple-400 mr-2" />
              <h4 className="text-purple-300 font-semibold text-lg">Consultation Notes</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">
                {cdaDocument.consultation_content || cdaDocument.content}
              </div>
            </div>
          </div>
        )}

        {/* Medical Findings */}
        {cdaDocument.medical_findings && (
          <div className="bg-gradient-to-r from-orange-900/20 to-orange-800/10 rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center mb-4">
              <Stethoscope className="h-5 w-5 text-orange-400 mr-2" />
              <h4 className="text-orange-300 font-semibold text-lg">Medical Findings</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-orange-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">
                {cdaDocument.medical_findings}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {cdaDocument.recommendations && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 rounded-xl p-6 border border-yellow-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-yellow-400 mr-2" />
              <h4 className="text-yellow-300 font-semibold text-lg">Treatment Recommendations</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">
                {cdaDocument.recommendations}
              </div>
            </div>
          </div>
        )}

        {/* Problem List */}
        {cdaDocument.ProblemList && (
          <div className="bg-gradient-to-r from-red-900/20 to-red-800/10 rounded-xl p-6 border border-red-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-red-400 mr-2" />
              <h4 className="text-red-300 font-semibold text-lg">Problem List</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{cdaDocument.ProblemList}</div>
            </div>
          </div>
        )}

        {/* Medications */}
        {cdaDocument.medications && (
          <div className="bg-gradient-to-r from-indigo-900/20 to-indigo-800/10 rounded-xl p-6 border border-indigo-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-indigo-400 mr-2" />
              <h4 className="text-indigo-300 font-semibold text-lg">Medications</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-indigo-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{cdaDocument.medications}</div>
            </div>
          </div>
        )}

        {/* Planned Procedures */}
        {cdaDocument.plannedProcedures && (
          <div className="bg-gradient-to-r from-cyan-900/20 to-cyan-800/10 rounded-xl p-6 border border-cyan-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-cyan-400 mr-2" />
              <h4 className="text-cyan-300 font-semibold text-lg">Planned Procedures</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{cdaDocument.plannedProcedures}</div>
            </div>
          </div>
        )}

        {/* Social History */}
        {cdaDocument.socialHistory && (
          <div className="bg-gradient-to-r from-pink-900/20 to-pink-800/10 rounded-xl p-6 border border-pink-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-pink-400 mr-2" />
              <h4 className="text-pink-300 font-semibold text-lg">Social History</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-pink-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{cdaDocument.socialHistory}</div>
            </div>
          </div>
        )}

        {/* Temperature */}
        {cdaDocument.temperature && (
          <div className="bg-gradient-to-r from-rose-900/20 to-rose-800/10 rounded-xl p-6 border border-rose-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-rose-400 mr-2" />
              <h4 className="text-rose-300 font-semibold text-lg">Temperature</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-rose-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{cdaDocument.temperature}</div>
            </div>
          </div>
        )}

        {/* Blood Pressure */}
        {cdaDocument.PressionArterielle && (
          <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-blue-400 mr-2" />
              <h4 className="text-blue-300 font-semibold text-lg">Blood Pressure</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">
                {cdaDocument.PressionArterielle}
              </div>
            </div>
          </div>
        )}

        {/* Height */}
        {cdaDocument.Taille && (
          <div className="bg-gradient-to-r from-emerald-900/20 to-emerald-800/10 rounded-xl p-6 border border-emerald-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-emerald-400 mr-2" />
              <h4 className="text-emerald-300 font-semibold text-lg">Height</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{cdaDocument.Taille}</div>
            </div>
          </div>
        )}

        {/* Weight */}
        {cdaDocument.Poids && (
          <div className="bg-gradient-to-r from-amber-900/20 to-amber-800/10 rounded-xl p-6 border border-amber-500/30">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-amber-400 mr-2" />
              <h4 className="text-amber-300 font-semibold text-lg">Weight</h4>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
              <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{cdaDocument.Poids}</div>
            </div>
          </div>
        )}


        {/* PDF download button after JSON data */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={downloadAsPDF}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>{language === "fr" ? "Télécharger en PDF" : "Download as PDF"}</span>
          </Button>
        </div>
      </div>
    )
  }


  const fetchLatestCDADocument = async () => {
    try {
      const selectedPatient = JSON.parse(localStorage.getItem("selectedPatient") || "null");
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

      console.log("[DEBUG] Current user data:", currentUser);
      console.log("[DEBUG] Selected patient data:", selectedPatient);
      
      // Extract patient name - use firstName + lastName based on your data structure
      const patientName = `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`.trim();

      // Extract doctor name from current user - use full_name based on your data structure
      const doctorName = currentUser?.full_name?.trim() || '';
      console.log("[DEBUG] Extracted search parameters:", { patientName, doctorName });

      if (!patientName || !doctorName) {
        console.warn("[DEBUG] Missing required fields:", { 
          patientName, 
          doctorName,
          hasPatientName: !!patientName,
          hasDoctorName: !!doctorName,
          patientData: selectedPatient,
          userData: currentUser
        });
        return { message: t.noDocumentFound };
      }

      // Build the query URL for clinical_documents table
      const url = new URL(BASE);
      
      // Normalize inputs
      const rawPatientName = `${selectedPatient?.firstName || ""} ${selectedPatient?.lastName || ""}`
        .replace(/\s+/g, " ")
        .trim();
      
      const rawDoctorName = (currentUser?.full_name || "").replace(/\s+/g, " ").trim();

      // Build tolerant filters (case-insensitive, ignores extra spaces in DB)
      const likeName   = `*${rawPatientName}*`;
      const likeDoctor = `*${rawDoctorName}*`;

      // Base select
      url.searchParams.set("select", "document_id,doctor_id,patient_name,patient_Sex,Birth_date,patient_address,patient_contact,doctor_name,Specialization,Local_Facility_Code,Local_Facility_Adress,Local_Facility_contact,Transcribed_Session,PastMedicalHistory,FamilyHistory,SocialHistory,Allergies,Temperature,Weight,Height,BMI,ArterialPressure,ProblemList,Medications,Assessment,CarePlan,PlannedProcedures,ReasonForVisit,HistoryOfPresentIllness,EncounterSummary,created_at");

      // Use ilike with wildcards instead of eq
      url.searchParams.set("patient_name", `ilike.${likeName}`);
      url.searchParams.set("doctor_name", `ilike.${likeDoctor}`);
      url.searchParams.set("order", "created_at.desc");
      url.searchParams.set("limit", "5");

      console.log("[DEBUG] Final query URL:", url.toString());

      const res = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      console.log("[DEBUG] Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.warn("[DEBUG] HTTP error:", res.status, errorText);
        return { message: t.noDocumentFound };
      }

      const rows = await res.json();
      console.log("[DEBUG] Query results:", rows);
      console.log("[DEBUG] Number of results:", rows?.length || 0);

      if (Array.isArray(rows) && rows.length > 0) {
        const document = rows[0];
        console.log("[DEBUG] Document found:", document);
        
        // Transform the database structure to match your component's expected format
        // ✅ Use currentUser data directly for license_number and establishment
        const cdaDocument = {
          id: document.document_id,
          patient_info: {
            name: document.patient_name?.trim(),
            gender: document.patient_Sex?.trim(),
            birth_date: document.Birth_date?.trim(),
            address: document.patient_address?.trim(),
            phone: document.patient_contact?.trim()
          },
          doctor_info: {
            name: document.doctor_name?.trim(),
            specialization: document.Specialization?.trim(),
            // ✅ Use currentUser data directly instead of database values
            license_number: currentUser?.license_number || currentUser?.licenseNumber || "N/A",
            establishment: currentUser?.facility_name || currentUser?.facilityName || "N/A"
          },
          consultation_content: document.Transcribed_Session?.trim(),
          medical_findings: document.Assessment?.trim(),
          recommendations: document.CarePlan?.trim(),
          socialHistory: document.SocialHistory?.trim(),
          temperature: document.Temperature?.trim(),
          PressionArterielle: document.ArterialPressure?.trim(),
          Taille: document.Height?.trim(),
          Poids: document.Weight?.trim(),
          ProblemList: document.ProblemList?.trim(),
          medications: document.Medications?.trim(),
          plannedProcedures: document.PlannedProcedures?.trim(),
          created_at: document.created_at
        };
        
        console.log("[DEBUG] Processed CDA document:", cdaDocument);
        console.log("[DEBUG] License number from currentUser:", currentUser?.license_number);
        console.log("[DEBUG] Facility name from currentUser:", currentUser?.facility_name);
        return cdaDocument;
      } else {
        console.log("[DEBUG] No documents found matching criteria");
        return { message: t.noDocumentFound };
      }

    } catch (error) {
      console.error("[DEBUG] Error fetching CDA document:", error);
      return { message: t.noDocumentFound };
    }
  };


  return (
    <div className="p-6 space-y-6">
      {/* Recording Controls */}
      <div className="bg-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || isLoadingCDA}
            className={`px-8 py-4 text-lg font-medium ${
              isRecording ? "bg-red-500 hover:bg-red-600" : "bg-teal-500 hover:bg-teal-600"
            } text-white`}
          >
            {isRecording ? (
              <>
                <MicOff className="h-5 w-5 mr-2" />
                {t.stopRecording}
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                {t.startRecording}
              </>
            )}
          </Button>
        </div>

        {/* Recording Time */}
        {isRecording && (
          <div className="text-center">
            <p className="text-slate-300 text-sm">{t.recordingTime}</p>
            <p className="text-2xl font-mono text-teal-400">{formatTime(recordingTime)}</p>
          </div>
        )}

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-1 h-16">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className="bg-teal-400 w-1 rounded-full transition-all duration-100"
                style={{ height: `${Math.max(4, height * 0.4)}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {(isProcessing || isLoadingCDA) && (
        <div className="bg-slate-800 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-slate-300">{isProcessing ? t.processing : t.fetchingDocument}</p>
        </div>
      )}

      {/* CDA Document Display */}
      {cdaDocument && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.cdaGenerated}</h3>
          {renderCDADocument(cdaDocument)}
        </div>
      )}
    </div>
  )
}
