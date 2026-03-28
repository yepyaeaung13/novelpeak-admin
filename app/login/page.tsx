"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useLoginMutation } from "../../query/auth";
import { useUserStore } from "@/lib/store/user";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const setUser = useUserStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const response = await loginMutation.mutateAsync({ email, password });
      // Set cookie for middleware
      Cookies.set("auth", "true", { path: "/" });
      if (response.accessToken) {
        Cookies.set("accessToken", response.accessToken, { path: "/" });
      }

      const loggedInUser = response.user
        ? response.user
        : {
            email,
            name: email.split("@")[0],
          };

      setUser(loggedInUser, response.accessToken || "");
      router.push("/");
    } catch (error: any) {
      setError(error.message || "An error occurred during login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-96"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Login
        </button>
      </form>
    </div>
  );
}
