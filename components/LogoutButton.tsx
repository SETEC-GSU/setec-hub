'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()

    router.refresh()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="
        bg-blue-600 
        text-white 
        px-4 
        py-2 
        rounded-xl
        font-medium
        transition-all
        duration-200
        hover:bg-blue-700
        hover:shadow-lg
        active:scale-95
      "
    >
      Sair
    </button>
  )
}