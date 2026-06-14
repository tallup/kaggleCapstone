import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Shield, CheckCircle } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function HIPAACompliance() {
  const navigate = useNavigate();

  const safeguards = [
    {
      category: 'Administrative Safeguards',
      items: [
        'Security management processes',
        'Assigned security responsibility',
        'Workforce security',
        'Information access management',
        'Security awareness and training',
        'Security incident procedures',
        'Contingency plan',
        'Evaluation',
      ]
    },
    {
      category: 'Physical Safeguards',
      items: [
        'Facility access controls',
        'Workstation use',
        'Workstation security',
        'Device and media controls',
      ]
    },
    {
      category: 'Technical Safeguards',
      items: [
        'Access control',
        'Audit controls',
        'Integrity controls',
        'Transmission security',
        'Encryption of data in transit and at rest',
      ]
    },
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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">HIPAA Compliance</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            HomeLogic360 is fully committed to HIPAA compliance and protecting Protected Health Information (PHI).
          </p>
        </div>
      </section>

      {/* Compliance Overview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-lg mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Commitment</h2>
            <p className="text-lg text-gray-700 mb-4">
              As a Business Associate under HIPAA, HomeLogic360 is required to and committed to protecting Protected Health Information (PHI). We implement comprehensive administrative, physical, and technical safeguards to ensure the confidentiality, integrity, and availability of PHI.
            </p>
            <p className="text-lg text-gray-700">
              We execute Business Associate Agreements (BAA) with all customers who use our platform to store or process PHI, ensuring that we meet all HIPAA requirements and obligations.
            </p>
          </div>

          {/* Safeguards */}
          <div className="space-y-8">
            {safeguards.map((safeguard, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">{safeguard.category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {safeguard.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Information */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-brand-primary to-brand-primary rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Business Associate Agreement</h2>
            <p className="text-gray-700 mb-4">
              All customers using HomeLogic360 to store or process PHI must execute a Business Associate Agreement (BAA) with us. This agreement:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
              <li>Defines our responsibilities as a Business Associate</li>
              <li>Outlines permitted uses and disclosures of PHI</li>
              <li>Establishes security and breach notification requirements</li>
              <li>Ensures compliance with HIPAA regulations</li>
            </ul>
            <p className="text-gray-700">
              To request a BAA or learn more about our HIPAA compliance measures, please contact us at <strong>compliance@homelogic360.com</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-brand-primary-dark to-brand-sky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">HIPAA-Compliant Care Management</h2>
          <p className="text-xl text-brand-primary mb-8">
            Trust HomeLogic360 for secure, compliant care facility management.
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


