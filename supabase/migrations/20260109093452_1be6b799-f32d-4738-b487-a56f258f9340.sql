-- RLS Policies für den Transcripts Bucket erstellen
-- SELECT: Nutzer können nur ihre eigenen Dateien sehen
CREATE POLICY "Users can view own transcripts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'Transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- INSERT: Nutzer können nur in ihren eigenen Ordner hochladen
CREATE POLICY "Users can upload own transcripts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'Transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- UPDATE: Nutzer können nur ihre eigenen Dateien aktualisieren
CREATE POLICY "Users can update own transcripts"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'Transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DELETE: Nutzer können nur ihre eigenen Dateien löschen
CREATE POLICY "Users can delete own transcripts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'Transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);