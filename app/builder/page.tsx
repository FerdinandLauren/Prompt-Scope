import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function BuilderPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Prompt Builder"
        description="Define a direction, tune the eight focus parameters, and generate a structured prompt."
      />
      <div className="py-10">
        <EmptyState
          title="Builder configuration arrives next."
          description="The foundation is in place. The configuration studio, sliders, presets, and prompt preview are implemented in the next milestone."
          href="/"
          action="Return to dashboard"
        />
      </div>
    </PageFrame>
  );
}
