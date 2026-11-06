<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskForm from '../components/TaskForm.vue'
import TaskListControls from '../components/TaskListControls.vue'
import { useTasksStore } from '../store/tasks'
import { useProjectsStore } from '../store/projects'
import '../css/task-components.css'
import '../css/task-list.css'

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
        <p>Pinia забезпечує спільний стан між вкладками без перезавантаження.</p>
        <button type="button" class="tf5-btn tf5-btn--primary tf5-new" @click="startCreate">
          + Додати завдання
        </button>
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
