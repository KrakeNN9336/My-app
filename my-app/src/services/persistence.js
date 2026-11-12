import { reactive } from 'vue'
import { useTasksStore } from '../store/tasks'
import { useProjectsStore } from '../store/projects'
import { readSnapshot, writeSnapshot } from './database'

export const persistenceState = reactive({
  status: 'loading', // loading | saving | saved | error
  error: '',
  canRetry: false,
  lastSavedAt: null, // Додаткове завдання 4: час останнього успішного запису
  syncNotice: '', // Додаткове завдання 6: повідомлення про оновлення з іншої вкладки
})

let taskStore = null
let projectStore = null
let enabled = false
let writing = false
let revision = 0
let savedRevision = 0
let lastRequestedSnapshot = ''
let scheduled = false

// Додаткове завдання 6: канал між вкладками одного origin.
const CHANNEL_NAME = 'taskflow-sync'
const tabId = Math.random().toString(36).slice(2)
let channel = null

// JSON-серіалізація перетворює реактивні об'єкти Pinia на звичайні дані.
function makeSnapshot() {
  return JSON.parse(JSON.stringify({
    tasks: taskStore.tasks,
    projects: projectStore.projects,
    nextProjectId: projectStore.nextProjectId,
  }))
}

// Відновлюємо state обох сховищ через $patch() (hydration).
function applySnapshot(snapshot) {
  if (!Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.projects)) {
    throw new Error('Некоректний формат локальних даних.')
  }

  const calculatedNextId = Math.max(
    0,
    ...snapshot.projects.map((project) => {
      const match = /^project-(\d+)$/.exec(String(project.id))
      return match ? Number(match[1]) : 0
    }),
  ) + 1

  projectStore.$patch({
    projects: snapshot.projects,
    nextProjectId: Number.isSafeInteger(snapshot.nextProjectId) &&
      snapshot.nextProjectId >= calculatedNextId
      ? snapshot.nextProjectId
      : calculatedNextId,
  })
  taskStore.$patch({ tasks: snapshot.tasks })
  if (snapshot.lastSavedAt) persistenceState.lastSavedAt = new Date(snapshot.lastSavedAt)
}

// В один момент часу виконуємо не більш як один запис в IndexedDB.
async function flushChanges() {
  if (!enabled || writing) return
  writing = true

  try {
    while (savedRevision < revision) {
      const targetRevision = revision
      const snapshot = makeSnapshot()

      try {
        const savedAt = await writeSnapshot(snapshot)
        savedRevision = targetRevision
        persistenceState.lastSavedAt = new Date(savedAt)
        channel?.postMessage({ type: 'saved', from: tabId, savedAt })
      } catch (error) {
        console.error('TaskFlow: збереження не вдалося:', error)
        persistenceState.status = 'error'
        persistenceState.error = 'Зміни поки що залишилися лише в пам’яті.'
        persistenceState.canRetry = true
        return
      }
    }

    persistenceState.status = 'saved'
    persistenceState.error = ''
    persistenceState.canRetry = false
  } finally {
    writing = false
  }
}

function requestSave(force = false) {
  if (!enabled) return
  const fingerprint = JSON.stringify(makeSnapshot())
  if (!force && fingerprint === lastRequestedSnapshot) return
  lastRequestedSnapshot = fingerprint
  revision += 1
  persistenceState.status = 'saving'
  persistenceState.error = ''
  persistenceState.canRetry = false
  persistenceState.syncNotice = ''
  void flushChanges()
}

// Об'єднуємо синхронні зміни й не записуємо зміни лише у фільтрах.
function onStoreChanged() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    requestSave()
  })
}

// Кнопка повторної спроби використовується тільки після помилки запису.
export function retrySave() {
  if (!enabled || persistenceState.status !== 'error') return
  requestSave(true)
}

// Додаткове завдання 6: інша вкладка зберегла новий знімок — перечитуємо базу.
// Якщо в цій вкладці є незбережені зміни, їх запис завершиться пізніше і переможе
// (стратегія «останній запис виграє»), а інша вкладка отримає наше повідомлення.
async function onChannelMessage(event) {
  const message = event.data
  if (!enabled || message?.type !== 'saved' || message.from === tabId) return
  if (writing || savedRevision < revision) return

  try {
    const snapshot = await readSnapshot()
    applySnapshot(snapshot)
    // Знімок уже збігається з базою, тому підписка не запускає повторний запис.
    lastRequestedSnapshot = JSON.stringify(makeSnapshot())
    persistenceState.syncNotice = 'Дані оновлено з іншої вкладки.'
  } catch (error) {
    console.error('TaskFlow: синхронізація вкладок не вдалася:', error)
  }
}

export async function initializePersistence(pinia) {
  taskStore = useTasksStore(pinia)
  projectStore = useProjectsStore(pinia)

  try {
    const snapshot = await readSnapshot()

    if (snapshot.initialized) {
      applySnapshot(snapshot)
    } else {
      // Демонстраційні дані записуємо тільки під час першого запуску.
      const savedAt = await writeSnapshot(makeSnapshot())
      persistenceState.lastSavedAt = new Date(savedAt)
    }

    persistenceState.status = 'saved'
    lastRequestedSnapshot = JSON.stringify(makeSnapshot())
    enabled = true

    // Слухаємо зміни стану обох сховищ; фільтри не записуємо.
    taskStore.$subscribe(onStoreChanged, { detached: true, flush: 'sync' })
    projectStore.$subscribe(onStoreChanged, { detached: true, flush: 'sync' })

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channel.addEventListener('message', onChannelMessage)
    }
  } catch (error) {
    console.error('TaskFlow: IndexedDB недоступна:', error)
    persistenceState.status = 'error'
    persistenceState.error = 'Не вдалося відкрити або відновити локальні дані. '
      + 'Працює лише тимчасовий стан; наявну базу не перезаписано.'
    persistenceState.canRetry = false
  }
}
