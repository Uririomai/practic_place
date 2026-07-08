"use client";

import { useParams } from "next/navigation";
import { StudentProfile } from "@/components/admin/StudentProfile";

export default function StudentProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  return <StudentProfile userId={userId} />;
}
