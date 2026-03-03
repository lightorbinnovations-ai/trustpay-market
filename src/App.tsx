import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTelegramTheme } from "@/hooks/useTelegramTheme";
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import Post from "./pages/Post";
import PostForm from "./pages/PostForm";
import Profile from "./pages/Profile";
import ProfileSection from "./pages/ProfileSection";
import ListingDetails from "./pages/ListingDetails";
import EditListing from "./pages/EditListing";
import Checkout from "./pages/Checkout";
import Notifications from "./pages/Notifications";
import Favorites from "./pages/Favorites";
import Placeholder from "./pages/Placeholder";
import AdminDashboard from "./pages/AdminDashboard";
import CreateAd from "./pages/CreateAd";
import EditAd from "./pages/EditAd";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useTelegramTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route element={<AppLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/category/:name" element={<CategoryDetail />} />
              <Route path="/post" element={<Post />} />
              <Route path="/post/:type" element={<PostForm />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:section" element={<ProfileSection />} />
              <Route path="/listing/:id" element={<ListingDetails />} />
              <Route path="/edit-listing/:id" element={<EditListing />} />
              <Route path="/checkout/:listingId" element={<Checkout />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/create-ad" element={<CreateAd />} />
              <Route path="/edit-ad/:id" element={<EditAd />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
