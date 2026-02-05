import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Play,
  Mail,
  Lock,
  User,
  Check,
  Phone,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/api';

/* =========================
   ZOD SCHEMA (FASTAPI MATCH)
========================= */
const SignupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone_number: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Invalid phone number'),
    role: z.enum(['user', 'instructor']),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof SignupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      role: 'user',
      password: '',
      confirmPassword: '',
    },
  });

  const {
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const password = watch('password');

  /* =========================
        API CALL
  ========================= */
  const onSubmit = async (data: SignupFormData) => {
    const success = await signup(data.email, data.password, data.name, data.role);

    if (success) {
      // Redirect based on role
      const redirectPath = data.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
      console.log('🚀 Signup successful, redirecting to:', redirectPath);

      // Small delay to ensure state updates
      setTimeout(() => {
        navigate(redirectPath);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Play className="h-10 w-10 text-primary fill-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Sign up to get started</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* NAME */}
            <div>
              <Label>Full Name</Label>
              <Input {...form.register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            {/* EMAIL */}
            <div>
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {/* PHONE */}
            <div>
              <Label>Phone Number</Label>
              <Input type="tel" {...form.register('phone_number')} />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            {/* ROLE */}
            <div>
              <Label>Role</Label>
              <select
                {...form.register('role')}
                className="w-full border rounded-md p-2 bg-background"
              >
                <option value="user">User</option>
                <option value="instructor">Instructor</option>

              </select>
            </div>

            {/* PASSWORD */}
            <div>
              <Label>Password</Label>
              <Input type="password" {...form.register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                {...form.register('confirmPassword', {
                  validate: (val) =>
                    val === password || "Passwords don't match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Signup;