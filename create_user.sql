-- ============================================
-- BENUTZER ERSTELLEN: nassem@gmail.com
-- ============================================
-- 
-- WICHTIG: Dieser SQL-Befehl kann Passwörter nicht direkt setzen!
-- Du musst den Benutzer über das Supabase Dashboard erstellen:
--
-- 1. Gehe zu: Supabase Dashboard → Authentication → Users
-- 2. Klicke auf "Add user" oder "Create user"
-- 3. E-Mail: nassem@gmail.com
-- 4. Passwort: 12345
-- 5. Optional: Username: nassem
-- 6. Klicke auf "Create user"
--
-- Der Benutzer wird automatisch in die users-Tabelle eingefügt
-- durch den Trigger "on_auth_user_created"
--
-- ============================================
-- ALTERNATIVE: Manuell über SQL (NACH Dashboard-Erstellung)
-- ============================================
-- Falls der Benutzer in auth.users existiert, aber nicht in public.users:
-- (Normalerweise passiert das automatisch durch den Trigger)

-- Prüfe ob Benutzer existiert
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'nassem@gmail.com';

-- Falls nötig, füge manuell zur users-Tabelle hinzu:
-- (Ersetze USER_ID_HIER mit der tatsächlichen UUID aus der obigen Abfrage)
/*
INSERT INTO public.users (id, email, username)
VALUES (
    'USER_ID_HIER', -- UUID von auth.users
    'nassem@gmail.com',
    'nassem'
)
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, public.users.username);
*/

-- ============================================
-- EMPFOHLEN: Verwende Supabase Dashboard
-- ============================================
-- Gehe zu: https://app.supabase.com
-- → Wähle dein Projekt
-- → Authentication → Users → Add user
-- → E-Mail: nassem@gmail.com
-- → Passwort: 12345
-- → Create user

