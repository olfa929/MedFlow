"use client"
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion"
import { Bot, User, FileText, RefreshCw, Edit3, Save, Sparkles, Clock, Heart, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const SUPABASE_URL = "https://waawehppqpmlvqbghith.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w";

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
  notes?: string
  consultationData?: {
    bloodPressure: string
    heartRate: string
    symptoms: string[]
    medications: string[]
    notes: string
  }
}

// Helper to create a unique key for localStorage based on doctor+patient
function getSummaryStorageKey(doctorId: string, patientName: string): string {
  return `summary_${doctorId}_${patientName.replace(/\s+/g, '_')}`;
}

// Helper to load persisted summary
function loadPersistedSummary(doctorId: string, patientName: string): string | null {
  try {
    const key = getSummaryStorageKey(doctorId, patientName);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Helper to save summary
function savePersistedSummary(doctorId: string, patientName: string, summary: string): void {
  try {
    const key = getSummaryStorageKey(doctorId, patientName);
    localStorage.setItem(key, summary);
  } catch {
    // Ignore save errors
  }
}

export default function SummaryPage() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState("")
  const [cdaDoc, setCdaDoc] = useState<any>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitTimer, setWaitTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploadedJSON, setHasUploadedJSON] = useState(false);
  const [isUploadingJSON, setIsUploadingJSON] = useState(false);
  const [uploadWaitTimer, setUploadWaitTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [uploadSummary, setUploadSummary] = useState("");
  const [showUploadSummary, setShowUploadSummary] = useState(false);
  const [isEditingUpload, setIsEditingUpload] = useState(false);
  const [editedUploadSummary, setEditedUploadSummary] = useState("");


  useEffect(() => () => { 
    if (waitTimer) clearTimeout(waitTimer);
    if (uploadWaitTimer) clearTimeout(uploadWaitTimer);
  }, [waitTimer, uploadWaitTimer]);
  // Load selected patient from localStorage
  useEffect(() => {
    const storedPatient = localStorage.getItem("selectedPatient")
    setHasUploadedJSON(false);
    if (storedPatient) {
      const patient = JSON.parse(storedPatient)
      setSelectedPatient(patient)
    }
  }, [])

  // Load CDA document when patient changes
  useEffect(() => {
    if (!selectedPatient) return;
    try {
      const cached = localStorage.getItem("lastCDA");
      if (!cached) return;
      const { doc } = JSON.parse(cached) || {};
      if (!doc) return;

      const normalize = (s: any) =>
        String(s || "")
          .normalize("NFKD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
    

      const want = normalize(
        `${selectedPatient.firstName || ""} ${selectedPatient.lastName || ""}`.trim() ||
        (selectedPatient as any).full_name || ""
      );

      const got = normalize(doc?.patient_info?.name || doc?.patient_name || "");

      if (want && got && want === got) setCdaDoc(doc);
    } catch { /* ignore */ }
  }, [selectedPatient]);

  // Load persisted summary when patient changes
  useEffect(() => {
    if (!selectedPatient) {
      setSummary("");
      setShowSummary(false);
      setHasUploadedJSON(false);

      return;
    }

    const user = getCurrentUser();
    const doctorId = String(user?.doctor_id ?? "").trim();
    const patientName = `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim();
    
    if (doctorId && patientName) {
      const persistedSummary = loadPersistedSummary(doctorId, patientName);
      if (persistedSummary) {
        setSummary(persistedSummary);
        setEditedSummary(persistedSummary); // Initialize edited summary
        setShowSummary(true);
        console.log('[LOAD-SUMMARY] Loaded persisted summary for', patientName);
      } else {
        setSummary("");
        setEditedSummary("");
        setShowSummary(false);
      }
    }
  }, [selectedPatient]);
  useEffect(() => {
    if (!selectedPatient) {
      setUploadSummary("");
      setShowUploadSummary(false);
      setEditedUploadSummary("");
      return;
    }

    const user = getCurrentUser();
    const doctorId = String(user?.doctor_id ?? "").trim();
    const patientId = String(selectedPatient?.id ?? "").trim();
    const patientName = `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim();
    
    if (doctorId && patientId && patientName) {
      // First try to load from localStorage
      const persistedUploadSummary = loadPersistedUploadSummary(doctorId, patientName);
      
      if (persistedUploadSummary) {
        setUploadSummary(persistedUploadSummary);
        setEditedUploadSummary(persistedUploadSummary);
        setShowUploadSummary(true);
        console.log('[LOAD-UPLOAD-SUMMARY] Loaded persisted upload summary for', patientName);
      } else {
        // If not in localStorage, fetch from database
        fetchLatestUploadByIds(doctorId, patientId)
          .then(row => {
            if (row?.summary && row.summary.trim()) {
              const summary = row.summary.trim();
              setUploadSummary(summary);
              setEditedUploadSummary(summary);
              setShowUploadSummary(true);
              // Save to localStorage for future use
              savePersistedUploadSummary(doctorId, patientName, summary);
              console.log('[LOAD-UPLOAD-SUMMARY] Loaded upload summary from database for', patientName);
            } else {
              setUploadSummary("");
              setEditedUploadSummary("");
              setShowUploadSummary(false);
            }
          })
          .catch(error => {
            console.error('[LOAD-UPLOAD-SUMMARY] Error fetching upload summary:', error);
            setUploadSummary("");
            setEditedUploadSummary("");
            setShowUploadSummary(false);
          });
      }
    }
  }, [selectedPatient]);

  // Small helpers to read current user/patient from localStorage
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getSelectedPatient() {
    try {
      const raw = localStorage.getItem("selectedPatient");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Build standard headers for Supabase REST
  function sbHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };
  }

  // REPLACE YOUR EXISTING fetchLatestClinicalDoc FUNCTION WITH THIS:
  async function fetchLatestClinicalDoc(doctorId: string, patientId: string) {
    const doctorIdTrimmed = doctorId.trim();
    const patientIdTrimmed = patientId.trim();
    const base = `${SUPABASE_URL}/rest/v1/clinical_documents`;
    
    console.log("[CLINICAL-DOC] Searching for doctor_id:", doctorIdTrimmed, "patient_id:", patientIdTrimmed);

    const url = new URL(base);
    url.searchParams.set("select", "*");
    url.searchParams.set('doctor_id', `eq.${doctorIdTrimmed}`);
    url.searchParams.set('patient_id', `eq.${patientIdTrimmed}`);
    
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", "1");

    console.log("[CLINICAL-DOC] Request URL:", url.toString());
    
    const response = await fetch(url.toString(), { 
      headers: sbHeaders() 
    });
    
    console.log("[CLINICAL-DOC] Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CLINICAL-DOC] Error response:", errorText);
      throw new Error(`Failed to fetch clinical document: ${response.status} ${response.statusText}`);
    }
    
    const rows = await response.json();
    console.log("[CLINICAL-DOC] Found rows:", rows.length);
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log("[CLINICAL-DOC] Returning document with ID:", rows[0].document_id, "source:", rows[0].source);
      return rows[0];
    }

    console.log("[CLINICAL-DOC] No clinical document found");
    return null;
  }
  async function saveUploadedClinicalDoc(doctorId: string, patientId: string, jsonData: any) {
    const base = `${SUPABASE_URL}/rest/v1/clinical_documents`;
    
    const payload = {
      doctor_id: doctorId.trim(),
      patient_id: patientId.trim(),
      document_data: jsonData,
      source: 'uploaded',
      created_at: new Date().toISOString()
    };

    console.log("[SAVE-CLINICAL-DOC] Saving uploaded document");

    const response = await fetch(base, {
      method: 'POST',
      headers: {
        ...sbHeaders(),
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SAVE-CLINICAL-DOC] Error:", errorText);
      throw new Error(`Failed to save clinical document: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("[SAVE-CLINICAL-DOC] Saved document with ID:", result[0]?.document_id);
    return result[0];
  }



    // Normalize names for comparison
    function normalizeName(s: string) {
      return (s || "")
        .normalize("NFKC")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }
    // Add these helper functions after your existing getSummaryStorageKey function

  // Helper to create a unique key for upload summary localStorage based on doctor+patient
  function getUploadSummaryStorageKey(doctorId: string, patientName: string): string {
    return `upload_summary_${doctorId}_${patientName.replace(/\s+/g, '_')}`;
  }

  // Helper to load persisted upload summary
  function loadPersistedUploadSummary(doctorId: string, patientName: string): string | null {
    try {
      const key = getUploadSummaryStorageKey(doctorId, patientName);
      return localStorage.getItem(key);
    } catch {
      return null;
    }
}

// Helper to save upload summary
function savePersistedUploadSummary(doctorId: string, patientName: string, summary: string): void {
  try {
    const key = getUploadSummaryStorageKey(doctorId, patientName);
    localStorage.setItem(key, summary);
  } catch {
    // Ignore save errors
  }
}

  // Poll for new summary with timestamp filtering
  // Poll for a new summary by (doctor_id, patient_id)
// Poll for a new summary by (doctor_id, patient_id)
  // REPLACE YOUR EXISTING waitForSummary FUNCTION WITH THIS:
  async function waitForSummary(doctorId: string, patientId: string, afterTimestamp: number): Promise<string> {
    const started = Date.now();
    const timeoutMs = 70_000; // 70 seconds
    const stepMs = 3_000; // Check every 3 seconds
    let attempts = 0;
    const maxAttempts = Math.floor(timeoutMs / stepMs);

    console.log(`[WAIT-SUMMARY] Starting to poll for summary (max ${maxAttempts} attempts)`);

    while (Date.now() - started < timeoutMs) {
      attempts++;
      console.log(`[WAIT-SUMMARY] Attempt ${attempts}/${maxAttempts}`);
      
      try {
        const row = await fetchLatestSummaryByIds(doctorId, patientId, afterTimestamp);
        if (row?.summary && row.summary.trim()) {
          console.log(`[WAIT-SUMMARY] Found summary after ${attempts} attempts`);
          return row.summary.trim();
        }
      } catch (error) {
        console.error(`[WAIT-SUMMARY] Error in attempt ${attempts}:`, error);
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, stepMs));
    }
    
    console.log(`[WAIT-SUMMARY] Timeout reached after ${attempts} attempts`);
    return "";
  }


  // Fetch the latest summary row by doctor_id + patient_id (optional created_at > afterTimestamp)
  // Fetch the latest summary row by doctor_id + patient_id (optionally only rows created after a timestamp)
  // REPLACE YOUR EXISTING fetchLatestSummaryByIds FUNCTION WITH THIS:
  async function fetchLatestSummaryByIds(doctorId: string, patientId: string, afterTimestamp?: number) {
    const base = `${SUPABASE_URL}/rest/v1/summary`;
    const did = doctorId.trim();
    const pid = patientId.trim();
    
    if (!did || !pid) {
      console.error("[FETCH-SUMMARY] Missing doctor_id or patient_id");
      return null;
    }

    const url = new URL(base);
    url.searchParams.set("select", "summary,patient_id,doctor_id,created_at");
    url.searchParams.set("doctor_id", `eq.${did}`);
    url.searchParams.set("patient_id", `eq.${pid}`);
    
    if (afterTimestamp) {
      const iso = new Date(afterTimestamp).toISOString();
      url.searchParams.set("created_at", `gt.${iso}`);
      console.log("[FETCH-SUMMARY] Looking for summaries after:", iso);
    }
    
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", "1");

    console.log("[FETCH-SUMMARY] Request URL:", url.toString());
    
    const response = await fetch(url.toString(), { 
      headers: { 
        apikey: SUPABASE_ANON_KEY, 
        Authorization: `Bearer ${SUPABASE_ANON_KEY}` 
      } 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[FETCH-SUMMARY] Error response:", errorText);
      return null;
    }
    
    const rows = await response.json();
    console.log("[FETCH-SUMMARY] Found rows:", rows.length);
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log("[FETCH-SUMMARY] Returning summary created at:", rows[0].created_at);
      return rows[0];
    }
    
    return null;
  }
  async function fetchLatestUploadByIds(doctorId: string, patientId: string, afterTimestamp?: number) {
    const base = `${SUPABASE_URL}/rest/v1/upload`;
    const did = doctorId.trim();
    const pid = patientId.trim();
    
    if (!did || !pid) {
      console.error("[FETCH-UPLOAD] Missing doctor_id or patient_id");
      return null;
    }

    const url = new URL(base);
    url.searchParams.set("select", "summary,patient_id,doctor_id,created_at");
    url.searchParams.set("doctor_id", `eq.${did}`);
    url.searchParams.set("patient_id", `eq.${pid}`);
    
    if (afterTimestamp) {
      const iso = new Date(afterTimestamp).toISOString();
      url.searchParams.set("created_at", `gt.${iso}`);
    }
    
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), { 
      headers: { 
        apikey: SUPABASE_ANON_KEY, 
        Authorization: `Bearer ${SUPABASE_ANON_KEY}` 
      } 
    });
    
    if (!response.ok) {
      return null;
    }
    
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }
  async function waitForUploadResult(doctorId: string, patientId: string, afterTimestamp: number): Promise<string> {
    const started = Date.now();
    const timeoutMs = 70_000;
    const stepMs = 3_000;
    let attempts = 0;
    const maxAttempts = Math.floor(timeoutMs / stepMs);

    while (Date.now() - started < timeoutMs) {
      attempts++;
      
      try {
        const row = await fetchLatestUploadByIds(doctorId, patientId, afterTimestamp);
        if (row?.summary && row.summary.trim()) {
          return row.summary.trim();
        }
      } catch (error) {
        console.error(`[WAIT-UPLOAD] Error in attempt ${attempts}:`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, stepMs));
    }
    
    return "";  
  }
    


  // REPLACE YOUR EXISTING handleGenerateSummary FUNCTION WITH THIS:
  const handleGenerateSummary = async () => {
    try {
      const user = getCurrentUser();
      const patient = getSelectedPatient();

      const doctorId = String(user?.doctor_id ?? "").trim();
      const patientId = String(patient?.id ?? "").trim();
      const patientName = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.replace(/\s+/g, " ").trim();

      console.log("[GENERATE-SUMMARY] Doctor ID:", doctorId);
      console.log("[GENERATE-SUMMARY] Patient ID:", patientId);

      if (!doctorId || !patientId) {
        alert("Missing doctor_id or patient_id.");
        return;
      }

      setIsGenerating(true);
      setIsWaiting(false);
      setShowSummary(false);
      setSummary("");

      // Check for recent summary
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      const existingSummary = await fetchLatestSummaryByIds(doctorId, patientId, tenMinutesAgo);
      
      if (existingSummary?.summary) {
        console.log("[GENERATE-SUMMARY] Found recent summary, using it");
        setSummary(existingSummary.summary);
        setEditedSummary(existingSummary.summary);
        setShowSummary(true);
        setIsGenerating(false);
        savePersistedSummary(doctorId, patientName, existingSummary.summary);
        return;
      }

      // Fetch ONLY generated clinical documents (excludes uploaded ones)
      console.log("[GENERATE-SUMMARY] Fetching latest GENERATED clinical document...");
      const clinicalDoc = await fetchLatestClinicalDoc(doctorId, patientId);
      
      if (!clinicalDoc) {
        setIsGenerating(false);
        alert("No clinical document found for this doctor+patient combination.");
        return;
      }

      console.log("[GENERATE-SUMMARY] Found generated clinical document:", clinicalDoc.document_id);

      const generationStartTime = Date.now();
      setLastGenerationTime(generationStartTime);

      const webhookPayload = {
        patient_id: patientId,
        doctor_id: doctorId,
        patient_name: patientName,
        clinical_document: clinicalDoc,
        document_id: clinicalDoc.document_id
      };

      const webhookResponse = await fetch("http://localhost:5678/webhook/w2", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
      }

      console.log("[GENERATE-SUMMARY] Webhook request successful");

      setIsGenerating(false);
      setIsWaiting(true);

      console.log("[GENERATE-SUMMARY] Waiting for summary generation...");
      
      const foundSummary = await waitForSummary(doctorId, patientId, generationStartTime);

      setIsWaiting(false);

      if (foundSummary) {
        console.log("[GENERATE-SUMMARY] Summary generated successfully");
        setSummary(foundSummary);
        setEditedSummary(foundSummary);
        setShowSummary(true);
        savePersistedSummary(doctorId, patientName, foundSummary);
      } else {
        console.log("[GENERATE-SUMMARY] No summary found after timeout");
        alert("Summary generation timed out. Please try again or check if the AI service is running.");
      }

    } catch (error: any) {
      console.error("[GENERATE-SUMMARY] Error:", error);
      setIsWaiting(false);
      setIsGenerating(false);
      alert(`Failed to generate summary: ${error?.message ?? "Unknown error"}`);
    }
  };


  const handleGenerateFromCDA = async () => {
    try {
      const user = getCurrentUser();
      const patient = getSelectedPatient();

      const doctorId = String(user?.doctor_id ?? "").trim();
      const patientId = String(patient?.id ?? "").trim();
      const patientName = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.replace(/\s+/g, " ").trim();

      console.log("[GENERATE-FROM-CDA] Doctor ID:", doctorId);
      console.log("[GENERATE-FROM-CDA] Patient ID:", patientId);

      if (!doctorId || !patientId) {
        alert("Missing doctor_id or patient_id.");
        return;
      }

      setIsGenerating(true);
      setIsWaiting(false);
      setShowSummary(false);
      setSummary("");

      // Fetch ONLY generated clinical documents (excludes uploaded ones)
      console.log("[GENERATE-FROM-CDA] Fetching latest GENERATED clinical document...");
      const clinicalDoc = await fetchLatestClinicalDoc(doctorId, patientId);
      
      if (!clinicalDoc) {
        setIsGenerating(false);
        alert("No clinical document found for this doctor+patient combination.");
        return;
      }

      console.log("[GENERATE-FROM-CDA] Found generated clinical document:", clinicalDoc.document_id);

      const generationStartTime = Date.now();
      setLastGenerationTime(generationStartTime);

      const webhookPayload = {
        patient_id: patientId,
        doctor_id: doctorId,
        patient_name: patientName,
        clinical_document: clinicalDoc,
        document_id: clinicalDoc.document_id
      };

      const webhookResponse = await fetch("http://localhost:5678/webhook/w2", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
      }

      console.log("[GENERATE-FROM-CDA] Webhook request successful");

      setIsGenerating(false);
      setIsWaiting(true);

      console.log("[GENERATE-FROM-CDA] Waiting for summary generation...");
      
      const foundSummary = await waitForSummary(doctorId, patientId, generationStartTime);

      setIsWaiting(false);

      if (foundSummary) {
        console.log("[GENERATE-FROM-CDA] Summary generated successfully");
        setSummary(foundSummary);
        setEditedSummary(foundSummary);
        setShowSummary(true);
        savePersistedSummary(doctorId, patientName, foundSummary);
      } else {
        console.log("[GENERATE-FROM-CDA] No summary found after timeout");
        alert("Summary generation timed out. Please try again or check if the AI service is running.");
      }

    } catch (error: any) {
      console.error("[GENERATE-FROM-CDA] Error:", error);
      setIsWaiting(false);
      setIsGenerating(false);
      alert(`Failed to generate summary: ${error?.message ?? "Unknown error"}`);
    }
  };

  // REPLACE YOUR EXISTING handleRegenerate FUNCTION WITH THIS:
  const handleRegenerate = () => {
    // Clear the persisted summary before regenerating
    const user = getCurrentUser();
    const doctorId = String(user?.doctor_id ?? "").trim();
    const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim() : "";
    
    if (doctorId && patientName) {
      try {
        const key = getSummaryStorageKey(doctorId, patientName);
        localStorage.removeItem(key);
        console.log("[REGENERATE] Cleared persisted summary for:", patientName);
      } catch (error) {
        console.error("[REGENERATE] Error clearing persisted summary:", error);
      }
    }
    
    // Reset UI state
    setIsEditing(false);
    setSummary("");
    setEditedSummary("");
    setShowSummary(false);
    
    // Generate new summary
    handleGenerateSummary();
  };
  const handleEdit = () => {
    setIsEditing(true);
  }

  const handleSaveEdit = () => {
    const user = getCurrentUser();
    const doctorId = String(user?.doctor_id ?? "").trim();
    const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim() : "";
    
    // Update the main summary with edited content
    setSummary(editedSummary);
    
    // Save to localStorage
    if (doctorId && patientName) {
      savePersistedSummary(doctorId, patientName, editedSummary);
    }
    
    setIsEditing(false);
  }

  const handleCancelEdit = () => {
    setEditedSummary(summary); // Reset to original
    setIsEditing(false);
  }


  const handleUploadJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    try {
      const user = getCurrentUser();
      const patient = getSelectedPatient();

      const doctorId = String(user?.doctor_id ?? "").trim();
      const patientId = String(patient?.id ?? "").trim();

      if (!doctorId || !patientId) {
        alert("Missing doctor_id or patient_id.");
        return;
      }

      setIsUploadingJSON(true);


      // Read the JSON file
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        setIsUploadingJSON(false);
        alert('Invalid JSON file. Please check the file format.');
        return;
      }

      const uploadStartTime = Date.now();

      // Send to the upload webhook
      const payload = {
        patient_id: patientId,
        doctor_id: doctorId,
        json_data: jsonData
      };

      console.log('[UPLOAD-JSON] Sending to upload webhook:', payload);

      const webhookResponse = await fetch("http://localhost:5678/webhook/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Upload webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
      }

      console.log("[UPLOAD-JSON] Upload webhook successful, waiting for result...");

      const foundSummary = await waitForUploadResult(doctorId, patientId, uploadStartTime);

      if (foundSummary) {
        console.log("[UPLOAD-JSON] Upload processed successfully");
        setUploadSummary(foundSummary);
        setEditedUploadSummary(foundSummary);
        setShowUploadSummary(true);
        setHasUploadedJSON(true);
      } else {
        console.log("[UPLOAD-JSON] No upload result found after timeout");
        alert("Upload processing timed out. Please try again.");
      }

            setIsUploadingJSON(false);

          } catch (error: any) {
            console.error('[UPLOAD-JSON] Error:', error);
            setIsUploadingJSON(false);
            alert(error?.message ?? "Failed to process uploaded JSON file.");
          }
        }



  const handleSaveToEHR = () => {
    console.log("Saving to EHR...")
  }


  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  // Symptoms from CDA ProblemList
  const symptomsFromCDA = useMemo<string[]>(() => {
    const problemSrc =
      cdaDoc?.ProblemList ??
      cdaDoc?.problemList ??
      cdaDoc?.DiagnosticsEtProblemes?.ProblemList ??
      "";

    const raw = Array.isArray(problemSrc)
      ? problemSrc
      : typeof problemSrc === "string"
        ? problemSrc.split(/[\n;,|]/)
        : [];

    return raw.map((s: any) => String(s).trim()).filter(Boolean);
  }, [cdaDoc]);

  // Medications from CDA
  const medsFromCDA = useMemo<string[]>(() => {
    const medsSrc =
      cdaDoc?.Medications ??
      cdaDoc?.medications ??
      cdaDoc?.MedicationList ??
      "";

    const raw = Array.isArray(medsSrc)
      ? medsSrc
      : typeof medsSrc === "string"
        ? medsSrc.split(/[\n;,|]/)
        : [];

    return raw.map((s: any) => String(s).trim()).filter(Boolean);
  }, [cdaDoc]);

  if (!selectedPatient) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">No Patient Selected</h3>
            <p className="text-slate-500">Please select a patient from the patient list to view their summary.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Selected Patient Details */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-400" />
              Patient Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-teal-400/20 text-teal-400 font-semibold text-lg">
                  {getInitials(selectedPatient.firstName, selectedPatient.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h3>
                <p className="text-slate-400">
                  {selectedPatient.dateOfBirth
                    ? Math.floor(
                        (Date.now() - new Date(selectedPatient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
                      )
                    : "N/A"}{" "}
                  years old 
                </p>
                <Badge variant="secondary" className="mt-1 bg-teal-400/10 text-teal-400 border-teal-400/20">
                  {selectedPatient.condition}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-400">Contact Information</h4>
              <div className="space-y-1">
                <p className="text-sm text-slate-300 bg-slate-800/30 rounded px-2 py-1">
                  Email: {selectedPatient.email}
                </p>
                <p className="text-sm text-slate-300 bg-slate-800/30 rounded px-2 py-1">
                  Phone: {selectedPatient.phone}
                </p>
              </div>
            </div>

            {selectedPatient.notes && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-400">Patient Notes</h4>
                <p className="text-sm text-slate-300 bg-slate-800/30 rounded p-3 leading-relaxed">
                  {selectedPatient.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* JSON Document Upload */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-400" />
              JSON Document Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isUploadingJSON && !showUploadSummary ? (
              <div className="text-center py-8">
                <Upload className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 mb-6">
                  Upload a JSON clinical document to generate summary
                </p>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadJSON}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="json-upload-main"
                  />
                  <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload JSON File
                  </Button>
                </div>
              </div>
            ) : isUploadingJSON ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 text-teal-400 mb-4">
                  <Clock className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Processing JSON... (1 minute wait)</span>
                </div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-3 bg-slate-800/50 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/30 rounded-lg p-4 border-l-4 border-purple-400">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <FileText className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      {isEditingUpload ? (
                        <textarea
                          value={editedUploadSummary}
                          onChange={(e) => setEditedUploadSummary(e.target.value)}
                          className="w-full min-h-[200px] p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          placeholder="Edit the upload summary..."
                        />
                      ) : (
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">
                          {uploadSummary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {isEditingUpload ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setUploadSummary(editedUploadSummary);
                          setIsEditingUpload(false);
                        }}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditedUploadSummary(uploadSummary);
                          setIsEditingUpload(false);
                        }}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingUpload(true)}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleUploadJSON}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                          disabled={isUploadingJSON}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload New File
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Summary Generation */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-teal-400" />
              AI Patient Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Empty state + buttons */}
            {!showSummary && !isGenerating && !isWaiting && (
              <div className="text-center py-8">
                <Bot className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 mb-6">
                  Generate an AI-powered comprehensive summary for {selectedPatient.firstName}{" "}
                  {selectedPatient.lastName}
                </p>
                <Button onClick={handleGenerateSummary}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Summary
                </Button>
              </div>
            )}


            {/* Waiting State */}
            {isWaiting && !isUploading && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 text-teal-400 mb-4">
                  <Clock className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Processing with AI...</span>
                </div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-3 bg-slate-800/50 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            )}

            {/* Loading State with Shimmer */}
            {isGenerating && !isWaiting && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-teal-400">
                  <Bot className="h-5 w-5 animate-pulse" />
                  <span className="text-sm font-medium">AI is analyzing patient data...</span>
                </div>
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-slate-800/50 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            <AnimatePresence>
              {showSummary && summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-800/30 rounded-lg p-4 border-l-4 border-teal-400">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-teal-400" />
                      </div>
                      <div className="flex-1">
                        {isEditing ? (
                          <textarea
                            value={editedSummary}
                            onChange={(e) => setEditedSummary(e.target.value)}
                            className="w-full min-h-[200px] p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                            placeholder="Edit the summary..."
                          />
                        ) : (
                          <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">
                            {summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Chips */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="flex flex-wrap gap-2 pt-2"
                  >
                    {isEditing ? (
                      // Edit mode buttons
                      <>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            className="bg-teal-500 hover:bg-teal-600 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                          >
                            Cancel
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      // Normal mode buttons
                      <>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerate}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                            disabled={isWaiting || isGenerating || isUploading}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </Button>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEdit}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </motion.div>
                        
 
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}