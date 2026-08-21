<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_code',
        'customer_id',
        'motorcycle_type',
        'cashier_id',
        'mechanic_id',
        'complaint',
        'diagnosis_note',
        'status',
        'opened_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public const STATUS_OPEN = 'OPEN';
    public const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    public const STATUS_DONE = 'DONE';
    public const STATUS_CANCELLED = 'CANCELLED';

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function mechanic()
    {
        return $this->belongsTo(Mechanic::class);
    }

    public function sale()
    {
        return $this->hasOne(Sale::class);
    }
}
