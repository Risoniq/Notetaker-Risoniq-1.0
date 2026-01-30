// Account Analytics Utilities
// Aggregiert Metriken aus allen Meetings eines Accounts

import { 
  performDeepDiveAnalysis, 
  SpeakerShare, 
  ContentBreakdown, 
  OpenQuestion, 
  CustomerNeed 
} from './deepDiveAnalysis';
import { format, startOfWeek, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export interface Recording {
  id: string;
  created_at: string;
  duration: number | null;
  transcript_text: string | null;
  action_items: string[] | null;
  key_points: string[] | null;
  participants: unknown;
  status: string;
  title: string | null;
}

export interface WeeklyData {
  week: string;
  count: number;
  minutes: number;
}

export interface AccountAnalytics {
  totalMeetings: number;
  totalDurationMinutes: number;
  totalActionItems: number;
  totalKeyPoints: number;
  totalParticipants: number;
  averageDuration: number;
  
  // Aggregierte Deep Dive Daten
  aggregatedSpeakerShares: SpeakerShare[];
  aggregatedContentBreakdown: ContentBreakdown;
  aggregatedOpenQuestions: OpenQuestion[];
  aggregatedCustomerNeeds: CustomerNeed[];
  
  // Zeitliche Daten fuer Charts
  weeklyData: WeeklyData[];
}

// Farben für Sprecher (konsistent mit deepDiveAnalysis)
const SPEAKER_COLORS = [
  'hsl(210, 80%, 55%)',  // Blau (eigener Account)
  'hsl(150, 70%, 50%)',  // Grün
  'hsl(30, 80%, 55%)',   // Orange
  'hsl(280, 60%, 55%)',  // Lila
  'hsl(350, 70%, 55%)',  // Rot
  'hsl(180, 60%, 45%)',  // Türkis
  'hsl(60, 70%, 45%)',   // Gelb-Grün
  'hsl(320, 60%, 55%)',  // Pink
];

/**
 * Berechnet aggregierte Analytics aus allen Recordings
 */
export const calculateAccountAnalytics = (
  recordings: Recording[],
  userEmail: string | null
): AccountAnalytics => {
  // Nur abgeschlossene Meetings mit Transkript analysieren
  const completedRecordings = recordings
    .filter(r => r.status === 'done')
    .slice(0, 50); // Max 50 für Performance

  // Basis-Statistiken
  const totalMeetings = completedRecordings.length;
  const totalDurationMinutes = completedRecordings.reduce(
    (sum, r) => sum + (r.duration ? Math.round(r.duration / 60) : 0), 
    0
  );
  const totalActionItems = completedRecordings.reduce(
    (sum, r) => sum + (r.action_items?.length || 0), 
    0
  );
  const totalKeyPoints = completedRecordings.reduce(
    (sum, r) => sum + (r.key_points?.length || 0), 
    0
  );
  
  // Unique Teilnehmer zählen
  const allParticipants = new Set<string>();
  completedRecordings.forEach(r => {
    if (r.participants && Array.isArray(r.participants)) {
      r.participants.forEach((p: { name?: string }) => {
        if (p.name) allParticipants.add(p.name);
      });
    }
  });
  const totalParticipants = allParticipants.size;

  const averageDuration = totalMeetings > 0 
    ? Math.round(totalDurationMinutes / totalMeetings) 
    : 0;

  // Deep Dive Analysen aggregieren
  const allSpeakerWords: Map<string, { words: number; isCustomer: boolean }> = new Map();
  let totalSmallTalkWords = 0;
  let totalBusinessWords = 0;
  const allOpenQuestions: OpenQuestion[] = [];
  const allCustomerNeeds: CustomerNeed[] = [];

  completedRecordings.forEach(recording => {
    if (!recording.transcript_text) return;
    
    const analysis = performDeepDiveAnalysis(recording.transcript_text, userEmail);
    
    // Sprechanteile aggregieren
    analysis.speakerShares.forEach(share => {
      const existing = allSpeakerWords.get(share.name);
      if (existing) {
        existing.words += share.words;
      } else {
        allSpeakerWords.set(share.name, { 
          words: share.words, 
          isCustomer: share.isCustomer 
        });
      }
    });
    
    // Content Breakdown aggregieren
    totalSmallTalkWords += analysis.contentBreakdown.smallTalkWords;
    totalBusinessWords += analysis.contentBreakdown.businessWords;
    
    // Open Questions sammeln (mit Meeting-Kontext)
    allOpenQuestions.push(...analysis.openQuestions);
    
    // Customer Needs sammeln
    allCustomerNeeds.push(...analysis.customerNeeds);
  });

  // Aggregierte Sprechanteile berechnen
  const totalWords = Array.from(allSpeakerWords.values())
    .reduce((sum, s) => sum + s.words, 0);
  
  const aggregatedSpeakerShares: SpeakerShare[] = Array.from(allSpeakerWords.entries())
    .map(([name, data], index) => ({
      name,
      words: data.words,
      percentage: totalWords > 0 ? Math.round((data.words / totalWords) * 100) : 0,
      isCustomer: data.isCustomer,
      color: !data.isCustomer ? SPEAKER_COLORS[0] : SPEAKER_COLORS[(index % (SPEAKER_COLORS.length - 1)) + 1],
    }))
    .sort((a, b) => b.words - a.words)
    .slice(0, 10); // Top 10 Sprecher

  // Aggregierte Content Breakdown
  const totalContentWords = totalSmallTalkWords + totalBusinessWords;
  const aggregatedContentBreakdown: ContentBreakdown = {
    smallTalk: totalContentWords > 0 ? Math.round((totalSmallTalkWords / totalContentWords) * 100) : 0,
    business: totalContentWords > 0 ? Math.round((totalBusinessWords / totalContentWords) * 100) : 0,
    smallTalkWords: totalSmallTalkWords,
    businessWords: totalBusinessWords,
  };

  // Deduplizierte Open Questions (Top 10)
  const uniqueQuestions = allOpenQuestions
    .filter((q, i, arr) => 
      arr.findIndex(x => x.question.toLowerCase() === q.question.toLowerCase()) === i
    )
    .slice(0, 10);

  // Deduplizierte Customer Needs (Top 10)
  const uniqueNeeds = allCustomerNeeds
    .filter((n, i, arr) => 
      arr.findIndex(x => x.need.toLowerCase().slice(0, 40) === n.need.toLowerCase().slice(0, 40)) === i
    )
    .slice(0, 10);

  // Wöchentliche Daten berechnen
  const weeklyMap: Map<string, { count: number; minutes: number }> = new Map();
  completedRecordings.forEach(recording => {
    const date = parseISO(recording.created_at);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'dd.MM', { locale: de });
    
    const existing = weeklyMap.get(weekKey) || { count: 0, minutes: 0 };
    existing.count += 1;
    existing.minutes += recording.duration ? Math.round(recording.duration / 60) : 0;
    weeklyMap.set(weekKey, existing);
  });

  const weeklyData: WeeklyData[] = Array.from(weeklyMap.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8); // Letzte 8 Wochen

  return {
    totalMeetings,
    totalDurationMinutes,
    totalActionItems,
    totalKeyPoints,
    totalParticipants,
    averageDuration,
    aggregatedSpeakerShares,
    aggregatedContentBreakdown,
    aggregatedOpenQuestions: uniqueQuestions,
    aggregatedCustomerNeeds: uniqueNeeds,
    weeklyData,
  };
};

/**
 * Formatiert Minuten als "Xh Ymin"
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};
