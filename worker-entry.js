import worker, { NominatimCoordinator as BaseNominatimCoordinator } from './worker.js';
import { recordSweepExpiration, runCoordinatorAlarmSweep } from './coordinatorAlarm.js';
import { createSecurityBoundary } from './securityBoundary.mjs';

export class NominatimCoordinator extends BaseNominatimCoordinator {
  async _resolve(payload) {
    const response = await super._resolve(payload);
    const cached = await this.state.storage.get('cache:' + payload.cacheIdentity);
    if (cached && cached.expiresAt) {
      await recordSweepExpiration(this.state.storage, cached.expiresAt);
    }
    return response;
  }

  async alarm() {
    return runCoordinatorAlarmSweep(this);
  }
}

export default createSecurityBoundary(worker);
