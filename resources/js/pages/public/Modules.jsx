import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Pill, Heart, Calendar, ClipboardList, Moon, Building2,
  BarChart3, Activity, AlertCircle, FileText, ShoppingCart, DollarSign,
  Bed, ArrowLeft, Building2 as BuildingIcon
} from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function Modules() {
  const navigate = useNavigate();

  const modules = [
    {
      name: 'Residents',
      icon: Users,
      description: 'Comprehensive resident management with profiles, medical history, care plans, and family contacts.',
      features: ['Resident profiles', 'Medical history', 'Care plans', 'Family contacts', 'Room assignments']
    },
    {
      name: 'Medications',
      icon: Pill,
      description: 'Complete medication administration tracking with schedules, compliance monitoring, and inventory management.',
      features: ['Medication schedules (MAR)', 'Administration tracking', 'Compliance monitoring', 'Inventory management', 'Pharmacy integration']
    },
    {
      name: 'Vitals',
      icon: Heart,
      description: 'Track vital signs with customizable ranges, alerts, and comprehensive reporting.',
      features: ['BP, pulse, temp, O2 tracking', 'Custom ranges', 'Automated alerts', 'Trend analysis', 'Historical reports']
    },
    {
      name: 'Appointments',
      icon: Calendar,
      description: 'Schedule and manage healthcare provider appointments with automated reminders.',
      features: ['Provider directory', 'Appointment scheduling', 'Automated reminders', 'History tracking', 'Outcome documentation']
    },
    {
      name: 'Assessments',
      icon: ClipboardList,
      description: 'Conduct comprehensive resident assessments with customizable forms and templates.',
      features: ['Custom forms', 'Multiple assessment types', 'History tracking', 'Trend analysis', 'Automated reminders']
    },
    {
      name: 'Sleep Records',
      icon: Moon,
      description: 'Track sleep patterns and quality with detailed analytics and visualizations.',
      features: ['Daily sleep tracking', 'Pattern analysis', 'Monthly aggregations', '24-hour heatmaps', 'Quality reports']
    },
    {
      name: 'Housekeeping',
      icon: Building2,
      description: 'Manage cleaning schedules, tasks, and assignments with quality assurance tracking.',
      features: ['Task scheduling', 'Area management', 'Assignment tracking', 'Quality reports', 'Completion tracking']
    },
    {
      name: 'Reports',
      icon: BarChart3,
      description: 'Generate comprehensive reports and analytics for compliance and decision-making.',
      features: ['Custom reports', 'Interactive charts', 'Data export', 'Scheduled delivery', 'Real-time dashboards']
    },
    {
      name: 'Behaviors',
      icon: Activity,
      description: 'Track and document resident behaviors with categorization and trend analysis.',
      features: ['Behavior tracking', 'Category management', 'Trend analysis', 'Trigger identification', 'Intervention tracking']
    },
    {
      name: 'Incidents',
      icon: AlertCircle,
      description: 'Document and track incidents with detailed reporting and follow-up workflows.',
      features: ['Incident documentation', 'Photo attachments', 'Follow-up tracking', 'Compliance reports', 'Analytics']
    },
    {
      name: 'Leave Requests',
      icon: Calendar,
      description: 'Manage staff leave requests with approval workflows and calendar integration.',
      features: ['Request submission', 'Approval workflows', 'Calendar integration', 'History tracking', 'Reporting']
    },
    {
      name: 'Employee Documents',
      icon: FileText,
      description: 'Store and manage employee documents with secure access and expiration tracking.',
      features: ['Document storage', 'Secure access', 'Expiration tracking', 'Version control', 'Compliance management']
    },
    {
      name: 'Grocery Status',
      icon: ShoppingCart,
      description: 'Track grocery and supply status with inventory management and ordering.',
      features: ['Inventory tracking', 'Status monitoring', 'Order management', 'Supplier tracking', 'Reports']
    },
    {
      name: 'Fire Drills',
      icon: AlertCircle,
      description: 'Schedule and track fire drills with compliance reporting and documentation.',
      features: ['Drill scheduling', 'Attendance tracking', 'Compliance reporting', 'Documentation', 'History tracking']
    },
    {
      name: 'Billing & Expenses',
      icon: DollarSign,
      description: 'Track expenses, generate invoices, and manage financial records.',
      features: ['Expense tracking', 'Invoice generation', 'Financial reports', 'Budget management', 'Payment tracking']
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-gradient-to-br from-brand-primary to-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Complete Module Suite</h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Access all the modules you need to run your facility efficiently. Each module is designed to work seamlessly together.
          </p>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center mb-4">
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{module.name}</h3>
                <p className="text-gray-600 mb-4">{module.description}</p>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">Key Features:</h4>
                  <ul className="space-y-1">
                    {module.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="text-sm text-gray-600 flex items-start space-x-2">
                        <span className="text-brand-sky mt-1">•</span>
                        <span>{feature}</span>
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
      <section className="py-20 bg-gradient-to-r from-brand-primary-dark to-brand-sky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Access All Modules?</h2>
          <p className="text-xl text-brand-primary mb-8">
            Start your free trial and get access to all modules immediately.
          </p>
          <button
            onClick={() => navigate('/register-facility')}
            className="bg-white text-brand-primary-dark px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg"
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


