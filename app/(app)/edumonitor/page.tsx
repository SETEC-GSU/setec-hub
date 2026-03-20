export default function EduMonitor() {
  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="
          text-3xl 
          font-semibold 
          text-slate-100
          tracking-tight
        ">
          EduMonitor - Visão Estratégica
        </h1>

        <p className="
          text-slate-400 
          mt-1
        ">
          Panorama geral dos equipamentos recebidos pelas unidades escolares da URE Guarulhos SUl - PowerBI
        </p>
      </div>

      {/* CARD DO RELATÓRIO */}
      <div className="
        relative
        w-full
        h-[calc(100vh-12rem)]
        min-h-[600px]

        rounded-3xl
        overflow-hidden

        border
        border-slate-800

        bg-gradient-to-b
        from-slate-900
        to-slate-950

        shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]
      ">

        {/* Glow suave (efeito startup absurdo) */}
        <div className="
          absolute
          inset-0
          pointer-events-none
          bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_60%)]
        "/>

        {/* IFRAME */}
        <iframe
          title="EduMonitor"
          src="https://app.powerbi.com/view?r=eyJrIjoiNDJmOTI4ZGMtOGZiNC00ZmE4LThiYzEtOWE4NWYwMjM4NDcxIiwidCI6IjE2Yjg3Nzk4LTQ1MTctNDQyYy05MjAwLWNlMWNjYTkzMjU5YyIsImMiOjR9"
          className="
            w-full 
            h-full 
            rounded-2xl
          "
          style={{ border: "none" }}
          allowFullScreen
        />

      </div>
    </div>
  )
}