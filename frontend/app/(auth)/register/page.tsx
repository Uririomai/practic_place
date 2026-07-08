"use client";

import { RegisterForm } from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { apiClient } from '@/shared/api/client';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Если уже авторизован — редирект в кабинет
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.setToken(token);
      router.replace('/cabinet');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Регистрация</h1>
          <p className="text-gray-600 mt-2">
            Создайте аккаунт для доступа к практике
          </p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Войдите
          </Link>
        </p>
      </div>
    </div>
  );
}
