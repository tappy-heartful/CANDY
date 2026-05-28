import HomeClient from "@/src/features/home/views/HomeClient";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  );
}
