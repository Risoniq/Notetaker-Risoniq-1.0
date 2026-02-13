import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface SessionTimeoutWarningProps {
  open: boolean;
  remainingSeconds: number;
  onExtend: () => void;
}

export function SessionTimeoutWarning({ open, remainingSeconds, onExtend }: SessionTimeoutWarningProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-destructive" />
            Sitzung läuft ab
          </AlertDialogTitle>
          <AlertDialogDescription>
            Ihre Sitzung wird in{" "}
            <span className="font-semibold text-foreground">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>{" "}
            Minuten aus Sicherheitsgründen automatisch beendet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onExtend}>
            Sitzung verlängern
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
