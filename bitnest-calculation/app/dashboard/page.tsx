// Simulador de carteiras (React + Tailwind)
// - Cada carteira rende 'ratePct'% por ciclo.
// - De cada carteira fonte, 20% do lucro é dividido igualmente entre as carteiras que a referenciam como fonte.
// - Se uma carteira não tem fontes, ela não recebe 20% de outras.
// - A retirada é feita do saldo da carteira no ciclo (pode ser editada por ciclo);
// - Reinvestimento automático do restante do lucro.
// - Dados salvos no localStorage.
export default function WalletBitnest(){
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-4">Simulador de Carteiras BitNest</h1>
      </div>
    </div>
  )
} 