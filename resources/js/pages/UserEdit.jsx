import { Navigate, useParams } from 'react-router-dom';

/**
 * /team/users/:id/edit → users hub opens edit modal for that user.
 */
export default function UserEdit() {
    const { id } = useParams();
    return <Navigate to={`/team/users?editUserId=${encodeURIComponent(id)}`} replace />;
}
