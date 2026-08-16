#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseArguments(argv) {
  const options = {
    output: undefined,
    source: undefined,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--force') {
      options.force = true;
      continue;
    }
    if (argument === '--output' || argument === '--source') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(argument + ' requires a file path.');
      }
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error('Unknown argument: ' + argument);
  }

  return options;
}

function readDefaultOutput() {
  let contents;
  try {
    contents = readFileSync(resolve('.env'), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      throw new Error(
        'SECRETS_FILE_PATH must be defined in .env when --output is omitted.',
      );
    }
    throw error;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*SECRETS_FILE_PATH\s*=\s*(.*?)\s*$/);
    if (!match) {
      continue;
    }

    let value = match[1];
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (value) {
      return value;
    }
  }

  throw new Error(
    'SECRETS_FILE_PATH must be defined in .env when --output is omitted.',
  );
}

function readSource(sourcePath) {
  if (!sourcePath) {
    return {};
  }

  const parsed = JSON.parse(readFileSync(resolve(sourcePath), 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The source secrets file must contain a JSON object.');
  }
  return parsed;
}

function optionalString(source, name) {
  const value = source[name];
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(name + ' must be a string.');
  }
  return value;
}

function decodedKey(value, name) {
  if (typeof value !== 'string') {
    throw new Error(name + ' must be a Base64-encoded 32-byte key.');
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== value) {
    throw new Error(name + ' must be a Base64-encoded 32-byte key.');
  }
  return decoded;
}

function generateUniqueKey(existing) {
  for (;;) {
    const candidate = randomBytes(32);
    if (!existing.some((key) => key.equals(candidate))) {
      existing.push(candidate);
      return candidate.toString('base64');
    }
  }
}

function collectKeyring(source, activeName, keysName, defaultKeyId, existing) {
  const activeKeyId = source[activeName];
  const rawKeys = source[keysName];
  if (activeKeyId === undefined && rawKeys === undefined) {
    return {
      activeKeyId: defaultKeyId,
      keys: { [defaultKeyId]: generateUniqueKey(existing) },
    };
  }
  if (
    typeof activeKeyId !== 'string' ||
    !rawKeys ||
    typeof rawKeys !== 'object' ||
    Array.isArray(rawKeys) ||
    !(activeKeyId in rawKeys)
  ) {
    throw new Error(
      activeName + ' and ' + keysName + ' must define a complete keyring.',
    );
  }

  for (const [keyId, value] of Object.entries(rawKeys)) {
    const key = decodedKey(value, keysName + '.' + keyId);
    if (existing.some((other) => other.equals(key))) {
      throw new Error('Authentication keys must use independent key material.');
    }
    existing.push(key);
  }
  return { activeKeyId, keys: rawKeys };
}

function buildSecrets(source) {
  const sourceJwtSecret = optionalString(source, 'JWT_SECRET');
  const jwtSecret = sourceJwtSecret ?? randomBytes(48).toString('base64url');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  const existingKeys = [Buffer.from(jwtSecret, 'utf8')];
  const decodedJwt = Buffer.from(jwtSecret, 'base64');
  if (decodedJwt.toString('base64') === jwtSecret) {
    existingKeys.push(decodedJwt);
  }
  const encryption = collectKeyring(
    source,
    'TOTP_ENCRYPTION_ACTIVE_KEY_ID',
    'TOTP_ENCRYPTION_KEYS',
    'enc-v1',
    existingKeys,
  );
  const recovery = collectKeyring(
    source,
    'RECOVERY_HMAC_ACTIVE_KEY_ID',
    'RECOVERY_HMAC_KEYS',
    'recovery-v1',
    existingKeys,
  );

  let throttleKey = source.AUTH_THROTTLE_HMAC_KEY;
  if (throttleKey === undefined) {
    throttleKey = generateUniqueKey(existingKeys);
  } else {
    const decoded = decodedKey(throttleKey, 'AUTH_THROTTLE_HMAC_KEY');
    if (existingKeys.some((key) => key.equals(decoded))) {
      throw new Error('Authentication keys must use independent key material.');
    }
  }

  const mongoUri = optionalString(source, 'MONGO_URI');
  const mongoUser = optionalString(source, 'MONGO_USER');
  const mongoPassword = optionalString(source, 'MONGO_PASSWORD');

  return {
    ...(mongoUri === undefined ? {} : { MONGO_URI: mongoUri }),
    ...(mongoUser === undefined ? {} : { MONGO_USER: mongoUser }),
    ...(mongoPassword === undefined ? {} : { MONGO_PASSWORD: mongoPassword }),
    JWT_SECRET: jwtSecret,
    TOTP_ENCRYPTION_ACTIVE_KEY_ID: encryption.activeKeyId,
    TOTP_ENCRYPTION_KEYS: encryption.keys,
    RECOVERY_HMAC_ACTIVE_KEY_ID: recovery.activeKeyId,
    RECOVERY_HMAC_KEYS: recovery.keys,
    AUTH_THROTTLE_HMAC_KEY: throttleKey,
  };
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const outputPath = resolve(options.output ?? readDefaultOutput());
  const secrets = buildSecrets(readSource(options.source));
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  writeFileSync(outputPath, JSON.stringify(secrets, null, 2) + '\n', {
    encoding: 'utf8',
    flag: options.force ? 'w' : 'wx',
    mode: 0o600,
  });
  chmodSync(outputPath, 0o600);
  process.stdout.write('Secrets file created at ' + outputPath + '.\n');
}

try {
  main();
} catch (error) {
  if (error && typeof error === 'object' && error.code === 'EEXIST') {
    process.stderr.write(
      'The output secrets file already exists; use --force only for an intentional rotation.\n',
    );
  } else {
    process.stderr.write(
      (error instanceof Error ? error.message : 'Unable to generate secrets.') +
        '\n',
    );
  }
  process.exitCode = 1;
}
