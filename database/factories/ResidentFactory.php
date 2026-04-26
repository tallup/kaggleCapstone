<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Resident;
use Illuminate\Database\Eloquent\Factories\Factory;

class ResidentFactory extends Factory
{
    protected $model = Resident::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'date_of_birth' => fake()->date('Y-m-d', '-60 years'),
            'gender' => fake()->randomElement(['male', 'female']),
            'room_number' => (string) fake()->numberBetween(100, 400),
            'branch_id' => Branch::factory(),
            'admission_date' => fake()->date('Y-m-d', 'now'),
            'status' => 'active',
            'lifecycle_status' => 'active',
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
            'status' => 'discharged',
            'lifecycle_status' => 'discharged',
        ]);
    }
}
