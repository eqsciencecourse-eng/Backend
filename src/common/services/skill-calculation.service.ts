import { Injectable } from '@nestjs/common';

@Injectable()
export class SkillCalculationService {
    /**
     * Calculates the total accumulated XP (Sum of all skill points) from the history.
     * This is the Single Source of Truth for "Total Score".
     */
    calculateAccumulatedXP(skillHistory: any[]): number {
        if (!skillHistory || !Array.isArray(skillHistory)) return 0;

        let total = 0;
        skillHistory.forEach((item) => {
            if (item.skills) {
                Object.values(item.skills).forEach((val: any) => {
                    total += Number(val) || 0;
                });
            }
        });

        return total;
    }

    /**
     * Calculates the breakdown of accumulated points per skill category.
     * Used for the Radar Chart.
     */
    calculateSkillBreakdown(skillHistory: any[]): Record<string, number> {
        const breakdown: Record<string, number> = {};

        if (!skillHistory || !Array.isArray(skillHistory)) return breakdown;

        skillHistory.forEach((item) => {
            if (item.skills) {
                Object.entries(item.skills).forEach(([key, val]) => {
                    breakdown[key] = (breakdown[key] || 0) + (Number(val) || 0);
                });
            }
        });

        return breakdown;
    }

    /**
     * Calculates the Average score per skill (0-5 scale).
     * Used ONLY for Teacher Reports / Grading, NOT for Student Dashboard leveling.
     */
    calculateAverageSkills(skillHistory: any[]): Record<string, number> {
        const totals: Record<string, { sum: number; count: number }> = {};

        if (!skillHistory || !Array.isArray(skillHistory)) return {};

        skillHistory.forEach((item) => {
            if (item.skills) {
                Object.entries(item.skills).forEach(([key, val]) => {
                    const numVal = Number(val) || 0;
                    if (!totals[key]) totals[key] = { sum: 0, count: 0 };
                    totals[key].sum += numVal;
                    totals[key].count += 1;
                });
            }
        });

        const averages: Record<string, number> = {};
        Object.keys(totals).forEach((key) => {
            if (totals[key].count > 0) {
                // Round to 2 decimals
                averages[key] =
                    Math.round((totals[key].sum / totals[key].count) * 100) / 100;
            } else {
                averages[key] = 0;
            }
        });

        return averages;
    }
}
