
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xshmjbkhrtvtiflstvug.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaG1qYmtocnR2dGlmbHN0dnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjY3MjIsImV4cCI6MjA4NjA0MjcyMn0.lhk42DnYo2ffo_mWZDv07r6ybRfq7onfbZJW0fD6gwY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
