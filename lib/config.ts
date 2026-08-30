export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://thermalguard-api-6b9168012334.herokuapp.com';

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
export const GOOGLE_CONFIGURED = Boolean(GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID);
