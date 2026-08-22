import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useAuthUser, useMyProfile } from "@/hooks/useAuth";
import { CareerIdentitySelector } from "@/components/Phase1IdentityComponents";
import { useUserIdentity, useUpdateIdentity } from "@/lib/phase1-identity";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/pending")({
  head: () => ({ meta: [{ title: "Access pending" }] }),
  component: Pending,
});

function Pending() {
  const { user } = useAuthUser();
  const { data: profile } = useMyProfile(user?.id);
  const { data: identity } = useUserIdentity(user?.id);
  const updateIdentity = useUpdateIdentity(user?.id);
  const [step, setStep] = useState<"welcome" | "identity">(identity?.career_identity ? "welcome" : "identity");

  const handleIdentitySelect = (identity: string) => {
    updateIdentity.mutate(identity as any, {
      onSuccess: () => {
        setStep("welcome");
      },
    });
  };

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-2xl items-center justify-center overflow-hidden px-4">
      {step === "identity" && !identity?.career_identity ? (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Welcome! 🎉</h1>
            <p className="text-muted-foreground">
              Before we put your application in for review, tell us a bit about yourself.
            </p>
          </div>
          <CareerIdentitySelector 
            onSelect={(id) => handleIdentitySelect(id)}
            mode="signup"
          />
        </div>
      ) : (
        <div className="text-center">
          <div className="mx-auto size-16 rounded-2xl bg-accent grid place-items-center text-accent-foreground mb-6">
            <Clock className="size-8" />
          </div>
          <h1 className="text-3xl font-bold mb-3">You're on the waitlist</h1>
          <p className="text-muted-foreground mb-2">
            Thanks for signing in, {profile?.display_name || profile?.email}! Your request has been sent to the admin
            (<span className="font-medium">shahi.pushkar2008@gmail.com</span>).
          </p>
          {identity?.career_identity && (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded-lg p-3 mb-4">
              📚 We're excited you're becoming a <strong>{identity.career_identity}</strong>! We'll match you with relevant learning paths once approved.
            </p>
          )}
          <p className="text-xs text-muted-foreground">This page will unlock automatically the moment you're approved.</p>
          <button
            onClick={() => setStep("identity")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Change your identity?
          </button>
        </div>
      )}
    </div>
  );
}
