import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AnalyzerPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Prompt Analyzer"
        description="Score a prompt across eight dimensions and see exactly which instructions need attention."
      />
      <div className="py-10">
        <EmptyState
          title="The diagnostic workspace opens next."
          description="Prompt input, the evaluation engine, dimension scores, weaknesses, and recommendations are implemented in the analyzer milestone."
          href="/"
          action="Return to dashboard"
        />
      </div>
    </PageFrame>
  );
}
