export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  subSpecialty?: string;
  hospital: string;
  location: string;
  rating: number;
  reviewCount: number;
  experience: number;
  consultationFee: number;
  availableToday: boolean;
  nextAvailable: string;
  avatar?: string;
  languages: string[];
  education: string;
  bio: string;
  acceptsInsurance: boolean;
  offersVideoConsult: boolean;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  doctor: Doctor;
  date: string;
  time: string;
  type: "IN_PERSON" | "VIDEO";
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
  notes?: string;
  meetingLink?: string;
}
