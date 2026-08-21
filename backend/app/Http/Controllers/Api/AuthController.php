<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = User::where('email', $request->email)->first();

        // Generic message to avoid user enumeration.
        $failedMessage = 'Kredensial tidak valid.';

        if (!$user || !Hash::check($request->password, $user->password)) {
            // Internal audit trail may distinguish the reason (helps Admin
            // investigate brute-force/enumeration attempts); the HTTP
            // response above stays generic either way. Never log the
            // submitted password itself.
            $this->audit->log(
                AuditLog::ACTION_LOGIN_FAILED,
                'user',
                $user?->id,
                null,
                ['email' => $request->email],
                $user ? 'Password salah' : 'Email tidak terdaftar'
            );

            throw ValidationException::withMessages([
                'email' => [$failedMessage],
            ]);
        }

        if (!$user->is_active) {
            $this->audit->log(
                AuditLog::ACTION_LOGIN_FAILED,
                'user',
                $user->id,
                null,
                ['email' => $request->email],
                'Akun dinonaktifkan'
            );

            throw ValidationException::withMessages([
                'email' => [__('Akun Anda dinonaktifkan.')],
            ]);
        }

        // Start a session
        // Sanctum's stateful (SPA cookie) auth can resolve the user on
        // subsequent requests.
        $request->session()->regenerate();
        Auth::guard('web')->login($user, $request->boolean('remember'));

        $this->audit->log(
            AuditLog::ACTION_LOGIN,
            'user',
            $user->id,
            null,
            ['username' => $user->username],
            'Login berhasil'
        );

        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'message' => 'Login berhasil.',
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        $this->audit->log(
            AuditLog::ACTION_LOGOUT,
            'user',
            $user?->id,
            null,
            null,
            'Logout'
        );

        // Invalidate the session server-side.
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Logout berhasil.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }
}
