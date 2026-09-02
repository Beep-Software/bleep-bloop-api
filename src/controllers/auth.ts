import AuthService from "../services/auth"
import { Credientials } from "../types/auth"

export default class AuthController {

    static async login(credentials: Credientials) {
        return AuthService.login(credentials)
    }

    static async register(credentials: Credientials) {
        return AuthService.register(credentials)
    }

    static async refreshToken(refreshToken: string) {
        return AuthService.refreshToken(refreshToken)
    }

    static async logout(refreshToken: string) {
        return AuthService.logout(refreshToken)
    }

}
