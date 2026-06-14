import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Database, Eye, CheckCircle, ArrowLeft, Building2 } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function Security() {
  const navigate = useNavigate();

  const securityFeatures = [
    {
      icon: Shield,
      title: 'HIPAA Compliance',
      description: 'Fully compliant with HIPAA regulations to protect patient health information (PHI).',
      details: [
        'Business Associate Agreements (BAA)',
        'Administrative, physical, and technical safeguards',
        'Regular compliance audits',
        'Employee training and certification',
        'Incident response procedures',
      ]
    },
    {
      icon: Lock,
      title: 'Data Encryption',
      description: 'All data is encrypted both in transit and at rest using industry-standard encryption.',
      details: [
        'TLS 1.3 encryption for data in transit',
        'AES-256 encryption for data at rest',
        'Encrypted database backups',
        'Secure API communications',
        'End-to-end encryption for sensitive data',
      ]
    },
    {
      icon: Database,
      title: 'Secure Infrastructure',
      description: 'Enterprise-grade infrastructure with redundant systems and automated backups.',
      details: [
        '99.9% uptime SLA',
        'Automated daily backups',
        'Redundant data centers',
        'Disaster recovery procedures',
        '24/7 infrastructure monitoring',
      ]
    },
    {
      icon: Eye,
      title: 'Access Controls',
      description: 'Granular role-based access controls to ensure users only access what they need.',
      details: [
        'Role-based permissions',
        'Multi-factor authentication (MFA)',
        'Single Sign-On (SSO) support',
        'Session management',
        'Audit logs for all actions',
      ]
    },
    {
      icon: CheckCircle,
      title: 'Regular Security Audits',
      description: 'Regular third-party security audits and penetration testing to identify vulnerabilities.',
      details: [
        'Annual security audits',
        'Penetration testing',
        'Vulnerability assessments',
        'Compliance certifications',
        'Security updates and patches',
      ]
    },
  ];

  const complianceStandards = [
    'HIPAA (Health Insurance Portability and Accountability Act)',
    'HITECH Act compliance',
    'SOC 2 Type II certified',
    'GDPR compliant (for international users)',
    'State-specific healthcare regulations',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-gradient-to-br from-brand-primary to-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Security & Compliance</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your data security is our top priority. We use enterprise-grade security measures to protect your sensitive information.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-8 text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-primary-dark" />
              HIPAA-aware data protection
            </span>
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-primary-dark" />
              Secure cloud hosting
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-primary-dark" />
              Encrypted data transmission
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-brand-primary-dark" />
              Backup & recovery
            </span>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h2>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start space-x-2 text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Standards */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Compliance Standards</h2>
          <div className="bg-gradient-to-br from-brand-primary to-brand-primary rounded-xl p-8">
            <ul className="space-y-4">
              {complianceStandards.map((standard, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-lg text-gray-700">{standard}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-brand-primary-dark to-brand-sky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Your Data is Safe With Us</h2>
          <p className="text-xl text-brand-primary mb-8">
            Experience enterprise-grade security with a free 14-day trial.
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


