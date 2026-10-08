import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, Clapperboard } from "lucide-react";
import SectionHeader from "@/components/browse/SectionHeader";

/**
 * Displays main cast, guest stars, and director/creator with clickable actor pills.
 * Clicking an actor navigates to the search page filtered by that cast member.
 */
export default function CastCredits({ mainCast = [], guestStars = [], directorOrCreator }) {
  const navigate = useNavigate();

  const goToActor = (name) => navigate(`/search?cast=${encodeURIComponent(name)}`);

  const pill =
    "cursor-pointer rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary";

  const hasAny = mainCast.length > 0 || guestStars.length > 0 || directorOrCreator;
  if (!hasAny) return null;

  return (
    <>
      {mainCast.length > 0 && (
        <section>
          <SectionHeader title="Cast & Credits" />
          <div className="flex flex-wrap gap-2">
            {mainCast.map((name) => (
              <button key={name} type="button" onClick={() => goToActor(name)} className={pill}>
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      {guestStars.length > 0 && (
        <section>
          <SectionHeader title="Guest Stars" />
          <div className="flex flex-wrap gap-2">
            {guestStars.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => goToActor(name)}
                className={`${pill} border-primary/40 bg-primary/5`}
              >
                <Star className="mr-1 inline h-3 w-3 text-primary" />
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      {directorOrCreator && (
        <section>
          <SectionHeader title="Director / Creator" />
          <p className="flex items-center gap-2 text-sm text-foreground/80">
            <Clapperboard className="h-4 w-4 text-muted-foreground" />
            {directorOrCreator}
          </p>
        </section>
      )}
    </>
  );
}