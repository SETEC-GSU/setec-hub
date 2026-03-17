'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

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

    window.location.href = '/'
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950">

      <form
        onSubmit={handleLogin}
        className="w-[380px] bg-white rounded-3xl p-8 shadow-2xl space-y-5"
      >

        {/* LOGO + TÍTULO */}
        <div className="text-center space-y-2">

          <div className="flex justify-center items-center gap--1">

            <img
              src="https://midiasstoragesec.blob.core.windows.net/001/2026/03/icon.png"
              alt="SETEC Hub"
              width={70}
              height={100}
            />

            <h1 className="text-3xl font-bold text-slate-900">
              SETEC Hub
            </h1>

          </div>

          <p className="text-slate-500 text-sm">
            URE Guarulhos Sul
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