import { Card, CardContent } from "@/components/ui/card";

interface ErrorCardProps {
  message?: string;
}

export function ErrorCard({ message = "Something went wrong. Please try again." }: ErrorCardProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-destructive">
        {message}
      </CardContent>
    </Card>
  );
}
