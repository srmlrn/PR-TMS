import { config } from 'dotenv';
import { resolve } from 'path';

// Load apps/api/.env before AppModule reads STORAGE_MODE at import time.
config({ path: resolve(__dirname, '../.env') });
