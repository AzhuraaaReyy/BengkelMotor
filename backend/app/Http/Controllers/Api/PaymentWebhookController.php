<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Services\Payments\Contracts\PaymentGateway;
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
                if ($sale) {
                    $this->paymentService->expire($sale, 'Webhook Midtrans: transaksi ditolak/kedaluwarsa.');
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
}
