"use client"

import { motion } from "framer-motion"
import { Stethoscope, Calendar, MessageSquare, ArrowRight, Settings, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"



const features = [
  {
    icon: Stethoscope,
    title: "Consultation Capture",
    description:
      "AI-powered voice recording and transcription for seamless patient documentation during consultations.",
  },
  {
    icon: MessageSquare,
    title: "AI Patient Summaries",
    description: "Intelligent analysis of patient data to generate comprehensive, actionable medical summaries.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Automated appointment scheduling with AI-suggested optimal time slots and patient notifications.",
  },
  {
    icon: ArrowRight,
    title: "Daily Medical Insights",
    description: "Curated medical news, research updates, and personalized insights to enhance your practice.",
  },
]

export default function HomePage() {
  const router = useRouter()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleGetStarted = () => {
    router.push("/auth/signin")
  }

  const backgroundOpacity = Math.max(0, 1 - scrollY / 800)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <nav className="fixed top-0 right-0 z-50 p-6">
        <div className="flex gap-4">
          <Button
            variant="ghost"
            className="text-white hover:text-teal-400 hover:bg-slate-800/50"
            onClick={() => router.push("/about")}
          >
            About Us
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:text-teal-400 hover:bg-slate-800/50"
            onClick={() => router.push("/auth/signin")}
          >
            Sign In
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:text-teal-400 hover:bg-slate-800/50"
            onClick={() => router.push("/auth/signup")}
          >
            Sign Up
          </Button>
          <Button variant="ghost" className="text-white hover:text-teal-400 hover:bg-slate-800/50">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="ghost" className="text-white hover:text-teal-400 hover:bg-slate-800/50">
            <Phone className="h-4 w-4 mr-2" />
            Contact Us
          </Button>
        </div>
      </nav>

      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bien%20choisir%20son%20m%C3%A9decin%20traitant%20peut%20vous%20sauver%20la%20vie%2C%20selon%20une%20%C3%A9tude.jpg-XldsAag7XIyg0TZsMkbbdSdjHWZHxT.jpeg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: backgroundOpacity,
        }}
      />

      <div className="fixed inset-0 z-5 bg-slate-900/60" style={{ opacity: backgroundOpacity }} />

      {/* Hero Section */}
      <section className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <motion.div className="mx-auto max-w-4xl pt-20" initial="initial" animate="animate" variants={fadeInUp}>
            <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl lg:text-8xl whitespace-nowrap">
              Welcome to MedFlow
            </h1>
            <p className="mb-8 text-xl text-slate-300 md:text-2xl">Your AI-Powered Clinical Companion</p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-teal-400 to-sky-300 text-slate-900 hover:from-teal-300 hover:to-sky-200 px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 bg-slate-900/80 py-24 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <motion.div
            className="mx-auto max-w-6xl"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div className="mb-16 text-center" variants={staggerItem}>
              <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">Revolutionize Your Practice</h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-400">
                Comprehensive AI-powered tools designed specifically for modern healthcare professionals
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <motion.div key={feature.title} variants={staggerItem}>
                  <Card className="group h-full bg-slate-800/50 border-slate-700 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/70 hover:border-teal-400/50 hover:scale-105">
                    <CardContent className="p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-400/10 text-teal-400 transition-colors group-hover:bg-teal-400/20">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
                      <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative z-10 bg-slate-950 py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="mb-4 text-3xl font-bold text-white">Ready to Transform Your Practice?</h3>
            <p className="mb-8 text-lg text-slate-400">
              Join thousands of healthcare professionals already using MedFlow
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-teal-400 to-sky-300 text-slate-900 hover:from-teal-300 hover:to-sky-200 px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105"
              onClick={handleGetStarted}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
