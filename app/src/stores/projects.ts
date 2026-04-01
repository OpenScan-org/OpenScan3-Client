import { defineStore } from 'pinia';
import { apiClient, getApiSdk } from 'src/services/apiClient';
import { type Project } from 'src/generated/api';

function unwrapPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  if ('data' in (payload as Record<string, unknown>)) {
    return (payload as { data?: unknown }).data;
  }
  return payload;
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    scans: project.scans ?? {},
  };
}

function normalizeProjects(payload: unknown): Project[] {
  const source = unwrapPayload(payload);
  if (Array.isArray(source)) {
    return source
      .filter((project): project is Project => Boolean(project && typeof project === 'object' && typeof (project as Project).name === 'string'))
      .map((project) => normalizeProject(project));
  }
  if (!source || typeof source !== 'object') {
    return [];
  }
  return Object.values(source as Record<string, Project | null | undefined>)
    .filter((project): project is Project => Boolean(project && typeof project.name === 'string'))
    .map((project) => normalizeProject(project));
}

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [] as Project[],
    loading: false,
    error: null as string | null,
  }),
  getters: {
    getProjectByName: (state) => (name: string) =>
      state.projects.find(p => p.name === name),
    projectNames: (state) => state.projects
      .filter((project) => project && project.name)
      .map((project) => ({ label: project.name, value: project.name })),
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
        const response = await getApiSdk().getProjects({ client: apiClient });
        this.projects = normalizeProjects(response);
      } catch (error) {
        this.error = 'Error loading projects';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    async createProject(name: string, description?: string) {
      try {
        const response = await getApiSdk().newProject({
          path: { project_name: name },
          query: { project_description: description || '' },
          client: apiClient
        });
        const payload = unwrapPayload(response);
        const newProj = (payload && typeof payload === 'object' ? payload : null) as Project | null;
        if (!newProj || typeof newProj.name !== 'string') {
          await this.fetchProjects();
          throw new Error('Project creation response did not contain a project object.');
        }
        const normalized = normalizeProject(newProj);
        this.projects.push(normalized);
        return normalized;
      } catch (error) {
        this.error = 'Error creating the project';
        throw error;
      }
    },
    // Optional: Add more actions like deleteProject, etc.
  },
});
