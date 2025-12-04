import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleProtectedRoute from './components/ModuleProtectedRoute';

// Loading component for Suspense
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
        </div>
    </div>
);

// Critical components - load immediately (Login, Layout)
import Login from './pages/Login';

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Residents = lazy(() => import('./pages/Residents'));
const MyResidentsPage = lazy(() => import('./pages/caregiver/MyResidentsPage'));
const ResidentDetailPage = lazy(() => import('./pages/caregiver/ResidentDetailPage'));
const Appointments = lazy(() => import('./pages/Appointments'));
const CreateAppointment = lazy(() => import('./pages/CreateAppointment'));
const Vitals = lazy(() => import('./pages/Vitals'));
const Medications = lazy(() => import('./pages/Medications'));
const MedicationHistory = lazy(() => import('./pages/MedicationHistory'));
const CaregiverMedicationsResidents = lazy(() => import('./pages/caregiver/CaregiverMedicationsResidents'));
const ResidentMedicationsPage = lazy(() => import('./pages/caregiver/ResidentMedicationsPage'));
const Reports = lazy(() => import('./pages/Reports'));
const Assessments = lazy(() => import('./pages/Assessments'));
const AssessmentDetail = lazy(() => import('./pages/AssessmentDetail'));
const AssessmentReview = lazy(() => import('./pages/AssessmentReview'));
const Sleep = lazy(() => import('./pages/Sleep'));
const SleepPatterns = lazy(() => import('./pages/SleepPatterns'));
const ViewVitals = lazy(() => import('./pages/ViewVitals'));
const Facilities = lazy(() => import('./pages/Facilities'));
const FacilityCreate = lazy(() => import('./pages/FacilityCreate'));
const FacilityView = lazy(() => import('./pages/FacilityView'));
const FacilityEdit = lazy(() => import('./pages/FacilityEdit'));
const Branches = lazy(() => import('./pages/Branches'));
const VitalRanges = lazy(() => import('./pages/VitalRanges'));
const LeaveRequests = lazy(() => import('./pages/LeaveRequests'));
const Roles = lazy(() => import('./pages/Roles'));
const Users = lazy(() => import('./pages/Users'));
const UserCreate = lazy(() => import('./pages/UserCreate'));
const UserEdit = lazy(() => import('./pages/UserEdit'));
const EmployeeDocuments = lazy(() => import('./pages/EmployeeDocuments'));
const Drugs = lazy(() => import('./pages/Drugs'));
const Profile = lazy(() => import('./pages/Profile'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const DeactivatedRecords = lazy(() => import('./pages/DeactivatedRecords'));
const Housekeeping = lazy(() => import('./pages/Housekeeping'));
const HousekeepingSchedule = lazy(() => import('./pages/HousekeepingSchedule'));
const HousekeepingDashboard = lazy(() => import('./pages/HousekeepingDashboard'));
const MedicationDeliveries = lazy(() => import('./pages/MedicationDeliveries'));
const GroceryStatus = lazy(() => import('./pages/GroceryStatus'));
const FireDrills = lazy(() => import('./pages/FireDrills'));
const PharmacySuppliers = lazy(() => import('./pages/PharmacySuppliers'));
const PharmacyInventory = lazy(() => import('./pages/PharmacyInventory'));
const PharmacyOrders = lazy(() => import('./pages/PharmacyOrders'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminSettings = lazy(() => import('./pages/SuperAdminSettings'));
const SuperAdminEmailSettings = lazy(() => import('./pages/super-admin/EmailSettings'));
const SuperAdminSecuritySettings = lazy(() => import('./pages/super-admin/SecuritySettings'));
const SuperAdminGeneralSettings = lazy(() => import('./pages/super-admin/GeneralSettings'));
const SuperAdminNotificationSettings = lazy(() => import('./pages/super-admin/NotificationSettings'));
const SuperAdminDatabaseSettings = lazy(() => import('./pages/super-admin/DatabaseSettings'));
const SuperAdminServerSettings = lazy(() => import('./pages/super-admin/ServerSettings'));
const FacilityRegistrations = lazy(() => import('./pages/FacilityRegistrations'));
const Permissions = lazy(() => import('./pages/Permissions'));
const ExpenseCategories = lazy(() => import('./pages/ExpenseCategories'));
const Expenses = lazy(() => import('./pages/Expenses'));
const BillingInvoices = lazy(() => import('./pages/BillingInvoices'));
const ExpenseReports = lazy(() => import('./pages/reports/ExpenseReports'));
const Incidents = lazy(() => import('./pages/Incidents'));
const ChartReports = lazy(() => import('./pages/reports/ChartReports'));
const ResidentCharts = lazy(() => import('./pages/reports/ResidentCharts'));
const VitalsCharts = lazy(() => import('./pages/reports/VitalsCharts'));
const VitalsReports = lazy(() => import('./pages/reports/VitalsReports'));
const AssessmentCharts = lazy(() => import('./pages/reports/AssessmentCharts'));
const AppointmentsCharts = lazy(() => import('./pages/reports/AppointmentsCharts'));
const VitalsHistory = lazy(() => import('./pages/reports/VitalsHistory'));
const SleepCharts = lazy(() => import('./pages/reports/SleepCharts'));
const StaffCharts = lazy(() => import('./pages/reports/StaffCharts'));
const PublicStaffClockIn = lazy(() => import('./pages/public/PublicStaffClockIn'));
const StaffClock = lazy(() => import('./pages/StaffClock'));
const StaffClockInsView = lazy(() => import('./pages/StaffClockInsView'));
const ResidentSignOut = lazy(() => import('./pages/ResidentSignOut'));
const ResidentSignOutsView = lazy(() => import('./pages/ResidentSignOutsView'));
const Visitors = lazy(() => import('./pages/Visitors'));
const VisitorsView = lazy(() => import('./pages/VisitorsView'));
const CheckInDashboard = lazy(() => import('./pages/CheckInDashboard'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Features = lazy(() => import('./pages/public/Features'));
const Pricing = lazy(() => import('./pages/public/Pricing'));
const Modules = lazy(() => import('./pages/public/Modules'));
const Security = lazy(() => import('./pages/public/Security'));
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Support = lazy(() => import('./pages/public/Support'));
const Careers = lazy(() => import('./pages/public/Careers'));
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/public/TermsOfService'));
const HIPAACompliance = lazy(() => import('./pages/public/HIPAACompliance'));
const CookiePolicy = lazy(() => import('./pages/public/CookiePolicy'));

function App() {
    // Make toast available globally for backward compatibility
    useEffect(() => {
        window.toast = toast;
        return () => {
            delete window.toast;
        };
    }, []);

    return (
        <Routes>
            <Route path="/" element={<Suspense fallback={<PageLoader />}><Welcome /></Suspense>} />
            <Route path="/login" element={<Login />} />
            <Route path="/features" element={<Suspense fallback={<PageLoader />}><Features /></Suspense>} />
            <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><Pricing /></Suspense>} />
            <Route path="/modules" element={<Suspense fallback={<PageLoader />}><Modules /></Suspense>} />
            <Route path="/security" element={<Suspense fallback={<PageLoader />}><Security /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
            <Route path="/support" element={<Suspense fallback={<PageLoader />}><Support /></Suspense>} />
            <Route path="/careers" element={<Suspense fallback={<PageLoader />}><Careers /></Suspense>} />
            <Route path="/privacy-policy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
            <Route path="/terms-of-service" element={<Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>} />
            <Route path="/hipaa-compliance" element={<Suspense fallback={<PageLoader />}><HIPAACompliance /></Suspense>} />
            <Route path="/cookie-policy" element={<Suspense fallback={<PageLoader />}><CookiePolicy /></Suspense>} />
            <Route path="/staff/clock-in" element={<Suspense fallback={<PageLoader />}><PublicStaffClockIn /></Suspense>} />
            {/* Public welcome page at /app */}
            <Route path="/app" element={<Suspense fallback={<PageLoader />}><Welcome /></Suspense>} />
            <Route
                path="/app/*"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* Main Pages */}
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                <Route path="assessments" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="assessments"><Assessments /></ModuleProtectedRoute></Suspense>} />
                <Route path="assessments/:id" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="assessments"><AssessmentDetail /></ModuleProtectedRoute></Suspense>} />
                <Route path="assessments/:id/review" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="assessments"><AssessmentReview /></ModuleProtectedRoute></Suspense>} />
                <Route path="appointments" element={<Suspense fallback={<PageLoader />}><Appointments /></Suspense>} />
                <Route path="appointments/create/:residentId" element={<Suspense fallback={<PageLoader />}><CreateAppointment /></Suspense>} />
                <Route path="vitals" element={<Suspense fallback={<PageLoader />}><Vitals /></Suspense>} />
                <Route path="view-vitals" element={<Suspense fallback={<PageLoader />}><ViewVitals /></Suspense>} />
                <Route path="medications" element={<Suspense fallback={<PageLoader />}><Medications /></Suspense>} />
                <Route path="medications/residents" element={<Suspense fallback={<PageLoader />}><CaregiverMedicationsResidents /></Suspense>} />
                <Route path="medications/residents/:residentId" element={<Suspense fallback={<PageLoader />}><ResidentMedicationsPage /></Suspense>} />
                <Route path="medication-history" element={<Suspense fallback={<PageLoader />}><MedicationHistory /></Suspense>} />
                <Route path="medication-deliveries" element={<Suspense fallback={<PageLoader />}><MedicationDeliveries /></Suspense>} />
                <Route path="grocery-status" element={<Suspense fallback={<PageLoader />}><GroceryStatus /></Suspense>} />
                <Route path="fire-drills" element={<Suspense fallback={<PageLoader />}><FireDrills /></Suspense>} />
                <Route path="incidents" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="incidents"><Incidents /></ModuleProtectedRoute></Suspense>} />
                <Route path="pharmacy/suppliers" element={<Suspense fallback={<PageLoader />}><PharmacySuppliers /></Suspense>} />
                <Route path="pharmacy/inventory" element={<Suspense fallback={<PageLoader />}><PharmacyInventory /></Suspense>} />
                <Route path="pharmacy/orders" element={<Suspense fallback={<PageLoader />}><PharmacyOrders /></Suspense>} />
                <Route path="billing/expense-categories" element={<Suspense fallback={<PageLoader />}><ExpenseCategories /></Suspense>} />
                <Route path="billing/expenses" element={<Suspense fallback={<PageLoader />}><Expenses /></Suspense>} />
                <Route path="billing/invoices" element={<Suspense fallback={<PageLoader />}><BillingInvoices /></Suspense>} />
                <Route path="billing/reports" element={<Suspense fallback={<PageLoader />}><ExpenseReports /></Suspense>} />
                <Route path="housekeeping" element={<Suspense fallback={<PageLoader />}><Housekeeping /></Suspense>} />
                <Route path="housekeeping/dashboard" element={<Suspense fallback={<PageLoader />}><HousekeepingDashboard /></Suspense>} />
                <Route path="housekeeping/schedule" element={<Suspense fallback={<PageLoader />}><HousekeepingSchedule /></Suspense>} />
                <Route path="sleep" element={<Suspense fallback={<PageLoader />}><Sleep /></Suspense>} />
                <Route path="sleep-patterns" element={<Suspense fallback={<PageLoader />}><SleepPatterns /></Suspense>} />
                <Route path="leave-requests" element={<Suspense fallback={<PageLoader />}><LeaveRequests /></Suspense>} />
                <Route path="check-in-dashboard" element={<Suspense fallback={<PageLoader />}><CheckInDashboard /></Suspense>} />
                <Route path="staff/clock" element={<Suspense fallback={<PageLoader />}><StaffClock /></Suspense>} />
                <Route path="staff/clock-ins" element={<Suspense fallback={<PageLoader />}><StaffClockInsView /></Suspense>} />
                <Route path="residents/sign-out" element={<Suspense fallback={<PageLoader />}><ResidentSignOut /></Suspense>} />
                <Route path="residents/sign-outs/view-all" element={<Suspense fallback={<PageLoader />}><ResidentSignOutsView /></Suspense>} />
                <Route path="visitors" element={<Suspense fallback={<PageLoader />}><Visitors /></Suspense>} />
                <Route path="visitors/view-all" element={<Suspense fallback={<PageLoader />}><VisitorsView /></Suspense>} />
                <Route path="my-residents" element={<Suspense fallback={<PageLoader />}><MyResidentsPage /></Suspense>} />
                <Route path="my-residents/:residentId" element={<Suspense fallback={<PageLoader />}><ResidentDetailPage /></Suspense>} />

                {/* Reports */}
                <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
                <Route path="reports/charts" element={<Suspense fallback={<PageLoader />}><ChartReports /></Suspense>} />
                <Route path="reports/resident-charts" element={<Suspense fallback={<PageLoader />}><ResidentCharts /></Suspense>} />
                <Route path="reports/vitals-charts" element={<Suspense fallback={<PageLoader />}><VitalsCharts /></Suspense>} />
                <Route path="reports/vitals-reports" element={<Suspense fallback={<PageLoader />}><VitalsReports /></Suspense>} />
                <Route path="reports/assessment-charts" element={<Suspense fallback={<PageLoader />}><AssessmentCharts /></Suspense>} />
                <Route path="reports/appointments-charts" element={<Suspense fallback={<PageLoader />}><AppointmentsCharts /></Suspense>} />
                <Route path="reports/vitals-history" element={<Suspense fallback={<PageLoader />}><VitalsHistory /></Suspense>} />
                <Route path="reports/sleep-charts" element={<Suspense fallback={<PageLoader />}><SleepCharts /></Suspense>} />
                <Route path="reports/staff-charts" element={<Suspense fallback={<PageLoader />}><StaffCharts /></Suspense>} />

                {/* Super Admin */}
                <Route path="super-admin/dashboard" element={<Suspense fallback={<PageLoader />}><SuperAdminDashboard /></Suspense>} />
                <Route path="super-admin/settings" element={<Suspense fallback={<PageLoader />}><SuperAdminSettings /></Suspense>} />
                <Route path="super-admin/settings/email" element={<Suspense fallback={<PageLoader />}><SuperAdminEmailSettings /></Suspense>} />
                <Route path="super-admin/settings/security" element={<Suspense fallback={<PageLoader />}><SuperAdminSecuritySettings /></Suspense>} />
                <Route path="super-admin/settings/general" element={<Suspense fallback={<PageLoader />}><SuperAdminGeneralSettings /></Suspense>} />
                <Route path="super-admin/settings/notification" element={<Suspense fallback={<PageLoader />}><SuperAdminNotificationSettings /></Suspense>} />
                <Route path="super-admin/settings/database" element={<Suspense fallback={<PageLoader />}><SuperAdminDatabaseSettings /></Suspense>} />
                <Route path="super-admin/settings/server" element={<Suspense fallback={<PageLoader />}><SuperAdminServerSettings /></Suspense>} />
                <Route path="super-admin/facility-registrations" element={<Suspense fallback={<PageLoader />}><FacilityRegistrations /></Suspense>} />
                <Route path="super-admin/facilities" element={<Suspense fallback={<PageLoader />}><Facilities /></Suspense>} />
                <Route path="super-admin/facilities/create" element={<Suspense fallback={<PageLoader />}><FacilityCreate /></Suspense>} />
                <Route path="super-admin/facilities/:id" element={<Suspense fallback={<PageLoader />}><FacilityView /></Suspense>} />
                <Route path="super-admin/facilities/:id/edit" element={<Suspense fallback={<PageLoader />}><FacilityEdit /></Suspense>} />
                <Route path="super-admin/permissions" element={<Suspense fallback={<PageLoader />}><Permissions /></Suspense>} />

                {/* Administration */}
                <Route path="administration/residents" element={<Suspense fallback={<PageLoader />}><Residents /></Suspense>} />
                {/* Facilities route removed - only accessible via /super-admin/facilities */}
                <Route path="administration/branches" element={<Suspense fallback={<PageLoader />}><Branches /></Suspense>} />
                <Route path="administration/vital-ranges" element={<Suspense fallback={<PageLoader />}><VitalRanges /></Suspense>} />
                <Route path="administration/leave-requests" element={<Suspense fallback={<PageLoader />}><LeaveRequests /></Suspense>} />
                <Route path="administration/roles" element={<Suspense fallback={<PageLoader />}><Roles /></Suspense>} />
                <Route path="administration/facility-permissions" element={<Suspense fallback={<PageLoader />}><Permissions /></Suspense>} />
                <Route path="administration/users" element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />
                <Route path="administration/users/create" element={<Suspense fallback={<PageLoader />}><UserCreate /></Suspense>} />
                <Route path="administration/users/:id/edit" element={<Suspense fallback={<PageLoader />}><UserEdit /></Suspense>} />
                <Route path="administration/drugs" element={<Suspense fallback={<PageLoader />}><Drugs /></Suspense>} />
                <Route path="administration/employee-documents" element={<Suspense fallback={<PageLoader />}><EmployeeDocuments /></Suspense>} />
                <Route path="administration/activity-logs" element={<Suspense fallback={<PageLoader />}><ActivityLogs /></Suspense>} />
                <Route path="administration/deactivated" element={<Suspense fallback={<PageLoader />}><DeactivatedRecords /></Suspense>} />

                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
            {/* Keep public routes before catch-all to prevent redirects */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;

