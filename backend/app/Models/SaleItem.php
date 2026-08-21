<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'item_type',
        'product_id',
        'service_id',
        'item_code_snapshot',
        'item_name_snapshot',
        'quantity',
        'unit_price',
        'purchase_price_snapshot',
        'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'purchase_price_snapshot' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public const TYPE_PRODUCT = 'PRODUCT';
    public const TYPE_SERVICE = 'SERVICE';

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }
}
