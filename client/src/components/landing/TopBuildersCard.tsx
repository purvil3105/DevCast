import { Trophy } from 'lucide-react';

const builders = [['01', 'mira.codes', '2,840 xp'], ['02', 'sanjay.dev', '2,410 xp'], ['03', 'lena_loop', '2,195 xp']];

export function TopBuildersCard() {
  return <div className="top-builders-card"><div className="builders-heading"><span><Trophy size={15} /> Top builders</span><small>this week</small></div>{builders.map(([rank, name, score]) => <div className="builder-row" key={name}><b>{rank}</b><span className="builder-avatar">{name[0].toUpperCase()}</span><strong>{name}</strong><small>{score}</small></div>)}</div>;
}
