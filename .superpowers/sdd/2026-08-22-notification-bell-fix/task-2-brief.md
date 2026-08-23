# Task 2: Clear Dismiss Flag on Logout

## Files
- Modify: `frontend/src/app/auth/AuthContext.tsx`

## Interfaces
- Consumes: `logout` function
- Produces: Clear sessionStorage "stockDismissSession" on logout

## Requirements

**Current state:** AuthContext has a `logout` function that calls `logoutApi()` and sets user to null.

**Required changes:**
1. In the `logout` function, add: `sessionStorage.removeItem("stockDismissSession");`
2. This should happen in the `finally` block (or before/after `logoutApi()` call) to ensure the flag is cleared regardless of API success/failure

## Files to Modify
- `frontend/src/app/auth/AuthContext.tsx`

## Acceptance Criteria
- On logout, `sessionStorage.removeItem("stockDismissSession")` is called
- After logout + login, if low stock exists, bell should appear again
- Build passes

## Files to Modify
- `frontend/src/app/auth/AuthContext.tsx`

## Verification
- Run `npm run build` in frontend/ - must pass
- Manual test: login, trigger low stock, click X, logout, login, verify bell reappears if low stock exists