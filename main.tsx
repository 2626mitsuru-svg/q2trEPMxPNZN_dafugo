import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css"; // 既存のCSSを読み込み

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
