import internal from "stream";

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

export interface ImageSettings {

}

export interface ScanSettingsModel {
  project_name: string;
  camera: any;
  method: any;
  points: number;
}