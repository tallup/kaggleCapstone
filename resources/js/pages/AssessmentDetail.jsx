import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ArrowLeft, ClipboardList, Calendar, User, CheckCircle, AlertCircle } from 'lucide-react';
import logger from '../utils/logger';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { isCaregiverRole } from '../utils/userRoles';

export default function AssessmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => (await api.get('/user')).data,
        staleTime: 60_000,
    });

    const readOnly = isCaregiverRole(currentUser?.role);

    const { data, isLoading, error, isSuccess } = useQuery({
        queryKey: ['assessment-detail', id],
        queryFn: async () => (await api.get(`/assessments/${id}`)).data,
    });

    const saveMutation = useMutation({
        mutationFn: async ({ questionId, value }) => {
            const response = await api.patch(`/assessments/${id}/questions/${questionId}`, { response_value: value });
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
            logger.error(`Save error for question ${vars.questionId}:`, err);
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

    // Pre-fill demographic and medical history questions from resident data
    const hasPrefilledRef = React.useRef(new Set()); // Track which assessment IDs have been pre-filled
    
    React.useEffect(() => {
        // Only run if query is successful and data is loaded
        if (isLoading || !isSuccess || isLoadingUser || readOnly) {
            return;
        }

        if (!data || !data.resident || !data.sections) {
            return;
        }

        // Skip if we've already pre-filled this assessment
        if (hasPrefilledRef.current.has(data.id)) {
            return;
        }

        const resident = data.resident;
        const questionsToPrefill = [];

        // Helper function to normalize question text for matching
        const normalizeQuestionText = (text) => {
            if (!text) return '';
            return String(text).toLowerCase().trim().replace(/[?]/g, '').replace(/\s+/g, ' ');
        };

        // Helper function to calculate age from date of birth
        const calculateAge = (dateOfBirth) => {
            if (!dateOfBirth) return null;
            try {
                const birth = new Date(dateOfBirth);
                const now = new Date();
                let age = now.getFullYear() - birth.getFullYear();
                const monthDiff = now.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
                    age -= 1;
                }
                return age;
            } catch (error) {
                logger.error('Error calculating age:', error);
                return null;
            }
        };

        // Helper function to get resident value for a question
        const getResidentValue = (questionText, questionType) => {
            if (!questionText) return null;
            const normalized = normalizeQuestionText(questionText);
            
            // Age calculation - check for age-related questions
            if (normalized.includes('age') || 
                (normalized.includes('what is the resident') && normalized.includes('age')) ||
                (normalized.includes('resident') && normalized.includes('age'))) {
                const age = calculateAge(resident.date_of_birth);
                return age !== null ? String(age) : null;
            }
            
            // Demographic Information mappings - handle multiple question text variations
            if ((normalized.includes('what is the resident') && normalized.includes('full name')) ||
                (normalized.includes('resident') && normalized.includes('name') && !normalized.includes('emergency'))) {
                return resident.name || `${resident.first_name || ''} ${resident.last_name || ''}`.trim() || null;
            }
            if (normalized.includes('date of birth') || normalized.includes('birth date')) {
                if (resident.date_of_birth) {
                    const date = new Date(resident.date_of_birth);
                    return date.toISOString().split('T')[0];
                }
                return null;
            }
            if ((normalized.includes('gender') && !normalized.includes('marital')) ||
                (normalized.includes('what is the resident') && normalized.includes('gender'))) {
                return resident.gender || null;
            }
            if (normalized.includes('emergency contact name') || 
                (normalized.includes('emergency') && normalized.includes('name'))) {
                return resident.emergency_contact_name || null;
            }
            if (normalized.includes('emergency contact phone') || 
                (normalized.includes('emergency') && normalized.includes('phone'))) {
                return resident.emergency_contact_phone || null;
            }

            // Medical History mappings - handle multiple question text variations
            if (normalized.includes('primary diagnosis') || 
                (normalized.includes('diagnosis') && !normalized.includes('secondary'))) {
                return resident.diagnosis || null;
            }
            if (normalized.includes('known allergies') || 
                (normalized.includes('allergies') && !normalized.includes('present'))) {
                if (resident.allergies) {
                    if (Array.isArray(resident.allergies)) {
                        return resident.allergies.join(', ');
                    }
                    return String(resident.allergies);
                }
                return null;
            }
            if (normalized.includes('current medications') || 
                normalized.includes('list current medications') ||
                (normalized.includes('medications') && !normalized.includes('allergies'))) {
                if (resident.medications) {
                    if (Array.isArray(resident.medications)) {
                        return resident.medications.join(', ');
                    }
                    return String(resident.medications);
                }
                return null;
            }
            if (normalized.includes('physician name') || 
                (normalized.includes('physician') && normalized.includes('name'))) {
                return resident.primary_care_doctor || resident.physician_name || null;
            }
            if (normalized.includes('physician phone') || 
                (normalized.includes('physician') && normalized.includes('phone'))) {
                return resident.pep_or_doctor || null;
            }

            return null;
        };

        // Process each section
        data.sections.forEach((section) => {
            // Only process medical_history sections (skip demographic section entirely)
            const title = (section.title || section.section_title || '').toLowerCase();
            if (!section.questions || section.section_type !== 'medical_history' || title === 'demographic information') {
                return;
            }

            section.questions.forEach((question) => {
                const currentValue = question.response_value;
                const isEmpty = !currentValue || 
                    currentValue === null || 
                    currentValue === undefined || 
                    String(currentValue).trim() === '' ||
                    String(currentValue).trim() === 'null' ||
                    String(currentValue).trim() === 'undefined';
                
                // Only pre-fill if question doesn't have a response value yet
                if (isEmpty) {
                    const residentValue = getResidentValue(question.question_text, question.response_type);
                    
                    if (residentValue !== null && residentValue !== undefined && String(residentValue).trim() !== '') {
                        questionsToPrefill.push({
                            questionId: question.id,
                            value: String(residentValue).trim(),
                        });
                    }
                }
            });
        });

        // Save all pre-filled questions
        if (questionsToPrefill.length > 0) {
            hasPrefilledRef.current.add(data.id);
            
            // Save questions sequentially to avoid race conditions
            const saveQuestions = async () => {
                for (const { questionId, value } of questionsToPrefill) {
                    try {
                        await saveMutation.mutateAsync({ questionId, value });
                    } catch (err) {
                        logger.error(`AssessmentDetail: Failed to pre-fill question ${questionId}:`, err);
                        // Continue with other questions even if one fails
                    }
                }
                
                setTimeout(() => {
                    queryClient.invalidateQueries(['assessment-detail', id]);
                }, 500);
            };
            
            saveQuestions().catch(err => {
                logger.error('AssessmentDetail: Error in pre-fill process:', err);
                // Remove from set so it can retry
                hasPrefilledRef.current.delete(data.id);
            });
        } else {
            hasPrefilledRef.current.add(data.id);
        }
    }, [data, isLoading, isSuccess, isLoadingUser, readOnly, saveMutation, queryClient, id]); // Dependencies - include isSuccess to ensure data is loaded

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

    const handleConfirmSubmitForReview = () => {
        submitMutation.mutate('reviewed', { onSuccess: () => setSubmitConfirmOpen(false) });
    };

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

    return (
        <>
            <ConfirmDialog
                isOpen={submitConfirmOpen}
                onClose={() => !submitMutation.isPending && setSubmitConfirmOpen(false)}
                onConfirm={handleConfirmSubmitForReview}
                title="Submit for review?"
                description="You can continue editing later if needed. This will move the assessment to reviewed status."
                confirmLabel="Submit"
                cancelLabel="Cancel"
                variant="primary"
                isPending={submitMutation.isPending}
            />
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
                {!readOnly && assessment.status !== 'approved' && assessment.status !== 'archived' && (
                    <button
                        type="button"
                        onClick={() => setSubmitConfirmOpen(true)}
                        disabled={submitMutation.isPending}
                        className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
                            overallProgress >= 75 ? 'bg-[var(--theme-primary)]' :
                            overallProgress >= 50 ? 'bg-yellow-500' :
                            'bg-orange-500'
                        }`}
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {readOnly
                        ? 'You are viewing this assessment in read-only mode.'
                        : 'You can save your progress and return anytime to complete the assessment.'}
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-3">
                        <ClipboardList className="w-5 h-5 text-[var(--theme-primary)]" />
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
                    assessment.sections
                        .filter((section) => {
                            const title = (section.title || section.section_title || '').toLowerCase();
                            return section.section_type !== 'demographic' && title !== 'demographic information';
                        })
                        .map((section) => {
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
                                            sectionProgress >= 75 ? 'bg-[var(--theme-primary)]' :
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
                                                readOnly={readOnly}
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
        </>
    );
}

function QuestionInput({ question, onSave, readOnly = false }) {
    const initialValue = question.response_value ?? '';
    const [value, setValue] = React.useState(initialValue);
    const [saving, setSaving] = React.useState(false);
    const saveTimeoutRef = React.useRef(null);

    // Check if this is an age-related question
    const isAgeQuestion = React.useMemo(() => {
        if (!question.question_text) return false;
        const normalized = String(question.question_text).toLowerCase().trim();
        return normalized.includes('age') || 
               (normalized.includes('what is the resident') && normalized.includes('age')) ||
               (normalized.includes('resident') && normalized.includes('age'));
    }, [question.question_text]);

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
        } catch (error) {
            logger.error(`Failed to save question ${question.id}:`, error);
            alert(`Failed to save answer. Please try again.`);
        } finally {
            setSaving(false);
        }
    };

    // Debounced save on change for text/number/textarea
    React.useEffect(() => {
        if (readOnly) {
            return;
        }
        // Skip auto-save for read-only age questions
        if (isAgeQuestion) {
            return;
        }

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
    }, [value, question.response_value, isAgeQuestion, readOnly]);

    const common = {
        className:
            'mt-2 w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent',
    };

    if (readOnly) {
        const raw = question.response_value;
        let display = '';
        if (raw !== null && raw !== undefined) {
            if (typeof raw === 'boolean') {
                display = raw ? 'Yes' : 'No';
            } else {
                const strVal = String(raw).trim();
                if (strVal === 'true' || strVal === '1') display = 'Yes';
                else if (strVal === 'false' || strVal === '0') display = 'No';
                else display = strVal;
            }
        }
        return (
            <div className="mt-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-900 min-h-[2.5rem]">
                {display ? display : <span className="text-gray-400 italic">No answer provided</span>}
            </div>
        );
    }

    switch (question.response_type) {
        case 'number':
            return (
                <div>
                    <input
                        type="number"
                        value={value ?? ''}
                        readOnly={isAgeQuestion}
                        onChange={(e) => {
                            if (!isAgeQuestion) {
                                const val = e.target.value;
                                setValue(val);
                            }
                        }}
                        onBlur={(e) => {
                            if (!isAgeQuestion) {
                                // Save immediately when user leaves the field
                                const val = e.target.value;
                                if (String(val) !== String(question.response_value ?? '')) {
                                    handleSave(val);
                                }
                            }
                        }}
                        className={`${common.className} ${isAgeQuestion ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        title={isAgeQuestion ? 'Age is automatically calculated from date of birth' : ''}
                    />
                    {isAgeQuestion && (
                        <p className="text-xs text-gray-500 mt-1 italic">Auto-calculated from date of birth</p>
                    )}
                    {saving && !isAgeQuestion && (
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
                        logger.error('Failed to parse response_options:', e);
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
