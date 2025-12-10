# How to Fix "Location Coordinates Not Configured" Error

## Problem
The error "Your assigned location does not have coordinates configured" appears because your assigned branch or facility doesn't have latitude/longitude coordinates set up.

## Solution Options

### Option 1: Via Admin Panel (Recommended)

1. **Log into Admin Panel**: Go to `/admin` and login
2. **Navigate to Branches**: Go to **Administration** → **Branches**
3. **Find Your Branch**: Search for "Main facility" or your assigned branch
4. **Edit the Branch**: Click on the branch to edit it
5. **Add Address**: Enter a complete address in the Address field (e.g., "123 Main St, City, State, ZIP")
6. **Geocode Automatically**: Click the "Geocode from Address" button - this will automatically populate latitude/longitude
7. **Or Enter Manually**: If geocoding fails, you can manually enter coordinates:
   - **Latitude**: Between -90 and 90 (e.g., 47.6062)
   - **Longitude**: Between -180 and 180 (e.g., -122.3321)
8. **Save**: Click "Save" to update the branch

### Option 2: Via Database (Quick Fix)

If you know the coordinates, you can update them directly:

```sql
-- Update branch coordinates
UPDATE branches SET latitude = 47.6062, longitude = -122.3321 WHERE id = 13;
```

Replace `47.6062` and `-122.3321` with your actual branch location coordinates.

### Option 3: Via Artisan Command

If you add an address first, you can run:

```bash
php artisan geocode:locations --branch-id=13
```

Or to geocode all branches/facilities that need coordinates:

```bash
php artisan geocode:locations
```

### Option 4: Disable Location Check (Temporary)

If you need to temporarily disable location verification for testing:

1. Go to Admin Panel → Users
2. Edit the user
3. Enable "Location Check Bypass" option
4. Save

**Note**: This should only be used for testing, not in production.

## Finding Coordinates

You can find coordinates for your location using:
- Google Maps: Right-click on the location → Click coordinates → Copy
- Or use an online geocoding service

## After Adding Coordinates

Once coordinates are added, the clock-in system will:
1. Check if you're within 50 meters (0.05 km) of the branch/facility
2. Allow clock-in only if you're at the location
3. Block clock-in if you're too far away

## Current Status

Your assigned branch: **Main facility** (ID: 13)
- Current address: None
- Current coordinates: Not set
- Status: Needs configuration




















