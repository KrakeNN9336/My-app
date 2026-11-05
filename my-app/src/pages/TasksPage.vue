<script setup>
import { ref, computed } from 'vue'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskForm from '../components/TaskForm.vue'
import TaskListControls from '../components/TaskListControls.vue'
import {
  taskState,
  addTask,
  updateTask,
  deleteTask,
  setTaskStatus,
  setTaskPriority,
} from '../store/tasks'
import '../css/task-components.css'
import '../css/task-list.css'

const searchText = ref('')
const selectedStatus = ref('all')
const selectedPriority = ref('all')
const sortOrder = ref('newest')
const onlyActive = ref(false) // Додаткове завдання 1

const showForm = ref(false)
const editingId = ref(null)
const editingTask = computed(
  () => taskState.tasks.find((task) => task.id === editingId.value) ?? null,
)

const visibleTasks = computed(() => {
  const term = searchText.value.trim().toLocaleLowerCase('uk-UA')
  const priorityWeight = { high: 3, medium: 2, low: 1 }
  // Додаткове завдання 2: порядок статусів «У роботі» → «Заплановано» → «Виконано»
  const statusWeight = { progress: 1, todo: 2, done: 3 }

  // filter() створює новий масив: вихідний стан не змінюється.
  const result = taskState.tasks.filter((task) => {
    const matchesText = !term ||
      `${task.title} ${task.description ?? ''}`.toLocaleLowerCase('uk-UA').includes(term)
    const matchesStatus =
      selectedStatus.value === 'all' || task.status === selectedStatus.value
    const matchesPriority =
      selectedPriority.value === 'all' || task.priority === selectedPriority.value

    // Додаткове завдання 1: «Тільки невиконані» працює разом з іншими умовами
    const matchesActive = !onlyActive.value || task.status !== 'done'

    return matchesText && matchesStatus && matchesPriority && matchesActive
  })

  // Сортуємо лише копію, щоб не змінювати taskState.tasks.
  return result.sort((a, b) => {
    if (sortOrder.value === 'title') {
      return a.title.localeCompare(b.title, 'uk-UA') || a.id - b.id
    }
    if (sortOrder.value === 'priority') {
      return priorityWeight[b.priority] - priorityWeight[a.priority] || b.id - a.id
    }
    if (sortOrder.value === 'dueDate') {
      // Порожні дати завжди після заповнених.
      const first = a.dueDate || '9999-12-31'
      const second = b.dueDate || '9999-12-31'
      return first.localeCompare(second) || b.id - a.id
    }
    // Додаткове завдання 2
    if (sortOrder.value === 'status') {
      return statusWeight[a.status] - statusWeight[b.status] || b.id - a.id
    }
    // Додаткове завдання 6: найдальший термін першим, порожні дати наприкінці
    if (sortOrder.value === 'dueDateDesc') {
      if (!a.dueDate && !b.dueDate) return b.id - a.id
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return b.dueDate.localeCompare(a.dueDate) || b.id - a.id
    }
    return b.id - a.id
  })
})

// Додаткове завдання 3: частка виконаних серед показаних завдань
const completedPercent = computed(() => {
  if (!visibleTasks.value.length) return 0
  const done = visibleTasks.value.filter((task) => task.status === 'done').length
  return Math.round((done / visibleTasks.value.length) * 100)
})

function resetFilters() {
  searchText.value = ''
  selectedStatus.value = 'all'
  selectedPriority.value = 'all'
  sortOrder.value = 'newest'
  onlyActive.value = false // Додаткове завдання 1
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
  const saved = values.id === null ? addTask(values) : updateTask(values)
  if (saved) cancelForm()
}

function handleDelete(id) {
  const task = taskState.tasks.find((item) => item.id === id)
  if (!task) return

  const confirmed = window.confirm(`Видалити завдання «${task.title}»?`)
  if (!confirmed) return

  if (deleteTask(id) && editingId.value === id) cancelForm()
}
</script>

<template>
  <f7-page name="tasks" class="tf3-page">
    <f7-navbar title="Мої завдання" />

    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / TASK MANAGER</div>
        <h1>Керування завданнями</h1>
        <p>Створюйте, редагуйте, знаходьте, сортуйте та видаляйте завдання.</p>
        <button type="button" class="tf5-btn tf5-btn--primary tf5-new" @click="startCreate">
          + Додати завдання
        </button>
      </section>

      <TaskForm
        v-if="showForm"
        :key="editingId ?? 'new'"
        :task="editingTask"
        @save="saveTask"
        @cancel="cancelForm"
      />

      <TaskListControls
        v-model:search="searchText"
        v-model:status="selectedStatus"
        v-model:priority="selectedPriority"
        v-model:sort="sortOrder"
        v-model:onlyActive="onlyActive"
        @reset="resetFilters"
      />

      <section class="tf3-section">
        <div class="tf3-section-heading">
          <div>
            <div class="tf3-eyebrow">TASK LIST</div>
            <h2>Список завдань</h2>
          </div>
          <div class="tf3-counter">
            Показано: {{ visibleTasks.length }} із {{ taskState.tasks.length }}
            <!-- Додаткове завдання 3 -->
            <span class="tf5-percent">· Виконано: {{ completedPercent }}%</span>
          </div>
        </div>

        <div v-if="visibleTasks.length" class="tf3-task-grid">
          <TaskCard
            v-for="task in visibleTasks"
            :key="task.id"
            :task="task"
            :editable="true"
            @status-change="setTaskStatus"
            @priority-change="setTaskPriority"
            @edit="startEdit"
            @delete="handleDelete"
          />
        </div>

        <!-- Додаткове завдання 5: список порожній після видалення всіх завдань -->
        <div v-else-if="taskState.tasks.length === 0" class="tf5-empty tf5-empty--all">
          <p><strong>Список завдань порожній.</strong></p>
          <p>
            Усі завдання видалено. Додайте нове завдання кнопкою
            «+ Додати завдання» або оновіть сторінку (F5), щоб повернути
            демонстраційні дані.
          </p>
          <button type="button" class="tf5-btn tf5-btn--primary" @click="startCreate">
            + Додати завдання
          </button>
        </div>

        <div v-else class="tf5-empty">
          <p>За поточними умовами завдань не знайдено.</p>
          <button type="button" class="tf5-btn" @click="resetFilters">
            Показати всі завдання
          </button>
        </div>
      </section>
    </div>

    <!-- Нижня панель у слоті fixed (як і в попередніх роботах), щоб не виходила за екран -->
    <template #fixed>
      <AppTabbar active="tasks" />
    </template>
  </f7-page>
</template>
