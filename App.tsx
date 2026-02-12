import React from "react";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        fontFamily: "Arial, sans-serif",
        padding: "40px"
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#ffffff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <h1 style={{ marginBottom: "10px" }}>
          RestorationOps
        </h1>

        <p style={{ marginBottom: "20px", color: "#555" }}>
          Deployment successful.
        </p>

        <div
          style={{
            padding: "20px",
            background: "#eef2f7",
            borderRadius: "8px"
          }}
        >
          <strong>Next Steps:</strong>
          <ul style={{ marginTop: "10px" }}>
            <li>Add job intake system</li>
            <li>Build moisture tracking module</li>
            <li>Implement estimate + change order system</li>
            <li>Add authentication & roles</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
