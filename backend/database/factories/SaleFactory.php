<?php

namespace Database\Factories;

use App\Models\Sale;
use App\Models\User;
use App\Support\CodeGenerator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sale>
 */
class SaleFactory extends Factory
{
    protected $model = Sale::class;

    public function definition(): array
    {
        return [
            'sale_code' => CodeGenerator::saleCode(),
            'cashier_id' => User::factory()->cashier(),
            'customer_id' => null,
            'service_order_id' => null,
            'status' => Sale::STATUS_DRAFT,
            'subtotal' => 0,
            'discount_amount' => 0,
            'grand_total' => 0,
        ];
    }

    public function pending(string $method = 'QRIS'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Sale::STATUS_PENDING,
            'payment_method' => $method,
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Sale::STATUS_PAID,
            'payment_method' => 'CASH',
            'paid_at' => now(),
        ]);
    }
}
