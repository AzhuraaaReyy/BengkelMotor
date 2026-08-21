<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'before_data',
        'after_data',
        'reason',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'before_data' => 'array',
            'after_data' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public const ACTION_LOGIN = 'AUTH_LOGIN';
    public const ACTION_LOGIN_FAILED = 'AUTH_LOGIN_FAILED';
    public const ACTION_LOGOUT = 'AUTH_LOGOUT';
    public const ACTION_SALE_CHECKOUT = 'SALE_CHECKOUT';
    public const ACTION_SALE_VOIDED = 'SALE_VOIDED';
    public const ACTION_STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT';
    public const ACTION_STOCK_PURCHASE = 'STOCK_PURCHASE';
    public const ACTION_PRODUCT_CREATED = 'PRODUCT_CREATED';
    public const ACTION_PRODUCT_UPDATED = 'PRODUCT_UPDATED';
    public const ACTION_SERVICE_CREATED = 'SERVICE_CREATED';
    public const ACTION_SERVICE_UPDATED = 'SERVICE_UPDATED';
    public const ACTION_EXPENSE_CREATED = 'EXPENSE_CREATED';
    public const ACTION_EXPENSE_UPDATED = 'EXPENSE_UPDATED';
    public const ACTION_SERVICE_ORDER_DELETED = 'SERVICE_ORDER_DELETED';
    public const ACTION_USER_CREATED = 'USER_CREATED';
    public const ACTION_USER_UPDATED = 'USER_UPDATED';

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
