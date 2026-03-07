export type TranslationSchema = {
    nav: {
        home: string;
        explore: string;
        post: string;
        notifications: string;
        profile: string;
    };
    listing: {
        description: string;
        chat_telegram: string;
        use_escrow: string;
        bought_this: string;
        edit: string;
        mark_sold: string;
        sold_out: string;
        buy_note: string;
        buy_instruction: string;
        escrow_note: string;
        escrow_instruction: string;
        confirm_purchase: string;
        confirm_desc: string;
        cancel: string;
        confirm_yes: string;
        mark_sold_title: string;
        mark_sold_desc: string;
        mark_sold_yes: string;
        purchase_recorded: string;
        success_msg: string;
        success_desc: string;
        share_copied: string;
    };
    notifications: {
        just_now: string;
        mins_ago: string;
        hours_ago: string;
        days_ago: string;
        mark_all_read: string;
        no_notifs: string;
        notif_desc: string;
    };
    home: {
        hi: string;
        what_need: string;
        guest_link: string;
        search_placeholder: string;
        featured: string;
        see_all: string;
        near_you: string;
        recent: string;
        live: string;
        no_listings: string;
    };
    explore: {
        header: string;
        search: string;
        all: string;
        local: string;
        no_results: string;
    };
    settings: {
        header: string;
        language: string;
        notifications: {
            header: string;
            desc: string;
            listing_views: string;
            listing_views_desc: string;
            favorites: string;
            favorites_desc: string;
            transactions: string;
            transactions_desc: string;
            nearby: string;
            nearby_desc: string;
        };
        verified: {
            header: string;
            desc: string;
            active_until: string;
            get_verified: string;
            success: string;
        };
        privacy: {
            header: string;
            desc: string;
            escrow: string;
            escrow_desc: string;
            telegram: string;
            telegram_desc: string;
            data: string;
            data_desc: string;
        };
        help: {
            header: string;
            desc: string;
            contact_btn: string;
            need_help: string;
        };
    };
    profile: {
        header: string;
        verified: string;
        items_bought: string;
        items_sold: string;
        revenue: string;
        active_listings: string;
        dashboard: string;
        my_listings: string;
        my_ads: string;
        transactions: string;
        favorites: string;
        settings: string;
        admin: string;
    };
    admin: {
        header: string;
        desc: string;
        access_denied: string;
        not_admin: string;
        search_users: string;
        search_listings: string;
        overview: string;
        users: string;
        listings: string;
        txns: string;
    };
    categories: {
        title: string;
        subtitle: string;
        results_found: string;
        no_listings: string;
        be_first: string;
        create_listing: string;
        promoted: string;
        loading: string;
        names: {
            plumbing: string;
            electrical: string;
            cleaning: string;
            delivery: string;
            repairs: string;
            gadgets: string;
            fashion: string;
            food: string;
            beauty: string;
            other: string;
        };
    };
};

export const translations: { en: TranslationSchema; fr: TranslationSchema } = {
    en: {
        nav: {
            home: "Home",
            explore: "Explore",
            post: "Post",
            notifications: "Alerts",
            profile: "Profile"
        },
        listing: {
            description: "Description",
            chat_telegram: "Chat on Telegram",
            use_escrow: "Use Escrow",
            bought_this: "I've Bought This",
            edit: "Edit Listing",
            mark_sold: "Mark as Sold",
            sold_out: "Item is no longer available (Sold)",
            buy_note: "Note to Buyer",
            buy_instruction: "After you have completed your purchase with the seller, please remember to return here and click 'I've Bought This' to record your transaction and rate the seller.",
            escrow_note: "Note",
            escrow_instruction: "If you're not sure, kindly talk to us @lightorbinnovations or call us at 08025100844 so we can serve as escrow between you and the seller to avoid scam.",
            confirm_purchase: "Confirm Purchase",
            confirm_desc: "Mark as bought? This will be recorded in your transaction history and the seller will be notified.",
            cancel: "Cancel",
            confirm_yes: "Yes, I've Bought This",
            mark_sold_title: "Mark as Sold?",
            mark_sold_desc: "This will close this listing and hide it from the marketplace feed. This action cannot be undone.",
            mark_sold_yes: "Yes, Mark as Sold",
            purchase_recorded: "Purchase Recorded 🎉",
            success_msg: "Purchase recorded! 🎉",
            success_desc: "The seller will be notified. Your transaction has been saved.",
            share_copied: "Share link copied!"
        },
        notifications: {
            just_now: "Just now",
            mins_ago: "m ago",
            hours_ago: "h ago",
            days_ago: "d ago",
            mark_all_read: "Mark all read",
            no_notifs: "No notifications yet",
            notif_desc: "You'll be notified of marketplace updates"
        },
        home: {
            hi: "Hi",
            what_need: "What do you need today?",
            guest_link: "Open via Telegram to link your account",
            search_placeholder: "Search services or products",
            featured: "Featured Listings",
            see_all: "See all",
            near_you: "Near You",
            recent: "Recent Listings",
            live: "Live",
            no_listings: "No listings available yet."
        },
        explore: {
            header: "Explore",
            search: "Search anything...",
            all: "All",
            local: "Local Only",
            no_results: "No listings found match your search."
        },
        settings: {
            header: "Settings",
            language: "Language",
            notifications: {
                header: "Notifications",
                desc: "Manage alert preferences",
                listing_views: "Listing views",
                listing_views_desc: "When someone views your listing",
                favorites: "Favorites",
                favorites_desc: "When someone saves your listing",
                transactions: "Transactions",
                transactions_desc: "Escrow payment updates",
                nearby: "Nearby listings",
                nearby_desc: "New listings in your area"
            },
            verified: {
                header: "Verified Seller Badge",
                desc: "Build trust with buyers",
                active_until: "Active until",
                get_verified: "Get Verified for 90 ⭐",
                success: "You're verified! ✅"
            },
            privacy: {
                header: "Privacy & Security",
                desc: "Your data & safety",
                escrow: "Escrow Protection (Launching Soon)",
                escrow_desc: "Coming Soon: All payments will be held in escrow until delivery is confirmed. Your funds will always be protected.",
                telegram: "Telegram Identity",
                telegram_desc: "Your identity is verified through Telegram. We never store passwords — your Telegram account IS your login.",
                data: "Data Usage",
                data_desc: "We only collect your Telegram name, username, and location (if shared) to match you with nearby listings."
            },
            help: {
                header: "Help & Support",
                desc: "FAQ & contact",
                contact_btn: "Contact Support",
                need_help: "Need more help?"
            }
        },
        profile: {
            header: "My Profile",
            verified: "Verified Seller",
            items_bought: "Items Bought",
            items_sold: "Items Sold",
            revenue: "Revenue",
            active_listings: "Active Listings",
            dashboard: "Dashboard",
            my_listings: "My Listings",
            my_ads: "My Ads",
            transactions: "Transactions",
            favorites: "Favorites",
            settings: "Settings",
            admin: "Admin Panel"
        },
        admin: {
            header: "Admin Panel",
            desc: "Manage your marketplace",
            access_denied: "Access Denied",
            not_admin: "You don't have admin privileges.",
            search_users: "Search users...",
            search_listings: "Search listings...",
            overview: "Overview",
            users: "Users",
            listings: "Listings",
            txns: "Txns"
        },
        categories: {
            title: "Categories",
            subtitle: "Find services or products by category",
            results_found: "found",
            no_listings: "No listings yet",
            be_first: "Be the first to post in",
            create_listing: "Create Listing",
            promoted: "PROMOTED",
            loading: "Loading...",
            names: {
                plumbing: "Plumbing",
                electrical: "Electrical",
                cleaning: "Cleaning",
                delivery: "Delivery",
                repairs: "Repairs",
                gadgets: "Gadgets",
                fashion: "Fashion",
                food: "Food & Beverages",
                beauty: "Beauty & Wellness",
                other: "Other"
            }
        },
    },
    fr: {
        nav: {
            home: "Accueil",
            explore: "Explorer",
            post: "Publier",
            notifications: "Alertes",
            profile: "Profil"
        },
        listing: {
            description: "Description",
            chat_telegram: "Discuter sur Telegram",
            use_escrow: "Utiliser l'Escrow",
            bought_this: "J'ai acheté ceci",
            edit: "Modifier l'annonce",
            mark_sold: "Marquer comme vendu",
            sold_out: "L'article n'est plus disponible (Vendu)",
            buy_note: "Note à l'acheteur",
            buy_instruction: "Une fois que vous avez terminé votre achat avec le vendeur, n'oubliez pas de revenir ici et de cliquer sur 'J'ai acheté ceci' pour enregistrer votre transaction et noter le vendeur.",
            escrow_note: "Note",
            escrow_instruction: "Si vous n'êtes pas sûr, contactez-nous @lightorbinnovations ou appelez-nous au 08025100844 afin que nous puissions servir d'escrow entre vous et le vendeur pour éviter les arnaques.",
            confirm_purchase: "Confirmer l'achat",
            confirm_desc: "Marquer comme acheté ? Cela sera enregistré dans votre historique de transactions et le vendeur sera informé.",
            cancel: "Annuler",
            confirm_yes: "Oui, j'ai acheté ceci",
            mark_sold_title: "Marquer comme vendu ?",
            mark_sold_desc: "Cela fermera cette annonce et la masquera du fil d'actualité. Cette action est irréversible.",
            mark_sold_yes: "Oui, marquer comme vendu",
            purchase_recorded: "Achat enregistré 🎉",
            success_msg: "Achat enregistré ! 🎉",
            success_desc: "Le vendeur sera informé. Votre transaction a été enregistrée.",
            share_copied: "Lien de partage copié !"
        },
        notifications: {
            just_now: "À l'instant",
            mins_ago: "m",
            hours_ago: "h",
            days_ago: "j",
            mark_all_read: "Tout marquer comme lu",
            no_notifs: "Pas encore de notifications",
            notif_desc: "Vous serez informé des mises à jour du marché"
        },
        home: {
            hi: "Salut",
            what_need: "De quoi avez-vous besoin aujourd'hui ?",
            guest_link: "Ouvrez via Telegram pour lier votre compte",
            search_placeholder: "Rechercher des services ou produits",
            featured: "Annonces à la Une",
            see_all: "Tout voir",
            near_you: "Près de chez vous",
            recent: "Annonces récentes",
            live: "En direct",
            no_listings: "Aucune annonce disponible pour le moment."
        },
        explore: {
            header: "Explorer",
            search: "Rechercher...",
            all: "Tout",
            local: "Local uniquement",
            no_results: "Aucune annonce ne correspond à votre recherche."
        },
        settings: {
            header: "Paramètres",
            language: "Langue",
            notifications: {
                header: "Notifications",
                desc: "Gérer les préférences d'alerte",
                listing_views: "Vues de l'annonce",
                listing_views_desc: "Quand quelqu'un voit votre annonce",
                favorites: "Favoris",
                favorites_desc: "Quand quelqu'un enregistre votre annonce",
                transactions: "Transactions",
                transactions_desc: "Mises à jour des paiements séquestres",
                nearby: "Annonces à proximité",
                nearby_desc: "Nouvelles annonces dans votre région"
            },
            verified: {
                header: "Badge de Vendeur Vérifié",
                desc: "Gagnez la confiance des acheteurs",
                active_until: "Actif jusqu'au",
                get_verified: "Obtenez la vérification pour 90 ⭐",
                success: "Vous êtes vérifié ! ✅"
            },
            privacy: {
                header: "Confidentialité et Sécurité",
                desc: "Vos données et votre sécurité",
                escrow: "Protection Séquestre (Bientôt disponible)",
                escrow_desc: "Bientôt disponible : Tous les paiements seront conservés sous séquestre jusqu'à la confirmation de la livraison. Vos fonds seront toujours protégés.",
                telegram: "Identité Telegram",
                telegram_desc: "Votre identité est vérifiée via Telegram. Nous ne stockons jamais de mots de passe — votre compte Telegram EST votre identifiant.",
                data: "Utilisation des Données",
                data_desc: "Nous collectons uniquement votre nom Telegram, votre nom d'utilisateur et votre emplacement (si partagé) pour vous proposer des annonces à proximité."
            },
            help: {
                header: "Aide et Support",
                desc: "FAQ et contact",
                contact_btn: "Contacter le Support",
                need_help: "Besoin d'aide supplémentaire ?"
            }
        },
        profile: {
            header: "Mon Profil",
            verified: "Vendeur Vérifié",
            items_bought: "Articles Achetés",
            items_sold: "Articles Vendus",
            revenue: "Revenu",
            active_listings: "Annonces Actives",
            dashboard: "Tableau de Bord",
            my_listings: "Mes Annonces",
            my_ads: "Mes Publicités",
            transactions: "Transactions",
            favorites: "Favoris",
            settings: "Paramètres",
            admin: "Panneau Admin"
        },
        admin: {
            header: "Panneau Admin",
            desc: "Gérer votre marché",
            access_denied: "Accès refusé",
            not_admin: "Vous n'avez pas de privilèges admin.",
            search_users: "Rechercher des utilisateurs...",
            search_listings: "Rechercher des annonces...",
            overview: "Aperçu",
            users: "Utilisateurs",
            listings: "Annonces",
            txns: "Txns"
        },
        categories: {
            title: "Catégories",
            subtitle: "Trouvez des services ou des produits par catégorie",
            results_found: "trouvés",
            no_listings: "Pas encore d'annonces",
            be_first: "Soyez le premier à publier dans",
            create_listing: "Créer une annonce",
            promoted: "PROMU",
            loading: "Chargement...",
            names: {
                plumbing: "Plomberie",
                electrical: "Électricité",
                cleaning: "Nettoyage",
                delivery: "Livraison",
                repairs: "Réparations",
                gadgets: "Gadgets",
                fashion: "Mode",
                food: "Nourriture et boissons",
                beauty: "Beauté et bien-être",
                other: "Autre"
            }
        },
    }
};

export type Language = keyof typeof translations;
