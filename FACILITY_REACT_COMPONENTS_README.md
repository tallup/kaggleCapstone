# Facility Management React Components

## Overview

A comprehensive suite of React components for managing facilities in the Evergreen healthcare management system. These components provide a complete, production-ready UI for facility CRUD operations with advanced features like module management, branding customization, and detailed views.

---

## Components

### 1. **FacilityCard**

A reusable card component for displaying facility information in a compact, visually appealing format.

#### Features:
- ✅ Logo display with fallback icon
- ✅ Contact information (address, phone, email)
- ✅ Status indicators (active/inactive)
- ✅ Statistics (branches count, users count)
- ✅ Color-coded branding indicators
- ✅ Subdomain and provider code display
- ✅ Hover actions (view, edit, delete)
- ✅ Responsive design

#### Props:
```javascript
{
  facility: Object,        // Facility data object
  onEdit: Function,        // Callback when edit button clicked
  onDelete: Function,      // Callback when delete button clicked
  onView: Function,        // Callback when view button clicked
  showActions: Boolean     // Show/hide action buttons (default: true)
}
```

#### Usage:
```jsx
import { FacilityCard } from '@/components/facility';

<FacilityCard
  facility={facilityData}
  onEdit={(facility) => handleEdit(facility)}
  onDelete={(facility) => handleDelete(facility)}
  onView={(facility) => handleView(facility)}
/>
```

---

### 2. **FacilityDetailView**

A comprehensive modal component for viewing all facility details in an organized, sectioned layout.

#### Features:
- ✅ Full facility information display
- ✅ Copyable fields (phone, email, subdomain, provider code)
- ✅ Color swatches for brand colors
- ✅ Statistics cards
- ✅ Collapsible sections
- ✅ External links for brochure
- ✅ System information (created/updated dates)
- ✅ Edit action from view mode

#### Sections:
1. **Description** - Facility description
2. **Contact Information** - Address, phone, email
3. **Marketing Information** - Brochure URL and theme
4. **Branding & Customization** - Logo, subdomain, provider code, colors
5. **Statistics** - Branch count, user count, owner info
6. **System Information** - Timestamps (collapsible)

#### Props:
```javascript
{
  facility: Object,        // Facility data object
  onEdit: Function,        // Callback when edit button clicked
  onClose: Function        // Callback when modal closed
}
```

#### Usage:
```jsx
import { FacilityDetailView } from '@/components/facility';

{showDetail && (
  <FacilityDetailView
    facility={selectedFacility}
    onEdit={(facility) => handleEdit(facility)}
    onClose={() => setShowDetail(false)}
  />
)}
```

---

### 3. **FacilityFormModal**

A comprehensive tabbed form modal for creating and editing facilities with full customization options.

#### Features:
- ✅ Tabbed interface for organized data entry
- ✅ Module management with enable/disable toggles
- ✅ Branding customization (logo, colors, subdomain)
- ✅ Owner account creation (for new facilities)
- ✅ Initial branch setup
- ✅ Form validation with error display
- ✅ Logo preview
- ✅ Color pickers
- ✅ Responsive design
- ✅ Loading states

#### Tabs:
1. **Basic Info** - Name, location, description, provider code
2. **Contact** - Address, phone, email, brochure
3. **Branding** (Super Admin) - Logo, subdomain, brand colors
4. **Modules** (Super Admin) - Module access control
5. **Owner Account** (New facilities, Super Admin) - Owner setup

#### Props:
```javascript
{
  facility: Object,        // Facility data (null for create)
  isSuperAdmin: Boolean,   // Show super admin features
  onClose: Function,       // Callback when modal closed
  onSubmit: Function,      // Callback when form submitted
  isSubmitting: Boolean    // Loading state
}
```

#### Usage:
```jsx
import { FacilityFormModal } from '@/components/facility';

{showForm && (
  <FacilityFormModal
    facility={editingFacility}
    isSuperAdmin={currentUser?.role === 'super_admin'}
    onClose={() => setShowForm(false)}
    onSubmit={handleSubmit}
    isSubmitting={isSubmitting}
  />
)}
```

---

### 4. **FacilityList**

A comprehensive list/grid view component with search, filtering, and sorting capabilities.

#### Features:
- ✅ Grid and list view modes
- ✅ Real-time search
- ✅ Status filtering (all/active/inactive)
- ✅ Sorting (name/location/date)
- ✅ Empty states
- ✅ Loading states
- ✅ Statistics display
- ✅ Create facility button
- ✅ Responsive design

#### Props:
```javascript
{
  facilities: Array,       // Array of facility objects
  isLoading: Boolean,      // Loading state
  onEdit: Function,        // Callback when edit clicked
  onDelete: Function,      // Callback when delete clicked
  onView: Function,        // Callback when view clicked
  onCreate: Function,      // Callback when create clicked
  searchTerm: String,      // Search value
  onSearchChange: Function // Search change callback
}
```

#### Usage:
```jsx
import { FacilityList } from '@/components/facility';

<FacilityList
  facilities={facilities}
  isLoading={isLoading}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onView={handleView}
  onCreate={handleCreate}
  searchTerm={search}
  onSearchChange={setSearch}
/>
```

---

## Complete Example

Here's a complete example of using all components together:

```jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { 
  FacilityList, 
  FacilityDetailView, 
  FacilityFormModal 
} from '@/components/facility';

export default function FacilitiesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Fetch facilities
  const { data: facilities, isLoading } = useQuery({
    queryKey: ['facilities', search],
    queryFn: async () => {
      const res = await api.get('/facilities', { params: { search } });
      return res.data.data;
    },
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await api.get('/user');
      return res.data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async ({ data, id }) => {
      if (id) {
        return await api.post(`/facilities/${id}`, data);
      }
      return await api.post('/facilities', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facilities']);
      setShowForm(false);
      setSelectedFacility(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/facilities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['facilities']);
    },
  });

  const handleCreate = () => {
    setSelectedFacility(null);
    setShowForm(true);
  };

  const handleEdit = (facility) => {
    setSelectedFacility(facility);
    setShowForm(true);
    setShowDetail(false);
  };

  const handleView = (facility) => {
    setSelectedFacility(facility);
    setShowDetail(true);
  };

  const handleDelete = (facility) => {
    if (window.confirm(`Delete ${facility.name}?`)) {
      deleteMutation.mutate(facility.id);
    }
  };

  const handleSubmit = async (formData, id) => {
    await saveMutation.mutateAsync({ data: formData, id });
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <div className="p-6">
      <FacilityList
        facilities={facilities || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onCreate={handleCreate}
        searchTerm={search}
        onSearchChange={setSearch}
      />

      {showForm && (
        <FacilityFormModal
          facility={selectedFacility}
          isSuperAdmin={isSuperAdmin}
          onClose={() => {
            setShowForm(false);
            setSelectedFacility(null);
          }}
          onSubmit={handleSubmit}
          isSubmitting={saveMutation.isPending}
        />
      )}

      {showDetail && selectedFacility && (
        <FacilityDetailView
          facility={selectedFacility}
          onEdit={handleEdit}
          onClose={() => {
            setShowDetail(false);
            setSelectedFacility(null);
          }}
        />
      )}
    </div>
  );
}
```

---

## Module Management

The facility form includes comprehensive module management:

### Available Modules:
1. **Pharmacy** - Pharmacy inventory and orders
2. **Medications** - Medication administration records
3. **Vitals** - Vital signs monitoring
4. **Appointments** - Appointment scheduling
5. **Assessments** - Resident assessments
6. **Sleep Records** - Sleep pattern tracking
7. **Housekeeping** - Cleaning and maintenance
8. **Reports** - Analytics and reporting
9. **Residents** - Resident management
10. **Behaviors** - Behavior tracking
11. **Incidents** - Incident reporting
12. **Leave Requests** - Staff leave management
13. **Employee Documents** - Staff documentation
14. **Grocery Status** - Grocery management
15. **Fire Drills** - Fire drill tracking

### Module Controls:
- Individual toggle per module
- Enable all / Disable all buttons
- Visual indicators (green = enabled, gray = disabled)
- Module count display

---

## Styling

All components use:
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Responsive design** (mobile-first)
- **Consistent color scheme**:
  - Primary: Blue (#3B82F6)
  - Success: Green (#10B981)
  - Danger: Red (#EF4444)
  - Warning: Orange (#F59E0B)

---

## Dependencies

```json
{
  "react": "^19.2.0",
  "lucide-react": "^0.548.0",
  "@tanstack/react-query": "^5.90.5"
}
```

---

## File Structure

```
resources/js/components/facility/
├── FacilityCard.jsx          # Card component
├── FacilityDetailView.jsx    # Detail view modal
├── FacilityFormModal.jsx     # Create/Edit form
├── FacilityList.jsx          # List/Grid view
└── index.js                  # Export all components
```

---

## API Integration

Components expect the following API endpoints:

### GET `/facilities`
Query params: `{ search: string, per_page: number }`
Response: `{ data: Facility[] }`

### POST `/facilities`
Body: FormData with facility fields
Response: `{ data: Facility }`

### POST `/facilities/:id`
Body: FormData with facility fields
Response: `{ data: Facility }`

### DELETE `/facilities/:id`
Response: `{ message: string }`

---

## Facility Data Structure

```typescript
interface Facility {
  id: number;
  name: string;
  location: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  subdomain?: string;
  provider_code?: string;
  is_active: boolean;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  brochure_url?: string;
  brochure_color?: 'blue' | 'green' | 'purple' | 'red';
  branches_count?: number;
  users_count?: number;
  enabled_modules?: string[];
  created_at: string;
  updated_at: string;
  owner?: {
    id: number;
    name: string;
  };
}
```

---

## Features Summary

### ✅ **User Experience**
- Intuitive tabbed interface
- Real-time search and filtering
- Grid/list view toggle
- Copyable fields
- Loading and empty states
- Responsive design

### ✅ **Functionality**
- Complete CRUD operations
- Module management
- Branding customization
- Owner account setup
- Form validation
- Error handling

### ✅ **Visual Design**
- Modern, clean interface
- Color-coded status indicators
- Icon-rich UI
- Smooth transitions
- Professional styling

### ✅ **Accessibility**
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader friendly

---

## Best Practices

1. **Always validate user input** before submission
2. **Use React Query** for data fetching and caching
3. **Handle errors gracefully** with user-friendly messages
4. **Provide loading states** for better UX
5. **Use TypeScript** for better type safety (optional)
6. **Test components** with different data scenarios
7. **Optimize images** before upload
8. **Implement proper permission checks** on the backend

---

## Future Enhancements

Potential additions:
- 📊 Facility analytics dashboard
- 📈 Module usage statistics
- 🔄 Bulk operations
- 📧 Email notifications
- 🎨 Live branding preview
- 📱 QR code generation
- 🔗 URL preview
- 📋 Activity logs
- 👥 User assignment interface
- 🏢 Branch management integration

---

## Support

For issues or questions:
1. Check the component props documentation
2. Review the complete example
3. Verify API endpoint responses
4. Check browser console for errors
5. Ensure all dependencies are installed

---

**Built with ❤️ for Evergreen Healthcare Management System**
