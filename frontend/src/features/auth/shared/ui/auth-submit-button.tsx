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
      size="lg"
      className="h-14 w-full text-base lg:h-[54px] lg:text-[15px]"
    >
      {isSubmitting ? submittingText : idleText}
    </Button>
  );
}
