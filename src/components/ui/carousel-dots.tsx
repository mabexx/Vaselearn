"use client";

import * as React from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CarouselDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  api: CarouselApi | undefined;
}

export function CarouselDots({
  api,
  className,
  ...props
}: CarouselDotsProps) {
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  React.useEffect(() => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
    onSelect(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  if (!api) return null;

  return (
    <div
      className={cn(
        "flex justify-center items-center gap-2 mt-4",
        className
      )}
      {...props}
    >
      {scrollSnaps.map((_, index) => (
        <Button
          key={index}
          variant="ghost"
          size="icon"
          className={cn("h-2 w-2 rounded-full p-0", {
            "bg-primary": selectedIndex === index,
            "bg-muted-foreground/30": selectedIndex !== index,
          })}
          onClick={() => api.scrollTo(index)}
        />
      ))}
    </div>
  );
}
