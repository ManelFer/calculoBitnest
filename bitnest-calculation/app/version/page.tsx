"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { url } from "inspector"

export default function VersionPage() {
  const updates = [
    {
      version: "v1.0.6",
      date: "12/11/2025",
      changes: [
        "Adicionado a função de vinculação.",
      ],
    },
    {
      version: "v1.0.5",
      date: "12/11/2025",
      changes: [
        "Adicionado a função de retirada.",
        "Adicionado a função de depósito.",
        "Adicionado a função de retirada.",
        "Alteração da interface para melhor usabilidade.",
        "Gráficos aprimorados.",
        "Soma das comissões exibida no resumo.",

      ],
    },
    {
      version: "v1.0.4",
      date: "09/11/2025",
      changes: [
        "Adicionado a função de retirada.",
      ],
    },
    {
      version: "v1.0.3",
      date: "08/11/2025",
      changes: [
        "Adicionado cálculo de comissões 10% e 20% sem alterar o saldo.",
        "Lucro 24% exibido separadamente por ciclo.",
        "Interface de simulação aprimorada com cores e animações.",
        "Botão 'Limpar' agora remove dados do localStorage.",
      ],
    },
    {
      version: "v1.0.2",
      date: "05/11/2025",
      changes: [
        "Implementado sistema de ciclos (12 por padrão).",
        "Salvamento automático das carteiras no localStorage.",
        "Correção no cálculo composto de 24%.",
      ],
    },
    {
      version: "v1.0.1",
      date: "02/11/2025",
      changes: [
        "Adicionada funcionalidade de vincular carteiras (primária e secundária).",
        "Correção de layout no cabeçalho.",
        "Adicionado suporte a responsividade.",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Histórico de Atualizações</h1>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Voltar
            </Button>
          </Link>
        </div>

        {updates.map((u, i) => (
          <Card key={i} className="mb-4 border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex justify-between text-lg font-semibold">
                <span>{u.version}</span>
                <span className="text-sm text-gray-500">{u.date}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                {u.changes.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        <p className="text-sm text-gray-500 text-center mt-6">
          © {new Date().getFullYear()} <a href="https://manoel-dev.vercel.app" className="hover:underline">Manoel DEV</a> — Registro de alterações do sistema.
        </p>
      </div>
    </div>
  )
}
