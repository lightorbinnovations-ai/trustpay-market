export const translations = {
    en: {
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
                escrow_desc: "Coming later today: All payments will be held in escrow until delivery is confirmed. Your funds will always be protected.",
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
        }
    },
    fr: {
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
                escrow_desc: "Disponible plus tard aujourd'hui : Tous les paiements seront conservés sous séquestre jusqu'à la confirmation de la livraison. Vos fonds seront toujours protégés.",
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
        }
    }
};

export type Language = keyof typeof translations;
