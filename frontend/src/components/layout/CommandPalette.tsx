"use client";

import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  Activity,
  ExternalLink,
  Github,
  LayoutDashboard,
  ListChecks,
  Map,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useHotkey } from "@/lib/hooks";
import { PROJECT } from "@/lib/project";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("CommandPalette context not mounted");
  return ctx;
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  useHotkey("k", (e) => {
    e.preventDefault();
    setOpen((o) => !o);
  }, { meta: true });

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[20%] z-50 w-full max-w-xl translate-x-[-50%]",
              "border border-border-strong bg-surface-2 rounded-lg shadow-popover overflow-hidden",
              "data-[state=open]:animate-scale-in",
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              Command Palette
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Type a command or search.
            </DialogPrimitive.Description>
            <Command label="Command Menu" loop>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
                <Sparkles className="h-3.5 w-3.5 text-foreground-faint shrink-0" />
                <Command.Input
                  placeholder="Search or jump to…"
                  className="flex-1 h-7 bg-transparent text-sm text-foreground placeholder:text-foreground-faint outline-none"
                />
                <kbd className="kbd">esc</kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-1.5">
                <Command.Empty>No results.</Command.Empty>

                <Command.Group heading="Navigate">
                  <Command.Item onSelect={() => navigate("/")}>
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Overview
                    <kbd className="kbd ml-auto">G O</kbd>
                  </Command.Item>
                  <Command.Item onSelect={() => navigate("/telemetry")}>
                    <Activity className="h-3.5 w-3.5" />
                    Telemetry
                    <kbd className="kbd ml-auto">G T</kbd>
                  </Command.Item>
                  <Command.Item onSelect={() => navigate("/capabilities")}>
                    <ListChecks className="h-3.5 w-3.5" />
                    Capabilities
                    <kbd className="kbd ml-auto">G C</kbd>
                  </Command.Item>
                  <Command.Item onSelect={() => navigate("/roadmap")}>
                    <Map className="h-3.5 w-3.5" />
                    Roadmap
                    <kbd className="kbd ml-auto">G R</kbd>
                  </Command.Item>
                  <Command.Item onSelect={() => navigate("/settings")}>
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="External">
                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      window.open(PROJECT.github_url, "_blank");
                    }}
                  >
                    <Github className="h-3.5 w-3.5" />
                    GitHub repo
                    <ExternalLink className="ml-auto h-3 w-3" />
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      window.open(
                        `https://${PROJECT.slug}.vercel.app`,
                        "_blank",
                      );
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Landing page
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Theme">
                  <Command.Item
                    onSelect={() => {
                      setTheme(resolvedTheme === "dark" ? "light" : "dark");
                      setOpen(false);
                    }}
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="h-3.5 w-3.5" />
                    ) : (
                      <Moon className="h-3.5 w-3.5" />
                    )}
                    Toggle theme
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </CommandPaletteContext.Provider>
  );
}

export function useGoToShortcuts() {
  const router = useRouter();
  useEffect(() => {
    let waitingForSecond = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reset = () => {
      waitingForSecond = false;
      if (timer) clearTimeout(timer);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (!waitingForSecond) {
        if (e.key === "g" || e.key === "G") {
          waitingForSecond = true;
          timer = setTimeout(reset, 1500);
        }
        return;
      }
      const dest: Record<string, string> = {
        o: "/",
        t: "/telemetry",
        c: "/capabilities",
        r: "/roadmap",
      };
      const path = dest[e.key.toLowerCase()];
      if (path) {
        e.preventDefault();
        router.push(path);
      }
      reset();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, [router]);
}
