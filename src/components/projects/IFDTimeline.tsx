import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  recordings: any[];
}

export function IFDTimeline({ recordings }: Props) {
  const data = recordings.map((r) => ({
    name: r.title?.slice(0, 20) || new Date(r.created_at).toLocaleDateString("de-DE"),
    actionItems: r.action_items?.length || 0,
    keyPoints: r.key_points?.length || 0,
  }));

  if (!data.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fortschritts-Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis className="text-xs" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actionItems" name="Action Items" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="keyPoints" name="Key Points" stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
