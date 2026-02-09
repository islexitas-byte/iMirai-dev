import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      title: "Sovereign Intelligence",
      description: "Deploy open-source LLMs directly within your infrastructure. Your data processes locally, ensuring complete control and zero external exposure.",
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1v6m0 6v6m0-6h6m-6 0H6" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 7a5 5 0 100 10" strokeDasharray="2 2"/>
        </svg>
      ),
      stat: "100%",
      statLabel: "Data Privacy"
    },
    {
      title: "Intelligent Access Control",
      description: "Role-based document delivery and RAG management. Admins control knowledge distribution while users access information based on permissions.",
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
      ),
      stat: "Granular",
      statLabel: "Permission Control"
    },
    {
      title: "Data Harmonization Engine",
      description: "Transform unstructured data into pristine, classified formats. Extract attributes, references, and vendor details at scale with real-time progress tracking.",
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 7h16M4 12h16M4 17h16"/>
          <path d="M9 3v18m6-18v18" strokeDasharray="3 3" opacity="0.5"/>
        </svg>
      ),
      stat: "Unlimited",
      statLabel: "Record Processing"
    },
    {
      title: "Background Task Processing",
      description: "Time-intensive operations run autonomously. Harmonization, insights generation, and analysis execute without human oversight with email notifications.",
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <path d="M6 10h4m-4 4h8" strokeLinecap="round"/>
          <circle cx="17" cy="14" r="2"/>
          <path d="M17 12v4" strokeDasharray="1 1"/>
        </svg>
      ),
      stat: "Infinite",
      statLabel: "Task Capacity"
    }
  ];

  const capabilities = [
    {
      title: "Document Intelligence",
      description: "Parse, analyze, and extract insights from any document format. Generate summaries, identify key points, and detect trends automatically.",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="15" y2="17"/>
        </svg>
      )
    },
    {
      title: "Conversational Interface",
      description: "Natural language queries with instant responses. Create unlimited chat sessions with encrypted, persistent conversation history.",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          <path d="M8 10h8m-8 4h4" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: "Analytics & Visualization",
      description: "Dynamic charts, dashboards, and data representations. Transform raw data into actionable insights with automated visual analysis.",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18"/>
          <path d="M7 16l4-8 4 4 4-12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: "Enterprise Knowledge Base",
      description: "Admin-controlled RAG system for organization-wide knowledge distribution. Manage, update, and delete content with precision.",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
        </svg>
      )
    },
    {
      title: "Classification at Scale",
      description: "Automated attribute extraction, reference matching, and vendor detail compilation from unstructured sources without limitations.",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
      )
    },
    {
      title: "Real-Time Status Updates",
      description: "Track harmonization progress, task execution, and processing status in real-time with comprehensive monitoring dashboards.",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      )
    }
  ];

  const useCases = [
    {
      industry: "Manufacturing Excellence",
      challenge: "Material master data chaos across 50+ global facilities",
      result: "2M+ records harmonized in 48 hours",
      impact: "23% reduction in procurement costs"
    },
    {
      industry: "Energy & Utilities",
      challenge: "Vendor compliance documentation scattered across departments",
      result: "Centralized knowledge base deployed",
      impact: "70% faster audit preparation"
    },
    {
      industry: "Pharmaceutical Research",
      challenge: "Regulatory document analysis requiring weeks per submission",
      result: "Automated extraction pipeline",
      impact: "14 days to 2 days review cycle"
    }
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Deploy Your LLM",
      description: "Install open-source language models on your infrastructure. Complete control, zero external dependencies."
    },
    {
      step: "02",
      title: "Configure Access",
      description: "Set up role-based permissions and upload your organization's documents to the RAG system."
    },
    {
      step: "03",
      title: "Ask & Receive",
      description: "Users query in natural language. iMirai responds with permission-appropriate information instantly."
    },
    {
      step: "04",
      title: "Process at Scale",
      description: "Background tasks handle data harmonization, insights generation, and complex analysis autonomously."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #0f172a 1px, transparent 1px),
              linear-gradient(to bottom, #0f172a 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            transform: `translateY(${scrollY * 0.05}px) translateX(${scrollY * 0.02}px)`
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/iMirAI_LOGO_CO-Pilot 1.png" 
                alt="iMirai" 
                className="h-11 w-auto transition-transform hover:scale-105"
              />
              {/* <div className="hidden sm:block">
                <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                  iMirai
                </div>
                <div className="text-xs text-slate-500 tracking-wide">by PiLog Group</div>
              </div> */}
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-all duration-300 font-medium"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/signup')}
                className="px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-all duration-300 font-medium shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 hover:scale-105"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <span className="text-sm font-semibold text-slate-700">Enterprise AI · Zero Data Exposure · Infinite Scale</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-[1.1]" style={{ fontFamily: '"Urbanist", sans-serif' }}>
              <span className="block text-slate-900">AI-Powered Intelligence</span>
              <span className="block text-blue-600">
                Without Compromise
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Deploy open-source LLMs directly on your infrastructure. 
              <span className="text-slate-900 font-semibold"> Your data never leaves your servers.</span>
              <br className="hidden sm:block" />
              Complete privacy, unlimited processing, autonomous intelligence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button 
                onClick={() => navigate('/signup')}
                className="group w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-300 font-semibold text-lg shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:scale-105"
              >
                Start Free Trial
                <svg className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="group w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-all duration-300 font-semibold text-lg">
                <svg className="inline-block mr-2 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">ISO 27001 Certified</span>
              </div>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">SOC 2 Compliant</span>
              </div>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">GDPR Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="relative px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: '"Urbanist", sans-serif' }}>
              Sovereign AI Infrastructure
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Purpose-built for organizations that refuse to compromise on data sovereignty
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative p-8 rounded-2xl border border-slate-200 bg-white hover:shadow-2xl hover:shadow-blue-50 transition-all duration-500 hover:scale-[1.02] overflow-hidden ${
                  activeFeature === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
                style={{
                  animationDelay: `${index * 150}ms`,
                  animation: isVisible ? 'slideUp 0.8s ease-out forwards' : 'none',
                  opacity: isVisible ? 1 : 0
                }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                      {feature.title}
                    </h3>
                  </div>
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">
                      {feature.stat}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">{feature.statLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative px-6 lg:px-8 py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: '"Urbanist", sans-serif' }}>
              Simple Implementation, Powerful Results
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From deployment to production in four straightforward steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <div className="relative z-10 p-6 rounded-xl bg-white border border-slate-200 hover:shadow-xl hover:shadow-blue-50 hover:border-blue-200 transition-all duration-300 h-full group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="text-6xl font-bold text-slate-100 mb-4" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                    {item.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-blue-200 z-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="relative px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: '"Urbanist", sans-serif' }}>
              Comprehensive Capabilities
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to transform your enterprise intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((capability, index) => (
              <div
                key={index}
                className="group p-6 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideUp 0.6s ease-out forwards'
                }}
              >
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 inline-flex mb-4 group-hover:scale-110 transition-transform duration-300">
                  {capability.icon}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                  {capability.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative px-6 lg:px-8 py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: '"Urbanist", sans-serif' }}>
              Proven Impact Across Industries
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Real organizations achieving measurable results with iMirai
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="relative p-8 rounded-2xl bg-white border border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wide">
                    {useCase.industry}
                  </div>
                  <h3 className="text-lg font-bold mb-4 text-slate-900" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                    {useCase.challenge}
                  </h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className="text-slate-600 text-sm">{useCase.result}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-2xl font-bold text-blue-600">
                      {useCase.impact}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="relative px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: '"Urbanist", sans-serif' }}>
              Why Choose iMirai?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              The fundamental difference between cloud AI and sovereign intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-red-50/50 border-2 border-red-100">
              <h3 className="text-2xl font-bold mb-6 text-slate-900" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                Traditional Cloud AI
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span className="text-slate-700">Data transmitted to third-party APIs and servers</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span className="text-slate-700">Usage limits and conversation restrictions</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span className="text-slate-700">Potential compliance and sovereignty risks</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span className="text-slate-700">Unpredictable scaling costs and vendor lock-in</span>
                </li>
              </ul>
            </div>
            
            <div className="p-8 rounded-2xl bg-emerald-50/50 border-2 border-emerald-100">
              <h3 className="text-2xl font-bold mb-6 text-slate-900" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                iMirai Platform
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-slate-700">100% on-premise processing with zero external exposure</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-slate-700">Unlimited conversations, tasks, and processing capacity</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-slate-700">Full regulatory compliance and data sovereignty</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-slate-700">Predictable infrastructure costs and complete control</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative px-6 lg:px-8 py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 text-blue-400" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                28+
              </div>
              <div className="text-slate-300 font-medium">Years of Excellence</div>
              <div className="text-xs text-slate-500 mt-1">Established 1996</div>
            </div>
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 text-blue-400" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                ∞
              </div>
              <div className="text-slate-300 font-medium">Processing Capacity</div>
              <div className="text-xs text-slate-500 mt-1">No Limitations</div>
            </div>
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 text-blue-400" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                0%
              </div>
              <div className="text-slate-300 font-medium">Data Exposure</div>
              <div className="text-xs text-slate-500 mt-1">Complete Privacy</div>
            </div>
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 text-blue-400" style={{ fontFamily: '"Urbanist", sans-serif' }}>
                24/7
              </div>
              <div className="text-slate-300 font-medium">Enterprise Support</div>
              <div className="text-xs text-slate-500 mt-1">Global Coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: '"Urbanist", sans-serif' }}>
            Ready to Transform Your
            <br />
            <span className="text-blue-600">
              Enterprise Intelligence?
            </span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 leading-relaxed">
            Join industry leaders who trust PiLog Group for mission-critical data solutions.
            <br />Deploy sovereign AI infrastructure today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button 
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-10 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-300 font-semibold text-lg shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:scale-105"
            >
              Start Your Journey
            </button>
            <button className="w-full sm:w-auto px-10 py-4 rounded-xl border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-all duration-300 font-semibold text-lg">
              Schedule Demo
            </button>
          </div>

          <div className="text-sm text-slate-500">
            No credit card required · Deploy in minutes · Enterprise support included
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-200 bg-slate-50 px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/iMirAI-Logo1.png" 
                  alt="iMirai" 
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Enterprise AI without compromise.
                <br />Powered by PiLog Group.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>All systems operational</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-900" style={{ fontFamily: '"Urbanist", sans-serif' }}>Product</h4>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">API Reference</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-900" style={{ fontFamily: '"Urbanist", sans-serif' }}>Company</h4>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li><a href="https://www.piloggroup.com/about-us.php" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">About PiLog</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Partners</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">News</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-slate-900" style={{ fontFamily: '"Urbanist", sans-serif' }}>Legal</h4>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Compliance</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-sm text-slate-600">
              <div>© 2025 PiLog Group. All rights reserved.</div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  ISO Certified
                </span>
                <span className="hidden lg:block">•</span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  SAP Partner
                </span>
                <span className="hidden lg:block">•</span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Gartner Recognized
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800;900&display=swap');

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        * {
          scroll-behavior: smooth;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }
      `}</style>
    </div>
  );
}