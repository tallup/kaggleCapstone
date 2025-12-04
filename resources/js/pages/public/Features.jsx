import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Activity, Heart, Pill, Moon, ClipboardList,
  AlertCircle, Building2, Stethoscope, BarChart3, UserCheck,
  ShoppingCart, DollarSign, ArrowLeft
} from 'lucide-react';

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
      color: 'from-blue-500 to-cyan-500'
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
      color: 'from-teal-500 to-cyan-500'
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
      color: 'from-blue-500 to-indigo-500'
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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-3 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">HomeLogic360</span>
            </div>
            <button
              onClick={() => navigate('/app/login')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Comprehensive Features</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to manage your care facility efficiently and provide exceptional care
          </p>
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
                        <span className="text-blue-500 mt-1">•</span>
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Experience all these features with a free 14-day trial. No credit card required.
          </p>
          <button
            onClick={() => navigate('/app/login')}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg"
          >
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}

