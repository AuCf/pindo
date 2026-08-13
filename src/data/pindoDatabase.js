import Database from '@tauri-apps/plugin-sql';

const DATABASE_URL = 'sqlite:pindo.db';
const STATE_KEYS = ['todayTasks', 'tomorrowTasks', 'notes', 'preferences'];

let databasePromise;
let writeQueue = Promise.resolve();

function getDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL);
  }

  return databasePromise;
}

function parseStoredValue(value, fallback) {
  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }

    if (typeof fallback === 'string') {
      return typeof parsed === 'string' ? parsed : fallback;
    }

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

async function writeStateValue(key, value) {
  const database = await getDatabase();
  await database.execute(
    `INSERT INTO app_state (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), Date.now()],
  );
}

export async function initializePindoDatabase(legacyState) {
  const database = await getDatabase();
  const rows = await database.select('SELECT key, value FROM app_state');
  const storedValues = new Map(rows.map((row) => [row.key, row.value]));

  for (const key of STATE_KEYS) {
    if (!storedValues.has(key)) {
      await writeStateValue(key, legacyState[key]);
      storedValues.set(key, JSON.stringify(legacyState[key]));
    }
  }

  return Object.fromEntries(
    STATE_KEYS.map((key) => [
      key,
      parseStoredValue(storedValues.get(key), legacyState[key]),
    ]),
  );
}

export function persistPindoState(key, value) {
  const operation = writeQueue.then(() => writeStateValue(key, value));
  writeQueue = operation.catch(() => undefined);
  return operation;
}
