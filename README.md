# ENNY AI Android MVP

ENNY AI is an Expo / React Native Android starter app. Version 1.0 includes:
- Sign-up and login screens, backed by Supabase when configured
- Demo Mode for immediate testing
- Offline structured AI prompt builder
- Prompt categories, styles, lighting, camera and quality choices
- Copy generated prompt
- Prompt history saved locally on the device
- Premium plan information display (₦2,000/year)

## Important current limitations

This is a working prompt-writing MVP, not a full generative AI service:
- The prompt builder runs locally and does not call an AI model.
- It does not generate images or videos.
- Real user accounts require your own Supabase project and configuration.
- Premium checkout, OPay verification and subscription activation are NOT implemented. Do not accept payments through this prototype yet.
- Never put payment secrets, Supabase service-role keys, or AI provider secret keys in the Android app.

## 1. What you need

A computer is the easiest way to build the APK:
- Node.js LTS
- npm
- An Expo account (free account is enough to start)
- Android phone for testing

You can test the project on an Android phone using Expo Go, but building a standalone APK is easiest through Expo EAS Build.

## 2. Install and run

Unzip the project, open a terminal in the `enny-ai-android` folder, then run:

```bash
npm install
npx expo start
```

Install **Expo Go** from Google Play on your Android phone. Scan the QR code shown by the terminal. Your phone and computer should be on the same Wi-Fi network.

If you want to run it with a clean Expo SDK installation, create a fresh Expo app and copy this project's `App.js` and `app.json` into it:

```bash
npx create-expo-app@latest enny-ai
cd enny-ai
```

Then copy the supplied `App.js` and `app.json` into that folder and install the dependencies listed in `package.json`.

## 3. Enable real account registration with Supabase

1. Create a project at https://supabase.com
2. In Supabase, open Project Settings, then API.
3. Copy the Project URL and the publishable/anon client key.
4. In the app folder, create a file named `.env` using `.env.example` as the template.
5. Add your own values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

6. Restart Expo after changing `.env`:

```bash
npx expo start -c
```

The app uses Supabase email/password authentication. Configure email confirmation and password policies in Supabase Auth settings. The app's Demo Mode does not create a real account.

## 4. Build an Android APK

Install and sign in to EAS:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Then run:

```bash
eas build --platform android --profile preview
```

The supplied `eas.json` uses an APK build for the preview profile. When the build finishes, EAS provides a download link. Download the APK on your Android phone, allow installation from that source if Android asks, and install it.

For a Play Store release, use an AAB build profile and complete Google Play's developer account and app review requirements.

## 5. Supabase security

The Supabase publishable/anon key is designed for client apps, but it must be protected by correct Supabase Auth policies and Row Level Security for any database tables. Never embed the service-role key in this app.

## 6. Recommended next development stages

1. Connect and test Supabase account registration.
2. Add a secure server-side AI prompt refinement endpoint.
3. Add image generation using an image provider, with API keys stored only on the server.
4. Add a payment provider / merchant checkout with verified payment webhooks.
5. Create a subscription record with a 12-month expiry after verified payment.
6. Add user profile, cloud prompt history, privacy policy and support pages.

## App identity

Name: ENNY AI  
Android package ID: com.ennyvisuals.ennyai  
Primary feature: AI Prompt Generator  
Premium price proposal: ₦2,000 per year (not yet purchasable in this MVP)
