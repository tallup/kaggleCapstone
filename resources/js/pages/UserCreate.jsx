import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * /team/users/create → users hub opens create modal (optional ?facility_id=).
 */
export default function UserCreate() {
    const [searchParams] = useSearchParams();
    const facilityId = searchParams.get('facility_id');
    const qs = new URLSearchParams();
    qs.set('create', '1');
    if (facilityId) {
        qs.set('facility_id', facilityId);
    }
    return <Navigate to={`/team/users?${qs.toString()}`} replace />;
}
