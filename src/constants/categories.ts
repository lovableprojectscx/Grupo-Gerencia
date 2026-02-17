export const COURSE_CATEGORIES = [
    {
        id: "health",
        label: "Salud",
        specialties: [
            { id: "nursing", label: "Enfermería" },
            { id: "pharmacy", label: "Farmacia" },
            { id: "nutrition", label: "Nutrición" },
            { id: "medicine", label: "Medicina General" },
            { id: "psychology", label: "Psicología" }
        ]
    },
    {
        id: "veterinary",
        label: "Veterinaria",
        specialties: [
            { id: "small_animals", label: "Animales Menores" },
            { id: "large_animals", label: "Animales Mayores" },
            { id: "exotics", label: "Fauna Silvestre y Exóticos" },
            { id: "vet_nursing", label: "Asistente Veterinario" }
        ]
    },
    {
        id: "engineering",
        label: "Ingeniería",
        specialties: [
            { id: "civil_engineering", label: "Ingeniería Civil" },
            { id: "systems_engineering", label: "Ingeniería de Sistemas" },
            { id: "architecture", label: "Arquitectura" },
            { id: "industrial", label: "Industrial" }
        ]
    },
    {
        id: "agronomy",
        label: "Agronomía",
        specialties: [
            { id: "farming", label: "Agropecuaria" },
            { id: "zootechnics", label: "Zootecnia" },
            { id: "agroindustrial", label: "Agroindustrial" }
        ]
    },
    {
        id: "environmental",
        label: "Ingeniería Ambiental",
        specialties: [
            { id: "waste_management", label: "Gestión de Residuos" },
            { id: "eia", label: "Estudio de Impacto Ambiental" },
            { id: "water_treatment", label: "Tratamiento de Aguas" }
        ]
    },
    {
        id: "management",
        label: "Gestión Pública y Empresarial",
        specialties: [
            { id: "public_management", label: "Gestión Pública" },
            { id: "administration", label: "Administración" },
            { id: "accounting", label: "Contabilidad" },
            { id: "law", label: "Derecho" },
            { id: "social_sciences", label: "Ciencias Sociales" },
            { id: "soft_skills", label: "Habilidades Blandas" }
        ]
    }
];

export const getCategoryLabel = (id: string) => {
    return COURSE_CATEGORIES.find(c => c.id === id)?.label || id;
};

export const getSpecialtyLabel = (categoryId: string, specialtyId?: string) => {
    if (!specialtyId) return null;
    const category = COURSE_CATEGORIES.find(c => c.id === categoryId);
    return category?.specialties.find(s => s.id === specialtyId)?.label || specialtyId;
};
