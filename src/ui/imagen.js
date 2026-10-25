// Una imagen que solo se ve cuando ha cargado: las que todavía no existen no enseñan el icono de imagen rota del navegador.
// (La hoja de estilos oculta las «por-cargar»; ver public/tablero.css.) Las imágenes están en public/visuales/.
import { html, useState } from './preact.js';

export const BASE = 'visuales/';

export function Imagen({ src, clase = '', alt = '' }) {
  const [lista, setLista] = useState(false);
  return html`<img class=${`${clase} ${lista ? 'cargada' : 'por-cargar'}`} src=${src} alt=${alt} onLoad=${() => setLista(true)} onError=${() => setLista(false)} />`;
}
