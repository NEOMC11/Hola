// ===== CONFIGURACIÓN DE SUPABASE =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Tu configuración de Supabase
const supabaseUrl = 'https://fqhotxxrjwdjqujnnuup.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaG90eHhyandkanF1am5udXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ1OTYsImV4cCI6MjA4MTE0MDU5Nn0.OLVoX1egLFNk6XtyvDNmyi9N6GshSr1IV5XEbb9-2Ew'

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Exportar para usar en otros archivos
export { supabase }