import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'scan', component: () => import('pages/ScanPage.vue') },
      { path: 'scan/progress/:taskId?', component: () => import('pages/ScanProgressPage.vue') },
      { path: 'setup', component: () => import('pages/SetupPage.vue') },
      { path: 'settings', component: () => import('pages/SettingsPage.vue') },
      { path: 'logs', component: () => import('pages/LogsPage.vue') },
      { path: 'projects', component: () => import('pages/ProjectsPage.vue') },
      { path: 'donate', component: () => import('pages/DonationPage.vue') },
      { path: 'about', component: () => import('pages/AboutPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
