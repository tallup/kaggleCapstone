import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy route: /appointments/create/:residentId → appointments hub with create modal prefilled.
 */
export default function CreateAppointment() {
    const { residentId } = useParams();
    const qs = new URLSearchParams();
    qs.set('openCreate', '1');
    if (residentId) {
        qs.set('residentId', String(residentId));
    }
    return <Navigate to={`/appointments?${qs.toString()}`} replace />;
}
