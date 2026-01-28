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
  const whatsappNumber = settings?.payment_number
    ? (settings.payment_number.startsWith("51") ? settings.payment_number : `51${settings.payment_number}`)
    : undefined;

  return (
    <div className="min-h-screen">
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
