import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, CheckCircle, Lightbulb } from "lucide-react";

interface Props {
  recordings: any[];
}

export function IFDKpiCards({ recordings }: Props) {
  const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
  const totalMeetings = recordings.length;
  const totalActionItems = recordings.reduce((sum, r) => sum + (r.action_items?.length || 0), 0);
  const totalKeyPoints = recordings.reduce((sum, r) => sum + (r.key_points?.length || 0), 0);

  const kpis = [
    { label: "Meetings", value: totalMeetings, icon: FileText, color: "text-blue-500" },
    { label: "Gesamtdauer", value: `${Math.round(totalDuration / 60)} Min`, icon: Clock, color: "text-green-500" },
    { label: "Action Items", value: totalActionItems, icon: CheckCircle, color: "text-orange-500" },
    { label: "Key Points", value: totalKeyPoints, icon: Lightbulb, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
            <div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
