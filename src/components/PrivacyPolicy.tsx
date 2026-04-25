import React from 'react';
import { Globe as GlobeIcon, ArrowLeft } from 'lucide-react';

const PrivacyPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="min-h-screen bg-white">
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <GlobeIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black text-gray-800">
            Globo<span className="text-green-500">Trotter</span>
          </span>
        </div>
      </div>
    </nav>

    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 font-medium mb-10">Last updated: April 4, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">1. Information We Collect</h2>
          <p>When you use GloboTrotter, we collect the following information:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Account information:</strong> Your name, email address, and profile photo provided via Apple Sign In or Google Sign-In.</li>
            <li><strong>Travel data:</strong> Trip logs, destinations, dates, photos, and notes you voluntarily enter.</li>
            <li><strong>Usage data:</strong> Interactions with features (e.g., itineraries generated, pages visited) via Google Analytics.</li>
            <li><strong>Payment data:</strong> Processed securely by Stripe. We do not store your credit card details.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and improve the GloboTrotter service, including AI-generated travel itineraries.</li>
            <li>To personalize your experience based on your travel history and preferences.</li>
            <li>To process payments for Pro upgrades and fuel purchases.</li>
            <li>To send service-related communications (e.g., payment confirmations).</li>
            <li>To analyze usage patterns and improve the product.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">3. Data Storage and Security</h2>
          <p>Your data is stored securely using Google Firebase (Firestore) and protected by industry-standard encryption in transit and at rest. Photos are stored in Firebase Storage. We implement appropriate technical and organizational measures to protect your personal data.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">4. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Google Firebase:</strong> Authentication, database, and storage.</li>
            <li><strong>Anthropic Claude API:</strong> AI-powered itinerary generation (your travel preferences are sent to generate personalized plans).</li>
            <li><strong>Stripe:</strong> Payment processing.</li>
            <li><strong>Google Analytics:</strong> Product analytics.</li>
            <li><strong>Netlify:</strong> Hosting and serverless functions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Access, correct, or delete your personal data.</li>
            <li>Export your travel data.</li>
            <li>Withdraw consent for data processing at any time.</li>
            <li>Request deletion of your account and all associated data.</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, contact us at <strong>privacy@globotrottr.com</strong>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">6. Cookies and Tracking</h2>
          <p>We use essential cookies for authentication and session management. Google Analytics uses cookies for analytics purposes. You can disable non-essential cookies in your browser settings.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">7. Data Retention</h2>
          <p>We retain your data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where required by law. Billing and transaction records are retained for up to 7 years to comply with applicable tax and accounting obligations.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">8. Children's Privacy</h2>
          <p>GloboTrotter is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice in the app.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">10. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, contact us at <strong>privacy@globotrottr.com</strong>.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
