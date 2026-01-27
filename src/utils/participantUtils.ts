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
