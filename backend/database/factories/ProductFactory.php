<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'sku' => 'SKU-' . fake()->unique()->bothify('??####'),
            'name' => fake()->words(3, true),
            'category' => fake()->randomElement(['Oli', 'Rem', 'Pengapian', 'Transmisi']),
            'brand' => fake()->company(),
            'unit' => 'pcs',
            'purchase_price' => 20000,
            'sale_price' => 30000,
            'current_stock' => 10,
            'min_stock' => 3,
            'is_active' => true,
        ];
    }

    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_stock' => 2,
            'min_stock' => 5,
        ]);
    }

    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_stock' => 0,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
