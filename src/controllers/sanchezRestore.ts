import SanchezRestoreService from '../services/sanchezRestore'
import { CreateProjectInput, UpdateProjectInput, UploadImageInput } from '../types/sanchezRestore'

export default class SanchezRestoreController {
    static listProjects() { return SanchezRestoreService.listProjects() }
    static getProject(id: string) { return SanchezRestoreService.getProject(id) }
    static createProject(input: CreateProjectInput) { return SanchezRestoreService.createProject(input) }
    static updateProject(id: string, input: UpdateProjectInput) { return SanchezRestoreService.updateProject(id, input) }
    static deleteProject(id: string) { return SanchezRestoreService.deleteProject(id) }
    static listImages(projectId: string) { return SanchezRestoreService.listImages(projectId) }
    static getImage(id: string) { return SanchezRestoreService.getImage(id) }
    static createImage(input: UploadImageInput) { return SanchezRestoreService.createImage(input) }
    static deleteImage(id: string) { return SanchezRestoreService.deleteImage(id) }
}