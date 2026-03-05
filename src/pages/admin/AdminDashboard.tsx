import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Award, DollarSign, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
    totalRevenue: number;
    activeStudents: number;
    activeCourses: number;
    totalCertificates: number;
}

interface RecentEnrollment {
    id: string;
    purchased_at: string;
    profiles: {
        full_name: string | null;
        dni: string | null;
    } | null;
    courses: {
        title: string;
        price: number;
    } | null;
}


// Chart data type
interface MonthlyRevenue {
    name: string;
    total: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalRevenue: 0,
        activeStudents: 0,
        activeCourses: 0,
        totalCertificates: 0
    });
    const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollment[]>([]);
    const [chartData, setChartData] = useState<MonthlyRevenue[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // 1. Fetch Counts
                const coursesCount = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('published', true);
                const certificatesCount = await supabase.from('certificates').select('*', { count: 'exact', head: true });
                const studentsCount = await supabase.from('enrollments').select('user_id', { count: 'exact', head: true }); // Approximate active students queries

                // 2. Fetch Enrollments for Revenue (Last 1000 for simplicity in client-side calc)
                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('purchased_at, courses(price)')
                    .eq('status', 'active');

                let revenue = 0;
                const monthlyRev: Record<string, number> = {};

                if (enrollments) {
                    enrollments.forEach((enr: any) => {
                        const price = enr.courses?.price || 0;
                        revenue += price;

                        // Usar YYYY-MM como clave para ordenar correctamente
                        const date = new Date(enr.purchased_at);
                        const monthKey = format(date, 'yyyy-MM');
                        monthlyRev[monthKey] = (monthlyRev[monthKey] || 0) + price;
                    });
                }

                // Ordenar cronológicamente y formatear para el gráfico
                const chart = Object.keys(monthlyRev)
                    .sort() // YYYY-MM se ordena correctamente como string
                    .map(key => ({
                        name: format(new Date(key + '-01'), 'MMM', { locale: es })
                            .replace(/^\w/, c => c.toUpperCase()), // Capitalizar "ene" → "Ene"
                        total: monthlyRev[key]
                    }));

                // 3. Fetch Recent Enrollments details
                // Using explicit aliases to match AdminEnrollments.tsx which is known to work
                const { data: recent, error: recentError } = await supabase
                    .from('enrollments')
                    .select(`
                        id,
                        purchased_at,
                        user_id,
                        course_id,
                        profiles:user_id (full_name, dni),
                        courses:course_id (title, price)
                    `)
                    .order('purchased_at', { ascending: false })
                    .limit(5);

                if (recentError) {
                    console.error("Error fetching recent enrollments:", recentError);
                }

                const formattedRecent: RecentEnrollment[] = recent?.map((item: any) => ({
                    id: item.id,
                    purchased_at: item.purchased_at,
                    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
                    courses: Array.isArray(item.courses) ? item.courses[0] : item.courses,
                })) || [];

                setStats({
                    totalRevenue: revenue,
                    activeStudents: studentsCount.count || 0,
                    activeCourses: coursesCount.count || 0,
                    totalCertificates: certificatesCount.count || 0
                });
                setRecentEnrollments(formattedRecent);
                setChartData(chart.length > 0 ? chart : [{ name: "Sin datos", total: 0 }]);

            } catch (error) {
                console.error("Error loading dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(stats.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Historico acumulado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inscripciones</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats.activeStudents}</div>
                        <p className="text-xs text-muted-foreground">Total inscritos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats.activeCourses}</div>
                        <p className="text-xs text-muted-foreground">Publicados en catálogo</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Certificados</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats.totalCertificates}</div>
                        <p className="text-xs text-muted-foreground">Emitidos exitosamente</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart & Recent */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Resumen de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            {chartData.length > 0 && (
                                <ChartContainer config={{
                                    total: {
                                        label: "Total",
                                        color: "hsl(var(--primary))",
                                    }
                                }}>
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/${value}`} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Inscripciones Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {loading ? <p>Cargando...</p> : recentEnrollments.map((item) => (
                                <div className="flex items-center" key={item.id}>
                                    <div className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center border border-border">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{item.profiles?.full_name || "Usuario"}</p>
                                        <p className="text-xs text-muted-foreground">{item.profiles?.dni || "Sin ID"}</p>
                                        <p className="text-xs text-muted-foreground">{item.courses?.title}</p>
                                    </div>
                                    <div className="ml-auto font-medium">{item.courses?.price ? formatCurrency(item.courses.price) : "Gratis"}</div>
                                </div>
                            ))}
                            {!loading && recentEnrollments.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center">No hay inscripciones recientes.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
