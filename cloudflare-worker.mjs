/**
 * OpenNext worker entry for Regal Student Companion on Cloudflare.
 */
import openNextWorker from "./.open-next/worker.js";

const handler = openNextWorker.fetch?.bind(openNextWorker)
  ?? openNextWorker.default?.fetch?.bind(openNextWorker.default);

export default { fetch: handler };
