// Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = require('./env');

/**
 * Create a Supabase client with the anon key for public operations
 * Used for client-side operations in the frontend (but we're using it in backend for SSR-like patterns)
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a Supabase client with the service role key for admin operations
 * Used for backend operations that require elevated privileges
 */
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = { supabase, supabaseAdmin };