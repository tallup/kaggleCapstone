# Fix Medication Administration Button Logic

## Issue Description

The "Administer" button on medication cards remains active even when:
1. All scheduled administration times have been completed/marked (completed, missed, refused, or hospital admission)
2. The current time is outside the administration window for scheduled medications

## Current Behavior

**Example 1 - Eleanor Davis - Aspirin (Twice daily)**
- Time 1: 1:00 AM - Marked as "Missed" ✓
- Time 2: 3:00 AM - Marked as "Hospital" ✓
- Current time: 10:33 AM
- **Problem**: "Administer" button is still active despite both times being marked

**Example 2 - Robert Johnson - Aspirin (Twice daily)**
- Time 1: 3:00 AM - Marked as "Hospital" ✓
- Time 2: 4:00 AM - Not yet administered
- Current time: 10:33 AM (6+ hours after scheduled time)
- **Problem**: "Administer" button is active even though it's outside the administration window

**Example 3 - Frank Anderson - Atorvastatin (Twice daily)**
- Time 1: 3:00 AM - Not yet time
- Time 2: 4:00 AM - Not yet time
- Current time: 2:50 AM (10 minutes before first scheduled time)
- **Problem**: "Administer" button is active even though the medication period hasn't started yet

## Expected Behavior

The "Administer" button should be **disabled** when:

1. **Daily limit reached**: All scheduled administrations for the day have been recorded (regardless of status: completed, missed, refused, or hospital_admission)
   - For b.i.d (twice daily): Disable after 2 administrations
   - For t.i.d (thrice daily): Disable after 3 administrations
   - For q.i.d (four times daily): Disable after 4 administrations

2. **Outside time window**: For non-PRN medications, when current time is outside the ±60 minute window of any scheduled time

3. **All times administered**: When all defined time slots (time_1, time_2, time_3, time_4) have corresponding administration records for today

## Root Cause Analysis

### Location
`/home/taal/Documents/Evergreen/resources/js/pages/Medications.jsx`
- Component: `QuickAdminister`
- Functions: `checkTimeWindow()`, `getDailyLimit()`, and daily limit checking logic

### Suspected Issues

1. **Daily limit calculation** may not be counting hospital_admission status
   - The query fetching today's administrations might not include all statuses
   - The count comparison might not account for hospital_admission

2. **Time window logic** may not properly disable button when all windows have closed
   - `checkTimeWindow()` function may have edge cases
   - `isWithinTimeWindow` state may not update correctly

3. **Status counting** - The logic that counts completed administrations may only count "completed" status and ignore "missed", "refused", and "hospital_admission"

## Proposed Fix

### Step 1: Update Daily Limit Checking

Ensure the daily limit check counts ALL administration statuses:

```javascript
// In QuickAdminister component
const { data: todayAdmins } = useQuery({
    queryKey: ['medication-administrations-today', medication.id],
    queryFn: async () => {
        const today = getPacificISODate();
        const response = await api.get('/medication-administrations', {
            params: {
                medication_id: medication.id,
                date_from: today,
                date_to: today,
                per_page: 100,
            },
        });
        return response.data;
    },
});

// Count ALL administrations regardless of status
const todayCount = todayAdmins?.data?.length || 0;
const dailyLimit = getDailyLimit();

// Set isDailyLimitReached
useEffect(() => {
    if (dailyLimit !== null && todayCount >= dailyLimit) {
        setIsDailyLimitReached(true);
    } else {
        setIsDailyLimitReached(false);
    }
}, [todayCount, dailyLimit]);
```

### Step 2: Improve Time Window Logic

Ensure button is disabled when all time windows have passed:

```javascript
const checkTimeWindow = React.useCallback(() => {
    const times = [
        medication.time_1,
        medication.time_2,
        medication.time_3,
        medication.time_4,
    ].filter(Boolean);

    // Check if ALL times have passed their windows
    const now = getPacificNow();
    const allWindowsClosed = times.every(timeValue => {
        const scheduledTime = toPacificDateFromTime(timeValue);
        const windowEndTime = new Date(scheduledTime.getTime() + (60 * 60 * 1000)); // +60 min
        return now > windowEndTime;
    });

    if (allWindowsClosed && !isPrnMedication) {
        setHasClosedWindow(true);
        setIsWithinTimeWindow(false);
        return;
    }

    // ... rest of existing logic
}, [medication, isPrnMedication]);
```

### Step 3: Add Explicit Check for All Times Administered

```javascript
// Check if all scheduled times have been administered
const allTimesAdministered = React.useMemo(() => {
    if (!todayAdmins?.data) return false;
    
    const times = [
        medication.time_1,
        medication.time_2,
        medication.time_3,
        medication.time_4,
    ].filter(Boolean);

    if (times.length === 0) return false;

    // Check if we have an administration record for each time slot
    return times.every(timeValue => {
        return todayAdmins.data.some(admin => {
            // Check if this administration matches this time slot (within tolerance)
            const adminTime = new Date(admin.administered_at);
            const scheduledTime = toPacificDateFromTime(timeValue);
            const timeDiff = Math.abs(adminTime - scheduledTime);
            const tolerance = 90 * 60 * 1000; // 90 minutes
            return timeDiff <= tolerance;
        });
    });
}, [todayAdmins, medication]);
```

### Step 4: Update Button Disabled Logic

```javascript
const isButtonDisabled =
    submitting || 
    isDailyLimitReached || 
    allTimesAdministered ||
    !isMedicationPeriodActive || 
    (!isWithinTimeWindow && !isPrnMedication);
```

## Testing Checklist

- [ ] Test b.i.d medication with both times completed - button should be disabled
- [ ] Test b.i.d medication with both times marked as hospital_admission - button should be disabled
- [ ] Test b.i.d medication with one time completed, one missed - button should be disabled
- [ ] Test medication outside time window - button should be disabled
- [ ] Test PRN medication - button should always be enabled (unless daily limit reached)
- [ ] Test medication with mixed statuses (completed, missed, refused, hospital_admission)
- [ ] Test at different times of day (before, during, and after administration windows)
- [ ] Test with medications that have 1, 2, 3, and 4 scheduled times

## Files to Modify

1. `/home/taal/Documents/Evergreen/resources/js/pages/Medications.jsx`
   - QuickAdminister component
   - checkTimeWindow function
   - Daily limit checking logic
   - Button disabled state calculation

## Priority

**High** - This affects medication safety and compliance tracking

## Estimated Effort

2-3 hours (including testing)
