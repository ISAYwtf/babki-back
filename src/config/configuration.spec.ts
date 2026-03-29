import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds mongo uri from secrets file parts', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'babki-config-'));
    const secretsPath = join(tempDir, 'secrets.json');

    writeFileSync(
      secretsPath,
      JSON.stringify({
        MONGO_HOST: '127.0.0.1',
        MONGO_PORT: 27018,
        MONGO_USER: 'finance-user',
        MONGO_PASSWORD: 'strong-pass',
        MONGO_AUTH_SOURCE: 'admin',
      }),
    );

    process.env.PORT = '3010';
    process.env.API_PREFIX = 'api/v1';
    process.env.MONGO_DB_NAME = 'finance-db';
    process.env.SECRETS_FILE_PATH = relative(process.cwd(), secretsPath);

    const result = configuration();

    expect(result.app.port).toBe(3010);
    expect(result.mongo.uri).toBe(
      'mongodb://finance-user:strong-pass@127.0.0.1:27018/finance-db?authSource=admin',
    );

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('prefers a full mongo uri when provided in secrets', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'babki-config-'));
    const secretsPath = join(tempDir, 'secrets.json');

    writeFileSync(
      secretsPath,
      JSON.stringify({
        MONGO_URI: 'mongodb://localhost:27017/custom-db',
      }),
    );

    process.env.MONGO_DB_NAME = 'ignored-db-name';
    process.env.SECRETS_FILE_PATH = relative(process.cwd(), secretsPath);

    const result = configuration();

    expect(result.mongo.uri).toBe('mongodb://localhost:27017/custom-db');

    rmSync(tempDir, { recursive: true, force: true });
  });
});
