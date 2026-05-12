'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function getLoginErrorMessage(err: unknown) {
    const message =
      err instanceof Error
        ? err.message.toLowerCase()
        : String(err || '').toLowerCase()

    if (
      message.includes('failed to fetch') ||
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('certificate') ||
      message.includes('cert') ||
      message.includes('err_cert_authority_invalid') ||
      message.includes('err_connection') ||
      message.includes('err_name') ||
      message.includes('timeout') ||
      message.includes('cors')
    ) {
      return 'Falha de conexão segura com o serviço de autenticação. A rede atual pode estar bloqueando ou interceptando o acesso ao Supabase.'
    }

    return 'Email ou senha inválidos'
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Erro retornado pelo Supabase Auth:', error)

        setError(getLoginErrorMessage(error))
        return
      }

      if (!data.session || !data.user) {
        setError('Não foi possível iniciar a sessão. Tente novamente.')
        return
      }

      window.location.href = '/'
    } catch (err) {
      console.error('Erro inesperado ao realizar login:', err)

      setError(getLoginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950">

      <form
        onSubmit={handleLogin}
        className="w-[380px] bg-white rounded-3xl p-8 shadow-2xl space-y-5"
      >

        {/* LOGO MODERNIZADO (IGUAL À SIDEBAR) */}
        <div className="text-center space-y-4 mb-6">
          <div className="flex justify-center items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/20">
              <span className="text-white font-black text-xl tracking-tight">SH</span>
            </div>
            <div className="flex flex-col leading-tight mt-1 text-left">
              <div className="text-3xl font-black tracking-tight flex items-baseline">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700">SETEC</span>
                <span className="text-slate-700 ml-1 font-light">Hub</span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-0.5">URE Guarulhos Sul</span>
            </div>
          </div>
        </div>

        {/* EMAIL */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">
            Email institucional
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@educacao.sp.gov.br"
            required
            className="
              w-full
              border border-slate-300
              rounded-xl
              px-4 py-2.5
              text-slate-900
              placeholder:text-slate-400
              focus:outline-none
              focus:ring-2
              focus:ring-blue-600
            "
          />
        </div>

        {/* SENHA */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">
            Senha
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            required
            className="
              w-full
              border border-slate-300
              rounded-xl
              px-4 py-2.5
              text-slate-900
              placeholder:text-slate-400
              focus:outline-none
              focus:ring-2
              focus:ring-blue-600
            "
          />
        </div>

        {/* ERRO */}
        {error && (
          <div className="
            bg-red-50
            border border-red-200
            text-red-600
            text-sm
            rounded-lg
            py-2
            px-3
            text-center
          ">
            {error}
          </div>
        )}

        {/* BOTÃO */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            bg-blue-600
            hover:bg-blue-700
            text-white
            py-2.5
            rounded-xl
            font-semibold
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {/* SUPORTE */}
        <div className="text-center text-xs text-slate-500 pt-2">
          Suporte técnico da plataforma:<br/>
          <span className="text-slate-700 font-medium">
            gsu.setec@educacao.sp.gov.br
          </span>
        </div>

      </form>

    </div>
  )
}