
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when you use our service. This includes:
          </p>
          <ul>
            <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and password.</li>
            <li><strong>User Content:</strong> We collect the notes, goals, quiz results, and other content you create while using the service.</li>
            <li><strong>AI Interaction Data:</strong> Prompts you provide to our AI features and the generated outputs are processed to provide the service.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our services.</li>
            <li>Personalize the service, for instance, by generating personalized quizzes based on your past performance.</li>
            <li>Communicate with you, including sending you service-related announcements.</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
            <li>Detect, investigate and prevent fraudulent transactions and other illegal activities and protect the rights and property of StudyFlow and others.</li>
          </ul>

          <h2>3. How We Share Information</h2>
          <p>
            We do not share your personal information with third parties except in the following circumstances:
          </p>
          <ul>
            <li>With vendors, consultants, and other service providers who need access to such information to carry out work on our behalf (e.g., cloud hosting providers, AI model providers).</li>
            <li>If we believe disclosure is necessary to comply with any applicable law, regulation, legal process or governmental request.</li>
            <li>In connection with, or during negotiations of, any merger, sale of company assets, financing or acquisition of all or a portion of our business by another company.</li>
          </ul>

           <h2>4. Data Security</h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration, and destruction. We use Firebase, a Google product, for our backend infrastructure, which provides robust security measures.
          </p>

          <h2>5. Your Choices</h2>
          <p>
            You may update, correct or delete information about you at any time by logging into your account and accessing the settings page. If you wish to delete your account, please contact us. Note that we may retain certain information as required by law or for legitimate business purposes.
          </p>
          
          <hr />
          <p className="text-center">
            <Link href="/login" className="text-primary hover:underline">Back to App</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
