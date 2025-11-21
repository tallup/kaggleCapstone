# Facility Management Pages - Quick Reference Guide

## 📍 Navigation Flow

```
Facilities List (Index)
    │
    ├─→ [Create] → Create Facility Page
    │                 │
    │                 └─→ [Save] → Edit Facility Page (newly created)
    │
    ├─→ [View] → View Facility Page
    │               │
    │               └─→ [Edit] → Edit Facility Page
    │
    └─→ [Edit] → Edit Facility Page
                    │
                    └─→ [Save] → View Facility Page
```

---

## 🆕 Create Facility Page

### **URL**: `/admin/facilities/create`

### **Header Actions**:
```
┌─────────────────────────────────────────────────┐
│  Create New Facility                    [Cancel]│
│  Add a new facility to the system...            │
└─────────────────────────────────────────────────┘
```

### **Form Sections**:
1. **Facility Information**
   - Facility Name *
   - Location *
   - Description

2. **Contact Information**
   - Address
   - Phone
   - Email

3. **Marketing Information**
   - Brochure URL
   - Brochure Color Theme *
   - Active Facility Toggle

4. **Branding & Customization** (Super Admin Only)
   - Logo Upload
   - Subdomain
   - Provider Code
   - Primary Color
   - Secondary Color
   - Accent Color

5. **Module Access** (Super Admin Only)
   - ☑ Pharmacy
   - ☑ Medications
   - ☑ Vitals
   - ☑ Appointments
   - ☑ Assessments
   - ☑ Sleep Records
   - ☑ Housekeeping
   - ☑ Reports
   - ☑ Residents
   - ☑ Behaviors
   - ☑ Incidents
   - ☑ Leave Requests
   - ☑ Employee Documents
   - ☑ Grocery Status
   - ☑ Fire Drills

### **Form Actions**:
```
[Create Facility] [Create & Create Another] [Cancel]
```

### **Confirmation Modal** (on Create):
```
┌─────────────────────────────────────────┐
│  🏢 Create New Facility                 │
│                                         │
│  Are you sure you want to create this  │
│  facility? All enabled modules will be │
│  activated.                             │
│                                         │
│     [Cancel]  [Yes, Create Facility]   │
└─────────────────────────────────────────┘
```

### **Success Notification**:
```
┌─────────────────────────────────────────┐
│ ✅ Facility Created Successfully        │
│                                         │
│ **Evergreen Care Home** has been       │
│ created with 15 module(s) enabled.     │
└─────────────────────────────────────────┘
```

---

## 👁️ View Facility Page (NEW!)

### **URL**: `/admin/facilities/{id}`

### **Header**:
```
┌─────────────────────────────────────────────────┐
│  Evergreen Care Home                            │
│  Seattle, Washington                            │
│                                                 │
│                    [Edit Facility] [Delete]     │
└─────────────────────────────────────────────────┘
```

### **Sections**:

#### 1. **Facility Information**
```
┌─────────────────────────────────────────┐
│ ℹ️ Facility Information                 │
├─────────────────────────────────────────┤
│ 🏢 Facility Name                        │
│    Evergreen Care Home                  │
│                                         │
│ 📍 Location                             │
│    Seattle, Washington                  │
│                                         │
│ Description                             │
│    A premier assisted living facility...│
│                                         │
│ Status                                  │
│    ✅ Active                            │
└─────────────────────────────────────────┘
```

#### 2. **Contact Information**
```
┌─────────────────────────────────────────┐
│ 📞 Contact Information                  │
├─────────────────────────────────────────┤
│ 🗺️ Address                              │
│    123 Main St, Seattle, WA 98101       │
│                                         │
│ 📞 Phone                    [Copy]      │
│    (206) 555-0123                       │
│                                         │
│ ✉️ Email                     [Copy]     │
│    info@evergreen.com                   │
└─────────────────────────────────────────┘
```

#### 3. **Marketing Information**
```
┌─────────────────────────────────────────┐
│ 📄 Marketing Information                │
├─────────────────────────────────────────┤
│ 📄 Brochure URL                         │
│    https://evergreen.com/brochure.pdf ↗ │
│                                         │
│ Brochure Color Theme                    │
│    [Blue]                               │
└─────────────────────────────────────────┘
```

#### 4. **Branding & Customization** (Super Admin)
```
┌─────────────────────────────────────────┐
│ 🎨 Branding & Customization             │
├─────────────────────────────────────────┤
│ Facility Logo                           │
│    [Logo Image Preview]                 │
│                                         │
│ 🌐 Subdomain              [Copy]        │
│    evergreen                            │
│                                         │
│ 🔑 Provider Code          [Copy]        │
│    EVG2024                              │
│                                         │
│ Primary Color    Secondary Color        │
│    [#1E3A5F]        [#86EFAC]          │
│                                         │
│ Accent Color                            │
│    [#FFFFFF]                           │
└─────────────────────────────────────────┘
```

#### 5. **Module Access** (Super Admin, Collapsible)
```
┌─────────────────────────────────────────┐
│ ⊞ Module Access                    [▼]  │
├─────────────────────────────────────────┤
│ Enabled Modules                         │
│  [Pharmacy] [Medications] [Vitals]     │
│  [Appointments] [Assessments] [Sleep]  │
│  [Housekeeping] [Reports] [Residents]  │
│  [Behaviors] [Incidents] [Leave]       │
│  [Employee Docs] [Grocery] [Fire]      │
│                                         │
│ Disabled Modules                        │
│  (None - All modules enabled)           │
└─────────────────────────────────────────┘
```

#### 6. **Statistics**
```
┌─────────────────────────────────────────┐
│ 📊 Statistics                           │
├─────────────────────────────────────────┤
│ 🏢 Total Branches    👥 Total Users     │
│    [5]                  [42]            │
│                                         │
│ ✅ Active Branches   👤 Registered By   │
│    [5]                  John Admin      │
└─────────────────────────────────────────┘
```

#### 7. **System Information** (Collapsible, Collapsed)
```
┌─────────────────────────────────────────┐
│ ℹ️ System Information              [▶]  │
└─────────────────────────────────────────┘
```

---

## ✏️ Edit Facility Page

### **URL**: `/admin/facilities/{id}/edit`

### **Header**:
```
┌─────────────────────────────────────────────────┐
│  Edit Facility: Evergreen Care Home             │
│  Manage facility settings and module access.    │
│  This facility has 5 branch(es) and 42 user(s). │
│                                                 │
│              [View Facility] [Delete Facility]  │
└─────────────────────────────────────────────────┘
```

### **Form** (Same as Create)

### **Form Actions**:
```
[Save Changes] [Cancel]
```

### **Confirmation Modal** (on Save):
```
┌─────────────────────────────────────────┐
│  🏢 Save Facility Changes               │
│                                         │
│  Are you sure you want to save your    │
│  changes? Module access changes will   │
│  take effect immediately.              │
│                                         │
│     [Cancel]  [Yes, Save Changes]      │
└─────────────────────────────────────────┘
```

### **Success Notification** (with changes):
```
┌─────────────────────────────────────────┐
│ ✅ Facility Updated Successfully        │
│                                         │
│ **Evergreen Care Home** has been       │
│ updated with 14 module(s) enabled.     │
│                                         │
│ **Module Changes:**                    │
│ • Pharmacy (enabled)                   │
│ • Grocery Status (disabled)            │
└─────────────────────────────────────────┘
```

---

## 🎨 Color Coding

### **Badges**:
- **Green** (Success): Active status, enabled modules
- **Red** (Danger): Inactive status, disabled modules
- **Blue** (Info): Brochure color "blue"
- **Purple** (Warning): Brochure color "purple"
- **Gray**: Neutral information

### **Icons**:
- 🏢 Building Office - Facility
- 📍 Map Pin - Location
- 📞 Phone - Contact
- ✉️ Envelope - Email
- 🎨 Paint Brush - Branding
- 🌐 Globe - Subdomain
- 🔑 Key - Provider Code
- ⊞ Squares - Modules
- 📊 Chart Bar - Statistics
- ✅ Check Circle - Active/Success
- ❌ X Circle - Inactive/Error

---

## 🔐 Permission-Based Visibility

### **All Users** (with facility permissions):
- View basic facility information
- View contact information
- View marketing information

### **Super Admin Only**:
- Branding & Customization section
- Module Access section
- Color customization
- Provider code management

---

## 💡 Key Features

### **Copyable Fields**:
- Phone numbers
- Email addresses
- Subdomain
- Provider code

### **Smart Defaults**:
- All modules enabled by default
- Active status = true
- Brochure color = blue
- Auto-assigns creator

### **Safety Features**:
- Confirmation on create
- Confirmation on save
- Confirmation on delete
- Confirmation on cancel
- Unsaved changes warning

### **User Guidance**:
- Descriptive headings
- Helpful subheadings
- Field helper text
- Modal descriptions
- Success notifications

---

## 📱 Responsive Design

All pages are fully responsive and work on:
- Desktop (full layout)
- Tablet (adapted layout)
- Mobile (stacked layout)

---

## 🚀 Quick Actions

### **From List Page**:
- Click row → View facility
- Click edit icon → Edit facility
- Click delete icon → Delete facility
- Click "New Facility" → Create facility

### **From View Page**:
- Click "Edit Facility" → Edit facility
- Click "Delete Facility" → Delete facility

### **From Edit Page**:
- Click "View Facility" → Return to list
- Click "Save Changes" → Save and stay
- Click "Cancel" → Return to list

### **From Create Page**:
- Click "Create Facility" → Save and edit
- Click "Create & Create Another" → Save and new
- Click "Cancel" → Return to list

---

## 📋 Testing Checklist

- [ ] Create facility with all modules
- [ ] Create facility with selective modules
- [ ] View facility as super admin
- [ ] View facility as regular admin
- [ ] Edit facility and change modules
- [ ] Edit facility and change branding
- [ ] Copy phone number
- [ ] Copy email address
- [ ] Copy provider code
- [ ] Test cancel confirmations
- [ ] Test delete confirmations
- [ ] Verify notifications appear
- [ ] Check module change tracking
- [ ] Test redirect after create
- [ ] Verify statistics display

---

This comprehensive facility management system provides a professional, user-friendly experience for managing facilities in the Evergreen healthcare system! 🎉
