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
import FacilityCreate from './pages/FacilityCreate';
import FacilityEdit from './pages/FacilityEdit';
import Branches from './pages/Branches';
import VitalRanges from './pages/VitalRanges';
import LeaveRequests from './pages/LeaveRequests';
import Roles from './pages/Roles';
import Users from './pages/Users';
import EmployeeDocuments from './pages/EmployeeDocuments';
import Drugs from './pages/Drugs';
import Profile from './pages/Profile';
import ActivityLogs from './pages/ActivityLogs';
import DeactivatedRecords from './pages/DeactivatedRecords';
import Housekeeping from './pages/Housekeeping';
import HousekeepingSchedule from './pages/HousekeepingSchedule';
import HousekeepingDashboard from './pages/HousekeepingDashboard';
import MedicationDeliveries from './pages/MedicationDeliveries';
import GroceryStatus from './pages/GroceryStatus';
import FireDrills from './pages/FireDrills';
import PharmacySuppliers from './pages/PharmacySuppliers';
import PharmacyInventory from './pages/PharmacyInventory';
import PharmacyOrders from './pages/PharmacyOrders';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminSettings from './pages/SuperAdminSettings';
import FacilityRegistrations from './pages/FacilityRegistrations';
import Permissions from './pages/Permissions';

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
                <Route path="medication-deliveries" element={<MedicationDeliveries />} />
                <Route path="grocery-status" element={<GroceryStatus />} />
                <Route path="fire-drills" element={<FireDrills />} />
                <Route path="pharmacy/suppliers" element={<PharmacySuppliers />} />
                <Route path="pharmacy/inventory" element={<PharmacyInventory />} />
                <Route path="pharmacy/orders" element={<PharmacyOrders />} />
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

                {/* Super Admin */}
                <Route path="super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="super-admin/settings" element={<SuperAdminSettings />} />
                <Route path="super-admin/facility-registrations" element={<FacilityRegistrations />} />
                <Route path="super-admin/facilities" element={<Facilities />} />
                <Route path="super-admin/facilities/create" element={<FacilityCreate />} />
                <Route path="super-admin/facilities/:id/edit" element={<FacilityEdit />} />
                <Route path="super-admin/permissions" element={<Permissions />} />

                {/* Administration */}
                <Route path="administration/residents" element={<Residents />} />
                {/* Facilities route removed - only accessible via /super-admin/facilities */}
                <Route path="administration/branches" element={<Branches />} />
                <Route path="administration/vital-ranges" element={<VitalRanges />} />
                <Route path="administration/leave-requests" element={<LeaveRequests />} />
                <Route path="administration/roles" element={<Roles />} />
                <Route path="administration/facility-permissions" element={<Permissions />} />
                <Route path="administration/users" element={<Users />} />
                <Route path="administration/drugs" element={<Drugs />} />
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

