import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Book, MessageCircle, Video, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function Support() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: 'How do I get started with HomeLogic360?',
      answer: 'Getting started is easy! Sign up for a free 14-day trial, and you\'ll have full access to all features. Our onboarding team will help you set up your facility and train your staff.'
    },
    {
      question: 'What kind of training do you provide?',
      answer: 'We offer comprehensive training including live webinars, video tutorials, documentation, and one-on-one sessions. Enterprise customers receive dedicated training sessions.'
    },
    {
      question: 'How do I import my existing data?',
      answer: 'We provide data import templates and assistance to help you migrate your existing resident, staff, and medication data. Our support team can help with the migration process.'
    },
    {
      question: 'Can I customize the system for my facility?',
      answer: 'Yes! The system is highly customizable. You can configure assessment forms, vital ranges, medication schedules, and more. Enterprise customers can request custom features.'
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'You can export all your data at any time. We\'ll provide you with a complete data export in standard formats (CSV, JSON) before account closure.'
    },
    {
      question: 'Do you offer mobile apps?',
      answer: 'Yes! We offer mobile apps for iOS and Android that allow staff to access key features on the go, including medication administration, vital signs, and resident information.'
    },
  ];

  const supportResources = [
    {
      icon: Book,
      title: 'Documentation',
      description: 'Comprehensive guides and tutorials',
      link: '/documentation',
      onClick: () => navigate('/documentation')
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description: 'Step-by-step video guides',
      link: '#'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with our support team',
      link: '#'
    },
    {
      icon: FileText,
      title: 'Knowledge Base',
      description: 'Search our knowledge base',
      link: '#'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-gradient-to-br from-brand-primary to-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Support Center</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're here to help you succeed. Find answers, get help, and learn how to make the most of HomeLogic360.
          </p>
        </div>
      </section>

      {/* Support Resources */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Support Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supportResources.map((resource, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => resource.onClick ? resource.onClick() : window.open(resource.link, '_blank')}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center mb-4">
                  <resource.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{resource.title}</h3>
                <p className="text-gray-600">{resource.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg border border-gray-200"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-6 flex items-center justify-between text-left"
                >
                  <span className="text-lg font-semibold text-gray-900">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-20 bg-gradient-to-r from-brand-primary-dark to-brand-sky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Still Need Help?</h2>
          <p className="text-xl text-brand-primary mb-8">
            Our support team is available 24/7 to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/contact')}
              className="bg-white text-brand-primary-dark px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Contact Support
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}


