"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, Clock, Video, MapPin, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { format, addDays, isSameDay } from "date-fns";

const TIME_SLOTS = [
  { id: "1", time: "9:00 AM", available: true },
  { id: "2", time: "9:30 AM", available: false },
  { id: "3", time: "10:00 AM", available: true },
  { id: "4", time: "10:30 AM", available: true },
  { id: "5", time: "11:00 AM", available: false },
  { id: "6", time: "11:30 AM", available: true },
  { id: "7", time: "2:00 PM", available: true },
  { id: "8", time: "2:30 PM", available: true },
  { id: "9", time: "3:00 PM", available: false },
  { id: "10", time: "3:30 PM", available: true },
  { id: "11", time: "4:00 PM", available: true },
  { id: "12", time: "4:30 PM", available: true },
];

// Generate next 14 days
const DAYS = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

type Step = 1 | 2 | 3;
type ConsultType = "VIDEO" | "IN_PERSON";

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams.get("doctorId") ?? "1";

  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<ConsultType>("VIDEO");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock doctor data (replace with API)
  const doctor = {
    id: doctorId,
    name: "Dr. Sarah Mitchell",
    specialty: "Cardiologist",
    fee: 200,
    avatar: "",
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    try {
      // TODO: POST /api/appointments
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("Appointment booked successfully!");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.back())}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-2xl font-bold">Book Appointment</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                step > s ? "bg-primary text-white" :
                step === s ? "bg-primary text-white" :
                "bg-gray-200 text-gray-500"
              )}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                step >= s ? "text-foreground" : "text-muted-foreground"
              )}>
                {s === 1 ? "Date & Time" : s === 2 ? "Consult Type" : "Confirm"}
              </span>
              {s < 3 && <div className={cn("flex-1 h-px", step > s ? "bg-primary" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        {/* Doctor Summary */}
        <Card className="mb-6">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">SM</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{doctor.name}</p>
              <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-bold text-lg">${doctor.fee}</p>
              <p className="text-xs text-muted-foreground">per visit</p>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Select Date & Time</CardTitle></CardHeader>
            <CardContent>
              {/* Date Picker */}
              <div className="mb-6">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Choose a date</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {DAYS.map((day) => (
                    <button
                      key={day.toISOString()}
                      onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                      className={cn(
                        "flex flex-col items-center min-w-[56px] p-2 rounded-xl border-2 transition-all",
                        isSameDay(day, selectedDate)
                          ? "border-primary bg-primary text-white"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-xs font-medium">{format(day, "EEE")}</span>
                      <span className="text-lg font-bold leading-tight">{format(day, "d")}</span>
                      <span className="text-xs">{format(day, "MMM")}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <p className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Available times for {format(selectedDate, "MMMM d")}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={cn(
                        "py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all",
                        !slot.available && "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200",
                        slot.available && selectedSlot === slot.id && "border-primary bg-primary text-white",
                        slot.available && selectedSlot !== slot.id && "border-border hover:border-primary/50"
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full mt-6"
                disabled={!selectedSlot}
                onClick={() => setStep(2)}
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Consult Type */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Consultation Type</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {([
                  { type: "VIDEO" as const, icon: Video, label: "Video Consultation", desc: "Meet from anywhere via secure video call" },
                  { type: "IN_PERSON" as const, icon: MapPin, label: "In-Person Visit", desc: "Visit the doctor's clinic" },
                ]).map(({ type, icon: Icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setConsultType(type)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center",
                      consultType === type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-full",
                      consultType === type ? "bg-primary/10" : "bg-gray-100"
                    )}>
                      <Icon className={cn("h-6 w-6", consultType === type ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium mb-1.5 block">Notes for the doctor (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your symptoms or reason for visit..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <Button className="w-full" onClick={() => setStep(3)}>
                Review Booking <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Review & Confirm</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                {[
                  { label: "Doctor", value: doctor.name },
                  { label: "Specialty", value: doctor.specialty },
                  { label: "Date", value: format(selectedDate, "EEEE, MMMM d, yyyy") },
                  { label: "Time", value: TIME_SLOTS.find((s) => s.id === selectedSlot)?.time ?? "" },
                  { label: "Type", value: consultType === "VIDEO" ? "Video Consultation" : "In-Person Visit" },
                  { label: "Consultation Fee", value: `$${doctor.fee}`, highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={cn("text-sm font-medium", highlight && "text-lg font-bold text-primary")}>{value}</span>
                  </div>
                ))}
              </div>

              {notes && (
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your notes</p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}

              <Button className="w-full h-12 text-base" onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming...</>
                ) : (
                  "Confirm Appointment"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                You'll receive a confirmation email with details and a meeting link (if video).
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BookAppointmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <BookingContent />
    </Suspense>
  );
}
