import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import logger from './utils/logger';
import { hardReloadWithCacheBust } from './utils/hardReload';
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

// Utility function to retry failed dynamic imports
// This fixes the "Failed to fetch dynamically imported module" error in production
function retryLazyImport(importFn, retries = 5, delay = 300) {
    return new Promise((resolve, reject) => {
        // Check if we've already tried reloading (prevent infinite loops)
        const reloadKey = 'module_reload_attempted';
        const hasReloaded = sessionStorage.getItem(reloadKey);

        // Clear any cached module if this is a retry after reload
        if (hasReloaded && 'caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    if (cacheName.includes('workbox') || cacheName.includes('vite')) {
                        caches.delete(cacheName);
                    }
                });
            }).catch(err => {
                logger.warn('Could not clear cache:', err);
            });
        }

        const attempt = (remainingRetries) => {
            importFn()
                .then((module) => {
                    // Clear reload flag on success
                    if (hasReloaded) {
                        sessionStorage.removeItem(reloadKey);
                    }
                    resolve(module);
                })
                .catch((error) => {
                    // Check for various error types that indicate module load failure
                    const isModuleLoadError = 
                        error?.message?.includes('Failed to fetch dynamically imported module') ||
                        error?.message?.includes('error loading dynamically imported module') ||
                        error?.message?.includes('Loading chunk') ||
                        error?.message?.includes('dynamically imported') ||
                        error?.name === 'ChunkLoadError' ||
                        (error?.name === 'TypeError' && error?.message?.includes('imported'));
                    
                    if (remainingRetries > 0 && isModuleLoadError) {
                        // Exponential backoff for retries
                        const retryNumber = retries - remainingRetries + 1;
                        const backoffDelay = Math.min(delay * Math.pow(2, retryNumber - 1), 2000);
                        logger.warn(`Failed to load module, retrying in ${backoffDelay}ms... (${retryNumber}/${retries})`, error.message);
                        
                        setTimeout(() => attempt(remainingRetries - 1), backoffDelay);
                    } else if (remainingRetries > 0) {
                        // For non-module errors, retry with shorter delay
                        setTimeout(() => attempt(remainingRetries - 1), delay);
                    } else {
                        logger.error('Failed to load module after all retries:', error);
                        // On final failure, try to reload the page only once
                        if (isModuleLoadError && !hasReloaded) {
                            logger.warn('Module load failed, attempting page reload with cache clear...');
                            sessionStorage.setItem(reloadKey, 'true');
                            
                            // Clear service worker cache if available
                            if ('serviceWorker' in navigator) {
                                navigator.serviceWorker.getRegistrations().then(registrations => {
                                    registrations.forEach(registration => {
                                        registration.unregister();
                                    });
                                });
                            }
                            
                            // Small delay before reload to avoid infinite loop
                            setTimeout(() => {
                                hardReloadWithCacheBust();
                            }, 500);
                            return;
                        } else if (hasReloaded) {
                            logger.error('Module load failed even after reload. This may indicate a build or deployment issue.');
                            logger.warn('Attempting to redirect to login page to avoid error screen...');
                            setTimeout(() => {
                                if (window.location.pathname !== '/login') {
                                    window.location.href = '/login';
                                } else {
                                    // If already on login, show error
                                    reject(error);
                                }
                            }, 1000);
                            return; // Don't reject immediately, give redirect time
                        }
                        reject(error);
                    }
                });
        };
        attempt(retries);
    });
}

// Wrapper for lazy loading with retry logic
function lazyWithRetry(importFn, retries = 3) {
    return lazy(() => retryLazyImport(importFn, retries));
}

// Critical components - load immediately (Login, Layout)
import Login from './pages/Login';
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'));

// Lazy load all page components for code splitting with retry logic
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'), 5);
const Residents = lazyWithRetry(() => import('./pages/Residents'));
const MyResidentsPage = lazyWithRetry(() => import('./pages/caregiver/MyResidentsPage'));
const ResidentDetailPage = lazyWithRetry(() => import('./pages/caregiver/ResidentDetailPage'));
const Appointments = lazyWithRetry(() => import('./pages/Appointments'));
const AppointmentsDashboard = lazyWithRetry(() => import('./pages/AppointmentsDashboard'));
const AppointmentDetail = lazyWithRetry(() => import('./pages/AppointmentDetail'));
const CreateAppointment = lazyWithRetry(() => import('./pages/CreateAppointment'));
const Vitals = lazyWithRetry(() => import('./pages/Vitals'));
const Medications = lazyWithRetry(() => import('./pages/Medications'));
const MedicationsReport = lazyWithRetry(() => import('./pages/MedicationsReport'));
const Reminders = lazyWithRetry(() => import('./pages/Reminders'));
const MedicationHistory = lazyWithRetry(() => import('./pages/MedicationHistory'));
const CaregiverMedicationsResidents = lazyWithRetry(() => import('./pages/caregiver/CaregiverMedicationsResidents'));
const ResidentMedicationsPage = lazyWithRetry(() => import('./pages/caregiver/ResidentMedicationsPage'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const Assessments = lazyWithRetry(() => import('./pages/Assessments'));
const AssessmentDetail = lazyWithRetry(() => import('./pages/AssessmentDetail'));
const AssessmentReview = lazyWithRetry(() => import('./pages/AssessmentReview'));
const Sleep = lazyWithRetry(() => import('./pages/Sleep'));
const SleepPatterns = lazyWithRetry(() => import('./pages/SleepPatterns'));
const ViewVitals = lazyWithRetry(() => import('./pages/ViewVitals'));
const Facilities = lazyWithRetry(() => import('./pages/Facilities'));
const FacilityCreate = lazyWithRetry(() => import('./pages/FacilityCreate'));
const FacilityView = lazyWithRetry(() => import('./pages/FacilityView'));
const FacilityEdit = lazyWithRetry(() => import('./pages/FacilityEdit'));
const Branches = lazyWithRetry(() => import('./pages/Branches'));
const VitalRanges = lazyWithRetry(() => import('./pages/VitalRanges'));
const LeaveRequests = lazyWithRetry(() => import('./pages/LeaveRequests'));
const Roles = lazyWithRetry(() => import('./pages/Roles'));
const Users = lazyWithRetry(() => import('./pages/Users'));
const UserCreate = lazyWithRetry(() => import('./pages/UserCreate'));
const UserEdit = lazyWithRetry(() => import('./pages/UserEdit'));
const ViewUser = lazyWithRetry(() => import('./pages/ViewUser'));
const EmployeeDocuments = lazyWithRetry(() => import('./pages/EmployeeDocuments'));
const Drugs = lazyWithRetry(() => import('./pages/Drugs'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const ActivityLogs = lazyWithRetry(() => import('./pages/ActivityLogs'));
const ResidentContacts = lazyWithRetry(() => import('./pages/administration/ResidentContacts'));
const DeactivatedRecords = lazyWithRetry(() => import('./pages/DeactivatedRecords'));
const Housekeeping = lazyWithRetry(() => import('./pages/Housekeeping'));
const HousekeepingSchedule = lazyWithRetry(() => import('./pages/HousekeepingSchedule'));
const HousekeepingDashboard = lazyWithRetry(() => import('./pages/HousekeepingDashboard'));
const MedicationDashboard = lazyWithRetry(() => import('./pages/MedicationDashboard'));
const MedicationDeliveries = lazyWithRetry(() => import('./pages/MedicationDeliveries'));
const GroceryStatus = lazyWithRetry(() => import('./pages/GroceryStatus'));
const FireDrills = lazyWithRetry(() => import('./pages/FireDrills'));
const PharmacyDashboard = lazyWithRetry(() => import('./pages/PharmacyDashboard'));
const PharmacySuppliers = lazyWithRetry(() => import('./pages/PharmacySuppliers'));
const PharmacyInventory = lazyWithRetry(() => import('./pages/PharmacyInventory'));
const PharmacyOrders = lazyWithRetry(() => import('./pages/PharmacyOrders'));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/SuperAdminDashboard'));
const SuperAdminSettings = lazyWithRetry(() => import('./pages/SuperAdminSettings'));
const SuperAdminEmailSettings = lazyWithRetry(() => import('./pages/super-admin/EmailSettings'));
const SuperAdminCredentialsSettings = lazyWithRetry(() => import('./pages/super-admin/CredentialsSettings'));
const SuperAdminSecuritySettings = lazyWithRetry(() => import('./pages/super-admin/SecuritySettings'));
const SuperAdminGeneralSettings = lazyWithRetry(() => import('./pages/super-admin/GeneralSettings'));
const SuperAdminNotificationSettings = lazyWithRetry(() => import('./pages/super-admin/NotificationSettings'));
const SuperAdminDatabaseSettings = lazyWithRetry(() => import('./pages/super-admin/DatabaseSettings'));
const SuperAdminServerSettings = lazyWithRetry(() => import('./pages/super-admin/ServerSettings'));
const SuperAdminBrandingSettings = lazyWithRetry(() => import('./pages/super-admin/BrandingSettings'));
const FacilityRegistrations = lazyWithRetry(() => import('./pages/FacilityRegistrations'));
const ApproveFacilityRegistration = lazyWithRetry(() => import('./pages/ApproveFacilityRegistration'));
const Permissions = lazyWithRetry(() => import('./pages/Permissions'));
const ExpenseCategories = lazyWithRetry(() => import('./pages/ExpenseCategories'));
const Expenses = lazyWithRetry(() => import('./pages/Expenses'));
const BillingInvoices = lazyWithRetry(() => import('./pages/BillingInvoices'));
const ExpenseReports = lazyWithRetry(() => import('./pages/reports/ExpenseReports'));
const Incidents = lazyWithRetry(() => import('./pages/Incidents'));
const TLogs = lazyWithRetry(() => import('./pages/TLogs'));
const ChartReports = lazyWithRetry(() => import('./pages/reports/ChartReports'));
const AnalyticsDashboard = lazyWithRetry(() => import('./pages/reports/AnalyticsDashboard'));
const ResidentCharts = lazyWithRetry(() => import('./pages/reports/ResidentCharts'));
const VitalsCharts = lazyWithRetry(() => import('./pages/reports/VitalsCharts'));
const VitalsReports = lazyWithRetry(() => import('./pages/reports/VitalsReports'));
const AssessmentCharts = lazyWithRetry(() => import('./pages/reports/AssessmentCharts'));
const AppointmentsCharts = lazyWithRetry(() => import('./pages/reports/AppointmentsCharts'));
const VitalsHistory = lazyWithRetry(() => import('./pages/reports/VitalsHistory'));
const SleepCharts = lazyWithRetry(() => import('./pages/reports/SleepCharts'));
const StaffCharts = lazyWithRetry(() => import('./pages/reports/StaffCharts'));
const CareLogsReport = lazyWithRetry(() => import('./pages/reports/CareLogsReport'));
const InspectionPackage = lazyWithRetry(() => import('./pages/reports/InspectionPackage'));
const ChartData = lazyWithRetry(() => import('./pages/ChartData'));
const BehaviorChartsView = lazyWithRetry(() => import('./pages/administration/BehaviorChartsView'));
const CaregiverChartsPage = lazyWithRetry(() => import('./pages/caregiver/CaregiverChartsPage'));
const CaregiverResidentChart = lazyWithRetry(() => import('./pages/caregiver/CaregiverResidentChart'));
const PublicStaffClockIn = lazyWithRetry(() => import('./pages/public/PublicStaffClockIn'));
const StaffClock = lazyWithRetry(() => import('./pages/StaffClock'));
const StaffClockInsView = lazyWithRetry(() => import('./pages/StaffClockInsView'));
const StaffSchedule = lazyWithRetry(() => import('./pages/staff/StaffSchedule'));
const StaffAvailability = lazyWithRetry(() => import('./pages/staff/StaffAvailability'));
const PortalLayout = lazyWithRetry(() => import('./components/PortalLayout'));
const PortalDashboard = lazyWithRetry(() => import('./pages/portal/PortalDashboard'));
const PortalCareUpdates = lazyWithRetry(() => import('./pages/portal/PortalCareUpdates'));
const PortalMessages = lazyWithRetry(() => import('./pages/portal/PortalMessages'));
const AcceptInvite = lazyWithRetry(() => import('./pages/portal/AcceptInvite'));
const ResidentSignOut = lazyWithRetry(() => import('./pages/ResidentSignOut'));
const ResidentSignOutsView = lazyWithRetry(() => import('./pages/ResidentSignOutsView'));
const Visitors = lazyWithRetry(() => import('./pages/Visitors'));
const VisitorsView = lazyWithRetry(() => import('./pages/VisitorsView'));
const CheckInDashboard = lazyWithRetry(() => import('./pages/CheckInDashboard'));
const Welcome = lazyWithRetry(() => import('./pages/Welcome'));
const Features = lazyWithRetry(() => import('./pages/public/Features'));
const Pricing = lazyWithRetry(() => import('./pages/public/Pricing'));
const Modules = lazyWithRetry(() => import('./pages/public/Modules'));
const Security = lazyWithRetry(() => import('./pages/public/Security'));
const About = lazyWithRetry(() => import('./pages/public/About'));
const Contact = lazyWithRetry(() => import('./pages/public/Contact'));
const Support = lazyWithRetry(() => import('./pages/public/Support'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/public/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('./pages/public/TermsOfService'));
const HIPAACompliance = lazyWithRetry(() => import('./pages/public/HIPAACompliance'));
const CookiePolicy = lazyWithRetry(() => import('./pages/public/CookiePolicy'));
const RegisterFacility = lazyWithRetry(() => import('./pages/public/RegisterFacility'));
const RegisterFacilitySuccess = lazyWithRetry(() => import('./pages/public/RegisterFacilitySuccess'));
const FacilitySetup = lazyWithRetry(() => import('./pages/public/FacilitySetup'));
const Documentation = lazyWithRetry(() => import('./pages/public/Documentation'));
const Blog = lazyWithRetry(() => import('./pages/public/Blog'));
const BlogPost = lazyWithRetry(() => import('./pages/public/BlogPost'));

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
            {/* Public routes - must be defined before catch-all */}
            <Route path="/" element={<Suspense fallback={<PageLoader />}><Welcome /></Suspense>} />
            <Route path="/login" element={<Login />} />
            {/* Family portal invite - must be before path="portal" and path="/*" so it isn't caught by protected routes */}
            <Route path="/portal/accept-invite" element={<Suspense fallback={<PageLoader />}><AcceptInvite /></Suspense>} />
            <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
            <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
            <Route path="/features" element={<Suspense fallback={<PageLoader />}><Features /></Suspense>} />
            <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><Pricing /></Suspense>} />
            <Route path="/modules" element={<Suspense fallback={<PageLoader />}><Modules /></Suspense>} />
            <Route path="/security" element={<Suspense fallback={<PageLoader />}><Security /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
            <Route path="/support" element={<Suspense fallback={<PageLoader />}><Support /></Suspense>} />
            <Route path="/privacy-policy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
            <Route path="/terms-of-service" element={<Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>} />
            <Route path="/hipaa-compliance" element={<Suspense fallback={<PageLoader />}><HIPAACompliance /></Suspense>} />
            <Route path="/cookie-policy" element={<Suspense fallback={<PageLoader />}><CookiePolicy /></Suspense>} />
            <Route path="/staff/clock-in" element={<Suspense fallback={<PageLoader />}><PublicStaffClockIn /></Suspense>} />
            <Route path="/register-facility" element={<Suspense fallback={<PageLoader />}><RegisterFacility /></Suspense>} />
            <Route path="/register-facility/success" element={<Suspense fallback={<PageLoader />}><RegisterFacilitySuccess /></Suspense>} />
            <Route path="/facility-setup" element={<Suspense fallback={<PageLoader />}><FacilitySetup /></Suspense>} />
            <Route path="/documentation" element={<Suspense fallback={<PageLoader />}><Documentation /></Suspense>} />
            <Route path="/blog" element={<Suspense fallback={<PageLoader />}><Blog /></Suspense>} />
            <Route path="/blog/:slug" element={<Suspense fallback={<PageLoader />}><BlogPost /></Suspense>} />
            {/* Family portal - protected (accept-invite is above as public) */}
            <Route path="portal" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><PortalLayout /></Suspense></ProtectedRoute>}>
                <Route index element={<Suspense fallback={<PageLoader />}><PortalDashboard /></Suspense>} />
                <Route path="care-updates" element={<Suspense fallback={<PageLoader />}><PortalCareUpdates /></Suspense>} />
                <Route path="messages" element={<Suspense fallback={<PageLoader />}><PortalMessages /></Suspense>} />
            </Route>
            {/* Protected routes - dashboard and app pages */}
            {/* Match all paths that aren't public routes (defined above) */}
            {/* React Router matches in order, so / won't match here since it's defined above */}
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                {/* Main Pages */}
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                <Route path="assessments" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="assessments"><Assessments /></ModuleProtectedRoute></Suspense>} />
                <Route path="assessments/:id" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="assessments"><AssessmentDetail /></ModuleProtectedRoute></Suspense>} />
                <Route path="assessments/:id/review" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="assessments"><AssessmentReview /></ModuleProtectedRoute></Suspense>} />
                <Route path="appointments" element={<Suspense fallback={<PageLoader />}><Appointments /></Suspense>} />
                <Route path="appointments/dashboard" element={<Suspense fallback={<PageLoader />}><AppointmentsDashboard /></Suspense>} />
                <Route path="appointments/:id" element={<Suspense fallback={<PageLoader />}><AppointmentDetail /></Suspense>} />
                <Route path="appointments/create/:residentId" element={<Suspense fallback={<PageLoader />}><CreateAppointment /></Suspense>} />
                <Route path="vitals" element={<Suspense fallback={<PageLoader />}><Vitals /></Suspense>} />
                <Route path="view-vitals" element={<Suspense fallback={<PageLoader />}><ViewVitals /></Suspense>} />
                <Route path="medications/dashboard" element={<Suspense fallback={<PageLoader />}><MedicationDashboard /></Suspense>} />
                <Route path="medications" element={<Suspense fallback={<PageLoader />}><Medications /></Suspense>} />
                <Route path="medications/report" element={<Suspense fallback={<PageLoader />}><MedicationsReport /></Suspense>} />
                <Route path="medications/residents" element={<Suspense fallback={<PageLoader />}><CaregiverMedicationsResidents /></Suspense>} />
                <Route path="medications/residents/:residentId" element={<Suspense fallback={<PageLoader />}><ResidentMedicationsPage /></Suspense>} />
                <Route path="reminders" element={<Suspense fallback={<PageLoader />}><Reminders /></Suspense>} />
                <Route path="medication-history" element={<Suspense fallback={<PageLoader />}><MedicationHistory /></Suspense>} />
                <Route path="medication-deliveries" element={<Suspense fallback={<PageLoader />}><MedicationDeliveries /></Suspense>} />
                <Route path="grocery-status" element={<Suspense fallback={<PageLoader />}><GroceryStatus /></Suspense>} />
                <Route path="fire-drills" element={<Suspense fallback={<PageLoader />}><FireDrills /></Suspense>} />
                <Route path="incidents" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="incidents"><Incidents /></ModuleProtectedRoute></Suspense>} />
                <Route path="t-logs" element={<Suspense fallback={<PageLoader />}><TLogs /></Suspense>} />
                <Route path="pharmacy/dashboard" element={<Suspense fallback={<PageLoader />}><PharmacyDashboard /></Suspense>} />
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
                <Route path="sleep-pattern" element={<Navigate to="/sleep-patterns" replace />} />
                <Route path="sleep-patterns" element={<Suspense fallback={<PageLoader />}><SleepPatterns /></Suspense>} />
                <Route path="leave-requests" element={<Suspense fallback={<PageLoader />}><LeaveRequests /></Suspense>} />
                <Route path="check-in-dashboard" element={<Suspense fallback={<PageLoader />}><CheckInDashboard /></Suspense>} />
                <Route path="staff/clock" element={<Suspense fallback={<PageLoader />}><StaffClock /></Suspense>} />
                <Route path="staff/clock-ins" element={<Suspense fallback={<PageLoader />}><StaffClockInsView /></Suspense>} />
                <Route path="staff/schedule" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="staff_scheduling"><StaffSchedule /></ModuleProtectedRoute></Suspense>} />
                <Route path="staff/availability" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="staff_scheduling"><StaffAvailability /></ModuleProtectedRoute></Suspense>} />
                <Route path="staff/attendance" element={<Suspense fallback={<PageLoader />}><ModuleProtectedRoute module="staff_scheduling"><StaffClockInsView /></ModuleProtectedRoute></Suspense>} />
                <Route path="residents/sign-out" element={<Suspense fallback={<PageLoader />}><ResidentSignOut /></Suspense>} />
                <Route path="residents/sign-outs/view-all" element={<Suspense fallback={<PageLoader />}><ResidentSignOutsView /></Suspense>} />
                <Route path="visitors" element={<Suspense fallback={<PageLoader />}><Visitors /></Suspense>} />
                <Route path="visitors/view-all" element={<Suspense fallback={<PageLoader />}><VisitorsView /></Suspense>} />
                <Route path="my-residents" element={<Suspense fallback={<PageLoader />}><MyResidentsPage /></Suspense>} />
                <Route path="my-residents/:residentId" element={<Suspense fallback={<PageLoader />}><ResidentDetailPage /></Suspense>} />
                <Route path="charts" element={<Suspense fallback={<PageLoader />}><CaregiverChartsPage /></Suspense>} />
                <Route path="charts/resident/:residentId" element={<Suspense fallback={<PageLoader />}><CaregiverResidentChart /></Suspense>} />

                {/* Reports */}
                <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
                <Route path="reports/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsDashboard /></Suspense>} />
                <Route path="reports/charts" element={<Suspense fallback={<PageLoader />}><ChartReports /></Suspense>} />
                <Route path="reports/resident-charts" element={<Suspense fallback={<PageLoader />}><ResidentCharts /></Suspense>} />
                <Route path="reports/vitals-charts" element={<Suspense fallback={<PageLoader />}><VitalsCharts /></Suspense>} />
                <Route path="reports/vitals-reports" element={<Suspense fallback={<PageLoader />}><VitalsReports /></Suspense>} />
                <Route path="reports/assessment-charts" element={<Suspense fallback={<PageLoader />}><AssessmentCharts /></Suspense>} />
                <Route path="reports/appointments-charts" element={<Suspense fallback={<PageLoader />}><AppointmentsCharts /></Suspense>} />
                <Route path="reports/vitals-history" element={<Suspense fallback={<PageLoader />}><VitalsHistory /></Suspense>} />
                <Route path="reports/sleep-charts" element={<Suspense fallback={<PageLoader />}><SleepCharts /></Suspense>} />
                <Route path="reports/staff-charts" element={<Suspense fallback={<PageLoader />}><StaffCharts /></Suspense>} />
                <Route path="reports/care-logs" element={<Suspense fallback={<PageLoader />}><CareLogsReport /></Suspense>} />
                <Route path="reports/inspection-package" element={<Suspense fallback={<PageLoader />}><InspectionPackage /></Suspense>} />

                {/* Super Admin */}
                <Route path="super-admin/dashboard" element={<Suspense fallback={<PageLoader />}><SuperAdminDashboard /></Suspense>} />
                <Route path="super-admin/settings" element={<Suspense fallback={<PageLoader />}><SuperAdminSettings /></Suspense>} />
                <Route path="super-admin/settings/email" element={<Suspense fallback={<PageLoader />}><SuperAdminEmailSettings /></Suspense>} />
                <Route path="super-admin/settings/credentials" element={<Suspense fallback={<PageLoader />}><SuperAdminCredentialsSettings /></Suspense>} />
                <Route path="super-admin/settings/security" element={<Suspense fallback={<PageLoader />}><SuperAdminSecuritySettings /></Suspense>} />
                <Route path="super-admin/settings/general" element={<Suspense fallback={<PageLoader />}><SuperAdminGeneralSettings /></Suspense>} />
                <Route path="super-admin/settings/notification" element={<Suspense fallback={<PageLoader />}><SuperAdminNotificationSettings /></Suspense>} />
                <Route path="super-admin/settings/database" element={<Suspense fallback={<PageLoader />}><SuperAdminDatabaseSettings /></Suspense>} />
                <Route path="super-admin/settings/server" element={<Suspense fallback={<PageLoader />}><SuperAdminServerSettings /></Suspense>} />
                <Route path="super-admin/settings/branding" element={<Suspense fallback={<PageLoader />}><SuperAdminBrandingSettings /></Suspense>} />
                <Route path="super-admin/facility-registrations" element={<Suspense fallback={<PageLoader />}><FacilityRegistrations /></Suspense>} />
                <Route path="super-admin/facility-registrations/:id/approve" element={<Suspense fallback={<PageLoader />}><ApproveFacilityRegistration /></Suspense>} />
                <Route path="super-admin/facilities" element={<Suspense fallback={<PageLoader />}><Facilities /></Suspense>} />
                <Route path="super-admin/facilities/create" element={<Suspense fallback={<PageLoader />}><FacilityCreate /></Suspense>} />
                <Route path="super-admin/facilities/:id" element={<Suspense fallback={<PageLoader />}><FacilityView /></Suspense>} />
                <Route path="super-admin/facilities/:id/edit" element={<Suspense fallback={<PageLoader />}><FacilityEdit /></Suspense>} />
                <Route path="super-admin/permissions" element={<Suspense fallback={<PageLoader />}><Permissions /></Suspense>} />

                {/* Administration */}
                <Route path="administration/residents" element={<Suspense fallback={<PageLoader />}><Residents /></Suspense>} />
                <Route path="administration/resident-contacts" element={<Suspense fallback={<PageLoader />}><ResidentContacts /></Suspense>} />
                {/* Facilities route removed - only accessible via /super-admin/facilities */}
                <Route path="administration/branches" element={<Suspense fallback={<PageLoader />}><Branches /></Suspense>} />
                <Route path="administration/vital-ranges" element={<Suspense fallback={<PageLoader />}><VitalRanges /></Suspense>} />
                <Route path="administration/leave-requests" element={<Suspense fallback={<PageLoader />}><LeaveRequests /></Suspense>} />
                <Route path="administration/roles" element={<Suspense fallback={<PageLoader />}><Roles /></Suspense>} />
                <Route path="administration/facility-permissions" element={<Suspense fallback={<PageLoader />}><Permissions /></Suspense>} />
                <Route path="administration/users" element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />
                <Route path="administration/email-settings" element={<Suspense fallback={<PageLoader />}><SuperAdminEmailSettings /></Suspense>} />
                <Route path="administration/users/create" element={<Suspense fallback={<PageLoader />}><UserCreate /></Suspense>} />
                <Route path="administration/users/:id/edit" element={<Suspense fallback={<PageLoader />}><UserEdit /></Suspense>} />
                <Route path="administration/users/:id" element={<Suspense fallback={<PageLoader />}><ViewUser /></Suspense>} />
                <Route path="administration/chart-data" element={<Suspense fallback={<PageLoader />}><ChartData /></Suspense>} />
                <Route path="administration/behavior-charts" element={<Suspense fallback={<PageLoader />}><BehaviorChartsView /></Suspense>} />
                <Route path="administration/drugs" element={<Suspense fallback={<PageLoader />}><Drugs /></Suspense>} />
                <Route path="administration/employee-documents" element={<Suspense fallback={<PageLoader />}><EmployeeDocuments /></Suspense>} />
                <Route path="administration/activity-logs" element={<Suspense fallback={<PageLoader />}><ActivityLogs /></Suspense>} />
                <Route path="administration/deactivated" element={<Suspense fallback={<PageLoader />}><DeactivatedRecords /></Suspense>} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            {/* Keep public routes before catch-all to prevent redirects */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

// App component export
export default App;