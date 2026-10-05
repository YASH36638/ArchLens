import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

/** See apps/api/src/database/neon-ws.ts — same corporate TLS workaround. */
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
