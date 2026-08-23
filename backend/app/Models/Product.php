<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'sku',
        'name',
        'category',
        'brand',
        'unit',
        'purchase_price',
        'sale_price',
        'current_stock',
        'min_stock',
        'is_active',
        'image',
    ];

    protected function casts(): array
    {
        return [
            'purchase_price' => 'decimal:2',
            'sale_price' => 'decimal:2',
            'current_stock' => 'integer',
            'min_stock' => 'integer',
            'is_active' => 'boolean',
            'image' => 'string',
        ];
    }

    public function isLowStock(): bool
    {
        return $this->is_active && $this->current_stock <= $this->min_stock;
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }
}
