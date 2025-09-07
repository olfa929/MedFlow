"use client"

import type React from "react"
import emailjs from '@emailjs/browser'


import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, Stethoscope, Phone, FileText, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function SignUpPage() {
  useEffect(() => {
    // Initialize EmailJS with your public key
    emailjs.init('EBmLZkRVkxSHriQOY')
    
    // Clear existing localStorage items
    localStorage.removeItem("registeredUsers")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("selectedPatient")
    localStorage.removeItem("patients")
    localStorage.removeItem("isAuthenticated")
  }, [])

  const [formData, setFormData] = useState({
    fullName: "",
    specialization: "",
    email: "",
    phone: "",
    licenseNumber: "",
    facilityCode: "",
    establishmentName: "",
    establishmentAddress: "",
    establishmentContact: "",
    password: "",
    confirmPassword: "",
  })
  const [emailConfirmation, setEmailConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState({
    licenseNumber: "",
    facilityCode: "",
  })
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [enteredCode, setEnteredCode] = useState("")
  const router = useRouter()

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    if (/[^A-Za-z0-9]/.test(password)) strength += 25
    return Math.min(strength, 100)
  }

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 25) return "bg-red-500"
    if (strength < 50) return "bg-orange-500"
    if (strength < 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getPasswordStrengthLabel = (strength: number) => {
    if (strength < 25) return "Weak"
    if (strength < 50) return "Fair"
    if (strength < 75) return "Good"
    return "Strong"
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === "licenseNumber") {
      // Only allow numeric input and limit to 6 digits
      const numericValue = value.replace(/\D/g, "").slice(0, 6)
      setFormData((prev) => ({ ...prev, [field]: numericValue }))

      if (numericValue.length > 0 && numericValue.length !== 6) {
        setValidationErrors((prev) => ({ ...prev, licenseNumber: "License number must be exactly 6 digits" }))
      } else {
        setValidationErrors((prev) => ({ ...prev, licenseNumber: "" }))
      }
    } else if (field === "facilityCode") {
      // Only allow alphanumeric input and limit to 10 characters
      const alphanumericValue = value.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, [field]: alphanumericValue }))

      if (alphanumericValue.length > 0 && alphanumericValue.length !== 10) {
        setValidationErrors((prev) => ({
          ...prev,
          facilityCode: "Facility code must be exactly 10 alphanumeric characters",
        }))
      } else {
        setValidationErrors((prev) => ({ ...prev, facilityCode: "" }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.licenseNumber.length !== 6 || !/^\d{6}$/.test(formData.licenseNumber)) {
      setError("License number must be exactly 6 digits")
      setIsLoading(false)
      return
    }

    if (formData.facilityCode.length !== 10 || !/^[A-Za-z0-9]{10}$/.test(formData.facilityCode)) {
      setError("Facility code must be exactly 10 alphanumeric characters")
      setIsLoading(false)
      return
    }

    if (formData.email !== emailConfirmation) {
      setError("Email addresses do not match")
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")

    // Check if user already exists
    const userExists = registeredUsers.find((user: any) => user.email === formData.email)
    if (userExists) {
      setError("An account with this email already exists")
      setIsLoading(false)
      return
    }

    // Generate a 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  setVerificationCode(code)

  // Send actual email
  try {
    await sendVerificationEmail(formData.email, code, formData.fullName)
    setIsEmailSent(true)
  } catch (error) {
    setError("Failed to send verification email. Please try again.")
    setIsLoading(false)
    return
  }

    // Store user data temporarily (not fully registered yet)
    const tempUser = {
      id: Date.now().toString(),
      fullName: formData.fullName,
      specialization: formData.specialization,
      email: formData.email,
      phone: formData.phone,
      licenseNumber: formData.licenseNumber,
      facilityCode: formData.facilityCode,
      establishmentName: formData.establishmentName,
      establishmentAddress: formData.establishmentAddress,
      establishmentContact: formData.establishmentContact,
      password: formData.password,
      createdAt: new Date().toISOString(),
      verified: false,
    }

    localStorage.setItem("tempUser", JSON.stringify(tempUser))
    setIsEmailSent(true)
    setIsLoading(false)
  }
  const sendVerificationEmail = async (email: string, code: string, fullName: string): Promise<any> => {
    const templateParams = {
    email: email,            // ✅ matches {{email}} in template "To Email"
    to_name: fullName,
    verification_code: code,
    }

    return emailjs.send(
      'service_id', // Replace with your actual service ID
      'template_ggsalpi', 
      templateParams,
      'EBmLZkRVkxSHriQOY' // Add your EmailJS public key here
    )
  }


  const handleVerifyEmail = async () => {
    if (enteredCode === verificationCode) {
      const tempUser = JSON.parse(localStorage.getItem("tempUser") || "{}")

      // Insert doctor data into Supabase database
      const dbInsertSuccess = await insertDoctorToDatabase(tempUser)

      if (dbInsertSuccess) {
        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
        tempUser.verified = true
        registeredUsers.push(tempUser)
        localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))
        localStorage.removeItem("tempUser")
        router.push("/auth/signin")
      } else {
        setError("Failed to create account. Please try again.")
      }
    } else {
      setError("Invalid verification code. Please try again.")
    }
  }

  // Add this function to generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

  // Alternative: Use crypto.randomUUID() if available (modern browsers)
  const generateUUIDModern = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    } else {
      // Fallback to manual generation
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };
  // Updated insertDoctorToDatabase function to store plain text password
  const insertDoctorToDatabase = async (doctorData: any) => {
    try {
      const payload = {
        doctor_id:generateUUIDModern(),
        full_name: doctorData.fullName,
        Specialization: doctorData.specialization,
        phone: doctorData.phone,
        email: doctorData.email,
        "License Number": doctorData.licenseNumber,
        "Local Facility Code": doctorData.facilityCode,
        "Local Facility Name": doctorData.establishmentName,
        "Local Facility Adress": doctorData.establishmentAddress,
        // WARNING: Storing password as plain text - NOT SECURE
        password: doctorData.password,
      }

      console.log("Sending doctor data to database:", payload)

      const response = await fetch("https://waawehppqpmlvqbghith.supabase.co/rest/v1/doctors", {
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

      if (response.ok) {
        console.log("Doctor successfully added to database")
        return true
      } else if (response.status === 409) {
        const errorText = await response.text()
        console.log("Doctor already exists in database:", errorText)

        if (errorText.includes("doctors_doctor_id_key")) {
          console.log("Doctor with this license number already exists, proceeding with signup")
          return true
        }

        throw new Error(`Database conflict: ${errorText}`)
      } else {
        const errorText = await response.text()
        console.error("Database error response:", errorText)
        throw new Error(`Failed to insert doctor: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("Error inserting doctor to database:", error)
      return false
    }
  }

// For login verification with plain text passwords:
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch(`https://waawehppqpmlvqbghith.supabase.co/rest/v1/doctors?email=eq.${email}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXdlaHBwcXBtbHZxYmdoaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ4NTMsImV4cCI6MjA3MDYwMDg1M30.NGGIVuob3LUgsB9pQYUJEJCrRIY-vSX77f1wRCgPH7w",
        },
      });

      if (response.ok) {
        const users = await response.json();
        if (users.length > 0) {
          const user = users[0];
          // Simple plain text comparison - NOT SECURE
          if (user.password === password) {
            console.log("Login successful");
            return { success: true, user };
          }
        }
      }
      
      console.log("Login failed - invalid credentials");
      return { success: false, user: null };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, user: null };
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.password)

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mx-auto w-16 h-16 bg-teal-400/20 rounded-full flex items-center justify-center"
              >
                <Mail className="h-8 w-8 text-teal-400" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-white">Verify Your Email</CardTitle>
              <p className="text-slate-400">
                We've sent a verification code to <br />
                <span className="text-teal-400 font-medium">{formData.email}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">


              {error && (
                <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="verificationCode" className="text-slate-300">
                  Verification Code
                </Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  className="text-center text-lg tracking-widest bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerifyEmail}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 transition-all duration-200"
              >
                Verify Email
              </Button>

              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  Didn't receive the code? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setIsEmailSent(false)
                      setEnteredCode("")
                      setError("")
                    }}
                    className="text-teal-400 hover:text-teal-300 font-medium"
                  >
                    try again
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mx-auto w-16 h-16 bg-teal-400/20 rounded-full flex items-center justify-center"
            >
              <Stethoscope className="h-8 w-8 text-teal-400" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-white">Join MedFlow</CardTitle>
            <p className="text-slate-400">Create your account to get started</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && (
                <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-300">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Dr. John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization" className="text-slate-300">
                  Specialization
                </Label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="specialization"
                    type="text"
                    placeholder="e.g., Cardiologist, Neurologist, General Practitioner"
                    value={formData.specialization}
                    onChange={(e) => handleInputChange("specialization", e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@medflow.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailConfirmation" className="text-slate-300">
                  Confirm Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="emailConfirmation"
                    type="email"
                    placeholder="Confirm your email address"
                    value={emailConfirmation}
                    onChange={(e) => setEmailConfirmation(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber" className="text-slate-300">
                  Ordre des Médecins License Number
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="licenseNumber"
                    type="text"
                    placeholder="123456"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                    className={`pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400 ${
                      validationErrors.licenseNumber ? "border-red-500" : ""
                    }`}
                    maxLength={6}
                    required
                  />
                </div>
                {validationErrors.licenseNumber && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.licenseNumber}</p>
                )}
                <p className="text-slate-500 text-xs">Must be exactly 6 digits</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facilityCode" className="text-slate-300">
                  Local Facility Code
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="facilityCode"
                    type="text"
                    placeholder="ABC1234567"
                    value={formData.facilityCode}
                    onChange={(e) => handleInputChange("facilityCode", e.target.value)}
                    className={`pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400 ${
                      validationErrors.facilityCode ? "border-red-500" : ""
                    }`}
                    maxLength={10}
                    required
                  />
                </div>
                {validationErrors.facilityCode && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.facilityCode}</p>
                )}
                <p className="text-slate-500 text-xs">Must be exactly 10 alphanumeric characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="establishmentName" className="text-slate-300">
                  Nom de l'établissement
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="establishmentName"
                    type="text"
                    placeholder="Hôpital Central, Clinique Saint-Jean..."
                    value={formData.establishmentName}
                    onChange={(e) => handleInputChange("establishmentName", e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="establishmentAddress" className="text-slate-300">
                  Adresse de l'établissement
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="establishmentAddress"
                    type="text"
                    placeholder="123 Rue de la Santé, 75014 Paris"
                    value={formData.establishmentAddress}
                    onChange={(e) => handleInputChange("establishmentAddress", e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="establishmentContact" className="text-slate-300">
                  Contact de l'établissement
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="establishmentContact"
                    type="tel"
                    placeholder="+33 1 42 34 56 78"
                    value={formData.establishmentContact}
                    onChange={(e) => handleInputChange("establishmentContact", e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Password Strength</span>
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength < 25
                            ? "text-red-400"
                            : passwordStrength < 50
                              ? "text-orange-400"
                              : passwordStrength < 75
                                ? "text-yellow-400"
                                : "text-green-400"
                        }`}
                      >
                        {getPasswordStrengthLabel(passwordStrength)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 transition-all duration-200"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-slate-400">
                Already have an account?{" "}
                <Link href="/auth/signin" className="text-teal-400 hover:text-teal-300 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
