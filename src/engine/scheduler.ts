import { Weekday, ClassType, SchedulePreference } from './types';
import type { HorariObj, ClassSession, Schedule } from './types';

export class Scheduler {
    private allSessions: HorariObj[] = [];

    constructor(data: { results: ClassSession[] }) {
        this.allSessions = data.results.map(s => this.convertToHorariObj(s));
    }

    private convertToHorariObj(s: ClassSession): HorariObj {
        const startHour = parseInt(s.inici.split(':')[0]);
        const hours: number[] = [];
        for (let i = 0; i < s.durada; i++) {
            hours.push(startHour + i);
        }

        let type: ClassType = ClassType.Problems;
        if (s.tipus === 'T' || s.tipus === 'G') type = ClassType.Theory;
        else if (s.tipus === 'L') type = ClassType.Lab;

        return {
            code: s.codi_assig,
            group: s.grup,
            day: (s.dia_setmana - 1) as Weekday,
            hours,
            duration: s.durada,
            type,
            weeks: s.setmanes
        };
    }

    public getAvailableSubjects(): string[] {
        const subjects = new Set(this.allSessions.map(s => s.code));
        return Array.from(subjects).sort();
    }

    public generateSchedules(
        selectedSubjects: string[],
        preference: SchedulePreference,
        allowOverlapping: boolean = false
    ): Schedule[] {
        // 1. Group sessions by Subject -> GroupName -> List of Sessions (Theory, Lab, etc.)
        const subjectGroups: Map<string, Map<string | number, HorariObj[]>> = new Map();

        selectedSubjects.forEach(code => {
            const subjectSessions = this.allSessions.filter(s => s.code === code);
            const groups = new Map<string | number, HorariObj[]>();

            subjectSessions.forEach(s => {
                if (!groups.has(s.group)) groups.set(s.group, []);
                groups.get(s.group)!.push(s);
            });

            subjectGroups.set(code, groups);
        });

        // 2. Generate combinations
        let combinations: HorariObj[][] = [[]];

        for (const groups of subjectGroups.values()) {
            const newCombinations: HorariObj[][] = [];
            for (const combo of combinations) {
                for (const sessions of groups.values()) {
                    if (allowOverlapping || !this.hasCollision(combo, sessions)) {
                        newCombinations.push([...combo, ...sessions]);
                    }
                }
            }
            combinations = newCombinations;
            if (combinations.length === 0) break;
        }

        // 3. Score and Sort
        const schedules: Schedule[] = combinations.map(sessions => ({
            sessions,
            score: this.calculateScore(sessions, preference)
        }));

        return schedules.sort((a, b) => b.score - a.score);
    }

    private hasCollision(existing: HorariObj[], newSessions: HorariObj[]): boolean {
        // 1. Check if newSessions themselves collide (data integrity check)
        for (let i = 0; i < newSessions.length; i++) {
            for (let j = i + 1; j < newSessions.length; j++) {
                if (this.sessionsCollide(newSessions[i], newSessions[j])) return true;
            }
        }

        // 2. Check against existing sessions in the combo
        for (const s1 of existing) {
            for (const s2 of newSessions) {
                if (this.sessionsCollide(s1, s2)) return true;
            }
        }
        return false;
    }

    private sessionsCollide(s1: HorariObj, s2: HorariObj): boolean {
        if (s1.day !== s2.day) return false;

        // Overlap if they share at least one hour AND at least one week
        const shareHour = s1.hours.some(h => s2.hours.includes(h));
        if (!shareHour) return false;

        const shareWeek = s1.weeks.some(w => s2.weeks.includes(w));
        return shareWeek;
    }

    private calculateScore(sessions: HorariObj[], preference: SchedulePreference): number {
        if (preference === SchedulePreference.DontCare) return 0;

        let score = 0;
        for (const s of sessions) {
            for (const hour of s.hours) {
                if (preference === SchedulePreference.Morning) {
                    // Morning preferred (lower hours are better)
                    if (hour < 14) score += (22 - hour);
                } else {
                    // Afternoon preferred (higher hours are better)
                    if (hour >= 14) score += hour;
                }
            }
        }
        return score;
    }
}
