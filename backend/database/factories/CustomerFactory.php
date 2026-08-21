<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => fake()->numerify('08##########'),
            'motorcycle_type' => fake()->randomElement([
                'Honda Vario 125',
                'Yamaha NMAX',
                'Honda Beat',
                'Yamaha Mio',
                'Honda PCX 160',
                null,
            ]),
            'notes' => null,
        ];
    }
}
