import { useState, useEffect } from 'react';
import { Webhook, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { ApiKeyData, WebhookData } from './ApiKeyCard';

interface WebhookConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKeyData | null;
  onSave: (action: string, data: any) => Promise<boolean>;
  isSaving: boolean;
}

export const WebhookConfigDialog = ({ open, onOpenChange, apiKey, onSave, isSaving }: WebhookConfigDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [reportType, setReportType] = useState('dashboard');
  const [frequency, setFrequency] = useState('manual');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [scheduleDay, setScheduleDay] = useState('1'); // Monday
  const [thresholdValue, setThresholdValue] = useState('80');
  const [isTesting, setIsTesting] = useState(false);
  
  const existingWebhook = apiKey?.webhooks?.[0]; // For now, one webhook per key

  useEffect(() => {
    if (open && apiKey) {
      if (existingWebhook) {
        setName(existingWebhook.name);
        setWebhookUrl(existingWebhook.webhook_url);
        setReportType(existingWebhook.report_type);
        setFrequency(existingWebhook.frequency);
        setScheduleTime(existingWebhook.schedule_time || '08:00');
        setScheduleDay(String(existingWebhook.schedule_day ?? 1));
        setThresholdValue(String(existingWebhook.threshold_value ?? 80));
      } else {
        setName(`${apiKey.name} Webhook`);
        setWebhookUrl('');
        setReportType('dashboard');
        setFrequency('manual');
        setScheduleTime('08:00');
        setScheduleDay('1');
        setThresholdValue('80');
      }
    }
  }, [open, apiKey, existingWebhook]);

  const handleTest = async () => {
    if (!webhookUrl) {
      toast({ title: 'URL erforderlich', variant: 'destructive' });
      return;
    }
    
    setIsTesting(true);
    const success = await onSave('test', { webhook_url: webhookUrl });
    setIsTesting(false);
    
    if (success) {
      toast({ title: 'Test-Webhook gesendet', description: 'Prüfe dein Zielsystem.' });
    }
  };

  const handleSave = async () => {
    if (!name || !webhookUrl || !apiKey) {
      toast({ title: 'Name und URL erforderlich', variant: 'destructive' });
      return;
    }

    const data: any = {
      api_key_id: apiKey.id,
      name,
      webhook_url: webhookUrl,
      report_type: reportType,
      frequency,
      schedule_time: frequency === 'daily' || frequency === 'weekly' ? scheduleTime : null,
      schedule_day: frequency === 'weekly' ? parseInt(scheduleDay) : null,
      threshold_type: frequency === 'threshold' ? 'quota_percent' : null,
      threshold_value: frequency === 'threshold' ? parseInt(thresholdValue) : null,
      is_active: true,
    };

    if (existingWebhook) {
      data.webhook_id = existingWebhook.id;
    }

    const success = await onSave(existingWebhook ? 'update' : 'create', data);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!existingWebhook) return;
    
    if (!confirm('Webhook wirklich löschen?')) return;
    
    const success = await onSave('delete', { webhook_id: existingWebhook.id });
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook konfigurieren
          </DialogTitle>
          <DialogDescription>
            Konfiguriere einen Webhook für: <strong>{apiKey?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wh-name">Name</Label>
            <Input
              id="wh-name"
              placeholder="z.B. Täglicher Slack Report"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wh-url">Webhook-URL</Label>
            <div className="flex gap-2">
              <Input
                id="wh-url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleTest}
                disabled={isTesting || !webhookUrl}
                title="Test senden"
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Report-Typ</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard-Zusammenfassung</SelectItem>
                <SelectItem value="transcripts">Transkripte</SelectItem>
                <SelectItem value="team_stats">Team-Statistiken</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Frequenz</Label>
            <RadioGroup value={frequency} onValueChange={setFrequency}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="freq-manual" />
                <label htmlFor="freq-manual" className="text-sm cursor-pointer">
                  Manuell (nur API-Abruf)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="freq-daily" />
                <label htmlFor="freq-daily" className="text-sm cursor-pointer flex items-center gap-2">
                  Täglich um
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-24 h-8"
                    disabled={frequency !== 'daily'}
                  />
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="freq-weekly" />
                <label htmlFor="freq-weekly" className="text-sm cursor-pointer flex items-center gap-2">
                  Wöchentlich am
                  <Select value={scheduleDay} onValueChange={setScheduleDay} disabled={frequency !== 'weekly'}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Montag</SelectItem>
                      <SelectItem value="2">Dienstag</SelectItem>
                      <SelectItem value="3">Mittwoch</SelectItem>
                      <SelectItem value="4">Donnerstag</SelectItem>
                      <SelectItem value="5">Freitag</SelectItem>
                      <SelectItem value="6">Samstag</SelectItem>
                      <SelectItem value="0">Sonntag</SelectItem>
                    </SelectContent>
                  </Select>
                  um
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-24 h-8"
                    disabled={frequency !== 'weekly'}
                  />
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="threshold" id="freq-threshold" />
                <label htmlFor="freq-threshold" className="text-sm cursor-pointer flex items-center gap-2">
                  Bei Kontingent ≥
                  <Input
                    type="number"
                    min="50"
                    max="100"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    className="w-16 h-8"
                    disabled={frequency !== 'threshold'}
                  />
                  %
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingWebhook && (
            <Button variant="destructive" onClick={handleDelete} className="sm:mr-auto">
              Löschen
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name || !webhookUrl}>
            {isSaving ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
