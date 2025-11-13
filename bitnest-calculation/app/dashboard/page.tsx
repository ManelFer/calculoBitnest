"use client"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"
import Link from "next/link"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, BarChart, Bar,
} from "recharts"

type Movement = { cycle: number; amount: number; note?: string } // usado para retirada e depósito

type Wallet = {
  id: number
  name: string
  initialValue: number
  sources: number[] // Lista os IDs das carteiras INDICADAS por esta carteira (seus 'filhos')
  history: number[]
  lucro24History: number[]
  commission20History: number[]
  commission10History: number[]
  withdrawals: Movement[] // retiradas
  deposits: Movement[] // adições
}

export default function WalletBitnest() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [ratePct, setRatePct] = useState(24)
  const [cycles, setCycles] = useState(12)
  const [newWallet, setNewWallet] = useState({ name: "", value: "" })

  // formulários para retirada e depósito
  const [withdrawForm, setWithdrawForm] = useState({ walletId: "", cycle: "", amount: "" })
  const [depositForm, setDepositForm] = useState({ walletId: "", cycle: "", amount: "" })
  // NOVO: formulário para vincular carteiras
  const [linkForm, setLinkForm] = useState({ sourceId: "", targetId: "" })

  // ---------- LOADING STATES (por botão) ----------
  const [loadingSimular, setLoadingSimular] = useState(false)
  const [loadingLimpar, setLoadingLimpar] = useState(false)
  const [loadingAddWallet, setLoadingAddWallet] = useState(false)
  const [loadingLink, setLoadingLink] = useState(false)
  const [loadingWithdraw, setLoadingWithdraw] = useState(false)
  const [loadingDeposit, setLoadingDeposit] = useState(false)

  // carregar do localStorage (compatibilidade: adiciona fields que faltam)
  useEffect(() => {
    const saved = localStorage.getItem("bitnest_wallets_cycles")
    if (saved) {
      try {
        const parsed: Wallet[] = JSON.parse(saved)
        // garantir campos novos
        const normalized = parsed.map((w) => ({
          ...w,
          sources: w.sources ?? [],
          history: w.history ?? [w.initialValue ?? 0],
          lucro24History: w.lucro24History ?? [0],
          commission20History: w.commission20History ?? [0],
          commission10History: w.commission10History ?? [0],
          withdrawals: w.withdrawals ?? [],
          deposits: (w as any).deposits ?? [], // pode ser undefined em saves antigos
        }))
        setWallets(normalized)
      } catch {
        // ignore parse error
        setWallets([])
      }
    }
  }, [])

  // salvar no localStorage (serializa)
  useEffect(() => {
    localStorage.setItem("bitnest_wallets_cycles", JSON.stringify(wallets))
  }, [wallets])

  // adicionar carteira
  const addWallet = () => {
    if (!newWallet.name || !newWallet.value) return
    const value = parseFloat(newWallet.value)
    if (Number.isNaN(value)) return
    const wallet: Wallet = {
      id: Date.now(),
      name: newWallet.name.trim(),
      initialValue: value,
      sources: [],
      history: [value],
      lucro24History: [0],
      commission20History: [0],
      commission10History: [0],
      withdrawals: [],
      deposits: [],
    }
    setWallets((prev) => [...prev, wallet])
    setNewWallet({ name: "", value: "" })
  }

  // remover carteira
  const removeWallet = (id: number) =>
    setWallets((prev) => prev.filter((w) => w.id !== id))

  // vincular carteiras (sourceId indica targetId)
  const linkWallet = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return
    setWallets((prev) =>
      prev.map((w) =>
        w.id === sourceId
          ? { ...w, sources: [...new Set([...w.sources, targetId])] } // source (indicador) adiciona target (indicado)
          : w
      )
    )
  }

  // função principal: simula todos os ciclos com base em deposits e withdrawals por ciclo
  const simulate = (baseWallets: Wallet[] = wallets) => {
    // clone profundo superficial: arrays serão recriados
    const updated = baseWallets.map((w) => ({
      ...w,
      history: [w.initialValue],
      lucro24History: [0],
      commission20History: [0],
      commission10History: [0],
    }))

    for (let i = 1; i <= cycles; i++) {
      const lucro24: Record<number, number> = {}
      const com20: Record<number, number> = {}
      const com10: Record<number, number> = {}

      // 1) aplicar depósitos e retiradas programadas do ciclo i (antes do cálculo do rendimento)
      updated.forEach((w) => {
        const last = w.history.at(-1) ?? 0
        const retiradaTotal = w.withdrawals
          .filter((r) => r.cycle === i)
          .reduce((s, r) => s + (r.amount || 0), 0)
        const depositoTotal = w.deposits
          .filter((d) => d.cycle === i)
          .reduce((s, d) => s + (d.amount || 0), 0)
        // aplicar: depósitos aumentam capital, retiradas reduzem (não deixa negativo)
        const afterDeposit = last + depositoTotal
        const afterWithdraw = Math.max(afterDeposit - retiradaTotal, 0)
        // atualiza o último slot (saldo antes do lucro do ciclo)
        w.history[w.history.length - 1] = afterWithdraw
      })

      // 2) calcular lucro base (ratePct) sobre saldo após depósitos/retiradas
      updated.forEach((w) => {
        // Usa o saldo após movimentações (que está no último slot do history)
        lucro24[w.id] = (w.history.at(-1) ?? 0) * (ratePct / 100)
      })

      // 3) calcular comissões: 
      // Indicador Direto (Parent) ganha 20% do indicado (Child).
      // Indicador Indireto (Grandparent) ganha 10% do indicado (Grandchild).
      updated.forEach((child) => {
        const profit = lucro24[child.id] || 0 // Lucro base do indicado (Child/Grandchild)

        updated.forEach((parent) => {
          // Se o Parent indicou o Child (ou seja, Child é um indicado direto de Parent)
          if (parent.sources.includes(child.id)) {
            // Parent ganha 20% do lucro do Child
            com20[parent.id] = (com20[parent.id] || 0) + profit * 0.2

            updated.forEach((gp) => {
              // Se o Grandparent (gp) indicou o Parent
              if (gp.sources.includes(parent.id)) {
                // Grandparent ganha 10% do lucro do Grandchild (child)
                com10[gp.id] = (com10[gp.id] || 0) + profit * 0.1
              }
            })
          }
        })
      })

      // 4) atualizar histórico com lucro + comissões recebidas (comissões são recebidas neste ciclo)
      updated.forEach((w) => {
        const prev = w.history.at(-1) ?? 0
        const newBalance = prev + (lucro24[w.id] || 0)
        w.history.push(newBalance)
        w.lucro24History.push(lucro24[w.id] || 0)
        w.commission20History.push(com20[w.id] || 0)
        w.commission10History.push(com10[w.id] || 0)
      })
    }

    setWallets(updated)
    return updated
  }

  // adicionar retirada programada (usa simulate para recalcular)
  const addWithdrawal = (walletId: number, cycle: number, amount: number) => {
    if (cycle < 1 || amount <= 0) return
    const updated = wallets.map((w) =>
      w.id === walletId
        ? { ...w, withdrawals: [...w.withdrawals, { cycle, amount }] }
        : w
    )
    simulate(updated)
  }

  // adicionar depósito programado (usa simulate para recalcular)
  const addDeposit = (walletId: number, cycle: number, amount: number) => {
    if (cycle < 1 || amount <= 0) return
    const updated = wallets.map((w) =>
      w.id === walletId
        ? { ...w, deposits: [...w.deposits, { cycle, amount }] }
        : w
    )
    simulate(updated)
  }

  // handlers para os formulários
  const handleWithdrawSubmit = () => {
    const id = parseInt(withdrawForm.walletId)
    const cycle = parseInt(withdrawForm.cycle)
    const amount = parseFloat(withdrawForm.amount)
    if (!id || !cycle || !amount || amount <= 0) return
    addWithdrawal(id, cycle, amount)
    setWithdrawForm({ walletId: "", cycle: "", amount: "" })
  }

  const handleDepositSubmit = () => {
    const id = parseInt(depositForm.walletId)
    const cycle = parseInt(depositForm.cycle)
    const amount = parseFloat(depositForm.amount)
    if (!id || !cycle || !amount || amount <= 0) return
    addDeposit(id, cycle, amount)
    setDepositForm({ walletId: "", cycle: "", amount: "" })
  }

  // Handler para o formulário de vínculo
  const handleLinkSubmit = () => {
    const sourceId = parseInt(linkForm.sourceId)
    const targetId = parseInt(linkForm.targetId)
    if (!sourceId || !targetId) return
    linkWallet(sourceId, targetId)
    setLinkForm({ sourceId: "", targetId: "" })
  }

  // dados para gráficos
  const growthData =
    wallets.length > 0
      ? Array.from({ length: cycles + 1 }, (_, i) => ({
        cycle: i,
        ...Object.fromEntries(wallets.map((w) => [w.name, w.history[i] ?? 0])),
      }))
      : []

  const commissionData = wallets.map((w) => ({
    name: w.name,
    com20: w.commission20History.reduce((a, b) => a + b, 0),
    com10: w.commission10History.reduce((a, b) => a + b, 0),
  }))

  const totalCommissions = commissionData.reduce(
    (sum, c) => sum + c.com20 + c.com10,
    0
  )

  // comissões por ciclo -
  const totalCommissionsPerCycle = Array.from({ length: cycles + 1 }, (_, i) => {
    const cycleTotal = wallets.reduce((total, w) => {
      const com20 = w.commission20History[i] ?? 0
      const com10 = w.commission10History[i] ?? 0
      return total + com20 + com10
    }, 0)
    return {
      cycle: i,
      totalCommission: cycleTotal,
    }
  }).filter(item => item.cycle > 0)

  // histórico global (listas planas) para exibir em tabelas separadas
  const withdrawalsHistory = wallets.flatMap((w) =>
    w.withdrawals.map((r) => ({ walletName: w.name, cycle: r.cycle, amount: r.amount }))
  ).sort((a, b) => a.cycle - b.cycle)

  const depositsHistory = wallets.flatMap((w) =>
    w.deposits.map((d) => ({ walletName: w.name, cycle: d.cycle, amount: d.amount }))
  ).sort((a, b) => a.cycle - b.cycle)

  // util: small delay so loading is visible
  const shortWait = (ms = 300) => new Promise((r) => setTimeout(r, ms))

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow p-4 sm:p-6 space-y-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
            Simulador de Carteiras BitNest
          </h1>
          <Link href="/version" className="text-green-700 font-semibold hover:underline text-center">
            V1.0.6
          </Link>
        </header>

        {/* Controles (Taxa, Ciclos, Simular/Limpar) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Taxa (%)</Label>
            <Input type="number" value={ratePct} onChange={(e) => setRatePct(parseFloat(e.target.value))} />
          </div>
          <div>
            <Label>Ciclos</Label>
            <Input type="number" value={cycles} onChange={(e) => setCycles(parseInt(e.target.value))} />
          </div>
          <div className="flex gap-2 items-end">
            <Button
              onClick={async () => {
                setLoadingSimular(true)
                await shortWait()
                simulate()
                setLoadingSimular(false)
              }}
              disabled={loadingSimular}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-all duration-300"
            >
              {loadingSimular ? "Simulando..." : "Simular"}
            </Button>
            <Button
              onClick={async () => {
                setLoadingLimpar(true)
                await shortWait()
                localStorage.removeItem("bitnest_wallets_cycles")
                setWallets([])
                setLoadingLimpar(false)
              }}
              disabled={loadingLimpar}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-all duration-300"
            >
              {loadingLimpar ? "Limpando..." : "Limpar"}
            </Button>
          </div>
        </section>

        {/* Adicionar Carteira / Vínculo / Retirada / Depósito */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Adicionar Carteira */}
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Adicionar Carteira</h2>
            <div className="flex flex-col gap-2">
              <Input placeholder="Nome" value={newWallet.name} onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })} />
              <Input placeholder="Valor inicial" type="number" value={newWallet.value} onChange={(e) => setNewWallet({ ...newWallet, value: e.target.value })} />
              <Button
                onClick={async () => {
                  setLoadingAddWallet(true)
                  await shortWait()
                  addWallet()
                  setLoadingAddWallet(false)
                }}
                disabled={loadingAddWallet}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loadingAddWallet ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </div>

          {/* NOVO: Vincular Carteiras (Indicação) */}
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Vincular Carteiras</h2>
            <div className="flex flex-col gap-2">
              <select className="border rounded px-2 py-1" value={linkForm.sourceId} onChange={(e) => setLinkForm({ ...linkForm, sourceId: e.target.value })}>
                <option value="">Selecione o Indicador</option>
                {wallets.map((w) => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
              </select>
              <select className="border rounded px-2 py-1" value={linkForm.targetId} onChange={(e) => setLinkForm({ ...linkForm, targetId: e.target.value })}>
                <option value="">Selecione o Indicado</option>
                {wallets.map((w) => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
              </select>
              <Button
                onClick={async () => {
                  setLoadingLink(true)
                  await shortWait()
                  handleLinkSubmit()
                  setLoadingLink(false)
                }}
                disabled={loadingLink}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loadingLink ? "Vinculando..." : "Vincular"}
              </Button>
            </div>
          </div>


          {/* Retirada */}
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Retirada</h2>
            <div className="flex flex-col gap-2">
              <select className="border rounded px-2 py-1" value={withdrawForm.walletId} onChange={(e) => setWithdrawForm({ ...withdrawForm, walletId: e.target.value })}>
                <option value="">Selecione a carteira</option>
                {wallets.map((w) => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
              </select>
              <Input placeholder="Ciclo" type="number" value={withdrawForm.cycle} onChange={(e) => setWithdrawForm({ ...withdrawForm, cycle: e.target.value })} />
              <Input placeholder="Valor" type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} />
              <Button
                onClick={async () => {
                  setLoadingWithdraw(true)
                  await shortWait()
                  handleWithdrawSubmit()
                  setLoadingWithdraw(false)
                }}
                disabled={loadingWithdraw}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loadingWithdraw ? "Retirando..." : "Retirar"}
              </Button>
            </div>
          </div>

          {/* Depósito */}
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Adicionar Valor (Depósito)</h2>
            <div className="flex flex-col gap-2">
              <select className="border rounded px-2 py-1" value={depositForm.walletId} onChange={(e) => setDepositForm({ ...depositForm, walletId: e.target.value })}>
                <option value="">Selecione a carteira</option>
                {wallets.map((w) => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
              </select>
              <Input placeholder="Ciclo" type="number" value={depositForm.cycle} onChange={(e) => setDepositForm({ ...depositForm, cycle: e.target.value })} />
              <Input placeholder="Valor" type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} />
              <Button
                onClick={async () => {
                  setLoadingDeposit(true)
                  await shortWait()
                  handleDepositSubmit()
                  setLoadingDeposit(false)
                }}
                disabled={loadingDeposit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loadingDeposit ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </section>



        {/* Gráfico de Crescimento */}
        {growthData.length > 0 && (
          <section className="p-4 border rounded bg-slate-50">
            <h2 className="text-xl font-bold mb-4">Crescimento das Carteiras</h2>
            <div className="w-full h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cycle" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {wallets.map((w) => (
                    <Line key={w.id} type="monotone" dataKey={w.name} strokeWidth={2} stroke={`hsl(${(w.id % 360)}, 70%, 50%)`} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* comissoes por ciclo */}
        {totalCommissionsPerCycle.length > 0 && (
          <section className="p-4 border rounded bg-slate-50 overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Total de Comissões por Ciclo</h2>
            <div className="min-w-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    <TableHead className="text-right">Total de Comissões (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totalCommissionsPerCycle.map((data) => (
                    <TableRow key={data.cycle}>
                      <TableCell className="font-semibold">{data.cycle}</TableCell>
                      <TableCell className="text-right font-medium text-purple-700">
                        R$ {data.totalCommission.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-right font-semibold mt-4">
                Soma de todas as comissões (20% + 10%) de todas as carteiras em cada ciclo.
              </p>
            </div>
          </section>
        )}

        {/* Tabela principal: rendimento e comissões */}
        {wallets.length > 0 && (
          <section className="p-4 border rounded bg-slate-50 overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Rendimento e Comissões Detalhados</h2>
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    {wallets.map((w) => (
                      <TableHead key={w.id}>{w.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: cycles + 1 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold">{i}</TableCell>
                      {wallets.map((w) => {
                        const saldo = w.history[i] ?? 0
                        const lucro24 = w.lucro24History[i] ?? 0
                        const com20 = w.commission20History[i] ?? 0
                        const com10 = w.commission10History[i] ?? 0
                        const totalComissao = com20 + com10
                        const totalRendimento = totalComissao
                        return (
                          <TableCell key={w.id}>
                            <div className="flex flex-col text-sm">
                              <span className="font-medium">{saldo.toFixed(2)}</span>
                              {i > 0 && (
                                <>
                                  <span className="text-green-600">+{lucro24.toFixed(2)} (Lucro {ratePct}%)</span>
                                  <span className="text-blue-600">+{com20.toFixed(2)} (Comissão 20%)</span>
                                  <span className="text-yellow-600">+{com10.toFixed(2)} (Comissão 10%)</span>
                                  <span className="text-purple-700 font-semibold mt-1">Rendeu ciclo: {totalRendimento.toFixed(2)}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* Histórico de Retiradas (tabela separada) */}
        <section className="p-4 border rounded bg-slate-50 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Histórico de Retiradas</h2>
          {withdrawalsHistory.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma retirada registrada.</p>
          ) : (
            <div className="min-w-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carteira</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalsHistory.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.walletName}</TableCell>
                      <TableCell>{r.cycle}</TableCell>
                      <TableCell>R$ {r.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Histórico de Depósitos (tabela separada) */}
        <section className="p-4 border rounded bg-slate-50 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Histórico de Depósitos</h2>
          {depositsHistory.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum depósito registrado.</p>
          ) : (
            <div className="min-w-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carteira</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depositsHistory.map((d, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{d.walletName}</TableCell>
                      <TableCell>{d.cycle}</TableCell>
                      <TableCell>R$ {d.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Gráfico de Comissões */}
        {commissionData.length > 0 && (
          <section className="p-4 border rounded bg-slate-50">
            <h2 className="text-xl font-bold mb-4">Comissões Totais</h2>
            <div className="w-full h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="com20" fill="#3b82f6" name="Comissão 20% (Direta)" />
                  <Bar dataKey="com10" fill="#f59e0b" name="Comissão 10% (Indireta)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Total geral de comissões por ciclo */}

            <p className="text-right font-semibold mt-2">Total Geral de Comissões: R$ {totalCommissions.toFixed(2)}</p>
          </section>
        )}
      </div>
    </div>
  )
}
