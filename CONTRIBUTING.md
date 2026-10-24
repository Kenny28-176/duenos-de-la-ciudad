# Cómo colaborar

¡Gracias por querer ayudar! El proyecto está en sus primeras fases, así que ahora lo que más ayuda es esto:

- **ideas y opiniones sobre las reglas** ([`docs/DISENO.md`](docs/DISENO.md));
- cuando haya algo jugable, **partidas de prueba**.

## Antes de empezar

- El idioma del proyecto es el **español**: textos, comentarios, commits e issues. Las traducciones son bienvenidas.
- Lee las **reglas de contenido** de [`CLAUDE.md`](CLAUDE.md#reglas-de-contenido-importante) y el
  [código de conducta](CODE_OF_CONDUCT.md).

## Contenido original (muy importante)

- No copies textos, imágenes, tableros, nombres ni reglamentos de juegos comerciales, ni de ningún otro sitio.
- No uses nombres de marcas de terceros en la interfaz, los textos, la documentación ni los nombres de archivo.
- Las cifras de la economía salen de las fórmulas del diseño, no de tablas de otros juegos.
- La prueba `tests/marcas.test.js` busca palabras prohibidas en todo el repositorio. Si crees que falta alguna,
  añádela codificada en base64:

  ```
  node -e "console.log(Buffer.from('texto').toString('base64'))"
  ```

## Proponer ideas o avisar de fallos

Abre un [issue](https://github.com/Kenny28-176/duenos-de-la-ciudad/issues/new/choose) con la plantilla que
corresponda. Para fallos de seguridad, usa el aviso privado (ver [SECURITY.md](SECURITY.md)).

## Preparar el entorno

1. Instala [Node.js](https://nodejs.org/) 22 o posterior y [Git](https://git-scm.com/).
2. Haz un fork del repositorio y clónalo.
3. Ejecuta `npm test`. No hay dependencias que instalar.
4. Para ver la web, ejecuta `node tools/serve.js` y abre `http://localhost:8080/public/`.

## Commits y pull requests

- Haz cambios pequeños, con un mensaje claro en español: «Añade la subasta», no «cambios».
- Comprueba que `npm test` esté en verde antes de abrir el pull request.
- Si cambias una regla, actualiza `docs/DISENO.md` y sus pruebas.
- Rellena la plantilla del pull request.
