<script setup>
import { ref, computed } from 'vue'
import AppTabbar from '../components/AppTabbar.vue'
import { readDatabaseInfo } from '../services/database'
import { persistenceState } from '../services/persistence'
import '../css/task-list.css'
import '../css/persistence.css'

// Додаткове завдання 5: значення читаються безпосередньо з IndexedDB, а не з Pinia.
const info = ref(null)
const loading = ref(false)
const error = ref('')

async function loadInfo() {
  loading.value = true
  error.value = ''
  try {
    info.value = await readDatabaseInfo()
  } catch (err) {
    console.error('TaskFlow: не вдалося прочитати IndexedDB:', err)
    error.value = 'Не вдалося прочитати локальну базу даних.'
  } finally {
    loading.value = false
  }
}

const lastSavedText = computed(() => info.value?.lastSavedAt
  ? new Date(info.value.lastSavedAt).toLocaleString('uk-UA', { dateStyle: 'long', timeStyle: 'medium' })
  : 'ще не зберігалося')
</script>

<template>
  <f7-page name="settings" class="tf3-page" @page:beforein="loadInfo">
    <f7-navbar title="Налаштування" />
    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / SETTINGS</div>
        <h1>Локальна база даних</h1>
        <p>Значення нижче прочитано безпосередньо з IndexedDB цього браузера.</p>
      </section>

      <section class="tf5-panel tf7-settings" aria-label="Відомості про IndexedDB">
        <div class="tf7-settings-head">
          <h2>taskflow-db</h2>
          <button type="button" class="tf5-btn" :disabled="loading" @click="loadInfo">
            {{ loading ? 'Читання…' : 'Оновити' }}
          </button>
        </div>
        <p v-if="error" class="tf5-error" role="alert">{{ error }}</p>
        <dl v-else-if="info" class="tf7-settings-list">
          <div><dt>Збережено завдань</dt><dd>{{ info.taskCount }}</dd></div>
          <div><dt>Збережено проєктів</dt><dd>{{ info.projectCount }}</dd></div>
          <div><dt>Останнє збереження</dt><dd>{{ lastSavedText }}</dd></div>
          <div><dt>Версія схеми</dt><dd>{{ info.version }}</dd></div>
          <div><dt>Сховища</dt><dd>{{ info.stores.join(', ') }}</dd></div>
          <div><dt>initialized</dt><dd>{{ info.initialized }}</dd></div>
          <div><dt>nextProjectId</dt><dd>{{ info.nextProjectId }}</dd></div>
          <div><dt>Стан збереження</dt><dd>{{ persistenceState.status }}</dd></div>
        </dl>
        <p v-else>Завантаження…</p>
      </section>
    </div>
    <template #fixed>
      <AppTabbar active="settings" />
    </template>
  </f7-page>
</template>

<style scoped>
.tf7-settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tf7-settings-head h2 { margin: 0; white-space: nowrap; }

.tf7-settings-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin: 16px 0 0;
}

.tf7-settings-list div {
  padding: 12px 14px;
  border: 1px solid #2b4560;
  border-radius: 10px;
  background: #10223a;
}

.tf7-settings-list dt { color: #9fc1e0; font-size: 13px; }
.tf7-settings-list dd { margin: 4px 0 0; color: #fff; font-size: 18px; font-weight: 700; word-break: break-word; }
</style>
