"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, MapPin, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DoctorCard from "@/components/doctors/DoctorCard";
import type { Doctor } from "@/types/doctor";

// Mock data – replace with API call via React Query
const MOCK_DOCTORS: Doctor[] = [
  { id: "1", firstName: "Sarah", lastName: "Mitchell", specialty: "Cardiologist", subSpecialty: "Interventional Cardiology", hospital: "City Heart Center", location: "New York, NY", rating: 4.9, reviewCount: 312, experience: 15, consultationFee: 200, availableToday: true, nextAvailable: "Today 3:00 PM", avatar: "", languages: ["English", "Spanish"], education: "Harvard Medical School", bio: "Board-certified cardiologist specializing in complex coronary interventions.", acceptsInsurance: true, offersVideoConsult: true },
  { id: "2", firstName: "James", lastName: "Chen", specialty: "Neurologist", subSpecialty: "Epilepsy & Sleep Disorders", hospital: "Metro Neuro Institute", location: "Los Angeles, CA", rating: 4.8, reviewCount: 198, experience: 12, consultationFee: 180, availableToday: false, nextAvailable: "Tomorrow 10:00 AM", avatar: "", languages: ["English", "Mandarin"], education: "Johns Hopkins University", bio: "Expert in diagnosing and treating complex neurological disorders.", acceptsInsurance: true, offersVideoConsult: true },
  { id: "3", firstName: "Priya", lastName: "Sharma", specialty: "Dermatologist", subSpecialty: "Cosmetic Dermatology", hospital: "Skin & Wellness Clinic", location: "Chicago, IL", rating: 4.7, reviewCount: 445, experience: 9, consultationFee: 150, availableToday: true, nextAvailable: "Today 1:30 PM", avatar: "", languages: ["English", "Hindi"], education: "Stanford School of Medicine", bio: "Specialist in skin health, cosmetic procedures, and dermatological conditions.", acceptsInsurance: false, offersVideoConsult: true },
  { id: "4", firstName: "Michael", lastName: "Roberts", specialty: "Orthopedic Surgeon", subSpecialty: "Sports Medicine", hospital: "Advanced Orthopedics", location: "Houston, TX", rating: 4.9, reviewCount: 267, experience: 20, consultationFee: 220, availableToday: false, nextAvailable: "Thu, Apr 10", avatar: "", languages: ["English"], education: "Mayo Clinic College", bio: "Specializes in minimally invasive joint replacement and sports injury recovery.", acceptsInsurance: true, offersVideoConsult: false },
  { id: "5", firstName: "Aisha", lastName: "Patel", specialty: "Psychiatrist", subSpecialty: "Child & Adolescent Psychiatry", hospital: "Mind & Wellness Center", location: "Boston, MA", rating: 4.8, reviewCount: 183, experience: 11, consultationFee: 160, availableToday: true, nextAvailable: "Today 4:00 PM", avatar: "", languages: ["English", "Gujarati"], education: "Yale School of Medicine", bio: "Compassionate psychiatrist focused on mental health and emotional wellbeing.", acceptsInsurance: true, offersVideoConsult: true },
  { id: "6", firstName: "David", lastName: "Kim", specialty: "Pediatrician", subSpecialty: "Neonatal Care", hospital: "Children's Medical Center", location: "Seattle, WA", rating: 4.9, reviewCount: 521, experience: 14, consultationFee: 130, availableToday: true, nextAvailable: "Today 2:00 PM", avatar: "", languages: ["English", "Korean"], education: "UCSF School of Medicine", bio: "Dedicated to providing comprehensive pediatric care from newborns to adolescents.", acceptsInsurance: true, offersVideoConsult: true },
];

const SPECIALTIES = ["All", "Cardiologist", "Neurologist", "Dermatologist", "Orthopedic Surgeon", "Psychiatrist", "Pediatrician", "General Physician"];

export default function FindDoctorsPage() {
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [videoOnly, setVideoOnly] = useState(false);
  const [availableToday, setAvailableToday] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "fee_low" | "experience">("rating");

  const filtered = useMemo(() => {
    return MOCK_DOCTORS
      .filter((d) => {
        const term = search.toLowerCase();
        const matchSearch =
          !search ||
          d.firstName.toLowerCase().includes(term) ||
          d.lastName.toLowerCase().includes(term) ||
          d.specialty.toLowerCase().includes(term) ||
          d.location.toLowerCase().includes(term);
        const matchSpecialty = selectedSpecialty === "All" || d.specialty === selectedSpecialty;
        const matchVideo = !videoOnly || d.offersVideoConsult;
        const matchToday = !availableToday || d.availableToday;
        return matchSearch && matchSpecialty && matchVideo && matchToday;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "fee_low") return a.consultationFee - b.consultationFee;
        if (sortBy === "experience") return b.experience - a.experience;
        return 0;
      });
  }, [search, selectedSpecialty, videoOnly, availableToday, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setSelectedSpecialty("All");
    setVideoOnly(false);
    setAvailableToday(false);
  };

  const activeFilterCount = [
    selectedSpecialty !== "All",
    videoOnly,
    availableToday,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Search Banner */}
      <div className="bg-gradient-to-r from-primary to-cyan-600 text-white py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Find the Right Doctor</h1>
          <p className="text-white/80 mb-8">
            Search from 500+ verified specialists — book in seconds
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, specialty, or location..."
              className="w-full h-12 pl-12 pr-4 rounded-xl text-foreground bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white rounded-xl border p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </h2>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                    Clear all ({activeFilterCount})
                  </button>
                )}
              </div>

              {/* Specialties */}
              <div className="mb-5">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Specialty</h3>
                <div className="space-y-1">
                  {SPECIALTIES.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => setSelectedSpecialty(spec)}
                      className={`w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors ${
                        selectedSpecialty === spec
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-gray-50 text-muted-foreground"
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="mb-5">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Quick Filters</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableToday}
                      onChange={(e) => setAvailableToday(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span className="text-sm">Available Today</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoOnly}
                      onChange={(e) => setVideoOnly(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span className="text-sm">Video Consult</span>
                  </label>
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Sort By</h3>
                <div className="space-y-1">
                  {[
                    { value: "rating", label: "Highest Rated" },
                    { value: "fee_low", label: "Lowest Fee" },
                    { value: "experience", label: "Most Experienced" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value as typeof sortBy)}
                      className={`w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors ${
                        sortBy === opt.value
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-gray-50 text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> doctors found
              </p>
              <div className="flex gap-2">
                {selectedSpecialty !== "All" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedSpecialty}
                    <button onClick={() => setSelectedSpecialty("All")}><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {videoOnly && (
                  <Badge variant="secondary" className="gap-1">
                    Video Only
                    <button onClick={() => setVideoOnly(false)}><X className="h-3 w-3" /></button>
                  </Badge>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
                <h3 className="font-semibold mb-1">No doctors found</h3>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
