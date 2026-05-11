import { useState } from 'react'

const SECTORES = [
  'Restaurante / Bar', 'Fontanería', 'Electricidad', 'Clínica / Salud',
  'Peluquería / Estética', 'Academia / Formación', 'Tienda local',
  'Asesoría / Gestoría', 'Inmobiliaria', 'Taller mecánico',
  'Construcción / Reformas', 'Otro'
]

const TIPOS_WEB = [
  {
    id: 'corporativa',
    titulo: 'Web corporativa',
    desc: 'Presencia online profesional. Ideal para mostrar tu negocio y captar clientes.',
    icono: '🏢'
  },
  {
    id: 'dinamica',
    titulo: 'Web dinámica',
    desc: 'Con panel de gestión. Actualiza contenido, menús, servicios o eventos tú mismo.',
    icono: '⚡'
  },
  {
    id: 'ecommerce',
    titulo: 'Tienda online',
    desc: 'Vende tus productos online. Carrito, pagos y gestión de pedidos incluidos.',
    icono: '🛒'
  },
]

const PAGINAS_DISPONIBLES = [
  'Inicio', 'Sobre nosotros', 'Servicios', 'Productos',
  'Galería', 'Blog', 'Contacto', 'Reservas', 'Menú', 'FAQ'
]

const PASOS = ['Negocio', 'Tipo de web', 'Páginas', 'Estilo', 'Resumen']

export default function OnboardingForm({ onComplete }) {
  const [paso, setPaso] = useState(0)
  const [datos, setDatos] = useState({
    businessName: '',
    sector: '',
    city: '',
    phone: '',
    email: '',
    description: '',
    webType: '',
    pages: ['Inicio', 'Servicios', 'Contacto'],
    primaryColor: '#1a56db',
    style: 'moderno',
    extras: [],
  })

  const actualizar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }))

  const togglePagina = (pagina) => {
    setDatos(prev => ({
      ...prev,
      pages: prev.pages.includes(pagina)
        ? prev.pages.filter(p => p !== pagina)
        : [...prev.pages, pagina]
    }))
  }

  const puedeAvanzar = () => {
    if (paso === 0) return datos.businessName && datos.sector && datos.city
    if (paso === 1) return datos.webType !== ''
    if (paso === 2) return datos.pages.length >= 1
    return true
  }

  return (
    <div className="max-w-2xl mx-auto p-6 py-12">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crea tu web profesional</h1>
        <p className="text-gray-500">Cuéntanos sobre tu negocio y la IA hará el resto</p>
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center justify-between mb-10">
        {PASOS.map((nombre, i) => (
          <div key={i} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
              ${i < paso ? 'bg-green-500 text-white'
                : i === paso ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'}`}>
              {i < paso ? '✓' : i + 1}
            </div>
            {i < PASOS.length - 1 && (
              <div className={`h-1 w-12 mx-1 rounded ${i < paso ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Paso 0 — Datos del negocio */}
      {paso === 0 && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Cuéntanos sobre tu negocio</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio *</label>
            <input
              type="text"
              placeholder="Ej: Restaurante Casa Paco"
              value={datos.businessName}
              onChange={e => actualizar('businessName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sector *</label>
            <select
              value={datos.sector}
              onChange={e => actualizar('sector', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecciona tu sector</option>
              {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
            <input
              type="text"
              placeholder="Ej: Madrid"
              value={datos.city}
              onChange={e => actualizar('city', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                placeholder="Ej: 612 345 678"
                value={datos.phone}
                onChange={e => actualizar('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de contacto</label>
              <input
                type="email"
                placeholder="Ej: info@tupnegocio.es"
                value={datos.email}
                onChange={e => actualizar('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe tu negocio <span className="text-gray-400 font-normal">(cuanto más detalle, mejor resultado)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Ej: Somos un restaurante familiar especializado en cocina mediterránea, llevamos 15 años en Madrid. Tenemos menú del día y servicio de catering..."
              value={datos.description}
              onChange={e => actualizar('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* Paso 1 — Tipo de web */}
      {paso === 1 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">¿Qué tipo de web necesitas?</h2>
          <div className="space-y-4">
            {TIPOS_WEB.map(tipo => (
              <div
                key={tipo.id}
                onClick={() => actualizar('webType', tipo.id)}
                className={`border-2 rounded-xl p-5 cursor-pointer transition-all
                  ${datos.webType === tipo.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'}`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{tipo.icono}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{tipo.titulo}</div>
                    <div className="text-sm text-gray-500 mt-1">{tipo.desc}</div>
                  </div>
                  {datos.webType === tipo.id && (
                    <div className="ml-auto text-blue-600 text-xl">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2 — Páginas */}
      {paso === 2 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">¿Qué páginas necesitas?</h2>
          <p className="text-gray-500 text-sm mb-6">Selecciona todas las que quieras incluir en tu web</p>
          <div className="grid grid-cols-2 gap-3">
            {PAGINAS_DISPONIBLES.map(pagina => (
              <div
                key={pagina}
                onClick={() => togglePagina(pagina)}
                className={`border-2 rounded-lg p-3 cursor-pointer text-sm font-medium transition-all text-center
                  ${datos.pages.includes(pagina)
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                {datos.pages.includes(pagina) ? '✓ ' : ''}{pagina}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paso 3 — Estilo */}
      {paso === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Estilo visual</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Estilo de diseño</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'moderno', label: 'Moderno', desc: 'Limpio y minimalista' },
                { id: 'elegante', label: 'Elegante', desc: 'Sofisticado y premium' },
                { id: 'cercano', label: 'Cercano', desc: 'Cálido y familiar' },
              ].map(est => (
                <div
                  key={est.id}
                  onClick={() => actualizar('style', est.id)}
                  className={`border-2 rounded-lg p-3 cursor-pointer text-center transition-all
                    ${datos.style === est.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-medium text-sm text-gray-800">{est.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{est.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Color principal de tu marca</label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={datos.primaryColor}
                onChange={e => actualizar('primaryColor', e.target.value)}
                className="w-14 h-14 rounded-lg cursor-pointer border border-gray-200"
              />
              <div>
                <div className="font-medium text-gray-800">{datos.primaryColor}</div>
                <div className="text-sm text-gray-500">La IA derivará toda la paleta desde este color</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 4 — Resumen */}
      {paso === 4 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Resumen de tu proyecto</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            {[
              { label: 'Negocio', value: datos.businessName },
              { label: 'Sector', value: datos.sector },
              { label: 'Ciudad', value: datos.city },
              { label: 'Tipo de web', value: datos.webType },
              { label: 'Páginas', value: datos.pages.join(', ') },
              { label: 'Estilo', value: datos.style },
              { label: 'Color principal', value: datos.primaryColor },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-0">
                <span className="text-sm text-gray-500 font-medium">{item.label}</span>
                <span className="text-sm text-gray-800 text-right max-w-xs">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de navegación */}
      <div className="flex justify-between mt-10">
        <button
          onClick={() => setPaso(p => p - 1)}
          className={`px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium transition-all hover:bg-gray-50
            ${paso === 0 ? 'invisible' : ''}`}
        >
          ← Atrás
        </button>

        {paso < PASOS.length - 1 ? (
          <button
            onClick={() => puedeAvanzar() && setPaso(p => p + 1)}
            className={`px-8 py-3 rounded-lg font-medium transition-all
              ${puedeAvanzar()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Continuar →
          </button>
        ) : (
          <button
            onClick={() => onComplete(datos)}
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
          >
            🚀 Generar mi web
          </button>
        )}
      </div>
    </div>
  )
}