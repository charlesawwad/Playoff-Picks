// src/lib/supabase.js
// Replace the two placeholder values below with your own from the Supabase dashboard.
// Dashboard → Project Settings → API

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yourprojectid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-full-key-here';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
