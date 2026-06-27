import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#222', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ Ops, o aplicativo quebrou!</h1>
          <p>Tire um print dessa tela e envie para o suporte:</p>
          
          <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', overflowX: 'auto', marginTop: '1rem' }}>
            <h3 style={{ color: '#eab308', margin: '0 0 1rem 0' }}>{this.state.error && this.state.error.toString()}</h3>
            <pre style={{ margin: 0, color: '#f87171', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
            <br/>
            <pre style={{ margin: 0, color: '#9ca3af', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.stack}
            </pre>
          </div>

          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '12px 24px', background: '#eab308', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Recarregar a página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
