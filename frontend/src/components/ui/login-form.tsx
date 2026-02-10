import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/primitives/button';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription
} from '@/components/primitives/field';
import { Input } from '@/components/primitives/input';
import { Link } from '@/components/primitives/link';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  className
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, isLoading, error: authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // basic validation
    if (!username || !password) {
      setLocalError('Please enter both username and password');
      return;
    }
    try {
      await login(username, password);
      onSuccess?.();
    } catch (err) {
      // error is handled by AuthContext
      console.error('Login failed:', err);
    }
  };

  const displayError = localError || authError;

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit}>
      <FieldGroup>
         <div className="flex flex-col items-center gap-2 text-center">
            
            <h1 className="text-xl font-bold">Welcome to reLive</h1>
            <FieldDescription>
              Don&apos;t have an account? <Link to="/signup" className='text-chartreuse underline'>Sign up</Link>
            </FieldDescription>
          </div>

        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            required
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link to="#" className="ml-auto text-sm">
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </Field>

        {displayError && (
          <div className="text-sm text-destructive text-center">
            {displayError}
          </div>
        )}

        <Field>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Signing in...' : 'Login'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
