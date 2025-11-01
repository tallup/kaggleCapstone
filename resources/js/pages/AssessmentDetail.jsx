import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ArrowLeft, ClipboardList, Calendar, User, CheckCircle, AlertCircle } from 'lucide-react';

export default function AssessmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['assessment-detail', id],
        queryFn: async () => (await api.get(`/assessments/${id}`)).data,
    });

    const saveMutation = useMutation({
        mutationFn: async ({ questionId, value }) => {
            const response = await api.patch(`/assessments/${id}/questions/${questionId}`, { response_value: value });
            console.log(`API Save Response for question ${questionId}:`, response.data);
            return response;
        },
        onMutate: async ({ questionId, value }) => {
            await queryClient.cancelQueries({ queryKey: ['assessment-detail', id] });
            const previous = queryClient.getQueryData(['assessment-detail', id]);
            if (previous?.sections) {
                const updated = {
                    ...previous,
                    sections: previous.sections.map((s) => ({
                        ...s,
                        questions: (s.questions || []).map((q) =>
                            q.id === questionId ? { ...q, response_value: value } : q
                        ),
                    })),
                };
                queryClient.setQueryData(['assessment-detail', id], updated);
            }
            return { previous };
        },
        onError: (err, vars, context) => {
            console.error(`Save error for question ${vars.questionId}:`, err);
            if (context?.previous) {
                queryClient.setQueryData(['assessment-detail', id], context.previous);
            }
        },
        onSuccess: () => {
            // Invalidate to get fresh data from server
            queryClient.invalidateQueries(['assessment-detail', id]);
        },
    });

    const submitMutation = useMutation({
        mutationFn: async (status) =>
            api.patch(`/assessments/${id}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries(['assessment-detail', id]);
            queryClient.invalidateQueries(['assessments']);
            navigate('/assessments');
        },
    });


    // Calculate section progress
    const getSectionProgress = (section) => {
        if (!section.questions || section.questions.length === 0) return 0;
        const answered = section.questions.filter(q => 
            q.response_value !== null && 
            q.response_value !== undefined && 
            String(q.response_value).trim() !== ''
        ).length;
        return Math.round((answered / section.questions.length) * 100);
    };

    // Calculate overall progress
    const overallProgress = React.useMemo(() => {
        if (!data?.sections || data.sections.length === 0) return 0;
        let totalQuestions = 0;
        let answeredQuestions = 0;
        
        data.sections.forEach(section => {
            if (section.questions) {
                totalQuestions += section.questions.length;
                answeredQuestions += section.questions.filter(q => 
                    q.response_value !== null && 
                    q.response_value !== undefined && 
                    String(q.response_value).trim() !== ''
                ).length;
            }
        });
        
        return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    }, [data]);

    const handleSubmit = () => {
        if (window.confirm('Are you sure you want to submit this assessment for review? You can continue editing later if needed.')) {
            submitMutation.mutate('reviewed');
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
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

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                <div className="flex items-center space-x-3">
                    <Link to="/assessments" className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 inline-flex items-center">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Assessment Details</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {overallProgress}% Complete • {assessment.status?.replace('_', ' ') || 'Draft'}
                        </p>
                    </div>
                </div>
                {assessment.status !== 'approved' && assessment.status !== 'archived' && (
                    <button
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending}
                        className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        <span>{submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}</span>
                    </button>
                )}
            </div>

            {/* Overall Progress Bar */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Overall Progress</h3>
                    <span className="text-sm font-semibold text-gray-900">
                        {overallProgress}% • {overallProgress === 100 ? 'Complete' : 'In Progress'}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                            overallProgress === 100 ? 'bg-green-500' :
                            overallProgress >= 75 ? 'bg-[#2D5016]' :
                            overallProgress >= 50 ? 'bg-yellow-500' :
                            'bg-orange-500'
                        }`}
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    You can save your progress and return anytime to complete the assessment.
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-3">
                        <ClipboardList className="w-5 h-5 text-[#2D5016]" />
                        <div>
                            <p className="text-xs text-gray-500">Type</p>
                            <p className="text-sm font-medium text-gray-900">{assessment.assessment_type || 'Assessment'}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-600" />
                        <div>
                            <p className="text-xs text-gray-500">Assessment Date</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(assessment.assessment_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-600" />
                        <div>
                            <p className="text-xs text-gray-500">Resident</p>
                            <p className="text-sm font-medium text-gray-900">{assessment.resident?.first_name} {assessment.resident?.last_name}</p>
                        </div>
                    </div>
                </div>
            </div>

            {assessment.notes && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <p className="text-sm text-gray-700"><span className="font-medium">Notes: </span>{assessment.notes}</p>
                </div>
            )}

            <div className="space-y-6">
                {assessment.sections?.length ? (
                    assessment.sections.map((section) => {
                        const sectionProgress = getSectionProgress(section);
                        return (
                            <div key={section.id} className="bg-white rounded-lg shadow p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {section.title || section.section_title || 'Section'}
                                    </h2>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm font-medium text-gray-700">{sectionProgress}%</span>
                                        {sectionProgress === 100 ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                                        )}
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                            sectionProgress === 100 ? 'bg-green-500' :
                                            sectionProgress >= 75 ? 'bg-[#2D5016]' :
                                            sectionProgress >= 50 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}
                                        style={{ width: `${sectionProgress}%` }}
                                    />
                                </div>
                                <div className="space-y-3">
                                {section.questions?.length ? (
                                    section.questions.map((q) => (
                                        <div key={q.id} className="p-3 border border-gray-200 rounded">
                                            <p className="text-sm font-medium text-gray-900 mb-2">{q.question_text}</p>
                                            <p className="text-xs text-gray-500 mb-2">Type: {q.response_type}</p>
                                            <QuestionInput
                                                question={q}
                                                onSave={(value) => saveMutation.mutateAsync({ questionId: q.id, value })}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">No questions in this section.</p>
                                )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600">No sections found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuestionInput({ question, onSave }) {
    const initialValue = question.response_value ?? '';
    const [value, setValue] = React.useState(initialValue);
    const [saving, setSaving] = React.useState(false);
    const saveTimeoutRef = React.useRef(null);

    // Update local value when question prop changes (from API refresh)
    React.useEffect(() => {
        const newValue = question.response_value ?? '';
        if (String(newValue) !== String(value)) {
            setValue(newValue);
        }
    }, [question.response_value]);

    const handleSave = async (v) => {
        // Normalize value before saving
        let normalizedValue = v;
        if (v === null || v === undefined || v === '') {
            normalizedValue = null;
        } else if (typeof v === 'boolean') {
            normalizedValue = v ? 'true' : 'false';
        } else {
            normalizedValue = String(v).trim();
        }

        setSaving(true);
        try {
            await onSave(normalizedValue);
            console.log(`Saved question ${question.id}:`, normalizedValue);
        } catch (error) {
            console.error(`Failed to save question ${question.id}:`, error);
            alert(`Failed to save answer. Please try again.`);
        } finally {
            setSaving(false);
        }
    };

    // Debounced save on change for text/number/textarea
    React.useEffect(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Get current saved value from question
        const currentSavedValue = question.response_value;
        let currentSavedStr = '';
        if (currentSavedValue !== null && currentSavedValue !== undefined) {
            if (typeof currentSavedValue === 'boolean') {
                currentSavedStr = currentSavedValue ? 'true' : 'false';
            } else {
                currentSavedStr = String(currentSavedValue).trim();
            }
        }

        const newValueStr = String(value ?? '').trim();

        // Only save if value has actually changed
        if (newValueStr !== currentSavedStr) {
            saveTimeoutRef.current = setTimeout(() => {
                handleSave(value);
            }, 800); // Increased debounce time to avoid too many saves
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [value, question.response_value]);

    const common = {
        className:
            'mt-2 w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2D5016] focus:border-transparent',
    };

    switch (question.response_type) {
        case 'number':
            return (
                <div>
                    <input
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setValue(val);
                            // Also trigger immediate save if user stops typing
                        }}
                        onBlur={(e) => {
                            // Save immediately when user leaves the field
                            const val = e.target.value;
                            if (String(val) !== String(question.response_value ?? '')) {
                                handleSave(val);
                            }
                        }}
                        {...common}
                    />
                    {saving && (
                        <p className="text-xs text-gray-500 mt-1">Saving...</p>
                    )}
                </div>
            );
        case 'yes_no':
        case 'boolean':
            return (
                <div className="mt-2">
                    <select
                        value={value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            // Save as string 'true'/'false' to persist reliably
                            setValue(v);
                            handleSave(v);
                        }}
                        className={common.className}
                    >
                        <option value="">Select</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>
            );
        case 'select':
            // Ensure response_options is an array
            let options = [];
            if (question.response_options) {
                if (Array.isArray(question.response_options)) {
                    options = question.response_options;
                } else if (typeof question.response_options === 'string') {
                    try {
                        options = JSON.parse(question.response_options);
                    } catch (e) {
                        console.error('Failed to parse response_options:', e);
                        options = [];
                    }
                }
            }
            
            return (
                <div className="mt-2">
                    <select
                        value={value ?? ''}
                        onChange={(e) => {
                            setValue(e.target.value);
                            handleSave(e.target.value);
                        }}
                        className={common.className}
                    >
                        <option value="">Select</option>
                        {options.map((opt) => (
                            <option key={String(opt)} value={opt}>
                                {String(opt)}
                            </option>
                        ))}
                    </select>
                </div>
            );
        case 'long_text':
        case 'textarea':
            return (
                <div>
                    <textarea
                        value={value ?? ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setValue(val);
                        }}
                        onBlur={(e) => {
                            // Save immediately when user leaves the field
                            const val = e.target.value;
                            if (String(val).trim() !== String(question.response_value ?? '').trim()) {
                                handleSave(val);
                            }
                        }}
                        rows={4}
                        {...common}
                    />
                    {saving && (
                        <p className="text-xs text-gray-500 mt-1">Saving...</p>
                    )}
                </div>
            );
        case 'text':
        default:
            return (
                <div>
                    <input
                        type="text"
                        value={value ?? ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setValue(val);
                        }}
                        onBlur={(e) => {
                            // Save immediately when user leaves the field
                            const val = e.target.value;
                            if (String(val).trim() !== String(question.response_value ?? '').trim()) {
                                handleSave(val);
                            }
                        }}
                        {...common}
                    />
                    {saving && (
                        <p className="text-xs text-gray-500 mt-1">Saving...</p>
                    )}
                </div>
            );
    }
}
