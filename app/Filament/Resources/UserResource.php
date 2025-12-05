<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Filament\Resources\UserResource\RelationManagers;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Actions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';
    protected static ?string $navigationLabel = 'Users';
    protected static ?string $modelLabel = 'User';
    protected static ?string $pluralModelLabel = 'Users';
    protected static ?string $navigationGroup = 'Administration';
    protected static bool $shouldRegisterNavigation = false; // Handled by CustomNavigationProvider

    public static function shouldRegisterNavigation(): bool
    {
        // Only register if user has permission AND is not a caregiver
        if (!auth()->check()) {
            return false;
        }
        
        $user = auth()->user();
        
        // Caregivers should NEVER see this in navigation
        $roleValue = strtolower(trim($user->role ?? ''));
        $roleValueNormalized = str_replace([' ', '_'], '', $roleValue);
        $isCaregiver = $user->hasRole('caregiver') || 
                       $user->hasRole('care_giver') || 
                       $roleValueNormalized === 'caregiver' ||
                       (stripos($roleValue, 'care') !== false && stripos($roleValue, 'giver') !== false);
        
        if ($isCaregiver) {
            return false;
        }
        
        // Only show if user has permission
        return $user->hasPermission('view_users');
    }

    public static function canViewAny(): bool
    {
        return auth()->user()->hasPermission('view_users');
    }

    public static function canCreate(): bool
    {
        return auth()->user()->hasPermission('create_users');
    }

    public static function canEdit($record): bool
    {
        return auth()->user()->hasPermission('edit_users');
    }

    public static function canDelete($record): bool
    {
        return auth()->user()->hasPermission('delete_users');
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Personal Information')
                    ->schema([
                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->placeholder('staff@serenityafh.com')
                            ->helperText('This will be used for login'),
                        
                        Forms\Components\FileUpload::make('profile_image')
                            ->label('Profile Picture')
                            ->image()
                            ->imageEditor()
                            ->imageEditorAspectRatios([
                                null,
                                '16:9',
                                '4:3',
                                '1:1',
                            ])
                            ->maxSize(5120)
                            ->disk('public')
                            ->directory('profile-images')
                            ->visibility('private')
                            ->helperText('Upload a profile picture (max 5MB)')
                            ->columnSpanFull(),
                        
                        Forms\Components\Hidden::make('name')
                            ->afterStateUpdated(function ($state, $set, $get) {
                                $firstName = $get('first_name') ?? '';
                                $middleNames = $get('middle_names') ?? '';
                                $lastName = $get('last_name') ?? '';
                                
                                $fullName = trim(implode(' ', array_filter([$firstName, $middleNames, $lastName])));
                                $set('name', $fullName);
                            }),
                        Forms\Components\TextInput::make('first_name')
                            ->label('First Name')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Enter first name')
                            ->live()
                            ->afterStateUpdated(function ($state, $set, $get) {
                                $firstName = $state ?? '';
                                $middleNames = $get('middle_names') ?? '';
                                $lastName = $get('last_name') ?? '';
                                
                                $fullName = trim(implode(' ', array_filter([$firstName, $middleNames, $lastName])));
                                $set('name', $fullName);
                            }),
                        Forms\Components\TextInput::make('middle_names')
                            ->label('Middle Names')
                            ->maxLength(255)
                            ->placeholder('Enter middle names (optional)')
                            ->live()
                            ->afterStateUpdated(function ($state, $set, $get) {
                                $firstName = $get('first_name') ?? '';
                                $middleNames = $state ?? '';
                                $lastName = $get('last_name') ?? '';
                                
                                $fullName = trim(implode(' ', array_filter([$firstName, $middleNames, $lastName])));
                                $set('name', $fullName);
                            }),
                        Forms\Components\TextInput::make('last_name')
                            ->label('Last Name')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Enter last name')
                            ->live()
                            ->afterStateUpdated(function ($state, $set, $get) {
                                $firstName = $get('first_name') ?? '';
                                $middleNames = $get('middle_names') ?? '';
                                $lastName = $state ?? '';
                                
                                $fullName = trim(implode(' ', array_filter([$firstName, $middleNames, $lastName])));
                                $set('name', $fullName);
                            }),
                        Forms\Components\TextInput::make('phone_number')
                            ->label('Phone Number')
                            ->tel()
                            ->required()
                            ->placeholder('(425) 555-0123')
                        Forms\Components\DatePicker::make('date_of_birth')
                            ->label('Date of Birth')
                            ->required()
                            ->native(false)
                            ->displayFormat('m/d/Y')
                            ->maxDate(now()->subYears(18))
                            ->helperText('Format: MM/DD/YYYY - Must be 18+ years old'),
                        Forms\Components\Select::make('marital_status')
                            ->label('Select Marital Status')
                            ->options(User::getMaritalStatusOptions())
                            ->searchable()
                            ->placeholder('Choose marital status'),
                        Forms\Components\Radio::make('sex')
                            ->label('Sex')
                            ->options(User::getSexOptions())
                            ->required()
                            ->inline(),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Employment Details')
                    ->schema([
                        Forms\Components\TextInput::make('credentials')
                            ->label('State the Credentials')
                            ->maxLength(255)
                            ->placeholder('e.g., RN, LPN, CNA, etc.'),
                        Forms\Components\TextInput::make('credential_details')
                            ->label('Credential Details')
                            ->maxLength(255)
                            ->placeholder('Additional credential information (optional)'),
                        Forms\Components\DatePicker::make('date_employed')
                            ->native(false)
                            ->label('Date Employed')
                            ->required()
                            ->displayFormat('m/d/Y')
                            ->default(fn ($operation) => $operation === 'create' ? now() : null)
                            ->maxDate(now())
                            ->helperText('Format: MM/DD/YYYY - Cannot be in the future'),
                        Forms\Components\TextInput::make('supervisor_name')
                            ->label('Name of Supervisor')
                            ->maxLength(255)
                            ->placeholder('Enter supervisor name'),
                        Forms\Components\TextInput::make('provider_name')
                            ->label('Name of Provider')
                            ->maxLength(255)
                            ->placeholder('Enter provider name'),
                        Forms\Components\Select::make('role')
                            ->label('Role')
                            ->options(User::getRoleOptions())
                            ->searchable()
                            ->required()
                            ->placeholder('Choose role'),
                        Forms\Components\Select::make('facility_id')
                            ->label('Facility')
                            ->relationship('facility', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->placeholder('Select facility')
                            ->visible(fn () => auth()->user()->role === 'super_admin')
                            ->live(),
                        Forms\Components\Select::make('assigned_branch_id')
                            ->label('Assigned Branch')
                            ->relationship('assignedBranch', 'name', function (Builder $query, Forms\Get $get) {
                                $user = auth()->user();
                                if (!$user) return $query;

                                // If super admin and facility selected, filter by that facility
                                if ($user->role === 'super_admin') {
                                    $facilityId = $get('facility_id');
                                    if ($facilityId) {
                                        return $query->where('facility_id', $facilityId);
                                    }
                                    return $query;
                                }
                                
                                // If regular user, filter by their facility
                                if ($user->facility_id) {
                                    return $query->where('facility_id', $user->facility_id);
                                }
                                
                                return $query;
                            })
                            ->searchable()
                            ->preload()
                            ->placeholder('Select branch assignment'),
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active Employee')
                            ->default(true)
                            ->helperText('Enable this staff member for work assignments'),
                        Forms\Components\Toggle::make('location_check_bypass')
                            ->label('Bypass Location Check')
                            ->default(false)
                            ->helperText('Allow this user to log in from any location (bypasses 50 meter distance restriction)')
                            ->visible(fn () => auth()->user()->role === 'super_admin' || auth()->user()->hasPermission('edit_users')),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Account Security')
                    ->schema([
                        Forms\Components\TextInput::make('password')
                            ->label('Password')
                            ->password()
                            ->revealable()
                            ->required(fn (string $context): bool => $context === 'create')
                            ->dehydrated(fn ($state) => filled($state))
                            ->placeholder('Enter secure password')
                            ->helperText('Minimum 8 characters, include numbers and special characters'),
                    ]),

                Forms\Components\Section::make('Additional Information')
                    ->schema([
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->placeholder('Any additional notes about this staff member...'),
                    ])
                    ->columns(1),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\Layout\Stack::make([
                    Tables\Columns\Layout\Split::make([
                        Tables\Columns\Layout\Stack::make([
                            Tables\Columns\TextColumn::make('name')
                                ->label('User Name')
                                ->searchable(['first_name', 'middle_names', 'last_name', 'email'])
                                ->sortable()
                                ->weight('bold')
                                ->size('lg'),
                            Tables\Columns\TextColumn::make('facility.name')
                                ->label('Facility')
                                ->sortable()
                                ->searchable()
                                ->badge()
                                ->color('gray')
                                ->visible(fn () => auth()->user()->role === 'super_admin'),
                            Tables\Columns\TextColumn::make('role')
                                ->label('Role')
                                ->searchable()
                                ->badge()
                                ->color(fn (string $state): string => match ($state) {
                                    'administrator' => 'danger',
                                    'manager' => 'warning',
                                    'registered_nurse' => 'info',
                                    'care_giver' => 'success',
                                    'superuser' => 'primary',
                                    'support_staff' => 'secondary',
                                    default => 'gray',
                                })
                                ->formatStateUsing(fn (string $state): string => match ($state) {
                                    'administrator' => 'Administrator',
                                    'manager' => 'Manager',
                                    'registered_nurse' => 'Registered Nurse',
                                    'care_giver' => 'Care Giver',
                                    'superuser' => 'Superuser',
                                    'support_staff' => 'Support Staff',
                                    default => ucwords(str_replace('_', ' ', $state)),
                                }),
                            Tables\Columns\TextColumn::make('date_of_birth')
                                ->label('DOB')
                                ->date('n/j/Y')
                                ->sortable()
                                ->color('gray'),
                        ])->space(1),
                        Tables\Columns\Layout\Stack::make([
                            Tables\Columns\TextColumn::make('email')
                                ->label('Email')
                                ->searchable()
                                ->copyable()
                                ->copyMessage('Email copied')
                                ->color('gray')
                                ->size('sm'),
                            Tables\Columns\TextColumn::make('phone_number')
                                ->label('Phone')
                                ->searchable()
                                ->copyable()
                                ->copyMessage('Phone copied')
                                ->color('gray')
                                ->size('sm'),
                            Tables\Columns\IconColumn::make('is_active')
                                ->label('Status')
                                ->boolean()
                                ->trueIcon('heroicon-o-check-circle')
                                ->falseIcon('heroicon-o-x-circle')
                                ->trueColor('success')
                                ->falseColor('danger'),
                        ])->space(1),
                    ])->from('md'),
                ])->space(3),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Status')
                    ->placeholder('All staff')
                    ->trueLabel('Active staff')
                    ->falseLabel('Inactive staff'),
                Tables\Filters\SelectFilter::make('facility_id')
                    ->label('Facility')
                    ->relationship('facility', 'name')
                    ->searchable()
                    ->preload()
                    ->visible(fn () => auth()->user()->role === 'super_admin'),
                Tables\Filters\SelectFilter::make('position')
                    ->label('Position')
                    ->options(User::getPositionOptions()),
                Tables\Filters\SelectFilter::make('role')
                    ->label('Role')
                    ->options(User::getRoleOptions()),
                Tables\Filters\SelectFilter::make('assigned_branch_id')
                    ->label('Branch')
                    ->relationship('assignedBranch', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('marital_status')
                    ->label('Marital Status')
                    ->options(User::getMaritalStatusOptions()),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->label('View')
                    ->color('primary')
                    ->icon('heroicon-o-eye')
                    ->size('sm'),
                Tables\Actions\EditAction::make()
                    ->color('gray')
                    ->icon('heroicon-o-pencil')
                    ->size('sm'),
                Tables\Actions\DeleteAction::make()
                    ->color('danger')
                    ->icon('heroicon-o-trash')
                    ->size('sm'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('name')
            ->paginated([10, 25, 50])
            ->defaultPaginationPageOption(10)
            ->searchPlaceholder('Search by name, email, or supervisor...')
            ->emptyStateHeading('No users found')
            ->emptyStateDescription('Get started by creating your first staff member.')
            ->emptyStateIcon('heroicon-o-user-group');
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery()
            ->with(['assignedBranch']);

        if (auth()->check() && auth()->user()->role !== 'super_admin' && auth()->user()->facility_id) {
            $query->where('facility_id', auth()->user()->facility_id);
        }

        return $query
            ->when(
                request('tableSearch'),
                fn (Builder $query, $search): Builder => $query->where(function (Builder $query) use ($search) {
                    $query
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_names', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('supervisor_name', 'like', "%{$search}%")
                        ->orWhere('provider_name', 'like', "%{$search}%");
                })
            );
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'view' => Pages\ViewUser::route('/{record}'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }

    public static function getHeaderActions(): array
    {
        return [
            Actions\Action::make('chart_reports')
                ->label('View Charts')
                ->icon('heroicon-o-chart-bar')
                ->color('info')
                ->url(route('filament.admin.pages.staff-charts'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
        ];
    }
}
