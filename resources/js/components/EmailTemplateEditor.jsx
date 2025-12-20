import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, Code, Plus } from 'lucide-react';
import api from '../services/api';
import { useToastContext } from '../contexts/ToastContext';

// Variable templates for different notification types
const VARIABLE_TEMPLATES = {
  task_assignment: [
    'taskTitle',
    'areaName',
    'scheduledDate',
    'assignedByName',
    'estimatedMinutes',
    'status',
    'taskInstructions',
  ],
  late_medication: ['residentName', 'medicationName', 'scheduledTime'],
  appointment_reminder: [
    'residentName',
    'appointmentType',
    'date',
    'time',
    'eventType',
    'status',
    'location',
    'notes',
  ],
  incident_alert: [
    'incidentNumber',
    'incidentType',
    'residentName',
    'reportedByName',
    'incidentDate',
    'location',
    'severity',
    'priority',
    'status',
    'description',
  ],
  // Add more as needed
};

export default function EmailTemplateEditor({
  facilityId,
  notificationType,
  template,
  onSave,
  availableVariables = [],
}) {
  const toast = useToastContext();
  const [subject, setSubject] = useState(template?.subject_template || '');
  const [htmlContent, setHtmlContent] = useState(template?.html_template || '');
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('html'); // 'html' or 'code'

  const variables = availableVariables.length > 0 
    ? availableVariables 
    : (VARIABLE_TEMPLATES[notificationType] || []);

  const previewMutation = useMutation({
    mutationFn: async (sampleVariables) => {
      const response = await api.post(
        `/facilities/${facilityId}/email-templates/${notificationType}/preview`,
        { sample_variables: sampleVariables }
      );
      return response.data;
    },
  });

  useEffect(() => {
    if (template) {
      setSubject(template.subject_template || '');
      setHtmlContent(template.html_template || '');
    }
  }, [template]);

  const insertVariable = (variable, target = 'html') => {
    const variableText = `{{${variable}}}`;
    if (target === 'subject') {
      setSubject((prev) => prev + variableText);
    } else {
      setHtmlContent((prev) => prev + variableText);
    }
  };

  const handlePreview = async () => {
    // Generate sample variables
    const sampleVariables = {};
    variables.forEach((varName) => {
      sampleVariables[varName] = `Sample ${varName}`;
    });

    try {
      await previewMutation.mutateAsync(sampleVariables);
      setShowPreview(true);
    } catch (error) {
      toast.showToast('Failed to preview template', 'error');
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        subject_template: subject,
        html_template: htmlContent,
        is_active: template?.is_active ?? true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject Template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Subject Template
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., New Task: {{taskTitle}}"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
          <div className="flex gap-1.5">
            {variables.slice(0, 3).map((varName) => (
              <button
                key={varName}
                type="button"
                onClick={() => insertVariable(varName, 'subject')}
                className="px-2.5 py-1 text-xs font-medium bg-white text-gray-700 hover:bg-[var(--theme-primary)] hover:text-white rounded border border-gray-300 hover:border-[var(--theme-primary)] transition-colors"
                title={`Insert {{${varName}}}`}
              >
                {varName}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Use variables like {'{{variableName}}'} in the subject
        </p>
      </div>

      {/* HTML Template Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            HTML Email Template
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(previewMode === 'html' ? 'code' : 'html')}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              {previewMode === 'html' ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {previewMode === 'html' ? 'Code' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="px-3 py-1.5 text-xs bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          </div>
        </div>

        {/* Variable Insertion Buttons */}
        <div className="mb-3 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-medium text-gray-700 w-full mb-1">Insert Variables:</span>
          {variables.map((varName) => (
            <button
              key={varName}
              type="button"
              onClick={() => insertVariable(varName)}
              className="px-3 py-1.5 text-sm font-medium bg-white text-gray-800 hover:bg-[var(--theme-primary)] hover:text-white rounded-lg border-2 border-gray-300 hover:border-[var(--theme-primary)] shadow-sm transition-all duration-200 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {varName}
            </button>
          ))}
        </div>

        {/* Editor */}
        {previewMode === 'code' ? (
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Enter HTML template with variables like {{taskTitle}}..."
            rows={15}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
        ) : (
          <div className="border border-gray-300 rounded-lg p-4 bg-white min-h-[300px]">
            {showPreview && previewMutation.data?.data ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: previewMutation.data.data.html || htmlContent,
                }}
              />
            ) : (
              <div
                dangerouslySetInnerHTML={{
                  __html: htmlContent || '<p class="text-gray-400">Enter HTML template...</p>',
                }}
              />
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Use HTML and variables like {'{{variableName}}'}. Click variable buttons to insert.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)]"
        >
          Save Template
        </button>
      </div>
    </div>
  );
}

