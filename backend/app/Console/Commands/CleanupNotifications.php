<?php

namespace App\Console\Commands;

use App\Services\Notifications\NotificationService;
use Illuminate\Console\Command;

class CleanupNotifications extends Command
{
    protected $signature = 'notifications:cleanup {--days=30}';
    protected $description = 'Hapus notifikasi transaksi & sistem lebih tua dari N hari';

    public function handle(NotificationService $notifications): int
    {
        $deleted = $notifications->cleanup((int) $this->option('days'));
        $this->info("Deleted {$deleted} notifications.");
        return self::SUCCESS;
    }
}
