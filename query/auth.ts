import { useMutation } from "@tanstack/react-query";
import { login } from "../service/auth";

interface LoginRequest {
  email: string;
  password: string;
}

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
  });
};