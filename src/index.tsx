import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, createRoutesFromElements, Outlet, Route, RouterProvider, } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import DesignerApp from "~/routes/Designer";
import LabelMaker from "~/routes/LabelMaker";
import './index.css'
import PDFTool from "~/routes/PDFTool";
import ViewerPage from "./routes/viewer";
import SendToSign from "./routes/sendToSign";
import ClientSignature from "./routes/clientSignature";


const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Root />}>
      <Route index element={<DesignerApp />} />
      <Route path="accessories/label/maker" element={<LabelMaker />} />

      <Route path="document/builder" element={<DesignerApp />} />

      <Route path="viewer/:templateId" element={<ViewerPage />} />
      <Route path="viewer/client/:templateId" element={<ViewerPage />} />

      <Route path="deal/:templateId" element={<PDFTool />} />
      <Route path="deal/client/:templateId" element={<PDFTool />} />

      <Route path="signature/:templateId" element={<SendToSign />} />
      <Route path="signature/client/:templateId" element={<ClientSignature />} />
    </Route>
  )
);

function Root() {
  return (
    <div className="min-h-screen flex flex-col">
      <Outlet /> {/* This renders the matched child route */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);