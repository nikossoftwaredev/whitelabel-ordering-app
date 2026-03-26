import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type AddButtonProps = React.ComponentProps<typeof Button>;

export function AddButton({ children, ...props }: AddButtonProps) {
  return (
    <Button icon={<Plus />} {...props}>
      {children}
    </Button>
  );
}
