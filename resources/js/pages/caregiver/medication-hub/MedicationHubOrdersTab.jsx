import React from 'react';
import { useParams } from 'react-router-dom';
import ResidentDocuments from '../../../components/ResidentDocuments';

/**
 * Physician / order documents — full resident document list with filters.
 * Future: default filter to “medical” or a dedicated order document type.
 */
export default function MedicationHubOrdersTab() {
    const { residentId } = useParams();
    if (!residentId) {
        return <p className="text-sm text-gray-500">Missing resident.</p>;
    }
    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-500">
                Upload and organize physician orders here. Use the type filter to focus on medical documents.
            </p>
            <ResidentDocuments residentId={residentId} />
        </div>
    );
}
