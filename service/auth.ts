import axios from "axios";
import axiosClient, { isOakApi } from "../lib/axios";

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
        const response = await axiosClient.post(
            isOakApi ? '/auth/admin/login' : '/v1/auth/admin-login',
            data,
        );
        return isOakApi
            ? { ...response.data, accessToken: response.data.token }
            : response.data;
    } catch (error: unknown) {
        console.error('Login error:', error);
        const message = axios.isAxiosError(error)
            ? error.response?.data?.message
            : undefined;
        throw new Error(message || 'Login failed');
    }
};
