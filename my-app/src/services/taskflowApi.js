// taskflow/src/services/taskflowApi.js
// Окремий клієнт HTTP API. Pinia та IndexedDB поки не змінюємо.

const API_BASE_URL =
  import.meta.env.VITE_TASKFLOW_API_URL || 'http://localhost:8787'

// Додаткове завдання 4: час очікування відповіді за замовчуванням (мс).
const DEFAULT_TIMEOUT_MS = 8000

async function apiRequest(path, options = {}) {
  // Додаткове завдання 4: AbortController перериває запит після timeoutMs.
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
        ...fetchOptions.headers,
      },
    })
  } catch (cause) {
    if (cause.name === 'AbortError') {
      const error = new Error(`Сервер не відповів за ${timeoutMs} мс.`)
      error.status = 0
      error.details = { error: 'Timeout', timeoutMs }
      throw error
    }
    throw cause
  } finally {
    clearTimeout(timer)
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Помилка API')
    error.status = response.status
    error.details = data
    throw error
  }

  return data
}

export function getHealth() {
  return apiRequest('/api/health')
}

export function getTasks({ status = '', search = '' } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (search) params.set('q', search)

  const query = params.toString()
  return apiRequest(`/api/tasks${query ? `?${query}` : ''}`)
}

export function getTask(id) {
  return apiRequest(`/api/tasks/${encodeURIComponent(id)}`)
}

export function validateTask(task) {
  return apiRequest('/api/tasks/validate', {
    method: 'POST',
    body: JSON.stringify(task),
  })
}

// Додаткове завдання 3: статистика демонстраційних завдань.
export function getStats() {
  return apiRequest('/api/stats')
}

// Додаткове завдання 4: довільний запит із власним часом очікування
// (для перевірки: api.requestWithTimeout('/api/health', 1)).
export function requestWithTimeout(path, timeoutMs) {
  return apiRequest(path, { timeoutMs })
}
