<?php

namespace App\Services\Notifications;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class StockNotificationService
{
    private const STOCK_THRESHOLD = 5;

    public function __construct(private NotificationService $notification) {}

    /**
     * Check if a product needs a stock notification and create one for all
     * active users when the stock is below the threshold and no unread
     * STOCK notification already exists for that product+user.
     */
    public function check(Product $product, ?int $currentStock = null): void
    {
        Log::info('StockNotificationService::check dipanggil', [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'currentStock_param' => $currentStock,
        ]);

        if ($currentStock === null) {
            $product->refresh();
            $currentStock = $product->current_stock;
        }

        Log::info('Cek nilai stok', [
            'product_id' => $product->id,
            'current_stock' => $currentStock,
            'threshold' => self::STOCK_THRESHOLD,
            'is_below_threshold' => $currentStock < self::STOCK_THRESHOLD,
        ]);

        if ($currentStock >= self::STOCK_THRESHOLD) {
            Log::info('Stok di atas threshold, skip notifikasi', ['product_id' => $product->id]);
            return;
        }

        $users = User::where('is_active', true)->get();

        Log::info('User aktif untuk notifikasi', ['count' => $users->count()]);

        foreach ($users as $user) {
            $exists = $this->notification->hasUnreadStockForProduct($user, $product->id);

            Log::info('Cek deduplikasi', [
                'user_id' => $user->id,
                'product_id' => $product->id,
                'exists' => $exists,
            ]);

            if ($exists) {
                continue;
            }

            $isOut = $currentStock === 0;
            $title = $isOut ? 'Stok Habis' : 'Stok Menipis';
            $message = sprintf(
                'Produk %s tersisa %d %s',
                $product->name,
                $currentStock,
                $product->unit,
            );

            Log::info('Membuat notifikasi STOCK', [
                'user_id' => $user->id,
                'product_id' => $product->id,
                'title' => $title,
            ]);

            $this->notification->create($user, 'STOCK', $title, $message, [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'current_stock' => $currentStock,
                'min_stock' => self::STOCK_THRESHOLD,
                'unit' => $product->unit,
            ]);
        }
    }
}
