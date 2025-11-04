<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SleepPattern;
use App\Models\SleepRecord;
use App\Models\SleepHourlyData;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class SleepPatternController extends Controller
{
    public function getPattern(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'resident_id' => 'required|exists:residents,id',
                'month' => 'required|integer|min:1|max:12',
                'year' => 'required|integer|min:2020|max:2100',
            ]);

            $residentId = $request->get('resident_id');
            $month = $request->get('month');
            $year = $request->get('year');

            \Log::info('Sleep Pattern API called', [
                'resident_id' => $residentId,
                'month' => $month,
                'year' => $year,
            ]);

        // Get or create sleep pattern for this month/year
        $pattern = SleepPattern::where('resident_id', $residentId)
            ->where('month', $month)
            ->where('year', $year)
            ->with(['resident', 'hourlyData'])
            ->first();

        // Get daily sleep records for the chart first
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        // Check which date column exists and use it
        $sleepRecords = SleepRecord::where('resident_id', $residentId)
            ->where(function($query) use ($startDate, $endDate) {
                if (Schema::hasColumn('sleep_records', 'sleep_date')) {
                    $query->whereBetween('sleep_date', [$startDate, $endDate]);
                } elseif (Schema::hasColumn('sleep_records', 'date')) {
                    $query->whereBetween('date', [$startDate, $endDate]);
                }
            })
            ->orderBy(Schema::hasColumn('sleep_records', 'sleep_date') ? 'sleep_date' : 'date', 'asc')
            ->get();

        // Format daily data for chart first
        $dailyData = [];
        foreach ($sleepRecords as $record) {
            // Use sleep_date if available, otherwise fall back to date column
            $recordDate = $record->sleep_date ?? $record->date;
            if (!$recordDate) {
                continue;
            }
            
            $day = Carbon::parse($recordDate)->day;
            
            // Calculate sleep hours - try new column first, then calculate from duration
            $sleepHours = (float) ($record->total_sleep_hours ?? 0);
            if ($sleepHours == 0) {
                // Try to calculate from sleep_duration_minutes if available
                if (isset($record->sleep_duration_minutes) && $record->sleep_duration_minutes > 0) {
                    $sleepHours = (float) ($record->sleep_duration_minutes / 60);
                } else {
                    // Calculate from sleep_time and wake_time if available
                    $sleepTime = $record->sleep_time ?? $record->sleep_start ?? null;
                    $wakeTime = $record->wake_time ?? $record->sleep_end ?? null;
                    if ($sleepTime && $wakeTime) {
                        try {
                            $sleep = Carbon::parse($sleepTime);
                            $wake = Carbon::parse($wakeTime);
                            if ($wake->lessThan($sleep)) {
                                $wake->addDay();
                            }
                            $sleepHours = $sleep->diffInHours($wake) + ($sleep->diffInMinutes($wake) % 60) / 60;
                        } catch (\Exception $e) {
                            // If calculation fails, default to 8 hours
                            $sleepHours = 8;
                        }
                    }
                }
            }
            
            $awakeHours = max(0, 24 - $sleepHours);
            
            $dailyData[] = [
                'day' => $day,
                'sleep_hours' => round($sleepHours, 2),
                'awake_hours' => round($awakeHours, 2),
                'total_hours' => 24,
            ];
        }

        // Get or create sleep pattern for this month/year
        if (!$pattern && $sleepRecords->isNotEmpty()) {
            // Calculate pattern from sleep records
            $pattern = $this->calculatePattern($residentId, $month, $year, $sleepRecords);
        }

        // Get hourly distribution if available
        $hourlyDistribution = [];
        if ($pattern && $pattern->hourlyData) {
            $hourlyData = $pattern->hourlyData;
            for ($i = 0; $i < 24; $i++) {
                $hour = str_pad($i, 2, '0', STR_PAD_LEFT);
                $hourlyDistribution[] = [
                    'hour' => $hour,
                    'percentage' => (float) $hourlyData->getHourValue($i),
                ];
            }
        } else {
            // Calculate from records if no hourly data
            $hourlyDistribution = $this->calculateHourlyDistribution($sleepRecords);
        }

        // Get key observations
        $keyObservations = $this->getKeyObservations($pattern, $sleepRecords);

            // Always return data, even if pattern is null (but we have records)
            \Log::info('Sleep Pattern API response', [
                'records_count' => $sleepRecords->count(),
                'daily_data_count' => count($dailyData),
                'pattern_exists' => $pattern !== null,
            ]);

            return response()->json([
                'pattern' => $pattern,
                'daily_data' => $dailyData,
                'hourly_distribution' => $hourlyDistribution,
                'key_observations' => $keyObservations,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Sleep Pattern API validation error', [
                'errors' => $e->errors(),
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Sleep Pattern API error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'An error occurred while fetching sleep pattern data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function calculatePattern($residentId, $month, $year, $sleepRecords = null)
    {
        // If sleep records not provided, fetch them
        if ($sleepRecords === null) {
            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            // Check which date column exists and use it
            $sleepRecords = SleepRecord::where('resident_id', $residentId)
                ->where(function($query) use ($startDate, $endDate) {
                    if (Schema::hasColumn('sleep_records', 'sleep_date')) {
                        $query->whereBetween('sleep_date', [$startDate, $endDate]);
                    } elseif (Schema::hasColumn('sleep_records', 'date')) {
                        $query->whereBetween('date', [$startDate, $endDate]);
                    }
                })
                ->get();
        }

        if ($sleepRecords->isEmpty()) {
            return null;
        }

        $totalSleepHours = $sleepRecords->sum(function($record) {
            $hours = (float) ($record->total_sleep_hours ?? 0);
            // If no total_sleep_hours, calculate from sleep_duration_minutes
            if ($hours == 0 && isset($record->sleep_duration_minutes)) {
                $hours = (float) ($record->sleep_duration_minutes / 60);
            }
            return $hours;
        });
        $totalAwakeHours = (24 * $sleepRecords->count()) - $totalSleepHours;
        $avgSleepHours = $sleepRecords->count() > 0 ? $totalSleepHours / $sleepRecords->count() : 0;
        
        // Get unique dates - check both sleep_date and date columns
        $uniqueDates = $sleepRecords->map(function($record) {
            return $record->sleep_date ?? $record->date ?? null;
        })->filter()->unique()->count();
        $daysWithRecords = $uniqueDates;

        // Get most common sleep and wake times
        // Handle both old and new column formats
        $sleepTimes = $sleepRecords->map(function($record) {
            // Try sleep_time first, then sleep_start if available
            return $record->sleep_time ?? (Schema::hasColumn('sleep_records', 'sleep_start') ? $record->sleep_start : null);
        })->filter();
        
        $wakeTimes = $sleepRecords->map(function($record) {
            // Try wake_time first, then sleep_end if available
            return $record->wake_time ?? (Schema::hasColumn('sleep_records', 'sleep_end') ? $record->sleep_end : null);
        })->filter();

        $commonSleepTime = $this->getMostCommonTime($sleepTimes);
        $commonWakeTime = $this->getMostCommonTime($wakeTimes);

        // Calculate sleep quality score (average of sleep quality ratings if available)
        $qualityScores = $sleepRecords->where('sleep_quality', '!=', null)->pluck('sleep_quality');
        $sleepQualityScore = $qualityScores->isNotEmpty() 
            ? round(($qualityScores->avg() / 10) * 100) 
            : null;

        // Create or update pattern
        $pattern = SleepPattern::updateOrCreate(
            [
                'resident_id' => $residentId,
                'month' => $month,
                'year' => $year,
            ],
            [
                'total_sleep_hours' => round($totalSleepHours, 2),
                'total_awake_hours' => round($totalAwakeHours, 2),
                'avg_sleep_hours' => round($avgSleepHours, 2),
                'days_with_records' => $daysWithRecords,
                'common_sleep_time' => $commonSleepTime,
                'common_wake_time' => $commonWakeTime,
                'sleep_quality_score' => $sleepQualityScore,
            ]
        );

        return $pattern->load('resident');
    }

    private function getMostCommonTime($times)
    {
        if ($times->isEmpty()) {
            return null;
        }

        // Group by hour:minute and count
        $timeCounts = $times->map(function ($time) {
            if (is_string($time)) {
                // If it's already in HH:mm format, return it
                if (preg_match('/^\d{2}:\d{2}/', $time)) {
                    return substr($time, 0, 5); // Get HH:mm format
                }
                // Try to parse as datetime
                try {
                    return Carbon::parse($time)->format('H:i');
                } catch (\Exception $e) {
                    return null;
                }
            }
            // If it's a Carbon instance or datetime
            try {
                return Carbon::parse($time)->format('H:i');
            } catch (\Exception $e) {
                return null;
            }
        })->filter()->countBy();

        if ($timeCounts->isEmpty()) {
            return null;
        }

        $mostCommon = $timeCounts->sort()->keys()->last();
        return $mostCommon ? $mostCommon . ':00' : null;
    }

    private function calculateHourlyDistribution($sleepRecords)
    {
        $hourlyCounts = array_fill(0, 24, 0);
        $totalRecords = $sleepRecords->count();

        foreach ($sleepRecords as $record) {
            // Handle both sleep_time/wake_time and sleep_start/sleep_end
            $sleepTimeStr = $record->sleep_time ?? (Schema::hasColumn('sleep_records', 'sleep_start') ? $record->sleep_start : null);
            $wakeTimeStr = $record->wake_time ?? (Schema::hasColumn('sleep_records', 'sleep_end') ? $record->sleep_end : null);
            
            if (!$sleepTimeStr || !$wakeTimeStr) {
                continue;
            }

            try {
                $sleepTime = Carbon::parse($sleepTimeStr);
                $wakeTime = Carbon::parse($wakeTimeStr);
                
                if ($wakeTime->lessThan($sleepTime)) {
                    $wakeTime->addDay();
                }

                $current = $sleepTime->copy();
                while ($current->lessThan($wakeTime)) {
                    $hour = (int) $current->format('H');
                    $hourlyCounts[$hour]++;
                    $current->addHour();
                }
            } catch (\Exception $e) {
                // Skip invalid time formats
                continue;
            }
        }

        $distribution = [];
        for ($i = 0; $i < 24; $i++) {
            $percentage = $totalRecords > 0 ? ($hourlyCounts[$i] / $totalRecords) * 100 : 0;
            $distribution[] = [
                'hour' => str_pad($i, 2, '0', STR_PAD_LEFT),
                'percentage' => round($percentage, 2),
            ];
        }

        return $distribution;
    }

    private function getKeyObservations($pattern, $sleepRecords)
    {
        $observations = [];

        if ($sleepRecords->isEmpty()) {
            return ['No sleep records found for this period.'];
        }

        // Find deepest sleep hours
        if ($pattern && $pattern->hourlyData) {
            $hourlyData = $pattern->hourlyData;
            $hourlyValues = [];
            for ($i = 0; $i < 24; $i++) {
                $hourlyValues[$i] = (float) $hourlyData->getHourValue($i);
            }
            arsort($hourlyValues);
            $topHours = array_slice(array_keys($hourlyValues), 0, 3);
            $deepestHours = array_map(function($h) {
                return str_pad($h, 2, '0', STR_PAD_LEFT) . ':00';
            }, $topHours);
            $observations[] = 'Deepest sleep hours: ' . implode(', ', $deepestHours);
        }

        // Sleep pattern quality
        if ($pattern) {
            $avgHours = $pattern->avg_sleep_hours;
            if ($avgHours >= 7 && $avgHours <= 9) {
                $observations[] = 'Sleep pattern shows normal transitions between sleep and wakefulness.';
            } elseif ($avgHours < 6) {
                $observations[] = 'Sleep duration may be below recommended levels.';
            } elseif ($avgHours > 10) {
                $observations[] = 'Extended sleep duration observed.';
            }

            if ($pattern->sleep_quality_score) {
                if ($pattern->sleep_quality_score >= 80) {
                    $observations[] = 'Overall sleep quality appears good.';
                } elseif ($pattern->sleep_quality_score >= 60) {
                    $observations[] = 'Sleep quality is moderate.';
                } else {
                    $observations[] = 'Sleep quality may need attention.';
                }
            }
        }

        return $observations;
    }
}

