"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Bot, Calendar, Newspaper, Menu, X, Settings, Languages, LogOut, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const navigation = [
  {
    name: { en: "Consultation Capture", fr: "Capture de Consultation" },
    href: "/consultation",
    icon: Mic,
    id: "consultation",
  },
  {
    name: { en: "Patient Summary", fr: "Résumé Patient" },
    href: "/summary",
    icon: Bot,
    id: "summary",
  },
  {
    name: { en: "Smart Scheduling", fr: "Planification de Rendez-Vous" },
    href: "/scheduling",
    icon: Bot,
    id: "scheduling",
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [language, setLanguage] = useState("en")
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem("currentUser")
    if (user) {
      setCurrentUser(JSON.parse(user))
    }

    const savedLanguage = localStorage.getItem("language") || "en"
    setLanguage(savedLanguage)
  }, [])

  const currentPage = navigation.find((item) => pathname.startsWith(item.href))

  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "fr" : "en"
    setLanguage(newLanguage)
    localStorage.setItem("language", newLanguage)
  }

  const handleLogout = () => {
    localStorage.removeItem("currentUser")
    localStorage.removeItem("selectedPatient")
    router.push("/auth/signin")
  }

  const handleAboutUs = () => {
    router.push("/about")
  }

  const content = {
    en: {
      consultation: "Record and transcribe patient consultations",
      summary: "AI-generated patient summaries and insights",
      scheduling: "Intelligent appointment scheduling and management",
      insights: "Latest medical news and personalized insights",
      settings: "Settings",
      language: "Language",
      logout: "Log Out",
      about: "About Us",
      dashboard: "Dashboard",
    },
    fr: {
      consultation: "Enregistrer et transcrire les consultations patients",
      summary: "Résumés patients générés par IA et insights",
      scheduling: "Planification intelligente de rendez-vous et gestion",
      insights: "Dernières nouvelles médicales et insights personnalisés",
      settings: "Paramètres",
      language: "Langue",
      logout: "Se Déconnecter",
      about: "À Propos",
      dashboard: "Tableau de Bord",
    },
  }

  const currentContent = content[language as keyof typeof content] || content.en

  const getProfileImageUrl = (email: string) => {
    if (!email) return null
    const hash = btoa(email.toLowerCase().trim())
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 32)
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=32`
  }

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative flex flex-col bg-slate-900 border-r border-slate-800"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                key="logo-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center space-x-2"
              >
                <div className="h-8 w-8 rounded-lg overflow-hidden">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MedFlow%20Logo%20Design-wjgTe8rUhAslXrcAuqCg5zzWv3I7nC.png"
                    alt="MedFlow Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-lg font-semibold text-white">MedFlow</span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-8 w-8 rounded-lg overflow-hidden"
              >
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MedFlow%20Logo%20Design-wjgTe8rUhAslXrcAuqCg5zzWv3I7nC.png"
                  alt="MedFlow Logo"
                  className="w-full h-full object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link key={item.id} href={item.href}>
                <div className="relative">
                  {/* Active indicator pill */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-lg bg-teal-400/10 border border-teal-400/20"
                      />
                    )}
                  </AnimatePresence>

                  <div
                    className={cn(
                      "relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "text-teal-400" : "text-slate-400 hover:text-white hover:bg-slate-800/50",
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <AnimatePresence mode="wait">
                      {sidebarOpen && (
                        <motion.span
                          key="nav-text"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="ml-3 truncate"
                        >
                          {item.name[language as keyof typeof item.name]}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
              {currentUser?.email ? (
                <img
                  src={getProfileImageUrl(currentUser.email) || "/placeholder.svg"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullName || "Doctor")}&background=334155&color=fff&size=32`
                  }}
                />
              ) : (
                <div className="w-full h-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">
                  {currentUser?.fullName?.charAt(0) || "D"}
                </div>
              )}
            </div>
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.div
                  key="user-info"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="ml-3"
                >
                  <p className="text-sm font-medium text-white">Dr. {currentUser?.fullName || "Doctor"}</p>
                  <p className="text-xs text-slate-400">{currentUser?.specialization || "Specialist"}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-900/50 border-b border-slate-800 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {currentPage?.name[language as keyof typeof currentPage.name] || currentContent.dashboard}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {currentPage?.name.en === "Consultation Capture" && currentContent.consultation}
                {currentPage?.name.en === "Patient Summary" && currentContent.summary}
                {currentPage?.name.en === "Smart Scheduling" && currentContent.scheduling}
                {currentPage?.name.en === "Medical Insights" && currentContent.insights}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {currentContent.settings}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700" align="end">
                  <DropdownMenuItem
                    className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                    onClick={toggleLanguage}
                  >
                    <Languages className="h-4 w-4 mr-2" />
                    {currentContent.language} ({language === "en" ? "Français" : "English"})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                    onClick={handleAboutUs}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    {currentContent.about}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-400 hover:bg-red-900/20 cursor-pointer" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {currentContent.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-auto bg-slate-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
