import { ImageResponse } from "next/og";

export const alt = "Spinlearn - Learn AI one concept at a time";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 48, background: "#f0eee6" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", borderRadius: 24, padding: 60, background: "#fff", color: "#1f1e1d", border: "1px solid #dedcd5" }}>
        <div style={{ display: "flex", color: "#1b5bb8", fontSize: 36 }}>Spinlearn</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 64, lineHeight: 1.15 }}>
          <span>One AI concept.</span><span>A little progress, every day.</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#5e5d59" }}>42 free lessons · Clear explanations · Code · Quizzes</div>
      </div>
    </div>,
    size
  );
}
