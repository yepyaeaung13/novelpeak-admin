import axiosClient from "../lib/axios";

interface LoginRequest {
    email: string;
    password: string;
}

interface LoginResponse {
    user?: {
        id: string;
        email: string;
        name: string;
        userType: string;
    };
    accessToken?: string;
    refreshToken?: string;
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
    try {
        const response = await axiosClient.post('/v1/auth/admin-login', data);
        return response.data;
    } catch (error: any) {
        console.error('Login error:', error);
        throw new Error(error.response?.data?.message || 'Login failed');
    }
};