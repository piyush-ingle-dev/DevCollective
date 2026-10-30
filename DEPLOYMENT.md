# DevCollective production deployment

## Recommended architecture

Deploy DevCollective as two Render Web Services from the same repository and branch:

- `devcollective-app`: Express API + Vite SPA. Start command: `npm start`. Health check: `/api/health`.
- `devcollective-ws`: authenticated WebSocket server. Start command: `npm run start:ws`. Health check: `/health`.

The WebSocket service uses the Render-provided `PORT` through `ws-start.ts`, so it can accept public `wss://` connections behind Render's TLS.

## Environment variables

### App service

Set these in Render before the first production build:

- `NODE_ENV=production`
- `VITE_CLERK_PUBLISHABLE_KEY=<Clerk production publishable key>`
- `VITE_SUPABASE_URL=<Supabase project URL>`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>`
- `VITE_WS_URL=wss://devcollective-ws.onrender.com`
- `CLERK_PUBLISHABLE_KEY=<same Clerk production publishable key>`
- `CLERK_SECRET_KEY=<Clerk production secret key>`
- `CLERK_AUTHORIZED_PARTIES=https://devcollective-app.onrender.com`
- `SUPABASE_URL=<Supabase project URL>`
- `SUPABASE_SECRET_KEY=<Supabase server secret key>`
- `GEMINI_API_KEY=<Gemini API key>`
- `APP_URL=https://devcollective-app.onrender.com`
- `RESEND_API_KEY=<Resend API key>` and `RESEND_FROM_EMAIL=<verified sender>` when transactional email is enabled.

### WebSocket service

Set:

- `NODE_ENV=production`
- `CLERK_SECRET_KEY=<same Clerk production secret key>`
- `CLERK_AUTHORIZED_PARTIES=https://devcollective-app.onrender.com`
- `SUPABASE_URL=<Supabase project URL>`
- `SUPABASE_SECRET_KEY=<Supabase server secret key>`

Do not commit actual secret values. Configure them in Render's environment settings.

## Clerk production configuration

Use the production Clerk instance for the deployed app. Add `https://devcollective-app.onrender.com` to the allowed origins / redirect configuration required by the Clerk dashboard. Keep `CLERK_AUTHORIZED_PARTIES` identical on the app and WebSocket services so server-side token verification accepts the deployed app origin.

## Supabase

Apply all messaging migrations to the production Supabase project before opening the deployed app to teammates. Keep database secrets server-side only; the browser should receive only the publishable Supabase key. Verify the required `devcollective_*` messaging tables exist before the smoke test.

## Testing checklist

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. Start the production app and verify `/api/health` returns `{\"status\":\"ok\"}`.
5. Start the WebSocket service and verify `/health` returns `{\"status\":\"ok\"}`.
6. Sign in with two different Clerk accounts.
7. Send messages in both directions.
8. Verify Sent → Delivered → Read receipts.
9. Verify typing indicators in both directions.
10. Verify wheel/touch scrolling in chat.
11. Verify block/report/mute/archive/hide flows.
12. Test on a phone over cellular data, not only the same Wi-Fi.
13. Confirm a reconnect restores the session and messaging continues.

## Branch flow

Use feature branches for changes. Merge the WebSocket feature into `integration/level-0-consolidation`, verify the integrated branch, then promote the verified result into the release branch and finally `main`. Historical branches should not be merged merely because they exist.
