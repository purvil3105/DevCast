
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  disabled?: boolean;
  isEvaluating?: boolean;
}

/**
 * Monaco Editor wrapper for the coding workspace.
 * Loads the full VS Code editor experience in-browser.
 */
export function CodeEditor({ code, onChange, language, disabled = false, isEvaluating = false }: CodeEditorProps) {
  return (
    <div style={{
      flex: 1,
      position: 'relative',
      background: 'var(--editor-bg)',
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid var(--gray-800)',
      minHeight: 0,
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        color: 'var(--gray-500)',
        borderBottom: '1px solid rgba(30, 32, 40, 0.5)',
        background: 'rgba(17, 19, 24, 0.5)',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          padding: '8px 16px',
          borderRight: '1px solid rgba(30, 32, 40, 0.5)',
          color: 'var(--indigo-400)',
          background: 'var(--editor-bg)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--yellow-400)',
          }} />
          solution.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language}
        </div>
        {disabled && !isEvaluating && (
          <div style={{ paddingRight: 16, color: 'var(--green-400)', fontWeight: 500 }}>
            ✓ Submitted
          </div>
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => onChange(value || '')}
          theme="vs-dark"
          options={{
            readOnly: disabled,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12 },
            renderLineHighlight: 'gutter',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
          loading={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--gray-500)',
              fontSize: 14,
            }}>
              Loading editor...
            </div>
          }
        />
      </div>

      {/* Evaluating overlay */}
      {isEvaluating && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 11, 15, 0.5)',
          backdropFilter: 'blur(1px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}>
          <p style={{
            color: 'var(--gray-400)',
            fontSize: 14,
            fontWeight: 500,
            background: 'var(--gray-900)',
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--gray-800)',
          }}>
            Evaluating your submission...
          </p>
        </div>
      )}
    </div>
  );
}
