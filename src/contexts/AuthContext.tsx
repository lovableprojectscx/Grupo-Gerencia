
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface UserProfile {
    id: string;
    full_name: string | null;
    dni: string | null;
    phone: string | null;
    role: string;
    avatar_url: string | null;
    email: string | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const profileRef = useRef<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Keep ref in sync
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        // 2. Refresh session automatically
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const newUser = session?.user ?? null;
            setUser(newUser);

            if (newUser) {
                // Only fetch if profile is missing or user changed
                if (!profileRef.current || profileRef.current.id !== newUser.id) {
                    fetchProfile(newUser);
                }
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (currentUser: User) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching profile:", error);
            }

            if (data) {
                setProfile({
                    ...data,
                    role: (currentUser.email === 'admin@gerencia.com') ? 'admin' : data.role,
                    email: currentUser.email || null
                });
            } else {
                // Fallback if no profile row exists yet - use metadata or hardcode for dev
                const isAdminEmail = currentUser.email === 'admin@gerencia.com';
                setProfile({
                    id: currentUser.id,
                    full_name: currentUser.user_metadata?.full_name || "Usuario",
                    dni: currentUser.user_metadata?.dni || null,
                    phone: currentUser.user_metadata?.phone || null,
                    role: isAdminEmail ? 'admin' : (currentUser.user_metadata?.role || 'student'),
                    avatar_url: currentUser.user_metadata?.avatar_url || null,
                    email: currentUser.email || null
                });
            }
        } catch (error) {
            console.error("Error in fetchProfile:", error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
    };

    const value = {
        user,
        session,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
