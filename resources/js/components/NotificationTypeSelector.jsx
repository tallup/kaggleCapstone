import React from 'react';

const NOTIFICATION_TYPES = {
  tasks: {
    label: 'Tasks',
    types: [
      { value: 'task_assignment', label: 'Task Assignment' },
    ],
  },
  medications: {
    label: 'Medications',
    types: [
      { value: 'late_medication', label: 'Late Medication' },
      { value: 'medication_administration', label: 'Medication Administration' },
      { value: 'medication_delivery', label: 'Medication Delivery' },
      { value: 'medication', label: 'Medication' },
    ],
  },
  vitalSigns: {
    label: 'Vital Signs',
    types: [
      { value: 'late_vital_sign', label: 'Late Vital Sign' },
      { value: 'critical_vital_sign', label: 'Critical Vital Sign' },
      { value: 'vital_sign', label: 'Vital Sign' },
    ],
  },
  appointments: {
    label: 'Appointments',
    types: [
      { value: 'appointment_reminder', label: 'Appointment Reminder' },
    ],
  },
  incidents: {
    label: 'Incidents',
    types: [
      { value: 'incident_alert', label: 'Incident Alert' },
    ],
  },
  residents: {
    label: 'Residents',
    types: [
      { value: 'resident_sign_out', label: 'Resident Sign Out' },
    ],
  },
  pharmacy: {
    label: 'Pharmacy',
    types: [
      { value: 'pharmacy_order', label: 'Pharmacy Order' },
      { value: 'pharmacy_supplier', label: 'Pharmacy Supplier' },
    ],
  },
  expenses: {
    label: 'Expenses',
    types: [
      { value: 'expense', label: 'Expense' },
      { value: 'expense_category', label: 'Expense Category' },
    ],
  },
  staff: {
    label: 'Staff',
    types: [
      { value: 'leave_request', label: 'Leave Request' },
      { value: 'staff_clock_in', label: 'Staff Clock In' },
      { value: 'employee_document', label: 'Employee Document' },
    ],
  },
  other: {
    label: 'Other',
    types: [
      { value: 'visitor', label: 'Visitor' },
      { value: 'fire_drill', label: 'Fire Drill' },
      { value: 'grocery_status', label: 'Grocery Status' },
      { value: 'sleep_record', label: 'Sleep Record' },
      { value: 'assessment', label: 'Assessment' },
    ],
  },
};

export default function NotificationTypeSelector({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ${className}`}
    >
      <option value="">Select notification type...</option>
      {Object.entries(NOTIFICATION_TYPES).map(([moduleKey, module]) => (
        <optgroup key={moduleKey} label={module.label}>
          {module.types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export { NOTIFICATION_TYPES };

