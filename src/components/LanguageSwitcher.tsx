"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const localActive = useLocale();

  const onSelectChange = (nextLocale: string) => {
    startTransition(() => {
      router.replace(`/${nextLocale}`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelectChange("en")}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange("lv")}>
          Latviešu
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange("lt")}>
          Lietuvių
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange("et")}>
          Eesti
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
