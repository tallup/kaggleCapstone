<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// User-specific private channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Facility-wide channel (all users in a facility)
Broadcast::channel('facility.{facilityId}', function ($user, $facilityId) {
    return $user->facility_id == $facilityId || $user->role === 'super_admin';
});

// Branch-specific channel (all users in a branch)
Broadcast::channel('branch.{branchId}', function ($user, $branchId) {
    return $user->assigned_branch_id == $branchId 
        || $user->facility_id == \App\Models\Branch::find($branchId)?->facility_id
        || $user->role === 'super_admin';
});

// Resident-specific channel (caregivers assigned to resident)
Broadcast::channel('resident.{residentId}', function ($user, $residentId) {
    $resident = \App\Models\Resident::find($residentId);
    if (!$resident) {
        return false;
    }
    
    // Super admin can access all
    if ($user->role === 'super_admin') {
        return true;
    }
    
    // Check if user is assigned to this resident
    $isAssigned = \App\Models\ResidentAssignment::where('resident_id', $residentId)
        ->where('caregiver_id', $user->id)
        ->where('is_active', true)
        ->exists();
    
    // Check if user is in same branch/facility
    $isInBranch = $user->assigned_branch_id == $resident->branch_id;
    $isInFacility = $user->facility_id == $resident->branch?->facility_id;
    
    // Admins in same facility can access
    $isAdmin = in_array($user->role, ['administrator', 'admin', 'manager']) && $isInFacility;
    
    return $isAssigned || $isInBranch || $isAdmin;
});

// Family portal messages: staff with access to resident, or family linked via ResidentContact
Broadcast::channel('family-messages.{residentId}', function ($user, $residentId) {
    $resident = \App\Models\Resident::find($residentId);
    if (!$resident) {
        return false;
    }
    if ($user->isFamily()) {
        return \App\Models\ResidentContact::where('user_id', $user->id)->where('resident_id', $residentId)->exists();
    }
    if ($user->role === 'super_admin') {
        return true;
    }
    $isInBranch = $user->assigned_branch_id == $resident->branch_id;
    $isInFacility = $user->facility_id == ($resident->branch?->facility_id ?? null);
    $isAdmin = in_array($user->role, ['administrator', 'admin', 'manager']) && $isInFacility;
    return $isInBranch || $isAdmin;
});

// Presence channel for user activity tracking
Broadcast::channel('presence-facility.{facilityId}', function ($user, $facilityId) {
    if ($user->facility_id == $facilityId || $user->role === 'super_admin') {
        return [
            'id' => $user->id,
            'name' => $user->name ?? ($user->first_name . ' ' . $user->last_name),
            'role' => $user->role,
            'avatar' => null, // Add avatar URL if available
        ];
    }
    return false;
});
