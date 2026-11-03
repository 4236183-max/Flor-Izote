// Monto en letras (USD) para la factura. Ej.: 18.5 -> "DIECIOCHO 50/100 DÓLARES"
(function (root) {
  const U = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  function menor1000(n) {
    if (n === 100) return 'CIEN';
    let s = C[Math.floor(n / 100)]; const r = n % 100;
    if (r) {
      if (r < 30) s += (s ? ' ' : '') + U[r];
      else { s += (s ? ' ' : '') + D[Math.floor(r / 10)]; if (r % 10) s += ' Y ' + U[r % 10]; }
    }
    return s;
  }
  function entero(n) {
    if (n === 0) return 'CERO';
    const m = Math.floor(n / 1000), r = n % 1000; let s = '';
    if (m) s = m === 1 ? 'MIL' : menor1000(m) + ' MIL';
    if (r) s += (s ? ' ' : '') + menor1000(r);
    return s;
  }
  function aLetras(monto) {
    const c = Math.round(Number(monto) * 100), e = Math.floor(c / 100), cent = String(c % 100).padStart(2, '0');
    return `${entero(e)} ${cent}/100 ${e === 1 ? 'DÓLAR' : 'DÓLARES'}`;
  }
  if (typeof module !== 'undefined') module.exports = aLetras; else root.aLetras = aLetras;
})(this);
