import { CheckCircle2, Circle } from 'lucide-react';

const code = [
  ['keyword', 'function'], ['plain', ' solveChallenge(input) {'],
  ['plain', '  const tokens = input.trim().split(" ");'],
  ['keyword', '  return'], ['plain', ' tokens.filter(Boolean).length;'], ['plain', '}'],
];

export function CodeEditorMock() {
  return <div className="code-editor-mock" aria-label="Live coding challenge preview"><div className="editor-topbar"><span className="traffic-lights"><i /><i /><i /></span><span className="editor-tab"><Circle size={10} /> devcast.cpp</span><span className="live-badge"><span className="dot" /> LIVE</span></div><div className="editor-body">{code.map(([kind, line], index) => <div className="code-line" key={`${line}-${index}`}><span className="line-number">{index + 1}</span><span className={kind}>{line}</span></div>)}</div><div className="editor-status"><span><CheckCircle2 size={14} /> 8/8 passed</span><span className="compile-track"><i /></span><span>running tests...</span></div></div>;
}
