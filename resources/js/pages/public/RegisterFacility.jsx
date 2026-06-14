import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Mail, Phone, MapPin, User, Globe, CheckCircle,
  AlertCircle, ArrowRight, FileText, Shield, Clock
} from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';
import api from '../../services/api';
import logger from '../../utils/logger';
import { useToastContext } from '../../contexts/ToastContext';

export default function RegisterFacility() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Facility Information
    facility_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    
    // Subdomain
    requested_subdomain: '',
    
    // Additional Information
    facility_type: '',
    number_of_beds: '',
    years_in_operation: '',
    current_software: '',
    reason_for_switching: '',
  });

  const [errors, setErrors] = useState({});

  const steps = [
    { number: 1, title: 'Facility Information', icon: Building2 },
    { number: 2, title: 'Contact Details', icon: Mail },
    { number: 3, title: 'Additional Info', icon: FileText },
    { number: 4, title: 'Review & Submit', icon: CheckCircle },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-generate subdomain from facility name
    if (name === 'facility_name' && !formData.requested_subdomain) {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      setFormData(prev => ({
        ...prev,
        requested_subdomain: subdomain
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.facility_name.trim()) {
        newErrors.facility_name = 'Facility name is required';
      }
      if (!formData.facility_type) {
        newErrors.facility_type = 'Facility type is required';
      }
    }
    
    if (step === 2) {
      if (!formData.contact_name.trim()) {
        newErrors.contact_name = 'Contact name is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }
    
    if (step === 3) {
      // Optional fields, no validation needed
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(1) || !validateStep(2)) {
      setCurrentStep(1);
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare address string
      const addressParts = [
        formData.address,
        formData.city,
        formData.state,
        formData.zip_code
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ');

      const payload = {
        facility_name: formData.facility_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone || null,
        address: fullAddress || null,
        requested_subdomain: formData.requested_subdomain || null,
      };

      // Use the public API endpoint
      const response = await api.post('/facility-registrations', payload);

      showToast('Registration submitted successfully! Our team will review your request.', 'success');
      navigate('/register-facility/success');
    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        setErrors(apiErrors);
        showToast('Please correct the errors in the form', 'error');
      } else if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error');
      } else {
        showToast('Failed to submit registration. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepData = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="facility_name"
                value={formData.facility_name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all ${
                  errors.facility_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your facility name"
                required
              />
              {errors.facility_name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.facility_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Facility Type <span className="text-red-500">*</span>
              </label>
              <select
                name="facility_type"
                value={formData.facility_type}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all ${
                  errors.facility_type ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select facility type</option>
                <option value="assisted_living">Assisted Living</option>
                <option value="memory_care">Memory Care</option>
                <option value="skilled_nursing">Skilled Nursing</option>
                <option value="independent_living">Independent Living</option>
                <option value="residential_care">Residential Care</option>
                <option value="group_home">Group Home</option>
                <option value="other">Other</option>
              </select>
              {errors.facility_type && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.facility_type}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Number of clients
              </label>
              <input
                type="number"
                name="number_of_beds"
                value={formData.number_of_beds}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all"
                placeholder="e.g., 50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Years in Operation
              </label>
              <input
                type="number"
                name="years_in_operation"
                value={formData.years_in_operation}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all"
                placeholder="e.g., 10"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all ${
                  errors.contact_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Full name of primary contact"
                required
              />
              {errors.contact_name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.contact_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="contact@facility.com"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all"
                  placeholder="12345"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Requested Subdomain (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="requested_subdomain"
                  value={formData.requested_subdomain}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all font-mono text-sm"
                  placeholder="your-facility-name"
                  pattern="[a-z0-9-]+"
                />
                <span className="text-gray-500 text-sm whitespace-nowrap">.homelogic360.com</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to auto-generate from facility name. Only lowercase letters, numbers, and hyphens allowed.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Current Software System (if any)
              </label>
              <input
                type="text"
                name="current_software"
                value={formData.current_software}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all"
                placeholder="e.g., Paper-based, Excel, Other software name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Reason for Switching
              </label>
              <textarea
                name="reason_for_switching"
                value={formData.reason_for_switching}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky transition-all resize-none"
                placeholder="Tell us why you're interested in HomeLogic360..."
              />
            </div>

            <div className="bg-brand-primary/30 border border-brand-sky/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-brand-primary-dark mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-brand-primary-dark mb-1">What Happens Next?</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Our team will review your registration request</li>
                    <li>• You'll receive an email confirmation</li>
                    <li>• A super admin will review and approve your facility</li>
                    <li>• Once approved, you'll receive setup instructions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary border border-brand-sky/30 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-brand-primary-dark" />
                Review Your Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Facility Name:</span>
                  <p className="text-gray-900">{formData.facility_name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Facility Type:</span>
                  <p className="text-gray-900">{formData.facility_type || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Contact Name:</span>
                  <p className="text-gray-900">{formData.contact_name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Email:</span>
                  <p className="text-gray-900">{formData.email || 'Not provided'}</p>
                </div>
                {formData.phone && (
                  <div>
                    <span className="font-semibold text-gray-700">Phone:</span>
                    <p className="text-gray-900">{formData.phone}</p>
                  </div>
                )}
                {formData.address && (
                  <div className="md:col-span-2">
                    <span className="font-semibold text-gray-700">Address:</span>
                    <p className="text-gray-900">
                      {[formData.address, formData.city, formData.state, formData.zip_code].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {formData.requested_subdomain && (
                  <div>
                    <span className="font-semibold text-gray-700">Subdomain:</span>
                    <p className="text-gray-900 font-mono">{formData.requested_subdomain}.homelogic360.com</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                By submitting this form, you agree to our Terms of Service and Privacy Policy. 
                Your information will be reviewed by our team, and you'll be contacted within 1-2 business days.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-brand-primary-dark via-brand-sky to-brand-sky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Register Your Facility
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Join HomeLogic360 and streamline your care facility management
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/facility-setup')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all text-sm font-medium border border-white/20"
            >
              <FileText className="w-4 h-4" />
              View Required Information Checklist
            </button>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        currentStep >= step.number
                          ? 'bg-gradient-to-br from-brand-primary-dark to-brand-sky border-brand-sky text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      currentStep > step.number ? 'bg-brand-sky' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {steps[currentStep - 1].title}
                </h2>
                <p className="text-gray-600">
                  Step {currentStep} of {steps.length}
                </p>
              </div>

              {getCurrentStepData()}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-3 bg-brand-primary-dark text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-brand-primary-dark text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Registration
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

