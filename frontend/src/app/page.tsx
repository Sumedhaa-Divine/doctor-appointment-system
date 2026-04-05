import Link from "next/link";
import { Search, Video, Shield, Clock, Star, ArrowRight, Heart, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  { icon: Search, title: "Find Specialists", desc: "Search 500+ verified doctors by specialty, location, or availability." },
  { icon: Video, title: "Video Consultation", desc: "Secure HD video calls with doctors from the comfort of your home." },
  { icon: Clock, title: "Instant Booking", desc: "Book same-day or future appointments in under 60 seconds." },
  { icon: Shield, title: "HIPAA Compliant", desc: "Your medical data is encrypted and fully HIPAA-compliant on AWS." },
];

const STATS = [
  { value: "500+", label: "Verified Doctors" },
  { value: "50K+", label: "Patients Served" },
  { value: "4.9★", label: "Average Rating" },
  { value: "24/7", label: "Support" },
];

const SPECIALTIES = [
  "Cardiologist", "Neurologist", "Dermatologist",
  "Pediatrician", "Psychiatrist", "Orthopedic",
  "Gynecologist", "General Physician",
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 via-primary to-cyan-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container mx-auto max-w-5xl px-4 py-20 md:py-28 relative">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/30">
              🏥 Trusted by 50,000+ patients
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Your Health,<br />
              <span className="text-cyan-200">Our Priority</span>
            </h1>
            <p className="text-lg text-white/85 mb-8 leading-relaxed">
              Find top doctors, book appointments instantly, and consult via secure
              video calls — all in one platform powered by AWS.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/doctors">
                <Button size="lg" variant="secondary" className="gap-2 shadow-lg font-semibold">
                  <Search className="h-5 w-5" /> Find a Doctor
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="gap-2 border-white/40 text-white hover:bg-white/10">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete hospital management platform built on AWS for reliability, security, and speed.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="bg-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-3">Browse by Specialty</h2>
          <p className="text-muted-foreground mb-10">Find the right specialist for your needs</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {SPECIALTIES.map((spec) => (
              <Link key={spec} href={`/doctors?specialty=${encodeURIComponent(spec)}`}>
                <Badge
                  variant="outline"
                  className="px-5 py-2.5 text-sm cursor-pointer hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  {spec}
                </Badge>
              </Link>
            ))}
          </div>
          <Link href="/doctors" className="inline-block mt-8">
            <Button variant="outline" className="gap-2">
              View All Doctors <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-3">How It Works</h2>
          <p className="text-muted-foreground mb-12">Book a consultation in 3 simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Search a Doctor", desc: "Filter by specialty, location, availability, and ratings.", icon: Search },
              { step: "02", title: "Book a Slot", desc: "Pick a date and time. Choose video or in-person.", icon: Clock },
              { step: "03", title: "Consult Online", desc: "Join the secure Agora.io video call at appointment time.", icon: Video },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold bg-white border border-primary text-primary rounded-full w-6 h-6 flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-cyan-600 text-white py-16 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <Heart className="h-10 w-10 mx-auto mb-4 fill-white" />
          <h2 className="text-3xl font-bold mb-3">Ready to take control of your health?</h2>
          <p className="text-white/80 mb-8">
            Join thousands of patients who trust MediConnect for their healthcare needs.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="font-semibold gap-2">
                <CheckCircle className="h-5 w-5" /> Create Free Account
              </Button>
            </Link>
            <Link href="/doctors">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 gap-2">
                <Search className="h-5 w-5" /> Browse Doctors
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart className="h-4 w-4 fill-primary text-primary" />
          <span className="font-semibold text-white">MediConnect</span>
        </div>
        <p>Built on AWS · HIPAA Compliant · Powered by Agora.io Video</p>
        <p className="mt-2 text-xs">© {new Date().getFullYear()} MediConnect. All rights reserved.</p>
      </footer>
    </div>
  );
}
