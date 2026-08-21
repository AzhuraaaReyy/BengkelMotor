<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_date',
        'category',
        'amount',
        'description',
        'created_by',
        'source',
        'stock_movement_id',
        'item_name',
        'quantity',
        'unit_price',
        'payment_method',
    ];

    public const SOURCE_STOCK_PURCHASE = 'STOCK_PURCHASE';

    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'amount' => 'decimal:2',
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
        ];
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function stockMovement()
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    public function isPurchase(): bool
    {
        return $this->source === self::SOURCE_STOCK_PURCHASE;
    }
}
