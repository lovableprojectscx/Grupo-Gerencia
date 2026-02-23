import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { SchoolsSection } from "@/components/landing/SchoolsSection";
import { FeaturedCourses } from "@/components/landing/FeaturedCourses";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppBubble } from "@/components/ui/WhatsAppBubble";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Index = () => {
  const { settings } = useSiteSettings();

  // Format phone number for WhatsApp
  const rawPhone = settings?.contact_phone || settings?.payment_number;
  const whatsappNumber = rawPhone
    ? rawPhone.replace(/\D/g, '').startsWith("51") ? rawPhone.replace(/\D/g, '') : `51${rawPhone.replace(/\D/g, '')}`
    : undefined;

  return (
    <div className="min-h-screen overflow-x-hidden w-full">
      <Navbar />
      <main>
        <HeroSection />
        <SchoolsSection />
        <FeaturedCourses />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
      <WhatsAppBubble phoneNumber={whatsappNumber} />
    </div>
  );
};



export default Index;
