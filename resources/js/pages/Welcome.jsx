import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Activity, Heart, Pill, Moon, ClipboardList,
  AlertCircle, Building2, Stethoscope, BarChart3, Shield, Clock,
  CheckCircle, FileText, TrendingUp, Zap, Database, Settings,
  Mail, Lock, Bell, Server, UserCheck, MapPin, ShoppingCart,
  DollarSign, Bed, Sparkles, ArrowRight, Check
} from 'lucide-react';

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
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Heart,
      title: 'Vital Signs Monitoring',
      description: 'Record and track vital signs with customizable ranges and alert thresholds.',
      color: 'from-red-500 to-rose-500'
    },
    {
      icon: Calendar,
      title: 'Appointment Scheduling',
      description: 'Schedule and manage healthcare provider appointments with automated reminders.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: ClipboardList,
      title: 'Assessments',
      description: 'Conduct comprehensive resident assessments with customizable forms and templates.',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: Moon,
      title: 'Sleep Monitoring',
      description: 'Track sleep patterns and quality with detailed analytics and reports.',
      color: 'from-indigo-500 to-violet-500'
    },
    {
      icon: UserCheck,
      title: 'Check-In/Check-Out System',
      description: 'Track staff clock-ins, resident sign-outs, and visitor management with real-time monitoring.',
      color: 'from-teal-500 to-cyan-500'
    },
    {
      icon: Building2,
      title: 'Housekeeping',
      description: 'Manage cleaning schedules, tasks, and assignments with quality assurance tracking.',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: AlertCircle,
      title: 'Incident Reporting',
      description: 'Document and track incidents with detailed reporting and follow-up workflows.',
      color: 'from-red-500 to-orange-500'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Generate comprehensive reports and analytics for compliance and decision-making.',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      icon: ShoppingCart,
      title: 'Pharmacy Management',
      description: 'Manage medication inventory, orders, suppliers, and deliveries.',
      color: 'from-green-500 to-teal-500'
    },
    {
      icon: DollarSign,
      title: 'Billing & Expenses',
      description: 'Track expenses, generate invoices, and manage financial records.',
      color: 'from-emerald-500 to-green-500'
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
      color: 'from-purple-500 to-pink-500'
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">HomeLogic360</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/app/login')}
                className="text-gray-700 hover:text-gray-900 px-4 py-2 text-sm font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/app/login')}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Comprehensive Care Facility
              <span className="block bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Streamline operations, improve care quality, and ensure compliance with our all-in-one
              platform designed specifically for assisted living and care facilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/app/login')}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/register-facility')}
                className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-gray-400 transition-all"
              >
                Register Facility
              </button>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
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
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/app/login')}
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
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of care facilities already using HomeLogic360 to improve operations and care quality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/app/login')}
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
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HomeLogic360</span>
              </div>
              <p className="text-sm">
                Comprehensive care facility management system for modern healthcare facilities.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/features" onClick={(e) => { e.preventDefault(); navigate('/features'); }} className="hover:text-white">Features</a></li>
                <li><a href="/pricing" onClick={(e) => { e.preventDefault(); navigate('/pricing'); }} className="hover:text-white">Pricing</a></li>
                <li><a href="/modules" onClick={(e) => { e.preventDefault(); navigate('/modules'); }} className="hover:text-white">Modules</a></li>
                <li><a href="/security" onClick={(e) => { e.preventDefault(); navigate('/security'); }} className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} className="hover:text-white">About</a></li>
                <li><a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }} className="hover:text-white">Contact</a></li>
                <li><a href="/support" onClick={(e) => { e.preventDefault(); navigate('/support'); }} className="hover:text-white">Support</a></li>
                <li><a href="/careers" onClick={(e) => { e.preventDefault(); navigate('/careers'); }} className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigate('/privacy-policy'); }} className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms-of-service" onClick={(e) => { e.preventDefault(); navigate('/terms-of-service'); }} className="hover:text-white">Terms of Service</a></li>
                <li><a href="/hipaa-compliance" onClick={(e) => { e.preventDefault(); navigate('/hipaa-compliance'); }} className="hover:text-white">HIPAA Compliance</a></li>
                <li><a href="/cookie-policy" onClick={(e) => { e.preventDefault(); navigate('/cookie-policy'); }} className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} HomeLogic360. All rights reserved.</p>
          </div>
        </div>
      </footer>

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
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

