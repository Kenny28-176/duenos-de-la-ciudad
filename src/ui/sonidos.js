// El banco de sonidos (public/sonidos.html): una página para oír, uno a uno, todos los sonidos de la partida. Sirve para ajustarlos
// (si alguno es muy fuerte, muy agudo o molesta) sin tener que jugar una partida entera. ?idioma=en la pone en inglés.
import { iniciarIdioma, t } from '../i18n/idioma.js';
import { html, render, useState } from './preact.js';
import { SONIDOS, crearSonido } from './sonido.js';

const parametros = new URLSearchParams(location.search);
const { idioma } = await iniciarIdioma(parametros.get('idioma') ? { idioma: parametros.get('idioma') } : {});
document.documentElement.lang = idioma;
document.title = t('sonidos.titulo');

const sonido = crearSonido();
const IDS = Object.keys(SONIDOS);
// Los sonidos que dependen de lo que pasa se prueban con un caso típico.
const CASO = { pasos: { n: 5, cada: 0.17 }, puja: { n: 2 }, cobro: { n: 3 }, pago: { n: 3 }, construir: { torre: true } };
const espera = ms => new Promise(listo => setTimeout(listo, ms));

async function oir(id) {
  await sonido.activar();
  sonido.reproducir(id, { ...CASO[id], escala: 1 });
}

function Banco() {
  const [volumen, setVolumen] = useState(sonido.estado().volumen);
  const [sonando, setSonando] = useState(false);
  const todos = async () => {
    setSonando(true);
    for (const id of IDS) {
      await oir(id);
      await espera(1700);
    }
    setSonando(false);
  };
  return html`<main class="banco">
    <h1>${t('sonidos.titulo')}</h1>
    <p>${t('sonidos.texto')}</p>
    <div class="barra-banco">
      <label>${t('sonidos.volumen')}
        <input type="range" min="0" max="1" step="0.05" value=${volumen} onInput=${e => { setVolumen(Number(e.target.value)); sonido.volumen(Number(e.target.value)); }} />
      </label>
      <button type="button" class="boton principal" disabled=${sonando} onClick=${todos}>${t('sonidos.todos')}</button>
    </div>
    <ul>${IDS.map(id => html`<li key=${id}><button type="button" class="boton" onClick=${() => oir(id)}><b>${id}</b><small>${t(`sonidos.${id}`)}</small></button></li>`)}</ul>
  </main>`;
}

if (parametros.has('depurar')) window.duenos = { sonido };
render(html`<${Banco} />`, document.getElementById('app'));
