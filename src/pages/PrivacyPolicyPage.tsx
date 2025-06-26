import { Link } from 'react-router-dom'
import { Calendar, ArrowLeft, Shield, FileText, Mail, User, Clock, Lock } from 'lucide-react'

export const PrivacyPolicyPage = () => {
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
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Privacy Policy</h1>
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
                Family Scheduler ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our family scheduling application.
              </p>
              <p>
                We take your privacy seriously and have designed our practices to comply with applicable privacy laws, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Information We Collect
              </h2>
              <p>We collect the following types of information:</p>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Personal Information</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Email address (required for account creation)</li>
                <li>Family information (family name, member names, relationships)</li>
                <li>Optional profile information (birthdays, anniversaries, addresses)</li>
                <li>Calendar events and schedules you create</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mt-4">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information (device type, operating system)</li>
                <li>Usage patterns and feature interactions</li>
                <li>Performance data and error reports</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                How We Use Your Information
              </h2>
              <p>We use your information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>To provide and maintain our service</li>
                <li>To notify you about changes to our service</li>
                <li>To allow you to participate in interactive features</li>
                <li>To provide customer support</li>
                <li>To gather analysis to improve our service</li>
                <li>To monitor the usage of our service</li>
                <li>To detect, prevent and address technical issues</li>
                <li>To send you event reminders and notifications (with your consent)</li>
                <li>To send you marketing communications (only with explicit consent)</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-blue-600" />
                Data Security
              </h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage. These measures include:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and testing</li>
                <li>Access controls and authentication requirements</li>
                <li>Regular backups and disaster recovery procedures</li>
                <li>Staff training on data protection and security</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                Marketing Communications
              </h2>
              <p>
                We may send you marketing communications about our services, but only if you have explicitly opted in to receive such communications. Each marketing email includes an unsubscribe link, and you can change your preferences at any time in your account settings.
              </p>
              <p>
                We maintain records of your marketing consent, including when and how you provided consent, and honor your choices promptly.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Your Data Rights</h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Right to Access:</strong> You can request a copy of your personal data.</li>
                <li><strong>Right to Rectification:</strong> You can request correction of inaccurate data.</li>
                <li><strong>Right to Erasure:</strong> You can request deletion of your data under certain circumstances.</li>
                <li><strong>Right to Restrict Processing:</strong> You can request we limit how we use your data.</li>
                <li><strong>Right to Data Portability:</strong> You can request a copy of your data in a machine-readable format.</li>
                <li><strong>Right to Object:</strong> You can object to certain types of processing.</li>
                <li><strong>Right to Withdraw Consent:</strong> You can withdraw consent at any time.</li>
              </ul>
              <p>
                To exercise these rights, please visit your Account Settings page or contact us at privacy@familyscheduler.com.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Cookies and Similar Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.
              </p>
              <p>
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
              </p>
              <p>
                We use the following types of cookies:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Essential cookies:</strong> Necessary for the website to function properly.</li>
                <li><strong>Functional cookies:</strong> Remember your preferences and settings.</li>
                <li><strong>Analytics cookies:</strong> Help us understand how you use our service.</li>
                <li><strong>Marketing cookies:</strong> Used to deliver relevant advertisements (only with consent).</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Data Retention</h2>
              <p>
                We retain your personal data only for as long as necessary to fulfill the purposes for which we collected it, including for the purposes of satisfying any legal, accounting, or reporting requirements.
              </p>
              <p>
                If you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal reasons.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Children's Privacy</h2>
              <p>
                Our service is not directed to anyone under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <p>
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>By email: privacy@familyscheduler.com</li>
                <li>By visiting the contact page on our website</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}