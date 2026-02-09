import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  recordings: any[];
}

const STOP_WORDS = new Set([
  "und", "der", "die", "das", "ist", "ein", "eine", "in", "von", "zu", "mit", "auf", "für",
  "an", "den", "dem", "des", "als", "auch", "es", "ich", "wir", "sie", "er", "aber", "oder",
  "dass", "nicht", "noch", "schon", "dann", "man", "hat", "haben", "wird", "werden", "kann",
  "können", "soll", "muss", "the", "and", "is", "to", "of", "a", "in", "that", "it", "was",
  "for", "on", "are", "with", "this", "be", "at", "we", "you", "so", "if", "do", "can",
  "has", "had", "will", "would", "could", "should", "been", "from", "have", "not", "but",
  "all", "was", "were", "been", "being", "there", "their", "what", "which", "who", "whom",
  "how", "when", "where", "why", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "than", "very", "just", "also", "über", "nach",
  "vor", "bei", "zum", "zur", "aus", "wie", "wenn", "weil", "hier", "dort", "sehr",
  "gut", "mal", "also", "da", "ja", "nein", "okay",
]);

export function IFDTopicCloud({ recordings }: Props) {
  const wordFreq: Record<string, number> = {};

  recordings.forEach((r) => {
    const text = [r.transcript_text, r.summary, ...(r.key_points || []), ...(r.action_items || [])]
      .filter(Boolean)
      .join(" ");

    text
      .toLowerCase()
      .replace(/[^\wäöüß]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
      .forEach((w) => {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      });
  });

  const sorted = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  if (!sorted.length) return null;

  const maxCount = sorted[0][1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Themen-Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {sorted.map(([word, count]) => {
            const intensity = Math.max(0.3, count / maxCount);
            return (
              <Badge
                key={word}
                variant="secondary"
                className="text-sm transition-all hover:scale-105"
                style={{ opacity: intensity, fontSize: `${0.75 + intensity * 0.5}rem` }}
              >
                {word} ({count})
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
