import { defineStore } from 'pinia'
import { useTasksStore } from './tasks' // Додаткове завдання 1

// Окреме сховище для каталогу проєктів.
// Сховище лише в оперативній пам'яті: IndexedDB буде в роботі № 7.
export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [
      { id: 'general', title: 'Загальні' },
      { id: 'study', title: 'Навчання' },
      { id: 'personal', title: 'Особисті' },
    ],
    nextProjectId: 1,
  }),

  getters: {
    projectCount: (state) => state.projects.length,
    projectTitle: (state) => (id) =>
      state.projects.find((project) => project.id === id)?.title ?? 'Загальні',

    // Додаткові завдання 1–3: статистика кожного проєкту обчислюється в сховищі,
    // а не в локальному computed сторінки (кількість, невиконані, відсоток виконаних).
    projectStats: (state) => {
      const taskStore = useTasksStore()
      return state.projects.map((project) => {
        const projectTasks = taskStore.tasks.filter((task) => task.projectId === project.id)
        const total = projectTasks.length
        const completed = projectTasks.filter((task) => task.status === 'done').length
        return {
          ...project,
          taskCount: total,
          total,
          completed,
          active: total - completed,
          // Додаткове завдання 3: completed / total × 100, за нульового total — 0 %
          percent: total === 0 ? 0 : Math.round((completed / total) * 100),
        }
      })
    },
  },

  actions: {
    addProject(rawTitle) {
      const title = String(rawTitle ?? '').trim()
      if (title.length < 3 || title.length > 40) return null

      const duplicate = this.projects.some(
        (project) => project.title.toLocaleLowerCase('uk-UA') ===
          title.toLocaleLowerCase('uk-UA'),
      )
      if (duplicate) return null

      const project = { id: `project-${this.nextProjectId}`, title }
      this.nextProjectId += 1
      this.projects.push(project)
      return project
    },
  },
})
