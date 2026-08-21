<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->search, fn($q, $s) => $q->where(
                fn($qq) =>
                $qq->where('name', 'like', "%{$s}%")->orWhere('username', 'like', "%{$s}%")
            ))
            ->orderBy('name')
            ->paginate(15);

        return response()->json(['data' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:80', 'unique:users,username'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', 'in:ADMIN,CASHIER'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->audit->log(
            AuditLog::ACTION_USER_CREATED,
            'user',
            $user->id,
            null,
            ['name' => $user->name, 'username' => $user->username, 'role' => $user->role]
        );

        return response()->json(['data' => $user, 'message' => 'Pengguna dibuat.'], 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'username' => ['sometimes', 'string', 'max:80', 'unique:users,username,' . $user->id],
            'email' => ['sometimes', 'email', 'max:190', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'in:ADMIN,CASHIER'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $before = $user->only(['name', 'username', 'email', 'role', 'is_active']);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        $this->audit->log(
            AuditLog::ACTION_USER_UPDATED,
            'user',
            $user->id,
            $before,
            $user->only(['name', 'username', 'email', 'role', 'is_active'])
        );

        return response()->json(['data' => $user, 'message' => 'Pengguna diperbarui.']);
    }
}
