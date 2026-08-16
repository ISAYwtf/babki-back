# Docker build and deployment

## Runtime files

The API always receives exactly two runtime files:

1. '.env' with non-secret settings.
2. The JSON secrets file selected by 'SECRETS_FILE_PATH'.

For Docker Compose, start from the Docker examples:

```bash
cp .env.docker.example .env
npm run secrets:generate
```

The generator reads 'SECRETS_FILE_PATH' from '.env', creates the parent
directory when needed, writes mode '0600', and refuses to overwrite an existing
file. It prints only the created path.

'SECRETS_FILE_PATH' must be relative to the repository root, must not contain
'..', and must point to an ignored file. Compose mounts that host path at the
same path below '/app', read-only.

## Local Docker stack

Validate and start the stack:

```bash
docker compose config --quiet
docker compose build api
docker compose up -d
docker compose ps
curl --fail --silent --show-error \
  "http://127.0.0.1:5001/api/v1"
```

Compose reads 'PORT', 'API_PREFIX', 'SECRETS_FILE_PATH', Mongo topology, rollout
flags, and authentication policies from the same '.env' passed to the API.
There is no separate Docker secrets path or image-tag setting.

MongoDB starts as a single-node replica set because the API uses multi-document
transactions. The API healthcheck uses the configured port and prefix. The
secret JSON is mounted read-only and is never copied into the image.

To stop without deleting Mongo data:

```bash
docker compose down
```

Do not add '-v' during an upgrade; it removes the 'mongo_data' volume.

## Existing installations

Do not run the generator over an existing secret file during routine rebuilds.
Unplanned replacement of encryption keyrings can lock users out, replacement of
the recovery HMAC keyring invalidates recovery codes, and replacement of
'JWT_SECRET' invalidates issued tokens.

To migrate a legacy JSON that contains both general settings and secrets, write
to a new private file first:

```bash
npm run secrets:generate -- \
  --source config/secrets/legacy.json \
  --output config/secrets/migrated.json
```

The output whitelist retains only:

- 'MONGO_URI', or 'MONGO_USER' and 'MONGO_PASSWORD';
- 'JWT_SECRET';
- 'TOTP_ENCRYPTION_ACTIVE_KEY_ID' and 'TOTP_ENCRYPTION_KEYS';
- 'RECOVERY_HMAC_ACTIVE_KEY_ID' and 'RECOVERY_HMAC_KEYS';
- 'AUTH_THROTTLE_HMAC_KEY'.

Move Mongo host, port, auth enablement, auth source, replica-set name,
'JWT_EXPIRES_IN', TOTP rollout/issuer, proxy policy, and authentication limits
to '.env'. Compare key IDs and secret values in a protected environment before
switching 'SECRETS_FILE_PATH'.

'--force' is reserved for an intentional, backed-up migration or rotation.

## Building an image

The local Compose file builds the API and does not assign an explicit image
name. Registry publishing is a separate production workflow:

```bash
export RELEASE_TAG="<release-or-commit-sha>"
export IMAGE="<registry>/babki-back:\${RELEASE_TAG}"
docker build --pull --target runtime --tag "\${IMAGE}" .
docker push "\${IMAGE}"
```

The build context excludes '.env*' and 'config/secrets/*.json'. The runtime
image contains only production dependencies and compiled application code and
runs as the non-root 'node' user.

## Production configuration

Use '.env.production.example' and
'config/secrets/production.example.json' only as contracts:

```bash
cp .env.production.example .env
cp config/secrets/production.example.json \
  config/secrets/production.json
chmod 600 config/secrets/production.json
```

Replace every placeholder through the deployment system. Do not commit the
runtime files. 'config/secrets/production.json' contains 'MONGO_URI' and
authentication key material; all non-secret deployment policy remains in
'.env'.

'MONGO_DB_NAME' is still required even when 'MONGO_URI' contains the database
name. 'TRUST_PROXY=false' is the safe default; change it only to the exact
policy matching trusted ingress proxies. Deploy initially with
'TOTP_ENROLLMENT_ENABLED=false', verify every instance enforces two-factor
login, then change the flag and recreate instances without rotating secrets.

A production orchestrator should materialize both files in the application
working directory or project layout so the relative 'SECRETS_FILE_PATH' contract
remains valid. A future orchestrator-specific manifest may project a managed
secret differently, but that is outside the local Compose contract.

## Rotation

For TOTP encryption:

1. Add a new independent 32-byte Base64 key to 'TOTP_ENCRYPTION_KEYS'.
2. Deploy the expanded keyring everywhere.
3. Change 'TOTP_ENCRYPTION_ACTIVE_KEY_ID'.
4. Retain old keys until no stored envelope references them.

For recovery HMAC keys, retain old entries until all recovery codes using them
are consumed or regenerated. Rotate 'AUTH_THROTTLE_HMAC_KEY' only with a plan
for invalidating rate-limit buckets. Rotate 'JWT_SECRET' only with a plan to
invalidate all issued JWTs.

Back up MongoDB and all authentication keyrings separately before any rotation.
Never log secret values or recovery codes.
