import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, Clock, ArrowRight, Home } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function RegisterFacilitySuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <PublicNavigation />

      {/* Success Section */}
      <section className="pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Registration Submitted Successfully!
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Thank you for registering your facility with HomeLogic360. Your request has been received and is now under review.
            </p>

            {/* What Happens Next */}
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary border border-brand-sky/30 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-primary-dark" />
                What Happens Next?
              </h2>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-sky text-white flex items-center justify-center text-sm font-bold">1</span>
                  <span>You'll receive an email confirmation at the address you provided</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-sky text-white flex items-center justify-center text-sm font-bold">2</span>
                  <span>Our super admin team will review your registration request</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-sky text-white flex items-center justify-center text-sm font-bold">3</span>
                  <span>Once approved, you'll receive setup instructions and login credentials</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-sky text-white flex items-center justify-center text-sm font-bold">4</span>
                  <span>You can start using HomeLogic360 to manage your facility</span>
                </li>
              </ol>
            </div>

            {/* Timeline */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                <Mail className="w-5 h-5" />
                <span className="font-semibold">Expected Review Time</span>
              </div>
              <p className="text-gray-700">
                Our team typically reviews registration requests within <strong>1-2 business days</strong>. 
                You'll be notified via email once your facility has been approved.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}


