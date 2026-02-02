import { Eye, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUserEmail, stopImpersonating } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating) {
    return null;
  }

  const handleBackToAdmin = () => {
    stopImpersonating();
    navigate('/admin');
  };

  return (
    <div className="bg-warning text-warning-foreground py-2 px-4">
      <div className="container mx-auto flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">
            Du siehst die Ansicht von <strong>{impersonatedUserEmail}</strong>
          </span>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleBackToAdmin}
          className="bg-white/20 hover:bg-white/30 text-white border-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Zurück zum Admin
        </Button>
      </div>
    </div>
  );
}
