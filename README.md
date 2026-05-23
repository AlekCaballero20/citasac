# Citas con Cata

App privada para Alek y Cata. Sirve para guardar ideas de citas, marcar qué hicieron, calificar planes, saber hace cuánto no repiten algo y recibir sugerencias cuando pensar ya parece deporte extremo.

## Funciones incluidas

- Login con Google.
- Acceso limitado por correo a:
  - `alekcaballeromusic@gmail.com`
  - `catalina.medina.leal@gmail.com`
- Ideas de planes con categoría, presupuesto, energía, duración, frecuencia sugerida, lugar, etiquetas y descripción.
- Botón `Sorpréndanos` para elegir una idea recomendada según filtros, frecuencia, favoritos y planes olvidados.
- Registro de planes realizados con fecha, calificación, mood, costo y nota.
- Historial de recuerdos.
- Ideas base precargables.
- Filtros por vista, categoría, energía, presupuesto y búsqueda.
- PWA básica con service worker.
- Diseño claro, cálido y responsive.

## Estructura

```txt
citas-con-cata/
├─ index.html
├─ styles.css
├─ manifest.webmanifest
├─ sw.js
├─ firebase.json
├─ firestore.rules
├─ assets/
│  └─ icon.svg
└─ src/
   ├─ app.js
   ├─ config.js
   ├─ firebase.js
   └─ utils.js
```

## Configuración Firebase

1. Crear un proyecto en Firebase.
2. Crear una app web dentro del proyecto.
3. Activar Authentication > Sign-in method > Google.
4. Crear Firestore Database.
5. Abrir `src/config.js` y reemplazar los valores `PEGA_AQUI...` por la configuración real del SDK web.
6. Copiar el contenido de `firestore.rules` en Firestore > Rules, o desplegar con Firebase CLI.

## Reglas de Firestore

Las reglas incluidas permiten leer y escribir solamente a los dos correos autorizados dentro de:

```txt
couples/alek-cata/...
```

Si quieren cambiar los correos o el id de pareja, editen ambos archivos:

- `src/config.js`
- `firestore.rules`

## Correr localmente

Por ser módulos ES, no abras el HTML directo con doble clic. Usa servidor local:

```bash
python -m http.server 5500
```

Luego abre:

```txt
http://localhost:5500
```

También sirve con Live Server de VS Code.

## Publicar en GitHub Pages

1. Subir todo el contenido de esta carpeta a un repositorio.
2. En GitHub: Settings > Pages.
3. Source: Deploy from branch.
4. Branch: main / root.
5. En Firebase Authentication, agregar el dominio de GitHub Pages en Authorized domains.

## Publicar con Firebase Hosting

Instala Firebase CLI y ejecuta:

```bash
firebase login
firebase init hosting firestore
firebase deploy
```

El archivo `firebase.json` ya deja una configuración base.

## Personalización rápida

Todo lo más editable está en `src/config.js`:

- Nombre de la app.
- Correos autorizados.
- Categorías.
- Niveles de presupuesto.
- Niveles de energía.
- Ideas base.

## Notas de mantenimiento

- Si cambias mucho la app y el celular queda mostrando una versión vieja, sube la versión en `sw.js` cambiando `APP_VERSION`.
- No guardes datos sensibles innecesarios en las notas. Es una app privada, sí, pero igual la nube no es un diario con candado de Hello Kitty.
