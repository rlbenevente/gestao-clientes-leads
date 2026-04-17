import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqgjdcrvggpanlrpkrbk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZ2pkY3J2Z2dwYW5scnBrcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTMwNTksImV4cCI6MjA5MjAyOTA1OX0.zBXvnOqN_UMHjcCYgdUC-mk3miUuTVw0n4hkaXrXCvk';

export const supabase = createClient(supabaseUrl, supabaseKey);
