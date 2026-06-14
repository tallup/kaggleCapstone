<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Models\Role;
use App\Mail\WelcomeToFacilityNotification;
use App\Services\MailConfigurationService;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Ensure name field is populated from name components
        if (empty($data['name'])) {
            $firstName = $data['first_name'] ?? '';
            $middleNames = $data['middle_names'] ?? '';
            $lastName = $data['last_name'] ?? '';
            
            $data['name'] = trim(implode(' ', array_filter([$firstName, $middleNames, $lastName]))) ?: $data['email'];
        }

        // Auto-set facility_id from creator (for non-super admins)
        $currentUser = auth()->user();
        if ($currentUser && $currentUser->role !== 'super_admin') {
            // First try creator's facility_id
            if (empty($data['facility_id']) && $currentUser->facility_id) {
                $data['facility_id'] = $currentUser->facility_id;
            }
            // If still not set, try to derive from creator's assigned_branch_id
            if (empty($data['facility_id']) && $currentUser->assigned_branch_id) {
                $branch = \App\Models\Branch::find($currentUser->assigned_branch_id);
                if ($branch && $branch->facility_id) {
                    $data['facility_id'] = $branch->facility_id;
                }
            }
        }

        // Branch admins must have an assigned_branch_id
        if (($data['role'] ?? '') === 'admin') {
            if (empty($data['assigned_branch_id'])) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['assigned_branch_id' => ['Branch admins must have an assigned branch.']]
                );
            }
        }

        return $data;
    }

    protected function afterCreate(): void
    {
        // Automatically assign the appropriate role based on user role field
        $user = $this->record;
        $role = $user->role ?? null;
        
        if ($role === 'administrator') {
            $adminRole = Role::where('name', 'administrator')->first();
            if ($adminRole && !$user->hasRole('administrator')) {
                $user->assignRole('administrator');
            }
        } elseif ($role === 'admin') {
            $adminRole = Role::where('name', 'admin')->first();
            if ($adminRole && !$user->hasRole('admin')) {
                $user->assignRole('admin');
            }
        }

        // Send welcome email if user has email and facility
        if ($user->email && $user->facility_id) {
            try {
                $mailConfigService = app(MailConfigurationService::class);
                $facility = $user->facility;
                
                // Configure mail for facility
                if ($facility) {
                    $mailConfigService->configureForFacility($facility);
                }
                
                // Get temporary password from form data if available
                $formData = $this->form->getState();
                $temporaryPassword = $formData['password'] ?? null;
                
                // Send welcome email
                Mail::to($user->email)->send(
                    new WelcomeToFacilityNotification($user, $facility, $user->assignedBranch, $temporaryPassword)
                );
                
                Log::info('Welcome email sent to new user (Filament)', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'facility_id' => $user->facility_id,
                ]);
            } catch (\Exception $e) {
                // Log error but don't fail user creation
                Log::error('Failed to send welcome email to new user (Filament)', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function getFormActions(): array
    {
        $actions = parent::getFormActions();
        
        // Add confirmation to the create/save button
        foreach ($actions as $action) {
            if ($action instanceof Actions\CreateAction || $action->getName() === 'create') {
                $action->requiresConfirmation()
                    ->modalHeading('Create User')
                    ->modalDescription('Are you sure you want to create this user?')
                    ->modalSubmitActionLabel('Yes, Create');
                break;
            }
        }
        
        return $actions;
    }
}
