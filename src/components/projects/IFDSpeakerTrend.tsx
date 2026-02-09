import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  recordings: any[];
}

const SPEAKER_COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];

export function IFDSpeakerTrend({ recordings }: Props) {
  // Extract unique speakers and build data
  const allSpeakers = new Set<string>();
  recordings.forEach((r) => {
    if (r.participants && typeof r.participants === "object") {
      Object.keys(r.participants).forEach((s) => allSpeakers.add(s));
    }
  });

  const speakers = Array.from(allSpeakers).slice(0, 6);
  if (!speakers.length) return null;

  const data = recordings.map((r) => {
    const entry: any = {
      name: r.title?.slice(0, 20) || new Date(r.created_at).toLocaleDateString("de-DE"),
    };
    speakers.forEach((s) => {
      entry[s] = r.participants?.[s]?.percentage || r.participants?.[s] || 0;
    });
    return entry;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sprechanteile-Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {speakers.map((s, i) => (
              <Bar key={s} dataKey={s} stackId="a" fill={SPEAKER_COLORS[i % SPEAKER_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
