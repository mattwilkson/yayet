import { Link } from 'react-router-dom'
import { Calendar, ArrowLeft, FileText, Shield, AlertTriangle, Clock, Globe } from 'lucide-react'

export const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Family Scheduler</span>
            </div>
            
            <Link 
              to="/"
              className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Page Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Terms of Service</h1>
                <p className="text-sm text-gray-600">
                  Last updated: June 22, 2025
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Introduction
              </h2>
              <p>
                Welcome to Family Scheduler. These Terms of Service ("Terms") govern your use of our family scheduling application (the "Service") operated by Family Scheduler ("we", "us", or "our").
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-blue-600" />
                Use of the Service
              </h2>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Account Registration</h3>
              <p>
                To use certain features of the Service, you must register for an account. When you register, you agree to provide accurate, current, and complete information about yourself.
              </p>
              <p>
                You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. We encourage you to use a strong, unique password for your account.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mt-4">Acceptable Use</h3>
              <p>
                You agree not to use the Service:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>In any way that violates any applicable law or regulation</li>
                <li>To transmit any material that is defamatory, offensive, or otherwise objectionable</li>
                <li>To impersonate any person or entity or falsely state or misrepresent your affiliation with a person or entity</li>
                <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
                <li>To attempt to gain unauthorized access to the Service, other accounts, or computer systems</li>
                <li>To interfere with the proper working of the Service</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Privacy and Data Protection
              </h2>
              <p>
                Your privacy is important to us. Our Privacy Policy, which is incorporated into these Terms, explains how we collect, use, and protect your personal information. By using the Service, you consent to the data practices described in our Privacy Policy.
              </p>
              <p>
                We are committed to complying with applicable data protection laws, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Subscription and Billing
              </h2>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Free Trial</h3>
              <p>
                We may offer a free trial period for our Service. At the end of the trial period, you will be charged according to the plan you selected unless you cancel before the trial ends.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mt-4">Subscription Plans</h3>
              <p>
                Some features of the Service require a paid subscription. By selecting a subscription plan, you agree to pay the subscription fees indicated for that plan. Subscription fees are billed in advance on a monthly or annual basis, depending on the plan you select.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mt-4">Cancellation and Refunds</h3>
              <p>
                You may cancel your subscription at any time through your account settings. Upon cancellation, your subscription will remain active until the end of your current billing period. We do not provide refunds for partial subscription periods.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
                Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, in no event shall Family Scheduler, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your access to or use of or inability to access or use the Service</li>
                <li>Any conduct or content of any third party on the Service</li>
                <li>Any content obtained from the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are and will remain the exclusive property of Family Scheduler and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
              </p>
              <p>
                Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Family Scheduler.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
              <p>
                Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or delete your account through the account settings.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes by posting the new Terms on this page and updating the "Last updated" date.
              </p>
              <p>
                Your continued use of the Service after any such changes constitutes your acceptance of the new Terms. If you do not agree to the new terms, please stop using the Service.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
              </p>
              <p>
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>By email: terms@familyscheduler.com</li>
                <li>By visiting the contact page on our website</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}