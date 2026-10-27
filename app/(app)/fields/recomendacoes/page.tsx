import { redirect } from "next/navigation";
import { getUser } from "@/lib/getUser";
import { canAccess } from "@/lib/canAccess";
import AssistenteAtendimentos from "@/components/fields/AssistenteAtendimentos";
export const dynamic = "force-dynamic";
export default async function RecomendacoesFieldsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role as Parameters<typeof canAccess>[0], "fields.recomendacoes.view")) redirect("/fields");
  return <AssistenteAtendimentos chaveUsuario={user.id} />;
}
