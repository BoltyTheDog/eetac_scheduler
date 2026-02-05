import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Schedule, HorariObj } from '../engine/types';

interface Props {
    schedule: Schedule;
    subjectColorMap: Record<string, string>;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

export const ScheduleGrid: React.FC<Props> = ({ schedule, subjectColorMap }) => {
    const [selectedSession, setSelectedSession] = useState<HorariObj | null>(null);
    const [initialRect, setInitialRect] = useState<DOMRect | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const getSubjectColor = (code: string) => {
        return subjectColorMap[code] || '#64748b';
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

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    return (
        <div className="panel" style={{ height: '100%', flex: 1, padding: '0', display: 'flex', border: 'none', background: 'transparent' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'var(--grid-time-width) repeat(5, 1fr)',
                gridTemplateRows: '40px repeat(14, var(--grid-row-height))',
                width: '100%',
                height: '100%',
                minHeight: '100%',
                flex: 1,
                borderLeft: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                overflowY: 'auto',
                position: 'relative'
            }}>
                <div style={{ background: 'transparent', borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }} />
                {DAYS.map(day => (
                    <div key={day} style={{
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        color: 'var(--text-dim)',
                        background: 'transparent',
                        fontSize: '0.75rem',
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
                                padding: '0 0.5rem',
                                color: 'var(--text-dim)',
                                fontSize: '0.7rem',
                                textAlign: 'right',
                                background: 'transparent',
                                fontWeight: '500',
                                borderRight: '1px solid var(--border-color)',
                                borderTop: '1px solid var(--border-color)',
                                gridRow: hourIdx + 2,
                                gridColumn: 1,
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'flex-end'
                            }}
                        >
                            <span style={{ marginTop: '0.2rem' }}>{hour}:00</span>
                        </div>
                        {DAYS.map((_, dayIndex) => (
                            <div key={dayIndex}
                                style={{
                                    background: 'transparent',
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

                    // Algorithm for horizontal partitioning (same as before)
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

                        return cluster.map((session) => {
                            const rowStart = session.hours[0] - 8 + 2;
                            const colStart = dayIndex + 2;
                            const colIndex = sessionToCol.get(session) || 0;
                            const widthPct = 100 / totalCols;
                            const leftPct = colIndex * widthPct;

                            // Unique stable key including start hour and weeks to avoid duplicates
                            const uniqueKey = `${session.code}-${session.day}-${session.hours[0]}-${session.group}-${session.type}-${session.weeks.join(',')}`;
                            const isNarrow = isMobile && totalCols > 2;

                            return (
                                <div
                                    key={uniqueKey}
                                    className="schedule-block animate-subject-fade"
                                    style={{
                                        gridRow: `${rowStart} / span ${session.duration}`,
                                        gridColumn: colStart,
                                        margin: '1px',
                                        marginLeft: `${leftPct}%`,
                                        width: `calc(${widthPct}% - 2px)`,
                                        background: getSubjectColor(session.code),
                                        borderRadius: '4px',
                                        padding: isNarrow ? '0.1rem 0.2rem' : (session.duration === 1 ? '0.15rem 0.3rem' : '0.25rem 0.4rem'),
                                        zIndex: 10,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        minHeight: 0,
                                        cursor: isMobile ? 'pointer' : 'default',
                                        transition: 'transform 0.2s ease',
                                        transform: selectedSession === session ? 'scale(0.95)' : 'none'
                                    }}
                                    onClick={(e) => {
                                        if (isMobile) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setInitialRect(rect);
                                            setSelectedSession(session);
                                            setIsExpanded(false);
                                            // Small delay to allow the proxy to mount at initial position
                                            setTimeout(() => setIsExpanded(true), 10);
                                        }
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'baseline',
                                        columnGap: '0.15rem',
                                        rowGap: '0',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden'
                                    }}>
                                        <span style={{
                                            fontWeight: '700',
                                            fontSize: isNarrow ? 'calc(var(--session-code-font) * 0.8)' : 'var(--session-code-font)',
                                            flexShrink: 0,
                                            minWidth: 0
                                        }}>
                                            {session.code}
                                        </span>
                                        <span style={{
                                            fontSize: isNarrow ? 'calc(var(--session-group-font) * 0.85)' : 'var(--session-group-font)',
                                            opacity: 0.9
                                        }}>
                                            {isNarrow ? 'G' : 'Gr'}{session.group}
                                        </span>
                                    </div>
                                    {(!isMobile || !isNarrow) && (
                                        <div style={{
                                            fontSize: 'var(--session-weeks-font)',
                                            opacity: 0.8,
                                            marginTop: 'auto',
                                            lineHeight: '1',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            overflow: 'hidden'
                                        }}>
                                            {formatWeeks(session.weeks)}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    });
                })}
            </div>
            {isMobile && selectedSession && initialRect && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: isExpanded ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
                        backdropFilter: isExpanded ? 'blur(10px)' : 'none',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }}
                    onClick={() => {
                        setIsExpanded(false);
                        setTimeout(() => {
                            setSelectedSession(null);
                            setInitialRect(null);
                        }, 300);
                    }}
                >
                    <div
                        style={{
                            position: 'fixed',
                            background: getSubjectColor(selectedSession.code),
                            color: 'white',
                            borderRadius: isExpanded ? '1.2rem' : '4px',
                            boxShadow: isExpanded ? '0 25px 50px -12px rgba(0,0,0,0.5)' : 'none',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: isExpanded ? '1.5rem' : '0.2rem 0.4rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            overflow: 'hidden',
                            boxSizing: 'border-box',

                            // Morphing properties
                            top: isExpanded ? '50%' : `${initialRect.top}px`,
                            left: isExpanded ? '50%' : `${initialRect.left}px`,
                            width: isExpanded ? 'min(85vw, 340px)' : `${initialRect.width}px`,
                            height: isExpanded ? 'auto' : `${initialRect.height}px`,
                            transform: isExpanded ? 'translate(-50%, -50%)' : 'none',
                            transformOrigin: 'top left',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            zIndex: 10001
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{
                                fontWeight: '800',
                                fontSize: isExpanded ? '1.5rem' : 'var(--session-code-font)',
                                transition: 'font-size 0.3s ease'
                            }}>
                                {selectedSession.code}
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                            opacity: isExpanded ? 1 : 0,
                            transform: isExpanded ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'all 0.3s ease 0.1s',
                            pointerEvents: isExpanded ? 'auto' : 'none',
                            height: isExpanded ? 'auto' : '0',
                            overflow: 'hidden'
                        }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>Grupo {selectedSession.group}</div>
                            <div style={{ fontSize: '1rem', opacity: 0.9 }}>
                                {selectedSession.type === 'T' ? 'Clase de Teoría' : 'Sesión de Práctica'}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'rgba(0,0,0,0.15)',
                                    borderRadius: '0.75rem',
                                }}>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: '700' }}>Horario</span>
                                    <span style={{ fontWeight: '500' }}>{selectedSession.hours[0]}:00 - {selectedSession.hours[selectedSession.hours.length - 1] + 1}:00</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'rgba(0,0,0,0.15)',
                                    borderRadius: '0.75rem',
                                }}>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: '700' }}>Semanas</span>
                                    <span style={{ fontWeight: '500' }}>{formatWeeks(selectedSession.weeks)}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
