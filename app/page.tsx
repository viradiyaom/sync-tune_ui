"use client";

import Host from "@/components/page/host";
import Member from "@/components/page/member";
import { Button } from "@/components/ui/button";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { ArrowLeft, Loader, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const Container = () => {
  const router = useRouter();
  const { connected } = useAppContext();
  const [role, setRole] = useState("");
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const value = searchParams.get("memberId");
    if (value) {
      setRole("member");
    }
    setLoading(false);
  }, [searchParams]);

  if (loading || !connected)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
        <Loader className="animate-spin" />
        <div className="text-center">
          Please wait wile we connect to server, it may take few seconds
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
      {role ? (
        <>
          <Button
            className="absolute top-4 left-4"
            onClick={() => {
              setRole("");
              router.replace("/");
            }}
          >
            <ArrowLeft />
          </Button>
          {role === "host" && <Host />}
          {role === "member" && <Member />}
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Choose your role</h1>
          <div className="flex gap-4">
            <Button onClick={() => setRole("host")}>Host</Button>
            <Button onClick={() => setRole("member")}>Member</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default function MusicPlayer() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AppProvider>
        <Container />
      </AppProvider>
    </Suspense>
  );
}
