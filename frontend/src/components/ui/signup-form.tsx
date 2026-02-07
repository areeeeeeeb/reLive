import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface SignupFormProps {
  onSuccess?: () => void;
  className?: string;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onSuccess,
  className
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { signup, isLoading, error: authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }
    try {
      await signup(email, password, name);
      onSuccess?.();
    } catch (err: any) {
      // Display detailed error message from Auth0
      if (err?.policy) {
        // Password policy error
        setLocalError('Password requirements:\n' + err.policy);
      } else if (err?.description) {
        setLocalError(err.description);
      } else if (err?.message) {
        setLocalError(err.message);
      } else {
        setLocalError('Signup failed. Please try again.');
      }
      console.error('Signup failed:', err);
    }
  };

  const displayError = localError || authError;

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
          <div className="text-sm text-destructive text-center whitespace-pre-line">
            {displayError}
          </div>
        )}

        <Field>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Field>

        
      </FieldGroup>
    </form>
  );
};
