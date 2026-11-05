import type { QuizQuestion } from "@/services/quizService";

/**
 * Plantilla Excel de exámenes.
 *
 * Hoja "Preguntas" (una fila por pregunta):
 *   A Pregunta | B Opción A | C Opción B | D Opción C | E Opción D | F Opción E | G Opción F
 *   H Respuesta correcta (letra A-F) | I Puntos (opcional, por defecto 1) | J Explicación (opcional)
 */
export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const MAX_OPTIONS = OPTION_LETTERS.length;
const SHEET_NAME = "Preguntas";

const HEADERS = [
    "Pregunta",
    ...OPTION_LETTERS.map((l) => `Opción ${l}`),
    "Respuesta correcta",
    "Puntos",
    "Explicación",
];

const COL_ANSWER = 1 + MAX_OPTIONS + 1; // H
const COL_POINTS = COL_ANSWER + 1;      // I
const COL_EXPLANATION = COL_POINTS + 1; // J

const loadExcelJS = async () => (await import("exceljs")).default;

function downloadBuffer(buffer: ArrayBuffer, fileName: string) {
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Genera y descarga la plantilla. Si se pasan preguntas, la plantilla se
 * rellena con ellas (sirve también como "exportar examen").
 */
export async function downloadQuizTemplate(questions?: QuizQuestion[], fileName = "plantilla_examen.xlsx") {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = "Grupo Gerencia";

    // ── Hoja de preguntas ──
    const ws = wb.addWorksheet(SHEET_NAME, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
        { width: 55 },
        ...OPTION_LETTERS.map(() => ({ width: 24 })),
        { width: 20 },
        { width: 10 },
        { width: 45 },
    ];
    const header = ws.addRow(HEADERS);
    header.height = 22;
    header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2A4A" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    const rows: (string | number)[][] = questions?.length
        ? questions.map((q) => [
            q.question,
            ...OPTION_LETTERS.map((_, i) => q.options[i] ?? ""),
            OPTION_LETTERS[q.correct_index] ?? "A",
            q.points ?? 1,
            q.explanation ?? "",
        ])
        : [
            ["¿Cuál es la función principal de la gerencia?", "Planificar, organizar, dirigir y controlar", "Solo vender productos", "Contratar personal únicamente", "Ninguna de las anteriores", "", "", "A", 1, "La gerencia abarca las cuatro funciones del proceso administrativo."],
            ["El presupuesto es una herramienta de control financiero.", "Verdadero", "Falso", "", "", "", "", "A", 1, ""],
            ["¿Qué significa la sigla FODA?", "Finanzas, Operaciones, Dirección, Administración", "Fondos, Objetivos, Desarrollo, Análisis", "Fortalezas, Oportunidades, Debilidades, Amenazas", "", "", "", "C", 2, "Es una herramienta de análisis estratégico."],
        ];
    rows.forEach((r) => ws.addRow(r));

    // Validación de la columna "Respuesta correcta" y "Puntos"
    for (let row = 2; row <= 500; row++) {
        ws.getCell(row, COL_ANSWER).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`"${OPTION_LETTERS.join(",")}"`],
            showErrorMessage: true,
            errorTitle: "Respuesta inválida",
            error: `Escribe una letra de ${OPTION_LETTERS[0]} a ${OPTION_LETTERS[MAX_OPTIONS - 1]}`,
        };
        ws.getCell(row, COL_ANSWER).alignment = { horizontal: "center" };
        ws.getCell(row, COL_POINTS).dataValidation = {
            type: "decimal",
            operator: "greaterThan",
            allowBlank: true,
            formulae: [0],
            showErrorMessage: true,
            errorTitle: "Puntaje inválido",
            error: "El puntaje debe ser un número mayor a 0",
        };
        ws.getCell(row, COL_POINTS).alignment = { horizontal: "center" };
    }
    ws.getColumn(1).alignment = { wrapText: true, vertical: "top" };
    ws.getColumn(COL_EXPLANATION).alignment = { wrapText: true, vertical: "top" };

    // ── Hoja de instrucciones ──
    const info = wb.addWorksheet("Instrucciones");
    info.columns = [{ width: 110 }];
    const lines = [
        "CÓMO LLENAR LA PLANTILLA DE EXAMEN",
        "",
        `1. Escribe una pregunta por fila en la hoja "${SHEET_NAME}". No cambies el orden ni los títulos de las columnas.`,
        "2. Completa entre 2 y 6 opciones (columnas Opción A a Opción F). Deja vacías las que no uses, sin saltar columnas.",
        "3. En \"Respuesta correcta\" escribe solo la letra de la opción correcta (A, B, C, D, E o F).",
        "4. \"Puntos\" es opcional (por defecto 1). Úsalo para dar más peso a preguntas difíciles.",
        "5. \"Explicación\" es opcional: se muestra al alumno al finalizar el examen si así lo configuras.",
        "6. Para preguntas de Verdadero/Falso usa Opción A = Verdadero y Opción B = Falso.",
        "7. Borra las filas de ejemplo antes de importar, o reemplázalas por tus propias preguntas.",
        "8. Guarda el archivo como .xlsx e impórtalo desde el editor del examen (botón \"Importar Excel\").",
    ];
    lines.forEach((l, i) => {
        const row = info.addRow([l]);
        if (i === 0) row.font = { bold: true, size: 14, color: { argb: "FF0F2A4A" } };
        row.alignment = { wrapText: true };
    });

    const buffer = await wb.xlsx.writeBuffer();
    downloadBuffer(buffer as ArrayBuffer, fileName);
}

export interface QuizImportResult {
    questions: QuizQuestion[];
    errors: string[]; // errores por fila (filas omitidas)
}

function cellText(value: any): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
        if ("richText" in value && Array.isArray(value.richText)) {
            return value.richText.map((t: any) => t.text).join("").trim();
        }
        if ("text" in value) return String(value.text).trim();
        if ("result" in value) return cellText(value.result);
        if (value instanceof Date) return value.toLocaleDateString();
    }
    return String(value).trim();
}

/** Lee un archivo .xlsx con el formato de la plantilla y devuelve las preguntas. */
export async function parseQuizExcel(file: File): Promise<QuizImportResult> {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());

    const ws = wb.getWorksheet(SHEET_NAME) ?? wb.worksheets[0];
    if (!ws) throw new Error("El archivo no contiene hojas");

    const questions: QuizQuestion[] = [];
    const errors: string[] = [];

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // encabezados

        const question = cellText(row.getCell(1).value);
        const rawOptions = OPTION_LETTERS.map((_, i) => cellText(row.getCell(2 + i).value));
        const answerRaw = cellText(row.getCell(COL_ANSWER).value).toUpperCase();
        const pointsRaw = cellText(row.getCell(COL_POINTS).value);
        const explanation = cellText(row.getCell(COL_EXPLANATION).value);

        // Fila completamente vacía → ignorar
        if (!question && rawOptions.every((o) => !o) && !answerRaw) return;

        if (!question) {
            errors.push(`Fila ${rowNumber}: falta el texto de la pregunta`);
            return;
        }

        // Recortar opciones vacías al final; las vacías intermedias son error
        let last = rawOptions.length - 1;
        while (last >= 0 && !rawOptions[last]) last--;
        const options = rawOptions.slice(0, last + 1);
        if (options.length < 2) {
            errors.push(`Fila ${rowNumber}: se necesitan al menos 2 opciones`);
            return;
        }
        if (options.some((o) => !o)) {
            errors.push(`Fila ${rowNumber}: hay opciones vacías entre otras opciones`);
            return;
        }

        // Respuesta: letra (A-F) o número (1-6)
        let correctIndex = OPTION_LETTERS.indexOf(answerRaw.replace(/^OPCI[OÓ]N\s*/, "") as any);
        if (correctIndex === -1 && /^\d+$/.test(answerRaw)) correctIndex = Number(answerRaw) - 1;
        if (correctIndex < 0 || correctIndex >= options.length) {
            errors.push(`Fila ${rowNumber}: la respuesta correcta "${answerRaw || "(vacía)"}" no corresponde a ninguna opción`);
            return;
        }

        let points = 1;
        if (pointsRaw) {
            points = Number(pointsRaw.replace(",", "."));
            if (!(points > 0)) {
                errors.push(`Fila ${rowNumber}: el puntaje "${pointsRaw}" no es válido`);
                return;
            }
        }

        questions.push({
            question,
            options,
            correct_index: correctIndex,
            points,
            explanation: explanation || null,
        });
    });

    return { questions, errors };
}
