# Test Credentials

## Admin Account
- **Email**: admin@tardugno.it
- **Password**: admin123
- **Role**: admin

## Condomino Account
- **Email**: mario.rossi@email.it
- **Password**: password123
- **Role**: condomino

## Google OAuth
- Google sign-in is now enabled
- Any Google account can be used to login
- New users will be created automatically with role "condomino"
- Existing users (by email) will be linked to their Google account

## Notes
- These credentials are created via the `/api/seed` endpoint
- Admin redirects to `/admin` after login
- Condomino redirects to `/home` after login
- Google OAuth uses Emergent managed authentication
