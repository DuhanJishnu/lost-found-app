"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function DashboardButton() {
  const router = useRouter()

  return (
    <Button 
        onClick={() => router.push("/dashboard")}
        className={"p-5 cursor-pointer"}>
      View Dashboard
    </Button>
  )
}