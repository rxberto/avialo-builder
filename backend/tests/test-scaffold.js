import { scaffoldProject } from '../src/scaffolding/scaffold.js';

console.log('🧪 Probando scaffolding...\n');

const casos = [
  {
    clienteId: 'test-corp-001',
    datos: {
      webType: 'corporativa',
      businessName: 'Fontanería García',
      sector: 'Fontanería',
      city: 'Madrid',
      primaryColor: '#1D9E75',
      pages: ['Inicio', 'Servicios', 'Contacto'],
    }
  },
  {
    clienteId: 'test-din-001',
    datos: {
      webType: 'dinamica',
      businessName: 'Restaurante Casa Paco',
      sector: 'Restaurante',
      city: 'Barcelona',
      primaryColor: '#E24B4A',
      pages: ['Inicio', 'Carta', 'Eventos', 'Reservas', 'Contacto'],
    }
  },
  {
    clienteId: 'test-eco-001',
    datos: {
      webType: 'ecommerce',
      businessName: 'Tienda Moda Elena',
      sector: 'Moda',
      city: 'Valencia',
      primaryColor: '#378ADD',
      pages: ['Inicio', 'Tienda', 'Sobre nosotros', 'Contacto'],
    }
  },
];

for (const caso of casos) {
  const result = await scaffoldProject(caso.clienteId, caso.datos);
  console.log(`${result.success ? '✅' : '⚠️ '} ${caso.clienteId} → ${result.success ? result.dominio : result.reason}\n`);
}