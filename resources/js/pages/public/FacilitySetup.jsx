import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Mail, Phone, MapPin, User, Globe, CheckCircle,
  AlertCircle, FileText, Shield, Clock, Palette, Image,
  ArrowRight, Check, X, Info, Send, Settings
} from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function FacilitySetup() {
  const navigate = useNavigate();

  const requiredInfo = [
    {
      icon: Building2,
      title: 'Facility Basic Information',
      items: [
        { label: 'Facility Name', required: true },
        { label: 'Facility Address (Street, City, State, ZIP)', required: true },
        { label: 'Phone Number', required: true },
        { label: 'Email Address', required: true },
        { label: 'Subdomain (optional)', required: false, note: 'e.g., yourfacility.homelogic360.net' },
      ],
    },
    {
      icon: Building2,
      title: 'Branch Information',
      items: [
        { label: 'Branch Name', required: true, note: 'e.g., "Main Branch" or facility name' },
        { label: 'Branch Address (if different)', required: false },
      ],
    },
    {
      icon: User,
      title: 'Administrator Account Setup',
      items: [
        { label: 'Administrator Full Name', required: true },
        { label: 'Administrator Email (for login)', required: true, note: 'Must be unique' },
        { label: 'Administrator Role', required: true, note: 'Administrator, Manager, or Clinical Supervisor' },
        { label: 'Initial Password', required: true, note: 'Minimum 8 characters' },
      ],
    },
  ];

  const optionalInfo = [
    {
      icon: Palette,
      title: 'Branding & Customization',
      items: [
        { label: 'Facility Logo', note: 'PNG, JPG, or SVG (max 2MB)' },
        { label: 'Primary Color', note: 'Hex code (e.g., #1E3A5F)' },
        { label: 'Secondary Color', note: 'Hex code (e.g., #86EFAC)' },
        { label: 'Accent Color', note: 'Hex code (e.g., #FFFFFF)' },
        { label: 'Provider Code', note: 'If applicable' },
      ],
    },
    {
      icon: FileText,
      title: 'Additional Facility Details',
      items: [
        { label: 'Facility Type', note: 'e.g., Assisted Living, Memory Care, Adult Family Home' },
        { label: 'Number of Beds/Capacity' },
        { label: 'Years in Operation' },
      ],
    },
    {
      icon: Mail,
      title: 'Email Configuration',
      items: [
        { label: 'Email Service', note: 'Amazon SES (recommended) or SMTP' },
        { label: 'From Email Address', note: 'e.g., noreply@yourfacility.com' },
        { label: 'From Name', note: 'e.g., "Your Facility Name"' },
        { label: 'SMTP Details (if using SMTP)', note: 'Host, port, username, password' },
      ],
    },
  ];

  const modules = [
    'Assessments',
    'Medications',
    'Vitals',
    'Appointments',
    'Sleep Tracking',
    'Housekeeping',
    'Pharmacy',
    'Billing & Expenses',
    'Reports',
    'Incidents',
    'Check-In/Out',
    'Visitors',
    'Progress notes',
  ];

  const quickStartChecklist = [
    'Facility name',
    'Facility address',
    'Contact phone number',
    'Contact email address',
    'Branch name',
    'Administrator full name',
    'Administrator email',
    'Administrator role selection',
    'Initial password',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <PublicNavigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-primary-dark mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Facility Setup Information Request
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Thank you for choosing HomeLogic360! To get your facility set up and running, 
            we need the following information from you.
          </p>
        </div>

        {/* Quick Start Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-brand-primary-dark flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Start Checklist</h2>
          </div>
          <p className="text-gray-600 mb-6">
            <strong>Minimum Required to Begin:</strong> These are the essential items needed to create your facility account.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {quickStartChecklist.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Check className="w-5 h-5 text-brand-primary-dark flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Required Information */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-brand-primary-dark flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Required Information</h2>
          </div>

          <div className="grid md:grid-cols-1 gap-6">
            {requiredInfo.map((section, index) => {
              const Icon = section.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-brand-primary-dark p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-brand-primary-dark flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">{section.title}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          {item.required ? (
                            <Check className="w-5 h-5 text-brand-primary-dark flex-shrink-0 mt-0.5" />
                          ) : (
                            <Check className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className={`font-medium ${item.required ? 'text-gray-900' : 'text-gray-600'}`}>
                              {item.label}
                              {item.required && <span className="text-brand-primary-dark ml-1">*</span>}
                            </span>
                            {item.note && (
                              <p className="text-sm text-gray-500 mt-1">{item.note}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Information */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center">
              <Info className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Optional Information (Recommended)</h2>
          </div>

          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
            {optionalInfo.map((section, index) => {
              const Icon = section.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gray-600 p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">{section.title}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-medium text-gray-700">{item.label}</span>
                            {item.note && (
                              <p className="text-sm text-gray-500 mt-1">{item.note}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module Access */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-brand-primary-dark flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Module Access Preferences</h2>
          </div>
          <p className="text-gray-600 mb-6">
            After setup, you can enable/disable the following modules based on your needs. 
            All modules are enabled by default and can be customized after setup.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {modules.map((module, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Check className="w-4 h-4 text-brand-primary-dark flex-shrink-0" />
                <span className="text-sm text-gray-700">{module}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What Happens Next */}
        <div className="bg-brand-primary-dark rounded-2xl shadow-lg p-8 mb-12 text-white">
          <h2 className="text-2xl font-bold mb-6">What Happens Next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Information Submission</h3>
                <p className="text-brand-primary">
                  Submit this information via our registration form or send the completed form to our team.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Review & Approval</h3>
                <p className="text-brand-primary">
                  Our team will review your information (typically within 1-2 business days).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Account Creation</h3>
                <p className="text-brand-primary">
                  We'll create your facility, branch, and administrator account.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">Welcome Email</h3>
                <p className="text-brand-primary">
                  You'll receive login credentials and access instructions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 font-bold">
                5
              </div>
              <div>
                <h3 className="font-semibold mb-1">Initial Setup</h3>
                <p className="text-brand-primary">
                  Log in and begin adding residents, staff, and configuring your preferences.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={() => navigate('/register-facility')}
            className="w-full sm:w-auto bg-brand-primary-dark text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Register Your Facility
          </button>
          <button
            onClick={() => navigate('/contact')}
            className="w-full sm:w-auto bg-white text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Contact Us
          </button>
        </div>

        {/* Questions Section */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-brand-primary-dark" />
            <h2 className="text-2xl font-bold text-gray-900">Questions?</h2>
          </div>
          <p className="text-gray-600 mb-4">
            If you have any questions or need assistance filling out this form, please contact us:
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/contact')}
              className="text-brand-primary-dark hover:opacity-90 font-medium flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </button>
            <button
              onClick={() => navigate('/support')}
              className="text-brand-primary-dark hover:opacity-90 font-medium flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Visit Support Center
            </button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

