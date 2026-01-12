"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkout_id = searchParams.get("checkout_id");

  useEffect(() => {
    // Redirect to dashboard after a short delay to allow webhook processing
    const timer = setTimeout(() => {
      router.push("/dashboard?payment_success=true");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="px-4 py-8">
      <h1>Payment Successful!</h1>
      {checkout_id && <p>Checkout ID: {checkout_id}</p>}
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
