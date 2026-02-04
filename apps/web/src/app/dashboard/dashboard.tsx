"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import ProfileOnboarding from "@/components/profile-onboarding";

export default function Dashboard({
  customerState: initialCustomerState,
  session,
}: {
  customerState: ReturnType<typeof authClient.customer.state>;
  session: typeof authClient.$Infer.Session;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("payment_success");

  // Refetch customer state to get updated subscription status
  const { data: customerState, refetch: refetchCustomerState } = useQuery({
    queryKey: ["customer-state"],
    queryFn: async () => {
      const result = await authClient.customer.state();
      return result;
    },
    initialData: initialCustomerState,
    refetchOnWindowFocus: true,
  });

  const privateData = useQuery(orpc.privateData.queryOptions());

  // Refresh customer state when returning from payment
  useEffect(() => {
    if (paymentSuccess === "true") {
      // Remove the query param
      router.replace("/dashboard", { scroll: false });
      // Refetch customer state after a short delay to allow webhook processing
      setTimeout(() => {
        refetchCustomerState();
        toast.success("Payment successful! Your subscription is being updated...");
      }, 1000);
    }
  }, [paymentSuccess, router, refetchCustomerState]);

  const hasProSubscription = customerState?.activeSubscriptions?.length! > 0;
  console.log("Active subscriptions:", customerState?.activeSubscriptions);

  const handleUpgrade = async () => {
    try {
      console.log("Attempting checkout...");
      const result = await authClient.checkout({ slug: "pro" });
      console.log("Checkout result:", result);

      // If checkout returns a URL, navigate to it
      if (result?.url) {
        window.location.href = result.url;
      } else if (result && typeof result === "string") {
        // If it's just a URL string
        window.location.href = result;
      }
      // If it redirects automatically, nothing else needed
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Opening customer portal...");
      // Fallback to portal if checkout isn't configured
      try {
        await authClient.customer.portal();
      } catch (portalError) {
        console.error("Portal error:", portalError);
        toast.error("Unable to open checkout. Please try again later.");
      }
    }
  };

  const handleRefresh = async () => {
    await refetchCustomerState();
    toast.success("Subscription status refreshed");
  };

  // Fetch user health profile to check if it's set up
  const { data: healthProfile, isLoading: isProfileLoading } = useQuery(orpc.health.getProfile.queryOptions({}));
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Check if profile needs setup
  useEffect(() => {
    if (!isProfileLoading && healthProfile !== undefined) {
      // If profile is null (doesn't exist) or has no conditions/goals set (incomplete)
      const hasProfileSetup = healthProfile && (healthProfile.conditions.length > 0 || healthProfile.goals.length > 0);
      if (!hasProfileSetup) {
        setShowOnboarding(true);
      }
    }
  }, [healthProfile, isProfileLoading]);


  return (
    <>
      <ProfileOnboarding
        isOpen={showOnboarding}
        onOpenChange={setShowOnboarding}
        forceOpen={true} // Force open means it won't close until saved/dismissed properly via its own internal logic if needed
      />

      <p>API: {privateData.data?.message}</p>
      <div className="flex items-center gap-2">
        <p>Plan: {hasProSubscription ? "Pro" : "Free"}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Refresh Status
        </Button>
      </div>
      {hasProSubscription ? (
        <Button onClick={async () => await authClient.customer.portal()}>
          Manage Subscription
        </Button>
      ) : (
        <Button onClick={handleUpgrade}>
          Upgrade to Pro
        </Button>
      )}
    </>
  );
}
