<?php

namespace Database\Factories;

use App\Models\WhatsAppChat;
use App\Models\WhatsAppMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

class WhatsAppMessageFactory extends Factory
{
    protected $model = WhatsAppMessage::class;

    public function definition(): array
    {
        return [
            'chat_id' => WhatsAppChat::factory(),
            'direction' => fake()->randomElement(['inbound', 'outbound']),
            'sender_type' => fake()->randomElement(['customer', 'bot', 'admin']),
            'message_text' => fake()->sentence(),
            'event_type' => null,
            'meta_message_id' => null,
        ];
    }
}
