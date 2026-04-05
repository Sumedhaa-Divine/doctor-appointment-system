import Link from "next/link";
import { Star, MapPin, Clock, Video, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Doctor } from "@/types/doctor";

interface DoctorCardProps {
  doctor: Doctor;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 rounded-xl shrink-0">
            <AvatarImage src={doctor.avatar} alt={`Dr. ${doctor.firstName} ${doctor.lastName}`} />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-lg">
              {doctor.firstName[0]}{doctor.lastName[0]}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base leading-tight">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h3>
                <p className="text-primary text-sm font-medium">{doctor.specialty}</p>
                {doctor.subSpecialty && (
                  <p className="text-muted-foreground text-xs">{doctor.subSpecialty}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold">{doctor.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({doctor.reviewCount})</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {doctor.location}
              </span>
              <span className="text-xs text-muted-foreground">
                {doctor.experience} yrs exp
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                ${doctor.consultationFee} / visit
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {doctor.availableToday && (
                <Badge variant="success" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Available Today
                </Badge>
              )}
              {doctor.offersVideoConsult && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Video className="h-3 w-3" /> Video Consult
                </Badge>
              )}
              {doctor.acceptsInsurance && (
                <Badge variant="outline" className="text-xs">Insurance</Badge>
              )}
            </div>

            {!doctor.availableToday && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Clock className="h-3 w-3" /> Next: {doctor.nextAvailable}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Link href={`/doctors/${doctor.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">View Profile</Button>
          </Link>
          <Link href={`/appointments/book?doctorId=${doctor.id}`} className="flex-1">
            <Button size="sm" className="w-full">Book Now</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
