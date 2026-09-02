import axios from 'axios'
import config from 'config'
import { Credientials } from '../types/auth'

const BEEP_AUTH_URL = process.env.BEEP_AUTH_URL || config.get<string>('auth.beepAuthUrl') || 'http://localhost:5000'

export interface LoginResponse {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
}

export interface AuthResponse {
    success: boolean
    message?: string
    data?: LoginResponse
    error?: string
}

export default class AuthService {

    /**
     * Login using beep-auth API
     * Calls POST /auth/token endpoint
     */
    static async login(credentials: Credientials): Promise<AuthResponse> {
        const { username, password } = credentials;

        try {
            const response = await axios.post<LoginResponse>(
                `${BEEP_AUTH_URL}/auth/token`,
                { username, password }
            )

            console.log('User logged in via beep-auth:', username)

            return {
                success: true,
                data: response.data
            }
        } catch (err: any) {
            console.error('Login error:', err.response?.data || err.message)
            
            if (err.response?.status === 401) {
                return { success: false, message: 'Invalid username or password', error: 'INVALID_CREDENTIALS' }
            }

            return { success: false, message: 'Login failed', error: 'LOGIN_FAILED' }
        }
    }

    /**
     * Register a new user via beep-auth API
     * Calls POST /auth/register endpoint
     */
    static async register(credentials: Credientials): Promise<AuthResponse> {
        const { username, password, confirmPassword } = credentials as any;

        try {
            const response = await axios.post(
                `${BEEP_AUTH_URL}/auth/register`,
                { username, password, confirmPassword }
            )

            console.log('User registered via beep-auth:', username)

            return {
                success: true,
                message: 'User registered successfully'
            }
        } catch (err: any) {
            console.error('Registration error:', err.response?.data || err.message)

            if (err.response?.data?.error) {
                return { success: false, message: err.response.data.error, error: 'REGISTRATION_FAILED' }
            }

            return { success: false, message: 'Registration failed', error: 'REGISTRATION_FAILED' }
        }
    }

    /**
     * Refresh access token using beep-auth API
     * Calls POST /auth/refresh endpoint
     */
    static async refreshToken(refreshToken: string): Promise<AuthResponse> {
        try {
            const response = await axios.post<LoginResponse>(
                `${BEEP_AUTH_URL}/auth/refresh`,
                { refreshToken }
            )

            console.log('Token refreshed via beep-auth')

            return {
                success: true,
                data: response.data
            }
        } catch (err: any) {
            console.error('Token refresh error:', err.response?.data || err.message)

            if (err.response?.status === 401) {
                return { success: false, message: 'Invalid or expired refresh token', error: 'INVALID_REFRESH_TOKEN' }
            }

            return { success: false, message: 'Token refresh failed', error: 'REFRESH_FAILED' }
        }
    }

    /**
     * Logout user via beep-auth API
     * Calls POST /auth/logout endpoint
     */
    static async logout(refreshToken: string): Promise<AuthResponse> {
        try {
            await axios.post(
                `${BEEP_AUTH_URL}/auth/logout`,
                { refreshToken },
                {
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`
                    }
                }
            )

            console.log('User logged out via beep-auth')

            return {
                success: true,
                message: 'Logged out successfully'
            }
        } catch (err: any) {
            console.error('Logout error:', err.response?.data || err.message)
            // Still consider logout successful even if it fails
            return { success: true, message: 'Logged out' }
        }
    }
    
}