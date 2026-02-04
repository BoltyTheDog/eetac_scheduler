import { useState, useMemo, useEffect } from 'react';
import './index.css';
import data from './data.json';
import { Scheduler } from './engine/scheduler';
import { SchedulePreference } from './engine/types';
import { ScheduleGrid } from './components/ScheduleGrid';

import logo from './assets/eetac_logo.png';

function App() {
  const scheduler = useMemo(() => new Scheduler(data as any), []);
  const availableSubjects = useMemo(() => scheduler.getAvailableSubjects(), [scheduler]);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [preference, setPreference] = useState<SchedulePreference>(SchedulePreference.Morning);
  const [allowOverlapping, setAllowOverlapping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState('');

  const filteredSubjects = useMemo(() =>
    availableSubjects.filter(s => s.toLowerCase().includes(filter.toLowerCase()) && !selectedSubjects.includes(s)),
    [availableSubjects, filter, selectedSubjects]
  );

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

  const handleAddSubject = (code: string) => {
    setSelectedSubjects(prev => [...prev, code]);
  };

  const handleRemoveSubject = (code: string) => {
    setSelectedSubjects(prev => prev.filter(c => c !== code));
  };

  const currentSchedule = schedules[currentIndex];

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '0.75rem 0' }}>
        <img src={logo} alt="EETAC Logo" style={{ height: '80px', width: 'auto', display: 'block' }} />
        <h1 style={{ fontSize: '2.5rem', margin: 0, lineHeight: 1, color: '#334155' }}>Schedule Generator</h1>
      </header>

      <main className="layout" style={{ flex: 1, minHeight: 0 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', minHeight: 0 }}>
          <div className="panel">
            <h2 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</h2>
            <div style={{ display: 'flex' }}>
              {(['Morning', 'Afternoon', 'DontCare'] as const).map(p => (
                <button
                  key={p}
                  className={`btn-toggle ${preference === SchedulePreference[p] ? 'active' : ''}`}
                  onClick={() => setPreference(SchedulePreference[p])}
                  style={{ fontSize: '0.85rem' }}
                >
                  {p === 'DontCare' ? 'None' : p}
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected</h2>
            <div style={{ minHeight: '40px', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {selectedSubjects.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>No subjects selected</div>
              ) : (
                selectedSubjects.map(s => (
                  <div key={s} className="selected-item" onClick={() => handleRemoveSubject(s)} style={{ marginBottom: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                    <span>{s}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overlapping</h2>
            <div style={{ display: 'flex' }}>
              <button
                className={`btn-toggle ${!allowOverlapping ? 'active' : ''}`}
                onClick={() => setAllowOverlapping(false)}
                style={{ fontSize: '0.85rem' }}
              >
                Strict
              </button>
              <button
                className={`btn-toggle ${allowOverlapping ? 'active' : ''}`}
                onClick={() => setAllowOverlapping(true)}
                style={{ fontSize: '0.85rem' }}
              >
                Allow
              </button>
            </div>
          </div>

          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add Subject</h2>
            <input
              type="text"
              placeholder="Search subjects..."
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
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredSubjects.map(s => (
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
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minHeight: 0 }}>
          <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', opacity: schedules.length > 0 ? 1 : 0.3, pointerEvents: schedules.length > 0 ? 'auto' : 'none' }}>
            <div style={{ fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Schedules found:</span> <strong style={{ color: 'var(--primary-color)' }}>{schedules.length}</strong>
              {schedules.length > 0 && <span style={{ marginLeft: '1rem', opacity: 0.5 }}>(Use ← → keys)</span>}
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
                disabled={currentIndex === 0 || currentIndex === schedules.length - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="btn-toggle"
                style={{ borderRadius: '0.375rem', padding: '0.4rem 0.8rem', opacity: (schedules.length === 0 || currentIndex === schedules.length - 1) ? 0.3 : 1 }}
              >
                →
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ScheduleGrid schedule={currentSchedule || { sessions: [], score: 0 }} />
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
