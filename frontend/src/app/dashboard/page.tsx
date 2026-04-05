"use client";

import { Calendar, Video, Clock, CheckCircle2, XCircle, Search, ChevronRight, Bell, Heart, Activity } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { format } from "date-fns";

// Mock data – replace with React Query API calls
const MOCK_APPOINTMENTS = [
  { id: "1", doctorName: "Dr. Sarah Mitchell", specialty: "Cardiologist", date: new Date(2026, 3, 8, 10, 30), type: "VIDEO" as const, status: "UPCOMING" as const, initials: "SM" },
  { id: "2", doctorName: "Dr. James Chen", specialty: "Neurologist", date: new Date(2026, 3, 12, 14, 0), type: "IN_PERSON" as const, status: "UPCOMING" as const, initials: "JC" },
  { id: "3", doctorName: "Dr. Priya Sharma", specialty: "Dermatologist", date: new Date(2026, 2, 28, 9, 0), type: "VIDEO" as const, status: "COMPLETED" as const, initials: "PS" },
  { id: "4", doctorName: "Dr. David Kim", specialty: "Pediatrician", date: new Date(2026, 2, 20, 11, 0), type: "IN_PERSON" as const, status: "CANCELLED" as const, initials: "DK" },
];

const STATS = [
  { label: "Total Appointments", value: "12", icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
  { label: "Video Consultations", value: "8", icon: Video, color: "text-purple-500", bg: "bg-purple-50" },
  { label: "Upcoming", value: "2", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  { label: "Completed", value: "9", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
];

const STATUS_CONFIG = {
  UPCOMING: { label: "Upcoming", variant: "default" as const, icon: Clock },
  COMPLETED: { label: "Completed", variant: "success" as const, icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName ?? "there";

  const upcoming = MOCK_APPOINTMENTS.filter((a) => a.status === "UPCOMING");
  const past = MOCK_APPOINTMENTS.filter((a) => a.status !== "UPCOMING");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary to-cyan-600 text-white px-4 py-10">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">{greeting},</p>
              <h1 className="text-2xl md:text-3xl font-bold">{firstName} 👋</h1>
              <p className="text-white/80 text-sm mt-1">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2 hover:bg-white/10 rounded-lg">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
              </button>
              <Avatar className="h-10 w-10 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white font-bold text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Quick Action */}
          <div className="mt-6">
            <Link href="/doctors">
              <Button variant="secondary" className="gap-2 shadow-lg">
                <Search className="h-4 w-4" />
                Find a Doctor
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Appointments */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            <Link href="/appointments">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                View all <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No upcoming appointments</p>
                <Link href="/doctors">
                  <Button size="sm" className="mt-3">Book Now</Button>
                </Link>
              </div>
            ) : (
              upcoming.map((appt) => {
                const status = STATUS_CONFIG[appt.status];
                return (
                  <div key={appt.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Avatar className="h-12 w-12 rounded-xl shrink-0">
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                        {appt.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{appt.doctorName}</p>
                      <p className="text-xs text-muted-foreground">{appt.specialty}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(appt.date, "EEE, MMM d")} · {format(appt.date, "h:mm a")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={appt.type === "VIDEO" ? "secondary" : "outline"} className="text-xs gap-1">
                        {appt.type === "VIDEO" ? <Video className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                        {appt.type === "VIDEO" ? "Video" : "In-Person"}
                      </Badge>
                      {appt.type === "VIDEO" && (
                        <Link href={`/consultation/${appt.id}`}>
                          <Button size="sm" className="h-7 text-xs">Join Call</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Past Appointments */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Past Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {past.map((appt) => {
              const status = STATUS_CONFIG[appt.status];
              return (
                <div key={appt.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                  <Avatar className="h-10 w-10 rounded-xl shrink-0">
                    <AvatarFallback className="rounded-xl bg-gray-200 text-gray-600 font-bold text-sm">
                      {appt.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{appt.doctorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(appt.date, "MMM d, yyyy")} · {format(appt.date, "h:mm a")}
                    </p>
                  </div>
                  <Badge variant={status.variant} className="text-xs gap-1 shrink-0">
                    <status.icon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Health Tips Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-cyan-50 border-emerald-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Stay on top of your health</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Schedule your annual check-up with a general physician.
              </p>
            </div>
            <Link href="/doctors?specialty=General+Physician" className="ml-auto shrink-0">
              <Button size="sm" variant="outline" className="text-xs">Book Now</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
