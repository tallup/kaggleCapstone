import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';
import { ArrowLeft, ClipboardList, Calendar, User, CheckCircle, FileText, TrendingUp, Award } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { isCaregiverRole } from '../utils/userRoles';

export default function AssessmentReview() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => (await api.get('/user')).data,
        staleTime: 60_000,
    });

    const readOnly = isCaregiverRole(currentUser?.role);

    const { data, isLoading, error } = useQuery({
        queryKey: ['assessment-review', id],
        queryFn: async () => {
            const response = await api.get(`/assessments/${id}`);
            return response.data;
        },
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    const markCompleteMutation = useMutation({
        mutationFn: async (status) => api.patch(`/assessments/${id}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries(['assessment-review', id]);
            queryClient.invalidateQueries(['assessments']);
            alert('Assessment marked as complete!');
        },
        onError: (error) => {
            logger.error('Failed to mark assessment as complete:', error);
            alert('Failed to mark assessment as complete. Please try again.');
        },
    });

    // Calculate completion stats
    const stats = React.useMemo(() => {
        if (!data?.sections) return { total: 0, answered: 0, percentage: 0 };
        
        let total = 0;
        let answered = 0;
        
        data.sections.forEach(section => {
            if (section.questions) {
                total += section.questions.length;
                answered += section.questions.filter(q => {
                    const raw = q.response_value;
                    if (raw === null || raw === undefined) return false;
                    if (typeof raw === 'boolean') return true;
                    if (typeof raw === 'number') return true;
                    return String(raw).trim() !== '';
                }).length;
            }
        });
        
        return {
            total,
            answered,
            percentage: total > 0 ? Math.round((answered / total) * 100) : 0
        };
    }, [data]);

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                <p className="mt-4 text-gray-600">Loading assessment...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error.response?.data?.message || error.message}</p>
            </div>
        );
    }

    const assessment = data;

    const getStatusBadgeColor = (status) => {
        // Use theme colors
        return status === 'approved'
            ? 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]'
            : 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]';
    };

    // Use theme primary color palette
    const sectionColors = [
        { bg: 'bg-[var(--theme-primary-bg)]', border: 'border-[var(--theme-primary-light)]', icon: 'text-[var(--theme-primary)]' },
    ];

    return (
        <>
            <ConfirmDialog
                isOpen={completeConfirmOpen}
                onClose={() => !markCompleteMutation.isPending && setCompleteConfirmOpen(false)}
                onConfirm={() =>
                    markCompleteMutation.mutate('completed', {
                        onSuccess: () => setCompleteConfirmOpen(false),
                    })
                }
                title="Mark assessment as complete?"
                description="Once marked complete, this assessment will be finalized."
                confirmLabel="Mark complete"
                cancelLabel="Cancel"
                variant="primary"
                isPending={markCompleteMutation.isPending}
            />
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm mb-6">
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                        <Link 
                            to="/assessments" 
                            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 inline-flex items-center space-x-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Assessments</span>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--theme-primary)]">
                                Assessment Review
                            </h1>
                            <div className="flex items-center space-x-3 mt-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(assessment.status)}`}>
                                    {assessment.status?.replace('_', ' ') || 'Draft'}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {new Date(assessment.assessment_date).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[var(--theme-primary)] rounded-xl shadow p-5 text-[var(--theme-text-on-primary)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-medium">Assessment Type</p>
                                <p className="text-xl font-bold mt-1">{assessment.assessment_type || 'N/A'}</p>
                            </div>
                            <ClipboardList className="w-8 h-8 text-white/80" />
                        </div>
                    </div>

                    <div className="bg-[var(--theme-primary-light)] rounded-xl shadow p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-medium">Completion</p>
                                <p className="text-xl font-bold mt-1">{stats.percentage}%</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-white/80" />
                        </div>
                    </div>

                    <div className="bg-[var(--theme-primary)] rounded-xl shadow p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-medium">Questions</p>
                                <p className="text-xl font-bold mt-1">{stats.answered}/{stats.total}</p>
                            </div>
                            <FileText className="w-8 h-8 text-white/80" />
                        </div>
                    </div>

                    <div className="bg-[var(--theme-primary-dark)] rounded-xl shadow p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-medium">Resident</p>
                                <p className="text-lg font-bold mt-1 truncate">
                                    {assessment.resident?.first_name} {assessment.resident?.last_name}
                                </p>
                            </div>
                            <User className="w-8 h-8 text-white/80" />
                        </div>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-6">
                    {assessment.sections?.length ? (
                        assessment.sections.map((section, index) => {
                            const sectionProgress = section.questions?.length > 0
                                ? Math.round((section.questions.filter(q => {
                                    const raw = q.response_value;
                                    if (raw === null || raw === undefined) return false;
                                    if (typeof raw === 'boolean') return true;
                                    if (typeof raw === 'number') return true;
                                    return String(raw).trim() !== '';
                                }).length / section.questions.length) * 100)
                                : 0;
                            
                            const isComplete = sectionProgress === 100;
                            const colorScheme = sectionColors[index % sectionColors.length];
                            
                            return (
                                <div 
                                    key={section.id} 
                                    className={`bg-white rounded-xl shadow-lg border-2 ${colorScheme.border} overflow-hidden transition-all hover:shadow-xl`}
                                >
                                    {/* Section Header */}
                                    <div className={`${colorScheme.bg} px-6 py-4 border-b-2 ${colorScheme.border}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-lg bg-white/50 ${colorScheme.icon}`}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-900">
                                                        {section.title || section.section_title || 'Section'}
                                                    </h2>
                                                    <p className="text-sm text-gray-600 mt-0.5">
                                                        {section.questions?.length || 0} questions
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-gray-700">{sectionProgress}%</p>
                                                    <p className="text-xs text-gray-600">Complete</p>
                                                </div>
                                                {isComplete && (
                                                    <div className="p-2 bg-[var(--theme-primary)] rounded-full">
                                                        <CheckCircle className="w-6 h-6 text-white" />
                                                    </div>
                                                )}
                                                {!isComplete && sectionProgress > 0 && (
                                                    <Award className={`w-6 h-6 ${colorScheme.icon}`} />
                                                )}
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="mt-3 w-full bg-white/50 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${
                                                    isComplete ? 'bg-[var(--theme-primary)]' : 'bg-gradient-to-r from-[var(--theme-primary-light)] to-[var(--theme-primary)]'
                                                }`}
                                                style={{ width: `${sectionProgress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Questions */}
                                    <div className="p-6 space-y-4">
                                        {section.questions?.length ? (
                                            section.questions.map((q, qIndex) => {
                                                // Handle different response_value formats
                                                const raw = q.response_value;
                                                let strVal = '';
                                                
                                                if (raw !== null && raw !== undefined) {
                                                    // Handle string, number, boolean
                                                    if (typeof raw === 'boolean') {
                                                        strVal = raw ? 'true' : 'false';
                                                    } else if (typeof raw === 'number') {
                                                        strVal = String(raw);
                                                    } else {
                                                        strVal = String(raw).trim();
                                                    }
                                                }
                                                
                                                const hasAnswer = strVal !== '';
                                                let answerValue = null;
                                                
                                                if (hasAnswer) {
                                                    if (strVal === 'true' || strVal === '1' || raw === true) {
                                                        answerValue = 'Yes';
                                                    } else if (strVal === 'false' || strVal === '0' || raw === false) {
                                                        answerValue = 'No';
                                                    } else {
                                                        answerValue = strVal;
                                                    }
                                                }

                                                return (
                                                    <div 
                                                        key={q.id} 
                                                        className={`rounded-lg border-2 transition-all ${
                                                            hasAnswer 
                                                                ? 'border-[var(--theme-primary-light)] bg-[var(--theme-primary-bg)] hover:bg-[var(--theme-primary-bg-light)]' 
                                                                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="p-4">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                                            hasAnswer 
                                                                                ? 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]' 
                                                                                : 'bg-gray-100 text-gray-600'
                                                                        }`}>
                                                                            Q{qIndex + 1}
                                                                        </span>
                                                                        <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]">
                                                                            {q.response_type}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-base font-semibold text-gray-900">
                                                                        {q.question_text}
                                                                    </p>
                                                                </div>
                                                                {hasAnswer && (
                                                                    <CheckCircle className="w-5 h-5 text-[var(--theme-primary)] flex-shrink-0 ml-3" />
                                                                )}
                                                            </div>
                                                            
                                                            <div className={`mt-3 p-4 rounded-lg ${
                                                                hasAnswer 
                                                                    ? 'bg-white border border-[var(--theme-primary-light)]' 
                                                                    : 'bg-white border-2 border-dashed border-gray-300'
                                                            }`}>
                                                                {hasAnswer ? (
                                                                    <p className="text-gray-900 font-medium">{answerValue}</p>
                                                                ) : (
                                                                    <p className="text-gray-400 italic">No answer provided</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-sm text-gray-500 text-center py-4">No questions in this section.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-gray-900 mb-2">No sections found</p>
                            <p className="text-sm text-gray-600">This assessment doesn't have any sections yet.</p>
                        </div>
                    )}

                    {/* Mark as Complete Button */}
                    {!readOnly && assessment.sections?.length > 0 && assessment.status !== 'approved' && assessment.status !== 'archived' && (
                        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[var(--theme-primary-light)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Assessment Complete?</h3>
                                    <p className="text-sm text-gray-600">
                                        Once marked as complete, this assessment will be finalized.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCompleteConfirmOpen(true)}
                                    disabled={markCompleteMutation.isPending || assessment.status === 'completed'}
                                    className="px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    <span>{markCompleteMutation.isPending ? 'Marking...' : assessment.status === 'completed' ? 'Already Completed' : 'Mark as Complete'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}
