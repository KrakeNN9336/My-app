<script setup>
import { computed, reactive, ref } from 'vue'
import { todayString } from '../store/tasks'

const props = defineProps({
  task: { type: Object, default: null },
  // Додаткове завдання 7: назви наявних завдань для перевірки унікальності
  existingTitles: { type: Array, default: () => [] },
})
const emit = defineEmits(['save', 'cancel'])

// Додаткове завдання 4: стандартні значення режиму створення
const defaults = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  category: 'study',
  dueDate: '',
}

// Копіюємо поля: форма не змінює вихідний об'єкт до натискання «Зберегти».
const form = reactive({
  title: props.task?.title ?? '',
  description: props.task?.description ?? '',
  status: props.task?.status ?? 'todo',
  priority: props.task?.priority ?? 'medium',
  category: props.task ? (props.task.category ?? '') : defaults.category, // Додаткове завдання 1
  dueDate: props.task?.dueDate ?? '',
})

const showErrors = ref(false)
const today = todayString()
const isEditing = computed(() => props.task !== null)
const statusLabels = {
  todo: 'Заплановано',
  progress: 'У роботі',
  done: 'Виконано',
}
const priorityLabels = {
  low: 'Низький',
  medium: 'Середній',
  high: 'Високий',
}

// Додаткове завдання 1: підписи категорій
const categoryLabels = {
  '': 'Без категорії',
  study: 'Навчання',
  work: 'Робота',
  personal: 'Особисте',
}

// Додаткове завдання 3: скільки символів залишилося
const titleLeft = computed(() => 80 - form.title.length)
const descriptionLeft = computed(() => 300 - form.description.length)

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value
}

const errors = computed(() => {
  const result = {}
  const title = form.title.trim()
  const description = form.description.trim()

  if (!title) result.title = 'Вкажіть назву завдання.'
  else if (title.length < 3) result.title = 'Назва має містити щонайменше 3 символи.'
  else if (title.length > 80) result.title = 'Максимальна довжина — 80 символів.'
  // Додаткове завдання 7: унікальність назви лише для нових завдань
  else if (
    !isEditing.value &&
    props.existingTitles.some((item) => item.trim().toLowerCase() === title.toLowerCase())
  ) {
    result.title = 'Завдання з такою назвою вже існує.'
  }

  if (description.length > 300) {
    result.description = 'Опис не повинен перевищувати 300 символів.'
  }
  if (!['todo', 'progress', 'done'].includes(form.status)) {
    result.status = 'Оберіть коректний статус.'
  }
  if (!['low', 'medium', 'high'].includes(form.priority)) {
    result.priority = 'Оберіть коректний пріоритет.'
  }
  if (!Object.keys(categoryLabels).includes(form.category)) {
    result.category = 'Оберіть коректну категорію.' // Додаткове завдання 1
  }
  if (!isValidDate(form.dueDate)) {
    result.dueDate = 'Укажіть коректну дату завершення.'
  } else if (
    // Додаткове завдання 2: нова дата не може бути в минулому;
    // у старого завдання перевіряємо лише змінену дату
    form.dueDate < today &&
    (!isEditing.value || form.dueDate !== props.task.dueDate)
  ) {
    result.dueDate = 'Дата завершення не може бути в минулому.'
  }
  return result
})

function submitForm() {
  showErrors.value = true
  if (Object.keys(errors.value).length > 0) return

  emit('save', {
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    priority: form.priority,
    category: form.category, // Додаткове завдання 1
    dueDate: form.dueDate,
  })
}

// Додаткове завдання 4: кнопка «Очистити форму» (режим створення)
function resetForm() {
  Object.assign(form, defaults)
  showErrors.value = false
}
</script>

<template>
  <div class="tf4-form-panel">
    <div class="tf4-form-heading">
      <div>
        <div class="tf3-eyebrow">TASKFLOW / FORM</div>
        <h2>{{ isEditing ? 'Редагування завдання' : 'Нове завдання' }}</h2>
      </div>
      <button type="button" class="tf4-close" @click="emit('cancel')">
        Закрити
      </button>
    </div>

    <form class="tf4-form" novalidate @submit.prevent="submitForm">
      <!-- Додаткове завдання 5: пояснення позначки обов'язкових полів -->
      <p class="tf4-required-note tf4-field--wide">
        Поля, позначені <span class="tf4-required" aria-hidden="true">*</span>, обов'язкові.
      </p>

      <div class="tf4-field tf4-field--wide">
        <label for="tf4-title">Назва завдання <span class="tf4-required" aria-hidden="true">*</span></label>
        <input id="tf4-title" v-model.trim="form.title" type="text"
          placeholder="Наприклад: Підготувати звіт" maxlength="80"
          required aria-required="true"
          :aria-invalid="showErrors && !!errors.title"
          aria-describedby="tf4-title-hint tf4-title-error" />
        <!-- Додаткове завдання 3 -->
        <small id="tf4-title-hint">Від 3 до 80 символів. Залишилось: {{ titleLeft }}</small>
        <p v-if="showErrors && errors.title" id="tf4-title-error" class="tf4-error" role="alert">
          {{ errors.title }}
        </p>
      </div>

      <div class="tf4-field tf4-field--wide">
        <label for="tf4-description">Опис</label>
        <textarea id="tf4-description" v-model.trim="form.description"
          placeholder="Що потрібно зробити?" rows="3" maxlength="300"
          :aria-invalid="showErrors && !!errors.description"
          aria-describedby="tf4-description-hint tf4-description-error"></textarea>
        <small id="tf4-description-hint">Необов'язкове поле. Залишилось: {{ descriptionLeft }}</small>
        <p v-if="showErrors && errors.description" id="tf4-description-error" class="tf4-error" role="alert">
          {{ errors.description }}
        </p>
      </div>

      <div class="tf4-field">
        <label for="tf4-status">Статус <span class="tf4-required" aria-hidden="true">*</span></label>
        <select id="tf4-status" v-model="form.status" required aria-required="true"
          :aria-invalid="showErrors && !!errors.status"
          aria-describedby="tf4-status-error">
          <option value="todo">Заплановано</option>
          <option value="progress">У роботі</option>
          <option value="done">Виконано</option>
        </select>
        <p v-if="showErrors && errors.status" id="tf4-status-error" class="tf4-error" role="alert">{{ errors.status }}</p>
      </div>

      <div class="tf4-field">
        <label for="tf4-priority">Пріоритет <span class="tf4-required" aria-hidden="true">*</span></label>
        <select id="tf4-priority" v-model="form.priority" required aria-required="true"
          :aria-invalid="showErrors && !!errors.priority"
          aria-describedby="tf4-priority-error">
          <option value="low">Низький</option>
          <option value="medium">Середній</option>
          <option value="high">Високий</option>
        </select>
        <p v-if="showErrors && errors.priority" id="tf4-priority-error" class="tf4-error" role="alert">{{ errors.priority }}</p>
      </div>

      <!-- Додаткове завдання 1: категорія -->
      <div class="tf4-field">
        <label for="tf4-category">Категорія</label>
        <select id="tf4-category" v-model="form.category"
          :aria-invalid="showErrors && !!errors.category"
          aria-describedby="tf4-category-error">
          <option v-if="isEditing" value="">Без категорії</option>
          <option value="study">Навчання</option>
          <option value="work">Робота</option>
          <option value="personal">Особисте</option>
        </select>
        <p v-if="showErrors && errors.category" id="tf4-category-error" class="tf4-error" role="alert">{{ errors.category }}</p>
      </div>

      <div class="tf4-field">
        <label for="tf4-date">Дата завершення <span class="tf4-required" aria-hidden="true">*</span></label>
        <input id="tf4-date" v-model="form.dueDate" type="date"
          :min="isEditing ? undefined : today"
          required aria-required="true"
          :aria-invalid="showErrors && !!errors.dueDate"
          aria-describedby="tf4-date-hint tf4-date-error" />
        <small id="tf4-date-hint">
          {{ isEditing ? 'У старих завдань минулу дату можна залишити без змін.' : 'Не раніше сьогоднішнього дня.' }}
        </small>
        <p v-if="showErrors && errors.dueDate" id="tf4-date-error" class="tf4-error" role="alert">
          {{ errors.dueDate }}
        </p>
      </div>

      <div class="tf4-preview tf4-field--wide" aria-live="polite">
        <strong>Попередній перегляд</strong>
        <p>{{ form.title || 'Назва нового завдання' }}</p>
        <span>{{ statusLabels[form.status] }} · {{ priorityLabels[form.priority] }} · {{ categoryLabels[form.category] }}</span>
      </div>

      <div class="tf4-actions tf4-field--wide">
        <button type="submit" class="tf4-save">
          {{ isEditing ? 'Зберегти зміни' : 'Створити завдання' }}
        </button>
        <!-- Додаткове завдання 4 -->
        <button v-if="!isEditing" type="button" class="tf4-cancel" @click="resetForm">
          Очистити форму
        </button>
        <button type="button" class="tf4-cancel" @click="emit('cancel')">
          Скасувати
        </button>
      </div>
    </form>
  </div>
</template>
