import { extractSpeakersInOrder } from '@/utils/speakerColors';

// Bot/Notetaker-Erkennung Patterns
const BOT_PATTERNS = ['notetaker', 'bot', 'recording', 'assistant', 'meetingbot'];

export const isBot = (name: string): boolean => {
  const lowercaseName = name.toLowerCase();
  return BOT_PATTERNS.some(pattern => lowercaseName.includes(pattern));
};

export interface Participant {
  id: string;
  name: string;
}

// Filtert Bots aus Teilnehmerliste
export const filterRealParticipants = (
  participants: Participant[] | null | undefined
): Participant[] => {
  if (!participants || !Array.isArray(participants)) return [];
  return participants.filter(p => p.name && !isBot(p.name));
};

// Zaehlt nur echte Teilnehmer
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

/**
 * Extrahiert Teilnehmer direkt aus dem Transkript-Text.
 * Wird als Fallback verwendet, wenn die DB keine participants hat.
 */
export const extractParticipantsFromTranscript = (
  transcriptText: string | null | undefined
): Participant[] => {
  if (!transcriptText) return [];
  
  // Nutze die existierende Funktion aus speakerColors
  const speakers = extractSpeakersInOrder(transcriptText);
  
  // Filtere Bots und normalisiere Namen
  return speakers
    .filter(name => !isBot(name))
    .map((name, index) => ({
      id: String(index),
      name: normalizeGermanName(name),
    }));
};

/**
 * Ermittelt die Anzahl der echten Teilnehmer mit Fallback-Logik:
 * 1. Priorität: participants aus DB
 * 2. Fallback: Sprecher aus Transkript extrahieren
 */
export const getParticipantCountWithFallback = (
  participants: Participant[] | null | undefined,
  transcriptText: string | null | undefined
): number => {
  // Priorität 1: DB-Teilnehmer
  const dbCount = countRealParticipants(participants);
  if (dbCount > 0) {
    return dbCount;
  }
  
  // Priorität 2: Aus Transkript extrahieren
  if (transcriptText) {
    const extracted = extractParticipantsFromTranscript(transcriptText);
    return extracted.length;
  }
  
  return 0;
};
