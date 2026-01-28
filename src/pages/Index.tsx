import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { SchoolsSection } from "@/components/landing/SchoolsSection";
import { FeaturedCourses } from "@/components/landing/FeaturedCourses";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppBubble } from "@/components/ui/WhatsAppBubble";

const Index = () => {
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
      <WhatsAppBubble />
    </div>
  );
};


export default Index;
