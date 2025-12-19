export interface Todo {
  id: number;
  content: string;
}

export interface Meta {
  totalCount: number;
}

export interface Project {
  name: string;
  path: string;
  photos: string[];
  date: Date;
  uploaded: boolean;
}

export type ImageSettings = Record<string, unknown>;

export interface Camera {
  type: string;
  name: string;
  path: string;
  settings: Record<string, unknown>;
}

export interface ScanSettingsModel {
  project_name: string;
  camera?: Record<string, unknown>;
  method?: Record<string, unknown>;
  points: number;
}

export interface EssentialLinkProps {
  title: string;
  target?: string;
  link?: string;
  icon?: string;
  badge?: string;
}