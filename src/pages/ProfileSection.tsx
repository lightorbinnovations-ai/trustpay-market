import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import MyListings from "@/components/profile/MyListings";
import MyTransactions from "@/components/profile/MyTransactions";
import SettingsPage from "@/components/profile/SettingsPage";
import SellerDashboard from "@/components/profile/SellerDashboard";
import MyAds from "@/components/profile/MyAds";

const sections: Record<string, { title: string; component: React.FC }> = {
  dashboard: { title: "Dashboard", component: SellerDashboard },
  listings: { title: "My Listings", component: MyListings },
  ads: { title: "My Ads", component: MyAds },
  transactions: { title: "My Transactions", component: MyTransactions },
  settings: { title: "Settings", component: SettingsPage },
};

const ProfileSection = () => {
  const { section } = useParams<{ section: string }>();
  const current = sections[section || ""];

  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-5">
        <p className="text-muted-foreground">Section not found</p>
      </div>
    );
  }

  const SectionComponent = current.component;

  return (
    <div className="px-5 pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-extrabold text-foreground">{current.title}</h1>
      </motion.div>

      <div className="mt-6">
        <SectionComponent />
      </div>
    </div>
  );
};

export default ProfileSection;
