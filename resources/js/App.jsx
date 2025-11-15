import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import MyResidentsPage from './pages/caregiver/MyResidentsPage';
import ResidentDetailPage from './pages/caregiver/ResidentDetailPage';
import Appointments from './pages/Appointments';
import CreateAppointment from './pages/CreateAppointment';
import Vitals from './pages/Vitals';
import Medications from './pages/Medications';
import MedicationHistory from './pages/MedicationHistory';
import CaregiverMedicationsResidents from './pages/caregiver/CaregiverMedicationsResidents';
import ResidentMedicationsPage from './pages/caregiver/ResidentMedicationsPage';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// New pages to create
import Assessments from './pages/Assessments';
import AssessmentDetail from './pages/AssessmentDetail';
import AssessmentReview from './pages/AssessmentReview';
import Sleep from './pages/Sleep';
import SleepPatterns from './pages/SleepPatterns';
import ViewVitals from './pages/ViewVitals';
import Facilities from './pages/Facilities';
import Branches from './pages/Branches';
import VitalRanges from './pages/VitalRanges';
import LeaveRequests from './pages/LeaveRequests';
import Roles from './pages/Roles';
import Users from './pages/Users';
import EmployeeDocuments from './pages/EmployeeDocuments';
import Profile from './pages/Profile';
import ActivityLogs from './pages/ActivityLogs';
import DeactivatedRecords from './pages/DeactivatedRecords';
import Housekeeping from './pages/Housekeeping';
import HousekeepingSchedule from './pages/HousekeepingSchedule';
import HousekeepingDashboard from './pages/HousekeepingDashboard';

// Report sub-pages
import ChartReports from './pages/reports/ChartReports';
import ResidentCharts from './pages/reports/ResidentCharts';
import VitalsCharts from './pages/reports/VitalsCharts';
import VitalsReports from './pages/reports/VitalsReports';
import AssessmentCharts from './pages/reports/AssessmentCharts';
import AppointmentsCharts from './pages/reports/AppointmentsCharts';
import VitalsHistory from './pages/reports/VitalsHistory';
import SleepCharts from './pages/reports/SleepCharts';
import StaffCharts from './pages/reports/StaffCharts';

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* Main Pages */}
                <Route path="profile" element={<Profile />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="assessments/:id" element={<AssessmentDetail />} />
                <Route path="assessments/:id/review" element={<AssessmentReview />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="appointments/create/:residentId" element={<CreateAppointment />} />
                <Route path="vitals" element={<Vitals />} />
                <Route path="view-vitals" element={<ViewVitals />} />
                <Route path="medications" element={<Medications />} />
                <Route path="medications/residents" element={<CaregiverMedicationsResidents />} />
                <Route path="medications/residents/:residentId" element={<ResidentMedicationsPage />} />
                <Route path="medication-history" element={<MedicationHistory />} />
                <Route path="housekeeping" element={<Housekeeping />} />
                <Route path="housekeeping/dashboard" element={<HousekeepingDashboard />} />
                <Route path="housekeeping/schedule" element={<HousekeepingSchedule />} />
                <Route path="sleep" element={<Sleep />} />
                <Route path="sleep-patterns" element={<SleepPatterns />} />
                <Route path="leave-requests" element={<LeaveRequests />} />
                <Route path="my-residents" element={<MyResidentsPage />} />
                <Route path="my-residents/:residentId" element={<ResidentDetailPage />} />

                {/* Reports */}
                <Route path="reports" element={<Reports />} />
                <Route path="reports/charts" element={<ChartReports />} />
                <Route path="reports/resident-charts" element={<ResidentCharts />} />
                <Route path="reports/vitals-charts" element={<VitalsCharts />} />
                <Route path="reports/vitals-reports" element={<VitalsReports />} />
                <Route path="reports/assessment-charts" element={<AssessmentCharts />} />
                <Route path="reports/appointments-charts" element={<AppointmentsCharts />} />
                <Route path="reports/vitals-history" element={<VitalsHistory />} />
                <Route path="reports/sleep-charts" element={<SleepCharts />} />
                <Route path="reports/staff-charts" element={<StaffCharts />} />

                {/* Administration */}
                <Route path="administration/residents" element={<Residents />} />
                <Route path="administration/facilities" element={<Facilities />} />
                <Route path="administration/branches" element={<Branches />} />
                <Route path="administration/vital-ranges" element={<VitalRanges />} />
                <Route path="administration/leave-requests" element={<LeaveRequests />} />
                <Route path="administration/roles" element={<Roles />} />
                <Route path="administration/users" element={<Users />} />
                <Route path="administration/employee-documents" element={<EmployeeDocuments />} />
                <Route path="administration/activity-logs" element={<ActivityLogs />} />
                <Route path="administration/deactivated" element={<DeactivatedRecords />} />

                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export default App;

