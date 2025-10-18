
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { Logo } from '@/components/icons';

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
        toast({
            title: 'Terms and Conditions',
            description: 'You must agree to the Terms of Service and Privacy Policy to create an account.',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const displayName = `${firstName} ${lastName}`.trim();
      
      // Update Firebase Auth profile
      await updateProfile(user, { displayName });

      // Create user profile document in Firestore
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileRef = doc(firestore, 'users', user.uid);
      await setDocumentNonBlocking(
        userProfileRef,
        {
          id: user.uid,
          name: displayName,
          email: user.email,
          createdAt: serverTimestamp(),
        },
        { merge: true } // ✅ Add this
      );

      toast({
        title: 'Account Created',
        description: "You've been successfully signed up.",
      });
      router.push('/home');

    } catch (error: any) {
      console.error(error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'This email is already registered. Please login instead.';
      } else if (error.code === 'auth/weak-password') {
        description = 'The password is too weak. Please use at least 6 characters.';
      } else {
        description = error.message;
      }
      toast({
        title: 'Signup Failed',
        description: description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
            <Logo className="h-10 w-10 mb-4 text-primary" />
            <h1 className="text-3xl font-bold">Create Your StudyFlow Account</h1>
            <p className="text-muted-foreground">Unlock a smarter way to learn.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Sign Up</CardTitle>
            <CardDescription>
              Enter your information to create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name"
                    placeholder="Max"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name"
                    placeholder="Robinson"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center space-x-2">
                  <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      disabled={isLoading}
                  />
                  <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                      I agree to the 
                      <Link href="/terms" className="underline text-primary" target="_blank"> Terms of Service</Link> and 
                      <Link href="/privacy" className="underline text-primary" target="_blank"> Privacy Policy</Link>.
                  </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !agreedToTerms}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create an account
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
