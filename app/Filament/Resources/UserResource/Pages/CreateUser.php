<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Models\Role;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

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

        return $data;
    }

    protected function afterCreate(): void
    {
        // Automatically assign administrator role if user role is 'admin' or 'administrator'
        $user = $this->record;
        $role = $user->role ?? null;
        
        if (in_array($role, ['admin', 'administrator'])) {
            $adminRole = Role::where('name', 'administrator')->first();
            if ($adminRole && !$user->hasRole('administrator')) {
                $user->assignRole('administrator');
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
