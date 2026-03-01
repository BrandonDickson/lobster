import { Component } from "react"
import type { ReactNode, ErrorInfo } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: "24px",
          color: "var(--red)",
          fontSize: "11px",
          fontFamily: "inherit"
        }}>
          <div style={{
            fontSize: "9px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "12px",
            color: "var(--text-dim)"
          }}>
            RENDER FAULT
          </div>
          <div style={{ color: "var(--text)", marginBottom: "8px" }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--cyan)",
              padding: "4px 12px",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
