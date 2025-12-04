import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Target, Users, Award, Heart } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  const values = [
    {
      icon: Heart,
      title: 'Care First',
      description: 'We believe that technology should enhance, not replace, the human touch in caregiving.'
    },
    {
      icon: Target,
      title: 'Innovation',
      description: 'Continuously improving our platform to meet the evolving needs of care facilities.'
    },
    {
      icon: Users,
      title: 'Partnership',
      description: 'Working closely with facilities to understand their unique challenges and requirements.'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Committed to delivering the highest quality software and support services.'
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">About HomeLogic360</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Empowering care facilities with comprehensive management solutions
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-600 mb-4">
              HomeLogic360 was founded with a simple mission: to provide care facilities with the tools they need to deliver exceptional care while streamlining operations and ensuring compliance.
            </p>
            <p className="text-lg text-gray-600 mb-4">
              We understand that managing a care facility involves countless moving parts—from resident care and medication management to staff scheduling and regulatory compliance. Our comprehensive platform brings all these elements together in one intuitive system.
            </p>
            <p className="text-lg text-gray-600">
              By automating routine tasks and providing real-time insights, we help care facilities focus on what matters most: providing quality care to residents.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-blue-600 mb-2">100+</div>
              <div className="text-gray-600">Care Facilities</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-600 mb-2">10,000+</div>
              <div className="text-gray-600">Residents Managed</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Join Our Growing Community</h2>
          <p className="text-xl text-blue-100 mb-8">
            See why care facilities trust HomeLogic360 for their management needs.
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

