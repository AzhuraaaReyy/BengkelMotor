<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'type',
        'quantity_change',
        'stock_before',
        'stock_after',
        'sale_id',
        'created_by',
        'note',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity_change' => 'integer',
            'stock_before' => 'integer',
            'stock_after' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public const TYPE_OPENING = 'OPENING';
    public const TYPE_PURCHASE = 'PURCHASE';
    public const TYPE_SALE = 'SALE';
    public const TYPE_SALE_REVERSAL = 'SALE_REVERSAL';
    public const TYPE_ADJUSTMENT = 'ADJUSTMENT';
    public const TYPE_VOID_RETURN = 'VOID_RETURN';

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function expense()
    {
        return $this->hasOne(Expense::class, 'stock_movement_id');
    }
}
