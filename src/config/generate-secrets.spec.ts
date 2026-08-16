import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

describe('generate-secrets', () => {
  const scriptPath = resolve(process.cwd(), 'scripts/generate-secrets.mjs');
  const keyA = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const keyB = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=';
  const keyC = 'AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI=';
  const allowedKeys = [
    'AUTH_THROTTLE_HMAC_KEY',
    'JWT_SECRET',
    'MONGO_PASSWORD',
    'MONGO_URI',
    'MONGO_USER',
    'RECOVERY_HMAC_ACTIVE_KEY_ID',
    'RECOVERY_HMAC_KEYS',
    'TOTP_ENCRYPTION_ACTIVE_KEY_ID',
    'TOTP_ENCRYPTION_KEYS',
  ];

  let tempDir: string;
  let sourcePath: string;
  let outputPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'babki-secrets-'));
    sourcePath = join(tempDir, 'source.json');
    outputPath = join(tempDir, 'generated.json');
    writeFileSync(
      sourcePath,
      JSON.stringify({
        MONGO_HOST: 'legacy.internal',
        JWT_EXPIRES_IN: '99d',
        TOTP_ISSUER: 'Legacy',
        TRUST_PROXY: true,
        JWT_SECRET: 'preserved-jwt-secret-at-least-32-characters',
      }),
    );
  });

  afterEach(() => rmSync(tempDir, { recursive: true, force: true }));

  it('uses SECRETS_FILE_PATH from .env as the default output', () => {
    outputPath = join(tempDir, 'config/secrets/runtime.json');
    writeFileSync(
      join(tempDir, '.env'),
      'SECRETS_FILE_PATH=config/secrets/runtime.json\n',
    );

    const result = run('--source', sourcePath);

    expect(result.status).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).mode & 0o777).toBe(0o600);
  });

  it('writes only whitelisted secrets with independent generated keys', () => {
    const result = run('--source', sourcePath, '--output', outputPath);

    expect(result.status).toBe(0);
    const generated = readGenerated();
    expect(Object.keys(generated).sort()).toEqual(
      allowedKeys.filter((key) => !key.startsWith('MONGO_')).sort(),
    );
    expect(generated.JWT_SECRET).toBe(
      'preserved-jwt-secret-at-least-32-characters',
    );

    const keys = [
      generated.TOTP_ENCRYPTION_KEYS['enc-v1'],
      generated.RECOVERY_HMAC_KEYS['recovery-v1'],
      generated.AUTH_THROTTLE_HMAC_KEY,
    ];
    expect(new Set(keys).size).toBe(3);
    for (const key of keys) {
      expect(Buffer.from(key, 'base64')).toHaveLength(32);
    }
    expect(statSync(outputPath).mode & 0o777).toBe(0o600);

    const output = result.stdout + result.stderr;
    expect(output).not.toContain(generated.JWT_SECRET);
    for (const key of keys) {
      expect(output).not.toContain(key);
    }
  });

  it('preserves supplied Mongo credentials and authentication keys', () => {
    writeFileSync(
      sourcePath,
      JSON.stringify({
        MONGO_USER: 'finance-user',
        MONGO_PASSWORD: 'finance-password',
        JWT_SECRET: 'preserved-jwt-secret-at-least-32-characters',
        TOTP_ENCRYPTION_ACTIVE_KEY_ID: 'enc-v1',
        TOTP_ENCRYPTION_KEYS: { 'enc-v1': keyA },
        RECOVERY_HMAC_ACTIVE_KEY_ID: 'recovery-v1',
        RECOVERY_HMAC_KEYS: { 'recovery-v1': keyB },
        AUTH_THROTTLE_HMAC_KEY: keyC,
      }),
    );

    expect(run('--source', sourcePath, '--output', outputPath).status).toBe(0);

    expect(readGenerated()).toEqual({
      MONGO_USER: 'finance-user',
      MONGO_PASSWORD: 'finance-password',
      JWT_SECRET: 'preserved-jwt-secret-at-least-32-characters',
      TOTP_ENCRYPTION_ACTIVE_KEY_ID: 'enc-v1',
      TOTP_ENCRYPTION_KEYS: { 'enc-v1': keyA },
      RECOVERY_HMAC_ACTIVE_KEY_ID: 'recovery-v1',
      RECOVERY_HMAC_KEYS: { 'recovery-v1': keyB },
      AUTH_THROTTLE_HMAC_KEY: keyC,
    });
  });

  it('refuses overwrite by default and supports explicit force', () => {
    expect(run('--source', sourcePath, '--output', outputPath).status).toBe(0);
    const original = readFileSync(outputPath, 'utf8');

    const refused = run('--source', sourcePath, '--output', outputPath);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain('already exists');
    expect(readFileSync(outputPath, 'utf8')).toBe(original);

    const forced = run(
      '--source',
      sourcePath,
      '--output',
      outputPath,
      '--force',
    );
    expect(forced.status).toBe(0);
    expect(readFileSync(outputPath, 'utf8')).not.toBe(original);
    expect(statSync(outputPath).mode & 0o777).toBe(0o600);
  });

  function run(...args: string[]) {
    return spawnSync(process.execPath, [scriptPath, ...args], {
      cwd: tempDir,
      encoding: 'utf8',
    });
  }

  function readGenerated() {
    return JSON.parse(readFileSync(outputPath, 'utf8')) as {
      AUTH_THROTTLE_HMAC_KEY: string;
      JWT_SECRET: string;
      MONGO_PASSWORD?: string;
      MONGO_URI?: string;
      MONGO_USER?: string;
      RECOVERY_HMAC_ACTIVE_KEY_ID: string;
      RECOVERY_HMAC_KEYS: Record<string, string>;
      TOTP_ENCRYPTION_ACTIVE_KEY_ID: string;
      TOTP_ENCRYPTION_KEYS: Record<string, string>;
    };
  }
});
