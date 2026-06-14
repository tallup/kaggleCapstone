<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Facility;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => 'caregiver',
            'is_active' => true,
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function administrator(): static
    {
        return $this->state(fn () => ['role' => 'administrator']);
    }

    public function caregiver(): static
    {
        return $this->state(fn () => ['role' => 'caregiver']);
    }

    public function superAdmin(): static
    {
        return $this->state(fn () => ['role' => 'super_admin']);
    }

    public function forFacility(Facility $facility, ?Branch $branch = null): static
    {
        $state = ['facility_id' => $facility->id];
        if ($branch) {
            $state['assigned_branch_id'] = $branch->id;
        }
        return $this->state(fn () => $state);
    }
}
