import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Resolves an avatar reference to a displayable URL.
 * External http(s) links are used as-is; anything else is treated as a
 * path inside the private `avatars` storage bucket and signed on demand.
 */
export function useAvatarUrl(ref: string | null | undefined) {
  const isRemote = !!ref && /^https?:\/\//.test(ref);
  const { data } = useQuery({
    queryKey: ["avatar-signed", ref],
    enabled: !!ref && !isRemote,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(ref!, 60 * 60);
      if (error) return null;
      return data.signedUrl;
    },
  });
  return isRemote ? ref! : (data ?? null);
}

export default function UserAvatar({
  src,
  name,
  className,
  alt = "",
}: {
  src: string | null | undefined;
  name?: string | null;
  className?: string;
  alt?: string;
}) {
  const url = useAvatarUrl(src);
  const initial = (name || "?").trim()[0]?.toUpperCase() ?? "?";

  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={cn(
          "shrink-0 rounded-full border border-border object-cover transition-transform duration-200 hover:scale-105",
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-border bg-muted font-bold text-muted-foreground",
        className,
      )}
    >
      {initial}
    </div>
  );
}
