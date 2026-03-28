INSERT INTO public.app_settings (key, value) VALUES ('privacy_policy', 'Privacy Policy for SangiAI

Last updated: March 2026

1. Information We Collect
We collect information you provide directly, such as your email address when you create an account, and usage data to improve our services.

2. How We Use Your Information
- To provide and maintain our services
- To improve and personalize your experience
- To communicate with you about updates and features
- To ensure security and prevent abuse

3. Data Storage
Your data is stored securely on cloud servers. We use industry-standard encryption and security measures to protect your information.

4. Third-Party Services
We may use third-party services (such as AI models and analytics) to enhance functionality. These services have their own privacy policies.

5. Your Rights
You can request access to, correction of, or deletion of your personal data at any time by contacting us.

6. Cookies and Local Storage
We use local storage and cookies to save your preferences and session data for a better experience.

7. Changes to This Policy
We may update this policy from time to time. We will notify you of any significant changes.

8. Contact Us
If you have questions about this privacy policy, please reach out through the app.'), ('about_app', 'About SangiAI

SangiAI is your all-in-one creative studio powered by artificial intelligence.

What We Offer:
- Text to Image: Generate stunning images from text prompts using AI
- Image to Video: Animate your images into short videos
- Script AI: Generate professional scripts for any purpose
- Voice AI: Convert text to natural-sounding speech
- Music AI: Create original music tracks with AI
- Lip-Sync: Sync audio to video with realistic lip movements
- Prompt AI: Generate optimized prompts for AI tools
- 16+ Free Tools: QR codes, image editing, PDF tools, posters, invitation cards and more

Our Mission:
To make powerful AI creative tools accessible to everyone.

Key Features:
- No watermarks for premium users
- Works on mobile and desktop
- Fast and easy to use
- Regular updates with new tools and features

Built with love by the SangiAI team.') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();