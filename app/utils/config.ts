
// import { bootstrap } from "global-agent";

// bootstrap();

// process.env.GLOBAL_AGENT_HTTP_PROXY = "http://127.0.0.1:10801";

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '@/db/schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: 'my-app',

})

export const db = drizzle({
  client: pool,
  schema,
})
