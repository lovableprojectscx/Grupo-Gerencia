
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface SiteSettings {
    id: string;
    site_name: string;
    site_description: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    payment_number: string | null;
    payment_qr_url: string | null;
    logo_url: string | null;
    default_certificate_template: any | null;
}

export function useSiteSettings() {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .maybeSingle();

            if (error) throw error;
            setSettings(data);
        } catch (error) {
            console.error("Error fetching site settings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('site_settings_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'site_settings' },
                (payload) => {
                    setSettings(payload.new as SiteSettings);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { settings, loading, refetch: fetchSettings };
}
