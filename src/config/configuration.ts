import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type SecretsFile = {
  JWT_EXPIRES_IN?: string;
  JWT_SECRET?: string;
  MONGO_AUTH_ENABLED?: boolean;
  MONGO_URI?: string;
  MONGO_HOST?: string;
  MONGO_PORT?: number | string;
  MONGO_USER?: string;
  MONGO_PASSWORD?: string;
  MONGO_AUTH_SOURCE?: string;
};

function readSecretsFile(filePath: string): SecretsFile {
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    return {};
  }

  return JSON.parse(readFileSync(absolutePath, 'utf8')) as SecretsFile;
}

function buildMongoUri(secrets: SecretsFile, databaseName: string): string {
  if (secrets.MONGO_URI) {
    return secrets.MONGO_URI;
  }

  const host = secrets.MONGO_HOST ?? 'localhost';
  const port = secrets.MONGO_PORT ?? '27017';
  const authSource = secrets.MONGO_AUTH_SOURCE ?? 'admin';
  const encodedUser = encodeURIComponent(secrets.MONGO_USER ?? '');
  const encodedPassword = encodeURIComponent(secrets.MONGO_PASSWORD ?? '');

  const mongoAuthEnabled =
    secrets.MONGO_AUTH_ENABLED ??
    Boolean(secrets.MONGO_USER || secrets.MONGO_PASSWORD);

  if (!mongoAuthEnabled) {
    return `mongodb://${host}:${port}/${databaseName}`;
  }

  if (!encodedUser || !encodedPassword) {
    throw new Error(
      'MongoDB configuration is invalid. Provide MONGO_URI or MONGO_USER/MONGO_PASSWORD in the secrets file.',
    );
  }

  return `mongodb://${encodedUser}:${encodedPassword}@${host}:${port}/${databaseName}?authSource=${authSource}`;
}

export default () => {
  const port = Number(process.env.PORT ?? 3000);
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  const secretsFilePath =
    process.env.SECRETS_FILE_PATH ?? 'config/secrets/local.json';
  const databaseName = process.env.MONGO_DB_NAME;

  if (!databaseName) {
    throw new Error(
      'MONGO_DB_NAME must be defined in the environment configuration.',
    );
  }

  const secrets = readSecretsFile(secretsFilePath);
  const jwtSecret = process.env.JWT_SECRET ?? secrets.JWT_SECRET;

  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be defined in the environment or secrets file.',
    );
  }

  return {
    app: {
      port,
      apiPrefix,
      secretsFilePath,
    },
    mongo: {
      dbName: databaseName,
      uri: buildMongoUri(secrets, databaseName),
    },
    jwt: {
      secret: jwtSecret ?? 'local-development-jwt-secret',
      expiresIn: process.env.JWT_EXPIRES_IN ?? secrets.JWT_EXPIRES_IN ?? '60m',
    },
  };
};
