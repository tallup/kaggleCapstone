import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail } from 'lucide-react';

export default function PublicFooter() {
  const navigate = useNavigate();

  return (
    <footer className="relative bg-gray-900 text-white">
      {/* Bright Blue Top Border */}
      <div className="h-1 bg-gradient-to-r from-brand-primary-dark to-brand-sky"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                <img
                  src="/images/logonew.png"
                  alt="HomeLogic360"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-primary-dark to-brand-sky flex items-center justify-center hidden">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-white">HomeLogic360</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              Comprehensive care facility management system for modern healthcare facilities.
            </p>
            <a
              href="mailto:support@homelogic360.com"
              className="inline-flex items-center gap-2 text-brand-sky hover:text-white text-sm font-medium"
            >
              <Mail className="w-4 h-4" />
              support@homelogic360.com
            </a>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-white font-bold mb-4 text-base">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/features"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/features');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/pricing');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="/modules"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/modules');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Modules
                </a>
              </li>
              <li>
                <a
                  href="/security"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/security');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-white font-bold mb-4 text-base">Company</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/about');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/contact');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="/support"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/support');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="/blog"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/blog');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-white font-bold mb-4 text-base">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/privacy-policy');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms-of-service"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/terms-of-service');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/hipaa-compliance"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/hipaa-compliance');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  HIPAA Compliance
                </a>
              </li>
              <li>
                <a
                  href="/cookie-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/cookie-policy');
                  }}
                  style={{ color: '#e5e7eb' }}
                  className="hover:text-brand-sky font-medium transition-colors text-sm"
                >
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Links - Replace # with your profile URLs */}
        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
          <span className="text-sm text-gray-400">Follow us:</span>
          <div className="flex gap-4">
            <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-brand-sky transition-colors text-sm font-medium">Facebook</a>
            <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-brand-sky transition-colors text-sm font-medium">LinkedIn</a>
            <a href="#" aria-label="X (Twitter)" className="text-gray-400 hover:text-brand-sky transition-colors text-sm font-medium">X</a>
            <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-brand-sky transition-colors text-sm font-medium">Instagram</a>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-gray-800 mt-6 pt-6">
          <p className="text-center text-sm text-white">
            &copy; {new Date().getFullYear()} HomeLogic360. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

