import { defineStore } from 'pinia';
import { apiClient } from 'src/services/apiClient';
import { getProjects, newProject, type Project } from 'src/generated/api';

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [] as Project[],
    loading: false,
    error: null as string | null,
  }),
  getters: {
    getProjectByName: (state) => (name: string) =>
      state.projects.find(p => p.name === name),
    projectNames: (state) => state.projects.map(p => ({ label: p.name, value: p.name })),
    recentProjects: (state) => {
      const sorted = [...state.projects].sort((a, b) => {
        const getLastActivity = (p: Project) => {
          const scanTimes = Object.values(p.scans || {}).map(s => {
            const t = s.last_updated ? new Date(s.last_updated).getTime() : 0;
            return isNaN(t) ? 0 : t;
          });
          const lastScanTime = Math.max(0, ...scanTimes);
          
          let projectCreatedTime = 0;
          if (p.created) {
            const t = new Date(p.created).getTime();
            projectCreatedTime = isNaN(t) ? 0 : t;
          }
          
          return Math.max(lastScanTime, projectCreatedTime);
        };
        return getLastActivity(b) - getLastActivity(a);
      });
      return sorted.slice(0, 3);
    },
  },
  actions: {
    async fetchProjects() {
      this.loading = true;
      this.error = null;
      try {
        const data = await getProjects({ client: apiClient });
        this.projects = Object.values(data ?? {});
      } catch (error) {
        this.error = 'Error loading projects';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    async createProject(name: string, description?: string) {
      try {
        const newProj = await newProject({
          path: { project_name: name },
          query: { project_description: description || '' },
          client: apiClient
        });
        this.projects.push(newProj);
        return newProj;
      } catch (error) {
        this.error = 'Error creating the project';
        throw error;
      }
    },
    // Optional: Add more actions like deleteProject, etc.
  },
});
