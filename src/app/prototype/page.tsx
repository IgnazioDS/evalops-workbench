import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { PROTOTYPE_CASES, PROTOTYPE_COMMANDS, PROTOTYPE_METRICS, PROTOTYPE_REPORT } from "@/lib/prototype";

export const metadata = { title: "Prototype Run" };

export default function PrototypePage() {
  return (
    <>
      <TopBar
        title="Prototype Run"
        description="A concrete baseline vs candidate evaluation story using the bundled support QA dataset."
        actions={
          <Button asChild size="sm" variant="outline">
            <a href="https://github.com/IgnazioDS/evalops-workbench/tree/main/examples" target="_blank" rel="noreferrer">
              Open examples
              <ArrowRight />
            </a>
          </Button>
        }
      />
      <div className="dot-grid grid-fade flex-1 overflow-y-auto">
        <div className="page-enter mx-auto max-w-6xl space-y-5 p-6">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.4fr,0.9fr]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="brand">Prototype</Badge>
                  <Badge variant="success">Gate pass</Badge>
                  <Badge variant="outline">Support QA dataset</Badge>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    This repo now demonstrates a real eval loop, not just a product thesis.
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">
                    The example path starts with a weak baseline variant, upgrades to a better candidate,
                    then proves the change with a score delta, a pass-rate improvement, and case-level traceability.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 rounded-xl border border-border-subtle bg-surface-2 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Release gate verdict
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {PROTOTYPE_METRICS.map((metric) => (
                    <div key={metric.label} className="rounded-lg border border-border bg-surface p-3">
                      <p className="text-2xs uppercase tracking-wider text-foreground-faint">{metric.label}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{metric.candidate}</p>
                      <p className="text-xs text-success">{metric.delta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  Case-by-case deltas
                </CardTitle>
                <CardDescription>
                  Each case records exactly what the candidate restored or clarified.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PROTOTYPE_CASES.map((item) => (
                  <div key={item.caseId} className="rounded-lg border border-border-subtle bg-surface-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.caseId}</p>
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge variant={item.outcome === "improvement" ? "success" : "warning"}>
                        {item.delta >= 0 ? `+${item.delta.toFixed(3)}` : item.delta.toFixed(3)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <MetricBox label="Baseline" value={item.baselineScore.toFixed(3)} tone="muted" />
                      <MetricBox label="Candidate" value={item.candidateScore.toFixed(3)} tone="success" />
                      <MetricBox label="Recovered detail" value={item.candidateMissing.length === 0 ? "complete" : "partial"} tone="brand" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground-muted">{item.note}</p>
                    {item.baselineMissing.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.baselineMissing.map((keyword) => (
                          <Badge key={keyword} variant="warning">
                            baseline missed: {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TerminalSquare className="h-3.5 w-3.5 text-brand" />
                    CLI flow
                  </CardTitle>
                  <CardDescription>The bundled dataset is enough to run the full loop locally.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CodeBlock language="bash">{PROTOTYPE_COMMANDS.baseline}</CodeBlock>
                  <CodeBlock language="bash">{PROTOTYPE_COMMANDS.candidate}</CodeBlock>
                  <CodeBlock language="bash">{PROTOTYPE_COMMANDS.compare}</CodeBlock>
                  <CodeBlock language="bash">{PROTOTYPE_COMMANDS.gate}</CodeBlock>
                  <CodeBlock language="bash">{PROTOTYPE_COMMANDS.inspect}</CodeBlock>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Saved report
                  </CardTitle>
                  <CardDescription>
                    `compare --report` and `gate --report` can emit a shareable artifact for review threads or CI logs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock language="md">{PROTOTYPE_REPORT}</CodeBlock>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "success" | "brand";
}) {
  const toneClass =
    tone === "success"
      ? "text-success border-success/20 bg-success/5"
      : tone === "brand"
        ? "text-brand border-brand/20 bg-brand/5"
        : "text-foreground-muted border-border bg-surface";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-2xs uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
