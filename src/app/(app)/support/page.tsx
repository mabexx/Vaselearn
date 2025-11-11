'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
    {
        question: "How do I reset my password?",
        answer: "You can reset your password from the login page. Click on 'Forgot Password' and follow the instructions sent to your email address."
    },
    {
        question: "How are my quiz results saved?",
        answer: "Your quiz results, including scores and mistakes, are automatically saved to your account after you complete a session. You can review past performance in your Dashboard and see incorrect answers in the Mistake Vault."
    },
    {
        question: "Can I export my notes?",
        answer: "Yes! In the Notes section, you can click the 'Download' icon to export all of your notes as a single JSON file for your records."
    },
    {
        question: "How are flashcards created?",
        answer: "Flashcards are automatically created for every question you answer incorrectly during a quiz. They appear in the 'Flashcards' section for you to review and practice."
    }
]

export default function SupportPage() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <LifeBuoy className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl">Support Center</CardTitle>
                        <CardDescription>
                            Have questions? We're here to help. Find answers to common questions or get in touch with our support team.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid gap-8 md:grid-cols-2">
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Mail className="h-5 w-5"/> Contact Us</h3>
                    <p className="text-muted-foreground mb-4">
                        For issues that are not covered in the FAQ, please don't hesitate to email our support team directly. We'll get back to you as soon as possible.
                    </p>
                    <Button asChild>
                        <a href="mailto:vasic@gmail.com">Email Support</a>
                    </Button>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-xl font-semibold mb-4">Community & Status</h3>
                     <p className="text-muted-foreground mb-4">
                        Check our system status page for any ongoing incidents or connect with other users in our community forums. (Links coming soon!)
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" disabled>System Status</Button>
                        <Button variant="outline" disabled>Community Forum</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Here are some of the most common questions we receive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
