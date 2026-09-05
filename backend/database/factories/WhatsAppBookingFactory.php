<?php

namespace Database\Factories;

use App\Models\WhatsAppBooking;
use App\Models\WhatsAppChat;
use Illuminate\Database\Eloquent\Factories\Factory;

class WhatsAppBookingFactory extends Factory
{
    protected $model = WhatsAppBooking::class;

    public function definition(): array
    {
        return [
            'chat_id' => WhatsAppChat::factory(),
            'customer_name' => fake()->name(),
            'phone_number' => '628' . fake()->numerify('#########'),
            'booking_date' => now()->addDays(2),
            'booking_time' => '10:00:00',
            'tnkb' => strtoupper(fake()->bothify('??####???')),
            'motorcycle_type' => fake()->randomElement(['Honda Vario 160', 'Yamaha Nmax', 'Honda PCX', 'Yamaha Aerox']),
            'complaint' => fake()->sentence(),
            'status' => 'PENDING',
            'approved_by' => null,
            'approved_at' => null,
            'rejection_reason' => null,
            'service_order_id' => null,
        ];
    }
}
