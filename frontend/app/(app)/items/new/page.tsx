import { PageShell } from "@/components/layout/page-shell";
import { ItemForm } from "@/components/items/item-form";

export default function NewItemPage() {
  return (
    <PageShell width="md" className="pb-28 md:pb-14">
      <ItemForm />
    </PageShell>
  );
}
