import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Users, Award, Heart, Shield, Zap, TrendingUp,
  Building2, CheckCircle, Clock, Globe, BarChart3, Star, ArrowRight
} from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function About() {
  const navigate = useNavigate();

  const values = [
    {
      icon: Heart,
      title: 'Care First',
      description: 'We believe that technology should enhance, not replace, the human touch in caregiving. Every feature we build is designed with the resident\'s well-being at the center.',
      gradient: 'from-brand-primary-dark to-brand-sky'
    },
    {
      icon: Target,
      title: 'Innovation',
      description: 'Continuously improving our platform to meet the evolving needs of care facilities. We stay ahead of industry trends and regulatory changes.',
      gradient: 'from-brand-sky to-brand-primary-dark'
    },
    {
      icon: Users,
      title: 'Partnership',
      description: 'Working closely with facilities to understand their unique challenges and requirements. Your success is our success.',
      gradient: 'from-brand-primary-dark to-brand-sky'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Committed to delivering the highest quality software and support services. We set high standards and consistently exceed them.',
      gradient: 'from-brand-sky to-brand-primary-dark'
    },
  ];

  const stats = [
    {
      number: '10+',
      label: 'Care Facilities',
      icon: Building2,
      description: 'Trusted by facilities nationwide'
    },
    {
      number: '300',
      label: 'Residents Managed',
      icon: Users,
      description: 'Daily active users'
    },
    {
      number: '99.9%',
      label: 'Uptime',
      icon: Zap,
      description: 'Reliable service guarantee'
    },
    {
      number: '24/7',
      label: 'Support',
      icon: Clock,
      description: 'Always here when you need us'
    },
  ];

  const milestones = [
    {
      year: 'Nov 2025',
      title: 'Our foundation',
      description: 'HomeLogic360 was built from a vision to give care facilities the same powerful, secure, and user-friendly tools that larger organizations rely on — so every resident receives the attention and documentation they deserve.'
    },
    {
      year: 'Now',
      title: 'Growing with you',
      description: 'We’re focused on onboarding our first facilities, listening to feedback, and improving the platform every day. Our goal is to become the trusted partner for adult family homes and small care providers.'
    },
  ];

  const features = [
    {
      icon: Shield,
      title: 'HIPAA Compliant',
      description: 'Fully compliant with all healthcare data protection regulations'
    },
    {
      icon: BarChart3,
      title: 'Data-Driven Insights',
      description: 'Real-time analytics to help you make informed decisions'
    },
    {
      icon: Globe,
      title: 'Cloud-Based',
      description: 'Access your data securely from anywhere, anytime'
    },
    {
      icon: TrendingUp,
      title: 'Scalable Solution',
      description: 'Grows with your facility from small to enterprise scale'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden h-screen flex items-center bg-gradient-to-br from-brand-primary-dark via-brand-sky to-brand-sky">
        {/* Sophisticated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated Gradient Orbs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-sky/30 rounded-full mix-blend-overlay filter blur-[100px] animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-primary-dark/30 rounded-full mix-blend-overlay filter blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full mix-blend-overlay filter blur-[120px] animate-blob animation-delay-4000"></div>
          
          {/* Geometric Patterns */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white/30 rotate-45"></div>
            <div className="absolute bottom-20 right-20 w-24 h-24 border-2 border-white/30 rotate-45"></div>
            <div className="absolute top-1/2 right-10 w-16 h-16 border-2 border-white/20 rotate-45"></div>
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
          <div className="text-center space-y-6">
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1]">
              <span className="block">Innovating Care,</span>
              <span className="block bg-gradient-to-r from-brand-primary via-white to-brand-primary bg-clip-text text-transparent">
                Empowering Facilities
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Discover the story behind HomeLogic360 and our commitment to transforming care facility management through innovative technology and unwavering support.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => navigate('/contact')}
                className="group relative bg-white text-brand-primary-dark px-6 py-3 rounded-xl font-bold text-base hover:bg-gray-50 transition-all shadow-2xl hover:shadow-brand-sky/50 hover:scale-105 flex items-center justify-center space-x-2 overflow-hidden"
              >
                <span className="relative z-10">Get in Touch</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-dark to-brand-sky opacity-0 group-hover:opacity-10 transition-opacity"></div>
              </button>
              <button
                onClick={() => navigate('/register-facility')}
                className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-6 py-3 rounded-xl font-bold text-base hover:bg-white/20 transition-all shadow-xl"
              >
                Start Free Trial
              </button>
            </div>

            {/* Quick Stats - Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl hover:scale-105 transition-transform"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{stat.number}</div>
                    <div className="text-xs font-medium text-white/90">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Founder */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Meet the Founder</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The technology professional behind HomeLogic360
            </p>
          </div>
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 bg-gradient-to-br from-brand-primary to-brand-primary rounded-2xl p-8 lg:p-12 shadow-lg border border-gray-100">
            <div className="flex-shrink-0">
              <img
                src="/mr%20lowe.jpeg"
                alt="Gibril Lowe, Founder of HomeLogic360"
                className="w-40 h-40 rounded-full object-cover shadow-xl border-2 border-white"
              />
            </div>
            <div className="flex-1 text-center lg:text-left space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">Gibril Lowe</h3>
              <p className="text-lg font-medium text-brand-primary-dark">Founder of HomeLogic360</p>
              <p className="text-gray-700 leading-relaxed">
                Gibril Lowe is a technology entrepreneur and IT professional with over 15 years of experience in information systems, database development, and enterprise technology solutions. He holds a BSc in Computer Science and an MBA in Technology Management, and is currently pursuing his second Master&apos;s degree in Information Management (Data Science) at the University of Washington.
              </p>
              <p className="text-gray-600 leading-relaxed">
                He is the founder of USGamNeeds, a registered technology company focused on developing practical digital solutions for organizations. Under this company, he created HomeLogic360, a care management platform designed to support both small care providers and larger healthcare organizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Image Banner */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img
                src="/images/slides/slide-2-struggle.png"
                alt="Managing care shouldn't be this hard"
                className="w-full rounded-2xl shadow-lg"
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className="order-1 lg:order-2 space-y-5">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                We Saw the <span className="text-brand-primary-dark">Problem</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Care facility staff were drowning in paperwork, juggling medication schedules, and struggling with outdated systems. We built HomeLogic360 to change that &mdash; one facility at a time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Mission */}
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                HomeLogic360 was founded with a simple mission to provide care facilities with the tools they need to deliver exceptional care while streamlining operations and ensuring compliance.
              </p>
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                We understand that managing a care facility involves countless moving partsfrom resident care and medication management to staff scheduling and regulatory compliance. Our comprehensive platform brings all these elements together in one intuitive system.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                By automating routine tasks and providing real-time insights, we help care facilities focus on what matters most: providing quality care to residents.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-sky to-brand-primary-dark flex items-center justify-center mb-6">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                We envision a future where every care facility has access to world-class management tools that enable them to provide the highest quality of care to their residents.
              </p>
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                Through continuous innovation and deep partnerships with care facilities, we aim to become the leading platform for care facility management, setting new standards for efficiency, compliance, and resident care.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Our goal is to make advanced care management accessible to facilities of all sizes, ensuring that every resident receives the attention and care they deserve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 hover:border-brand-sky/50"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-4`}>
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-brand-primary-dark to-brand-sky">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">By The Numbers</h2>
            <p className="text-xl text-white/90">Our impact in the care facility industry</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-5xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-lg font-semibold text-white mb-1">{stat.label}</div>
                <div className="text-sm text-white/80">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey/Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our story</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We’re just getting started — here’s where we are and where we’re headed
            </p>
          </div>
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="flex items-start space-x-6"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center shadow-lg">
                    <div className="text-white font-bold text-lg">{milestone.year}</div>
                  </div>
                </div>
                <div className="flex-1 bg-gradient-to-br from-brand-primary to-brand-primary rounded-xl p-6 shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{milestone.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose HomeLogic360?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              What sets us apart in the care facility management industry
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-200 hover:border-brand-sky/50 text-center"
              >
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
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
          <h2 className="text-4xl font-bold text-white mb-4">Join Our Growing Community</h2>
          <p className="text-xl text-white/90 mb-8">
            See why care facilities trust HomeLogic360 for their management needs. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register-facility')}
              className="bg-white text-brand-primary-dark px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
            >
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
