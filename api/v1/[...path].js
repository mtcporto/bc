import { createApiHandler } from '../../lib/http.js';

export default createApiHandler(undefined, { catchAllParameter: 'path' });
