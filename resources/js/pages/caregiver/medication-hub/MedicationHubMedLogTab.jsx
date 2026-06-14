import React from 'react';
import { useParams } from 'react-router-dom';
import MedicationHistory from '../../MedicationHistory';

export default function MedicationHubMedLogTab() {
    const { residentId } = useParams();
    return (
        <MedicationHistory
            embedded
            embeddedResidentId={residentId != null ? String(residentId) : ''}
        />
    );
}
