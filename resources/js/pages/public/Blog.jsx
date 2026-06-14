import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

const SAMPLE_POSTS = [
  {
    slug: 'improve-care-management-adult-family-homes',
    title: 'How Adult Family Homes Can Improve Care Management',
    excerpt: 'Practical steps to streamline daily operations, documentation, and resident care in adult family homes using integrated software.',
    date: '2024-02-15',
  },
  {
    slug: 'digital-medication-tracking-care-homes',
    title: 'Digital Medication Tracking for Care Homes',
    excerpt: 'Why moving from paper MAR sheets to digital medication tracking reduces errors and saves time for caregivers and administrators.',
    date: '2024-01-22',
  },
  {
    slug: 'improving-compliance-adult-family-homes',
    title: 'Improving Compliance in Adult Family Homes',
    excerpt: 'Stay audit-ready with organized records, automated reminders, and clear documentation practices that regulators expect.',
    date: '2024-01-08',
  },
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Blog() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <PublicNavigation />

      <section className="pt-20 pb-12 bg-gradient-to-br from-brand-primary to-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Blog & Insights</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tips, guides, and updates on care facility management, compliance, and best practices.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {SAMPLE_POSTS.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-xl p-6 sm:p-8 shadow-lg border border-gray-100 hover:border-brand-sky/50 hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{post.title}</h2>
                <p className="text-gray-600 leading-relaxed mb-4">{post.excerpt}</p>
                <button
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="inline-flex items-center gap-2 text-brand-primary-dark font-semibold hover:opacity-90"
                >
                  Read more
                  <ArrowRight className="w-4 h-4" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
