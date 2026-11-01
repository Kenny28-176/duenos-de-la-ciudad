// La configuración web del proyecto de Firebase del juego (docs/FIREBASE.md, paso 4: el bloque «firebaseConfig»). No es secreta: la
// ve cualquiera que abra la web, y lo que protege la base de datos son sus reglas (database.rules.json) y el inicio de sesión
// anónimo. Solo hacen falta apiKey y databaseURL.
//
// Con null no se puede jugar por internet; sí en casa, con el servidor de la laptop (node tools/serve.js).
export const configuracionFirebase = {
  apiKey: 'AIzaSyAI1Jmgaijh0gHrKhtb6cZJrTkDQ0ipqHo',
  authDomain: 'duenos-de-la-ciudad.firebaseapp.com',
  databaseURL: 'https://duenos-de-la-ciudad-default-rtdb.firebaseio.com',
  projectId: 'duenos-de-la-ciudad',
};
