import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Clock, Activity, Calendar, CheckCircle, XCircle, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  recordings_count: number;
  total_duration: number;
  total_words: number;
  last_activity: string | null;
  google_connected: boolean;
  microsoft_connected: boolean;
  online_status: 'online' | 'recording' | 'offline';
  is_approved: boolean;
  is_admin: boolean;
}

interface Summary {
  total_users: number;
  active_users: number;
  total_recordings: number;
  total_minutes: number;
  online_now: number;
  recording_now: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate('/auth');
        return;
      }

      const response = await supabase.functions.invoke('admin-dashboard', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch admin data');
      }

      setUsers(response.data.users || []);
      setSummary(response.data.summary || null);
    } catch (err: any) {
      console.error('Admin dashboard error:', err);
      toast({
        title: 'Fehler',
        description: err.message || 'Daten konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate, toast]);

  const handleApprove = async (userId: string, action: 'approve' | 'revoke') => {
    setActionLoading(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const response = await supabase.functions.invoke('admin-approve-user', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: { user_id: userId, action },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: action === 'approve' ? 'Benutzer freigeschaltet' : 'Freischaltung aufgehoben',
        description: action === 'approve' 
          ? 'Der Benutzer kann jetzt den Notetaker nutzen.' 
          : 'Der Benutzer kann den Notetaker nicht mehr nutzen.',
      });

      // Refresh data
      await fetchData();
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message || 'Aktion fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const response = await supabase.functions.invoke('admin-delete-user', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: { user_id: userId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: 'Benutzer gelöscht',
        description: 'Der Benutzer und alle zugehörigen Daten wurden gelöscht.',
      });

      // Refresh data
      await fetchData();
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message || 'Löschen fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '–';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    return num.toLocaleString('de-DE');
  };

  const getStatusBadge = (user: UserData) => {
    if (user.is_admin) {
      return <Badge className="bg-purple-500 hover:bg-purple-600"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    if (user.is_approved) {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Freigeschaltet</Badge>;
    }
    return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Wartet</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Benutzerübersicht und Statistiken</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gesamt Benutzer
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{summary?.total_users || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktive Benutzer (7 Tage)
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{summary?.active_users || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gesamt Aufnahmen
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{summary?.total_recordings || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Verbrauchte Stunden
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">
                  {((summary?.total_minutes || 0) / 60).toFixed(1)}h
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Alle Benutzer</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registriert</TableHead>
                      <TableHead className="text-right">Aufnahmen</TableHead>
                      <TableHead className="text-right">Dauer</TableHead>
                      <TableHead>Kalender</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.email}
                            {user.online_status === 'online' && (
                              <span 
                                className="inline-block w-2 h-2 rounded-full bg-green-500" 
                                title="Online"
                              />
                            )}
                            {user.online_status === 'recording' && (
                              <span 
                                className="inline-block w-2 h-2 rounded-full bg-orange-500" 
                                title="Bot aktiv"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">{user.recordings_count}</TableCell>
                        <TableCell className="text-right">{formatDuration(user.total_duration)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.google_connected && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                Google
                              </Badge>
                            )}
                            {user.microsoft_connected && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                Microsoft
                              </Badge>
                            )}
                            {!user.google_connected && !user.microsoft_connected && (
                              <span className="text-muted-foreground text-sm">–</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!user.is_admin && (
                              <>
                                {user.is_approved ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(user.id, 'revoke')}
                                    disabled={actionLoading === user.id}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Sperren
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApprove(user.id, 'approve')}
                                    disabled={actionLoading === user.id}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Freischalten
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={actionLoading === user.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Benutzer löschen?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Möchtest du den Benutzer <strong>{user.email}</strong> wirklich löschen? 
                                        Alle Aufnahmen, Transkripte und Daten werden unwiderruflich gelöscht.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Endgültig löschen
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Keine Benutzer gefunden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
