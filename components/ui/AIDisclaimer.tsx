export default function AIDisclaimer() {
  return (
    <div style={s.box}>
      <p style={s.title}>⚕ Medical disclaimer</p>
      <ul style={s.list}>
        <li>MAST is a symptom tracking tool — it does not provide medical advice or diagnosis</li>
        <li>MSS (Mast Cell Symptom Severity Score) is a patient-reported outcome measure, not a validated diagnostic instrument</li>
        <li>All data is self-reported and should be interpreted alongside professional clinical assessment</li>
        <li>AI-generated summaries are for communication support only — always discuss with your healthcare provider</li>
        <li>In case of severe reaction or anaphylaxis, call emergency services immediately</li>
      </ul>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  box: {
    background: '#6ab0c518',
    border: '1px solid #6ab0c5',
    borderRadius: 12,
    padding: '14px 18px',
    marginBottom: 24,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: '#6ab0c5',
    marginBottom: 10,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
}