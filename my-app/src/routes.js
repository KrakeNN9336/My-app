import HomePage from './pages/HomePage.vue';
import TasksPage from './pages/TasksPage.vue';
import AboutPage from './pages/AboutPage.vue';
import SettingsPage from './pages/SettingsPage.vue'; // Додаткове завдання 5

const routes = [
  { path: '/', component: HomePage },
  { path: '/tasks/', component: TasksPage },
  { path: '/settings/', component: SettingsPage },
  { path: '/about/', component: AboutPage },
];
export default routes;
