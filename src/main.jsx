import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const starter = () => '';

function App() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [search, setSearch] = useState('');
  const [sidebar, setSidebar] = useState(true);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('hidden');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [solved, setSolved] = useState(() =>
    JSON.parse(localStorage.getItem('cpl-solved') || '{}')
  );

  useEffect(() => {
    fetch('/api/questions')
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Could not load questions.');
        return data;
      })
      .then(setQuestions)
      .catch(e => setError(e.message));
  }, []);

  const q = questions[current];

  useEffect(() => {
    if (!q) return;
    const saved = JSON.parse(localStorage.getItem('cpl-code') || '{}');
    setCode(saved[q.id] ?? starter(q));
    setResult(null);
    setTab('hidden');
    setError('');
  }, [current, q?.id]);

  const filtered = useMemo(
    () =>
      questions.filter(x =>
        `${x.id} ${x.title}`.toLowerCase().includes(search.toLowerCase())
      ),
    [questions, search]
  );

  const updateCode = value => {
    setCode(value);
    if (q) {
      const all = JSON.parse(localStorage.getItem('cpl-code') || '{}');
      all[q.id] = value;
      localStorage.setItem('cpl-code', JSON.stringify(all));
    }
  };

  const run = async () => {
    if (!q || !code.trim()) {
      setError('Please write some Java logic before running.');
      setTab('output');
      return;
    }

    setRunning(true);
    setResult(null);
    setError('');
    setTab('output');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: q.id,
          code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed.');
      }

      setResult(data);
      setTab('hidden');

      const allHiddenPassed =
        data.summary.hiddenTotal === 0 ||
        data.summary.hiddenPassed === data.summary.hiddenTotal;

      const allSamplesPassed =
        data.summary.sampleTotal === 0 ||
        data.summary.samplePassed === data.summary.sampleTotal;

      if (allHiddenPassed && allSamplesPassed) {
        const next = { ...solved, [q.id]: true };
        setSolved(next);
        localStorage.setItem('cpl-solved', JSON.stringify(next));
      }
    } catch (e) {
      setError(e.message || 'Execution failed.');
      setTab('output');
    } finally {
      setRunning(false);
    }
  };

  if (!q) {
    return <div className="loading">Loading Coding Practice Lab...</div>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="icon-btn"
          onClick={() => setSidebar(!sidebar)}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          ☰
        </button>

        <div className="brand">
          <span>⌘</span>
          <div>
            <b>Coding Practice Lab</b>
            <small>React × Node × JDoodle</small>
          </div>
        </div>

        <div className="top-right">
          <span className="pill">PRACTICE MODE</span>
          <span>
            {Object.keys(solved).length} / {questions.length} Solved
          </span>
        </div>
      </header>

      <div className="layout">
        <aside className={`sidebar ${sidebar ? 'open' : 'closed'}`}>
          <div className="side-title">
            <b>Questions</b>
            <button
              onClick={() => {
                localStorage.removeItem('cpl-solved');
                setSolved({});
              }}
            >
              Reset
            </button>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
          />

          {filtered.map(x => (
            <button
              key={x.id}
              className={`qitem ${x.id === q.id ? 'active' : ''}`}
              onClick={() =>
                setCurrent(questions.findIndex(a => a.id === x.id))
              }
            >
              <span>{String(x.id).padStart(2, '0')}</span>
              <strong>{x.title}</strong>
              <i className={solved[x.id] ? 'done' : ''}>
                {solved[x.id] ? '✓' : '○'}
              </i>
            </button>
          ))}
        </aside>

        <main className="content">
          <section className="problem">
            <div className="problem-head">
              <div>
                <span
                  className={`difficulty ${q.difficulty.toLowerCase()}`}
                >
                  {q.difficulty}
                </span>
                <h1>
                  Q{q.id}. {q.title}
                </h1>
              </div>

              <div className="nav">
                <button
                  onClick={() =>
                    setCurrent(
                      (current - 1 + questions.length) % questions.length
                    )
                  }
                >
                  ← Prev
                </button>
                <button
                  onClick={() =>
                    setCurrent((current + 1) % questions.length)
                  }
                >
                  Next →
                </button>
              </div>
            </div>

            <p>{q.description}</p>

            <div className="function-box">
              <label>FUNCTION SIGNATURE</label>
              <code>{q.function}</code>
            </div>

            <div className="instruction">
              <b>Your task</b>
              <span>
                Implement only the logic for the function shown above. Keep the
                function name and parameters unchanged. The backend will create
                the Java class automatically.
              </span>
            </div>
          </section>

          <section className="editor-panel">
            <div className="editor-head">
              <div>
                <b>Java</b>
                <span>Logic only</span>
              </div>

              <button
                className="run"
                disabled={running}
                onClick={run}
              >
                {running ? '⏳ Running...' : '▶ Run Code'}
              </button>
            </div>

            <textarea
              value={code}
              onChange={e => updateCode(e.target.value)}
              spellCheck="false"
              placeholder="Write only the function logic here..."
            />
          </section>

          <section className="console">
            <div className="tabs">
              <button
                className={tab === 'hidden' ? 'active' : ''}
                onClick={() => setTab('hidden')}
              >
                Hidden Tests
              </button>
              <button
                className={tab === 'output' ? 'active' : ''}
                onClick={() => setTab('output')}
              >
                Output Console
              </button>
              <button
                className={tab === 'samples' ? 'active' : ''}
                onClick={() => setTab('samples')}
              >
                2 Sample Tests
              </button>
            </div>

            {tab === 'hidden' && <Hidden result={result} />}
            {tab === 'output' && <Output result={result} error={error} />}
            {tab === 'samples' && (
              <Samples result={result} samples={q.samples || []} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function Hidden({ result }) {
  if (!result) {
    return (
      <div className="empty">
        Run your code to evaluate all hidden test cases.
      </div>
    );
  }

  const s = result.summary;

  return (
    <div className="hidden-wrap">
      <div className="score">
        <div
          className={
            s.hiddenPassed === s.hiddenTotal ? 'success' : 'danger'
          }
        >
          <b>
            {s.hiddenPassed} / {s.hiddenTotal}
          </b>
          <span>Hidden tests passed</span>
        </div>

        <div>
          <b>{s.hiddenTotal - s.hiddenPassed}</b>
          <span>Failed</span>
        </div>

        <div>
          <b>
            {s.totalPassed} / {s.total}
          </b>
          <span>All tests passed</span>
        </div>
      </div>

      <div className="case-grid">
        {result.hidden.map((x, i) => (
          <div className={`mini ${x.status}`} key={i}>
            <b>Hidden #{i + 1}</b>
            <span>
              {x.status === 'passed' ? '✓ Passed' : '✗ Failed'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Output({ result, error }) {
  if (error) {
    return <pre className="console-error">{error}</pre>;
  }

  if (!result) {
    return (
      <div className="empty">
        Your program output and errors will appear here.
      </div>
    );
  }

  return (
    <div className="output-list">
      {[...(result.sample || []), ...(result.hidden || [])].map((x, i) => (
        <div className="output-card" key={i}>
          <div>
            <b>Test #{i + 1}</b>
            <span className={x.status}>
              {x.status === 'passed' ? 'PASSED' : 'FAILED'}
            </span>
          </div>

          <div className="output-io">
            <div>
              <label>INPUT</label>
              <pre>{x.input}</pre>
            </div>
            <div>
              <label>OUTPUT</label>
              <pre>{x.output || '(no output)'}</pre>
            </div>
            <div>
              <label>EXPECTED</label>
              <pre>{x.expected}</pre>
            </div>
          </div>

          {x.error && (
            <pre className="console-error">{x.error}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

function Samples({ result, samples }) {
  return (
    <div className="samples">
      {samples.slice(0, 2).map((x, i) => {
        const r = result?.sample?.[i];

        return (
          <div className="sample-card" key={i}>
            <div className="sample-title">
              <b>Sample Test {i + 1}</b>
              <span className={r?.status}>
                {r ? r.status.toUpperCase() : 'NOT RUN'}
              </span>
            </div>

            <div className="io">
              <div>
                <label>INPUT</label>
                <pre>{x.input}</pre>
              </div>

              <div>
                <label>EXPECTED OUTPUT</label>
                <pre>{x.expected}</pre>
              </div>

              <div>
                <label>YOUR OUTPUT</label>
                <pre>{r ? r.output : '—'}</pre>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
