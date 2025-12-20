import { ArrowLeft, Bell, Bot, Calendar, Globe, Mic, Shield, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
            <p className="text-muted-foreground">Konfiguriere deinen AI Meeting Recorder</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Bot Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle>Bot Einstellungen</CardTitle>
              </div>
              <CardDescription>Passe das Verhalten des Meeting-Bots an</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bot-Name</Label>
                  <p className="text-sm text-muted-foreground">Der Name, der im Meeting angezeigt wird</p>
                </div>
                <Input className="w-48" defaultValue="Notetaker Bot" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatisch beitreten</Label>
                  <p className="text-sm text-muted-foreground">Bot tritt automatisch bei Meeting-Start bei</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Warteraum überspringen</Label>
                  <p className="text-sm text-muted-foreground">Versuche den Warteraum zu umgehen</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Transcription Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <CardTitle>Transkription</CardTitle>
              </div>
              <CardDescription>Einstellungen für die Spracherkennung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sprache</Label>
                  <p className="text-sm text-muted-foreground">Primäre Sprache für die Transkription</p>
                </div>
                <Select defaultValue="auto">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatisch erkennen</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="en">Englisch</SelectItem>
                    <SelectItem value="fr">Französisch</SelectItem>
                    <SelectItem value="es">Spanisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sprecher-Erkennung</Label>
                  <p className="text-sm text-muted-foreground">Identifiziere verschiedene Sprecher im Transkript</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Genauigkeitsmodus</Label>
                  <p className="text-sm text-muted-foreground">Priorisiere Genauigkeit über Geschwindigkeit</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Audio Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" />
                <CardTitle>Audio & Video</CardTitle>
              </div>
              <CardDescription>Aufnahme-Einstellungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Video aufnehmen</Label>
                  <p className="text-sm text-muted-foreground">Meeting-Video zusätzlich zum Audio speichern</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Videoqualität</Label>
                  <p className="text-sm text-muted-foreground">Qualität der Videoaufnahme</p>
                </div>
                <Select defaultValue="720p">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Benachrichtigungen</CardTitle>
              </div>
              <CardDescription>Wann möchtest du benachrichtigt werden?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Aufnahme abgeschlossen</Label>
                  <p className="text-sm text-muted-foreground">Benachrichtigung wenn die Aufnahme fertig ist</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analyse bereit</Label>
                  <p className="text-sm text-muted-foreground">Benachrichtigung wenn die KI-Analyse fertig ist</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Fehler-Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">Bei Problemen mit der Aufnahme informieren</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Kalender-Integration</CardTitle>
              </div>
              <CardDescription>Verbinde deinen Kalender für automatische Aufnahmen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Google Kalender</Label>
                  <p className="text-sm text-muted-foreground">Synchronisiere Meetings aus Google Kalender</p>
                </div>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Verbinden
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatische Aufnahme</Label>
                  <p className="text-sm text-muted-foreground">Bot automatisch zu Kalender-Meetings senden</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Datenschutz</CardTitle>
              </div>
              <CardDescription>Deine Daten und Privatsphäre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Aufnahmen automatisch löschen</Label>
                  <p className="text-sm text-muted-foreground">Aufnahmen nach einer bestimmten Zeit löschen</p>
                </div>
                <Select defaultValue="never">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Nie</SelectItem>
                    <SelectItem value="30">Nach 30 Tagen</SelectItem>
                    <SelectItem value="90">Nach 90 Tagen</SelectItem>
                    <SelectItem value="365">Nach 1 Jahr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Transkripte verschlüsseln</Label>
                  <p className="text-sm text-muted-foreground">Ende-zu-Ende Verschlüsselung für Transkripte</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;