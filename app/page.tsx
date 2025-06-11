"use client";

import Host from "@/components/page/host";
import Member from "@/components/page/member";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function MusicPlayer() {
  const [role, setRole] = useState("");

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Choose your role</h1>
        <div className="flex gap-4">
          <Button onClick={() => setRole("host")}>Host</Button>
          <Button onClick={() => setRole("member")}>Member</Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <Button className="absolute top-4 left-4" onClick={() => setRole("")}>
        <ArrowLeft />
      </Button>
      {role === "host" && <Host />}
      {role === "member" && <Member />}
    </>
  );
}
