import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({ children }: { children: ReactNode }) {
  const modalRoot = document.getElementById("modal-root");

  if (!modalRoot) return null;

  return createPortal(children, modalRoot);
}
