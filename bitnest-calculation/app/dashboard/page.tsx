"use client"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"
import Version from "../version/page"
import Link from "next/link"

type Wallet = {
  id: number
  name: string
  initialValue: number
  sources: number[]
  history: number[]
  lucro24History: number[]
  commission20History: number[]
  commission10History: number[]
}

export default function WalletBitnest() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [ratePct, setRatePct] = useState(24)
  const [cycles, setCycles] = useState(12)
  const [newWallet, setNewWallet] = useState({ name: "", value: "" })

  // carregar do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bitnest_wallets_cycles")
    if (saved) setWallets(JSON.parse(saved))
  }, [])

  // salvar ao alterar
  useEffect(() => {
    localStorage.setItem("bitnest_wallets_cycles", JSON.stringify(wallets))
  }, [wallets])

  function addWallet() {
    if (!newWallet.name || !newWallet.value) return
    const value = parseFloat(newWallet.value)
    const wallet: Wallet = {
      id: Date.now(),
      name: newWallet.name,
      initialValue: value,
      sources: [],
      history: [value],
      lucro24History: [0],
      commission20History: [0],
      commission10History: [0],
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

  function simulate() {
    const updated = wallets.map((w) => ({
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

      // calcular lucro 24% para todos
      updated.forEach((w) => {
        const last = w.history[w.history.length - 1]
        const lucro = last * (ratePct / 100)
        lucro24[w.id] = lucro
      })

      // calcular comissões (não somar no saldo)
      updated.forEach((child) => {
        const profit = lucro24[child.id]
        // quem indicou o child → ganha 20%
        updated.forEach((parent) => {
          if (parent.sources.includes(child.id)) {
            com20[parent.id] = (com20[parent.id] || 0) + profit * 0.2

            // quem indicou o parent → ganha 10%
            updated.forEach((gp) => {
              if (gp.sources.includes(parent.id)) {
                com10[gp.id] = (com10[gp.id] || 0) + profit * 0.1
              }
            })
          }
        })
      })

      // registrar resultados por ciclo
      updated.forEach((w) => {
        const prev = w.history[w.history.length - 1]
        const novoSaldo = prev + lucro24[w.id]
        w.history.push(novoSaldo)
        w.lucro24History.push(lucro24[w.id])
        w.commission20History.push(com20[w.id] || 0)
        w.commission10History.push(com10[w.id] || 0)
      })
    }

    setWallets(updated)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold mb-4">Simulador de Carteiras BitNest</h1>
          <Link href="/version">
            <button className="text-green-700 font-semibold hover:text-green-800 hover:underline hover:scale-105 duration-300">
              V1.0.3
            </button>
          </Link>
        </div>

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
            <Button onClick={simulate} className="bg-blue-600 hover:bg-blue-700 hover:scale-105 duration-300 text-white">Simular</Button>
            <Button
              onClick={() => {
                localStorage.removeItem("bitnest_wallets_cycles")
                setWallets([])
              }}
              className="bg-red-600 hover:bg-red-700 hover:scale-105 duration-300 text-white"
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
            <Button onClick={addWallet} className="bg-green-600 hover:bg-green-700 hover:scale-105 duration-300 text-white w-full">
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
                  <p className="text-sm text-gray-600">Valor inicial: R$ {w.initialValue.toFixed(2)}</p>
                </div>
                <Trash2 onClick={() => removeWallet(w.id)} className="w-5 h-5 text-red-500 hover:scale-110 duration-300 cursor-pointer" />
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
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
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
                <p>Final (24%): R$ {w.history[w.history.length - 1].toFixed(2)}</p>
              </div>

              <Table>
                <TableCaption>Histórico de rendimentos (24%) e comissões</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Lucro 24%</TableHead>
                    <TableHead>Comissão 20%</TableHead>
                    <TableHead>Comissão 10%</TableHead>
                    <TableHead>Saldo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {w.history.map((val, i) => (
                    <TableRow key={i}>
                      <TableCell>{i}</TableCell>
                      <TableCell>{w.lucro24History[i]?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>{w.commission20History[i]?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>{w.commission10History[i]?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>{val.toFixed(2)}</TableCell>
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
