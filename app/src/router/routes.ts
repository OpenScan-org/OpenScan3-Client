import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'scan', component: () => import('pages/ScanPage.vue') },
      { path: 'settings', component: () => import('pages/SettingsPage.vue') },
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
