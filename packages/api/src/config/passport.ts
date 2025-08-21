import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as AppleStrategy } from 'passport-apple';

export function setupPassport() {
  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = {
          providerId: profile.id,
          provider: 'google',
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || '',
        };
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Facebook OAuth
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ['id', 'emails', 'name']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = {
          providerId: profile.id,
          provider: 'facebook',
          email: profile.emails?.[0]?.value || '',
          name: `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
        };
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Apple OAuth
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackURL: "/api/auth/apple/callback"
    }, async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        const user = {
          providerId: profile.id,
          provider: 'apple',
          email: profile.email || '',
          name: profile.name?.firstName && profile.name?.lastName 
            ? `${profile.name.firstName} ${profile.name.lastName}` 
            : profile.email?.split('@')[0] || '',
        };
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }
}