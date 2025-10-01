'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Zap, 
  Database, 
  Sparkles, 
  Globe, 
  Users, 
  ChevronRight,
  Calendar,
  Target,
  TrendingUp,
  Shield,
  Bot,
  FileText,
  Search,
  Award,
  BarChart3
} from 'lucide-react'

interface RoadmapTask {
  id: string
  title: string
  description: string
  status: 'completed' | 'in_progress' | 'pending'
  effort: string
  priority: 'Critical' | 'High' | 'Medium'
  deliverables: string[]
}

interface RoadmapPhase {
  id: string
  title: string
  subtitle: string
  description: string
  duration: string
  effort: string
  status: 'completed' | 'in_progress' | 'pending'
  progress: number
  icon: React.ReactNode
  color: {
    primary: string
    secondary: string
    gradient: string
    border: string
    bg: string
  }
  tasks: RoadmapTask[]
  keyFeatures: string[]
  metrics: {
    label: string
    value: string
    icon: React.ReactNode
  }[]
}

const phases: RoadmapPhase[] = [
  {
    id: 'phase-1',
    title: 'Phase 1: Foundation',
    subtitle: 'Months 1-3',
    description: 'Core platform infrastructure with Next.js, authentication, basic search, and billing integration.',
    duration: '10-12 weeks',
    effort: '664-864 hours',
    status: 'completed',
    progress: 95,
    icon: <Database className="w-6 h-6" />,
    color: {
      primary: 'text-green-400',
      secondary: 'text-green-300',
      gradient: 'from-green-500 to-emerald-600',
      border: 'border-green-500/50',
      bg: 'from-green-500/10 to-emerald-500/10'
    },
    tasks: [
      {
        id: '1.1',
        title: 'Next.js Project Setup',
        description: 'TypeScript, Tailwind CSS, ESLint configuration',
        status: 'completed',
        effort: '16 hours',
        priority: 'Critical',
        deliverables: ['Next.js 14 with App Router', 'TypeScript strict mode', 'Design system']
      },
      {
        id: '1.2',
        title: 'Database & Authentication',
        description: 'Supabase, Prisma, Clerk integration',
        status: 'completed',
        effort: '44 hours',
        priority: 'Critical',
        deliverables: ['Multi-tenant database', 'User management', 'Row-level security']
      },
      {
        id: '1.5',
        title: 'Basic Opportunity Search',
        description: 'Search interface with advanced filters',
        status: 'completed',
        effort: '28 hours',
        priority: 'High',
        deliverables: ['Search API', 'Advanced filters', 'Match scoring v1']
      },
      {
        id: '1.10',
        title: 'Billing Integration',
        description: 'Stripe integration with subscription management',
        status: 'completed',
        effort: '24 hours',
        priority: 'Medium',
        deliverables: ['4 pricing plans', 'Usage tracking', 'Payment processing']
      }
    ],
    keyFeatures: [
      'Multi-tenant architecture',
      'Advanced opportunity search',
      'Basic MatchScore algorithm',
      'Stripe billing integration',
      'Redis caching (94% hit rate)',
      'Comprehensive API documentation',
      'Security & validation framework'
    ],
    metrics: [
      { label: 'API Endpoints', value: '51+', icon: <BarChart3 className="w-4 h-4" /> },
      { label: 'Cache Hit Rate', value: '94%', icon: <Zap className="w-4 h-4" /> },
      { label: 'Test Coverage', value: '80%+', icon: <Shield className="w-4 h-4" /> }
    ]
  },
  {
    id: 'phase-2',
    title: 'Phase 2: AI Integration',
    subtitle: 'Months 4-6',
    description: 'Multi-provider AI architecture, document processing, and enhanced MatchScore system.',
    duration: '12-14 weeks',
    effort: '800-1000 hours',
    status: 'in_progress',
    progress: 65,
    icon: <Bot className="w-6 h-6" />,
    color: {
      primary: 'text-blue-400',
      secondary: 'text-blue-300',
      gradient: 'from-blue-500 to-purple-600',
      border: 'border-blue-500/50',
      bg: 'from-blue-500/10 to-purple-500/10'
    },
    tasks: [
      {
        id: '2.1',
        title: 'Multi-Provider AI Architecture',
        description: 'OpenAI, Anthropic, Google AI integration',
        status: 'completed',
        effort: '40 hours',
        priority: 'Critical',
        deliverables: ['AI service manager', 'Cost optimization', 'Fallback strategies']
      },
      {
        id: '2.1.1',
        title: 'Hybrid Vercel AI SDK Integration',
        description: 'Enhanced React hooks with streaming',
        status: 'completed',
        effort: '76-96 hours',
        priority: 'High',
        deliverables: ['Streaming optimization', 'Enhanced chat hooks', 'Intelligent routing']
      },
      {
        id: '2.4',
        title: 'Document Processing Pipeline',
        description: 'Multi-format file upload and text extraction',
        status: 'completed',
        effort: '28 hours',
        priority: 'High',
        deliverables: ['PDF/Word/Excel support', 'OCR engine', 'Security validation']
      },
      {
        id: '2.6',
        title: 'Vector Database Integration',
        description: 'Pinecone & pgvector hybrid search',
        status: 'completed',
        effort: '24 hours',
        priority: 'High',
        deliverables: ['Hybrid search', 'Index management', 'Fallback system']
      }
    ],
    keyFeatures: [
      '12+ AI models integrated',
      'Multi-format document processing',
      'Vector search with hybrid approach',
      'Real-time streaming responses',
      'Document chunking & embeddings',
      'Cost optimization routing',
      'Circuit breaker patterns'
    ],
    metrics: [
      { label: 'AI Models', value: '12+', icon: <Sparkles className="w-4 h-4" /> },
      { label: 'File Formats', value: '10+', icon: <FileText className="w-4 h-4" /> },
      { label: 'Response Time', value: '<500ms', icon: <Zap className="w-4 h-4" /> }
    ]
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Government Integration',
    subtitle: 'Months 7-9',
    description: 'Real-time government data feeds, SAM.gov integration, and advanced analytics.',
    duration: '12-14 weeks',
    effort: '700-900 hours',
    status: 'pending',
    progress: 0,
    icon: <Globe className="w-6 h-6" />,
    color: {
      primary: 'text-purple-400',
      secondary: 'text-purple-300',
      gradient: 'from-purple-500 to-pink-600',
      border: 'border-purple-500/50',
      bg: 'from-purple-500/10 to-pink-500/10'
    },
    tasks: [
      {
        id: '3.1',
        title: 'HigherGov API Integration',
        description: 'Real-time opportunity data synchronization',
        status: 'pending',
        effort: '32 hours',
        priority: 'Critical',
        deliverables: ['API client', 'Data transformation', 'Webhook integration']
      },
      {
        id: '3.3',
        title: 'SAM.gov Integration',
        description: 'Entity validation and profile enhancement',
        status: 'pending',
        effort: '28 hours',
        priority: 'High',
        deliverables: ['OAuth flow', 'UEI validation', 'Profile sync']
      },
      {
        id: '3.5',
        title: 'Data Quality Engine',
        description: 'Deduplication and enrichment pipeline',
        status: 'pending',
        effort: '32 hours',
        priority: 'High',
        deliverables: ['Fuzzy matching', 'Quality metrics', 'Manual review interface']
      },
      {
        id: '3.8',
        title: 'Analytics Dashboard',
        description: 'Comprehensive API and business analytics',
        status: 'pending',
        effort: '32 hours',
        priority: 'High',
        deliverables: ['Real-time dashboard', 'Cost analytics', 'Performance monitoring']
      }
    ],
    keyFeatures: [
      'Real-time government data feeds',
      'SAM.gov entity validation',
      'Advanced deduplication engine',
      'Market intelligence analytics',
      'Competition tracking',
      'Agency spending patterns',
      'Win rate analytics'
    ],
    metrics: [
      { label: 'Opportunities', value: '100k+', icon: <Search className="w-4 h-4" /> },
      { label: 'Data Quality', value: '95%+', icon: <Award className="w-4 h-4" /> },
      { label: 'Sync Frequency', value: '15min', icon: <Clock className="w-4 h-4" /> }
    ]
  },
  {
    id: 'phase-4',
    title: 'Phase 4: Enterprise Features',
    subtitle: 'Months 10-12',
    description: 'Team collaboration, integrations, security hardening, and production launch.',
    duration: '12-14 weeks',
    effort: '600-800 hours',
    status: 'pending',
    progress: 0,
    icon: <Users className="w-6 h-6" />,
    color: {
      primary: 'text-orange-400',
      secondary: 'text-orange-300',
      gradient: 'from-orange-500 to-red-600',
      border: 'border-orange-500/50',
      bg: 'from-orange-500/10 to-red-500/10'
    },
    tasks: [
      {
        id: '4.1',
        title: 'Team Collaboration',
        description: 'Kanban boards and real-time collaboration',
        status: 'pending',
        effort: '60 hours',
        priority: 'High',
        deliverables: ['Pipeline management', 'WebSocket infrastructure', 'Activity feeds']
      },
      {
        id: '4.3',
        title: 'Email & CRM Integration',
        description: 'Gmail, Outlook, HubSpot, Salesforce',
        status: 'pending',
        effort: '52 hours',
        priority: 'High',
        deliverables: ['Email templates', 'Send tracking', 'Data synchronization']
      },
      {
        id: '4.5',
        title: 'SOC 2 Compliance',
        description: 'Security controls and audit preparation',
        status: 'pending',
        effort: '36 hours',
        priority: 'Critical',
        deliverables: ['Security controls', 'Audit logging', 'Compliance documentation']
      },
      {
        id: '4.9',
        title: 'Production Launch',
        description: 'Deployment, monitoring, and support',
        status: 'pending',
        effort: '48 hours',
        priority: 'Critical',
        deliverables: ['CI/CD pipeline', 'Monitoring setup', 'Launch communication']
      }
    ],
    keyFeatures: [
      'Multi-user collaboration',
      'CRM integrations',
      'SSO & multi-factor auth',
      'Horizontal scaling',
      'Advanced monitoring',
      'SOC 2 compliance',
      'Production deployment'
    ],
    metrics: [
      { label: 'Uptime SLA', value: '99.9%', icon: <Shield className="w-4 h-4" /> },
      { label: 'Team Size', value: 'Unlimited', icon: <Users className="w-4 h-4" /> },
      { label: 'Integrations', value: '20+', icon: <Globe className="w-4 h-4" /> }
    ]
  }
]

export function InteractiveRoadmap() {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const getStatusIcon = (status: RoadmapPhase['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
      case 'pending':
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getTaskStatusIcon = (status: RoadmapTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
      case 'pending':
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: RoadmapTask['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-400 bg-red-400/10 border-red-400/20'
      case 'High':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'Medium':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    }
  }

  return (
    <section className="relative py-32 px-6" id="roadmap">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium mb-6">
            <Target className="w-4 h-4 mr-2 text-yellow-400" />
            Development Roadmap
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Building the Future of
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Government Contracting
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our comprehensive roadmap shows how we&apos;re transforming government contracting with AI, real-time data, and enterprise-grade features.
          </p>
        </div>

        {/* Phase Timeline */}
        <div className="relative mb-16">
          {/* Timeline line */}
          <div className="absolute top-20 left-8 right-8 h-0.5 bg-gradient-to-r from-green-500 via-blue-500 via-purple-500 to-orange-500 opacity-30"></div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {phases.map((phase, index) => (
              <motion.div
                key={phase.id}
                className={`group relative cursor-pointer transition-all duration-300 ${
                  selectedPhase === phase.id ? 'scale-105' : 'hover:scale-105'
                }`}
                onClick={() => setSelectedPhase(selectedPhase === phase.id ? null : phase.id)}
                whileHover={{ y: -10 }}
              >
                <div className={`relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border ${phase.color.border} rounded-3xl p-6 h-full`}>
                  {/* Progress indicator */}
                  <div className="absolute top-4 right-4">
                    {getStatusIcon(phase.status)}
                  </div>

                  {/* Icon */}
                  <div className={`w-12 h-12 bg-gradient-to-r ${phase.color.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <div className="text-white">
                      {phase.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{phase.title}</h3>
                      <p className={`text-sm font-medium ${phase.color.primary} mb-2`}>{phase.subtitle}</p>
                      <p className="text-gray-300 text-sm leading-relaxed">{phase.description}</p>
                    </div>

                    {/* Progress bar */}
                    {phase.status !== 'pending' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Progress</span>
                          <span className={phase.color.primary}>{phase.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div
                            className={`bg-gradient-to-r ${phase.color.gradient} h-2 rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${phase.progress}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="grid grid-cols-1 gap-2">
                      {phase.metrics.slice(0, 1).map((metric, metricIndex) => (
                        <div key={metricIndex} className="flex items-center text-xs">
                          <div className={phase.color.primary}>
                            {metric.icon}
                          </div>
                          <span className="text-gray-400 ml-2">{metric.label}:</span>
                          <span className={`ml-1 font-medium ${phase.color.primary}`}>{metric.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Expand indicator */}
                    <div className="flex items-center justify-center pt-2">
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selectedPhase === phase.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Detailed Phase View */}
        <AnimatePresence>
          {selectedPhase && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-16"
            >
              {phases
                .filter(phase => phase.id === selectedPhase)
                .map(phase => (
                  <div key={phase.id} className={`bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border ${phase.color.border} rounded-3xl p-8`}>
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <div className={`w-16 h-16 bg-gradient-to-r ${phase.color.gradient} rounded-2xl flex items-center justify-center mr-4`}>
                          <div className="text-white">
                            {phase.icon}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white">{phase.title}</h3>
                          <p className={`text-lg ${phase.color.primary}`}>{phase.subtitle}</p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <div className="flex items-center mb-2">
                            <Calendar className="w-4 h-4 text-blue-400 mr-2" />
                            <span className="text-sm text-gray-400">Duration</span>
                          </div>
                          <span className="font-medium text-white">{phase.duration}</span>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <div className="flex items-center mb-2">
                            <TrendingUp className="w-4 h-4 text-green-400 mr-2" />
                            <span className="text-sm text-gray-400">Effort</span>
                          </div>
                          <span className="font-medium text-white">{phase.effort}</span>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <div className="flex items-center mb-2">
                            <Target className="w-4 h-4 text-purple-400 mr-2" />
                            <span className="text-sm text-gray-400">Progress</span>
                          </div>
                          <span className={`font-medium ${phase.color.primary}`}>{phase.progress}%</span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        {phase.metrics.map((metric, index) => (
                          <div key={index} className="text-center bg-gray-800/30 rounded-xl p-4">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r ${phase.color.gradient} mb-2`}>
                              <div className="text-white">
                                {metric.icon}
                              </div>
                            </div>
                            <div className={`text-2xl font-bold ${phase.color.primary} mb-1`}>{metric.value}</div>
                            <div className="text-sm text-gray-400">{metric.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Key Features */}
                      <div className="mb-8">
                        <h4 className="text-xl font-bold text-white mb-4">Key Features</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {phase.keyFeatures.map((feature, index) => (
                            <div key={index} className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                              <span className="text-gray-300">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div>
                      <h4 className="text-xl font-bold text-white mb-6">Major Tasks</h4>
                      <div className="grid gap-4">
                        {phase.tasks.map((task) => (
                          <div key={task.id} className="border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-colors">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                            >
                              <div className="flex items-center">
                                {getTaskStatusIcon(task.status)}
                                <div className="ml-3">
                                  <h5 className="font-semibold text-white">Task {task.id}: {task.title}</h5>
                                  <p className="text-sm text-gray-400">{task.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                <span className="text-xs text-gray-500">{task.effort}</span>
                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedTask === task.id ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {expandedTask === task.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-4 pt-4 border-t border-gray-700/30"
                                >
                                  <h6 className="font-medium text-white mb-2">Deliverables:</h6>
                                  <ul className="space-y-1">
                                    {task.deliverables.map((deliverable, index) => (
                                      <li key={index} className="flex items-center text-sm text-gray-300">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                                        {deliverable}
                                      </li>
                                    ))}
                                  </ul>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overall Progress */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Overall Development Progress</h3>
            <p className="text-gray-400">We&apos;re building the most advanced AI platform for government contracting</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {phases.map((phase) => (
              <div key={phase.id} className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-r ${phase.color.gradient} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                  <div className="text-white">
                    {phase.icon}
                  </div>
                </div>
                <h4 className="font-semibold text-white mb-1">{phase.title.replace('Phase ', 'Phase ')}</h4>
                <div className={`text-2xl font-bold ${phase.color.primary} mb-1`}>
                  {phase.progress}%
                </div>
                <div className="text-xs text-gray-500 capitalize">{phase.status.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              {Math.round(phases.reduce((acc, phase) => acc + phase.progress, 0) / phases.length)}%
            </div>
            <div className="text-gray-400">Platform Complete</div>
          </div>
        </div>
      </div>
    </section>
  )
}