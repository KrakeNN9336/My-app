<script setup>
import { ref, computed } from 'vue'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import { taskState, setTaskStatus, setTaskPriority } from '../store/tasks'
import '../css/task-components.css'
const selectedStatus = ref('all')
const selectedPriority = ref('all')
const sortMode = ref('none')
const selectedTaskId = ref(null)
const statusOptions = [
  { value: 'all', label: 'Усі' },
  { value: 'todo', label: 'Заплановано' },
  { value: 'progress', label: 'У роботі' },
  { value: 'done', label: 'Виконано' },
]
const priorityOptions = [
  { value: 'all', label: 'Усі' },
  { value: 'low', label: 'Низький' },
  { value: 'medium', label: 'Середній' },
  { value: 'high', label: 'Високий' },
]
const sortOptions = [
  { value: 'none', label: 'Без сортування' },
  { value: 'desc', label: 'Високий → низький' },
  { value: 'asc', label: 'Низький → високий' },
]
const priorityRank = { low: 0, medium: 1, high: 2 }
const filteredTasks = computed(() => {
  const list = taskState.tasks.filter((task) => (
    (selectedStatus.value === 'all' || task.status === selectedStatus.value) &&
    (selectedPriority.value === 'all' || task.priority === selectedPriority.value)
  ))
  if (sortMode.value === 'none') return list
  const direction = sortMode.value === 'desc' ? -1 : 1
  return [...list].sort((a, b) =>
    (priorityRank[a.priority] - priorityRank[b.priority]) * direction)
})
const selectedTask = computed(() => taskState.tasks.find(
  (task) => task.id === selectedTaskId.value))
function handleStatusChange(payload) { setTaskStatus(payload) }
function handlePriorityChange(payload) { setTaskPriority(payload) }
function handleTaskSelect({ id }) {
  selectedTaskId.value = selectedTaskId.value === id ? null : id
}
</script>
<template>
  <f7-page name="tasks" class="tf3-page">
    <f7-navbar title="Мої завдання" />
    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / TASK MANAGER</div>
        <h1>Мої завдання</h1>
        <p>Керуйте завданнями, статусами та пріоритетами.</p>
      </section>
      <section class="tf3-filters">
        <div class="tf3-filter-group">
          <div class="tf3-filter-title">Фільтр за статусом</div>
          <div class="tf3-filter-buttons">
            <button v-for="option in statusOptions" :key="option.value"
              type="button" class="tf3-filter-button"
              :class="{ 'is-active': selectedStatus === option.value }"
              :aria-pressed="selectedStatus === option.value"
              @click="selectedStatus = option.value">{{ option.label }}</button>
          </div>
        </div>
        <div class="tf3-filter-group">
          <div class="tf3-filter-title">Фільтр за пріоритетом</div>
          <div class="tf3-filter-buttons">
            <button v-for="option in priorityOptions" :key="option.value"
              type="button" class="tf3-filter-button"
              :class="{ 'is-active': selectedPriority === option.value }"
              :aria-pressed="selectedPriority === option.value"
              @click="selectedPriority = option.value">{{ option.label }}</button>
          </div>
        </div>
        <div class="tf3-filter-group">
          <div class="tf3-filter-title">Сортування за пріоритетом</div>
          <div class="tf3-filter-buttons">
            <button v-for="option in sortOptions" :key="option.value"
              type="button" class="tf3-filter-button"
              :class="{ 'is-active': sortMode === option.value }"
              :aria-pressed="sortMode === option.value"
              @click="sortMode = option.value">{{ option.label }}</button>
          </div>
        </div>
      </section>
      <section class="tf3-section">
        <div class="tf3-section-heading">
          <div><div class="tf3-eyebrow">TASK LIST</div><h2>Список завдань</h2></div>
          <div class="tf3-counter">Знайдено: {{ filteredTasks.length }}</div>
        </div>
        <div v-if="selectedTask" class="tf3-selected">
          Обране завдання: <strong>{{ selectedTask.title }}</strong>
          <button type="button" class="tf3-action" @click="selectedTaskId = null">Скасувати вибір</button>
        </div>
        <div v-if="filteredTasks.length" class="tf3-task-grid">
          <TaskCard v-for="task in filteredTasks" :key="task.id" :task="task"
            :selected="task.id === selectedTaskId"
            @task-select="handleTaskSelect"
            @status-change="handleStatusChange"
            @priority-change="handlePriorityChange" />
        </div>
        <div v-else class="tf3-empty">За обраними фільтрами завдань не знайдено.</div>
      </section>
    </div>
    <template #fixed>
      <AppTabbar active="tasks" />
    </template>
  </f7-page>
</template>
