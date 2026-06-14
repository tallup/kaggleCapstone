import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Activity, Heart, Pill, Moon, ClipboardList,
  AlertCircle, Building2, Stethoscope, BarChart3, UserCheck,
  ShoppingCart, DollarSign, ArrowLeft
} from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function Features() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Resident Management',
      description: 'Comprehensive resident profiles with medical history, care plans, emergency contacts, and family information. Track resident status, room assignments, and care level changes.',
      benefits: [
        'Complete resident profiles and medical records',
        'Care plan management and updates',
        'Family and emergency contact tracking',
        'Room and bed assignment management',
        'Resident status tracking',
      ],
      color: 'from-brand-primary-dark to-brand-sky'
    },
    {
      icon: Pill,
      title: 'Medication Management',
      description: 'Track medication administration, schedules, and compliance with automated reminders. Manage medication inventory, orders, and deliveries.',
      benefits: [
        'Automated medication schedules (MAR)',
        'Medication administration tracking',
        'Compliance monitoring and alerts',
        'Pharmacy integration and ordering',
        'Medication history and reports',
      ],
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Heart,
      title: 'Vital Signs Monitoring',
      description: 'Record and track vital signs with customizable ranges and alert thresholds. Generate comprehensive reports and identify trends.',
      benefits: [
        'Blood pressure, pulse, temperature, O2 tracking',
        'Customizable normal/warning/critical ranges',
        'Automated alerts for abnormal readings',
        'Trend analysis and charts',
        'Historical data and reporting',
      ],
      color: 'from-red-500 to-rose-500'
    },
    {
      icon: Calendar,
      title: 'Appointment Scheduling',
      description: 'Schedule and manage healthcare provider appointments with automated reminders. Track appointment history and outcomes.',
      benefits: [
        'Healthcare provider directory',
        'Automated appointment reminders',
        'Appointment history tracking',
        'Calendar integration',
        'Outcome documentation',
      ],
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: ClipboardList,
      title: 'Assessments',
      description: 'Conduct comprehensive resident assessments with customizable forms and templates. Track assessment history and changes over time.',
      benefits: [
        'Customizable assessment forms',
        'Multiple assessment types',
        'Assessment history tracking',
        'Automated reminders',
        'Trend analysis and reporting',
      ],
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: Moon,
      title: 'Sleep Monitoring',
      description: 'Track sleep patterns and quality with detailed analytics and reports. Identify sleep issues and trends.',
      benefits: [
        'Daily sleep record tracking',
        'Sleep pattern analysis',
        'Monthly aggregations',
        '24-hour heatmap visualization',
        'Sleep quality reports',
      ],
      color: 'from-indigo-500 to-violet-500'
    },
    {
      icon: UserCheck,
      title: 'Check-In/Check-Out System',
      description: 'Track staff clock-ins, resident sign-outs, and visitor management with real-time monitoring and progress tracking.',
      benefits: [
        'Staff clock-in/out tracking',
        'Resident sign-out management',
        'Visitor check-in/out system',
        'Real-time dashboard monitoring',
        'Progress bars and time tracking',
      ],
      color: 'from-brand-sky to-brand-primary-dark'
    },
    {
      icon: Building2,
      title: 'Housekeeping',
      description: 'Manage cleaning schedules, tasks, and assignments with quality assurance tracking and reporting.',
      benefits: [
        'Cleaning task scheduling',
        'Area and task management',
        'Assignment tracking',
        'Quality assurance reports',
        'Completion tracking',
      ],
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: AlertCircle,
      title: 'Incident Reporting',
      description: 'Document and track incidents with detailed reporting and follow-up workflows. Ensure compliance and safety.',
      benefits: [
        'Comprehensive incident documentation',
        'Photo and attachment support',
        'Follow-up tracking',
        'Incident reports and analytics',
        'Compliance documentation',
      ],
      color: 'from-red-500 to-orange-500'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Generate comprehensive reports and analytics for compliance and decision-making. Visualize data with charts and graphs.',
      benefits: [
        'Custom report generation',
        'Interactive charts and graphs',
        'Data export (CSV, PDF)',
        'Scheduled report delivery',
        'Real-time dashboards',
      ],
      color: 'from-brand-primary-dark to-brand-sky'
    },
    {
      icon: ShoppingCart,
      title: 'Pharmacy Management',
      description: 'Manage medication inventory, orders, suppliers, and deliveries. Track medication stock levels and reorder points.',
      benefits: [
        'Medication inventory tracking',
        'Supplier management',
        'Order processing',
        'Delivery tracking',
        'Stock level monitoring',
      ],
      color: 'from-green-500 to-teal-500'
    },
    {
      icon: DollarSign,
      title: 'Billing & Expenses',
      description: 'Track expenses, generate invoices, and manage financial records. Categorize expenses and generate financial reports.',
      benefits: [
        'Expense tracking and categorization',
        'Invoice generation',
        'Financial reporting',
        'Budget management',
        'Payment tracking',
      ],
      color: 'from-emerald-500 to-green-500'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Hero Section with Image */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-brand-primary to-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Comprehensive Features</h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0">
                Everything you need to manage your care facility efficiently and provide exceptional care
              </p>
            </div>
            <div>
              <img
                src="/images/slides/slide-7-features-operations.png"
                alt="Streamline operations with every module you need"
                className="w-full rounded-2xl shadow-lg"
                loading="lazy"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-xl transition-all"
              >
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h2>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 mb-2">Key Benefits:</h3>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-start space-x-2 text-gray-600">
                        <span className="text-brand-sky mt-1">•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Care Showcase */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src="/images/slides/slide-5-features-care.png"
                alt="Resident management and medication tracking"
                className="w-full rounded-2xl shadow-lg"
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className="space-y-5">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Connecting Care, <span className="text-brand-sky">Simplifying Life</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                From resident profiles to medication tracking, every module is connected and works together seamlessly. Your staff can focus on care instead of paperwork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with Background Image */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/slides/slide-4-transform.png"
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/90 mb-8">
            Experience all these features with a free 14-day trial. No credit card required.
          </p>
          <button
            onClick={() => navigate('/register-facility')}
            className="bg-white text-brand-primary-dark px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}


