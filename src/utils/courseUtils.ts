
/**
 * Generates a deterministic "realistic" student count based on the course ID.
 * This ensures the number is consistent for the same course but varies between courses.
 * range: 125 - 450
 */
export const getStudentCount = (courseId: string, actualCount: number = 0): number => {
    if (!courseId) return actualCount > 0 ? actualCount : 0;

    // Simple hash function for the string
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
        const char = courseId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Make positive
    const positiveHash = Math.abs(hash);

    // Generate a number between 125 and 450
    const min = 125;
    const max = 450;
    const range = max - min;

    const fakeCount = min + (positiveHash % range);

    // Return the fake count plus any actual enrollments
    return fakeCount + actualCount;
};
