import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Activity, Heart, Pill, Moon, ClipboardList,
  AlertCircle, Building2, Stethoscope, BarChart3, Shield, Clock,
  CheckCircle, FileText, TrendingUp, Zap, Database, Settings,
  Mail, Lock, Bell, Server, UserCheck, MapPin, ShoppingCart,
  DollarSign, Bed, Sparkles, ArrowRight, Check
} from 'lucide-react';
import PublicNavigation from '../components/PublicNavigation';
import PublicFooter from '../components/PublicFooter';

export default function Welcome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Resident Management',
      description: 'Comprehensive resident profiles with medical history, care plans, and family contacts.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Pill,
      title: 'Medication Management',
      description: 'Track medication administration, schedules, and compliance with automated reminders.',
      color: 'from-blue-600 to-blue-500'
    },
    {
      icon: Heart,
      title: 'Vital Signs Monitoring',
      description: 'Record and track vital signs with customizable ranges and alert thresholds.',
      color: 'from-cyan-500 to-cyan-400'
    },
    {
      icon: Calendar,
      title: 'Appointment Scheduling',
      description: 'Schedule and manage healthcare provider appointments with automated reminders.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: ClipboardList,
      title: 'Assessments',
      description: 'Conduct comprehensive resident assessments with customizable forms and templates.',
      color: 'from-blue-600 to-cyan-500'
    },
    {
      icon: Moon,
      title: 'Sleep Monitoring',
      description: 'Track sleep patterns and quality with detailed analytics and reports.',
      color: 'from-cyan-600 to-blue-500'
    },
    {
      icon: UserCheck,
      title: 'Check-In/Check-Out System',
      description: 'Track staff clock-ins, resident sign-outs, and visitor management with real-time monitoring.',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: Building2,
      title: 'Housekeeping',
      description: 'Manage cleaning schedules, tasks, and assignments with quality assurance tracking.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: AlertCircle,
      title: 'Incident Reporting',
      description: 'Document and track incidents with detailed reporting and follow-up workflows.',
      color: 'from-blue-600 to-cyan-500'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Generate comprehensive reports and analytics for compliance and decision-making.',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: ShoppingCart,
      title: 'Pharmacy Management',
      description: 'Manage medication inventory, orders, suppliers, and deliveries.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: DollarSign,
      title: 'Billing & Expenses',
      description: 'Track expenses, generate invoices, and manage financial records.',
      color: 'from-cyan-600 to-blue-500'
    },
  ];

  const modules = [
    { name: 'Residents', icon: Users },
    { name: 'Medications', icon: Pill },
    { name: 'Vitals', icon: Heart },
    { name: 'Appointments', icon: Calendar },
    { name: 'Assessments', icon: ClipboardList },
    { name: 'Sleep Records', icon: Moon },
    { name: 'Housekeeping', icon: Building2 },
    { name: 'Reports', icon: BarChart3 },
    { name: 'Behaviors', icon: Activity },
    { name: 'Incidents', icon: AlertCircle },
    { name: 'Leave Requests', icon: Calendar },
    { name: 'Employee Documents', icon: FileText },
    { name: 'Grocery Status', icon: ShoppingCart },
    { name: 'Fire Drills', icon: AlertCircle },
    { name: 'Billing & Expenses', icon: DollarSign },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$99',
      period: '/month',
      description: 'Perfect for small care facilities',
      features: [
        'Up to 25 residents',
        'Basic medication tracking',
        'Vital signs monitoring',
        'Appointment scheduling',
        'Basic reporting',
        'Email support',
        'Mobile app access',
      ],
      popular: false,
      color: 'from-gray-500 to-gray-600'
    },
    {
      name: 'Professional',
      price: '$249',
      period: '/month',
      description: 'Ideal for medium-sized facilities',
      features: [
        'Up to 100 residents',
        'Full medication management',
        'Advanced vital signs tracking',
        'Comprehensive assessments',
        'Sleep monitoring',
        'Check-in/check-out system',
        'Housekeeping management',
        'Advanced analytics',
        'Priority email support',
        'Mobile app access',
        'API access',
      ],
      popular: true,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large facilities and multi-location organizations',
      features: [
        'Unlimited residents',
        'All Professional features',
        'Multi-facility management',
        'Custom integrations',
        'Dedicated account manager',
        '24/7 phone support',
        'Custom training',
        'White-label options',
        'Advanced security',
        'SLA guarantee',
        'Custom reporting',
      ],
      popular: false,
      color: 'from-blue-600 to-cyan-500'
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: 'HIPAA Compliant',
      description: 'Fully compliant with healthcare data protection regulations'
    },
    {
      icon: Zap,
      title: 'Real-Time Updates',
      description: 'Instant notifications and real-time data synchronization'
    },
    {
      icon: Database,
      title: 'Secure Cloud Storage',
      description: 'Your data is safely stored with automated backups'
    },
    {
      icon: Settings,
      title: 'Customizable',
      description: 'Tailor the system to match your facility\'s workflow'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen sm:h-screen flex items-center bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 py-20 sm:py-0">
        {/* Sophisticated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated Gradient Orbs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-400/30 rounded-full mix-blend-overlay filter blur-[100px] animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-400/30 rounded-full mix-blend-overlay filter blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full mix-blend-overlay filter blur-[120px] animate-blob animation-delay-4000"></div>
          
          {/* Geometric Patterns */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white/30 rotate-45"></div>
            <div className="absolute bottom-20 right-20 w-24 h-24 border-2 border-white/30 rotate-45"></div>
            <div className="absolute top-1/2 right-10 w-16 h-16 border-2 border-white/20 rotate-45"></div>
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left space-y-5">
              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1]">
                <span className="block">Comprehensive</span>
                <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
                  Care Facility
              </span>
                <span className="block text-white">Management</span>
            </h1>

              {/* Subheading */}
              <p className="text-lg sm:text-xl text-white/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Streamline operations, improve care quality, and ensure compliance with our all-in-one platform designed for assisted living facilities.
            </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <button
                  onClick={() => navigate('/register-facility')}
                  className="group relative bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-base hover:bg-gray-50 transition-all shadow-2xl hover:shadow-cyan-500/50 hover:scale-105 flex items-center justify-center space-x-2 overflow-hidden"
              >
                  <span className="relative z-10">Start Free Trial</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              </button>
              <button
                  onClick={() => navigate('/login')}
                  className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-6 py-3 rounded-xl font-bold text-base hover:bg-white/20 transition-all shadow-xl"
              >
                  Sign In
              </button>
              </div>

            </div>

            {/* Right Column - Sophisticated Visual */}
            <div className="hidden lg:block relative h-full flex items-center">
              <div className="relative w-full">
                {/* Main Dashboard Preview Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">Dashboard</div>
                        <div className="text-white/60 text-xs">Real-time Overview</div>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <Users className="w-5 h-5 text-white/60" />
                        <span className="text-xs text-white/40">+12%</span>
                      </div>
                      <div className="text-2xl font-bold text-white">10K+</div>
                      <div className="text-xs text-white/60 mt-1">Residents</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <Building2 className="w-5 h-5 text-white/60" />
                        <span className="text-xs text-white/40">+5%</span>
                      </div>
                      <div className="text-2xl font-bold text-white">100+</div>
                      <div className="text-xs text-white/60 mt-1">Facilities</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <Heart className="w-5 h-5 text-white/60" />
                        <span className="text-xs text-green-400">99.9%</span>
                      </div>
                      <div className="text-2xl font-bold text-white">Active</div>
                      <div className="text-xs text-white/60 mt-1">Uptime</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <Shield className="w-5 h-5 text-white/60" />
                        <span className="text-xs text-white/40">100%</span>
                      </div>
                      <div className="text-2xl font-bold text-white">Secure</div>
                      <div className="text-xs text-white/60 mt-1">HIPAA</div>
                    </div>
                  </div>
                  
                  {/* Activity Bar */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full w-3/4"></div>
                      </div>
                      <span className="text-xs text-white/60">75% Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A comprehensive suite of tools to manage every aspect of your care facility
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Complete Module Suite</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Access all the modules you need to run your facility efficiently
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {modules.map((module, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-center"
              >
                <module.icon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">{module.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose HomeLogic360?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your facility's needs. All plans include a 14-day free trial.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 border-2 ${
                  plan.popular
                    ? 'border-blue-500 shadow-2xl scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                } transition-all relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-600 ml-2">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Facility?</h2>
          <p className="text-xl text-white/90 mb-8">
            Join hundreds of care facilities already using HomeLogic360 to improve operations and care quality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register-facility')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/register-facility')}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-6000 {
          animation-delay: 6s;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

