<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskForm from '../components/TaskForm.vue'
import TaskListControls from '../components/TaskListControls.vue'
import { useTasksStore } from '../store/tasks'
import { useProjectsStore } from '../store/projects'
import { persistenceState, retrySave } from '../services/persistence'
import { buildExport, downloadJson, validateImport } from '../services/transfer'
import '../css/task-components.css'
import '../css/task-list.css'
import '../css/persistence.css'

const taskStore = useTasksStore()
const projectStore = useProjectsStore()

// Для деструктуризації реактивного стану й getters використовуємо storeToRefs().
const {
  tasks,
  visibleTasks,
  searchText,
  selectedStatus,
  selectedPriority,
  selectedProject,
  onlyNoDueDate, // Додаткове завдання 5
  sortOrder,
} = storeToRefs(taskStore)
// Додаткове завдання 1: projectStats тепер getter сховища проєктів
const { projects, projectStats } = storeToRefs(projectStore)

// Стан відкриття форми локальний: іншим сторінкам він не потрібен.
const showForm = ref(false)
const editingId = ref(null)
const newProjectTitle = ref('')
const newProjectError = ref('')
const bulkMessage = ref('') // Додаткове завдання 4

const editingTask = computed(() =>
  tasks.value.find((task) => task.id === editingId.value) ?? null,
)

// Практична № 7: текст індикатора локального збереження.
const saveMessage = computed(() => {
  if (persistenceState.status === 'loading') return 'Завантаження локальних даних…'
  if (persistenceState.status === 'saving') return 'Збереження змін у IndexedDB…'
  if (persistenceState.status === 'saved') return 'Усі зміни збережено в цьому браузері.'
  return persistenceState.error || 'Помилка локального збереження.'
})

// Додаткове завдання 4: дата й час останнього успішного збереження (metadata.lastSavedAt).
const lastSavedText = computed(() => persistenceState.lastSavedAt
  ? persistenceState.lastSavedAt.toLocaleString('uk-UA', { dateStyle: 'long', timeStyle: 'medium' })
  : '')

// Додаткові завдання 1–2: експорт та імпорт JSON.
const importInput = ref(null)
const transferMessage = ref('')
const importErrors = ref([])

function exportJson() {
  const data = buildExport(tasks.value, projects.value)
  downloadJson(data)
  importErrors.value = []
  transferMessage.value = `Експортовано: завдань ${data.tasks.length}, проєктів ${data.projects.length}.`
}

async function importJson(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  transferMessage.value = ''
  importErrors.value = []

  let raw
  try {
    raw = JSON.parse(await file.text())
  } catch {
    importErrors.value = ['Файл не є коректним JSON.']
    return
  }

  const result = validateImport(raw)
  if (!result.ok) {
    importErrors.value = result.errors.slice(0, 6)
    if (result.errors.length > 6) importErrors.value.push(`…ще помилок: ${result.errors.length - 6}`)
    return
  }

  const { tasks: newTasks, projects: newProjects } = result.data
  const question = `Замінити поточні дані (${tasks.value.length} завдань, ${projects.value.length} проєктів) `
    + `даними з файлу (${newTasks.length} завдань, ${newProjects.length} проєктів)?`
  if (!window.confirm(question)) {
    transferMessage.value = 'Імпорт скасовано, дані не змінено.'
    return
  }

  const maxProjectNumber = Math.max(0, ...newProjects.map((project) => {
    const match = /^project-(\d+)$/.exec(project.id)
    return match ? Number(match[1]) : 0
  }))
  projectStore.$patch({
    projects: newProjects,
    nextProjectId: Math.max(projectStore.nextProjectId, maxProjectNumber + 1),
  })
  taskStore.$patch({ tasks: newTasks })
  taskStore.resetFilters()
  cancelForm()
  transferMessage.value = `Імпортовано: завдань ${newTasks.length}, проєктів ${newProjects.length}.`
}

function startCreate() {
  editingId.value = null
  showForm.value = true
}

function startEdit(id) {
  editingId.value = id
  showForm.value = true
}

function cancelForm() {
  editingId.value = null
  showForm.value = false
}

function saveTask(values) {
  const saved = values.id === null
    ? taskStore.addTask(values)
    : taskStore.updateTask(values)
  if (saved) cancelForm()
}

function handleDelete(id) {
  const task = tasks.value.find((item) => item.id === Number(id))
  if (!task) return

  if (!window.confirm(`Видалити завдання «${task.title}»?`)) return
  if (taskStore.deleteTask(id) && editingId.value === id) cancelForm()
}

// Додаткове завдання 4: групова дія з окремим підтвердженням
function moveProjectToProgress() {
  if (selectedProject.value === 'all') return
  const title = projectStore.projectTitle(selectedProject.value)
  const affected = tasks.value.filter(
    (task) => task.projectId === selectedProject.value && task.status !== 'progress',
  ).length

  if (affected === 0) {
    bulkMessage.value = `У проєкті «${title}» немає завдань, які потрібно переводити.`
    return
  }
  if (!window.confirm(`Перевести завдань: ${affected} (проєкт «${title}») у статус «У роботі»?`)) return

  const changed = taskStore.setProjectTasksInProgress(selectedProject.value)
  bulkMessage.value = `Переведено у статус «У роботі»: ${changed}.`
}

function createProject() {
  const project = projectStore.addProject(newProjectTitle.value)
  if (!project) {
    newProjectError.value = 'Назва: 3–40 символів. Не повторюйте назви проєктів.'
    return
  }
  newProjectTitle.value = ''
  newProjectError.value = ''
  selectedProject.value = project.id
}
</script>

<template>
  <f7-page name="tasks" class="tf3-page">
    <f7-navbar title="Мої завдання" />
    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / TASK MANAGER</div>
        <h1>Керування завданнями і проєктами</h1>
        <p>Pinia керує станом, IndexedDB зберігає завдання та проєкти локально.</p>
        <button type="button" class="tf5-btn tf5-btn--primary tf5-new" @click="startCreate">
          + Додати завдання
        </button>
      </section>

      <section
        class="tf7-persistence"
        :class="`tf7-persistence--${persistenceState.status}`"
        role="status"
        aria-live="polite"
      >
        <strong>Локальне збереження</strong>
        <span>{{ saveMessage }}</span>
        <button
          v-if="persistenceState.canRetry"
          type="button"
          class="tf5-btn"
          @click="retrySave"
        >
          Повторити збереження
        </button>
        <small v-if="lastSavedText">Останнє збереження: {{ lastSavedText }}</small>
        <small v-if="persistenceState.syncNotice">{{ persistenceState.syncNotice }}</small>
      </section>

      <!-- Додаткові завдання 1–2: експорт та імпорт JSON -->
      <section class="tf7-transfer" aria-label="Експорт та імпорт">
        <button type="button" class="tf5-btn" @click="exportJson">Експорт JSON</button>
        <button type="button" class="tf5-btn" @click="importInput.click()">Імпорт JSON</button>
        <input ref="importInput" type="file" accept="application/json,.json" @change="importJson" />
        <p v-if="transferMessage" class="tf7-transfer-message" role="status">{{ transferMessage }}</p>
        <ul v-if="importErrors.length" class="tf7-transfer-errors" role="alert">
          <li v-for="error in importErrors" :key="error">{{ error }}</li>
        </ul>
      </section>

      <section class="tf5-panel tf6-project-panel" aria-label="Проєкти">
        <h2>Мої проєкти</h2>
        <div class="tf6-project-list">
          <span v-for="project in projectStats" :key="project.id" class="tf6-project-pill">
            {{ project.title }} <strong>{{ project.taskCount }}</strong>
          </span>
        </div>
        <form class="tf6-project-form" @submit.prevent="createProject">
          <label>
            Назва нового проєкту
            <input
              v-model="newProjectTitle"
              type="text"
              maxlength="40"
              placeholder="Наприклад: Лабораторні"
              @input="newProjectError = ''"
            />
          </label>
          <button type="submit" class="tf5-btn tf5-btn--primary">Створити проєкт</button>
        </form>
        <p v-if="newProjectError" class="tf5-error" role="alert">{{ newProjectError }}</p>

        <!-- Додаткове завдання 4: групова дія для проєкту, обраного у фільтрі -->
        <div class="tf6-bulk">
          <button
            type="button"
            class="tf5-btn"
            :disabled="selectedProject === 'all'"
            @click="moveProjectToProgress"
          >
            Усі завдання проєкту → «У роботі»
          </button>
          <span v-if="selectedProject === 'all'" class="tf6-hint">
            Оберіть проєкт у фільтрі нижче, щоб скористатися груповою дією.
          </span>
          <span v-else-if="bulkMessage" class="tf6-hint" role="status">{{ bulkMessage }}</span>
        </div>
      </section>

      <TaskForm
        v-if="showForm"
        :key="editingId ?? 'new'"
        :task="editingTask"
        :projects="projects"
        @save="saveTask"
        @cancel="cancelForm"
      />

      <TaskListControls
        v-model:search="searchText"
        v-model:status="selectedStatus"
        v-model:priority="selectedPriority"
        v-model:project="selectedProject"
        v-model:sort="sortOrder"
        v-model:onlyNoDueDate="onlyNoDueDate"
        :projects="projects"
        @reset="taskStore.resetFilters"
      />

      <section class="tf3-section">
        <div class="tf3-section-heading">
          <div>
            <div class="tf3-eyebrow">TASK LIST</div>
            <h2>Список завдань</h2>
          </div>
          <div class="tf3-counter">
            Показано: {{ visibleTasks.length }} із {{ tasks.length }}
          </div>
        </div>
        <div v-if="visibleTasks.length" class="tf3-task-grid">
          <TaskCard
            v-for="task in visibleTasks"
            :key="task.id"
            :task="task"
            :project-title="projectStore.projectTitle(task.projectId)"
            @status-change="taskStore.setTaskStatus"
            @priority-change="taskStore.setTaskPriority"
            @edit="startEdit"
            @delete="handleDelete"
          />
        </div>
        <div v-else class="tf5-empty">
          <p>За поточними умовами завдань не знайдено.</p>
          <button type="button" class="tf5-btn" @click="taskStore.resetFilters">
            Показати всі завдання
          </button>
        </div>
      </section>
    </div>
    <!-- Сумісність із попередніми роботами: панель вкладок у слоті fixed -->
    <template #fixed>
      <AppTabbar active="tasks" />
    </template>
  </f7-page>
</template>
