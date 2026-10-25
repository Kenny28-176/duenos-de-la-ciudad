// El código QR de una dirección, como SVG, con la biblioteca de public/vendor/qrcode/qrcode.js (que define window.qrcode y
// se carga con una etiqueta <script> en la página). Si la biblioteca no está, no devuelve nada.
export function svgDeQr(texto, { margen = 2 } = {}) {
  const crear = globalThis.qrcode;
  if (typeof crear !== 'function') return '';
  const qr = crear(0, 'M');
  qr.addData(String(texto));
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: margen, scalable: true });
}
