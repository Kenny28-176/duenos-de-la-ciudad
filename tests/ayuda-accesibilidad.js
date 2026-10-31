// Ayuda para las pruebas con Chrome (no es una prueba: no acaba en .test.js). Revisa en la página lo básico de la accesibilidad, lo
// que un lector de pantalla necesita para no perderse:
//   - cada botón y cada enlace visibles tienen un nombre que se pueda leer (su texto, aria-label, aria-labelledby o title);
//   - cada campo (input, select, textarea) tiene su etiqueta;
//   - cada imagen tiene «alt» (vacío si es decorativa: el nombre ya está escrito al lado);
//   - no hay ids repetidos (los aria-labelledby apuntarían al que no es);
//   - la página dice en qué idioma está.
// Devuelve la lista de problemas (vacía si todo está bien).
export const revisarAccesibilidad = pestana => pestana.eval(() => {
  const problemas = [];
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const nombre = el => {
    const etiquetadoPor = el.getAttribute('aria-labelledby');
    return (el.getAttribute('aria-label') || (etiquetadoPor && document.getElementById(etiquetadoPor)?.textContent) || el.textContent
      || el.getAttribute('title') || '').trim();
  };
  for (const boton of document.querySelectorAll('button, a[href], [role="button"]')) {
    if (visible(boton) && !nombre(boton)) problemas.push(`un botón sin nombre: ${boton.outerHTML.slice(0, 140)}`);
  }
  for (const campo of document.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
    const etiqueta = campo.closest('label') || campo.getAttribute('aria-label') || campo.getAttribute('aria-labelledby')
      || (campo.id && document.querySelector(`label[for="${campo.id}"]`));
    if (!etiqueta) problemas.push(`un campo sin etiqueta: ${campo.outerHTML.slice(0, 140)}`);
  }
  for (const imagen of document.querySelectorAll('img')) if (!imagen.hasAttribute('alt')) problemas.push(`una imagen sin alt: ${imagen.getAttribute('src')}`);
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
  for (const id of new Set(ids.filter((id, k) => ids.indexOf(id) !== k))) problemas.push(`un id repetido: ${id}`);
  if (!document.documentElement.lang) problemas.push('la página no dice en qué idioma está');
  return problemas;
});
