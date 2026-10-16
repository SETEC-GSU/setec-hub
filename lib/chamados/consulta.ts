type Pagina<T> = { data: T[] | null; error: { message: string } | null; count: number | null }
// Mantém o escopo/RLS de cada página e evita totais cortados pelo limite REST.
// Cada callback deve ordenar por created_at e id e aplicar seus filtros de acesso.
export async function lerTodasPaginas<T extends { id: unknown }>(consultar: (inicio: number, fim: number, contar: boolean) => PromiseLike<Pagina<T>>): Promise<T[]> {
  const todos: T[] = [], ids = new Set<string>(); let inicio = 0, total: number | null = null
  while (true) {
    const { data, error, count } = await consultar(inicio, inicio + 499, inicio === 0)
    if (error) throw new Error(error.message)
    if (inicio === 0) total = count
    const pagina = data || []
    for (const row of pagina) {
      const id = String(row.id)
      if (ids.has(id)) throw new Error("A lista mudou durante a leitura. Atualize para conferir os totais completos.")
      ids.add(id); todos.push(row)
    }
    inicio += pagina.length
    if (total !== null && todos.length > total) throw new Error("A lista mudou durante a leitura. Atualize os dados.")
    if (total !== null && todos.length === total) return todos
    if (!pagina.length) {
      if (total !== null && todos.length < total) throw new Error("A consulta retornou uma lista parcial. Atualize para tentar novamente.")
      return todos
    }
  }
}
