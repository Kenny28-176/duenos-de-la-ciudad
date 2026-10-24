# Dependencias locales (`public/vendor/`)

Este directorio contiene las bibliotecas de JavaScript y las tipografías que utiliza la interfaz web de
**Dueños de la Ciudad**.

Todo el código y los recursos de esta carpeta se alojan localmente en el repositorio para garantizar que la web
funcione de manera autónoma, sin depender de servidores o CDNs externos, sin paso de compilación adicional y
garantizando la privacidad de los jugadores.

## Contenido

| Identificador | Biblioteca / Recurso | Versión | Licencia | Archivos |
|---|---|---|---|---|
| `preact` | **htm + Preact (standalone)** | htm 3.1.1 / Preact 10 | Apache-2.0 / MIT | `preact/standalone.module.js`, licencias |
| `qrcode` | **qrcode-generator** | 1.4.4 | MIT | `qrcode/qrcode.js`, licencia |
| `fuentes` | **Fraunces e Inter** | Fraunces 600..700 / Inter 400..700 | SIL Open Font License 1.1 | Archivos `.woff2`, `fuentes.css`, licencias |

## Integridad y reglas

- **No modificar:** Los archivos contenidos en estas subcarpetas no deben editarse a mano.
- **Verificación:** La lista completa de archivos, tamaños y huellas criptográficas SHA-256 está registrada en
  [`vendor.json`](vendor.json).
- **Comprobación:** Para comprobar que los archivos locales coinciden con su huella registrada:
  ```bash
  node tools/vendor.js --comprobar
  ```
- **Actualización:** Para volver a descargar y sincronizar los archivos:
  ```bash
  node tools/vendor.js
  ```
