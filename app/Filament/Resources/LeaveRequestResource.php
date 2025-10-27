<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LeaveRequestResource\Pages;
use App\Filament\Resources\LeaveRequestResource\RelationManagers;
use App\Models\LeaveRequest;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class LeaveRequestResource extends Resource
{
    protected static ?string $model = LeaveRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-calendar-days';
    protected static ?string $navigationLabel = 'Leave Requests';
    protected static ?string $modelLabel = 'Leave Request';
    protected static ?string $pluralModelLabel = 'Leave Requests';
    protected static ?string $navigationGroup = 'Staff Management';
    protected static bool $shouldRegisterNavigation = false;

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        
        // If user is a caregiver, only show their own leave requests
        if (auth()->user()->hasRole('caregiver')) {
            $query->where('staff_id', auth()->id());
        }
        
        return $query;
    }

    public static function canViewAny(): bool
    {
        return true; // Both admins and caregivers can view leave requests
    }

    public static function canCreate(): bool
    {
        return true; // Both admins and caregivers can create leave requests
    }

    public static function canEdit($record): bool
    {
        // Caregivers can only edit their own leave requests
        if (auth()->user()->hasRole('caregiver')) {
            return $record->staff_id === auth()->id();
        }
        
        // Admins can edit any leave request
        return true;
    }

    public static function canDelete($record): bool
    {
        // Caregivers can only delete their own leave requests
        if (auth()->user()->hasRole('caregiver')) {
            return $record->staff_id === auth()->id();
        }
        
        // Admins can delete any leave request
        return true;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Leave Request Details')
                    ->schema([
                        Forms\Components\Select::make('staff_id')
                            ->label('Staff Member')
                            ->relationship('staff', 'name')
                            ->required()
                            ->searchable()
                            ->preload()
                            ->placeholder('Select staff member')
                            ->getOptionLabelFromRecordUsing(fn ($record) => $record->name ?? $record->email ?? 'Unknown User')
                            ->hidden(fn () => auth()->user()->hasRole('caregiver'))
                            ->default(fn () => auth()->user()->hasRole('caregiver') ? auth()->id() : null),
                        Forms\Components\DatePicker::make('start_date')
                            ->label('Start Date')
                            ->required()
                            ->minDate(now())
                            ->displayFormat('m/d/Y')
                            ->placeholder('MM/DD/YYYY'),
                        Forms\Components\DatePicker::make('end_date')
                            ->label('End Date')
                            ->required()
                            ->minDate(fn ($get) => $get('start_date') ?: now())
                            ->displayFormat('m/d/Y')
                            ->placeholder('MM/DD/YYYY'),
                        Forms\Components\Textarea::make('reason')
                            ->label('Reason for Leave')
                            ->required()
                            ->rows(4)
                            ->maxLength(1000)
                            ->placeholder('Please provide a detailed reason for your leave request...')
                            ->helperText('Minimum 10 characters, maximum 1000 characters'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Approval Details')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'pending' => 'Pending',
                                'approved' => 'Approved',
                                'declined' => 'Declined',
                            ])
                            ->default('pending')
                            ->required()
                            ->live(),
                        Forms\Components\Textarea::make('decline_reason')
                            ->label('Decline Reason')
                            ->rows(2)
                            ->maxLength(500)
                            ->placeholder('Provide reason for declining this request...')
                            ->hidden(fn ($get) => $get('status') !== 'declined')
                            ->required(fn ($get) => $get('status') === 'declined'),
                        Forms\Components\Select::make('approved_by')
                            ->label('Approved By')
                            ->relationship('approvedBy', 'name')
                            ->searchable()
                            ->preload()
                            ->placeholder('Select approver')
                            ->getOptionLabelFromRecordUsing(fn ($record) => $record->name ?? $record->email ?? 'Unknown User')
                            ->hidden(fn ($get) => $get('status') !== 'approved'),
                        Forms\Components\DateTimePicker::make('approved_at')
                            ->label('Approved At')
                            ->default(now())
                            ->hidden(fn ($get) => $get('status') !== 'approved'),
                    ])
                    ->columns(2)
                    ->hiddenOn('create')
                    ->visible(fn () => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('staff.name')
                    ->label('Staff')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->formatStateUsing(fn ($record) => $record->staff?->name ?? $record->staff?->email ?? 'Unknown User'),
                Tables\Columns\TextColumn::make('start_date')
                    ->label('Start Date')
                    ->date('m/d/Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('end_date')
                    ->label('End Date')
                    ->date('m/d/Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('duration')
                    ->label('Duration')
                    ->getStateUsing(fn ($record) => $record->duration . ' day' . ($record->duration > 1 ? 's' : ''))
                    ->badge()
                    ->color('info'),
                Tables\Columns\TextColumn::make('reason')
                    ->label('Reason')
                    ->limit(50)
                    ->tooltip(fn ($record) => $record->reason)
                    ->wrap(),
                Tables\Columns\BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'approved',
                        'danger' => 'declined',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'pending' => 'Pending',
                        'approved' => 'Approved',
                        'declined' => 'Declined',
                        default => ucfirst($state),
                    }),
                Tables\Columns\TextColumn::make('decline_reason')
                    ->label('Decline Reason')
                    ->limit(30)
                    ->placeholder('-')
                    ->tooltip(fn ($record) => $record->decline_reason)
                    ->wrap(),
                Tables\Columns\TextColumn::make('approvedBy.name')
                    ->label('Approved By')
                    ->placeholder('-')
                    ->formatStateUsing(fn ($record) => $record->approvedBy?->name ?? $record->approvedBy?->email ?? '-')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('approved_at')
                    ->label('Approved At')
                    ->dateTime('m/d/Y g:i A')
                    ->placeholder('-')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Requested')
                    ->dateTime('m/d/Y g:i A')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Filter by Status')
                    ->options([
                        'pending' => 'Pending',
                        'approved' => 'Approved',
                        'declined' => 'Declined',
                    ])
                    ->placeholder('All Statuses'),
                Tables\Filters\Filter::make('start_date')
                    ->form([
                        Forms\Components\DatePicker::make('start_date_from')
                            ->label('Start Date From'),
                        Forms\Components\DatePicker::make('start_date_until')
                            ->label('Start Date Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['start_date_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '>=', $date),
                            )
                            ->when(
                                $data['start_date_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\Action::make('takeAction')
                    ->label('Take Action')
                    ->color('primary')
                    ->icon('heroicon-o-check-circle')
                    ->url(fn ($record) => LeaveRequestResource::getUrl('edit', ['record' => $record]))
                    ->visible(fn ($record) => $record->status === 'pending' && (auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin'))),
                Tables\Actions\ViewAction::make()
                    ->color('gray')
                    ->icon('heroicon-o-eye'),
                Tables\Actions\EditAction::make()
                    ->color('warning')
                    ->icon('heroicon-o-pencil'),
                Tables\Actions\DeleteAction::make()
                    ->color('danger')
                    ->icon('heroicon-o-trash'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->searchPlaceholder('Search by staff name or reason...')
            ->emptyStateHeading('No leave requests found')
            ->emptyStateDescription('Get started by creating your first leave request.')
            ->emptyStateIcon('heroicon-o-calendar-days');
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
            'index' => Pages\ListLeaveRequests::route('/'),
            'create' => Pages\CreateLeaveRequest::route('/create'),
            'view' => Pages\ViewLeaveRequest::route('/{record}'),
            'edit' => Pages\EditLeaveRequest::route('/{record}/edit'),
        ];
    }
}
