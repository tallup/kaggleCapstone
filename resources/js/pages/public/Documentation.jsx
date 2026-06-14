import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book, Search, ChevronRight, ChevronDown, Home, Users, Settings,
  Pill, Heart, Calendar, ClipboardList, Moon, Building2, BarChart3,
  AlertCircle, FileText, Shield, HelpCircle, Mail, UserCheck, Activity,
  ShoppingCart, DollarSign, ArrowLeft, Menu, X
} from 'lucide-react';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';

export default function Documentation() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [openArticles, setOpenArticles] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const documentationCategories = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: Home,
      color: 'from-brand-primary-dark to-brand-sky',
      articles: [
        {
          id: 'introduction',
          title: 'Introduction to HomeLogic360',
          content: `HomeLogic360 is a comprehensive care facility management system designed to streamline operations for assisted living facilities, memory care centers, and adult family homes. Our platform helps you manage residents, medications, vital signs, appointments, and more all in one place.

**Key Features:**
- Multi-facility support with branch management
- Role-based access control (Super Admin, Administrator, Caregiver)
- Real-time notifications and alerts
- Mobile-responsive design
- Comprehensive reporting and analytics
- HIPAA-compliant data management

**Getting Started:**
1. Register your facility through our registration form
2. Complete the facility setup with required information
3. Receive your administrator account credentials
4. Log in and begin configuring your facility settings
5. Add residents, staff, and start using the system`
        },
        {
          id: 'account-setup',
          title: 'Account Setup',
          content: `After your facility registration is approved, you'll receive an email with your administrator account credentials.

**Initial Login:**
1. Navigate to the login page
2. Enter your administrator email and password
3. You'll be prompted to change your password on first login
4. Complete your profile information

**First Steps:**
- Configure your facility settings (Settings → Facility Settings)
- Set up email notifications (Settings → Email Configuration)
- Enable/disable modules based on your needs
- Add your first branch if you have multiple locations
- Add staff members and assign roles
- Begin adding residents`
        },
        {
          id: 'first-login',
          title: 'First Login Guide',
          content: `Welcome to HomeLogic360! Here's what to do after your first login:

**Dashboard Overview:**
- The main dashboard provides an overview of your facility
- You'll see key metrics and quick access to common tasks
- Use the navigation menu to access different modules

**Essential Settings:**
1. **Facility Information**: Update your facility name, address, and contact details
2. **Email Configuration**: Set up email notifications (SES or SMTP)
3. **Module Management**: Enable the modules you need
4. **User Roles**: Understand the different permission levels

**Quick Actions:**
- Add your first resident
- Create staff accounts
- Set up medication database
- Configure vital sign ranges
- Schedule your first appointment`
        },
        {
          id: 'facility-configuration',
          title: 'Facility Configuration',
          content: `Properly configuring your facility ensures the system works optimally for your needs.

**Basic Configuration:**
1. Navigate to Settings → Facility Settings
2. Update facility name, address, phone, and email
3. Upload your facility logo (optional)
4. Set branding colors (optional)
5. Configure subdomain if applicable

**Email Configuration:**
- Choose between Amazon SES (recommended) or SMTP
- For SES: Provide region and configuration set (optional)
- For SMTP: Provide host, port, username, password, and encryption
- Test your email configuration before saving

**Module Management:**
- Enable/disable modules based on your facility's needs
- All modules are enabled by default
- You can change this at any time`
        },
        {
          id: 'user-roles',
          title: 'User Roles Overview',
          content: `HomeLogic360 supports multiple user roles with different permission levels:

**Super Admin:**
- Full system access
- Can manage all facilities
- System configuration access
- User management across all facilities

**Administrator:**
- Full access to their facility
- Can manage residents, staff, and settings
- Can configure facility-specific settings
- Access to all reports and analytics

**Manager:**
- Management access with some restrictions
- Can view and manage residents
- Limited settings access

**Clinical Supervisor:**
- Clinical oversight and management
- Can review and approve clinical documentation
- Access to resident medical records

**Caregiver:**
- Day-to-day care documentation
- Medication administration
- Vital signs recording
- Appointment scheduling
- Incident reporting`
        }
      ]
    },
    {
      id: 'administrators',
      name: 'For Administrators',
      icon: Settings,
      color: 'from-purple-500 to-pink-500',
      articles: [
        {
          id: 'admin-dashboard',
          title: 'Dashboard Overview',
          content: `The administrator dashboard provides a comprehensive overview of your facility operations.

**Key Metrics:**
- Total residents
- Active staff members
- Pending medication administrations
- Upcoming appointments
- Recent incidents
- System alerts

**Quick Actions:**
- Add new resident
- Add new staff member
- View pending tasks
- Access reports
- Configure settings`
        },
        {
          id: 'facility-branch-management',
          title: 'Facility & Branch Management',
          content: `Manage your facility structure and branches.

**Facility Management:**
- Update facility information
- Configure facility settings
- Manage branding and logo
- Set up email notifications

**Branch Management:**
- Add multiple branches/locations
- Assign staff to specific branches
- Assign residents to branches
- View branch-specific reports

**Creating a Branch:**
1. Navigate to Facilities → Branches
2. Click "Add Branch"
3. Enter branch name and address
4. Assign to facility
5. Save`
        },
        {
          id: 'user-management',
          title: 'User Management',
          content: `Manage staff accounts and permissions.

**Adding Users:**
1. Navigate to Users → Add User
2. Enter user details (name, email, role)
3. Set initial password
4. Assign to facility and branch
5. Save

**User Roles:**
- Assign appropriate role based on responsibilities
- Roles determine access levels
- Can be changed later if needed

**Managing Users:**
- Edit user information
- Reset passwords
- Deactivate/reactivate accounts
- View user activity logs`
        },
        {
          id: 'settings-configuration',
          title: 'Settings Configuration',
          content: `Configure system-wide and facility-specific settings.

**Facility Settings:**
- Basic information (name, address, contact)
- Branding (logo, colors)
- Subdomain configuration

**Email Settings:**
- Choose email service (SES or SMTP)
- Configure email credentials
- Test email functionality
- Set from address and name

**Module Settings:**
- Enable/disable modules
- Configure module-specific settings
- Manage module access by role`
        },
        {
          id: 'email-configuration',
          title: 'Email Configuration (SES/SMTP)',
          content: `Configure email notifications for your facility.

**Amazon SES (Recommended):**
1. Navigate to Settings → Email Configuration
2. Select "Amazon SES" or "SES v2" as mail driver
3. Enter AWS region (e.g., us-east-1)
4. Optionally add configuration set
5. Set from email address and name
6. Test email configuration
7. Save settings

**SMTP Configuration:**
1. Select "SMTP" as mail driver
2. Enter SMTP host (e.g., smtp.gmail.com)
3. Enter SMTP port (587 for TLS, 465 for SSL)
4. Enter username and password
5. Select encryption (TLS or SSL)
6. Set from email address and name
7. Test and save

**Testing:**
- Use the "Save & Send Test Email" button
- Enter a recipient email address
- Check if email is received successfully`
        },
        {
          id: 'module-management',
          title: 'Module Management',
          content: `Control which features are available in your facility.

**Available Modules:**
- Residents
- Medications
- Vitals
- Appointments
- Assessments
- Sleep Tracking
- Housekeeping
- Pharmacy
- Billing & Expenses
- Reports
- Incidents
- Check-In/Out
- Visitors
- Progress notes

**Enabling/Disabling Modules:**
1. Navigate to Settings → Module Management
2. Toggle modules on/off
3. Changes take effect immediately
4. Disabled modules won't appear in navigation

**Module Access:**
- All modules enabled by default
- Can customize per facility
- Users only see enabled modules`
        },
        {
          id: 'reports-analytics',
          title: 'Reports & Analytics',
          content: `Generate comprehensive reports for compliance and decision-making.

**Available Reports:**
- Resident reports
- Medication compliance reports
- Vital signs trends
- Appointment summaries
- Incident reports
- Staff activity reports

**Generating Reports:**
1. Navigate to Reports
2. Select report type
3. Choose date range
4. Apply filters
5. Generate report
6. Export as PDF or CSV

**Analytics Dashboard:**
- View key metrics
- Track trends over time
- Identify patterns
- Make data-driven decisions`
        }
      ]
    },
    {
      id: 'caregivers',
      name: 'For Caregivers',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      articles: [
        {
          id: 'caregiver-dashboard',
          title: 'Dashboard Overview',
          content: `The caregiver dashboard provides quick access to daily tasks and resident information.

**Today's Schedule:**
- Medication administrations due
- Vital signs to record
- Appointments scheduled
- Tasks assigned

**Quick Actions:**
- Record medication administration
- Record vital signs
- Schedule appointment
- Report incident
- View resident details`
        },
        {
          id: 'resident-management-caregiver',
          title: 'Resident Management',
          content: `Access and manage resident information.

**Viewing Residents:**
- See list of assigned residents
- Quick view cards with key information
- Resident detail pages
- Medical history access

**Resident Information:**
- Personal details
- Medical history
- Current medications
- Care plans
- Emergency contacts
- Family information`
        },
        {
          id: 'medication-administration',
          title: 'Medication Administration (MAR)',
          content: `Record medication administrations accurately.

**Medication Administration Record (MAR):**
- View scheduled medications
- See administration times
- Record when medication is given
- Document any issues or refusals

**Recording Administration:**
1. Navigate to Medications → Today's Schedule
2. Find the medication to administer
3. Click "Administer"
4. Confirm details
5. Record administration time
6. Add notes if needed
7. Save

**Late Medications:**
- System alerts for overdue medications
- Record reason for delay
- Notifications sent to administrators`
        },
        {
          id: 'vital-signs-recording',
          title: 'Vital Signs Recording',
          content: `Record and track resident vital signs.

**Recording Vitals:**
1. Navigate to Vitals → Record Vitals
2. Select resident
3. Enter vital sign values:
   - Blood Pressure (Systolic/Diastolic)
   - Pulse
   - Temperature
   - Oxygen Saturation (O2)
4. System will alert if values are outside normal ranges
5. Add notes if needed
6. Save

**Vital Sign Ranges:**
- Normal ranges are pre-configured
- Can be customized per resident
- Alerts for abnormal readings
- Trend tracking available`
        },
        {
          id: 'appointment-scheduling-caregiver',
          title: 'Appointment Scheduling',
          content: `Schedule and manage healthcare provider appointments.

**Scheduling Appointments:**
1. Navigate to Appointments → Schedule
2. Select resident
3. Choose healthcare provider
4. Select date and time
5. Add appointment type and notes
6. Save

**Appointment Reminders:**
- Automated reminders before appointments
- View upcoming appointments on dashboard
- Appointment history tracking`
        },
        {
          id: 'incident-reporting-caregiver',
          title: 'Incident Reporting',
          content: `Document and report incidents accurately.

**Reporting an Incident:**
1. Navigate to Incidents → Report Incident
2. Select resident (if applicable)
3. Choose incident type
4. Enter incident details
5. Add photos if available
6. Document immediate actions taken
7. Submit report

**Incident Types:**
- Falls
- Medication errors
- Behavioral incidents
- Medical emergencies
- Other incidents

**Follow-up:**
- Administrators review incidents
- Follow-up actions can be assigned
- Incident history maintained`
        },
        {
          id: 'shift-reports',
          title: 'Shift Reports',
          content: `Document shift activities and resident status.

**Creating Shift Reports:**
1. Navigate to Reports → Shift Report
2. Select shift time
3. Document activities completed
4. Note any concerns or changes
5. Submit report

**Report Contents:**
- Medications administered
- Vital signs recorded
- Appointments attended
- Incidents occurred
- General observations`
        }
      ]
    },
    {
      id: 'residents',
      name: 'Resident Management',
      icon: Users,
      color: 'from-brand-primary-dark to-brand-sky',
      articles: [
        {
          id: 'adding-residents',
          title: 'Adding Residents',
          content: `Add new residents to your facility.

**Adding a Resident:**
1. Navigate to Residents → Add Resident
2. Enter personal information:
   - Full name
   - Date of birth
   - Gender
   - Social Security Number (optional)
3. Enter medical information:
   - Primary physician
   - Diagnosis
   - Allergies
   - Medical conditions
4. Assign to branch and room
5. Set resident status
6. Save

**Required Information:**
- Full name
- Date of birth
- Branch assignment
- Status (Active, Inactive, Discharged)`
        },
        {
          id: 'resident-profiles',
          title: 'Resident Profiles',
          content: `Comprehensive resident profiles contain all resident information.

**Profile Sections:**
- Personal Information
- Medical History
- Current Medications
- Care Plans
- Emergency Contacts
- Family Information
- Documents
- Room Assignment

**Viewing Profiles:**
- Click on resident name from residents list
- View all information in organized sections
- Edit information as needed
- Upload documents and photos`
        },
        {
          id: 'medical-history',
          title: 'Medical History',
          content: `Maintain comprehensive medical history for each resident.

**Medical Information:**
- Primary physician
- Diagnosis
- Medical conditions
- Allergies
- Medications
- Surgeries
- Hospitalizations

**Updating Medical History:**
1. Navigate to resident profile
2. Go to Medical History section
3. Add or edit information
4. Save changes

**Documentation:**
- Upload medical documents
- Link to assessments
- Track changes over time`
        },
        {
          id: 'care-plans',
          title: 'Care Plans',
          content: `Create and manage individualized care plans.

**Care Plan Components:**
- Goals and objectives
- Interventions
- Evaluation criteria
- Review dates

**Creating Care Plans:**
1. Navigate to resident profile
2. Go to Care Plans section
3. Click "Create Care Plan"
4. Enter plan details
5. Set review date
6. Save

**Updating Care Plans:**
- Review and update regularly
- Document progress
- Modify interventions as needed`
        },
        {
          id: 'family-contacts',
          title: 'Family Contacts',
          content: `Manage family and emergency contact information.

**Adding Contacts:**
1. Navigate to resident profile
2. Go to Family/Contacts section
3. Click "Add Contact"
4. Enter contact information
5. Set relationship
6. Mark as emergency contact if applicable
7. Save

**Contact Information:**
- Name
- Relationship
- Phone number
- Email address
- Address
- Emergency contact status`
        },
        {
          id: 'room-assignments',
          title: 'Room Assignments',
          content: `Assign residents to rooms and beds.

**Assigning Rooms:**
1. Navigate to resident profile
2. Go to Room Assignment section
3. Select branch
4. Choose room
5. Select bed (if applicable)
6. Set move-in date
7. Save

**Room Management:**
- View room occupancy
- Track room changes
- Manage bed assignments
- Room history maintained`
        }
      ]
    },
    {
      id: 'medications',
      name: 'Medication Management',
      icon: Pill,
      color: 'from-purple-500 to-pink-500',
      articles: [
        {
          id: 'medication-database',
          title: 'Medication Database',
          content: `Maintain a comprehensive medication database.

**Adding Medications:**
1. Navigate to Medications → Medication Database
2. Click "Add Medication"
3. Enter medication details:
   - Name (generic and brand)
   - Dosage forms
   - Strength
   - Route of administration
4. Save to database

**Medication Information:**
- Generic and brand names
- Dosage forms (tablet, capsule, liquid, etc.)
- Strengths available
- Routes (oral, topical, injection, etc.)`
        },
        {
          id: 'prescribing-medications',
          title: 'Prescribing Medications',
          content: `Prescribe medications to residents.

**Creating Prescriptions:**
1. Navigate to resident profile
2. Go to Medications section
3. Click "Add Medication"
4. Search or select from database
5. Enter prescription details:
   - Dosage
   - Frequency
   - Route
   - Start date
   - End date (if applicable)
6. Set administration schedule
7. Save prescription

**Prescription Details:**
- Medication name
- Dosage and strength
- Frequency (daily, BID, TID, etc.)
- Route of administration
- Special instructions`
        },
        {
          id: 'medication-schedules',
          title: 'Medication Schedules (MAR)',
          content: `Manage Medication Administration Records (MAR).

**MAR Overview:**
- Shows all scheduled medications
- Displays administration times
- Tracks compliance
- Alerts for missed doses

**Viewing MAR:**
- Daily schedule view
- Weekly calendar view
- Resident-specific MAR
- Facility-wide MAR

**Schedule Types:**
- Scheduled (specific times)
- PRN (as needed)
- One-time doses`
        },
        {
          id: 'administration-tracking',
          title: 'Administration Tracking',
          content: `Track medication administrations accurately.

**Recording Administration:**
1. Navigate to Medications → Today's Schedule
2. Find medication to administer
3. Click "Administer"
4. Confirm resident and medication
5. Record time given
6. Add notes if needed
7. Save

**Tracking Features:**
- Time of administration
- Who administered
- Any issues or refusals
- Late administration alerts
- Compliance monitoring`
        },
        {
          id: 'compliance-monitoring',
          title: 'Compliance Monitoring',
          content: `Monitor medication compliance and identify issues.

**Compliance Reports:**
- Percentage of doses given on time
- Missed doses
- Late administrations
- Refused medications

**Alerts:**
- Overdue medications
- Missed doses
- Low medication inventory
- Expiring medications`
        },
        {
          id: 'pharmacy-integration',
          title: 'Pharmacy Integration',
          content: `Manage pharmacy relationships and orders.

**Pharmacy Management:**
- Add pharmacy contacts
- Place medication orders
- Track deliveries
- Manage inventory

**Ordering Medications:**
1. Navigate to Pharmacy → Orders
2. Select medications needed
3. Choose pharmacy
4. Place order
5. Track delivery status`
        }
      ]
    },
    {
      id: 'vitals',
      name: 'Vital Signs',
      icon: Heart,
      color: 'from-red-500 to-rose-500',
      articles: [
        {
          id: 'recording-vitals',
          title: 'Recording Vitals',
          content: `Record vital signs for residents.

**Recording Process:**
1. Navigate to Vitals → Record Vitals
2. Select resident
3. Enter vital sign values:
   - Blood Pressure (Systolic/Diastolic)
   - Pulse (beats per minute)
   - Temperature (Fahrenheit or Celsius)
   - Oxygen Saturation (percentage)
4. System validates against normal ranges
5. Add notes if needed
6. Save

**Vital Sign Values:**
- Blood Pressure: Systolic/Diastolic (e.g., 120/80)
- Pulse: Beats per minute (e.g., 72)
- Temperature: Degrees (e.g., 98.6°F)
- O2 Saturation: Percentage (e.g., 98%)`
        },
        {
          id: 'customizing-ranges',
          title: 'Customizing Ranges',
          content: `Set normal, warning, and critical ranges for vital signs.

**Default Ranges:**
- Blood Pressure: Normal (90-140/60-90)
- Pulse: Normal (60-100 bpm)
- Temperature: Normal (97-99°F)
- O2 Saturation: Normal (95-100%)

**Customizing Ranges:**
1. Navigate to Settings → Vital Ranges
2. Select resident (or set facility-wide)
3. Adjust normal, warning, and critical ranges
4. Save changes

**Range Types:**
- Normal: Green indicator
- Warning: Yellow indicator
- Critical: Red indicator with alert`
        },
        {
          id: 'alert-configuration',
          title: 'Alert Configuration',
          content: `Configure alerts for abnormal vital signs.

**Alert Settings:**
- Enable/disable alerts
- Set alert thresholds
- Choose notification recipients
- Configure alert frequency

**Alert Types:**
- Immediate alerts for critical values
- Daily summary of warnings
- Trend-based alerts

**Receiving Alerts:**
- Email notifications
- Dashboard notifications
- Mobile app notifications (if enabled)`
        },
        {
          id: 'trend-analysis',
          title: 'Trend Analysis',
          content: `Analyze vital sign trends over time.

**Trend Views:**
- Line charts showing trends
- Comparison across time periods
- Resident-specific trends
- Facility-wide patterns

**Using Trends:**
1. Navigate to Vitals → Trends
2. Select resident
3. Choose vital sign type
4. Select date range
5. View trend chart

**Trend Insights:**
- Identify patterns
- Track improvements
- Detect deterioration
- Support clinical decisions`
        },
        {
          id: 'historical-reports',
          title: 'Historical Reports',
          content: `Generate reports of vital sign history.

**Report Options:**
- Date range selection
- Resident selection
- Vital sign type filtering
- Export to PDF or CSV

**Generating Reports:**
1. Navigate to Vitals → Reports
2. Select parameters
3. Generate report
4. View or export

**Report Contents:**
- All vital sign readings
- Date and time
- Values and ranges
- Notes and observations`
        }
      ]
    },
    {
      id: 'assessments',
      name: 'Assessments',
      icon: ClipboardList,
      color: 'from-orange-500 to-amber-500',
      articles: [
        {
          id: 'creating-assessments',
          title: 'Creating Assessments',
          content: `Create and conduct resident assessments.

**Assessment Types:**
- Initial assessments
- Periodic reassessments
- Change of condition assessments
- Discharge assessments

**Creating an Assessment:**
1. Navigate to Assessments → New Assessment
2. Select resident
3. Choose assessment type
4. Complete assessment sections
5. Review and submit

**Assessment Sections:**
- Physical health
- Mental health
- Functional status
- Social needs
- Care needs`
        },
        {
          id: 'assessment-forms',
          title: 'Assessment Forms',
          content: `Use standardized or customizable assessment forms.

**Form Types:**
- Pre-built templates
- Custom forms
- Facility-specific forms

**Form Components:**
- Multiple choice questions
- Text responses
- Numeric inputs
- Date fields
- File attachments

**Customizing Forms:**
- Administrators can create custom forms
- Add or remove sections
- Configure question types
- Set required fields`
        },
        {
          id: 'assessment-history',
          title: 'Assessment History',
          content: `Track assessment history and changes.

**Viewing History:**
- All assessments for a resident
- Chronological list
- Comparison view
- Trend analysis

**History Features:**
- View previous assessments
- Compare changes over time
- Track improvements or declines
- Generate reports

**Accessing History:**
1. Navigate to resident profile
2. Go to Assessments section
3. View assessment list
4. Click to view details`
        },
        {
          id: 'assessment-reminders',
          title: 'Automated Reminders',
          content: `Set up automated reminders for assessments.

**Reminder Types:**
- Initial assessment due
- Reassessment due
- Annual assessment
- Custom intervals

**Configuring Reminders:**
1. Navigate to Settings → Assessment Reminders
2. Set reminder intervals
3. Choose notification method
4. Save settings

**Reminder Notifications:**
- Email alerts
- Dashboard notifications
- Task assignments`
        }
      ]
    },
    {
      id: 'appointments',
      name: 'Appointments',
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      articles: [
        {
          id: 'provider-directory',
          title: 'Healthcare Provider Directory',
          content: `Maintain a directory of healthcare providers.

**Adding Providers:**
1. Navigate to Appointments → Providers
2. Click "Add Provider"
3. Enter provider information:
   - Name
   - Specialty
   - Contact information
   - Office address
4. Save

**Provider Information:**
- Name and credentials
- Specialty
- Phone and email
- Office address
- Notes`
        },
        {
          id: 'scheduling-appointments',
          title: 'Scheduling Appointments',
          content: `Schedule healthcare provider appointments.

**Scheduling Process:**
1. Navigate to Appointments → Schedule
2. Click "New Appointment"
3. Select resident
4. Choose healthcare provider
5. Select date and time
6. Enter appointment type
7. Add notes
8. Save

**Appointment Details:**
- Resident
- Provider
- Date and time
- Appointment type
- Location
- Notes`
        },
        {
          id: 'appointment-reminders',
          title: 'Appointment Reminders',
          content: `Automated reminders for upcoming appointments.

**Reminder Settings:**
- Days before appointment
- Notification method
- Recipients

**Reminder Types:**
- Email notifications
- Dashboard alerts
- Calendar integration

**Receiving Reminders:**
- Administrators
- Assigned caregivers
- Resident contacts (optional)`
        },
        {
          id: 'appointment-history',
          title: 'Appointment History',
          content: `Track appointment history and outcomes.

**Viewing History:**
- All appointments for a resident
- Provider-specific appointments
- Date range filtering
- Outcome tracking

**Appointment Outcomes:**
- Document visit results
- Update medical records
- Link to assessments
- Track follow-ups

**Accessing History:**
1. Navigate to Appointments → History
2. Select resident or provider
3. Choose date range
4. View appointment list`
        }
      ]
    },
    {
      id: 'other-modules',
      name: 'Other Modules',
      icon: Building2,
      color: 'from-indigo-500 to-violet-500',
      articles: [
        {
          id: 'sleep-tracking',
          title: 'Sleep Tracking',
          content: `Track and monitor resident sleep patterns.

**Recording Sleep:**
1. Navigate to Sleep Tracking → Record Sleep
2. Select resident
3. Enter sleep times:
   - Bedtime
   - Wake time
   - Sleep quality
4. Add notes
5. Save

**Sleep Analysis:**
- Daily sleep duration
- Sleep quality trends
- Monthly aggregations
- 24-hour heatmap visualization

**Reports:**
- Sleep pattern reports
- Quality analysis
- Trend identification`
        },
        {
          id: 'housekeeping',
          title: 'Housekeeping',
          content: `Manage cleaning schedules and tasks.

**Task Management:**
- Create cleaning tasks
- Assign to staff
- Schedule recurring tasks
- Track completion

**Creating Tasks:**
1. Navigate to Housekeeping → Tasks
2. Click "Add Task"
3. Enter task details
4. Assign to staff member
5. Set schedule
6. Save

**Quality Assurance:**
- Task completion tracking
- Quality inspections
- Reports and analytics`
        },
        {
          id: 'incident-reporting-module',
          title: 'Incident Reporting',
          content: `Document and track facility incidents.

**Reporting Incidents:**
1. Navigate to Incidents → Report Incident
2. Select incident type
3. Enter details
4. Add photos if available
5. Document actions taken
6. Submit

**Incident Types:**
- Falls
- Medication errors
- Behavioral incidents
- Medical emergencies
- Other

**Follow-up:**
- Administrator review
- Action plans
- Follow-up tracking
- Compliance documentation`
        },
        {
          id: 'check-in-out',
          title: 'Check-In/Out System',
          content: `Track staff clock-ins and resident sign-outs.

**Staff Clock-In/Out:**
- Record clock-in time
- Record clock-out time
- Break tracking
- Time sheet generation

**Resident Sign-Out:**
- Document when resident leaves
- Record return time
- Emergency contact notification
- Sign-out history

**Visitor Management:**
- Visitor check-in
- Visitor check-out
- Visitor logs
- Security tracking`
        },
        {
          id: 'visitors',
          title: 'Visitors Management',
          content: `Manage visitor check-in and check-out.

**Visitor Check-In:**
1. Navigate to Visitors → Check-In
2. Enter visitor information
3. Select resident visiting
4. Record check-in time
5. Save

**Visitor Information:**
- Name
- Relationship
- Contact information
- Photo (optional)
- Visit purpose

**Check-Out:**
- Record check-out time
- Maintain visit logs
- Generate reports`
        },
        {
          id: 'pharmacy-management',
          title: 'Pharmacy Management',
          content: `Manage medication inventory and orders.

**Inventory Management:**
- Track medication stock
- Set reorder points
- Monitor expiration dates
- Inventory reports

**Ordering Medications:**
1. Navigate to Pharmacy → Orders
2. Select medications
3. Choose supplier
4. Place order
5. Track delivery

**Supplier Management:**
- Add pharmacy suppliers
- Contact information
- Order history
- Delivery tracking`
        },
        {
          id: 'billing-expenses',
          title: 'Billing & Expenses',
          content: `Track facility expenses and billing.

**Expense Tracking:**
- Record expenses
- Categorize expenses
- Attach receipts
- Generate reports

**Billing Management:**
- Resident billing
- Service charges
- Payment tracking
- Invoice generation

**Reports:**
- Expense reports
- Revenue reports
- Financial summaries`
        }
      ]
    },
    {
      id: 'system-settings',
      name: 'System & Settings',
      icon: Settings,
      color: 'from-gray-500 to-slate-500',
      articles: [
        {
          id: 'account-settings',
          title: 'Account Settings',
          content: `Manage your user account settings.

**Profile Settings:**
- Update name and email
- Change password
- Upload profile photo
- Update contact information

**Preferences:**
- Notification preferences
- Language settings
- Time zone
- Date format

**Accessing Settings:**
1. Click on your profile
2. Select "Account Settings"
3. Make changes
4. Save`
        },
        {
          id: 'notification-preferences',
          title: 'Notification Preferences',
          content: `Configure how you receive notifications.

**Notification Types:**
- Email notifications
- Dashboard alerts
- Mobile push notifications

**Notification Settings:**
- Medication reminders
- Appointment alerts
- Incident notifications
- System updates

**Configuring:**
1. Navigate to Settings → Notifications
2. Enable/disable notification types
3. Set frequency
4. Save preferences`
        },
        {
          id: 'data-export',
          title: 'Data Export',
          content: `Export your facility data.

**Export Options:**
- Resident data
- Medication records
- Vital signs
- Appointments
- Reports

**Export Formats:**
- CSV (spreadsheet)
- PDF (reports)
- JSON (data)

**Exporting Data:**
1. Navigate to Settings → Data Export
2. Select data type
3. Choose date range
4. Select format
5. Generate export
6. Download file`
        },
        {
          id: 'security-privacy',
          title: 'Security & Privacy',
          content: `Understand security and privacy features.

**Security Features:**
- Encrypted data storage
- Secure authentication
- Role-based access control
- Audit trails

**Privacy:**
- HIPAA compliance
- Data protection
- Access controls
- Privacy settings

**Best Practices:**
- Use strong passwords
- Don't share accounts
- Log out when done
- Report security issues`
        },
        {
          id: 'hipaa-compliance',
          title: 'HIPAA Compliance',
          content: `HomeLogic360 is designed to be HIPAA compliant.

**Compliance Features:**
- Encrypted data transmission
- Access controls
- Audit logging
- Data backup
- Business Associate Agreement

**Your Responsibilities:**
- Use strong passwords
- Don't share login credentials
- Report security incidents
- Train staff on privacy

**Compliance Resources:**
- HIPAA training materials
- Privacy policies
- Security guidelines`
        }
      ]
    },
    {
      id: 'troubleshooting',
      name: 'Troubleshooting',
      icon: HelpCircle,
      color: 'from-red-500 to-orange-500',
      articles: [
        {
          id: 'common-issues',
          title: 'Common Issues',
          content: `Solutions to common problems.

**Login Issues:**
- Forgot password: Use password reset
- Account locked: Contact administrator
- Wrong credentials: Verify email and password

**Email Not Working:**
- Check email configuration
- Verify SMTP/SES settings
- Test email functionality
- Check spam folder

**Data Not Saving:**
- Check internet connection
- Refresh page
- Clear browser cache
- Try different browser

**Performance Issues:**
- Clear browser cache
- Disable browser extensions
- Check internet speed
- Contact support if persists`
        },
        {
          id: 'faq',
          title: 'Frequently Asked Questions',
          content: `Common questions and answers.

**Q: How do I reset my password?**
A: Click "Forgot Password" on login page, enter email, follow reset link.

**Q: Can I use the system on mobile?**
A: Yes, the system is mobile-responsive and works on smartphones and tablets.

**Q: How do I add multiple facilities?**
A: Contact support to add additional facilities to your account.

**Q: Can I customize the system?**
A: Yes, many features can be customized including forms, ranges, and settings.

**Q: How do I export data?**
A: Navigate to Settings → Data Export, select data type and format, generate export.

**Q: Is my data backed up?**
A: Yes, data is automatically backed up regularly.

**Q: How do I contact support?**
A: Use the Contact page, email support, or use live chat if available.`
        },
        {
          id: 'contact-support',
          title: 'Contact Support',
          content: `Get help from our support team.

**Support Channels:**
- Email support
- Live chat (if available)
- Phone support
- Support tickets

**Contact Information:**
- Visit the Contact page
- Email: support@homelogic360.com
- Phone: [Your support number]

**When Contacting Support:**
- Describe the issue clearly
- Include error messages
- Provide steps to reproduce
- Include screenshots if helpful

**Response Times:**
- Email: Within 24 hours
- Live chat: Immediate
- Phone: Business hours`
        }
      ]
    }
  ];

  const filteredCategories = useMemo(() => {
    if (!searchQuery && !selectedCategory) {
      return documentationCategories;
    }

    return documentationCategories.map(category => {
      const filteredArticles = category.articles.filter(article => {
        const matchesSearch = !searchQuery || 
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || category.id === selectedCategory;
        return matchesSearch && matchesCategory;
      });

      if (filteredArticles.length > 0 || category.id === selectedCategory) {
        return { ...category, articles: filteredArticles };
      }
      return null;
    }).filter(Boolean);
  }, [searchQuery, selectedCategory]);

  const toggleArticle = (categoryId, articleId) => {
    const key = `${categoryId}-${articleId}`;
    setOpenArticles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const scrollToCategory = (categoryId) => {
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSelectedCategory(categoryId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-gradient-to-br from-brand-primary to-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-brand-primary-dark to-brand-sky mb-4">
              <Book className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Documentation
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Comprehensive guides and tutorials to help you make the most of HomeLogic360
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-brand-sky text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sticky top-24">
                <div className="lg:hidden mb-4">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-semibold text-gray-900">Categories</span>
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
                <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
                  <nav className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSearchQuery('');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                        !selectedCategory
                          ? 'bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Categories
                    </button>
                    {documentationCategories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.id}
                          onClick={() => scrollToCategory(category.id)}
                          className={`w-full text-left px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                            selectedCategory === category.id
                              ? 'bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{category.name}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Documentation Content */}
            <div className="flex-1">
              {filteredCategories.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search terms or browse categories
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    className="bg-gradient-to-r from-brand-primary-dark to-brand-sky text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-all"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const Icon = category.icon;
                  if (category.articles.length === 0) return null;
                  
                  return (
                    <div
                      key={category.id}
                      id={category.id}
                      className="mb-12 scroll-mt-24"
                    >
                      <div className={`bg-gradient-to-r ${category.color} rounded-t-xl p-6`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h2 className="text-2xl font-bold text-white">{category.name}</h2>
                        </div>
                      </div>
                      <div className="bg-white rounded-b-xl shadow-md border border-gray-200 border-t-0">
                        <div className="p-6 space-y-4">
                          {category.articles.map((article) => {
                            const articleKey = `${category.id}-${article.id}`;
                            const isOpen = openArticles[articleKey];
                            
                            return (
                              <div
                                key={article.id}
                                className="border border-gray-200 rounded-lg overflow-hidden"
                              >
                                <button
                                  onClick={() => toggleArticle(category.id, article.id)}
                                  className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                                >
                                  <span className="font-semibold text-gray-900">{article.title}</span>
                                  {isOpen ? (
                                    <ChevronDown className="w-5 h-5 text-gray-600 transform rotate-180" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-600" />
                                  )}
                                </button>
                                {isOpen && (
                                  <div className="px-4 pb-4 border-t border-gray-200">
                                    <div className="pt-4 prose prose-sm max-w-none">
                                      <div className="text-gray-700 whitespace-pre-line">
                                        {article.content}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-20 bg-gradient-to-r from-brand-primary-dark to-brand-sky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Still Need Help?</h2>
          <p className="text-xl text-brand-primary mb-8">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/contact')}
              className="bg-white text-brand-primary-dark px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Contact Support
            </button>
            <button
              onClick={() => navigate('/support')}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Back to Support
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}


