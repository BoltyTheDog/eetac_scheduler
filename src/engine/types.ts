export const Weekday = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
} as const;
export type Weekday = typeof Weekday[keyof typeof Weekday];

export const ClassType = {
    Theory: 'T',
    Lab: 'L',
    Problems: 'P',
} as const;
export type ClassType = typeof ClassType[keyof typeof ClassType];

export interface ClassSession {
    codi_assig: string;
    grup: string | number;
    dia_setmana: number; // 1-5
    inici: string; // "HH:MM"
    durada: number;
    tipus: string; // "T", "L", "P"
    setmanes: number[];
}

export interface HorariObj {
    code: string;
    group: string | number;
    day: Weekday;
    hours: number[];
    duration: number;
    type: ClassType;
    weeks: number[];
}

export const SchedulePreference = {
    Morning: 'Morning',
    Afternoon: 'Afternoon',
    DontCare: 'DontCare',
} as const;
export type SchedulePreference = typeof SchedulePreference[keyof typeof SchedulePreference];

export interface Schedule {
    sessions: HorariObj[];
    score: number;
}
