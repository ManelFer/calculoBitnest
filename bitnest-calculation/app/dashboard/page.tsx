"use client"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type Wallet = {
  id: number
  name: string
  initialValue: number
  balance: number
  sources: number[]
  history?: number[] // histórico de saldos
  commissionsHistory?: number[]
}

export default function WalletBitnest() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [ratePct, setRatePct] = useState(24)
  const [cycles, setCycles] = useState(12)
  const [newWallet, setNewWallet] = useState({ name: "", value: "" })

  // carregar carteiras do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bitnest_wallets")
    if (saved) setWallets(JSON.parse(saved))
  }, [])

  // salvar ao alterar
  useEffect(() => {
    localStorage.setItem("bitnest_wallets", JSON.stringify(wallets))
  }, [wallets])

  function addWallet() {
    if (!newWallet.name || !newWallet.value) return
    const wallet: Wallet = {
      id: Date.now(),
      name: newWallet.name,
      initialValue: parseFloat(newWallet.value),
      balance: parseFloat(newWallet.value),
      sources: [],
      history: [parseFloat(newWallet.value)],
    }
    setWallets([...wallets, wallet])
    setNewWallet({ name: "", value: "" })
  }

  function removeWallet(id: number) {
    setWallets(wallets.filter((w) => w.id !== id))
  }

  function linkWallet(sourceId: number, targetId: number) {
    if (sourceId === targetId) return
    const updated = wallets.map((w) =>
      w.id === sourceId
        ? { ...w, sources: [...new Set([...w.sources, targetId])] }
        : w
    )
    setWallets(updated)
  }

  // simular rendimento e comissões
  function simulate() {
    const updated = wallets.map((w) => ({
      ...w,
      balance: w.initialValue,
      history: [w.initialValue],
      commissionsHistory: [0],
    }))

    for (let i = 0; i < cycles; i++) {
      // aplicar rendimento base
      updated.forEach((w) => (w.balance += w.balance * (ratePct / 100)))

      // calcular comissões (20% do lucro do ciclo)
      const commissions: Record<number, number> = {}
      updated.forEach((secondary) => {
        const lastBalance = secondary.history![secondary.history!.length - 1]
        const profit = secondary.balance - lastBalance

        const bonus = profit * 0.2

        if (secondary.sources.length > 0) {
          const share = bonus / secondary.sources.length

          secondary.sources.forEach((sourceId) => {
            commissions[sourceId] = (commissions[sourceId] || 0) + share
          })
        }
      })

      // aplicar comissões
      Object.entries(commissions).forEach(([id, value]) => {
        const target = updated.find((w) => w.id === Number(id))
        if (target) target.balance += value
        target?.commissionsHistory!.push(value)
      })

      // salvar histórico
      updated.forEach((w) => {
        if (w.commissionsHistory!.length < i + 2) w.commissionsHistory!.push(0)
        w.history!.push(w.balance)
      })
    }

    setWallets(updated)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-4">Simulador de Carteiras BitNest</h1>

        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label htmlFor="ratePct">Taxa (%)</Label>
            <Input
              id="ratePct"
              type="number"
              value={ratePct}
              onChange={(e) => setRatePct(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="cycles">Ciclos</Label>
            <Input
              id="cycles"
              type="number"
              value={cycles}
              onChange={(e) => setCycles(parseInt(e.target.value))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={simulate} className="bg-blue-600 text-white">Simular</Button>
            <Button
              onClick={() => {
                localStorage.removeItem("bitnest_wallets")
                setWallets([])
              }}
              className="bg-red-600 text-white"
            >
              Limpar
            </Button>
          </div>
        </div>

        {/* Adicionar Carteira */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 border rounded">
            <h2 className="text-xl font-semibold mb-3">Adicionar Carteira</h2>
            <Input
              placeholder="Nome"
              value={newWallet.name}
              onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
              className="mb-2"
            />
            <Input
              placeholder="Valor inicial"
              type="number"
              value={newWallet.value}
              onChange={(e) => setNewWallet({ ...newWallet, value: e.target.value })}
              className="mb-2"
            />
            <Button onClick={addWallet} className="bg-green-600 text-white w-full">
              Adicionar
            </Button>
          </div>

          {/* Lista de carteiras */}
          <div className="p-4 border rounded">
            <h2 className="text-xl font-semibold mb-3">Carteiras</h2>
            {wallets.length === 0 && <p>Nenhuma carteira.</p>}
            {wallets.map((w) => (
              <div key={w.id} className="flex justify-between items-center border-b py-2">
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-sm text-gray-600">Saldo: R$ {w.balance.toFixed(2)}</p>
                </div>
                <Button
                  onClick={() => removeWallet(w.id)}
                  className="bg-red-500 text-white"
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Vincular carteiras */}
        {wallets.length > 1 && (
          <div className="p-4 border rounded mb-6">
            <h2 className="text-xl font-semibold mb-3">Vincular Carteiras</h2>
            {wallets.map((source) => (
              <div key={source.id} className="mb-2">
                <p className="font-medium">{source.name} →</p>
                <div className="flex gap-2 flex-wrap">
                  {wallets
                    .filter((w) => w.id !== source.id)
                    .map((target) => (
                      <Button
                        key={target.id}
                        variant={
                          source.sources.includes(target.id) ? "default" : "outline"
                        }
                        className={
                          source.sources.includes(target.id)
                            ? "bg-blue-500 text-white"
                            : "border-gray-400"
                        }
                        onClick={() => linkWallet(source.id, target.id)}
                      >
                        {target.name}
                      </Button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resultados */}
        <div className="mt-6 space-y-6">
          {wallets.map((w) => (
            <div key={w.id} className="p-3 border rounded">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold">{w.name}</h3>
                <p>Final: R$ {w.balance.toFixed(2)}</p>
              </div>
              <Table>
                <TableCaption>Histórico de rendimentos</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo / mês </TableHead>
                    <TableHead>Saldo (R$) + 24%</TableHead>
                    <TableHead>Comissões (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {w.history?.map((val, i) => (
                    <TableRow key={i}>
                      <TableCell>{i}</TableCell>
                      <TableCell title={`Lucro de 24% neste ciclo: R$ ${i === 0 ? 0 : (val - (w.history?.[i - 1] ?? 0)).toFixed(2)}`}>{val.toFixed(2)}</TableCell>
                      <TableCell>
                        {w.commissionsHistory && w.commissionsHistory[i]
                          ? w.commissionsHistory[i].toFixed(2)
                          : "0.00"}

                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
