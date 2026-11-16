import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function SettingsPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Settings"
        description="Analysis mode, local data controls, and privacy information."
        section="System"
      />
      <div className="py-10">
        <EmptyState
          title="Configuration surface arrives with AI integration."
          description="Live and demo status, environment guidance, and local workspace controls are added with the provider milestone."
          href="/docs"
          action="Read the documentation"
        />
      </div>
    </PageFrame>
  );
}
