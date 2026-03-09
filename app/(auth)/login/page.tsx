'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError('Email ou senha inválidos')
      return
    }

    /**
     * 🔥 ESSENCIAL PARA SSR + MIDDLEWARE
     * NÃO usar router.push / replace / refresh
     * Força reload real para o cookie chegar no server
     */
    window.location.href = '/'
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">

      <form
        onSubmit={handleLogin}
        className="w-[380px] bg-white rounded-3xl p-8 shadow-2xl space-y-5"
      >
        {/* TÍTULO */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">
            SETEC Hub
          </h1>

          <p className="text-slate-500 text-sm">
            Plataforma Operacional
          </p>
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
      </form>
    </div>
  )
}