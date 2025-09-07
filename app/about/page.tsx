"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, Stethoscope, Brain, Calendar, BarChart3, Shield, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  const router = useRouter()
  const language = typeof window !== "undefined" ? localStorage.getItem("language") || "en" : "en"

  const content = {
    en: {
      title: "About MedFlow Pro",
      subtitle: "Your AI-Powered Clinical Companion",
      description:
        "MedFlow Pro is a comprehensive medical platform designed to streamline healthcare workflows and enhance patient care through advanced AI technology.",
      features: [
        {
          icon: Stethoscope,
          title: "Consultation Capture",
          description:
            "Record and transcribe patient consultations with real-time audio processing and intelligent documentation.",
        },
        {
          icon: Brain,
          title: "AI Patient Summaries",
          description:
            "Generate comprehensive patient summaries using advanced AI analysis of medical records and consultation data.",
        },
        {
          icon: Calendar,
          title: "Smart Scheduling",
          description:
            "Intelligent appointment scheduling with AI-powered suggestions and automated patient communication.",
        },
        {
          icon: BarChart3,
          title: "Medical Insights",
          description:
            "Stay updated with the latest medical research and insights tailored to your practice and specialization.",
        },
      ],
      benefits: [
        {
          icon: Shield,
          title: "Secure & Compliant",
          description: "HIPAA-compliant platform ensuring patient data privacy and security.",
        },
        {
          icon: Users,
          title: "Patient-Centered",
          description: "Designed to improve patient outcomes and enhance the doctor-patient relationship.",
        },
        {
          icon: Zap,
          title: "Efficient Workflows",
          description: "Streamline administrative tasks and focus more time on patient care.",
        },
      ],
      backButton: "Back to Dashboard",
    },
    fr: {
      title: "À Propos de MedFlow Pro",
      subtitle: "Votre Compagnon Clinique Alimenté par l'IA",
      description:
        "MedFlow Pro est une plateforme médicale complète conçue pour rationaliser les flux de travail de santé et améliorer les soins aux patients grâce à une technologie IA avancée.",
      features: [
        {
          icon: Stethoscope,
          title: "Capture de Consultation",
          description:
            "Enregistrez et transcrivez les consultations patients avec traitement audio en temps réel et documentation intelligente.",
        },
        {
          icon: Brain,
          title: "Résumés Patients IA",
          description:
            "Générez des résumés patients complets en utilisant l'analyse IA avancée des dossiers médicaux et données de consultation.",
        },
        {
          icon: Calendar,
          title: "Planification Intelligente",
          description:
            "Planification de rendez-vous intelligente avec suggestions alimentées par l'IA et communication patient automatisée.",
        },
        {
          icon: BarChart3,
          title: "Insights Médicaux",
          description:
            "Restez à jour avec les dernières recherches médicales et insights adaptés à votre pratique et spécialisation.",
        },
      ],
      benefits: [
        {
          icon: Shield,
          title: "Sécurisé et Conforme",
          description: "Plateforme conforme HIPAA garantissant la confidentialité et sécurité des données patients.",
        },
        {
          icon: Users,
          title: "Centré sur le Patient",
          description: "Conçu pour améliorer les résultats patients et renforcer la relation médecin-patient.",
        },
        {
          icon: Zap,
          title: "Flux de Travail Efficaces",
          description:
            "Rationalisez les tâches administratives et concentrez plus de temps sur les soins aux patients.",
        },
      ],
      backButton: "Retour au Tableau de Bord",
    },
  }

  const currentContent = content[language as keyof typeof content] || content.en

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentContent.backButton}
          </Button>
        </motion.div>

        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold text-white">{currentContent.title}</h1>
          <p className="text-xl text-teal-400">{currentContent.subtitle}</p>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">{currentContent.description}</p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {currentContent.features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-400/20 rounded-lg">
                      <feature.icon className="h-6 w-6 text-teal-400" />
                    </div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-white text-center">
            {language === "en" ? "Why Choose MedFlow Pro?" : "Pourquoi Choisir MedFlow Pro?"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {currentContent.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
              >
                <Card className="bg-slate-900/50 border-slate-800 text-center h-full">
                  <CardContent className="p-6">
                    <div className="p-3 bg-teal-400/20 rounded-full w-fit mx-auto mb-4">
                      <benefit.icon className="h-8 w-8 text-teal-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-slate-300 text-sm">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
