import { Flame } from "lucide-react";

export default function AuraFlame({ className = "" }: { className?: string }) {
  return <Flame className={className} aria-hidden="true" />;
}
