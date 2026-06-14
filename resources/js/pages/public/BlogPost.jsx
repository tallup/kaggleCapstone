import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

const POSTS = {
  'improve-care-management-adult-family-homes': {
    title: 'How Adult Family Homes Can Improve Care Management',
    date: '2024-02-15',
    content: (
      <>
        <p className="mb-4">
          Adult family homes face unique challenges: small teams, high accountability, and strict compliance requirements. Improving care management starts with having the right systems in place.
        </p>
        <p className="mb-4">
          Integrated software can centralize resident profiles, care plans, medication schedules, and family communication in one secure platform. That means less time hunting for paperwork and more time with residents.
        </p>
        <p className="mb-4">
          We built HomeLogic360 to give adult family homes the same level of organization and reporting that larger facilities use — so you can focus on care quality while staying audit-ready.
        </p>
      </>
    ),
  },
  'digital-medication-tracking-care-homes': {
    title: 'Digital Medication Tracking for Care Homes',
    date: '2024-01-22',
    content: (
      <>
        <p className="mb-4">
          Paper MAR sheets are error-prone and hard to audit. Digital medication tracking reduces transcription mistakes, sends reminders at the right time, and keeps a clear record for surveys and families.
        </p>
        <p className="mb-4">
          In care homes, missed or incorrect doses can have serious consequences. A system that shows what was given, when, and by whom helps protect residents and your facility.
        </p>
        <p className="mb-4">
          HomeLogic360 includes medication management designed for care settings: schedules, PRN logging, and reporting that supports compliance and peace of mind.
        </p>
      </>
    ),
  },
  'improving-compliance-adult-family-homes': {
    title: 'Improving Compliance in Adult Family Homes',
    date: '2024-01-08',
    content: (
      <>
        <p className="mb-4">
          Regulators expect organized, up-to-date records: care plans, assessments, incidents, and documentation that show consistent, person-centered care.
        </p>
        <p className="mb-4">
          Improving compliance is easier when your documentation lives in one place. Automated reminders for care plan reviews, assessment due dates, and required checks help nothing fall through the cracks.
        </p>
        <p className="mb-4">
          With HomeLogic360, you can generate reports and export what surveyors need without last-minute scrambling. Stay audit-ready every day.
        </p>
      </>
    ),
  },
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPost() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const post = slug ? POSTS[slug] : null;

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <PublicNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <button
            onClick={() => navigate('/blog')}
            className="text-brand-primary-dark font-semibold hover:underline"
          >
            Back to Blog
          </button>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <PublicNavigation />

      <article className="pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/blog')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Calendar className="w-4 h-4" />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">{post.title}</h1>
          <div className="prose prose-lg text-gray-700 max-w-none">
            {post.content}
          </div>
        </div>
      </article>

      <PublicFooter />
    </div>
  );
}
