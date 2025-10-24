"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const onSelectChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
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
