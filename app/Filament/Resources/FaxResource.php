<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FaxResource\Pages;
use App\Models\Fax;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

/**
 * Read-mostly resource: faxes are created by the React UI and mutated by
 * webhooks (FaxManager::applyStatus). The Filament page is here so super
 * admins and facility admins can audit / debug.
 */
class FaxResource extends Resource
{
    protected static ?string $model = Fax::class;

    protected static ?string $navigationIcon = 'heroicon-o-paper-airplane';

    protected static ?string $navigationLabel = 'Faxes';

    protected static ?string $modelLabel = 'Fax';

    protected static ?string $pluralModelLabel = 'Faxes';

    protected static ?string $navigationGroup = 'Operations';

    protected static ?int $navigationSort = 60;

    public static function shouldRegisterNavigation(): bool
    {
        if (! auth()->check()) {
            return false;
        }

        $user = auth()->user();

        // Caregivers should not see the audit page; they use the SPA inbox.
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
        // Faxes are sent via the React composer, not through Filament.
        return false;
    }

    public static function canEdit($record): bool
    {
        // Fax rows are immutable from the admin — status flips come from
        // webhook events via FaxManager::applyStatus.
        return false;
    }

    public static function canDelete($record): bool
    {
        $user = auth()->user();

        return $user && ($user->role === 'super_admin' || $user->hasPermission('fax.delete'));
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Fax')
                    ->schema([
                        Forms\Components\Placeholder::make('subject')
                            ->label('Subject')
                            ->content(fn (?Fax $record) => $record?->subject ?: '—'),

                        Forms\Components\Placeholder::make('direction')
                            ->label('Direction')
                            ->content(fn (?Fax $record) => $record ? ucfirst($record->direction) : '—'),

                        Forms\Components\Placeholder::make('status')
                            ->label('Status')
                            ->content(fn (?Fax $record) => $record ? ucfirst($record->status) : '—'),

                        Forms\Components\Placeholder::make('fax_type')
                            ->label('Type')
                            ->content(fn (?Fax $record) => $record?->fax_type
                                ? (config('fax.types')[$record->fax_type] ?? $record->fax_type)
                                : '—'),

                        Forms\Components\Placeholder::make('from_number')
                            ->label('From')
                            ->content(fn (?Fax $record) => $record?->from_number ?: '—'),

                        Forms\Components\Placeholder::make('to_number')
                            ->label('To')
                            ->content(fn (?Fax $record) => $record?->to_number ?: '—'),

                        Forms\Components\Placeholder::make('page_count')
                            ->label('Pages')
                            ->content(fn (?Fax $record) => $record?->page_count ?? '—'),

                        Forms\Components\Placeholder::make('provider')
                            ->label('Provider')
                            ->content(fn (?Fax $record) => $record?->provider ?: '—'),

                        Forms\Components\Placeholder::make('provider_fax_id')
                            ->label('Provider Fax ID')
                            ->content(fn (?Fax $record) => $record?->provider_fax_id ?: '—'),

                        Forms\Components\Placeholder::make('sent_at')
                            ->label('Sent At')
                            ->content(fn (?Fax $record) => $record?->sent_at?->format('M j, Y g:i A') ?: '—'),

                        Forms\Components\Placeholder::make('received_at')
                            ->label('Received At')
                            ->content(fn (?Fax $record) => $record?->received_at?->format('M j, Y g:i A') ?: '—'),

                        Forms\Components\Placeholder::make('sent_by')
                            ->label('Sent By')
                            ->content(fn (?Fax $record) => $record?->sentByUser?->name ?: '—'),

                        Forms\Components\Placeholder::make('status_reason')
                            ->label('Status Reason')
                            ->content(fn (?Fax $record) => $record?->status_reason ?: '—')
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('#')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('direction')
                    ->label('Direction')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'inbound' ? 'info' : 'primary')
                    ->formatStateUsing(fn (string $state): string => ucfirst($state))
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        Fax::STATUS_QUEUED => 'gray',
                        Fax::STATUS_SENDING => 'warning',
                        Fax::STATUS_DELIVERED => 'success',
                        Fax::STATUS_FAILED => 'danger',
                        Fax::STATUS_RECEIVED => 'info',
                        Fax::STATUS_READ => 'success',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => ucfirst($state))
                    ->sortable(),

                Tables\Columns\TextColumn::make('fax_type')
                    ->label('Type')
                    ->formatStateUsing(fn (?string $state): string => $state
                        ? (config('fax.types')[$state] ?? $state)
                        : '—')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('subject')
                    ->label('Subject')
                    ->searchable()
                    ->limit(40)
                    ->placeholder('—'),

                Tables\Columns\TextColumn::make('from_number')
                    ->label('From')
                    ->searchable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('to_number')
                    ->label('To')
                    ->searchable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('page_count')
                    ->label('Pages')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('provider')
                    ->label('Provider')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('sent_at')
                    ->label('Sent At')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('received_at')
                    ->label('Received At')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('direction')
                    ->label('Direction')
                    ->options([
                        Fax::DIRECTION_OUTBOUND => 'Outbound',
                        Fax::DIRECTION_INBOUND => 'Inbound',
                    ]),

                SelectFilter::make('status')
                    ->label('Status')
                    ->options(config('fax.statuses'))
                    ->multiple(),

                SelectFilter::make('fax_type')
                    ->label('Type')
                    ->options(config('fax.types'))
                    ->multiple(),

                SelectFilter::make('provider')
                    ->label('Provider')
                    ->options(function () {
                        $registry = app(\App\Services\Fax\ProviderRegistry::class);

                        return collect($registry->all())
                            ->mapWithKeys(fn (string $class, string $key) => [$key => $class::displayName()])
                            ->all();
                    }),

                Filter::make('sent_at')
                    ->label('Sent Date')
                    ->form([
                        Forms\Components\DatePicker::make('from')
                            ->label('From'),
                        Forms\Components\DatePicker::make('until')
                            ->label('Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['from'] ?? null,
                                fn (Builder $query, $date): Builder => $query->whereDate('sent_at', '>=', $date),
                            )
                            ->when(
                                $data['until'] ?? null,
                                fn (Builder $query, $date): Builder => $query->whereDate('sent_at', '<=', $date),
                            );
                    })
                    ->columnSpan(2),

                TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->visible(fn (Fax $record): bool => static::canDelete($record)),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->visible(fn (): bool => auth()->user()?->role === 'super_admin'
                            || auth()->user()?->hasPermission('fax.delete')),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFaxes::route('/'),
            'view' => Pages\ViewFax::route('/{record}'),
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
