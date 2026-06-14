import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Sparkles, Check, ArrowLeft } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function Pricing() {
  const navigate = useNavigate();

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
        '14-day free trial',
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
        '14-day free trial',
      ],
      popular: true,
      color: 'from-brand-primary-dark to-brand-sky'
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
        'On-premise deployment option',
      ],
      popular: false,
      color: 'from-purple-500 to-pink-500'
    },
  ];

  const faqs = [
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, ACH transfers, and wire transfers for Enterprise plans.'
    },
    {
      question: 'Is there a setup fee?',
      answer: 'No setup fees for Starter and Professional plans. Enterprise plans may include setup fees depending on custom requirements.'
    },
    {
      question: 'Do you offer discounts for annual billing?',
      answer: 'Yes, we offer a 15% discount for annual billing on all plans.'
    },
    {
      question: 'What happens if I exceed my resident limit?',
      answer: 'We\'ll notify you when you\'re approaching your limit. You can upgrade your plan or contact us for custom pricing.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use enterprise-grade security, HIPAA-compliant infrastructure, and regular security audits.'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-gradient-to-br from-brand-primary to-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your facility's needs. All plans include a 14-day free trial with full access.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 border-2 ${
                  plan.popular
                    ? 'border-brand-sky shadow-2xl scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                } transition-all relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white px-4 py-1 rounded-full text-sm font-semibold">
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
                  onClick={() => navigate('/register-facility')}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white hover:opacity-90 shadow-lg'
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

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-brand-primary-dark to-brand-sky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-brand-primary mb-8">
            Start your free 14-day trial today. No credit card required.
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


