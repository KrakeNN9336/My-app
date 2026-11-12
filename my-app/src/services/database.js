import { openDB } from 'idb'

export const DB_NAME = 'taskflow-db'
export const DB_VERSION = 1
let databasePromise = null

// Відкриваємо одну базу даних і повторно використовуємо з'єднання.
export function getDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Цей браузер не підтримує IndexedDB.'))
  }

  if (!databasePromise) {
    databasePromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata')
        }
      },
    }).catch((error) => {
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}

// Читаємо завдання, проєкти та службові значення в одній транзакції.
export async function readSnapshot() {
  const db = await getDatabase()
  const tx = db.transaction(['tasks', 'projects', 'metadata'], 'readonly')
  const [tasks, projects, initialized, nextProjectId, lastSavedAt] = await Promise.all([
    tx.objectStore('tasks').getAll(),
    tx.objectStore('projects').getAll(),
    tx.objectStore('metadata').get('initialized'),
    tx.objectStore('metadata').get('nextProjectId'),
    tx.objectStore('metadata').get('lastSavedAt'), // Додаткове завдання 4
  ])
  await tx.done

  return { tasks, projects, initialized: initialized === true, nextProjectId, lastSavedAt }
}

// Атомарно замінюємо збережені списки актуальним знімком Pinia.
// Повертаємо час збереження, записаний у metadata в тій самій транзакції.
export async function writeSnapshot(snapshot) {
  const db = await getDatabase()
  const tx = db.transaction(['tasks', 'projects', 'metadata'], 'readwrite')
  const taskStore = tx.objectStore('tasks')
  const projectStore = tx.objectStore('projects')
  const metadataStore = tx.objectStore('metadata')
  const savedAt = new Date().toISOString()

  await Promise.all([taskStore.clear(), projectStore.clear()])
  await Promise.all([
    ...snapshot.tasks.map((task) => taskStore.put(task)),
    ...snapshot.projects.map((project) => projectStore.put(project)),
    metadataStore.put(true, 'initialized'),
    metadataStore.put(snapshot.nextProjectId, 'nextProjectId'),
    metadataStore.put(savedAt, 'lastSavedAt'), // Додаткове завдання 4
    tx.done,
  ])

  return savedAt
}

// Додаткове завдання 3: точкове видалення одного запису методом delete().
// Не потребує переписування всього сховища, але не оновлює Pinia і metadata —
// за узгодженість стану відповідає код, який її викликає.
export async function deleteRecord(storeName, key) {
  const db = await getDatabase()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  const existed = (await store.getKey(key)) !== undefined
  if (existed) await store.delete(key)
  await tx.done
  return existed
}

// Додаткове завдання 5: кількість записів і службові значення беремо безпосередньо з бази.
export async function readDatabaseInfo() {
  const db = await getDatabase()
  const tx = db.transaction(['tasks', 'projects', 'metadata'], 'readonly')
  const [taskCount, projectCount, initialized, nextProjectId, lastSavedAt] = await Promise.all([
    tx.objectStore('tasks').count(),
    tx.objectStore('projects').count(),
    tx.objectStore('metadata').get('initialized'),
    tx.objectStore('metadata').get('nextProjectId'),
    tx.objectStore('metadata').get('lastSavedAt'),
  ])
  await tx.done

  return {
    name: db.name,
    version: db.version,
    stores: [...db.objectStoreNames],
    taskCount,
    projectCount,
    initialized: initialized === true,
    nextProjectId,
    lastSavedAt,
  }
}
