"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function FoundItemButton() {
  const router = useRouter()

  return (
    <Button 
        onClick={() => router.push("/found")}
        className={"p-5 cursor-pointer"}>
      Found Items
    </Button>
  )
}