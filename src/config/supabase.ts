import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://frzfopjetynlwhhzhoer.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyemZvcGpldHlubHdoaHpob2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjY4ODksImV4cCI6MjA4NDgwMjg4OX0.8FtNDT4XtIH1DaQCluPpHql33K1nVG1yK61MFSD2vW0';
     
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Google Sign-In configuration
// Replace with your actual Google OAuth client IDs
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '682479545419-5s9t3qjrn6hhbv8rp0bqem5s3ah6oj61.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '682479545419-5s9t3qjrn6hhbv8rp0bqem5s3ah6oj61.apps.googleusercontent.com';
