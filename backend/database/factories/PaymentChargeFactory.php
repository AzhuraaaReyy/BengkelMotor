<?php

namespace Database\Factories;

use App\Models\PaymentCharge;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentChargeFactory extends Factory
{
    protected $model = PaymentCharge::class;

    public function definition(): array
    {
        return [
            'sale_id' => Sale::factory(),
            'method' => 'QRIS',
            'amount' => 100000,
            'status' => PaymentCharge::STATUS_PENDING,
            'gateway_transaction_id' => 'TX-' . fake()->unique()->numerify('######'),
            'expires_at' => now()->addMinutes(15),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => PaymentCharge::STATUS_PENDING]);
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => PaymentCharge::STATUS_PAID,
            'paid_at' => now(),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn () => ['status' => PaymentCharge::STATUS_EXPIRED]);
    }
}
