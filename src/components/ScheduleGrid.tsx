import React from 'react';
import type { Schedule, HorariObj } from '../engine/types';

interface Props {
    schedule: Schedule;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

const COLORS = [
    '#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e'
];

export const ScheduleGrid: React.FC<Props> = ({ schedule }) => {
    const getSubjectColor = (code: string) => {
        const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return COLORS[hash % COLORS.length];
    };

    const formatWeeks = (weeks: number[]) => {
        if (weeks.length === 0) return '';
        const sorted = [...weeks].sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0];
        let end = start;

        for (let i = 1; i <= sorted.length; i++) {
            if (i < sorted.length && sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                if (i < sorted.length) {
                    start = sorted[i];
                    end = start;
                }
            }
        }
        return ranges.join(', ');
    };

    return (
        <div className="panel" style={{ flex: 1, overflow: 'hidden', padding: '0', display: 'flex' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '70px repeat(5, 1fr)',
                gridTemplateRows: '50px repeat(14, 1fr)',
                minWidth: '850px', // Slightly wider for better breathing room
                flex: 1,
                borderLeft: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{ background: 'var(--bg-color)', borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }} />
                {DAYS.map(day => (
                    <div key={day} style={{
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        color: 'var(--text-dim)',
                        background: 'var(--bg-color)',
                        fontSize: '0.875rem',
                        borderRight: '1px solid var(--border-color)',
                        borderTop: '1px solid var(--border-color)'
                    }}>
                        {day}
                    </div>
                ))}

                {HOURS.map((hour, hourIdx) => (
                    <React.Fragment key={hour}>
                        <div
                            style={{
                                height: '100%',
                                boxSizing: 'border-box',
                                padding: '0.25rem 0.5rem',
                                color: 'var(--text-dim)',
                                fontSize: '0.75rem',
                                textAlign: 'right',
                                background: 'var(--bg-color)',
                                fontWeight: '500',
                                borderRight: '1px solid var(--border-color)',
                                borderTop: '1px solid var(--border-color)',
                                gridRow: hourIdx + 2,
                                gridColumn: 1
                            }}
                        >
                            {hour}:00
                        </div>
                        {DAYS.map((_, dayIndex) => (
                            <div key={dayIndex}
                                style={{
                                    background: 'var(--bg-color)',
                                    height: '100%',
                                    boxSizing: 'border-box',
                                    borderRight: '1px solid var(--border-color)',
                                    borderTop: '1px solid var(--border-color)',
                                    gridRow: hourIdx + 2,
                                    gridColumn: dayIndex + 2
                                }}
                            />
                        ))}
                    </React.Fragment>
                ))}

                {DAYS.map((_, dayIndex) => {
                    const daySessions = schedule.sessions
                        .filter(s => s.day === dayIndex)
                        .sort((a, b) => a.hours[0] - b.hours[0]);

                    if (daySessions.length === 0) return null;

                    // Algorithm to calculate horizontal partitioning for overlaps
                    const clusters: HorariObj[][] = [];
                    daySessions.forEach((session: HorariObj) => {
                        let placed = false;
                        for (const cluster of clusters) {
                            if (cluster.some((s: HorariObj) => s.hours.some((h: number) => session.hours.includes(h)))) {
                                cluster.push(session);
                                placed = true;
                                break;
                            }
                        }
                        if (!placed) clusters.push([session]);
                    });

                    return clusters.map(cluster => {
                        // For each cluster, we need to find how many "columns" are needed
                        const columns: HorariObj[][] = [];
                        const sessionToCol = new Map<HorariObj, number>();

                        cluster.forEach((session: HorariObj) => {
                            let columnIndex = columns.findIndex(col =>
                                !col.some((s: HorariObj) => s.hours.some((h: number) => session.hours.includes(h)))
                            );
                            if (columnIndex === -1) {
                                columnIndex = columns.length;
                                columns.push([session]);
                            } else {
                                columns[columnIndex].push(session);
                            }
                            sessionToCol.set(session, columnIndex);
                        });

                        const totalCols = columns.length;

                        return cluster.map((session, idx) => {
                            const rowStart = session.hours[0] - 8 + 2;
                            const colStart = dayIndex + 2;
                            const colIndex = sessionToCol.get(session) || 0;
                            const widthPct = 100 / totalCols;
                            const leftPct = colIndex * widthPct;

                            return (
                                <div key={`${dayIndex}-${idx}`} style={{
                                    gridRow: `${rowStart} / span ${session.duration}`,
                                    gridColumn: colStart,
                                    margin: '2px',
                                    marginLeft: `${leftPct}%`,
                                    width: `calc(${widthPct}% - 4px)`,
                                    background: getSubjectColor(session.code),
                                    borderRadius: '6px',
                                    padding: '0.6rem', // Slightly less padding for overlaps
                                    zIndex: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    boxSizing: 'border-box'
                                }}>
                                    <div style={{ fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{session.code}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.9, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Gr {session.group} ({session.type})</div>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.8, marginTop: 'auto', lineHeight: '1.2' }}>
                                        Set: {formatWeeks(session.weeks)}
                                    </div>
                                </div>
                            );
                        });
                    });
                })}
            </div>
        </div>
    );
};
