# Check-In/Check-Out System Access Guide

## Quick Access URLs

### Public Access (No Login Required)

**Public Staff Clock-In**
- **URL**: `https://your-domain.com/staff/clock-in`
- **Use Case**: Quick clock-in/out for staff without logging into the system
- **Requirements**: 
  - Employee email or ID
  - Optional PIN (if configured)
  - **Location permission required** (must be at facility/branch)

### Authenticated Access (Login Required)

**React App Base URL**: `https://your-domain.com/app/login`

After logging in, access these pages:

1. **Staff Clock-In/Out** (Authenticated)
   - URL: `/app/staff/clock`
   - Full URL: `https://your-domain.com/app/staff/clock`
   - Features: Clock in/out with stats and history

2. **Resident Sign-Outs**
   - URL: `/app/residents/sign-out`
   - Full URL: `https://your-domain.com/app/residents/sign-out`
   - Features: Sign residents out/in, track overdue returns

3. **Visitors**
   - URL: `/app/visitors`
   - Full URL: `https://your-domain.com/app/visitors`
   - Features: Check visitors in/out

### Admin Panel (Filament)

**Admin Panel URL**: `https://your-domain.com/admin`

After logging in, navigate to:

1. **Staff Clock-Ins**
   - Navigate to: **Staff Management** → **Staff Clock-Ins**
   - View all clock-ins, filter by date/staff/branch
   - Export data

2. **Resident Sign-Outs**
   - Navigate to: **Resident Management** → **Resident Sign-Outs**
   - View all sign-outs, filter by status (active/returned)
   - See overdue alerts

3. **Visitors**
   - Navigate to: **Operations** → **Visitors**
   - View all visitor check-ins
   - Filter by status (active/checked out)

## API Endpoints

### Public Endpoints (No Authentication)

- `POST /api/public/staff/verify-employee` - Verify employee identity
- `POST /api/public/staff/clock-in` - Public clock-in
- `POST /api/public/staff/clock-out` - Public clock-out

### Authenticated Endpoints (Requires Login)

**Staff Clock-Ins**
- `POST /api/v1/staff/clock-in` - Clock in
- `POST /api/v1/staff/clock-out` - Clock out
- `GET /api/v1/staff/clock-ins/current` - Get current clock-in status
- `GET /api/v1/staff/clock-ins` - List clock-ins
- `GET /api/v1/staff/clock-ins/stats` - Get stats (hours worked)

**Resident Sign-Outs**
- `POST /api/v1/residents/{id}/sign-out` - Sign out resident
- `POST /api/v1/residents/{id}/sign-in` - Sign in resident
- `GET /api/v1/residents/{id}/sign-outs` - List sign-out history
- `GET /api/v1/residents/sign-outs/active` - Get active sign-outs
- `GET /api/v1/residents/sign-outs/overdue` - Get overdue sign-outs

**Visitors**
- `POST /api/v1/visitors/check-in` - Check in visitor
- `POST /api/v1/visitors/{id}/check-out` - Check out visitor
- `GET /api/v1/visitors` - List visitors
- `GET /api/v1/visitors/active` - Get active visitors
- `GET /api/v1/visitors/{id}` - Get visitor details

## Setup Steps

1. **Run Migrations**
   ```bash
   php artisan migrate
   ```

2. **Set Up Clock PIN (Optional)**
   - Edit a user in the admin panel
   - Set a `clock_pin` (will be hashed automatically)
   - Or update via database/seeder

3. **Configure Location**
   - Ensure branches/facilities have latitude/longitude coordinates
   - Staff must be within 50 meters (0.05 km) to clock in

## Features

### Staff Clock-In
- ✅ Location verification (mandatory)
- ✅ Public access (no login required)
- ✅ Authenticated access (with stats)
- ✅ Track total hours worked
- ✅ View clock-in history

### Resident Sign-Out
- ✅ Track destination and purpose
- ✅ Expected return time
- ✅ Overdue alerts
- ✅ Emergency contact notifications

### Visitor Check-In
- ✅ Visitor information capture
- ✅ Track who they're visiting
- ✅ Expected duration
- ✅ Check-in/check-out tracking

## Important Notes

- **Location is MANDATORY** for staff clock-ins (both public and authenticated)
- Staff must be within **50 meters** of assigned branch/facility
- Public clock-in has rate limiting (5 attempts per hour per employee/IP)
- All clock-ins are logged with location coordinates
- Clock PIN is optional - if not set, no PIN required for public clock-in















