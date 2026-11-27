import { requireApprovedSeller } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { Flash, PageTitle } from "@/components/ui";
import { ProductForm } from "@/components/seller/product-form";

export const metadata = { title: "Add product" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  await requireApprovedSeller();
  const cats = await q<{ id: string; name: string }>("select id, name from categories where active order by sort_order");
  return (<><PageTitle title="Add a product" /><Flash {...sp} /><ProductForm cats={cats} /></>);
}
