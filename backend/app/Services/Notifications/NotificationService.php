<?php

namespace App\Services\Notifications;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationService
{
    public function create(User $user, string $type, string $title, string $message, array $data = []): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'created_at' => now(),
        ]);
    }

    public function getForUser(User $user, ?string $type = null, int $limit = 50): Collection
    {
        $query = $this->baseQuery($user);

        if ($type) {
            $query->where('type', $type);
        }

        return $query->limit($limit)->get();
    }

    public function getUnreadCounts(User $user): array
    {
        $counts = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->selectRaw("type, COUNT(*) as count")
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

        return [
            'stock' => $counts['STOCK'] ?? 0,
            'transaction' => $counts['TRANSACTION'] ?? 0,
            'total' => array_sum($counts),
        ];
    }

    public function hasUnreadStockForProduct(User $user, int $productId): bool
    {
        return Notification::where('user_id', $user->id)
            ->where('type', 'STOCK')
            ->whereNull('read_at')
            ->whereRaw("CAST(data->>'$.product_id' AS UNSIGNED) = ?", [$productId])
            ->exists();
    }

    public function markAsRead(Notification $notification): void
    {
        // Transaksi yang sudah dibaca langsung dihapus dari database;
        // stok tetap hidup sampai kondisinya terselesaikan.
        if ($notification->type === 'TRANSACTION') {
            $notification->delete();
            return;
        }
        $notification->markAsRead();
    }

    public function markAllAsRead(User $user): void
    {
        $this->baseQuery($user)
            ->whereNull('read_at')
            ->where('type', 'TRANSACTION')
            ->delete();
    }

    public function deleteStockForProduct(int $productId): int
    {
        return Notification::where('type', 'STOCK')
            ->whereRaw("CAST(data->>'$.product_id' AS UNSIGNED) = ?", [$productId])
            ->delete();
    }

    public function cleanup(int $days = 30): int
    {
        return Notification::where('created_at', '<', now()->subDays($days))->delete();
    }

    private function baseQuery(User $user): \Illuminate\Database\Eloquent\Builder
    {
        return Notification::where('user_id', $user->id)->orderByDesc('created_at');
    }
}
