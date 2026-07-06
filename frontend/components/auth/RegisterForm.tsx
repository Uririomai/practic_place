'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const registerSchema = z.object({
  email: z.string().email('Неверный email'),
  password: z.string()
    .min(6, 'Пароль минимум 6 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать заглавную букву'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { register: registerUser } = useAuth();
  const router = useRouter();

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.email, data.password);
      router.push('/cabinet');
    } catch (error) {
      form.setError('email', {
        type: 'manual',
        message: 'Пользователь уже существует',
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormItem>
        <FormLabel>Email</FormLabel>
        <Input
          type="email"
          placeholder="email@example.com"
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <FormMessage>{form.formState.errors.email.message}</FormMessage>
        )}
      </FormItem>
      <FormItem>
        <FormLabel>Пароль</FormLabel>
        <Input
          type="password"
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <FormMessage>{form.formState.errors.password.message}</FormMessage>
        )}
      </FormItem>
      <FormItem>
        <FormLabel>Повторите пароль</FormLabel>
        <Input
          type="password"
          {...form.register('confirmPassword')}
        />
        {form.formState.errors.confirmPassword && (
          <FormMessage>{form.formState.errors.confirmPassword.message}</FormMessage>
        )}
      </FormItem>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.errors.confirmPassword ? 'Пароли не совпадают' : (form.formState.isSubmitting ? 'Регистрация...' : 'Зарегистрироваться')}
      </Button>
    </form>
  );
}