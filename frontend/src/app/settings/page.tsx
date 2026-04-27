"use client";

import { Github, Globe, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { TopBar } from "@/components/layout/TopBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PROJECT } from "@/lib/project";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <TopBar
        title="Settings"
        description="Theme and project preferences"
      />
      <div className="flex-1 overflow-y-auto">
        <div className="page-enter mx-auto max-w-3xl space-y-5 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                Appearance
              </CardTitle>
              <CardDescription>
                Switches between dark, light, and system-default themes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground-muted">Theme</p>
                <Select value={theme ?? "dark"} onValueChange={setTheme}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-brand" />
                Project
              </CardTitle>
              <CardDescription>
                Static project metadata sourced from{" "}
                <code className="font-mono text-xs">project.json</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <KV label="Name" value={PROJECT.name} />
              <KV label="System slug" value={PROJECT.system_slug} mono />
              <KV label="Category" value={PROJECT.category} />
              <KV label="Track" value={PROJECT.track} />
              <KV label="Stage" value={PROJECT.stage} />
              <div>
                <p className="text-2xs uppercase tracking-wider text-foreground-faint mb-2">
                  Stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT.stack.map((s) => (
                    <Badge key={s} variant="muted">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>
                External links for documentation and source.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="default">
                <a href={PROJECT.github_url} target="_blank" rel="noreferrer">
                  <Github />
                  GitHub
                </a>
              </Button>
              <Button asChild variant="outline" size="default">
                <a
                  href={`https://${PROJECT.slug}.vercel.app`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Landing page
                </a>
              </Button>
              <Button asChild variant="outline" size="default">
                <a
                  href="https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Telemetry schema
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-2xs font-medium uppercase tracking-wider text-foreground-faint">
        {label}
      </p>
      <p
        className={`text-sm font-medium text-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
