-- Storage Policies für den 'pin-images' Bucket
-- WICHTIG: Diese Policies müssen im Supabase Dashboard erstellt werden

-- SCHRITT 1: INSERT Policy (Upload) - DIESE BRAUCHST DU JETZT!
-- ============================================================
-- 1. Gehe zu Supabase Dashboard > Storage > pin-images > Policies
-- 2. Klicke auf "New policy"
-- 3. Wähle "For full customization" (ganz unten in der Liste)
-- 4. Fülle aus:
--    - Policy Name: "Allow authenticated uploads"
--    - Allowed operation: INSERT
--    - Policy definition (kopiere diesen SQL Code):
--
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pin-images'::text
  AND auth.role() = 'authenticated'::text
);
--
-- 5. Klicke auf "Save"
-- 
-- FERTIG! Das sollte das Problem lösen.

-- SCHRITT 2: SELECT Policy (Anzeigen) - Optional, aber empfohlen
-- ===============================================================
-- Falls der Bucket PUBLIC ist, ist diese Policy nicht nötig.
-- Falls PRIVATE, erstelle diese:
--
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pin-images'::text
);
--

