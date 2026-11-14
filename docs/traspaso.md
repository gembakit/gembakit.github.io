# Traspaso de Gemba Kit a otra cuenta

Qué depende de la cuenta del dueño y cómo pasarlo a otra cuenta sin que los
usuarios pierdan nada. Mantener al día cada vez que se añada un servicio.

## Inventario: qué existe y dónde

| Pieza | Dónde | Cuenta actual | Qué identifica |
|---|---|---|---|
| Código | GitHub, repositorio `gemba-kit` | Cuenta de GitHub del dueño (`pasqualebf`) | — |
| Publicación de la app | GitHub Pages | La misma | Dirección `https://pasqualebf.github.io/gemba-kit/` |
| Proyecto de Google Cloud «Gemba Kit» | console.cloud.google.com | Cuenta de Google del dueño | Número de proyecto `885678684671` |
| Cliente de acceso con Google | Dentro de ese proyecto | La misma | Identificador en `src/google/config.ts` |
| APIs activadas | Dentro de ese proyecto | La misma | Drive, Sheets, Slides |
| Pantalla de permiso | Dentro de ese proyecto | La misma | Modo pruebas; usuarios de prueba |
| Facturación | Cuenta de facturación de Google | La misma | Vinculada al proyecto (Google la exigió al crearlo) |
| Datos de cada usuario | Su teléfono (Chrome) y su propio Drive | Cada usuario | — |

## Dos reglas que no se pueden romper

1. **No crear nunca un proyecto de Google Cloud nuevo: traspasar el
   existente.** El permiso de Google que usa la app (`drive.file`) y la
   carpeta oculta (`drive.appdata`) van ligados al proyecto: con un proyecto
   nuevo, la app **dejaría de ver** todos los archivos y copias que creó
   antes en el Drive de cada usuario.
2. **No cambiar la dirección de la app sin avisar.** Los datos del teléfono
   van ligados a la dirección (`pasqualebf.github.io`). Si la app pasa a otra
   dirección, cada usuario tiene que hacer una copia de seguridad en la
   antigua y restaurarla en la nueva. Por eso, **antes de publicar la app
   para otros**, conviene darle un dominio propio (por ejemplo
   `gembakit.app`, unos 10-20 € al año): así la dirección no depende de la
   cuenta de GitHub y un traspaso no la cambia.

## Preparado desde ya

- **Un segundo propietario del proyecto de Google Cloud**: añadir la otra
  cuenta de Google del dueño como propietaria (IAM → «Otorgar acceso» → rol
  «Propietario»). Si se pierde una cuenta, la otra sigue administrando.
- **El identificador del cliente está en un solo sitio**:
  `src/google/config.ts`.
- **Este documento.**

## Cómo traspasar (cuando haga falta)

1. **Google Cloud:** añadir la cuenta nueva como «Propietario» del proyecto
   (IAM). Comprobar que entra y ve todo. Si hay facturación, vincular el
   proyecto a una cuenta de facturación de la cuenta nueva o desvincularla.
   Cambiar el correo de contacto de la pantalla de permiso. Después, quitar
   la cuenta antigua. El proyecto, el cliente y los permisos de los usuarios
   **no cambian**: nadie nota nada.
2. **GitHub:** Settings → «Transfer ownership» del repositorio a la cuenta
   nueva. Con dominio propio, la dirección de la app no cambia (hay que
   volver a configurar el dominio en la cuenta nueva). Sin dominio propio,
   la dirección cambia: ver regla 2.
3. **Dominio (si existe):** pasar el registro del dominio a la cuenta nueva.
4. Revisar este documento y anotar la fecha del traspaso.
