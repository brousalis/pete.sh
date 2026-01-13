# Google API Setup Guide

This guide will help you set up Google API credentials for Petehome's Calendar and Maps features.

## Required APIs

Petehome uses the following Google APIs:

- **Google Calendar API** - For calendar event integration
- **Google Maps Platform APIs** - For location search, place details, autocomplete, and directions

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter a project name (e.g., "Petehome")
5. Click **"Create"**
6. Wait for the project to be created and select it

## Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for and enable the following APIs:
   - **Google Calendar API**
   - **Maps JavaScript API** (for Maps features)
   - **Places API** (for place search and autocomplete)
   - **Directions API** (for directions)
   - **Geocoding API** (for address conversion)

## Step 3: Create OAuth 2.0 Credentials (for Calendar)

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - Choose **"External"** (unless you have a Google Workspace)
   - Fill in the required fields:
     - App name: "Petehome"
     - User support email: Your email
     - Developer contact: Your email
   - Click **"Save and Continue"**
   - On the Scopes page, click **"Save and Continue"**
   - Add test users if needed, then **"Save and Continue"**
   - Review and **"Back to Dashboard"**

4. Create the OAuth client:
   - Application type: **"Web application"**
   - Name: "Petehome Calendar"
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production - replace with your domain)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/calendar/callback` (for development)
     - `https://yourdomain.com/api/calendar/callback` (for production)
   - Click **"Create"**
5. Copy the **Client ID** and **Client Secret** - you'll need these for your `.env` file

## Step 4: Create API Key (for Maps and Calendar)

1. Still in **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS"** > **"API key"**
3. Copy the API key that appears
4. **Important:** Click on the API key to edit it and restrict it:
   - **Application restrictions:**
     - Choose **"HTTP referrers (web sites)"**
     - Add referrers:
       - `http://localhost:3000/*` (for development)
       - `https://yourdomain.com/*` (for production)
   - **API restrictions:**
     - Choose **"Restrict key"**
     - Select only these APIs:
       - Google Calendar API
       - Maps JavaScript API
       - Places API
       - Directions API
       - Geocoding API
   - Click **"Save"**

## Step 5: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following variables:

```env
# Google API Credentials
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_API_KEY=your-api-key-here

# Optional: Set custom redirect URI (defaults to localhost:3000 for dev)
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback

# Optional: Set your production app URL
# NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

3. Replace the placeholder values with your actual credentials from Steps 3 and 4

## Step 6: Update Redirect URI for Production

When deploying to production, make sure to:

1. Update the redirect URI in your Google Cloud Console to match your production domain
2. Set the `NEXT_PUBLIC_APP_URL` environment variable to your production URL, or set
   `GOOGLE_REDIRECT_URI` explicitly
3. The redirect URI will automatically use the correct domain based on your environment variables

## Step 7: Test the Configuration

1. Start your development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **For Calendar OAuth:**
   - Navigate to `/api/calendar/auth` to initiate the OAuth flow
   - You'll be redirected to Google to authorize the app
   - After authorization, you'll be redirected back to `/api/calendar/callback`
   - Then navigate to the Calendar page to see your events

3. **For Maps:**
   - Try using Maps features - location search should work immediately
   - The Maps API uses the API key directly (no OAuth required)

## Troubleshooting

### "Google Calendar not configured" error

- Verify all three environment variables are set: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
  `GOOGLE_API_KEY`
- Restart your development server after adding environment variables
- Check that the Google Calendar API is enabled in your project

### "Google Maps API key not configured" error

- Verify `GOOGLE_API_KEY` is set in your `.env.local` file
- Check that the Maps APIs are enabled in Google Cloud Console
- Verify API key restrictions allow your domain

### OAuth redirect errors

- Ensure the redirect URI in Google Cloud Console exactly matches the one in your code
- For production, update both the Google Cloud Console and the code if needed
- Check that your OAuth consent screen is properly configured

### API quota/billing issues

- Google Cloud projects have free tier limits
- You may need to enable billing for higher quotas
- Check your API usage in the Google Cloud Console

## Security Best Practices

1. **Never commit `.env.local` to version control** - it's already in `.gitignore`
2. **Restrict your API key** - Always restrict API keys to specific APIs and domains
3. **Use different credentials for development and production**
4. **Rotate credentials regularly** - Especially if they're exposed
5. **Monitor API usage** - Set up alerts in Google Cloud Console

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
