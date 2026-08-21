<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'expense_date' => now()->toDateString(),
            'category' => fake()->randomElement(['Operasional', 'Konsumsi', 'Perawatan']),
            'amount' => 50000,
            'description' => fake()->sentence(),
            'created_by' => User::factory()->admin(),
        ];
    }
}
