// Traduce mensajes de error de Supabase Auth (en ingles) al espanol.
//
// Supabase devuelve errores en ingles tipo "Email not confirmed",
// "Invalid login credentials", etc. Mostrar eso en una UI espanola
// es feo y confuso para el usuario final. Esta capa traduce los
// mensajes mas comunes y deja un fallback generico para los que no
// reconocemos.
//
// Uso:
//   const { error } = await supabase.auth.signInWithPassword(...);
//   if (error) setMessage(translateAuthError(error));

type AuthErrorLike = { message?: string; code?: string; status?: number } | null | undefined;

// Mapeo de patrones (substring case-insensitive) a mensajes en espanol.
// El orden importa: el primero que matchea gana, asi que ponemos los
// patrones mas especificos arriba.
const ERROR_TRANSLATIONS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /email not confirmed/i,
    message: 'Confirma tu correo primero. Te enviamos un link al registrarte — revisa tu bandeja (y la carpeta de spam).',
  },
  {
    pattern: /invalid login credentials/i,
    message: 'Correo o contrasena incorrectos. Si acabas de registrarte, confirma el correo primero.',
  },
  {
    pattern: /user already registered|already exists/i,
    message: 'Ese correo ya tiene una cuenta. Intenta entrar o usa otro correo.',
  },
  {
    pattern: /password should be at least (\d+) characters/i,
    message: 'La contrasena es muy corta. Debe tener al menos 6 caracteres.',
  },
  {
    pattern: /password.*weak|weak.*password/i,
    message: 'La contrasena es muy debil. Usa al menos 6 caracteres con una mezcla de letras y numeros.',
  },
  {
    pattern: /email rate limit exceeded|too many requests|rate limit/i,
    message: 'Demasiados intentos en poco tiempo. Espera unos minutos antes de volver a intentar.',
  },
  {
    pattern: /invalid email|email.*invalid/i,
    message: 'El correo no es valido. Revisa que este bien escrito.',
  },
  {
    pattern: /user not found/i,
    message: 'No encontramos una cuenta con ese correo. Registrate primero.',
  },
  {
    pattern: /(token|otp|email link).*(invalid|expired|used)|(invalid|expired|used).*(token|otp|email link)/i,
    message: 'El link no es valido o ya fue usado. Vuelve a registrarte o solicita uno nuevo.',
  },
  {
    pattern: /signup.*disabled|registration.*disabled/i,
    message: 'El registro esta temporalmente deshabilitado. Intenta de nuevo en unos minutos.',
  },
  {
    pattern: /error sending.*email/i,
    message: 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.',
  },
  {
    pattern: /captcha/i,
    message: 'La verificacion de seguridad fallo. Recarga la pagina y vuelve a intentar.',
  },
  {
    pattern: /network|fetch failed|failed to fetch/i,
    message: 'No pudimos conectar al servidor. Revisa tu internet y vuelve a intentar.',
  },
  {
    pattern: /not authorized|unauthorized/i,
    message: 'No tienes permiso para esta accion. Si acabas de registrarte, confirma tu correo.',
  },
  {
    pattern: /phone.*invalid|invalid.*phone/i,
    message: 'El numero de WhatsApp no es valido. Usa formato 300 000 0000.',
  },
];

/**
 * Traduce un error de Supabase Auth al espanol.
 * Si no reconoce el mensaje, devuelve un fallback generico.
 */
export function translateAuthError(error: AuthErrorLike | string): string {
  if (!error) return 'Ocurrio un error inesperado. Intenta de nuevo.';
  const raw = typeof error === 'string' ? error : error.message;
  if (!raw) return 'Ocurrio un error inesperado. Intenta de nuevo.';

  for (const { pattern, message } of ERROR_TRANSLATIONS) {
    if (pattern.test(raw)) return message;
  }
  // Fallback: devolvemos un mensaje generico amigable. NO mostramos el raw
  // en ingles porque confunde al usuario final. Si el dev necesita debug,
  // lo encuentra en console.
  if (typeof console !== 'undefined') {
    // Logueamos el raw para que el dev pueda agregar una traduccion nueva
    // si el patron se vuelve frecuente.
    console.warn('[translateAuthError] mensaje no traducido:', raw);
  }
  return 'No pudimos completar la accion. Intenta de nuevo o contactanos por WhatsApp.';
}
