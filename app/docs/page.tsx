import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function DocsPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Documentation"
        description="How the studio measures prompts, what the scores mean, and how the modes differ."
        section="System"
      />
      <div className="py-10">
        <EmptyState
          title="Documentation is being assembled."
          description="The scoring rubric, workflow reference, Demo Mode explanation, and privacy notes will be published here."
          href="/"
          action="Return to dashboard"
        />
      </div>
    </PageFrame>
  );
}
