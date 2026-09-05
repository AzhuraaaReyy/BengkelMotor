<?php

namespace Database\Factories;

use App\Models\WhatsAppChat;
use Illuminate\Database\Eloquent\Factories\Factory;

class WhatsAppChatFactory extends Factory
{
    protected $model = WhatsAppChat::class;

    public function definition(): array
    {
        return [
            'phone_number' => '628' . fake()->numerify('#########'),
            'last_message_at' => now(),
            'last_message_from' => 'customer',
            'bot_active' => false,
            'admin_takeover' => false,
        ];
    }
}
