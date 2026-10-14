import { Button } from "@/shared/components/ui/button";

interface AuthSubmitButtonProps {
  isSubmitting: boolean;
  idleText: string;
  submittingText: string;
}

export function AuthSubmitButton({
  isSubmitting,
  idleText,
  submittingText,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting}
      className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-10"
    >
      {isSubmitting ? submittingText : idleText}
    </Button>
  );
}
