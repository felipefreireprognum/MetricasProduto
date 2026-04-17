import { spawn } from 'child_process';
import path from 'path';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const apiDir = path.resolve(process.cwd(), '..');

  const uvicorn = spawn('uvicorn', ['api:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: apiDir,
    stdio: 'pipe',
    shell: true,
  });

  uvicorn.stdout?.on('data', (d: Buffer) => {
    process.stdout.write(`[api] ${d}`);
  });

  uvicorn.stderr?.on('data', (d: Buffer) => {
    process.stderr.write(`[api] ${d}`);
  });

  uvicorn.on('error', (err: Error) => {
    console.error('[api] Falha ao iniciar uvicorn:', err.message);
  });

  // Aguarda a API ficar pronta (até 15s)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  await waitForApi(apiUrl, 15000);
}

async function waitForApi(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/tabelas?login=_probe&senha=_probe&ambiente=_probe`);
      if (res.status !== 500 || res.status === 200) return;
    } catch {
      // ainda não está pronto
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}
