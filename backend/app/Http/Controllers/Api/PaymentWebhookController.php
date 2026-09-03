<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentCharge;
use App\Models\Sale;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class PaymentWebhookController extends Controller
{
    public function __construct(
        private PaymentGateway $gateway,
        private PaymentService $paymentService,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        $signature = (string) $request->header('X-Signature', '');

        if (!$this->gateway->verifySignature($payload, $signature)) {
            return response()->json(['message' => 'Invalid signature.'], 400);
        }

        try {
            $notification = $this->gateway->parseNotification($payload);
            
            if ($notification->status === 'PAID') {
                $this->paymentService->settleFromGateway($notification);
            } elseif ($notification->status === 'EXPIRED') {
                $sale = Sale::where('sale_code', $notification->orderId)->first();
                if ($sale && $sale->status === Sale::STATUS_PENDING) {
                    $this->paymentService->expire($sale, 'Webhook Midtrans: transaksi kedaluwarsa (waktu 5 menit habis).');
                }
            }
            return response()->json(['message' => 'ok']);
        } catch (RuntimeException $e) {
            Log::warning('Payment webhook exception: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        } catch (Throwable $e) {
            Log::error('Payment webhook error: ' . $e->getMessage());
            return response()->json(['message' => 'Internal error.'], 500);
        }
    }

    /**
     * Simulate payment for testing (only available in development)
     */
    public function simulatePayment(string $saleCode): JsonResponse
    {
        // Only allow in development
        if (!app()->environment('local') && !config('app.debug')) {
            return response()->json(['message' => 'Simulation only available in development'], 403);
        }

        $sale = Sale::where('sale_code', $saleCode)
            ->where('status', Sale::STATUS_PENDING)
            ->first();

        if (!$sale) {
            return response()->json(['message' => 'Sale not found or not pending'], 404);
        }

        // Create mock notification for PAID status
        $notification = new GatewayNotification(
            orderId: $sale->sale_code,
            status: 'PAID',
            grossAmount: (string) $sale->grand_total,
            gatewayTransactionId: 'TX-SIM-' . $sale->id,
        );

        try {
            $this->paymentService->settleFromGateway($notification);

            return response()->json([
                'message' => 'Payment simulated successfully',
                'sale_code' => $sale->sale_code,
                'status' => 'PAID',
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }
}
