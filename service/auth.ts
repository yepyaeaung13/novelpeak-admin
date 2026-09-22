import axios from "axios";
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
    token?: string;
    refreshToken?: string;
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
    try {
        const response = await axiosClient.post('/auth/admin/login', data);
        return { ...response.data, accessToken: response.data.token };
    } catch (error: unknown) {
        console.error('Login error:', error);
        const message = axios.isAxiosError(error)
            ? error.response?.data?.message
            : undefined;
        throw new Error(message || 'Login failed');
    }
};
