<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Support\CodeGenerator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceOrder>
 */
class ServiceOrderFactory extends Factory
{
    protected $model = ServiceOrder::class;

    public function definition(): array
    {
        return [
            'order_code' => CodeGenerator::orderCode(),
            'customer_id' => Customer::factory(),
            'motorcycle_type' => fake()->randomElement([
                'Honda Vario 125',
                'Yamaha NMAX',
                'Honda Beat',
                'Yamaha Mio',
                null,
            ]),
            'cashier_id' => User::factory()->cashier(),
            'mechanic_id' => null,
            'complaint' => fake()->sentence(),
            'diagnosis_note' => null,
            'status' => ServiceOrder::STATUS_OPEN,
            'opened_at' => now(),
            'completed_at' => null,
        ];
    }
}
