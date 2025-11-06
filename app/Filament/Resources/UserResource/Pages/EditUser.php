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

        return $data;
    }

    protected function afterSave(): void
    {
        // Automatically assign administrator role if user role is 'admin' or 'administrator'
        $user = $this->record;
        $role = $user->role ?? null;
        
        if (in_array($role, ['admin', 'administrator'])) {
            $adminRole = Role::where('name', 'administrator')->first();
            if ($adminRole) {
                if (!$user->hasRole('administrator')) {
                    $user->assignRole('administrator');
                }
            }
        } else {
            // Remove administrator role if role is changed to something else
            if ($user->hasRole('administrator')) {
                $user->roles()->where('name', 'administrator')->detach();
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
