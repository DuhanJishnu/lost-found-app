import { PageShell } from "@/components/layout/page-shell";
import { ItemForm } from "@/components/items/item-form";

export default function NewItemPage() {
  return (
    <PageShell width="sm">
      <ItemForm />
    </PageShell>
  );
}
