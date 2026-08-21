<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_code',
        'cashier_id',
        'customer_id',
        'service_order_id',
        'status',
        'subtotal',
        'discount_amount',
        'grand_total',
        'payment_method',
        'paid_amount',
        'change_amount',
        'paid_at',
        'voided_at',
        'voided_by',
        'void_reason',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PAID = 'PAID';
    public const STATUS_EXPIRED = 'EXPIRED';
    public const STATUS_VOID = 'VOID';

    public const PAYMENT_CASH = 'CASH';
    public const PAYMENT_QRIS = 'QRIS';
    public const PAYMENT_VA = 'VA';
    public const PAYMENT_GOPAY = 'GOPAY';
    public const ONLINE_METHODS = [self::PAYMENT_QRIS, self::PAYMENT_VA, self::PAYMENT_GOPAY];

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function serviceOrder()
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    public function voidedBy()
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function paymentCharges(): HasMany
    {
        return $this->hasMany(PaymentCharge::class);
    }

    public function latestCharge(): HasOne
    {
        return $this->hasOne(PaymentCharge::class)->latestOfMany();
    }
}
