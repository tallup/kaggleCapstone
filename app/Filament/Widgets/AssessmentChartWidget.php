<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use App\Models\Assessment;

class AssessmentChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Assessment Status';
    protected static ?int $sort = 3;

    protected function getData(): array
    {
        $counts = Assessment::selectRaw("
            sum(case when completion_percentage = 100 then 1 else 0 end) as completed,
            sum(case when completion_percentage > 0 and completion_percentage < 100 then 1 else 0 end) as in_progress,
            sum(case when completion_percentage = 0 then 1 else 0 end) as not_started
        ")->first();

        return [
            'datasets' => [
                [
                    'data' => [
                        (int) $counts->completed,
                        (int) $counts->in_progress,
                        (int) $counts->not_started,
                    ],
                    'backgroundColor' => ['#10B981', '#F59E0B', '#EF4444'],
                    'borderColor' => ['#059669', '#D97706', '#DC2626'],
                    'borderWidth' => 2,
                ],
            ],
            'labels' => ['Completed', 'In Progress', 'Not Started'],
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
