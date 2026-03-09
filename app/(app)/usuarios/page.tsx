import Card from "@/components/ui/Card"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import {
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  updateEmail
} from "./actions"
import { requireRole } from "@/lib/requireRole"
import { createServerSupabase } from "@/lib/supabase-server"

export default async function Usuarios() {

  await requireRole(["admin"])

  const supabase = await createServerSupabase()

  const { data: users } = await supabase
    .from("usuarios")
    .select("id, nome, email, role")
    .order("created_at", { ascending:false })

  return (
    <div className="space-y-8">

      <h1 className="text-3xl font-bold text-white">
        Gestão de Usuários
      </h1>

      <div className="grid grid-cols-2 gap-8">

        {/* ================= FORM CREATE ================= */}
        <Card>
          <form action={createUser} className="space-y-4">

            <Input name="nome" placeholder="Nome completo" required />

            <Input
              name="email"
              type="email"
              placeholder="Email institucional"
              required
            />

            <Input
              name="senha"
              type="password"
              placeholder="Senha provisória"
              required
            />

            <select
              name="role"
              required
              defaultValue=""
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white"
            >
              <option value="" disabled>
                Selecione uma role de perfil
              </option>

              <option value="analista">Analista</option>
              <option value="chefia_ure">Chefia URE</option>
              <option value="dirigente">Dirigente</option>
              <option value="seintec">SEINTEC</option>
              <option value="gestao_escolas">Gestão Escolas</option>
              <option value="admin">Admin</option>
            </select>

            <Button>
              Criar Usuário
            </Button>

          </form>
        </Card>

        {/* ================= LISTA ================= */}
        <Card>

          <h2 className="text-xl font-semibold mb-4">
            Usuários cadastrados
          </h2>

          <div className="space-y-4 max-h-[500px] overflow-auto">

            {users?.map(user => (

              <div
                key={user.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
              >

                {/* EDITAR PERFIL */}
                <form action={updateUser} className="flex gap-2 items-center">
                  <input type="hidden" name="id" value={user.id} />

                  <input
                    name="nome"
                    defaultValue={user.nome ?? ""}
                    className="bg-slate-800 rounded-lg px-3 py-1 text-sm text-white"
                  />

                  <select
                    name="role"
                    defaultValue={user.role}
                    className="bg-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="analista">Analista</option>
                    <option value="chefia_ure">Chefia URE</option>
                    <option value="dirigente">Dirigente</option>
                    <option value="seintec">SEINTEC</option>
                    <option value="gestao_escolas">Gestão Escolas</option>
                    <option value="admin">Admin</option>
                  </select>

                  <Button>
                    Salvar
                  </Button>
                </form>

                {/* ALTERAR EMAIL */}
                <form action={updateEmail} className="flex gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <input
                    name="email"
                    defaultValue={user.email}
                    className="bg-slate-800 rounded-lg px-3 py-1 text-sm text-white"
                  />
                  <Button>
                    Alterar Email
                  </Button>
                </form>

                {/* RESET SENHA */}
                <form action={resetPassword} className="flex gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <input
                    name="novaSenha"
                    type="password"
                    placeholder="Nova senha"
                    className="bg-slate-800 rounded-lg px-3 py-1 text-sm text-white"
                  />
                  <Button>
                    Redefinir Senha
                  </Button>
                </form>

                {/* EXCLUIR */}
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={user.id} />
                  <button
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Excluir usuário
                  </button>
                </form>

              </div>

            ))}

          </div>

        </Card>

      </div>
    </div>
  )
}