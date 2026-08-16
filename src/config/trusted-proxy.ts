import type { Express } from 'express';

export type TrustProxySetting = boolean | number | string;

export function configureTrustedProxy(
  app: Pick<Express, 'set'>,
  setting: TrustProxySetting,
) {
  app.set('trust proxy', setting);
}
