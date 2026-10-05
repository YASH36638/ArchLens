import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

/**
 * Corporate SSL inspection (e.g. CrowdStrike / MITM proxy) often breaks
 * Neon's WSS handshake with UNABLE_TO_GET_ISSUER_CERT_LOCALLY.
 * Opt out with ARCHLENS_TLS_INSECURE=0 when using a clean trust store.
 */
export function configureNeonWebSocket(): void {
  const insecure = process.env.ARCHLENS_TLS_INSECURE !== '0';

  if (!insecure) {
    neonConfig.webSocketConstructor = ws;
    return;
  }

  neonConfig.webSocketConstructor = class NeonWs extends ws {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols as never, { rejectUnauthorized: false });
    }
  } as unknown as typeof ws;
}
