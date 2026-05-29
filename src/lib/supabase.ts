import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://zhxwhusfcstdkaksmokj.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoeHdodXNmY3N0ZGtha3Ntb2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjIwMTYsImV4cCI6MjA5NTI5ODAxNn0.irhykBzoail_yVf-0bWPp1lTNARp75HmMwkJOCB81qc';

export const supabase = createClient(supabaseUrl, supabaseKey);
