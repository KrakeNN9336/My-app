// Додаткові завдання 1–2: експорт та імпорт завдань і проєктів у форматі JSON.
// У файл потрапляють лише tasks, projects і дата експорту — без паролів і токенів.

const STATUSES = ['todo', 'progress', 'done']
const PRIORITIES = ['low', 'medium', 'high']

export function buildExport(tasks, projects) {
  return {
    app: 'TaskFlow',
    format: 1,
    exportedAt: new Date().toISOString(),
    tasks: JSON.parse(JSON.stringify(tasks)),
    projects: JSON.parse(JSON.stringify(projects)),
  }
}

export function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `taskflow-export-${data.exportedAt.slice(0, 10)}.json`
  // Клас external: роутер Framework7 не перехоплює це посилання як перехід між сторінками.
  link.className = 'external'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Перевіряємо структуру, типи полів, projectId і унікальність id.
// Повертаємо { ok, errors, data }; до сховищ потрапляють лише перевірені дані.
export function validateImport(raw) {
  const errors = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Файл має містити JSON-об’єкт.'] }
  }
  if (!Array.isArray(raw.tasks)) errors.push('Поле tasks має бути масивом.')
  if (!Array.isArray(raw.projects)) errors.push('Поле projects має бути масивом.')
  if (errors.length) return { ok: false, errors }

  const projectIds = new Set()
  raw.projects.forEach((project, index) => {
    const label = `projects[${index}]`
    if (!project || typeof project !== 'object') {
      errors.push(`${label}: очікується об’єкт.`)
      return
    }
    if (typeof project.id !== 'string' || !project.id.trim()) {
      errors.push(`${label}: id має бути непорожнім рядком.`)
    } else if (projectIds.has(project.id)) {
      errors.push(`${label}: id «${project.id}» повторюється.`)
    } else {
      projectIds.add(project.id)
    }
    if (typeof project.title !== 'string' || project.title.trim().length < 3 ||
      project.title.trim().length > 40) {
      errors.push(`${label}: title має бути рядком довжиною 3–40 символів.`)
    }
  })

  const taskIds = new Set()
  raw.tasks.forEach((task, index) => {
    const label = `tasks[${index}]`
    if (!task || typeof task !== 'object') {
      errors.push(`${label}: очікується об’єкт.`)
      return
    }
    if (!Number.isSafeInteger(task.id) || task.id < 1) {
      errors.push(`${label}: id має бути додатним цілим числом.`)
    } else if (taskIds.has(task.id)) {
      errors.push(`${label}: id ${task.id} повторюється.`)
    } else {
      taskIds.add(task.id)
    }
    if (typeof task.title !== 'string' || task.title.trim().length < 3 ||
      task.title.trim().length > 80) {
      errors.push(`${label}: title має бути рядком довжиною 3–80 символів.`)
    }
    if (task.description !== undefined &&
      (typeof task.description !== 'string' || task.description.length > 500)) {
      errors.push(`${label}: description має бути рядком до 500 символів.`)
    }
    if (!STATUSES.includes(task.status)) errors.push(`${label}: недопустимий status.`)
    if (!PRIORITIES.includes(task.priority)) errors.push(`${label}: недопустимий priority.`)
    if (task.dueDate !== undefined && task.dueDate !== '' &&
      !(typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))) {
      errors.push(`${label}: dueDate має бути порожнім або у форматі РРРР-ММ-ДД.`)
    }
    if (typeof task.projectId !== 'string' || !task.projectId) {
      errors.push(`${label}: відсутній projectId.`)
    } else if (!projectIds.has(task.projectId)) {
      errors.push(`${label}: проєкт «${task.projectId}» відсутній у списку projects.`)
    }
  })

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    data: {
      projects: raw.projects.map((project) => ({ id: project.id, title: project.title.trim() })),
      tasks: raw.tasks.map((task) => ({
        id: task.id,
        title: task.title.trim(),
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? '',
        projectId: task.projectId,
      })),
    },
  }
}
