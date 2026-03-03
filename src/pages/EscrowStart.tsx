import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EscrowStart = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<"loading" | "error" | "redirecting">("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const validateAndRedirect = async () => {
            const token = searchParams.get("token");
            if (!token) {
                setStatus("error");
                setErrorMsg("Missing transaction token.");
                return;
            }

            try {
                // 1. Validate token in escrow_tokens table
                const { data: tokenData, error: tokenError } = await supabase
                    .from("escrow_tokens")
                    .select("*")
                    .eq("token", token)
                    .eq("used", false)
                    .single();

                if (tokenError || !tokenData) {
                    setStatus("error");
                    setErrorMsg("This deal link is invalid or has already been used.");
                    return;
                }

                // 2. Check expiration
                const isExpired = new Date(tokenData.expires_at).getTime() < Date.now();
                if (isExpired) {
                    setStatus("error");
                    setErrorMsg("This deal link has expired. Please restart the purchase.");
                    return;
                }

                // 3. Mark as used
                await supabase
                    .from("escrow_tokens")
                    .update({ used: true })
                    .eq("id", tokenData.id);

                // 4. Redirect to Escrow Bot with listing_id
                // We use the official Telegram URL format
                const escrowBot = import.meta.env.VITE_ESCROW_BOT_USERNAME || "TrustPay9jaBot";
                const redirectUrl = `https://t.me/${escrowBot}/app?startapp=escrow_${tokenData.listing_id}`;

                setStatus("redirecting");

                // Use Telegram WebApp open link if available, otherwise window.location
                if ((window as any).Telegram?.WebApp) {
                    (window as any).Telegram.WebApp.openTelegramLink(redirectUrl);
                    // Also set a timeout to close our current app or redirect window
                    setTimeout(() => {
                        (window as any).Telegram.WebApp.close();
                    }, 1000);
                } else {
                    window.location.href = redirectUrl;
                }

            } catch (err: any) {
                console.error("Redirection error:", err);
                setStatus("error");
                setErrorMsg("Failed to initiate escrow. Please try again.");
            }
        };

        validateAndRedirect();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 text-center">
            {status === "loading" && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 animate-spin text-[hsl(224,71%,50%)] mx-auto" />
                        <ShieldCheck className="w-6 h-6 text-white absolute inset-0 m-auto" />
                    </div>
                    <h2 className="text-xl font-bold">Securing Transaction...</h2>
                    <p className="text-white/50 text-sm max-w-[240px]">We're validating your secure payment token with TrustPay Escrow.</p>
                </div>
            )}

            {status === "redirecting" && (
                <div className="space-y-4 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold">Verified!</h2>
                    <p className="text-white/50 text-sm">Opening TrustPay Escrow...</p>
                </div>
            )}

            {status === "error" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-400">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-red-400">Oops!</h2>
                        <p className="text-white/60 text-sm mt-1">{errorMsg}</p>
                    </div>
                    <button
                        onClick={() => window.location.href = "/home"}
                        className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-white/10 transition-colors"
                    >
                        Return to Market
                    </button>
                </div>
            )}
        </div>
    );
};

export default EscrowStart;
