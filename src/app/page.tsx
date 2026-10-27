// Página temporária de manutenção enquanto o novo site é publicado.
// A versão anterior da home está na tag git backup/site-2026-10-26.
export default function Manutencao() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        padding: "2rem 1rem",
        textAlign: "center",
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(242,173,0,0.14), transparent 60%), #050505",
        color: "#f5f5f4",
      }}
    >
      <img
        src="/brand/selo-cor.png"
        alt="RodeoApp.pro"
        width={1000}
        height={543}
        style={{ width: "min(420px, 80vw)", height: "auto" }}
      />
      <div style={{ maxWidth: 520 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#f2ad00",
            fontWeight: 700,
          }}
        >
          Estamos em manutenção
        </p>
        <h1 style={{ margin: "0.75rem 0 1rem", fontSize: "clamp(1.75rem, 5vw, 2.5rem)", lineHeight: 1.15 }}>
          Um site novo está a caminho.
        </h1>
        <p style={{ margin: 0, color: "#a8a29e", lineHeight: 1.6 }}>
          Estamos preparando o novo rodeoapp.pro. O aplicativo, o portal e as transmissões seguem
          funcionando normalmente.
        </p>
      </div>
      <a
        href="https://portal.rodeoapp.pro"
        style={{
          padding: "0.85rem 1.75rem",
          borderRadius: 999,
          background: "#f2ad00",
          color: "#0a0a0a",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Acessar o portal
      </a>
    </main>
  );
}
