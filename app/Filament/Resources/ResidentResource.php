<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ResidentResource\Pages;
use App\Filament\Resources\ResidentResource\RelationManagers;
use App\Models\Resident;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Actions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class ResidentResource extends Resource
{
    protected static ?string $model = Resident::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';
    protected static ?string $navigationLabel = 'Residents';
    protected static ?string $modelLabel = 'Resident';
    protected static ?string $pluralModelLabel = 'Residents';
    protected static ?string $navigationGroup = 'Resident Care';
    protected static bool $shouldRegisterNavigation = false;

    public static function canViewAny(): bool
    {
        return auth()->user()->hasPermission('view_residents');
    }

    public static function canCreate(): bool
    {
        return auth()->user()->hasPermission('create_residents');
    }

    public static function canEdit($record): bool
    {
        return auth()->user()->hasPermission('edit_residents');
    }

    public static function canDelete($record): bool
    {
        return auth()->user()->hasPermission('delete_residents');
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        
        // If user is a caregiver, show residents from their assigned branch only
        if (auth()->user()->hasRole('caregiver')) {
            $query->where('branch_id', auth()->user()->assigned_branch_id);
        }
        
        return $query;
    }

    public static function getHeaderActions(): array
    {
        return [
            Actions\Action::make('chart_reports')
                ->label('View Charts')
                ->icon('heroicon-o-chart-bar')
                ->color('info')
                ->url(route('filament.admin.pages.resident-charts'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
        ];
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Personal Information')
                    ->schema([
                        Forms\Components\TextInput::make('first_name')
                            ->label('First Name')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Enter first name'),
                        Forms\Components\TextInput::make('middle_names')
                            ->label('Middle Names')
                            ->maxLength(255)
                            ->placeholder('Enter middle names (optional)'),
                        Forms\Components\TextInput::make('last_name')
                            ->label('Last Name')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Enter last name'),
                        Forms\Components\DatePicker::make('date_of_birth')
                            ->label('Date of Birth')
                            ->required()
                            ->displayFormat('m/d/Y')
                            ->maxDate(now()->subYears(18))
                            ->helperText('Format: MM/DD/YYYY'),
                        Forms\Components\Select::make('branch_id')
                            ->label('Branch')
                            ->relationship('branch', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Forms\Components\TextInput::make('room')
                            ->label('Room')
                            ->maxLength(50)
                            ->placeholder('e.g., 101, 2A'),
                        Forms\Components\TextInput::make('cart')
                            ->label('Cart')
                            ->maxLength(50)
                            ->placeholder('Enter cart information (optional)'),
                        Forms\Components\DatePicker::make('admission_date')
                            ->label('Admission Date')
                            ->required()
                            ->displayFormat('M j, Y')
                            ->default(now()),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Medical Information')
                    ->schema([
                        Forms\Components\Textarea::make('diagnosis')
                            ->label('Diagnosis')
                            ->rows(3)
                            ->placeholder('Enter primary medical diagnosis...'),
                        Forms\Components\Textarea::make('allergies')
                            ->label('Allergies')
                            ->rows(3)
                            ->placeholder('List any known allergies...'),
                        Forms\Components\TextInput::make('physician_name')
                            ->label('Physician Name')
                            ->maxLength(255)
                            ->placeholder('Enter primary physician name'),
                        Forms\Components\TextInput::make('pep_or_doctor')
                            ->label('PEP or Doctor')
                            ->maxLength(255)
                            ->placeholder('Enter PEP or doctor information (optional)'),
                        Forms\Components\Textarea::make('medical_conditions')
                            ->label('Additional Medical Conditions')
                            ->rows(4)
                            ->placeholder('List any additional medical conditions...'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Emergency Contact')
                    ->schema([
                        Forms\Components\TextInput::make('emergency_contact_name')
                            ->label('Contact Name')
                            ->maxLength(255)
                            ->placeholder('Enter emergency contact name'),
                        Forms\Components\TextInput::make('emergency_contact_phone')
                            ->label('Contact Phone')
                            ->tel()
                            ->placeholder('(425) 555-0123'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Document Upload')
                    ->schema([
                        Forms\Components\FileUpload::make('profile_image')
                            ->label('Profile Image/File')
                            ->image()
                            ->directory('resident-files')
                            ->visibility('private')
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'])
                            ->maxSize(5120) // 5MB
                            ->helperText('Upload profile image or documents (JPG, PNG, GIF, PDF, WebP - Max 5MB)')
                            ->columnSpanFull(),
                    ]),

                Forms\Components\Section::make('Additional Information')
                    ->schema([
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->placeholder('Any additional notes or special instructions...'),
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active Resident')
                            ->default(true)
                            ->helperText('Enable this resident for care management'),
                    ])
                    ->columns(1),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Resident Name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('branch.name')
                    ->label('Branch')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('room')
                    ->label('Room')
                    ->searchable()
                    ->sortable()
                    ->badge()
                    ->color('primary'),
                Tables\Columns\TextColumn::make('age')
                    ->label('Age')
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderBy('date_of_birth', $direction === 'asc' ? 'desc' : 'asc');
                    })
                    ->getStateUsing(function ($record): ?string {
                        return $record->age ? $record->age . ' years' : null;
                    }),
                Tables\Columns\TextColumn::make('admission_date')
                    ->label('Admitted')
                    ->date('M j, Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('diagnosis')
                    ->label('Diagnosis')
                    ->limit(25)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 25 ? $state : null;
                    })
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('physician_name')
                    ->label('Physician')
                    ->searchable()
                    ->limit(20)
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('emergency_contact_name')
                    ->label('Emergency Contact')
                    ->searchable()
                    ->limit(20),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Status')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('danger'),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Status')
                    ->placeholder('All residents')
                    ->trueLabel('Active residents')
                    ->falseLabel('Inactive residents'),
                Tables\Filters\SelectFilter::make('branch_id')
                    ->label('Branch')
                    ->relationship('branch', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\Filter::make('physician_name')
                    ->form([
                        Forms\Components\TextInput::make('physician_name')
                            ->label('Physician Name')
                            ->placeholder('Search by physician name...'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['physician_name'],
                                fn (Builder $query, $name): Builder => $query->where('physician_name', 'like', "%{$name}%"),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('medication_history')
                    ->label('Medication History')
                    ->icon('heroicon-o-cube')
                    ->color('info')
                    ->url(fn ($record) => route('filament.admin.pages.medication-history', ['resident' => $record->id]))
                    ->openUrlInNewTab(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('name');
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
            'index' => Pages\ListResidents::route('/'),
            'create' => Pages\CreateResident::route('/create'),
            'edit' => Pages\EditResident::route('/{record}/edit'),
        ];
    }
}
