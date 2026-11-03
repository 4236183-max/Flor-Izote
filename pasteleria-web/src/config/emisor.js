// Datos del emisor que aparecen en la factura. Configúralos con variables de entorno EMISOR_*.
// Mientras no registres el negocio ante el Ministerio de Hacienda, NIT y NRC son de ejemplo.
module.exports = {
  nombre: process.env.EMISOR_NOMBRE || 'Flor de Izote (contribuyente por registrar)',
  nombreComercial: 'Flor de Izote',
  nit: process.env.EMISOR_NIT || '0000-000000-000-0 (ejemplo)',
  nrc: process.env.EMISOR_NRC || '000000-0 (ejemplo)',
  actividad: process.env.EMISOR_ACTIVIDAD || 'Elaboración de productos de panadería y pastelería',
  direccion: process.env.EMISOR_DIRECCION || 'Calle Principal, Barrio San Sebastián, Apopa, San Salvador',
  telefono: process.env.EMISOR_TELEFONO || '+503 7000 0000',
  correo: process.env.EMISOR_CORREO || 'hola@flordeizote.example',
  establecimiento: 'M001',   // código de establecimiento
  puntoVenta: 'P001',        // código de punto de venta
  tipoEstablecimiento: 'Casa matriz',
  iva: 0.13,
};
// Estructura del Número de Control (DTE tipo 01). Hacienda modificó esta estructura en oct-2026:
// verifica la Normativa de Cumplimiento vigente en factura.gob.sv y ajusta aquí si cambia.
module.exports.numeroControl = (n) =>
  `DTE-01-${module.exports.establecimiento}${module.exports.puntoVenta}-${String(n).padStart(15, '0')}`;
