import { useState, useMemo, useEffect } from 'react';
import './index.css';
import data from './data.json';
import { Scheduler } from './engine/scheduler';
import { SchedulePreference } from './engine/types';
import { ScheduleGrid } from './components/ScheduleGrid';

import logo from './assets/eetac_logo.png';

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#475569'
];

function App() {
  const scheduler = useMemo(() => new Scheduler(data as any), []);
  const availableSubjects = useMemo(() => scheduler.getAvailableSubjects(), [scheduler]);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Assign a unique color to each selected subject
  const subjectColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    selectedSubjects.forEach((code, index) => {
      map[code] = COLORS[index % COLORS.length];
    });
    return map;
  }, [selectedSubjects]);

  const [preference, setPreference] = useState<SchedulePreference>(SchedulePreference.Morning);
  const [allowOverlapping, setAllowOverlapping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const [sortMode, setSortMode] = useState<'level' | 'alpha'>('level');

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const filteredSubjects = useMemo(() =>
    availableSubjects.filter(s => s.toLowerCase().includes(filter.toLowerCase()) && !selectedSubjects.includes(s)),
    [availableSubjects, filter, selectedSubjects]
  );

  // Map subjects to their levels (first digit of their groups)
  const subjectLevels = useMemo(() => {
    const map: Record<string, string> = {};
    (data as any).results.forEach((session: any) => {
      if (!map[session.codi_assig]) {
        const q = session.grup[0];
        if (!isNaN(parseInt(q))) {
          map[session.codi_assig] = q;
        }
      }
    });
    return map;
  }, []);

  // State for group popovers
  const [openPopover, setOpenPopover] = useState<{ code: string, top: number, left: number } | null>(null);

  // Map subjects to their group details
  const subjectGroups = useMemo(() => {
    const map: Record<string, { grup: string, tipus: string }[]> = {};
    (data as any).results.forEach((session: any) => {
      const code = session.codi_assig;
      if (!map[code]) map[code] = [];
      if (!map[code].some(g => g.grup === session.grup)) {
        map[code].push({ grup: session.grup, tipus: session.tipus });
      }
    });
    // Sort groups
    Object.keys(map).forEach(code => {
      map[code].sort((a, b) => a.grup.localeCompare(b.grup));
    });
    return map;
  }, []);

  const groupedSubjects = useMemo(() => {
    const subjects = [...filteredSubjects];
    if (sortMode === 'alpha') {
      return { 'All': subjects.sort() };
    }

    const getLevelName = (q: string) => {
      if (q === '1') return '1.er Cuatrimestre';
      if (q === '2') return '2.º Cuatrimestre';
      if (q === '3') return '3.er Cuatrimestre';
      if (q === '4') return '4.º Cuatrimestre';
      const n = parseInt(q);
      if (!isNaN(n) && n >= 5) return `${n}.º Cuatrimestre`;
      return 'Otros';
    };

    const groups: Record<string, string[]> = {};
    subjects.forEach(code => {
      const q = subjectLevels[code];
      const name = q ? getLevelName(q) : 'Otros';
      if (!groups[name]) groups[name] = [];
      groups[name].push(code);
    });

    // Sort group names (Q1, Q2, etc.) and then subjects within groups
    const sortedGroups: Record<string, string[]> = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key].sort();
    });
    return sortedGroups;
  }, [filteredSubjects, sortMode, subjectLevels]);

  const schedules = useMemo(() => {
    if (selectedSubjects.length === 0) return [];
    return scheduler.generateSchedules(selectedSubjects, preference, allowOverlapping);
  }, [scheduler, selectedSubjects, preference, allowOverlapping]);

  // Handle index reset on any schedule-relevant change
  useEffect(() => {
    setCurrentIndex(0);
  }, [schedules]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (schedules.length === 0) return;
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(prev + 1, schedules.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [schedules]);

  // Touch handlers for swiping
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || schedules.length === 0) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    const threshold = 50;

    if (distance > threshold) { // Swipe Left (Next)
      setCurrentIndex(prev => Math.min(prev + 1, schedules.length - 1));
    } else if (distance < -threshold) { // Swipe Right (Prev)
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
    setTouchStart(null);
  };

  const handleAddSubject = (code: string) => {
    setSelectedSubjects(prev => [...prev, code]);
  };

  const handleRemoveSubject = (code: string) => {
    setSelectedSubjects(prev => prev.filter(c => c !== code));
  };

  const currentSchedule = schedules[currentIndex];

  return (
    <>
      <a
        href="https://github.com/BoltyTheDog/eetac_scheduler"
        target="_blank"
        rel="noopener noreferrer"
        className="github-link"
        title="Ver en GitHub"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ width: '60%', height: '60%' }}>
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </a>

      <header className="header">
        <img src={logo} alt="Logo EETAC" className="header-logo" />
        <h1 className="header-title">Generador de Horarios</h1>
      </header>

      <main className="layout">
        <aside className="layout-sidebar">
          <div className="controls-row">
            <div className="panel panel-priority" style={{ flex: '0 0 60%' }}>
              <h2>Preferencia</h2>
              <div style={{ display: 'flex' }}>
                {(['Mañana', 'Tarde', 'Indiferente'] as const).map(p => {
                  const preferenceMap = { 'Mañana': SchedulePreference.Morning, 'Tarde': SchedulePreference.Afternoon, 'Indiferente': SchedulePreference.DontCare };
                  return (
                    <button
                      key={p}
                      className={`btn-toggle ${preference === preferenceMap[p] ? 'active' : ''}`}
                      onClick={() => setPreference(preferenceMap[p])}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="panel panel-overlapping" style={{ flex: '1' }}>
              <h2>Solapamientos</h2>
              <div style={{ display: 'flex' }}>
                <button
                  className={`btn-toggle ${!allowOverlapping ? 'active' : ''}`}
                  onClick={() => setAllowOverlapping(false)}
                >
                  Estricto
                </button>
                <button
                  className={`btn-toggle ${allowOverlapping ? 'active' : ''}`}
                  onClick={() => setAllowOverlapping(true)}
                >
                  Permitir
                </button>
              </div>
            </div>
          </div>

          <div className="panel panel-selected" style={{ flex: '0 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '35%' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seleccionadas</h2>
              <span className="swipe-hint" style={{ fontSize: '0.65rem', marginLeft: '0.5rem', opacity: 0.5, fontStyle: 'italic' }}>click para eliminar</span>
            </div>
            <div className="selected-list-container">
              {selectedSubjects.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Ninguna asignatura seleccionada</div>
              ) : (
                selectedSubjects.map(s => (
                  <div key={s} className="selected-item">
                    <span
                      className="selected-item-name"
                      onClick={() => handleRemoveSubject(s)}
                    >
                      {s}
                    </span>
                    <div
                      className="selected-item-groups-btn"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setOpenPopover({
                          code: s,
                          top: rect.top,
                          left: rect.left
                        });
                      }}
                      onMouseLeave={() => setOpenPopover(null)}
                    >
                      {subjectGroups[s]?.length || 0} {subjectGroups[s]?.length === 1 ? 'grupo' : 'grupos'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>


          <div className="panel panel-subjects" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Añadir Asignatura</h2>
              <div style={{ display: 'flex', background: 'var(--bg-color)', padding: '2px', borderRadius: '4px' }}>
                <button
                  onClick={() => setSortMode('level')}
                  style={{
                    fontSize: '0.7rem', border: 'none', padding: '2px 6px', cursor: 'pointer', borderRadius: '3px',
                    background: sortMode === 'level' ? 'var(--surface-color)' : 'transparent',
                    boxShadow: sortMode === 'level' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    fontWeight: sortMode === 'level' ? '600' : '400'
                  }}
                >Nivel</button>
                <button
                  onClick={() => setSortMode('alpha')}
                  style={{
                    fontSize: '0.7rem', border: 'none', padding: '2px 6px', cursor: 'pointer', borderRadius: '3px',
                    background: sortMode === 'alpha' ? 'var(--surface-color)' : 'transparent',
                    boxShadow: sortMode === 'alpha' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    fontWeight: sortMode === 'alpha' ? '600' : '400'
                  }}
                >A-Z</button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Buscar asignaturas..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem',
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                marginBottom: '1rem',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            <div className="subjects-list" style={{ overflowY: 'auto', flex: 1 }}>
              {Object.entries(groupedSubjects).map(([groupName, subjects]) => (
                <div key={groupName}>
                  {sortMode === 'level' && (
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-dim)', padding: '0.5rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em', background: 'var(--bg-color)', borderRadius: '4px', margin: '0.5rem 0 0.25rem 0' }}>
                      {groupName}
                    </div>
                  )}
                  {subjects.map(s => (
                    <div
                      key={s}
                      onClick={() => handleAddSubject(s)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        borderRadius: '0.375rem',
                        marginBottom: '0.25rem',
                        transition: 'all 0.1s',
                        fontSize: '0.85rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="schedule-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
          <div className="panel nav-panel" style={{
            opacity: schedules.length > 0 || (selectedSubjects.length > 0 && !allowOverlapping) ? 1 : 0.3,
            pointerEvents: schedules.length > 0 ? 'auto' : 'none'
          }}>
            <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Horarios:</span>
              <strong style={{ color: 'var(--primary-color)', marginLeft: '0.4rem' }}>{schedules.length}</strong>
              <span className="swipe-hint" style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '1rem' }}>Desliza para cambiar</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="btn-toggle"
                style={{ borderRadius: '0.375rem', padding: '0.4rem 0.8rem', opacity: currentIndex === 0 ? 0.3 : 1 }}
              >
                ←
              </button>
              <span style={{ fontSize: '0.875rem', minWidth: '3.5rem', textAlign: 'center' }}>
                {schedules.length > 0 ? `${currentIndex + 1} / ${schedules.length}` : '0 / 0'}
              </span>
              <button
                disabled={schedules.length <= 1 || currentIndex === schedules.length - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="btn-toggle"
                style={{ borderRadius: '0.375rem', padding: '0.4rem 0.8rem', opacity: (schedules.length <= 1 || currentIndex === schedules.length - 1) ? 0.3 : 1 }}
              >
                →
              </button>
            </div>
          </div>
          <div
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            className={`grid-container ${(!currentSchedule || currentSchedule.hasOverlap || schedules.length === 0) && selectedSubjects.length > 0 ? 'warn-bg' : ''}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <ScheduleGrid
              schedule={currentSchedule || { sessions: [], score: 0 }}
              subjectColorMap={subjectColorMap}
            />
          </div>
        </section>
      </main>
      {openPopover && (
        <div
          className="groups-popover"
          style={{
            top: `${openPopover.top}px`,
            left: `${openPopover.left - 10}px`,
            transform: 'translateX(-100%)'
          }}
        >
          {subjectGroups[openPopover.code].map((g, i) => (
            <div key={i} className="groups-popover-item">
              Gr {g.grup} ({g.tipus})
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default App;
