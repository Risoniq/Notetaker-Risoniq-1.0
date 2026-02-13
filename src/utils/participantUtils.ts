import { extractSpeakersInOrder } from '@/utils/speakerColors';

// ============================================================
// Bot/Notetaker-Erkennung
// ============================================================

const BOT_PATTERNS = ['notetaker', 'bot', 'recording', 'assistant', 'meetingbot'];

export const isBot = (name: string): boolean => {
  const lowercaseName = name.toLowerCase();
  return BOT_PATTERNS.some(pattern => lowercaseName.includes(pattern));
};

// ============================================================
// Metadaten-Filter für Transkript-Header
// ============================================================

// Metadaten-Felder die keine echten Sprecher sind
const METADATA_FIELDS = [
  'user-id', 'user id', 'userid',
  'user-email', 'user email', 'useremail',
  'recording-id', 'recording id', 'recordingid',
  'erstellt', 'created', 'datum', 'date',
  'meeting-info', 'meeting info',
  '[meeting-info]', '[meeting:',
];

/**
 * Prüft ob ein Name ein Metadaten-Feld ist (kein echter Sprecher)
 */
export const isMetadataField = (name: string): boolean => {
  const normalized = name.toLowerCase().trim();
  // Prüfe auf exakte Matches und Teilstrings
  return METADATA_FIELDS.some(field => 
    normalized === field || 
    normalized.includes(field) ||
    normalized.startsWith('[')  // Alle Header in eckigen Klammern
  );
};

/**
 * Entfernt den Metadaten-Header vom Transkript-Anfang.
 * Der Header hat das Format:
 * [Meeting-Info]
 * User-ID: xxx
 * ...
 * ---
 */
export const stripMetadataHeader = (transcript: string): string => {
  if (!transcript) return '';
  
  // Suche nach dem ersten --- Separator (Ende des Headers)
  const separatorIndex = transcript.indexOf('---');
  
  // Header nur entfernen wenn er in den ersten 500 Zeichen ist
  if (separatorIndex > -1 && separatorIndex < 500) {
    return transcript.slice(separatorIndex + 3).trimStart();
  }
  
  return transcript;
};

// ============================================================
// Teilnehmer-Interface und Basisfunktionen
// ============================================================

export interface Participant {
  id: string;
  name: string;
}

/**
 * Filtert Bots und Metadaten aus Teilnehmerliste
 */
export const filterRealParticipants = (
  participants: Participant[] | null | undefined
): Participant[] => {
  if (!participants || !Array.isArray(participants)) return [];
  return participants.filter(p => 
    p.name && 
    !isBot(p.name) && 
    !isMetadataField(p.name)
  );
};

/**
 * Zählt nur echte Teilnehmer (ohne Bots und Metadaten)
 */
export const countRealParticipants = (
  participants: Participant[] | null | undefined
): number => {
  return filterRealParticipants(participants).length;
};

// ============================================================
// Namens-Normalisierung für deutsche Namen aus Recall.ai
// ============================================================

/**
 * Normalisiert deutsche Umlaute die als Digraphen geschrieben wurden.
 * z.B. "Goerge" -> "Görge", "Mueller" -> "Müller"
 * 
 * ACHTUNG: Diese Konvertierung ist heuristisch und kann bei 
 * nicht-deutschen Namen falsch sein (z.B. "Schroeder" bleibt "Schröder")
 */
export const normalizeGermanUmlauts = (text: string): string => {
  // Nur am Wortanfang oder nach Konsonanten konvertieren (heuristisch)
  return text
    .replace(/([^aeiouAEIOU])oe/g, '$1ö')
    .replace(/([^aeiouAEIOU])ae/g, '$1ä')
    .replace(/([^aeiouAEIOU])ue/g, '$1ü')
    .replace(/^Oe/g, 'Ö')
    .replace(/^Ae/g, 'Ä')
    .replace(/^Ue/g, 'Ü');
};

/**
 * Normalisiert einen Namen aus dem Recall.ai Format.
 * Unterstützte Formate:
 * - "Nachname, Vorname (X.)" -> "Vorname Nachname"
 * - "Nachname, Vorname" -> "Vorname Nachname"
 * - "Vorname Nachname" -> bleibt gleich
 * 
 * Wendet auch Umlaut-Normalisierung an.
 */
export const normalizeGermanName = (name: string): string => {
  if (!name || typeof name !== 'string') return name;
  
  let normalized = name.trim();
  
  // Prüfe auf "Nachname, Vorname (Kürzel)" Format
  const commaMatch = normalized.match(/^([^,]+),\s*([^(]+)(?:\s*\([^)]+\))?$/);
  
  if (commaMatch) {
    const lastName = commaMatch[1].trim();
    const firstName = commaMatch[2].trim();
    // Umdrehen: "Vorname Nachname"
    normalized = `${firstName} ${lastName}`;
  }
  
  // Umlaut-Normalisierung anwenden
  normalized = normalizeGermanUmlauts(normalized);
  
  return normalized;
};

// ============================================================
// Transkript-basierte Teilnehmer-Extraktion
// ============================================================

/**
 * Extrahiert Teilnehmer direkt aus dem Transkript-Text.
 * Filtert automatisch Bots und Metadaten-Felder.
 * Wird als Fallback verwendet, wenn die DB keine participants hat.
 */
export const extractParticipantsFromTranscript = (
  transcriptText: string | null | undefined
): Participant[] => {
  if (!transcriptText) return [];
  
  // Entferne Metadaten-Header
  const cleanedTranscript = stripMetadataHeader(transcriptText);
  
  // Nutze die existierende Funktion aus speakerColors
  const speakers = extractSpeakersInOrder(cleanedTranscript);
  
  // Filtere Bots und Metadaten, normalisiere Namen
  return speakers
    .filter(name => !isBot(name) && !isMetadataField(name))
    .map((name, index) => ({
      id: String(index),
      name: normalizeGermanName(name),
    }));
};

// ============================================================
// Konsistente Teilnehmerzählung (Single Source of Truth)
// ============================================================

export interface ParticipantResult {
  count: number;
  names: string[];
  source: 'database' | 'calendar' | 'transcript' | 'fallback';
}

/**
 * Zentrale Funktion für konsistente Teilnehmerzählung.
 * Nutzt DB-Teilnehmer falls vorhanden, sonst Transkript-Extraktion.
 * 
 * Diese Funktion sollte ÜBERALL verwendet werden wo Teilnehmerzahlen
 * angezeigt werden, um Konsistenz zu gewährleisten.
 */
export const getConsistentParticipantCount = (
  recording: {
    participants?: Participant[] | null;
    calendar_attendees?: { name: string; email: string }[] | null;
    transcript_text?: string | null;
  }
): ParticipantResult => {
  // 1. Versuche DB-Teilnehmer (ohne Bots und Metadaten)
  if (recording.participants && Array.isArray(recording.participants)) {
    const realParticipants = filterRealParticipants(recording.participants);
    if (realParticipants.length > 0) {
      return {
        count: realParticipants.length,
        names: realParticipants.map(p => normalizeGermanName(p.name)),
        source: 'database'
      };
    }
  }
  
  // 2. Fallback: calendar_attendees aus Kalender-Event
  if (recording.calendar_attendees && Array.isArray(recording.calendar_attendees)) {
    const calendarNames = recording.calendar_attendees
      .map(a => a.name || a.email.split('@')[0])
      .filter(name => !isBot(name) && !isMetadataField(name))
      .map(name => normalizeGermanName(name));
    if (calendarNames.length > 0) {
      return {
        count: calendarNames.length,
        names: calendarNames,
        source: 'calendar'
      };
    }
  }
  
  // 3. Fallback: Extrahiere aus Transkript
  if (recording.transcript_text) {
    const extracted = extractParticipantsFromTranscript(recording.transcript_text);
    
    // Filtere auch generische Namen wie "Sprecher 1", "Unbekannt"
    const namedParticipants = extracted.filter(p => 
      p.name !== 'Unbekannt' && 
      !p.name.startsWith('Sprecher ')
    );
    
    if (namedParticipants.length > 0) {
      return {
        count: namedParticipants.length,
        names: namedParticipants.map(p => p.name),
        source: 'transcript'
      };
    }
    
    // Falls nur generische Sprecher: Zähle diese
    if (extracted.length > 0) {
      return {
        count: extracted.length,
        names: extracted.map(p => p.name),
        source: 'transcript'
      };
    }
  }
  
  // 3. Absoluter Fallback
  return { count: 0, names: [], source: 'fallback' };
};

// ============================================================
// Legacy-Funktion (für Abwärtskompatibilität)
// ============================================================

/**
 * @deprecated Nutze stattdessen getConsistentParticipantCount
 */
export const getParticipantCountWithFallback = (
  participants: Participant[] | null | undefined,
  transcriptText: string | null | undefined
): number => {
  const result = getConsistentParticipantCount({
    participants: participants ?? null,
    transcript_text: transcriptText ?? null,
  });
  return result.count;
};
