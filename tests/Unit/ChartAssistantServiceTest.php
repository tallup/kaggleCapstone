<?php

namespace Tests\Unit;

use App\Services\Agents\MultiAgentOrchestrator;

use App\Services\ChartAssistantService;
use PHPUnit\Framework\TestCase;

class ChartAssistantServiceTest extends TestCase
{
    public function test_it_builds_fallback_insights_when_no_openai_key_is_available(): void
    {
        putenv('ANTHROPIC_API_KEY=');
        $_ENV['ANTHROPIC_API_KEY'] = '';
        $_SERVER['ANTHROPIC_API_KEY'] = '';

        $service = new ChartAssistantService();

        $payload = [
            'resident' => ['name' => 'Maria Gomez'],
            'window' => 'last 14 days',
            'vitals' => [
                'count' => 8,
                'critical_count' => 1,
                'warning_count' => 2,
                'latest' => [
                    'temperature' => 99.8,
                    'pulse' => 92,
                    'oxygen_saturation' => 95,
                    'status' => 'pending_review',
                ],
            ],
            'sleep' => [
                'count' => 4,
                'average_hours' => 6.2,
                'average_quality' => 5.5,
            ],
            'behavior_charts' => [
                'count' => 3,
                'provider_notified_count' => 1,
                'log_count' => 4,
            ],
            'appointments' => [
                'upcoming_count' => 2,
            ],
            'medications' => [
                'active_count' => 3,
                'missed_count' => 1,
                'administration_count' => 5,
            ],
        ];

        $result = $service->analyze($payload, null);

        $this->assertSame('heuristic', $result['mode']);
        $this->assertNotEmpty($result['summary']);
        $this->assertNotEmpty($result['insights']);
        $this->assertNotEmpty($result['recommendations']);
        $this->assertSame('Maria Gomez', $result['resident']['name']);
        $this->assertStringContainsString('medication', strtolower($result['summary']));
    }

    public function test_it_requires_human_approval_for_critical_or_missed_medication_cases(): void
    {
        $orchestrator = new MultiAgentOrchestrator();

        $workflow = $orchestrator->run([
            'vitals' => ['critical_count' => 1, 'warning_count' => 0, 'latest' => ['status' => 'critical']],
            'medications' => ['missed_count' => 2, 'active_count' => 3],
        ]);

        $this->assertTrue($workflow['approval_required']);
        $this->assertGreaterThan(0, count($workflow['agents']));
    }
}
