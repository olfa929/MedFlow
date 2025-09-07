"use client"

import { motion } from "framer-motion"
import { Mic, Bot, Calendar, Newspaper, ArrowRight, Clock, Users, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const workflows = [
  {
    title: "Consultation Capture",
    description: "Record and transcribe patient consultations with AI-powered analysis",
    icon: Mic,
    href: "/consultation",
    color: "from-teal-500 to-cyan-500",
    stats: "12 recordings today",
  },
  {
    title: "Patient Summary",
    description: "Generate comprehensive AI summaries from patient data and history",
    icon: Bot,
    href: "/summary",
    color: "from-blue-500 to-indigo-500",
    stats: "8 summaries generated",
  },
  {
    title: "Smart Scheduling",
    description: "AI-optimized appointment scheduling with automated patient communication",
    icon: Calendar,
    href: "/scheduling",
    color: "from-purple-500 to-pink-500",
    stats: "24 appointments this week",
  },
  {
    title: "Medical Insights",
    description: "Stay updated with latest medical research and AI-curated insights",
    icon: Newspaper,
    href: "/insights",
    color: "from-orange-500 to-red-500",
    stats: "15 new articles",
  },
]

const quickStats = [
  { label: "Active Patients", value: "247", icon: Users, change: "+12%" },
  { label: "Avg. Consultation Time", value: "18m", icon: Clock, change: "-8%" },
  { label: "Efficiency Score", value: "94%", icon: TrendingUp, change: "+5%" },
]

export default function DashboardHome() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, Dr. Smith</h1>
        <p className="text-slate-400">Here's your clinical dashboard overview for today</p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {quickStats.map((stat, index) => (
          <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  <p className="text-teal-400 text-sm mt-1">{stat.change} from last week</p>
                </div>
                <div className="p-3 bg-teal-500/10 rounded-lg">
                  <stat.icon className="h-6 w-6 text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Workflows Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-white mb-6">Choose Your Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((workflow, index) => (
            <motion.div
              key={workflow.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={workflow.href}>
                <Card className="bg-slate-800/50 border-slate-700 hover:border-teal-500/50 transition-all duration-300 cursor-pointer group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${workflow.color} bg-opacity-10`}>
                        <workflow.icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-teal-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-white group-hover:text-teal-400 transition-colors">
                      {workflow.title}
                    </CardTitle>
                    <CardDescription className="text-slate-400">{workflow.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{workflow.stats}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                      >
                        Start →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[
                {
                  action: "Consultation recorded",
                  patient: "Sarah Johnson",
                  time: "2 hours ago",
                  type: "consultation",
                },
                { action: "Summary generated", patient: "Michael Chen", time: "4 hours ago", type: "summary" },
                { action: "Appointment scheduled", patient: "Emma Davis", time: "6 hours ago", type: "scheduling" },
                {
                  action: "Insight reviewed",
                  patient: "Latest cardiology research",
                  time: "1 day ago",
                  type: "insights",
                },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm font-medium">{activity.action}</p>
                      <p className="text-slate-400 text-xs">{activity.patient}</p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
