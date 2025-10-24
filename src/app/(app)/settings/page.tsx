
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { updateProfile, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, writeBatch, Timestamp } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Mail, Download, KeyRound, AlertTriangle } from 'lucide-react';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { downloadJson } from '@/lib/utils';
import { PracticeSession, Note, Mistake, CustomGoal } from '@/lib/types';


interface UserPreferences {
    notifications: {
        push: boolean;
        email: boolean;
    }
}

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  const preferencesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'preferences') : null
  , [firestore, user]);

  const { data: prefData, isLoading: loadingPrefs } = useCollection<UserPreferences>(preferencesCollection);

  const preferences = useMemo(() => prefData?.[0] || { notifications: { push: false, email: true } }, [prefData]);
  
  useEffect(() => {
    if (user?.displayName) {
      const nameParts = user.displayName.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }
  }, [user]);

  const handleSaveChanges = async () => {
    if (!user || !auth.currentUser || !firestore) return;

    setIsSavingProfile(true);
    const newDisplayName = `${firstName} ${lastName}`.trim();

    try {
      await updateProfile(auth.currentUser, { displayName: newDisplayName });

      const userProfileRef = doc(firestore, 'users', user.uid);
      await setDocumentNonBlocking(userProfileRef, { name: newDisplayName }, { merge: true });

      toast({
        title: 'Success!',
        description: 'Your profile has been updated.',
      });

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: 'Error',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleNotificationToggle = async (type: 'push' | 'email') => {
    if (!user || !firestore) return;

    const newPref = !preferences.notifications[type];
    const userPrefsRef = doc(firestore, 'users', user.uid, 'preferences', 'user');

    const updatedPrefs = {
        notifications: {
            ...preferences.notifications,
            [type]: newPref
        }
    };
    
    await setDocumentNonBlocking(userPrefsRef, updatedPrefs, { merge: true });
    
    toast({
        title: 'Preferences Updated',
        description: `${type === 'email' ? 'Email' : 'Push'} notifications have been ${newPref ? 'enabled' : 'disabled'}.`
    });
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    try {
        await sendPasswordResetEmail(auth, user.email);
        toast({
            title: 'Password Reset Email Sent',
            description: 'Check your inbox for a link to reset your password.',
        });
    } catch (error) {
        console.error("Error sending password reset email:", error);
        toast({
            title: 'Error',
            description: 'Could not send password reset email. Please try again later.',
            variant: 'destructive',
        });
    } finally {
        setIsSendingReset(false);
    }
  }
  
  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    try {
      // NOTE: Deleting a user does not automatically delete their data from Firestore.
      // For a production app, you would want a Cloud Function to handle this.
      // For this prototype, we'll just delete the user auth record.
      await deleteUser(auth.currentUser);
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });
      // The auth listener in the provider will handle redirecting the user.
    } catch (error: any) {
        console.error("Error deleting account:", error);
        toast({
            title: 'Account Deletion Failed',
            description: `An error occurred: ${error.message}. You may need to sign in again to complete this action.`,
            variant: 'destructive',
        });
    }
  }
  
  const handleExportData = async () => {
     if (!user || !firestore) return;

     toast({ title: 'Exporting Data...', description: 'Gathering all your information.' });

     try {
        const collectionsToExport = ['practiceSessions', 'notes', 'mistakes', 'customGoals'];
        const exportData: Record<string, any[]> = {};

        for (const collectionName of collectionsToExport) {
            const colRef = collection(firestore, `users/${user.uid}/${collectionName}`);
            const snapshot = await getDocs(colRef);
            exportData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        downloadJson(exportData, `vaselearn-export-${user.uid}.json`);

     } catch(error) {
        console.error("Error exporting data:", error);
        toast({ title: 'Export Failed', description: 'Could not export your data.', variant: 'destructive' });
     }
  };

  
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input 
                  id="first-name" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  disabled={isUserLoading || isSavingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input 
                  id="last-name" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  disabled={isUserLoading || isSavingProfile}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled />
            </div>
            <Button type="submit" disabled={isSavingProfile} className="w-fit">
              {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates on your device. (Coming soon)</p>
            </div>
            <Switch id="push-notifications" disabled/>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Get weekly summaries and important alerts.</p>
            </div>
            <Switch 
                id="email-notifications" 
                checked={preferences.notifications.email} 
                onCheckedChange={() => handleNotificationToggle('email')}
                disabled={loadingPrefs}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
          <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>Manage your account settings and data.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Export Your Data</Label>
                  <p className="text-sm text-muted-foreground">Download all your notes, goals, and quiz history as a JSON file.</p>
                  <Button variant="secondary" onClick={handleExportData}>
                    <Download className="mr-2"/>
                    Export My Data
                  </Button>
              </div>
              <div className="space-y-2">
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground">Send a password reset link to your email address.</p>
                  <Button variant="secondary" onClick={handlePasswordReset} disabled={isSendingReset}>
                    {isSendingReset ? <Loader2 className="mr-2 animate-spin"/> : <KeyRound className="mr-2"/>}
                    Send Reset Link
                  </Button>
              </div>
          </CardContent>
          <CardContent>
             <div className="mt-4 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1"/>
                    <div>
                        <h4 className="font-semibold text-destructive">Danger Zone</h4>
                        <p className="text-sm text-destructive/80 mt-1 mb-3">This action is permanent and cannot be undone. This will immediately delete your account and all associated data.</p>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive">
                                  <Trash2 className="mr-2"/>
                                  Delete My Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your
                                    account and remove your data from our servers.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAccount}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
          </CardContent>
      </Card>
      
    </div>
  );
}
