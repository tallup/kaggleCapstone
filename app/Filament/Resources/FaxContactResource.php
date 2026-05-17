<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FaxContactResource\Pages;
use App\Models\FaxContact;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class FaxContactResource extends Resource
{
    protected static ?string $model = FaxContact::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';

    protected static ?string $navigationLabel = 'Fax Contacts';

    protected static ?string $modelLabel = 'Fax Contact';

    protected static ?string $pluralModelLabel = 'Fax Contacts';

    protected static ?string $navigationGroup = 'Operations';

    protected static ?int $navigationSort = 62;

    public static function shouldRegisterNavigation(): bool
    {
        if (! auth()->check()) {
            return false;
        }

        $user = auth()->user();

        $roleValue = strtolower(trim($user->role ?? ''));
        $roleValueNormalized = str_replace([' ', '_'], '', $roleValue);
        $isCaregiver = $user->hasRole('caregiver')
            || $user->hasRole('care_giver')
            || $roleValueNormalized === 'caregiver'
            || (stripos($roleValue, 'care') !== false && stripos($roleValue, 'giver') !== false);

        if ($isCaregiver) {
            return false;
        }

        return $user->role === 'super_admin' || $user->hasPermission('fax.view');
    }

    public static function canViewAny(): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.view'));
    }

    public static function canCreate(): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.manage_contacts'));
    }

    public static function canEdit($record): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.manage_contacts'));
    }

    public static function canDelete($record): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.manage_contacts'));
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Contact Details')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Name')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\TextInput::make('organization')
                            ->label('Organization')
                            ->maxLength(255)
                            ->placeholder('Optional'),

                        Forms\Components\TextInput::make('fax_e164')
                            ->label('Fax Number')
                            ->required()
                            ->maxLength(20)
                            ->regex('/^\+[1-9]\d{1,14}$/')
                            ->helperText('E.164 format, e.g. +14252516337')
                            ->placeholder('+14252516337'),

                        Forms\Components\TextInput::make('phone')
                            ->label('Phone')
                            ->tel()
                            ->maxLength(40)
                            ->placeholder('(206) 555-0123'),

                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->maxLength(255)
                            ->placeholder('contact@example.com'),

                        Forms\Components\Select::make('contact_type')
                            ->label('Contact Type')
                            ->options(FaxContact::TYPES)
                            ->native(false)
                            ->placeholder('Select type'),

                        Forms\Components\Toggle::make('is_active')
                            ->label('Active')
                            ->default(true)
                            ->inline(false),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Address & Notes')
                    ->schema([
                        Forms\Components\Textarea::make('address')
                            ->label('Address')
                            ->rows(3)
                            ->columnSpanFull(),

                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->columnSpanFull()
                            ->placeholder('Anything useful when faxing this contact (preferred cover sheet, hours, etc.)'),
                    ])
                    ->collapsible(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('organization')
                    ->label('Organization')
                    ->searchable()
                    ->sortable()
                    ->placeholder('—'),

                Tables\Columns\TextColumn::make('fax_e164')
                    ->label('Fax')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Fax number copied')
                    ->copyMessageDuration(1500),

                Tables\Columns\TextColumn::make('contact_type')
                    ->label('Type')
                    ->badge()
                    ->color('info')
                    ->formatStateUsing(fn (?string $state): string => $state
                        ? (FaxContact::TYPES[$state] ?? ucfirst($state))
                        : '—')
                    ->sortable(),

                Tables\Columns\TextColumn::make('phone')
                    ->label('Phone')
                    ->placeholder('—')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\ToggleColumn::make('is_active')
                    ->label('Active'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime('M j, Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('contact_type')
                    ->label('Type')
                    ->options(FaxContact::TYPES)
                    ->multiple(),

                TernaryFilter::make('is_active')
                    ->label('Status')
                    ->placeholder('All contacts')
                    ->trueLabel('Active only')
                    ->falseLabel('Inactive only'),

                TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    Tables\Actions\RestoreBulkAction::make(),
                    Tables\Actions\ForceDeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFaxContacts::route('/'),
            'create' => Pages\CreateFaxContact::route('/create'),
            'edit' => Pages\EditFaxContact::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }
}
