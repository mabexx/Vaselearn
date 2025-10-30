// /components/PaymentRequiredScreen.tsx

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
// Assume useAuth returns an object with the Firebase auth instance
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'firebase/auth';

const PaymentRequiredScreen: React.FC = () => {
  const router = useRouter();
  const { auth } = useAuth();

  const handleRetryAccess = async () => {
    try {
      // 1. Sign out the user for a clean retry attempt
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      // Proceed to login page even if sign-out fails
    }
    // 2. Redirect back to the login/sign-up page to restart the flow
    router.push('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Access Pending Verification 🔒
        </h1>
        <p className="text-gray-700 mb-6">
          Thank you for signing up! Access to **vaselearn.vercel.app** requires payment verification.
          Your account is created, but **full access is blocked** until payment is confirmed.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          To Proceed (2 Steps):
        </h2>

        <ol className="text-left space-y-3 mb-6 list-decimal list-inside text-gray-600">
          <li>
            Complete your payment via **CBE/CBEBIRR** using the instructions provided previously.
          </li>
          <li>
            **IMPORTANT:** Forward the payment receipt and the **exact email address** used for sign-up to our verification team.
          </li>
        </ol>

        <p className="text-sm text-gray-500 mb-8">
          Once your payment is manually whitelisted, you can sign in again.
        </p>

        <button
          onClick={handleRetryAccess}
          className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150"
        >
          I have completed payment / Try Signing In Again
        </button>
      </div>
    </div>
  );
};

export default PaymentRequiredScreen;
