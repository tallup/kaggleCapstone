# Facility React Components - Visual Showcase

## 🎨 Component Gallery

---

## 1. FacilityCard Component

### **Visual Layout**:
```
┌─────────────────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Brand color bar
│                                             │
│  [Logo]  Evergreen Care Home        ✓      │
│          📍 Seattle, WA                     │
│                                   [👁][✏][🗑]│
│  ─────────────────────────────────────────  │
│  📍 123 Main St, Seattle, WA 98101         │
│  📞 (206) 555-0123                         │
│  ✉️  info@evergreen.com                    │
│  ─────────────────────────────────────────  │
│  🌐 evergreen.yourapp.com                  │
│  🔑 EVG2024                                │
│  ─────────────────────────────────────────  │
│  🏢 5 Branches    👥 42 Users              │
│                              [🔵][🟢]       │
└─────────────────────────────────────────────┘
```

### **States**:
- **Default**: Clean card with all info
- **Hover**: Action buttons appear
- **Active**: Green checkmark
- **Inactive**: Red X mark

---

## 2. FacilityDetailView Component

### **Visual Layout**:
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Evergreen Care Home    [Edit] [×]         │
│          📍 Seattle, Washington                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ℹ️ Description                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ A premier assisted living facility...       │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  📞 Contact Information                             │
│  ┌─────────────────────────────────────────────┐  │
│  │ 📍 Address                                   │  │
│  │    123 Main St, Seattle, WA 98101           │  │
│  │                                              │  │
│  │ 📞 Phone                          [Copy]    │  │
│  │    (206) 555-0123                           │  │
│  │                                              │  │
│  │ ✉️  Email                          [Copy]    │  │
│  │    info@evergreen.com                       │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  🎨 Branding & Customization                        │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🌐 Subdomain                      [Copy]    │  │
│  │    evergreen.yourapp.com                    │  │
│  │                                              │  │
│  │ 🔑 Provider Code                  [Copy]    │  │
│  │    EVG2024                                  │  │
│  │                                              │  │
│  │ Brand Colors                                │  │
│  │ [🔵 #1E3A5F] [🟢 #86EFAC] [⚪ #FFFFFF]     │  │
│  │  Primary      Secondary     Accent          │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  📊 Statistics                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐   │
│  │ 🏢       │ 👥       │ ✅       │ 👤       │   │
│  │   5      │   42     │   5      │ John A.  │   │
│  │ Branches │ Users    │ Active   │ Owner    │   │
│  └──────────┴──────────┴──────────┴──────────┘   │
│                                                     │
│  ℹ️ System Information                     [▶]     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### **Features**:
- Copyable fields show ✅ when copied
- Collapsible sections have ▶/▼ arrows
- External links open in new tab
- Color swatches show actual colors

---

## 3. FacilityFormModal Component

### **Visual Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Create New Facility                          [×]   │
│  Add a new facility to the system...                │
│                                                     │
│  [Basic Info] [Contact] [Branding] [Modules] [Owner]│
│  ━━━━━━━━━━━                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚠️ Error Display (if any)                          │
│  ┌─────────────────────────────────────────────┐  │
│  │ ⚠️ Please fix the following errors:         │  │
│  │ • name: Facility name is required           │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  Facility Name *                                    │
│  [Enter facility name________________]             │
│                                                     │
│  Location *                Provider Code            │
│  [City, State_____]     [FACILITY123___]           │
│                                                     │
│  Description                                        │
│  [Enter facility description...                    │
│   ____________________________________________      │
│   ____________________________________________]     │
│                                                     │
│  ☑ Active Facility                                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│  15 of 15 modules enabled                          │
│                                                     │
│                    [Cancel] [✓ Create Facility]    │
└─────────────────────────────────────────────────────┘
```

### **Tab: Modules**:
```
┌─────────────────────────────────────────────────────┐
│  Module Access Control                              │
│  Select which modules are available...              │
│                              [Enable All] [Disable] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ ✅       │ │ ✅       │ │ ✅       │           │
│  │ Pharmacy │ │ Meds     │ │ Vitals   │           │
│  │ Inventory│ │ Admin    │ │ Monitor  │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ ✅       │ │ ❌       │ │ ✅       │           │
│  │ Appts    │ │ Assess   │ │ Sleep    │           │
│  │ Schedule │ │ Records  │ │ Tracking │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                     │
│  [... more modules ...]                            │
│                                                     │
│  14 of 15 modules enabled                          │
└─────────────────────────────────────────────────────┘
```

### **Tab: Branding**:
```
┌─────────────────────────────────────────────────────┐
│  🖼️ Facility Logo                                   │
│  [Choose File] logo.png                             │
│                                                     │
│  Preview:                                           │
│  ┌──────────┐                                       │
│  │  [LOGO]  │                                       │
│  └──────────┘                                       │
│                                                     │
│  🌐 Subdomain                                       │
│  [evergreen_________________]                       │
│  evergreen.yourapp.com                              │
│                                                     │
│  🎨 Brand Colors                                    │
│  Primary Color    Secondary Color    Accent Color   │
│  [🔵][#1E3A5F]   [🟢][#86EFAC]     [⚪][#FFFFFF]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. FacilityList Component

### **Visual Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Facilities Management                              │
│  Manage and configure facilities...  [+ Add Facility]│
│                                                     │
│  [🔍 Search facilities..._______________]           │
│  [All Facilities ▼] [Sort by Name ▼]               │
│                                                     │
│  Showing 3 of 5 facilities           [⊞] [☰]       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ Facility 1   │ │ Facility 2   │ │ Facility 3   ││
│  │ Card         │ │ Card         │ │ Card         ││
│  └──────────────┘ └──────────────┘ └──────────────┘│
│                                                     │
│  ┌──────────────┐ ┌──────────────┐                 │
│  │ Facility 4   │ │ Facility 5   │                 │
│  │ Card         │ │ Card         │                 │
│  └──────────────┘ └──────────────┘                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Displaying 5 facilities                            │
│                              [3 Active] [2 Inactive]│
└─────────────────────────────────────────────────────┘
```

### **Empty State**:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    🏢                               │
│                                                     │
│           No facilities yet                         │
│                                                     │
│  Get started by creating your first facility        │
│                                                     │
│              [+ Add First Facility]                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### **Loading State**:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    ⟳                                │
│                                                     │
│           Loading facilities...                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Color Palette

### **Status Colors**:
```
✅ Active:    #10B981 (Green)
❌ Inactive:  #EF4444 (Red)
⚠️ Warning:   #F59E0B (Orange)
ℹ️ Info:      #3B82F6 (Blue)
```

### **UI Colors**:
```
Primary:      #3B82F6 (Blue)
Secondary:    #6B7280 (Gray)
Success:      #10B981 (Green)
Danger:       #EF4444 (Red)
Background:   #F9FAFB (Light Gray)
Border:       #E5E7EB (Gray)
Text:         #111827 (Dark Gray)
```

---

## 📱 Responsive Breakpoints

### **Mobile** (< 768px):
- Single column layout
- Stacked form fields
- Full-width buttons
- Simplified navigation

### **Tablet** (768px - 1024px):
- Two column grid
- Side-by-side form fields
- Compact navigation

### **Desktop** (> 1024px):
- Three column grid
- Multi-column forms
- Full navigation
- Hover effects

---

## 🎭 Interactive States

### **Buttons**:
```
Default:  [Button]
Hover:    [Button] ← lighter background
Active:   [Button] ← darker background
Disabled: [Button] ← grayed out, no pointer
Loading:  [⟳ Button] ← spinner icon
```

### **Form Fields**:
```
Default:  [____________]
Focus:    [____________] ← blue border
Error:    [____________] ← red border
Success:  [____________] ← green border
Disabled: [____________] ← gray background
```

### **Cards**:
```
Default:  ┌──────┐
          │ Card │
          └──────┘

Hover:    ┌──────┐ ← shadow grows
          │ Card │ ← actions appear
          └──────┘
```

---

## 🔄 User Flows

### **Create Facility Flow**:
```
1. Click "Add Facility"
   ↓
2. Fill Basic Info tab
   ↓
3. Fill Contact tab
   ↓
4. Customize Branding (optional)
   ↓
5. Select Modules
   ↓
6. Setup Owner Account (optional)
   ↓
7. Click "Create Facility"
   ↓
8. Success notification
   ↓
9. Redirect to facility list
```

### **View Facility Flow**:
```
1. Click facility card
   ↓
2. Detail modal opens
   ↓
3. View all sections
   ↓
4. Copy fields if needed
   ↓
5. Click "Edit" or close
```

### **Edit Facility Flow**:
```
1. Click edit button
   ↓
2. Form modal opens with data
   ↓
3. Modify fields
   ↓
4. Change modules
   ↓
5. Click "Update Facility"
   ↓
6. Success notification
   ↓
7. List refreshes
```

---

## 🎯 Component Interactions

### **FacilityList → FacilityCard**:
```jsx
<FacilityList>
  {facilities.map(facility => (
    <FacilityCard facility={facility} />
  ))}
</FacilityList>
```

### **FacilityCard → FacilityDetailView**:
```jsx
<FacilityCard onView={handleView} />
  ↓
<FacilityDetailView facility={selected} />
```

### **FacilityDetailView → FacilityFormModal**:
```jsx
<FacilityDetailView onEdit={handleEdit} />
  ↓
<FacilityFormModal facility={selected} />
```

---

## 📊 Data Flow

```
API
 ↓
React Query
 ↓
FacilityList (state)
 ↓
FacilityCard (props)
 ↓
User Action
 ↓
FacilityFormModal / FacilityDetailView
 ↓
Mutation
 ↓
API
 ↓
Cache Invalidation
 ↓
Re-fetch
 ↓
Updated UI
```

---

## 🎨 Animation Examples

### **Modal Enter**:
```
Fade in + Scale up
0ms:   opacity: 0, scale: 0.95
200ms: opacity: 1, scale: 1
```

### **Card Hover**:
```
Shadow transition
0ms:   shadow: sm
200ms: shadow: lg
```

### **Button Click**:
```
Scale down + up
0ms:   scale: 1
100ms: scale: 0.95
200ms: scale: 1
```

---

## 🔍 Accessibility Features

### **Keyboard Navigation**:
- Tab through form fields
- Enter to submit
- Escape to close modals
- Arrow keys in dropdowns

### **Screen Readers**:
- ARIA labels on all inputs
- Role attributes on modals
- Alt text on images
- Status announcements

### **Focus Management**:
- Visible focus indicators
- Focus trap in modals
- Auto-focus on first field
- Return focus on close

---

## 🎉 Visual Summary

All components feature:
- ✅ Clean, modern design
- ✅ Consistent spacing
- ✅ Professional typography
- ✅ Intuitive icons
- ✅ Smooth transitions
- ✅ Responsive layouts
- ✅ Accessible markup
- ✅ Loading states
- ✅ Error handling
- ✅ Success feedback

**Ready for production use!** 🚀
