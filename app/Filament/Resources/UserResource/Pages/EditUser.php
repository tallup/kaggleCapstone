<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Models\Role;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Ensure name field is populated from name components
        if (empty($data['name']) || isset($data['first_name']) || isset($data['last_name'])) {
            $firstName = $data['first_name'] ?? $this->record->first_name ?? '';
            $middleNames = $data['middle_names'] ?? $this->record->middle_names ?? '';
            $lastName = $data['last_name'] ?? $this->record->last_name ?? '';
            
            $fullName = trim(implode(' ', array_filter([$firstName, $middleNames, $lastName])));
            if (!empty($fullName)) {
                $data['name'] = $fullName;
            } elseif (empty($data['name'])) {
                $data['name'] = $data['email'] ?? $this->record->email ?? '';
            }
        }

        // Branch admins must have an assigned_branch_id
        if (($data['role'] ?? $this->record->role) === 'admin') {
            $assignedBranchId = $data['assigned_branch_id'] ?? $this->record->assigned_branch_id;
            if (empty($assignedBranchId)) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['assigned_branch_id' => ['Branch admins must have an assigned branch.']]
                );
            }
        }

        return $data;
    }

    protected function afterSave(): void
    {
        // Automatically assign the appropriate role based on user role field
        $user = $this->record;
        $role = $user->role ?? null;
        
        if ($role === 'administrator') {
            $adminRole = Role::where('name', 'administrator')->first();
            if ($adminRole) {
                if (!$user->hasRole('administrator')) {
                    $user->assignRole('administrator');
                }
            }
            // Remove admin role if it exists
            if ($user->hasRole('admin')) {
                $user->roles()->where('name', 'admin')->detach();
            }
        } elseif ($role === 'admin') {
            $adminRole = Role::where('name', 'admin')->first();
            if ($adminRole) {
                if (!$user->hasRole('admin')) {
                    $user->assignRole('admin');
                }
            }
            // Remove administrator role if it exists
            if ($user->hasRole('administrator')) {
                $user->roles()->where('name', 'administrator')->detach();
            }
        } else {
            // Remove both admin roles if role is changed to something else
            if ($user->hasRole('administrator')) {
                $user->roles()->where('name', 'administrator')->detach();
            }
            if ($user->hasRole('admin')) {
                $user->roles()->where('name', 'admin')->detach();
            }
        }
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function getFormActions(): array
    {
        return parent::getFormActions();
    }
}
