import React from 'react';
import SectionLayout from '../../components/SectionLayout';

/**
 * Reports area: child routes only (no persistent section tab strip — portal stays minimal).
 */
export default function ReportsSectionLayout() {
    return <SectionLayout title="Reports" tabs={[]} showTabBar={false} />;
}
