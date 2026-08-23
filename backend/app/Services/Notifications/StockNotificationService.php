<?php

namespace App\Services\Notifications;

use App\Models\Product;
use App\Models\User;

class StockNotificationService
{
    private const STOCK_THRESHOLD = 5;

    public function __construct(private NotificationService $notification) {}

    /**
     * Check if a product needs a stock notification and create one for all
     * active users when the stock is below the threshold and no unread
     * STOCK notification already exists for that product+user.
     */
    public function check(Product $product): void
    {
        $product->refresh();

        if ($product->current_stock >= self::STOCK_THRESHOLD) {
            return;
        }

        $users = User::where('is_active', true)->get();

        foreach ($users as $user) {
            $exists = $this->notification->hasUnreadStockForProduct($user, $product->id);
            if ($exists) {
                continue;
            }

            $isOut = $product->current_stock === 0;
            $title = $isOut ? 'Stok Habis' : 'Stok Menipis';
            $message = sprintf(
                'Produk %s tersisa %d %s',
                $product->name,
                $product->current_stock,
                $product->unit,
            );

            $this->notification->create($user, 'STOCK', $title, $message, [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'current_stock' => $product->current_stock,
                'min_stock' => self::STOCK_THRESHOLD,
                'unit' => $product->unit,
            ]);
        }
    }
}
