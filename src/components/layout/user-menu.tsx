"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  DISPATCHER: "Dispatcher",
  DRIVER: "Chauffeur",
};

interface UserMenuProps {
  name: string;
  role: string;
}

export function UserMenu({ name, role }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-sm font-medium">{name}</p>
        <Badge variant="outline" className="text-[10px]">
          {ROLE_LABEL[role] ?? role}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon"
        title="Se déconnecter"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
