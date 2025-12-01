# Benutzer erstellen: nassem@gmail.com

## Option 1: Über Supabase Dashboard (EMPFOHLEN)

1. Gehe zu: https://app.supabase.com
2. Wähle dein Projekt aus
3. Klicke auf **Authentication** im linken Menü
4. Klicke auf **Users** Tab
5. Klicke auf den Button **"Add user"** oder **"Create user"**
6. Fülle aus:
   - **Email:** `nassem@gmail.com`
   - **Password:** `12345`
   - **Auto Confirm User:** ✅ (aktivieren, damit kein E-Mail-Verifizierung nötig ist)
7. Klicke auf **"Create user"**

Der Benutzer wird automatisch:
- In `auth.users` erstellt
- In `public.users` eingefügt (durch Trigger)
- Kann sich sofort anmelden

---

## Option 2: Über Supabase SQL Editor (Erweiterte Option)

Wenn du den Benutzer bereits über das Dashboard erstellt hast, kannst du mit SQL prüfen:

```sql
-- Prüfe ob Benutzer existiert
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'nassem@gmail.com';

-- Prüfe ob Benutzer in public.users ist
SELECT id, email, username 
FROM public.users 
WHERE email = 'nassem@gmail.com';
```

---

## Wichtig:

- Passwörter können **NICHT** direkt in SQL gesetzt werden
- Verwende das Dashboard für die Benutzer-Erstellung
- Der Trigger `on_auth_user_created` erstellt automatisch einen Eintrag in `public.users`

---

## Testen:

Nach der Erstellung kannst du dich anmelden mit:
- **Email:** nassem@gmail.com
- **Password:** 12345

