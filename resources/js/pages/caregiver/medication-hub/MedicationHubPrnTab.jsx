import ResidentMedicationsPage from '../ResidentMedicationsPage';

/**
 * Medication Hub — PRN tab: same administration stack as the Medications list, scoped to PRN-only UX.
 */
export default function MedicationHubPrnTab() {
    return <ResidentMedicationsPage embedded variant="prn" />;
}
