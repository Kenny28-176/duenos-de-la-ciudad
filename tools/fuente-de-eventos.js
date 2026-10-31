// Un EventSource para Node (los navegadores ya lo traen): lo que usa src/net/firebase.js para escuchar a Firebase, para las pruebas
// y para tools/comprobar-reglas.js. Lee con fetch los eventos del servidor («event:», «data:» y una línea en blanco) y los reparte
// por su tipo. Se porta como el del navegador: si se corta la conexión, lo vuelve a intentar solo (readyState 0, CONNECTING); si el
// servidor contesta con un error o con otro tipo de contenido (un 401, por ejemplo), se rinde (readyState 2, CLOSED).
export class FuenteDeEventos {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url, { reintento = 300, peticion = (...a) => fetch(...a) } = {}) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onerror = null;
    this.reintento = reintento;
    this.peticion = peticion;
    this.oyentes = new Map();
    this.control = null;
    this.relojReintento = null;
    this.conectar();
  }

  addEventListener(tipo, oyente) {
    if (!this.oyentes.has(tipo)) this.oyentes.set(tipo, new Set());
    this.oyentes.get(tipo).add(oyente);
  }

  removeEventListener(tipo, oyente) { this.oyentes.get(tipo)?.delete(oyente); }

  close() {
    this.readyState = 2;
    clearTimeout(this.relojReintento);
    this.control?.abort();
  }

  async conectar() {
    this.control = new AbortController();
    let respuesta;
    try {
      respuesta = await this.peticion(this.url, { headers: { Accept: 'text/event-stream' }, signal: this.control.signal });
    } catch {
      this.perdida();
      return;
    }
    if (this.readyState === 2) return;
    if (!respuesta.ok || !(respuesta.headers.get('content-type') ?? '').includes('text/event-stream')) {
      this.readyState = 2;
      respuesta.body?.cancel().catch(() => {});
      this.onerror?.({ type: 'error', status: respuesta.status });
      return;
    }
    this.readyState = 1;
    this.onopen?.({ type: 'open' });
    try {
      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let pendiente = '';
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        pendiente = (pendiente + decodificador.decode(value, { stream: true })).replace(/\r\n?/g, '\n');
        let corte;
        while ((corte = pendiente.indexOf('\n\n')) >= 0) {
          const bloque = pendiente.slice(0, corte);
          pendiente = pendiente.slice(corte + 2);
          let tipo = 'message';
          const datos = [];
          for (const linea of bloque.split('\n')) {
            if (!linea || linea.startsWith(':')) continue;
            const dos = linea.indexOf(':');
            const campo = dos < 0 ? linea : linea.slice(0, dos);
            const valor = dos < 0 ? '' : linea.slice(dos + 1).replace(/^ /, '');
            if (campo === 'event') tipo = valor;
            else if (campo === 'data') datos.push(valor);
          }
          if (!datos.length) continue;
          if (this.readyState === 2) return;
          for (const oyente of [...(this.oyentes.get(tipo) ?? [])]) oyente({ type: tipo, data: datos.join('\n') });
        }
      }
    } catch { /* la conexión se ha cortado */ }
    this.perdida();
  }

  perdida() {
    if (this.readyState === 2) return;
    this.readyState = 0;
    this.onerror?.({ type: 'error' });
    if (this.readyState === 2) return; // quien escucha la ha cerrado al enterarse
    this.relojReintento = setTimeout(() => this.conectar(), this.reintento);
  }
}
