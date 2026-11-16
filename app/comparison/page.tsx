import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function ComparisonPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Comparisons"
        description="Read original and improved evaluations side by side, with real score changes and remaining weaknesses."
      />
      <div className="py-10">
        <EmptyState
          title="No comparison data yet."
          description="Improve an analyzed prompt to create a before-and-after record. The radar chart will use those exact evaluations."
          href="/analyzer"
          action="Analyze a prompt"
        />
      </div>
    </PageFrame>
  );
}
