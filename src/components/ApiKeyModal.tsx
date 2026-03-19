import { useState, type FormEvent } from 'react'
import { useApiKey } from '../context/ApiKeyContext'

export function ApiKeyModal() {
  const { setApiKey } = useApiKey()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) {
      setError('Introduce una API key válida')
      return
    }
    // Formato UUID básico
    if (!/^[0-9a-f-]{30,}$/i.test(trimmed)) {
      setError('El formato no parece correcto. Debe ser un UUID como el que aparece en el portal NAP.')
      return
    }
    setApiKey(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        {/* Logo / título */}
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
            Ministerio de Transportes — NAP
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">NAP Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Para acceder al catálogo de datos necesitas una API key del{' '}
            <a
              href="https://nap.transportes.gob.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Punto de Acceso Nacional
            </a>
            . La key se guarda solo en tu navegador y nunca se envía a ningún servidor externo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apikey" className="block text-sm font-medium text-slate-700 mb-1">
              API Key
            </label>
            <input
              id="apikey"
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError('') }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              spellCheck={false}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Acceder al dashboard
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            ¿No tienes API key? Regístrate en{' '}
            <a
              href="https://nap.transportes.gob.es/User/Register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              nap.transportes.gob.es/User/Register
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
