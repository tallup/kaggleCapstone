import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function CookiePolicy() {
  const navigate = useNavigate();

  const cookieTypes = [
    {
      name: 'Essential Cookies',
      description: 'These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.',
      examples: ['Session management', 'Authentication', 'Security features']
    },
    {
      name: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      examples: ['Page views', 'User behavior', 'Traffic sources']
    },
    {
      name: 'Functional Cookies',
      description: 'These cookies enable enhanced functionality and personalization, such as remembering your preferences.',
      examples: ['Language preferences', 'User settings', 'Feature preferences']
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavigation />

      {/* Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
            <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

            <div className="prose max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies?</h2>
                <p className="text-gray-700 mb-4">
                  Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Cookies</h2>
                <p className="text-gray-700 mb-6">
                  HomeLogic360 uses cookies to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Enable essential website functionality</li>
                  <li>Remember your preferences and settings</li>
                  <li>Analyze website usage and improve our services</li>
                  <li>Provide personalized content and features</li>
                  <li>Ensure security and prevent fraud</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Types of Cookies We Use</h2>
                <div className="space-y-6">
                  {cookieTypes.map((type, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{type.name}</h3>
                      <p className="text-gray-700 mb-4">{type.description}</p>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-2">Examples:</p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-1">
                          {type.examples.map((example, exampleIndex) => (
                            <li key={exampleIndex}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Managing Cookies</h2>
                <p className="text-gray-700 mb-4">
                  You can control and manage cookies in various ways:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or accept cookies. You can also delete cookies that have already been set.</li>
                  <li><strong>Cookie Preferences:</strong> You can manage your cookie preferences through our cookie consent banner when you first visit our website.</li>
                  <li><strong>Third-Party Cookies:</strong> Some cookies are set by third-party services. You can manage these through your browser settings or the third-party service's privacy settings.</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  Please note that disabling certain cookies may impact the functionality of our website.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-Party Cookies</h2>
                <p className="text-gray-700 mb-4">
                  We may use third-party services that set cookies on your device. These services help us:
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                  <li>Analyze website traffic and usage</li>
                  <li>Provide customer support features</li>
                  <li>Deliver personalized content</li>
                </ul>
                <p className="text-gray-700">
                  These third-party services have their own privacy policies and cookie practices. We encourage you to review their policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Updates to This Policy</h2>
                <p className="text-gray-700 mb-4">
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new policy on this page.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contact Us</h2>
                <p className="text-gray-700 mb-4">
                  If you have questions about our use of cookies, please contact us at:
                </p>
                <p className="text-gray-700">
                  Email: support@homelogic360.com
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}


