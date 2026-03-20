"use client"

import { useState, useEffect, useMemo } from "react"
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
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

function RoleBadgeDisplay({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-400 border-red-500/20",
    chefia_ure: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dirigente: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    seintec: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gestao_escolas: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    analista: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  }

  const safeRole = role || "desconhecido"
  const label = safeRole.replace("_", " ").toUpperCase()
  const style = colors[safeRole] || "bg-slate-800 text-slate-400 border-slate-700"

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold tracking-widest rounded border ${style}`}>
      {label}
    </span>
  )
}

export default function UsuariosClient() {
  const [users, setUsers] = useState<any[]>([])
  const [busca, setBusca] = useState("")

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nome, email, role, setor")
        .order("created_at", { ascending: false })
      setUsers(data || [])
    }
    fetchUsers()
  }, [])

  const usuariosFiltrados = useMemo(() => {
    if (!busca) return users
    const termo = busca.toLowerCase()
    return users.filter((u) => 
      (u.nome || "").toLowerCase().includes(termo) ||
      (u.email || "").toLowerCase().includes(termo) ||
      (u.setor || "").toLowerCase().includes(termo) ||
      (u.role || "").toLowerCase().includes(termo)
    )
  }, [busca, users])

  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    const confirmacao = window.confirm("🚨 ATENÇÃO!\n\nTem certeza absoluta que deseja EXCLUIR este usuário? Essa ação não pode ser desfeita e ele perderá acesso imediatamente.")
    if (!confirmacao) {
      e.preventDefault() 
    }
  }

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-12">

      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Gestão de Usuários</h1>
        <p className="text-slate-400 text-sm">Administre acessos, permissões e setores da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* ================= FORM CREATE (LADO ESQUERDO) ================= */}
        <div className="xl:col-span-4 sticky top-6">
          <Card>
            <div className="mb-6 border-b border-slate-800/50 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">➕</span>
                Novo Usuário
              </h2>
              <p className="text-xs text-slate-500 mt-1">Preencha os dados para convidar um membro.</p>
            </div>

            <form action={createUser} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Nome Completo</label>
                <Input name="nome" placeholder="Ex: João da Silva" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">E-mail Institucional</label>
                <Input name="email" type="email" placeholder="nome@educacao.sp.gov.br" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Senha</label>
                <Input name="senha" type="password" placeholder="Mínimo 6 caracteres" required />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Nível de Acesso (Role)</label>
                  <select name="role" required defaultValue="" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:border-cyan-500 transition-colors">
                    <option value="" disabled>Selecione um perfil...</option>
                    <option value="analista">Analista</option>
                    <option value="chefia_ure">Chefia URE</option>
                    <option value="dirigente">Dirigente</option>
                    <option value="seintec">SEINTEC</option>
                    <option value="gestao_escolas">Gestão Escolas</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Setor / Escola</label>
                  <select name="setor" required defaultValue="" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:border-cyan-500 transition-colors">
                    <option value="" disabled>Selecione o local...</option>
                    {setores.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3">
                  Cadastrar Usuário
                </Button>
              </div>

            </form>
          </Card>
        </div>

        {/* ================= LISTA DE USUÁRIOS (LADO DIREITO) ================= */}
        <div className="xl:col-span-8 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-center justify-between bg-[#020617] p-4 rounded-2xl border border-slate-800 shadow-sm gap-4">
            <h2 className="text-lg font-bold text-white shrink-0">Equipe Cadastrada</h2>
            
            <div className="relative w-full sm:max-w-xs">
              <input 
                type="text" 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, email ou escola..."
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2 pl-10 rounded-xl outline-none text-sm focus:border-cyan-500 transition-colors"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              </div>
            </div>

            <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-700 shrink-0">
              {usuariosFiltrados.length} contas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {usuariosFiltrados.map(user => (

              <div key={user.id} className="group p-5 rounded-2xl bg-[#020617] border border-slate-800 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
                
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-white border border-slate-600 shrink-0">
                    {user.nome ? user.nome.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate leading-tight" title={user.nome || "Sem nome"}>
                      {user.nome || "Usuário sem nome"}
                    </h3>
                    <p className="text-xs text-slate-400 truncate" title={user.email}>{user.email}</p>
                  </div>
                </div>

                <form action={updateUser} className="space-y-3 mb-5 border-t border-slate-800/50 pt-4">
                  <input type="hidden" name="id" value={user.id} />
                  
                  <div className="space-y-2">
                    <input
                      name="nome"
                      defaultValue={user.nome || ""}
                      placeholder="Nome do usuário"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                    />
                    
                    {/* 👇 AQUI ACONTECE A MÁGICA DE LAYOUT 👇 */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select name="role" defaultValue={user.role || ""} className="w-full sm:w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none focus:border-cyan-500">
                        <option value="" disabled>Selecione</option>
                        <option value="analista">Analista</option>
                        <option value="chefia_ure">Chefia URE</option>
                        <option value="dirigente">Dirigente</option>
                        <option value="seintec">SEINTEC</option>
                        <option value="gestao_escolas">Gestão Escolas</option>
                        <option value="admin">Admin</option>
                      </select>

                      <select name="setor" defaultValue={user.setor || ""} className="w-full sm:w-2/3 min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none focus:border-cyan-500 truncate">
                        <option value="" disabled>Selecione o local</option>
                        {setores.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <RoleBadgeDisplay role={user.role} />
                    <Button className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white font-semibold shadow-none">Salvar Dados</Button>
                  </div>
                </form>

                <div className="bg-slate-900/50 -mx-5 -mb-5 p-4 border-t border-slate-800/50 mt-auto space-y-3">
                  
                  <details className="group/danger">
                    <summary className="text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-slate-300 cursor-pointer flex items-center gap-2 outline-none list-none">
                      <svg className="w-3 h-3 group-open/danger:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      Opções Avançadas
                    </summary>
                    
                    <div className="pt-3 space-y-3">
                      <form action={updateEmail} className="flex gap-2">
                        <input type="hidden" name="id" value={user.id} />
                        <input name="email" defaultValue={user.email} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500" />
                        <Button className="px-2 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 shadow-none">Alterar</Button>
                      </form>

                      <form action={resetPassword} className="flex gap-2">
                        <input type="hidden" name="id" value={user.id} />
                        <input name="novaSenha" type="password" placeholder="Nova senha" className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500" />
                        <Button className="px-2 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 shadow-none">Redefinir</Button>
                      </form>

                      <form action={deleteUser} className="pt-1" onSubmit={handleDelete}>
                        <input type="hidden" name="id" value={user.id} />
                        <button type="submit" className="w-full py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500/70 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors">
                          Remover Usuário
                        </button>
                      </form>
                    </div>
                  </details>

                </div>

              </div>
            ))}
            
            {usuariosFiltrados.length === 0 && (
              <div className="md:col-span-2 p-10 text-center text-slate-500 italic bg-[#020617] rounded-2xl border border-slate-800">
                Nenhum usuário encontrado com "{busca}".
              </div>
            )}
            
          </div>

        </div>
      </div>
    </div>
  )
}