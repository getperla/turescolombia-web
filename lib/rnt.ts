// RNT (Registro Nacional de Turismo) validation via API MinCIT
// Plan 4: compliance-dian-rnt-habeas-data (CMP-05, CMP-06)
// Created: 2026-04-27
//
// Valida que un operador tiene RNT activo y vigente. Sin RNT vigente,
// el operador NO puede vender tours legalmente en Colombia (Decreto 945/2014).
//
// API MinCIT no es muy estable. Cachear validacion por 30 dias en
// operators_compliance.rnt_validated_at + rnt_expires_at.
//
// Docs API MinCIT (puede cambiar):
//   https://rnt.confecamaras.co/
//   Endpoint publico: GET /Home/Inicio?numeroRnt=XXXXX

const MINCIT_RNT_API = process.env.MINCIT_RNT_API_URL
  ?? 'https://rntsiturweb.mincit.gov.co/api/rnt/consultar';

export interface RntValidationResult {
  valid: boolean;
  rntNumber: string;
  /** Nombre del establecimiento segun MinCIT */
  operatorName?: string;
  /** Fecha de vigencia del RNT */
  expiresAt?: string;
  /** Razon de invalidez si valid=false */
  reason?: string;
  /** Raw response para debugging (no exponer al cliente) */
  raw?: unknown;
}

interface MincitResponse {
  numeroRnt?: string;
  razonSocial?: string;
  estado?: string;          // 'ACTIVO' | 'INACTIVO' | 'CANCELADO'
  fechaVencimiento?: string;
  categoria?: string;
}

/**
 * Valida un numero RNT contra la API MinCIT.
 *
 * Estrategia:
 *   1. Llamada HTTP con timeout 8s
 *   2. Parse de respuesta
 *   3. Verificar estado === 'ACTIVO' y fechaVencimiento > now
 *
 * Side effects: ninguno. Caller decide si guardar el resultado en DB.
 *
 * @param rntNumber - Numero RNT del operador (ej '12345')
 */
export async function validateRNT(rntNumber: string): Promise<RntValidationResult> {
  if (!rntNumber || !/^\d+$/.test(rntNumber)) {
    return { valid: false, rntNumber, reason: 'RNT debe ser numerico' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${MINCIT_RNT_API}?numero=${encodeURIComponent(rntNumber)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        valid: false,
        rntNumber,
        reason: `MinCIT HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as MincitResponse;

    if (!data.numeroRnt) {
      return {
        valid: false,
        rntNumber,
        reason: 'RNT no encontrado en MinCIT',
        raw: data,
      };
    }

    if (data.estado !== 'ACTIVO') {
      return {
        valid: false,
        rntNumber,
        operatorName: data.razonSocial,
        reason: `Estado RNT: ${data.estado}`,
        raw: data,
      };
    }

    let expiresAtIso: string | undefined;
    if (data.fechaVencimiento) {
      // Formato esperado: dd/mm/yyyy o yyyy-mm-dd. Intentar ambos.
      const dt = parseDate(data.fechaVencimiento);
      if (dt && dt.getTime() > Date.now()) {
        expiresAtIso = dt.toISOString();
      } else {
        return {
          valid: false,
          rntNumber,
          operatorName: data.razonSocial,
          reason: `RNT vencido: ${data.fechaVencimiento}`,
          raw: data,
        };
      }
    }

    return {
      valid: true,
      rntNumber: data.numeroRnt,
      operatorName: data.razonSocial,
      expiresAt: expiresAtIso,
      raw: data,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error';
    return {
      valid: false,
      rntNumber,
      reason: `Network error: ${message}`,
    };
  }
}

function parseDate(value: string): Date | null {
  // dd/mm/yyyy
  const ddmm = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmm) {
    const [, dd, mm, yyyy] = ddmm;
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  }
  // yyyy-mm-dd
  const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return new Date(value);
  }
  return null;
}
