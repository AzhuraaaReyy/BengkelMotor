<?php

namespace Database\Factories;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SaleItem>
 */
class SaleItemFactory extends Factory
{
    protected $model = SaleItem::class;

    public function definition(): array
    {
        return [
            'sale_id' => Sale::factory(),
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => Product::factory(),
            'service_id' => null,
            'item_code_snapshot' => null,
            'item_name_snapshot' => fake()->words(2, true),
            'quantity' => 1,
            'unit_price' => 0,
            'purchase_price_snapshot' => null,
            'subtotal' => 0,
        ];
    }
}
