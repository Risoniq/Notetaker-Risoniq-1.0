import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Warte auf Freischaltung</CardTitle>
          <CardDescription className="text-base mt-2">
            Dein Account wurde erfolgreich erstellt und wartet nun auf die Freischaltung durch einen Administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Du wirst benachrichtigt, sobald dein Account freigeschaltet wurde. 
            Bitte habe etwas Geduld.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              Seite aktualisieren
            </Button>
            <Button onClick={handleSignOut} variant="ghost" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
