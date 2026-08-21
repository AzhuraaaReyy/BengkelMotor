<?php

namespace App\Console\Commands;

use App\Models\PaymentCharge;
use App\Services\Payments\PaymentService;
use Illuminate\Console\Command;

class ExpirePendingSales extends Command
{
    protected $signature = 'expire:pending-sales';
    protected $description = 'Expire PENDING charges past expires_at and restore stock on their sale.';

    public function handle(PaymentService $paymentService): int
    {
        $expired = 0;
        PaymentCharge::query()
            ->where('status', PaymentCharge::STATUS_PENDING)
            ->where('expires_at', '<', now())
            ->with('sale')
            ->chunkById(100, function ($charges) use ($paymentService, &$expired) {
                foreach ($charges as $charge) {
                    try {
                        $paymentService->expire($charge->sale, 'Pembayaran kedaluwarsa (auto).');
                        $expired++;
                    } catch (\RuntimeException) {
                        // Already transitioned — skip.
                    }
                }
            });

        $this->info("Expired {$expired} pending sale(s).");
        return self::SUCCESS;
    }
}
