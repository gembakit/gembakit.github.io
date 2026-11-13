// Identificador de cliente de Google (proyecto "Gemba Kit" en Google Cloud,
// cuenta del dueño). Es público por diseño: puede estar en el repositorio.
// NUNCA guardes aquí un secreto de cliente: la app no lo necesita.
export const GOOGLE_CLIENT_ID = '885678684671-fq10d25emlb80i2dmen8bblpu3ji6pjc.apps.googleusercontent.com';

// Permisos mínimos (PLAN.md, 4.3): solo los archivos que crea la propia app y
// su carpeta oculta de datos. Nunca acceso a todo el Drive.
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
] as const;
