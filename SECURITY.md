# Seguridad

## Cómo avisar de un fallo de seguridad

**No abras un issue público** con los detalles. Usa el aviso privado de GitHub:
[Informar de una vulnerabilidad](https://github.com/Kenny28-176/duenos-de-la-ciudad/security/advisories/new). Solo lo
ve el equipo mantenedor.

Cuéntanos qué has encontrado, cómo reproducirlo y qué impacto tiene. Responderemos lo antes posible.

## Cómo estará protegido el juego

El modo con celulares llegará en la fase 3. Este es el diseño previsto:

- La `apiKey` de Firebase que verás en el código **es pública por diseño**: identifica el proyecto, no es una
  contraseña.
- Lo que protege los datos son las **reglas** de la base de datos y el **inicio de sesión anónimo**:
  - cada dispositivo tiene un identificador;
  - solo el tablero puede escribir la partida;
  - cada celular solo puede enviar sus propias acciones.
- Restringir la clave a un dominio **no basta por sí solo** para proteger Realtime Database. Junto con el inicio de
  sesión, sí impide que otras webs usen la base del proyecto.
- El juego está pensado para **grupos de amigos**. No se blinda contra quien abra las herramientas de desarrollo del
  navegador, pero ningún celular puede cambiar el dinero, porque solo lo escribe el tablero.

## Qué nos interesa

- Una forma de escribir en la base de datos lo que las reglas deberían rechazar.
- Una forma de que un celular haga lo que solo debería poder hacer el tablero, por ejemplo cambiar su dinero.
- Código que cargue contenido de servidores externos o ejecute código ajeno.
- Cualquier fuga de datos personales.

## Si alojas tu propia copia

Eres responsable de tu proyecto de Firebase:

- publica las reglas del repositorio;
- activa el inicio de sesión anónimo;
- restringe la clave de API a tu dominio;
- no cambies al plan de pago sin configurar alertas de presupuesto;
- revisa de vez en cuando el uso en la consola.
