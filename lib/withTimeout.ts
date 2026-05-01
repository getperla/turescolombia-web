/**
 * Envuelve una promesa con un timeout. Si la promesa no resuelve antes
 * del deadline, rechaza con TimeoutError.
 *
 * Uso tipico: rodear un fetch al backend para no dejar al usuario
 * esperando indefinidamente cuando el servidor esta colgado.
 *
 * Importante: el timeout NO cancela la operacion subyacente (el fetch
 * sigue ocurriendo en background). Solo evita que la UI quede bloqueada
 * esperando una respuesta que quizas nunca llega.
 */

export class TimeoutError extends Error {
  readonly ms: number;
  constructor(ms: number) {
    super(`Operacion excedio el timeout de ${ms}ms`);
    this.name = 'TimeoutError';
    this.ms = ms;
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (value) => { clearTimeout(t); resolve(value); },
      (error) => { clearTimeout(t); reject(error); },
    );
  });
}

export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof TimeoutError || (err as any)?.name === 'TimeoutError';
}
