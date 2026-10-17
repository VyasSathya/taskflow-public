# Supabase Setup Guide

Complete guide for setting up Supabase authentication and database with your Expo app.

**Official Docs:**
- [Supabase Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Expo Supabase Guide](https://docs.expo.dev/guides/using-supabase/)

---

## Step 1: Create Supabase Project

### 1.1 Sign Up / Log In
1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project** or **Sign In**
3. Sign up with GitHub, GitLab, or email

### 1.2 Create New Project
1. Click **New Project**
2. Select your organization (or create one)
3. Fill in:
   - **Name**: Your app name (e.g., `myapp-prod`)
   - **Database Password**: Generate a strong one and **SAVE IT** somewhere secure
   - **Region**: Choose closest to your users
4. Click **Create new project**
5. Wait 2-3 minutes for provisioning

---

## Step 2: Get Your API Keys

### 2.1 Find Your Keys
1. In your project dashboard, go to **Settings** (gear icon) → **API**
2. You'll see two important values:

| Key | Description | Safe to Expose? |
|-----|-------------|-----------------|
| **Project URL** | `https://xxxxx.supabase.co` | Yes |
| **anon/public key** | `your-supabase-anon-key` | Yes (with RLS) |
| **service_role key** | `your-supabase-anon-key` | **NO - Server only!** |

### 2.2 Add to Your App
1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

---

## Step 3: Configure Authentication

### 3.1 Enable Auth Providers
1. Go to **Authentication** → **Providers**
2. Enable the providers you want:

#### Email/Password (Default - Already enabled)
- Toggle **Enable Email Signup**
- Configure confirmation emails if desired

#### Google OAuth
1. Click **Google**
2. Toggle **Enable Google provider**
3. Get credentials from [Google Cloud Console](https://console.cloud.google.com):
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Paste Client ID and Secret into Supabase

#### Apple OAuth
1. Click **Apple**
2. Toggle **Enable Apple provider**
3. Get credentials from [Apple Developer Portal](https://developer.apple.com):
   - Create Services ID
   - Configure Sign in with Apple
4. Paste Service ID and Secret Key into Supabase

### 3.2 Configure Redirect URLs (for OAuth)
1. Go to **Authentication** → **URL Configuration**
2. Add your app's redirect URL:
   ```
   myapp://auth/callback
   ```
   (Replace `myapp` with your app's scheme from `app.json`)

---

## Step 4: Set Up Database Tables

### 4.1 Create Profiles Table
1. Go to **SQL Editor**
2. Run this SQL:

```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Trigger the function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4.2 Create Updated At Trigger
```sql
-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
```

---

## Step 5: Test Authentication

### 5.1 Test in Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter test email and password
4. User should appear in list

### 5.2 Test in Your App
1. Run your app: `npm run tunnel`
2. Go to login screen
3. Enter test credentials
4. Should successfully authenticate

---

## Step 6: Add Social Auth to App (Optional)

### 6.1 Install Additional Dependencies
```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

### 6.2 Update app.json
Add your scheme for deep linking:
```json
{
  "expo": {
    "scheme": "myapp"
  }
}
```

### 6.3 Google Sign-In Code
Add to your login screen:

```typescript
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignIn() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      });
    }
  }, [response]);

  return (
    <Button
      title="Sign in with Google"
      disabled={!request}
      onPress={() => promptAsync()}
    />
  );
}
```

---

## Step 7: Secure Storage (Already Configured)

The template already includes secure token storage using `expo-secure-store`. This is configured in `lib/supabase/client.ts`:

```typescript
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
```

This ensures auth tokens are stored securely on the device.

---

## Common Issues & Solutions

### "Invalid API key"
- Double-check your `.env` values
- Make sure you're using the `anon` key, not `service_role`
- Restart Expo after changing `.env`

### "User not found" after signup
- Check if email confirmation is required in Supabase
- Disable confirmation for testing: **Authentication** → **Providers** → **Email** → Disable "Confirm email"

### OAuth redirect not working
- Verify your app scheme matches the redirect URL in Supabase
- Make sure `expo-auth-session` is installed
- Check that URL Configuration in Supabase includes your redirect

### RLS blocking queries
- Check your policies in **Database** → **Policies**
- Use the SQL Editor to test queries as the authenticated user
- Temporarily disable RLS for debugging (re-enable for production!)

---

## Checklist

- [ ] Created Supabase project
- [ ] Copied API URL and anon key to `.env`
- [ ] Enabled desired auth providers
- [ ] Created profiles table with RLS policies
- [ ] Tested signup/login flow
- [ ] (Optional) Added social auth providers
- [ ] (Optional) Set up additional tables

---

## Next Steps

- [Set up EAS Build](./02-EAS-BUILD.md) for app store deployment
- [Add Sentry](./03-SENTRY.md) for error tracking
- [Add PostHog](./04-POSTHOG.md) for analytics
