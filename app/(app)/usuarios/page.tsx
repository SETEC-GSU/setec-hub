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

const setores = [
"URE GUARULHOS SUL",
"AGOSTINHO CANO",
"ALAYDE MARIA VICENTE PROFA",
"ALBERTO BACAN PROF - PEI",
"ALBERTO MENDES JR CAP PM - PEI",
"ALEXANDRE LOPES OLIVEIRA - PEI",
"ALICE CHUERY PROFA - PEI",
"ANNA LAMBERGA ZEGLIO",
"ANTONIO DE RE VEREADOR",
"ANTONIO PRATICI PREFEITO",
"ANTONIO VIANA DE SOUZA PROF",
"ARY GOMES CEL - PEI",
"AUGUST JOHANNES FERDINANDUS STAUDER, PADRE - PEI",
"BARTHOLOMEU DE CARLOS - PEI",
"BRUNO RICCO PADRE - PEI",
"CACILDA CACAPAVA DE OLIVEIRA PROFA",
"CAPISTRANO DE ABREU",
"CARLOS MACHADO BITENCOURT MAL - PEI",
"CID AUGUSTO GUELLI PROF",
"CIDADE SOIMCO II - PEI",
"CLARICE LISPECTOR",
"CONJUNTO HAB. BAIRRO DOS PIMENTAS II - PEI",
"CONSELHEIRO CRISPINIANO - PEI",
"EMILIA ANNA ANTONIO PROFA",
"ENNIO CHIESA PROF - PEI",
"ERICO VERISSIMO - PEI",
"FABIO FANUCCHI PROF - PEI",
"FRANCISCA BATISTA TRINDADE PROFA",
"FREDERICO DE BARROS BROTERO PROF",
"GUILHERMINO RODRIGUES DE LIMA - PEI",
"HOMERO RUBENS DE SA PROF - PEI",
"HUGO DE AGUIAR",
"INOCOOP II - PEI",
"IZABEL FERREIRA DOS SANTOS PROFA - PEI",
"JAIR MIRANDA DR",
"JARDIM ARUJÁ - PEI",
"JD MARIA DIRCE III",
"JD NOVA CUMBICA II - PEI",
"JOAO ALVARES DE SIQUEIRA BUENO",
"JOAO CAVALHEIRO SALEM PROF",
"JOAO CRISPINIANO SOARES",
"JOAO DE ALMEIDA BARBOSA",
"JOAO NUNES PASTOR",
"JOAO RIBEIRO DE BARROS COMANDANTE",
"JOCILA PEREIRA GUIMARAES PROFA - PEI",
"JOSE ALVES DE CERQUEIRA CESAR - PEI",
"JOSE DA COSTA BOUCINHAS PROF - PEI",
"JOSE ROBERTO FRIEBOLIN PROF - PEI",
"JOSE SCARAMELLI PROF - PEI",
"LAR IRMA CELESTE",
"LAURA DA PURIFICACAO C.MENDES PROFA - PEI",
"LEVI VIEIRA DA MAIA, PROF - PEI",
"LICINIO CARPINELLI PROF",
"LINDAMIL BARBOSA DE OLIVEIRA PROFA",
"LOUIS BRAILLE - PEI",
"MARIA APARECIDA FELIX PORTO PROFA",
"MARIA APARECIDA RODRIGUES PROFA",
"MARIA HILDA ORNELAS DE OLIVEIRA PROFA - PEI",
"MARIA LEDA FERNANDES BRIGO PROFA",
"MARINHA FERR. DO NASCIMENTO PROFA",
"MARIO NAKATA PROF",
"MAURICIO GOULART DEPUTADO - PEI",
"ORLANDO MINELLA - PEI",
"OSWALDO SAMPAIO ALVES - PEI",
"PARQUE JUREMA III",
"PARQUE JUREMA IV - PEI",
"PASCOAL MAIMONI FILHO PROF - PEI",
"PAULO NOGUEIRA PROF - PEI",
"PAULO ROLIM LOUREIRO DOM - PEI",
"PEDRO MORCELI",
"PIMENTAS VII - PEI",
"RAFAEL RODRIGUES FILHO,PREF",
"REPUBLICA DA VENEZUELA",
"REPÚBLICA DA VENEZUELA II - PEI",
"ROBERTO HIPOLITO DA COSTA BRIG.AR - PEI",
"ROTARY",
"SEBASTIAO WALTER FUSCO",
"THEREZINHA CLOSA ELEUTERIO PROFA - PEI",
"VALENTIN GONZALEZ ALONSO PADRE - PEI",
"VICENTE MELRO - PEI",
"VICTOR CIVITA - PEI",
"WALDEMAR FREIRE VERAS VEREADOR",
"ZILDA ROMEIRO PINTO MOREIRA DA SILVA, PROFA"
]

export default async function Usuarios() {

  await requireRole(["admin"])

  const supabase = await createServerSupabase()

  const { data: users } = await supabase
    .from("usuarios")
    .select("id, nome, email, role, setor")
    .order("created_at", { ascending:false })

  return (
    <div className="space-y-8">

      <h1 className="text-3xl font-bold text-white">
        Gestão de Usuários
      </h1>

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

          {/* NOVO CAMPO SETOR */}
          <select
            name="setor"
            required
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white"
          >
            <option value="">
              Selecionar escola / setor
            </option>

            {setores.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}

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

        <div className="space-y-4">

          {users?.map(user => (

            <div
              key={user.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
            >

              <form action={updateUser} className="flex gap-2 items-center flex-wrap">

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

                {/* NOVO SETOR */}
                <select
                  name="setor"
                  defaultValue={user.setor ?? ""}
                  className="bg-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                >
                  {setores.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <Button>
                  Salvar
                </Button>

              </form>

              {/* EMAIL */}
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

              {/* SENHA */}
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

              {/* DELETE */}
              <form action={deleteUser}>
                <input type="hidden" name="id" value={user.id} />
                <button className="text-xs text-red-400 hover:text-red-300">
                  Excluir usuário
                </button>
              </form>

            </div>

          ))}

        </div>

      </Card>

    </div>
  )
}