<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChartAssistantService
{
    public function analyze(array $payload, ?string $prompt = null): array
    {
        $heuristicResult = $this->buildHeuristicResult($payload, $prompt);

        $apiKey = env('ANTHROPIC_API_KEY');
        if (empty($apiKey)) {
            try {
                $apiKey = config('services.anthropic.api_key');
            } catch (\Throwable) {
                $apiKey = null;
            }
        }
        if (empty($apiKey)) {
            return array_merge($heuristicResult, [
                'mode' => 'heuristic',
                'model' => 'heuristic',
            ]);
        }

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'Content-Type' => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => 'claude-3-5-sonnet-20241022',
                    'max_tokens' => 800,
                    'temperature' => 0.2,
                    'messages' => [[
                        'role' => 'user',
                        'content' => $this->buildAnthropicPrompt($payload, $prompt),
                    ]],
                ]);

            if ($response->failed()) {
                throw new \RuntimeException('Anthropic request failed');
            }

            $content = $response->json('content.0.text');
            if (! is_string($content)) {
                throw new \RuntimeException('Anthropic response was empty');
            }

            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                return array_merge($heuristicResult, [
                    'mode' => 'anthropic',
                    'model' => 'claude-3-5-sonnet-20241022',
                    'summary' => $decoded['summary'] ?? $heuristicResult['summary'],
                    'insights' => $this->normalizeList($decoded['insights'] ?? $heuristicResult['insights']),
                    'recommendations' => $this->normalizeList($decoded['recommendations'] ?? $heuristicResult['recommendations']),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Chart assistant Anthropic fallback triggered', [
                'message' => $e->getMessage(),
            ]);
        }

        return array_merge($heuristicResult, [
            'mode' => 'heuristic',
            'model' => 'heuristic',
        ]);
    }

    public function createConversation(array $context): array
    {
        return [
            'id' => null,
            'resident' => $context['resident']['name'] ?? 'Resident',
            'messages' => [[
                'role' => 'system',
                'content' => 'You are a resident care chart assistant. Be concise and safety-aware.',
            ]],
            'status' => 'active',
        ];
    }

    private function buildAnthropicPrompt(array $payload, ?string $prompt = null): string
    {
        return json_encode([
            'prompt' => $prompt ?? 'Summarize the chart trends and recommend next actions.',
            'resident' => $payload['resident']['name'] ?? 'the selected resident',
            'window' => $payload['window'] ?? 'the selected period',
            'vitals' => $payload['vitals'] ?? [],
            'sleep' => $payload['sleep'] ?? [],
            'behavior_charts' => $payload['behavior_charts'] ?? [],
            'appointments' => $payload['appointments'] ?? [],
            'medications' => $payload['medications'] ?? [],
            'faxes' => $payload['faxes'] ?? [],
            'instructions' => 'Return compact JSON with summary, insights, and recommendations arrays only.',
        ]);
    }

    private function buildHeuristicResult(array $payload, ?string $prompt = null): array
    {
        $residentName = $payload['resident']['name'] ?? 'the selected resident';
        $window = $payload['window'] ?? 'the selected period';
        $vitals = $payload['vitals'] ?? [];
        $sleep = $payload['sleep'] ?? [];
        $behaviorCharts = $payload['behavior_charts'] ?? [];
        $appointments = $payload['appointments'] ?? [];

        $vitalCount = (int) ($vitals['count'] ?? 0);
        $criticalCount = (int) ($vitals['critical_count'] ?? 0);
        $warningCount = (int) ($vitals['warning_count'] ?? 0);
        $latestStatus = $vitals['latest']['status'] ?? null;
        $latestTemperature = $vitals['latest']['temperature'] ?? null;
        $latestPulse = $vitals['latest']['pulse'] ?? null;
        $latestOxygen = $vitals['latest']['oxygen_saturation'] ?? null;
        $avgSleepHours = (float) ($sleep['average_hours'] ?? 0);
        $avgSleepQuality = (float) ($sleep['average_quality'] ?? 0);
        $behaviorCount = (int) ($behaviorCharts['count'] ?? 0);
        $providerNotifiedCount = (int) ($behaviorCharts['provider_notified_count'] ?? 0);
        $behaviorLogCount = (int) ($behaviorCharts['log_count'] ?? 0);
        $upcomingAppointments = (int) ($appointments['upcoming_count'] ?? 0);
        $activeMedicationCount = (int) (($payload['medications']['active_count'] ?? 0));
        $missedMedicationCount = (int) (($payload['medications']['missed_count'] ?? 0));
        $faxCount = (int) (($payload['faxes']['count'] ?? 0));

        $summaryParts = ["$residentName had {$vitalCount} vitals entries during {$window}"];

        if ($activeMedicationCount > 0) {
            $summaryParts[] = 'there are '.$activeMedicationCount.' active medication orders and '.$missedMedicationCount.' missed administration(s) in the review window';
        }

        if ($faxCount > 0) {
            $summaryParts[] = 'there are '.$faxCount.' recent fax message(s) related to the resident';
        }

        if ($criticalCount > 0) {
            $summaryParts[] = "$criticalCount critical observation(s) and {$warningCount} warning(s) should be reviewed immediately";
        } elseif ($warningCount > 0) {
            $summaryParts[] = "$warningCount warning(s) indicate a need for closer monitoring";
        } else {
            $summaryParts[] = 'no urgent vital deviations were detected';
        }

        if ($avgSleepHours > 0) {
            $summaryParts[] = "average sleep was {$avgSleepHours} hours with a quality score of {$avgSleepQuality}";
        }

        if ($behaviorCount > 0) {
            $summaryParts[] = "$behaviorCount behavior chart record(s) were captured and {$providerNotifiedCount} provider alert(s) were triggered";
        }

        if ($upcomingAppointments > 0) {
            $summaryParts[] = "$upcomingAppointments upcoming appointment(s) should be confirmed";
        }

        $summary = ucfirst(implode(', ', $summaryParts)).'.';

        $insights = [];
        if ($missedMedicationCount > 0) {
            $insights[] = 'Medication adherence needs attention because some administrations were missed or unresolved.';
        }
        if ($faxCount > 0) {
            $insights[] = 'Recent fax communications may contain follow-up instructions or care updates that should be reviewed.';
        }
        if ($criticalCount > 0) {
            $insights[] = 'Critical readings are present, so escalation and care-plan review are the priority.';
        }
        if ($latestStatus && $latestStatus !== 'approved') {
            $insights[] = 'The latest vitals status is '.$latestStatus.', which warrants follow-up.';
        }
        if ($avgSleepHours > 0 && $avgSleepHours < 7) {
            $insights[] = 'Sleep is trending below the preferred range and may be affecting recovery.';
        }
        if ($behaviorLogCount > 0) {
            $insights[] = 'Behavior logs show activity that should be tracked against the care plan.';
        }
        if ($upcomingAppointments > 0) {
            $insights[] = 'Upcoming appointments create a scheduling and preparation opportunity for the care team.';
        }
        if (empty($insights)) {
            $insights[] = 'No urgent pattern surfaced; routine monitoring and documentation remain the right next step.';
        }

        $recommendations = [];
        if ($missedMedicationCount > 0) {
            $recommendations[] = 'Review the missed medication entries and confirm whether follow-up or care-team escalation is needed.';
        }
        if ($faxCount > 0) {
            $recommendations[] = 'Review the recent fax messages for provider updates, referrals, or care-plan changes.';
        }
        if ($criticalCount > 0) {
            $recommendations[] = 'Escalate the latest critical values and confirm whether the current care plan needs adjustment.';
        }
        if ($avgSleepHours > 0 && $avgSleepHours < 7) {
            $recommendations[] = 'Review sleep support details and consider environmental adjustments or comfort interventions.';
        }
        if ($behaviorLogCount > 0) {
            $recommendations[] = 'Review the recent behavior notes with the care team and track whether triggers are recurring.';
        }
        if ($upcomingAppointments > 0) {
            $recommendations[] = 'Confirm upcoming appointments and prepare any required clinical notes or transportation plans.';
        }
        if (empty($recommendations)) {
            $recommendations[] = 'Continue routine monitoring and document any changes in condition or care needs.';
        }

        return [
            'summary' => $summary,
            'insights' => $insights,
            'recommendations' => $recommendations,
            'resident' => ['name' => $residentName],
            'window' => $window,
            'prompt' => $prompt ?? 'Summarize the chart trends and recommend next actions.',
        ];
    }

    private function normalizeList(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(function ($item) {
                if (is_string($item)) {
                    return trim($item);
                }

                if (is_array($item)) {
                    return trim((string) ($item['text'] ?? $item['message'] ?? ''));
                }

                return null;
            }, $value)));
        }

        if (is_string($value)) {
            return array_values(array_filter(array_map('trim', preg_split('/\r\n|\n/', $value) ?: [])));
        }

        return [];
    }
}
